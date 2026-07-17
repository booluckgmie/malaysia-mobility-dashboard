"""
causal_analysis.py
------------------
Policy-impact / causal inference module for the Malaysia Mobility Dashboard.

Estimates the effect of real policy events (MCO/FMCO lockdowns, subsidy
rationalisation, the 2026 WFH mandate, etc.) on mobility outcomes
(PT ridership, Google mobility indices, fuel prices) using:

  1. Event-study            -> pre/post trend break around a policy date,
                                built from etl/baseline/historical.json
                                (annual ridership, Google Mobility MY,
                                fuel price history) plus the rolling
                                30-day ridership window in
                                public/data/mf_index_daily.json.
  2. Difference-in-Diff      -> Malaysia vs comparator countries.
  3. Synthetic Control       -> weighted comparator-country counterfactual.
  4. Regression Discontinuity -> generic, for a future eligibility cutoff.

IMPORTANT DATA-AVAILABILITY CAVEAT (read before trusting DiD/SC numbers):
  public/data/country_compare.json and etl/country_compare.py only ever
  fetch the *latest* World Bank value per indicator (`mrv=1`) plus a
  hand-curated cross-sectional snapshot. There is no historical
  time-series panel for comparator countries anywhere in this repo, so
  methods (2) and (3) — which require a date x country panel — cannot be
  computed from real data today. Rather than fabricate a synthetic
  comparator panel and present it as analysis, this script reports those
  two methods as unavailable with an explicit reason. Event-study (1) is
  the one method that runs on real, sourced data end to end.

INPUTS:
  - etl/baseline/historical.json        (2017-2026 annual/monthly anchor panel)
  - public/data/mf_index_daily.json     (rolling 30-day daily ridership)
  - etl/policy_events.json              (policy dates you maintain)

OUTPUT:
  - public/data/policy_impact.json      (consumed by PolicyImpactPanel.jsx)

Usage:
    python causal_analysis.py
"""

import json
import os
import re
import warnings
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# CONFIG — paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "public", "data")
BASELINE_DIR = os.path.join(BASE_DIR, "baseline")

MF_INDEX_PATH = os.path.join(DATA_DIR, "mf_index_daily.json")
HISTORICAL_PATH = os.path.join(BASELINE_DIR, "historical.json")
POLICY_EVENTS_PATH = os.path.join(BASE_DIR, "policy_events.json")
OUTPUT_PATH = os.path.join(DATA_DIR, "policy_impact.json")

# historical.json is annual/monthly-frequency, not daily, so the windows
# have to be wide enough to actually capture a handful of data points on
# each side of an event.
PRE_WINDOW_DAYS = 1100  # ~3 years lookback (annual data needs a few points)
POST_WINDOW_DAYS = 730  # ~2 years forward
MIN_OBS_PER_SIDE = 2    # below this, a t-test / DiD coefficient is not meaningful

# Google Mobility columns (transit_mobility, workplace_mobility) are already
# percentage-point deviations from Google's own Jan-2020 baseline, so they
# cross zero. Computing "% change vs pre-mean" as a ratio on those blows up
# or flips sign nonsensically near zero. Level-style outcomes (ridership,
# fuel prices, the driving index which stays positive around 100) are fine
# as a ratio. Deviation-style outcomes use a point-difference instead.
POINT_DIFF_OUTCOMES = {"transit_mobility", "workplace_mobility"}

NO_COUNTRY_PANEL_REASON = (
    "No historical comparator-country time series is collected by this repo — "
    "country_compare.json and the World Bank fetch in etl/country_compare.py only "
    "retain the latest value per indicator (mrv=1), not a date x country panel. "
    "This method needs one and will stay unavailable until that data is collected."
)


# ---------------------------------------------------------------------------
# 1. POLICY EVENTS CONFIG (etl/policy_events.json)
# ---------------------------------------------------------------------------
def load_policy_events():
    with open(POLICY_EVENTS_PATH) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# 2. MALAYSIA PANEL — built from etl/baseline/historical.json (real, sourced)
# ---------------------------------------------------------------------------
def _parse_period(period: str) -> pd.Timestamp:
    """Parses 'Jan 2020' / 'Q1 2024' style period labels used in historical.json."""
    m = re.match(r"Q([1-4])\s+(\d{4})", period.strip())
    if m:
        quarter, year = int(m.group(1)), int(m.group(2))
        month = (quarter - 1) * 3 + 1
        return pd.Timestamp(year=year, month=month, day=1)
    return pd.to_datetime(period)


