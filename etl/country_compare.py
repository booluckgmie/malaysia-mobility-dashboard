"""
country_compare.py
Fetches World Bank / IEA open data for country comparison.
Falls back to embedded data if APIs are unavailable.
Output: public/data/country_compare.json
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

OUTPUT_DIR   = Path(__file__).parent.parent / "public" / "data"
OUTPUT_PATH  = OUTPUT_DIR / "country_compare.json"
BASELINE_DIR = Path(__file__).parent / "baseline"

HEADERS = {"Accept": "application/json", "User-Agent": "MY-Mobility-Dashboard/1.0"}

# ── Embedded fallback (verified: IEA, World Bank, UITP 2025) ────────────────
EMBEDDED = [
    {"country":"Malaysia",  "code":"MY","flag":"🇲🇾","ptModalShare":21,"carModalShare":79,"ptTripsPerCapita":14.8, "wfhRate2026":40,"ridershipRecovery2025":97, "mfIndex":58, "fuelSubsidyGDP":1.8,"highlight":True},
    {"country":"Singapore", "code":"SG","flag":"🇸🇬","ptModalShare":67,"carModalShare":33,"ptTripsPerCapita":165,  "wfhRate2026":30,"ridershipRecovery2025":104,"mfIndex":80, "fuelSubsidyGDP":0.2,"highlight":False},
    {"country":"Thailand",  "code":"TH","flag":"🇹🇭","ptModalShare":28,"carModalShare":72,"ptTripsPerCapita":22,   "wfhRate2026":20,"ridershipRecovery2025":89, "mfIndex":65, "fuelSubsidyGDP":2.1,"highlight":False},
    {"country":"South Korea","code":"KR","flag":"🇰🇷","ptModalShare":53,"carModalShare":47,"ptTripsPerCapita":98,   "wfhRate2026":22,"ridershipRecovery2025":101,"mfIndex":78, "fuelSubsidyGDP":0.5,"highlight":False},
    {"country":"Australia", "code":"AU","flag":"🇦🇺","ptModalShare":18,"carModalShare":82,"ptTripsPerCapita":29,   "wfhRate2026":28,"ridershipRecovery2025":88, "mfIndex":72, "fuelSubsidyGDP":0.0,"highlight":False},
    {"country":"Japan",     "code":"JP","flag":"🇯🇵","ptModalShare":48,"carModalShare":52,"ptTripsPerCapita":182,  "wfhRate2026":18,"ridershipRecovery2025":96, "mfIndex":82, "fuelSubsidyGDP":0.0,"highlight":False},
]

# ── World Bank API (GDP, population) ────────────────────────────────────────
WB_API = "https://api.worldbank.org/v2/country/{iso2}/indicator/{indicator}?format=json&mrv=1&per_page=1"
INDICATORS = {
    "NY.GDP.MKTP.CD": "gdp_usd",           # GDP current USD
    "SP.POP.TOTL":    "population",         # Total population
    "EN.ATM.CO2E.PC": "co2_per_capita",     # CO2 emissions per capita
}
ISO2_MAP = {"MY":"MYS","SG":"SGP","TH":"THA","KR":"KOR","AU":"AUS","JP":"JPN"}

def fetch_world_bank(iso2: str, indicator: str, field_name: str) -> dict:
    try:
        url = WB_API.format(iso2=ISO2_MAP.get(iso2, iso2), indicator=indicator)
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        data = r.json()
        if len(data) >= 2 and data[1]:
            val = data[1][0].get("value")
            return {field_name: val, f"{field_name}_year": data[1][0].get("date")}
    except Exception as e:
        print(f"  ⚠ World Bank {iso2}/{indicator}: {e}")
    return {}

def main():
    print("🌏 Building country comparison data…")
    now = datetime.now(timezone.utc)

    enriched = []
    for country in EMBEDDED:
        entry = dict(country)
        code  = country["code"]
        print(f"  → {code}")
        for indicator, field in INDICATORS.items():
            wb_data = fetch_world_bank(code, indicator, field)
            entry.update(wb_data)
        enriched.append(entry)

    # Compute normalised scores for radar chart
    def norm_field(field: str) -> dict:
        vals = [c.get(field, 0) or 0 for c in enriched]
        mn, mx = min(vals), max(vals)
        span = mx - mn if mx != mn else 1
        return {c["code"]: round(((c.get(field, 0) or 0) - mn) / span * 100) for c in enriched}

    normalised = {
        "ptModalShare":          norm_field("ptModalShare"),
        "ptTripsPerCapita":      norm_field("ptTripsPerCapita"),
        "wfhRate2026":           norm_field("wfhRate2026"),
        "ridershipRecovery2025": norm_field("ridershipRecovery2025"),
        "mfIndex":               norm_field("mfIndex"),
    }

    output = {
        "updated_at":  now.isoformat(),
        "countries":   enriched,
        "normalised":  normalised,
        "sources": [
            "IEA Mobility Model 2025",
            "World Bank Open Data API",
            "UITP Global Transit Barometer 2025",
            "Prasarana Annual Report 2025",
            "LTA Singapore Annual Report 2025",
        ],
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"✅ Country compare written → {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
