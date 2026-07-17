# Policy Impact panel — integration notes

`etl/causal_analysis.py` runs an event-study around six real policy
events (MCO 1.0, FMCO, endemic reopening, the 2023 diesel float, the 2024
RON95 targeted subsidy, the 2026 WFH mandate) using the data already
curated in this repo, and writes `public/data/policy_impact.json`.
`PolicyImpactPanel.jsx` renders it as a new "Policy Impact" section in the
app, wired into the daily ETL workflow after `country_compare.py`.

## What's real vs. what's flagged unavailable

- **Event-study** runs on real, sourced data: `etl/baseline/historical.json`
  (annual Prasarana/KTMB ridership, Google Mobility MY, KPDNHEP fuel
  prices) plus the rolling 30-day ridership window in
  `public/data/mf_index_daily.json`. `etl/baseline/historical.json` was
  missing the 2026 "crisis" row that `src/data/baseline.js` already had —
  it's added now so the WFH-mandate event has a real pre-period to
  compare against.
- **Diff-in-Diff and Synthetic Control vs. comparator countries** are
  reported as unavailable, with the reason surfaced in the JSON and the
  UI. `public/data/country_compare.json` (built by `etl/country_compare.py`)
  is a cross-sectional snapshot — the World Bank fetch there uses `mrv=1`
  (latest value only), so there is no date × country panel anywhere in
  this repo for these methods to run on. Rather than build one from a
  synthetic ASEAN comparator set and present it as analysis, the script
  reports the real limitation. To make these methods real: start
  archiving a comparator-country time series (e.g. World Bank indicators
  fetched with a year range instead of `mrv=1`, or Google Mobility for
  ASEAN peers), then wire it into `load_country_panel()` /
  `diff_in_diff()` / `synthetic_control()`.
- **RDD** (`regression_discontinuity()`) stays a generic, unwired utility
  — this repo has no eligibility/income running variable for targeted
  fuel subsidies yet.
- The **WFH mandate 2026** event itself comes back `"available": false`
  for event-study too: `google_mobility_my`'s last data point is dated
  Apr 2026, which lands just *before* the 15 Apr 2026 mandate date, so
  there's no real post-period observation yet. This will resolve itself
  once a few more monthly mobility/ridership points land after the
  mandate date — no code change needed, just more real data over time.

## Files touched

- `etl/causal_analysis.py` (new)
- `etl/policy_events.json` (new — edit this to add/adjust events; dates
  and outcome columns must line up with real data coverage or
  `event_study()` will honestly report insufficient data)
- `etl/baseline/historical.json` (added the missing 2026 rows)
- `etl/requirements.txt` (added `scipy`, `statsmodels`)
- `src/components/PolicyImpactPanel.jsx` (new)
- `src/App.jsx` (new "Policy Impact" section)
- `.github/workflows/daily-etl.yml` (new ETL step after country_compare.py)

## Adding a new event

Add an entry to `etl/policy_events.json`:
```json
{ "id": "...", "date": "YYYY-MM-DD", "label": "...", "type": "...", "outcome": "..." }
```
`outcome` must be one of the panel columns produced by
`load_malaysia_panel()`: `ridership_annual`, `transit_mobility`,
`workplace_mobility`, `driving_index`, `fuel_ron95`, `fuel_diesel`,
`ridership_daily`. Pick whichever actually has real observations near
your event date — `event_study()` requires at least 2 real pre- and
2 real post-period points and will tell you exactly how many it found if
not.