def load_malaysia_panel():
    """
    Builds a long-format, mixed-frequency Malaysia panel with columns:
      date, ridership_annual, transit_mobility, workplace_mobility,
      driving_index, fuel_ron95, fuel_diesel, ridership_daily
    from the real curated sources already in this repo. Different columns
    are populated at different dates (annual vs monthly vs daily) — that's
    expected; event_study/diff_in_diff drop NaNs per-outcome.
    """
    with open(HISTORICAL_PATH) as f:
        hist = json.load(f)

    frames = []

    ridership = pd.DataFrame(hist["annual_ridership"])
    ridership["date"] = pd.to_datetime(ridership["year"].astype(str) + "-01-01")
    frames.append(ridership[["date", "total"]].rename(columns={"total": "ridership_annual"}))

    mobility = pd.DataFrame(hist["google_mobility_my"])
    mobility["date"] = mobility["period"].apply(_parse_period)
    frames.append(mobility[["date", "transit"]].rename(columns={"transit": "transit_mobility"}))
    frames.append(mobility[["date", "workplace"]].rename(columns={"workplace": "workplace_mobility"}))
    frames.append(mobility[["date", "driving"]].rename(columns={"driving": "driving_index"}))

    fuel = pd.DataFrame(hist["fuel_history"])
    fuel["date"] = fuel["period"].apply(_parse_period)
    frames.append(fuel[["date", "ron95"]].rename(columns={"ron95": "fuel_ron95"}))
    frames.append(fuel[["date", "diesel"]].rename(columns={"diesel": "fuel_diesel"}))

    # Extend with the real rolling 30-day daily ridership window, if present,
    # for events recent enough to fall inside it.
    if os.path.exists(MF_INDEX_PATH):
        try:
            with open(MF_INDEX_PATH) as f:
                mf = json.load(f)
            daily = pd.DataFrame(mf["ridership"]["last_30_days"])
            daily["date"] = pd.to_datetime(daily["date"])
            frames.append(daily[["date", "trips"]].rename(columns={"trips": "ridership_daily"}))
        except Exception as e:
            print(f"[warn] could not read rolling ridership window from {MF_INDEX_PATH}: {e}")

    panel = frames[0]
    for f in frames[1:]:
        panel = panel.merge(f, on="date", how="outer")
    return panel.sort_values("date").reset_index(drop=True)


# ---------------------------------------------------------------------------
# 3. EVENT-STUDY
# ---------------------------------------------------------------------------
def event_study(panel, event_date, outcome, pre_days=PRE_WINDOW_DAYS, post_days=POST_WINDOW_DAYS):
    """
    Normalizes `outcome` relative to its pre-event mean, returns a
    day-relative-to-event series plus a simple pre/post trend break test.
    Returns {"available": False, "reason": ...} if there aren't enough
    real observations on either side of the event to say anything.
    """
    if outcome not in panel.columns:
        return {"available": False, "reason": f"column '{outcome}' not in panel"}

    event_date = pd.Timestamp(event_date)
    window = panel[(panel["date"] >= event_date - timedelta(days=pre_days)) &
                    (panel["date"] <= event_date + timedelta(days=post_days))].copy()
    window = window.dropna(subset=[outcome])
    if window.empty:
        return {"available": False, "reason": "no observations in window"}

    window["rel_day"] = (window["date"] - event_date).dt.days
    pre = window[window["rel_day"] < 0]
    post = window[window["rel_day"] >= 0]

    if len(pre) < MIN_OBS_PER_SIDE or len(post) < MIN_OBS_PER_SIDE:
        return {
            "available": False,
            "reason": (
                f"insufficient real observations near this date ({len(pre)} pre / {len(post)} post, "
                f"need >= {MIN_OBS_PER_SIDE} each) — historical.json is annual/monthly frequency and "
                "this repo does not yet archive a running daily history, so very recent events may "
                "not have enough post-period data yet."
            ),
        }

    pre_mean = pre[outcome].mean()
    post_mean = post[outcome].mean()
    point_diff = outcome in POINT_DIFF_OUTCOMES

    if point_diff:
        window["outcome_norm"] = window[outcome] - pre_mean  # pct-point deviation from pre-event mean
        change = post_mean - pre_mean
    else:
        window["outcome_norm"] = (window[outcome] / pre_mean - 1) * 100  # % change vs pre-event mean
        change = (post_mean / pre_mean - 1) * 100

    from scipy import stats
    t_stat, p_val = stats.ttest_ind(pre[outcome], post[outcome], equal_var=False)

    return {
        "available": True,
        "unit": "pct_points_vs_pre_mean" if point_diff else "pct_change_vs_pre_mean",
        "series": window[["rel_day", "outcome_norm"]].round(3).to_dict(orient="records"),
        "pre_mean": round(float(pre_mean), 2),
        "post_mean": round(float(post_mean), 2),
        "pct_change": round(float(change), 2),
        "t_stat": round(float(t_stat), 3),
        "p_value": round(float(p_val), 4),
        "n_pre": int(len(pre)),
        "n_post": int(len(post)),
    }


