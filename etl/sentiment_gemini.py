"""
sentiment_gemini.py
Generates daily policy sentiment analysis using Groq (primary), Cerebras
(second fallback), and Gemini (last-resort fallback) — in that order,
fastest-resetting free-tier quota first.

Env vars:
  GROQ_API_KEY     — required (get free key at console.groq.com)
  CEREBRAS_API_KEY — optional fallback (cloud.cerebras.ai)
  GEMINI_API_KEY   — optional last-resort fallback

Output: public/data/sentiment.json

Install: pip install groq google-genai requests
"""
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

# ── Groq ────────────────────────────────────────────────────────────
try:
    from groq import Groq, RateLimitError, APIStatusError
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

# ── Gemini (optional fallback) ───────────────────────────────────────
try:
    from google import genai as ggenai
    from google.genai import types as gtypes
    from google.genai.errors import ClientError
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

OUTPUT_DIR  = Path(__file__).parent.parent / "public" / "data"
MF_JSON     = OUTPUT_DIR / "mf_index_daily.json"
OUTPUT_PATH = OUTPUT_DIR / "sentiment.json"

# ── Groq model priority (free tier, ordered best → most available) ───
GROQ_MODELS = [
    "llama-3.3-70b-versatile",   # best quality, generous limits
    "llama-3.1-8b-instant",      # fast, very high RPM
    "gemma2-9b-it",              # Google Gemma via Groq
    "mixtral-8x7b-32768",        # wide context fallback
]

# ── Cerebras model priority (free tier, OpenAI-compatible REST API) ───
CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
CEREBRAS_MODELS = [
    "llama-3.3-70b",
    "llama3.1-8b",
]

# ── Gemini model priority ─────────────────────────────────────────────
GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]

MAX_RETRIES    = 3
RETRY_BASE_SEC = 15


# ────────────────────────────────────────────────────────────────────
# Data loading
# ────────────────────────────────────────────────────────────────────
def load_mf_data() -> dict:
    if MF_JSON.exists():
        with open(MF_JSON) as f:
            return json.load(f)
    return {}


# ────────────────────────────────────────────────────────────────────
# Prompt builder
# ────────────────────────────────────────────────────────────────────
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

    return f"""You are a senior transport and energy policy analyst for Malaysia. Analyse the following daily mobility data and provide a structured policy sentiment assessment.

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
  "source": "<provider>",
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
Tailor the analysis to today's specific data values, not generic statements."""


