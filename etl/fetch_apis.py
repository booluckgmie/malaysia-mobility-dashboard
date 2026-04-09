"""
fetch_apis.py
Daily pull from data.gov.my — ridership, fuel prices, employment, vehicles.
Writes to public/data/mf_index_daily.json and public/data/last_updated.json
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
import requests

# ── Config ──────────────────────────────────────
API_BASE   = "https://api.data.gov.my/data-catalogue"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "data"
BASELINE   = Path(__file__).parent / "baseline" / "historical.json"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {"Accept": "application/json", "User-Agent": "MY-Mobility-Dashboard/1.0"}
WFH_START = datetime(2026, 4, 15, tzinfo=timezone.utc)

# ── Helpers ─────────────────────────────────────
def fetch(endpoint_id: str, limit: int = 60, extra_params: dict = None) -> list:
    params = {"id": endpoint_id, "limit": limit, "sort": "-date"}
    if extra_params:
        params.update(extra_params)
    try:
        r = requests.get(API_BASE, params=params, headers=HEADERS, timeout=30)
        r.raise_for_status()
        data = r.json()
        return data.get("data", data) if isinstance(data, dict) else data
    except Exception as e:
        print(f"  ⚠ fetch {endpoint_id}: {e}", file=sys.stderr)
        return []

def normalise(value: float, min_val: float, max_val: float) -> float:
    if max_val == min_val:
        return 50.0
    return round(max(0, min(100, (value - min_val) / (max_val - min_val) * 100)), 1)

def compute_mf_index(ridership_norm: float, fuel_norm: float, wfh_adoption: float) -> int:
    wfh_component = max(0, 100 - wfh_adoption * 100)
    raw = 0.4 * ridership_norm + 0.3 * fuel_norm + 0.3 * wfh_component
    return round(max(0, min(100, raw)))

# ── Load embedded historical baseline ───────────
def load_baseline() -> dict:
    if BASELINE.exists():
        with open(BASELINE) as f:
            return json.load(f)
    return {}

# ── Fuel savings model ───────────────────────────
SECTORS = [
    {"name": "Public & GLCs",   "emp": 1_600_000, "wfh": 0.60, "avgKm": 20},
    {"name": "Private Profess.", "emp": 2_100_000, "wfh": 0.40, "avgKm": 18},
    {"name": "Retail & Services","emp": 2_800_000, "wfh": 0.15, "avgKm": 12},
    {"name": "Logistics",        "emp":   900_000, "wfh": 0.08, "avgKm": 40},
    {"name": "Construction",     "emp": 2_200_000, "wfh": 0.05, "avgKm": 22},
]

def compute_fuel_savings_litres_per_week(sectors: list) -> float:
    return sum(
        s["emp"] * s["wfh"] * 2 * s["avgKm"] * 5 * 8 / 100
        for s in sectors
    )

def compute_sector_scores(sectors: list) -> list:
    out = []
    for s in sectors:
        trip_cut = round(s["emp"] * s["wfh"] * 2)
        litres   = s["emp"] * s["wfh"] * 2 * s["avgKm"] * 5 * 8 / 100
        mob      = round((1 - s["wfh"]) * 100)
        risk     = "HIGH" if mob >= 80 else "MED" if mob >= 55 else "LOW"
        out.append({**s, "tripCutPerDay": trip_cut, "litresSavedPerWeek": round(litres), "mobilityScore": mob, "risk": risk})
    return out

# ── Main ────────────────────────────────────────
def main():
    print("🔄 Fetching APIs…")
    now = datetime.now(timezone.utc)

    # 1. Ridership — API returns individual operator columns, NOT a single 'trips' field
    print("  → ridership_headline")
    ridership_raw = fetch("ridership_headline", limit=35)
    ridership_raw.sort(key=lambda x: x.get("date", ""))

    # Exact column names from data.gov.my ridership_headline schema
    BUS_COLS  = ["bus_rkl", "bus_rkn", "bus_rpn"]
    RAIL_COLS = [
        "rail_lrt_ampang", "rail_lrt_kj", "rail_monorail",
        "rail_mrt_kajang",  "rail_mrt_pjy",
        "rail_ets", "rail_intercity", "rail_komuter",
        "rail_komuter_utara", "rail_tebrau",
    ]
    ALL_COLS = BUS_COLS + RAIL_COLS

    def sum_trips(row):
        return sum(int(row.get(c) or 0) for c in ALL_COLS)

    ridership_30d = []
    for row in ridership_raw:
        total = sum_trips(row)
        bus   = sum(int(row.get(c) or 0) for c in BUS_COLS)
        rail  = sum(int(row.get(c) or 0) for c in RAIL_COLS)
        ridership_30d.append({
            "date":  row.get("date", ""),
            "trips": total,          # computed total for dashboard
            "bus":   bus,
            "rail":  rail,
            # Keep individual columns for drill-down
            **{c: int(row.get(c) or 0) for c in ALL_COLS},
        })

    latest_ridership = ridership_30d[-1]["trips"] if ridership_30d else 1_400_000
    # 2019 peak daily baseline ≈ 522M / 365 ≈ 1,430,000
    ridership_norm = normalise(latest_ridership, 0, 1_430_000)

    # 2. Fuel price
    print("  → fuelprice")
    fuel_raw = fetch("fuelprice", limit=30)
    fuel_raw.sort(key=lambda x: x.get("date", ""))

    fuel_history = []
    for row in fuel_raw:
        ron95  = float(row.get("ron95")  or row.get("price_ron95")  or 2.05)
        diesel = float(row.get("diesel") or row.get("price_diesel") or 3.35)
        fuel_history.append({"date": row.get("date", ""), "ron95": ron95, "diesel": diesel})

    latest_ron95  = fuel_history[-1]["ron95"]  if fuel_history else 2.05
    latest_diesel = fuel_history[-1]["diesel"] if fuel_history else 3.35
    # Normalise RON95: RM1.25 (MCO crash) → 0, RM2.08 (2019 normal) → 100
    fuel_norm = normalise(latest_ron95, 1.25, 2.08)

    # 3. Employment by industry (quarterly — best effort)
    print("  → employment_by_industry")
    employment_raw = fetch("employment_by_industry", limit=8)

    # 4. Vehicle registrations
    print("  → vehicles_type")
    vehicles_raw = fetch("vehicles_type", limit=18)
    vehicles_raw.sort(key=lambda x: x.get("date", "") or x.get("month", ""))

    # 5. Compute MF-Index
    wfh_days = max(0, (now - WFH_START).days)
    wfh_adoption = min(0.60, 0.40 + wfh_days * 0.001)  # gentle ramp from 40% to 60% over time
    mf_index = compute_mf_index(ridership_norm, fuel_norm, wfh_adoption)

    # 6. Sector scores & fuel savings
    sector_scores   = compute_sector_scores(SECTORS)
    total_litres_wk = compute_fuel_savings_litres_per_week(SECTORS)
    total_trips_cut = sum(s["tripCutPerDay"] for s in sector_scores)

    # 7. Load historical baseline
    baseline = load_baseline()

    # ── Build output JSON ────────────────────────
    output = {
        "updated_at": now.isoformat(),
        "mf_index": {
            "score": mf_index,
            "components": {
                "ridership_norm": round(ridership_norm, 1),
                "fuel_norm":      round(fuel_norm, 1),
                "wfh_adoption":   round(wfh_adoption * 100, 1),
            },
            "interpretation": (
                "Lockdown-level suppression" if mf_index < 30 else
                "WFH working — fuel saving"  if mf_index < 50 else
                "Moderate — partial impact"  if mf_index < 70 else
                "Near-normal mobility"        if mf_index < 85 else
                "Full mobility — no savings"
            ),
            "reference_points": {"mco_2021": 18, "pre_covid": 85, "recovery_2025": 82},
        },
        "ridership": {
            "latest_daily_trips": latest_ridership,
            "last_30_days": ridership_30d[-30:],
            "annual_historical": baseline.get("annual_ridership", []),
        },
        "fuel": {
            "latest_ron95": latest_ron95,
            "latest_diesel": latest_diesel,
            "history": fuel_history[-20:],
            "historical_extended": baseline.get("fuel_history", []),
        },
        "vehicles": {
            "monthly": vehicles_raw[-18:] if vehicles_raw else [],
        },
        "sector_model": {
            "sectors": sector_scores,
            "total_litres_saved_per_week": round(total_litres_wk),
            "total_trips_cut_per_day": total_trips_cut,
            "vs_mco_pct": round((total_litres_wk / 85_000_000) * 100, 1),
        },
        "wfh_policy": {
            "start_date": "2026-04-15",
            "days_active": wfh_days,
            "adoption_estimate_pct": round(wfh_adoption * 100, 1),
        },
        "api_sources": {
            "ridership": "api.data.gov.my · ridership_headline · no auth",
            "fuel":      "api.data.gov.my · fuelprice · no auth",
            "employment":"api.data.gov.my · employment_by_industry · no auth",
            "vehicles":  "api.data.gov.my · vehicles_type · no auth",
        },
    }

    # Write main output
    out_path = OUTPUT_DIR / "mf_index_daily.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"✅ Wrote {out_path}")

    # Write timestamp
    ts_path = OUTPUT_DIR / "last_updated.json"
    with open(ts_path, "w") as f:
        json.dump({"updated_at": now.isoformat(), "mf_index": mf_index}, f)
    print(f"✅ Wrote {ts_path}")
    print(f"🎯 MF-Index: {mf_index}  |  Ridership: {latest_ridership:,}  |  RON95: RM{latest_ron95:.2f}")

if __name__ == "__main__":
    main()