# ---------------------------------------------------------------------------
# 4. DIFFERENCE-IN-DIFFERENCES (Malaysia vs comparator countries)
# ---------------------------------------------------------------------------
def diff_in_diff(my_panel, country_panel, event_date, outcome,
                  pre_days=PRE_WINDOW_DAYS, post_days=POST_WINDOW_DAYS):
    """
    Classic 2x2 DiD: treated = Malaysia, control = comparator countries.
    Requires a date x country panel for the comparators, which this repo
    does not currently collect (see NO_COUNTRY_PANEL_REASON) — reports
    unavailable rather than fabricating one.
    """
    if country_panel is None:
        return {"available": False, "reason": NO_COUNTRY_PANEL_REASON}
    return {"available": False, "reason": "not implemented"}


# ---------------------------------------------------------------------------
# 5. SYNTHETIC CONTROL
# ---------------------------------------------------------------------------
def synthetic_control(my_panel, country_panel, event_date, outcome,
                       pre_days=PRE_WINDOW_DAYS, post_days=POST_WINDOW_DAYS):
    """
    Builds a synthetic Malaysia as a weighted combination of comparator
    countries' pre-event trend. Same data limitation as diff_in_diff.
    """
    if country_panel is None:
        return {"available": False, "reason": NO_COUNTRY_PANEL_REASON}
    return {"available": False, "reason": "not implemented"}


# ---------------------------------------------------------------------------
# 6. REGRESSION DISCONTINUITY (generic — use once a running variable exists)
# ---------------------------------------------------------------------------
def regression_discontinuity(df, running_var, outcome, cutoff, bandwidth=None):
    """
    Local linear RDD: outcome ~ running_var_centered * above_cutoff
    df must contain columns [running_var, outcome].
    Not wired to a real event yet — this repo has no eligibility/threshold
    running variable (e.g. household income for targeted fuel subsidy).
    Kept as a ready-to-use utility for when that data becomes available.
    """
    d = df[[running_var, outcome]].dropna().copy()
    d["centered"] = d[running_var] - cutoff
    if bandwidth:
        d = d[d["centered"].abs() <= bandwidth]
    d["above"] = (d["centered"] >= 0).astype(int)

    if len(d) < 20:
        return {"available": False, "reason": "insufficient observations near cutoff"}

    model = smf.ols(f"{outcome} ~ centered * above", data=d).fit()
    coef = model.params.get("above", np.nan)
    pval = model.pvalues.get("above", np.nan)

    return {
        "available": True,
        "rdd_estimate": round(float(coef), 3) if pd.notnull(coef) else None,
        "p_value": round(float(pval), 4) if pd.notnull(pval) else None,
        "n_obs": int(model.nobs),
        "bandwidth": bandwidth,
    }


# ---------------------------------------------------------------------------
# 7. MAIN PIPELINE
# ---------------------------------------------------------------------------
def main():
    print("Loading panels...")
    my_panel = load_malaysia_panel()
    country_panel = None  # see NO_COUNTRY_PANEL_REASON
    events = load_policy_events()

    results = {"generated_at": datetime.utcnow().isoformat() + "Z", "events": []}

    for ev in events:
        print(f"Analyzing: {ev['label']} ({ev['date']})")
        outcome = ev.get("outcome", "ridership_annual")
        if outcome not in my_panel.columns:
            print(f"  [skip] outcome '{outcome}' not in panel columns {list(my_panel.columns)}")
            continue

        entry = {
            "id": ev["id"],
            "label": ev["label"],
            "date": ev["date"],
            "type": ev.get("type"),
            "outcome": outcome,
            "event_study": event_study(my_panel, ev["date"], outcome),
            "diff_in_diff": diff_in_diff(my_panel, country_panel, ev["date"], outcome),
            "synthetic_control": synthetic_control(my_panel, country_panel, ev["date"], outcome),
        }
        results["events"].append(entry)

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nWrote {OUTPUT_PATH}")
    print(f"Analyzed {len(results['events'])} policy event(s).")


if __name__ == "__main__":
    main()