# ────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────
def strip_fences(text: str) -> str:
    """Remove markdown code fences if model ignores JSON-mode instruction."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(l for l in lines if not l.startswith("```"))
    return text.strip()


def parse_json(raw: str, model_name: str) -> dict:
    raw = strip_fences(raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON parse failed for {model_name}: {e}\nSnippet: {raw[:300]}")


# ────────────────────────────────────────────────────────────────────
# Groq caller
# ────────────────────────────────────────────────────────────────────
def call_groq(api_key: str, prompt: str) -> tuple[str, str]:
    """
    Try each Groq model in order with retry on 429.
    Returns (raw_text, model_name) on success.
    Raises RuntimeError if all models fail.
    """
    if not GROQ_AVAILABLE:
        raise RuntimeError("groq package not installed — run: pip install groq")

    client = Groq(api_key=api_key)

    system_msg = (
        "You are a JSON-only API. You must respond with valid JSON and absolutely "
        "nothing else — no markdown, no backticks, no explanation."
    )

    for model_name in GROQ_MODELS:
        print(f"   → [Groq] Trying {model_name}…")
        wait = RETRY_BASE_SEC

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                completion = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_msg},
                        {"role": "user",   "content": prompt},
                    ],
                    temperature=0.2,
                    max_tokens=2048,
                )
                raw = completion.choices[0].message.content
                print(f"   ✓ Response from {model_name}")
                return raw, model_name

            except RateLimitError as e:
                if attempt < MAX_RETRIES:
                    # Try to read retry-after from headers
                    retry_after = getattr(e, "retry_after", None) or wait
                    delay = float(retry_after) + 2
                    print(f"     ⏳ 429 — waiting {delay:.0f}s (attempt {attempt}/{MAX_RETRIES - 1})…")
                    time.sleep(delay)
                    wait = min(wait * 2, 120)
                else:
                    print(f"     ✗ Quota exhausted on {model_name}")
                    break

            except APIStatusError as e:
                print(f"     ✗ APIStatusError {e.status_code} on {model_name}: {e.message}")
                break  # non-retryable, try next model

            except Exception as e:
                print(f"     ✗ Unexpected error on {model_name}: {type(e).__name__}: {e}")
                break

        print(f"   ✗ {model_name} failed — trying next…")

    raise RuntimeError("All Groq models exhausted.")


# ────────────────────────────────────────────────────────────────────
# Cerebras caller (second fallback — free tier, resets fast like Groq)
# ────────────────────────────────────────────────────────────────────
def call_cerebras(api_key: str, prompt: str) -> tuple[str, str]:
    """
    Try each Cerebras model in order with retry on 429.
    Returns (raw_text, model_name) on success.
    Raises RuntimeError if all models fail.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    system_msg = (
        "You are a JSON-only API. You must respond with valid JSON and absolutely "
        "nothing else — no markdown, no backticks, no explanation."
    )

    for model_name in CEREBRAS_MODELS:
        print(f"   → [Cerebras] Trying {model_name}…")
        wait = RETRY_BASE_SEC

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                resp = requests.post(
                    CEREBRAS_API_URL,
                    headers=headers,
                    json={
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": system_msg},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.2,
                        "max_tokens": 2048,
                    },
                    timeout=30,
                )

                if resp.status_code == 429:
                    if attempt < MAX_RETRIES:
                        retry_after = resp.headers.get("retry-after")
                        delay = float(retry_after) + 2 if retry_after else wait
                        print(f"     ⏳ 429 — waiting {delay:.0f}s (attempt {attempt}/{MAX_RETRIES - 1})…")
                        time.sleep(delay)
                        wait = min(wait * 2, 120)
                        continue
                    else:
                        print(f"     ✗ Quota exhausted on {model_name}")
                        break

                resp.raise_for_status()
                raw = resp.json()["choices"][0]["message"]["content"]
                print(f"   ✓ Response from {model_name}")
                return raw, model_name

            except requests.HTTPError as e:
                print(f"     ✗ HTTPError on {model_name}: {e}")
                break  # non-retryable, try next model

            except Exception as e:
                print(f"     ✗ Unexpected error on {model_name}: {type(e).__name__}: {e}")
                break

        print(f"   ✗ {model_name} failed — trying next…")

    raise RuntimeError("All Cerebras models exhausted.")


# ────────────────────────────────────────────────────────────────────
# Gemini caller (last-resort fallback)
# ────────────────────────────────────────────────────────────────────
def call_gemini(api_key: str, prompt: str) -> tuple[str, str]:
    """
    Try each Gemini model with retry on 429.
    Returns (raw_text, model_name) on success.
    Raises RuntimeError if all models fail.
    """
    if not GEMINI_AVAILABLE:
        raise RuntimeError("google-genai package not installed — run: pip install google-genai")

    client = ggenai.Client(api_key=api_key)

    for model_name in GEMINI_MODELS:
        print(f"   → [Gemini] Trying {model_name}…")
        wait = RETRY_BASE_SEC

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=gtypes.GenerateContentConfig(
                        temperature=0.2,
                        max_output_tokens=2048,
                        response_mime_type="application/json",
                    ),
                )
                raw = response.text.strip()
                print(f"   ✓ Response from {model_name}")
                return raw, model_name

            except ClientError as e:
                status = getattr(e, "status_code", None) or getattr(e, "code", None)
                if status == 429:
                    if attempt < MAX_RETRIES:
                        import re
                        m = re.search(r"retry in (\d+(?:\.\d+)?)s", str(e), re.IGNORECASE)
                        delay = float(m.group(1)) + 2 if m else wait
                        print(f"     ⏳ 429 — waiting {delay:.0f}s (attempt {attempt}/{MAX_RETRIES - 1})…")
                        time.sleep(delay)
                        wait = min(wait * 2, 120)
                    else:
                        print(f"     ✗ Quota exhausted on {model_name}")
                        break
                else:
                    print(f"     ✗ ClientError {status} on {model_name}: {e}")
                    break

            except Exception as e:
                print(f"     ✗ Unexpected error on {model_name}: {type(e).__name__}: {e}")
                break

        print(f"   ✗ {model_name} failed — trying next…")

    raise RuntimeError("All Gemini models exhausted.")


