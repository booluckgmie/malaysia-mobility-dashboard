"""
sentiment_gemini.py
Calls Google Gemini to generate daily policy sentiment analysis
from consolidated mobility + fuel + WFH data.

Requires: GEMINI_API_KEY env var
Output:   public/data/sentiment.json

SDK: google-genai (new, replaces deprecated google-generativeai)
Install: pip install google-genai
"""
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    from google import genai
    from google.genai import types
    from google.genai.errors import ClientError
except ImportError:
    print("❌ google-genai not installed. Run: pip install google-genai")
    print("   (Note: this is the NEW SDK, not google-generativeai)")
    sys.exit(1)

OUTPUT_DIR  = Path(__file__).parent.parent / "public" / "data"
MF_JSON     = OUTPUT_DIR / "mf_index_daily.json"
OUTPUT_PATH = OUTPUT_DIR / "sentiment.json"

# -------------------------------------------------------------------
# Model priority list — ordered best → cheapest/most-available.
# gemini-2.0-flash     : latest fast model (may hit free-tier quota)
# gemini-2.0-flash-lite: lighter quota limits
# gemini-1.5-flash-8b  : smallest / highest free-tier RPM
# -------------------------------------------------------------------
MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-8b",
]

MAX_RETRIES    = 3          # retries per model on 429
RETRY_BASE_SEC = 15         # base wait on 429 (seconds), doubles each attempt


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

    sectors_json = json.dumps(
        [
            {
                "name": s["name"],
                "wfh": f"{s['wfh'] * 100:.0f}%",
                "mobilityScore": s["mobilityScore"],
                "risk": s["risk"],
            }
            for s in sect.get("sectors", [])
        ],
        indent=2,
    )

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
{sectors_json}

## Reference Points
- Pre-pandemic (2019): MF-Index 85, ridership 522M/yr, RON95 RM2.08
- MCO peak (2021): MF-Index 18, ridership 175M/yr, RON95 RM1.25, WFH ~65%
- Recovery (2025): MF-Index 82, ridership 506M/yr

---
Respond ONLY with valid JSON (no markdown, no backticks) in exactly this structure:
{{
  "generated_at": "<ISO timestamp>",
  "model": "<model used>",
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
  "alert": "<urgent flag if MF-Index moved >10 points in 7 days, else null>"
}}

Provide exactly 5 signals covering: fuel savings impact, PT ridership effects, economic risk, policy equity, long-term modal shift.
Tailor the analysis to today's specific data values, not generic statements.
"""


def call_with_retry(client: "genai.Client", model_name: str, prompt: str) -> str:
    """
    Attempt to call the Gemini API with exponential backoff on 429.
    Returns raw text on success, raises on non-retryable errors.
    """
    wait = RETRY_BASE_SEC
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=2048,
                    response_mime_type="application/json",
                ),
            )
            return response.text.strip()

        except ClientError as e:
            status = getattr(e, "status_code", None) or getattr(e, "code", None)

            if status == 429:
                # Parse retry_delay from error message if available
                delay = wait
                msg = str(e)
                import re
                m = re.search(r'retry in (\d+(?:\.\d+)?)s', msg, re.IGNORECASE)
                if m:
                    delay = max(float(m.group(1)) + 2, wait)

                if attempt < MAX_RETRIES:
                    print(f"     ⏳ 429 quota — waiting {delay:.0f}s before retry {attempt}/{MAX_RETRIES - 1}…")
                    time.sleep(delay)
                    wait *= 2   # exponential backoff
                    continue
                else:
                    print(f"     ✗ Quota exhausted after {MAX_RETRIES} attempts.")
                    raise

            elif status == 404:
                print(f"     ✗ Model not found (404).")
                raise

            else:
                print(f"     ✗ ClientError {status}: {e}")
                raise

        except Exception as e:
            print(f"     ✗ Unexpected error: {type(e).__name__}: {e}")
            raise


def strip_fences(text: str) -> str:
    """Remove markdown code fences if the model ignores response_mime_type."""
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(l for l in lines if not l.startswith("```"))
    return text.strip()


def run_sentiment():
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("❌ GEMINI_API_KEY not set — skipping sentiment analysis")
        sys.exit(0)

    print("🧠 Running Gemini sentiment analysis…")

    client = genai.Client(api_key=api_key)

    data = load_mf_data()
    if not data:
        print("⚠  No MF-Index data found — run fetch_apis.py first.")
        sys.exit(1)

    prompt = build_prompt(data)
    raw_text = None
    used_model = None

    for model_name in MODELS:
        print(f"   → Trying {model_name}…")
        try:
            raw_text = call_with_retry(client, model_name, prompt)
            used_model = model_name
            print(f"   ✓ Response received from {model_name}")
            break
        except Exception:
            print(f"   ✗ {model_name} unavailable — trying next model…")
            continue

    if raw_text is None:
        print("❌ All Gemini models failed. Exiting.")
        sys.exit(1)

    raw_text = strip_fences(raw_text)

    try:
        sentiment = json.loads(raw_text)
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        print(f"   Raw snippet: {raw_text[:400]}")
        sys.exit(1)

    # Guarantee correct metadata
    sentiment["generated_at"] = datetime.now(timezone.utc).isoformat()
    sentiment["model"] = used_model

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(sentiment, f, indent=2, ensure_ascii=False)

    print(f"✅ Sentiment written → {OUTPUT_PATH}")
    print(f"   Model  : {used_model}")
    print(f"   Overall: {sentiment.get('overall_sentiment')} ({sentiment.get('overall_score')}/100)")
    print(f"   {sentiment.get('summary', '')[:120]}…")


if __name__ == "__main__":
    run_sentiment()