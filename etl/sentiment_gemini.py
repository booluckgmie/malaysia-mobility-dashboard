"""
sentiment_gemini.py
Calls Google Gemini 1.5 Pro to generate daily policy sentiment analysis
from consolidated mobility + fuel + WFH data.

Requires: GEMINI_API_KEY env var
Output:   public/data/sentiment.json
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import google.generativeai as genai
except ImportError:
    print("❌ google-generativeai not installed. Run: pip install google-generativeai")
    sys.exit(1)

OUTPUT_DIR    = Path(__file__).parent.parent / "public" / "data"
MF_JSON       = OUTPUT_DIR / "mf_index_daily.json"
OUTPUT_PATH   = OUTPUT_DIR / "sentiment.json"

def load_mf_data() -> dict:
    if MF_JSON.exists():
        with open(MF_JSON) as f:
            return json.load(f)
    return {}

def build_prompt(data: dict) -> str:
    mf    = data.get("mf_index", {})
    rider = data.get("ridership", {})
    fuel  = data.get("fuel", {})
    sect  = data.get("sector_model", {})
    wfh   = data.get("wfh_policy", {})

    return f"""
You are a senior transport and energy policy analyst for Malaysia. Analyse the following daily mobility data and provide a structured policy sentiment assessment.

## Current Data ({datetime.now(timezone.utc).strftime('%Y-%m-%d')})
- MF-Index: {mf.get('score', 58)} / 100 ({mf.get('interpretation', 'Moderate')})
  - Ridership component: {mf.get('components', {}).get('ridership_norm', 70)} / 100
  - Fuel policy component: {mf.get('components', {}).get('fuel_norm', 65)} / 100
  - WFH adoption: {mf.get('components', {}).get('wfh_adoption', 40)}%
- Latest daily PT ridership: {rider.get('latest_daily_trips', 'N/A'):,} trips
- RON95 price: RM {fuel.get('latest_ron95', 2.05):.2f} / litre
- Diesel price: RM {fuel.get('latest_diesel', 3.35):.2f} / litre
- WFH policy: Active for {wfh.get('days_active', 0)} days (since 15 Apr 2026)
- Total fuel saved/week: {sect.get('total_litres_saved_per_week', 0) / 1e6:.1f}M litres
- vs MCO peak saving: {sect.get('vs_mco_pct', 34)}% of MCO's ~85M L/week

## Sector Breakdown
{json.dumps([{"name": s["name"], "wfh": f"{s['wfh']*100:.0f}%", "mobilityScore": s["mobilityScore"], "risk": s["risk"]} for s in sect.get("sectors", [])], indent=2)}

## Reference Points
- Pre-pandemic (2019): MF-Index 85, ridership 522M/yr, RON95 RM2.08
- MCO peak (2021): MF-Index 18, ridership 175M/yr, RON95 RM1.25, WFH ~65%
- Recovery (2025): MF-Index 82, ridership 506M/yr

---
Respond ONLY with valid JSON (no markdown, no backticks) in exactly this structure:
{{
  "generated_at": "<ISO timestamp>",
  "model": "gemini-1.5-pro",
  "source": "gemini-live",
  "overall_sentiment": "<one of: very_positive|positive|cautiously_optimistic|neutral|cautiously_negative|negative|critical>",
  "overall_score": <integer 0-100>,
  "summary": "<2-3 sentence executive summary for a minister>",
  "signals": [
    {{
      "dimension": "<policy dimension name>",
      "score": <integer 0-100>,
      "dir": "<positive|neutral|negative>",
      "detail": "<2-3 sentence analysis specific to today's data>"
    }}
  ],
  "recommendation": "<concrete 2-3 sentence policy recommendation with specific targets>",
  "data_date": "<YYYY-MM-DD>",
  "alert": "<optional: urgent flag if MF-Index moved >10 points in 7 days, else null>"
}}

Provide exactly 5 signals covering: fuel savings impact, PT ridership effects, economic risk, policy equity, long-term modal shift.
Tailor the analysis to today's specific data values, not generic statements.
"""

def run_sentiment():
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("❌ GEMINI_API_KEY not set — skipping sentiment analysis")
        print("   Set via: export GEMINI_API_KEY=your_key")
        print("   Or add to GitHub Secrets as GEMINI_API_KEY")
        sys.exit(0)

    print("🧠 Running Gemini sentiment analysis…")
    genai.configure(api_key=api_key)

    data = load_mf_data()
    if not data:
        print("⚠ No MF-Index data found. Run fetch_apis.py first.")
        sys.exit(1)

    prompt = build_prompt(data)

    model = genai.GenerativeModel(
        model_name="models/gemini-1.5-pro",
        generation_config=genai.GenerationConfig(
            temperature=0.2,        # low temp = consistent, factual
            max_output_tokens=2048,
            response_mime_type="application/json",
        )
    )

    response = model.generate_content(prompt)
    raw_text = response.text.strip()

    # Strip markdown fences if present
    if raw_text.startswith("```"):
        lines = raw_text.splitlines()
        raw_text = "\n".join(l for l in lines if not l.startswith("```"))

    try:
        sentiment = json.loads(raw_text)
        
    except Exception as e:
            print(f"❌ Gemini Error: {e}")
            # If it's still a 404, let's try the flash model as a backup
            print("🔄 Attempting backup with gemini-1.5-flash...")
            model = genai.GenerativeModel(model_name="models/gemini-1.5-flash")
            response = model.generate_content(prompt)
            # Note: Flash might return markdown, so we handle it:
            text = response.text.replace('```json', '').replace('```', '').strip()
            sentiment = json.loads(text)
        
    # Inject guaranteed timestamp
    sentiment["generated_at"] = datetime.now(timezone.utc).isoformat()

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(sentiment, f, indent=2, ensure_ascii=False)

    print(f"✅ Sentiment written → {OUTPUT_PATH}")
    print(f"   Overall: {sentiment.get('overall_sentiment')} ({sentiment.get('overall_score')}/100)")
    print(f"   {sentiment.get('summary', '')[:100]}…")

if __name__ == "__main__":
    run_sentiment()