# ────────────────────────────────────────────────────────────────────
# Fallback static output (never fail the pipeline)
# ────────────────────────────────────────────────────────────────────
def write_fallback(data: dict):
    score = data.get("mf_index", {}).get("score", 58)
    sentiment = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": "fallback-static",
        "source": "fallback",
        "overall_sentiment": "neutral",
        "overall_score": score,
        "summary": (
            "Sentiment analysis unavailable — Groq, Cerebras, and Gemini API quotas were all exhausted. "
            f"Latest MF-Index score is {score}/100. Manual review recommended."
        ),
        "signals": [],
        "recommendation": "Resume analysis when a provider's quota resets (Groq and Cerebras reset hourly/daily; Gemini resets daily at midnight Pacific).",
        "data_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "alert": None,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(sentiment, f, indent=2, ensure_ascii=False)
    print(f"   ⚠  Fallback sentiment written → {OUTPUT_PATH}")


# ────────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────────
def run_sentiment():
    groq_key     = os.environ.get("GROQ_API_KEY", "").strip()
    cerebras_key = os.environ.get("CEREBRAS_API_KEY", "").strip()
    gemini_key   = os.environ.get("GEMINI_API_KEY", "").strip()

    if not groq_key and not cerebras_key and not gemini_key:
        print("❌ No API keys set. Need GROQ_API_KEY, CEREBRAS_API_KEY, or GEMINI_API_KEY.")
        sys.exit(1)

    print("🧠 Running sentiment analysis…")
    print(f"   Groq    : {'✓ key present' if groq_key else '✗ not set'}")
    print(f"   Cerebras: {'✓ key present' if cerebras_key else '✗ not set'}")
    print(f"   Gemini  : {'✓ key present' if gemini_key else '✗ not set'}")

    data = load_mf_data()
    if not data:
        print("⚠  No MF-Index data found — run fetch_apis.py first.")
        sys.exit(1)

    prompt   = build_prompt(data)
    raw_text = None
    used_model = None
    source   = None

    # ── 1. Try Groq first ───────────────────────────────────────────
    if groq_key:
        try:
            raw_text, used_model = call_groq(groq_key, prompt)
            source = "groq"
        except RuntimeError as e:
            print(f"   ✗ Groq exhausted: {e}")

    # ── 2. Fall back to Cerebras ─────────────────────────────────────
    if raw_text is None and cerebras_key:
        print("   → Falling back to Cerebras…")
        try:
            raw_text, used_model = call_cerebras(cerebras_key, prompt)
            source = "cerebras"
        except RuntimeError as e:
            print(f"   ✗ Cerebras exhausted: {e}")

    # ── 3. Fall back to Gemini (last resort — slowest quota reset) ───
    if raw_text is None and gemini_key:
        print("   → Falling back to Gemini…")
        try:
            raw_text, used_model = call_gemini(gemini_key, prompt)
            source = "gemini-live"
        except RuntimeError as e:
            print(f"   ✗ Gemini exhausted: {e}")

    # ── 4. Static fallback — never break the pipeline ───────────────
    if raw_text is None:
        print("⚠  All providers failed — writing static fallback.")
        write_fallback(data)
        sys.exit(0)   # exit 0 = don't fail CI

    # ── Parse & save ────────────────────────────────────────────────
    try:
        sentiment = parse_json(raw_text, used_model)
    except ValueError as e:
        print(f"❌ {e}")
        write_fallback(data)
        sys.exit(0)

    sentiment["generated_at"] = datetime.now(timezone.utc).isoformat()
    sentiment["model"]  = used_model
    sentiment["source"] = source

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(sentiment, f, indent=2, ensure_ascii=False)

    print(f"✅ Sentiment written → {OUTPUT_PATH}")
    print(f"   Provider: {source} / {used_model}")
    print(f"   Overall : {sentiment.get('overall_sentiment')} ({sentiment.get('overall_score')}/100)")
    print(f"   {sentiment.get('summary', '')[:120]}…")


if __name__ == "__main__":
    run_sentiment()
