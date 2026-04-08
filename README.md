# MY Mobility Index — Malaysia Fuel & WFH Dashboard

Real-time tracking of Malaysia's fuel crisis, public transport ridership, and WFH policy effectiveness. Combines live open APIs with 7 years of embedded historical data and daily Gemini AI sentiment analysis.

## 🚀 Quick Deploy (5 steps)

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/malaysia-mobility-dashboard
cd malaysia-mobility-dashboard
npm install

# 2. Run locally
npm run dev
# → http://localhost:5173

# 3. Build for production
npm run build

# 4. Deploy to Netlify
# → netlify.com → New site → Import from Git
# → Build command: npm run build
# → Publish directory: dist
# → Done!
```

## 📁 Folder Structure

```
malaysia-mobility-dashboard/
├── .github/workflows/
│   ├── daily-etl.yml          ← Runs 6 AM MYT daily: fetch APIs → Gemini → commit
│   └── deploy.yml             ← Auto-deploys to Netlify on every push
│
├── etl/                       ← Python data pipeline
│   ├── fetch_apis.py          ← Pulls data.gov.my APIs, computes MF-Index
│   ├── sentiment_gemini.py    ← Gemini 1.5 Pro policy sentiment analysis
│   ├── country_compare.py     ← World Bank API + country comparisons
│   ├── requirements.txt       ← Python dependencies
│   └── baseline/
│       └── historical.json    ← Embedded 2017–2025 anchor data (no API needed)
│
├── public/data/               ← Pipeline writes here daily; dashboard reads here
│   ├── mf_index_daily.json    ← MF-Index + ridership + fuel + sector model
│   ├── sentiment.json         ← Gemini analysis output
│   ├── country_compare.json   ← Country comparison with World Bank enrichment
│   └── last_updated.json      ← Timestamp + latest MF-Index score
│
├── src/
│   ├── App.jsx                ← Root component, section routing
│   ├── main.jsx               ← React entry point
│   ├── index.css              ← Tailwind + polyglassism styles
│   ├── components/            ← All UI sections
│   ├── hooks/                 ← Data fetching hooks
│   ├── utils/                 ← MF-Index formula, formatters, constants
│   └── data/baseline.js       ← Embedded historical data for JS
│
├── package.json               ← React 18 + Vite + Recharts + Framer Motion
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── netlify.toml               ← Build config + SPA redirects
```

## 🔑 GitHub Secrets Required

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Google AI Studio → Create API Key → [aistudio.google.com](https://aistudio.google.com) |
| `NETLIFY_AUTH_TOKEN` | ✅ Yes | Netlify → User Settings → Applications → Personal access tokens |
| `NETLIFY_SITE_ID` | ✅ Yes | Netlify → Site → Site configuration → Site ID |
| `PETRONAS_KEY` | Optional | developer.petronas.com |
| `WAZE_KEY` | Optional | waze.com/api/partners |

## 📡 Data Sources

### Live APIs (no auth, called from browser)
| API | Endpoint | Updates |
|---|---|---|
| PT Ridership | `api.data.gov.my/data-catalogue?id=ridership_headline` | Daily |
| Fuel Price | `api.data.gov.my/data-catalogue?id=fuelprice` | Weekly |
| Employment | `api.data.gov.my/data-catalogue?id=employment_by_industry` | Quarterly |
| Vehicles | `api.data.gov.my/data-catalogue?id=vehicles_type` | Monthly |

### Historical (embedded, no API call needed)
- Google Community Mobility Reports Malaysia 2020–Q1 2024
- Apple Mobility Trends Malaysia 2020–2023
- Prasarana Annual Reports 2017–2025
- KTMB Annual Reports 2017–2025
- KPDNHEP fuel gazette 2019–2025

### Gated (register separately)
- MYTraffic (MHA): `data.myttraffic.gov.my` — hourly road volume
- PETRONAS: `developer.petronas.com` — daily fuel sales by state
- Waze for Cities: `waze.com/api/partners` — congestion index

## 🧠 MF-Index Formula

```
MF-Index = 0.4 × Ridership_norm
         + 0.3 × FuelPolicy_norm
         + 0.3 × (100 − WFH_adoption%)

Where:
  Ridership_norm  = (daily_trips / 1,430,000) × 100  [2019 baseline]
  FuelPolicy_norm = ((ron95 − 1.25) / (2.08 − 1.25)) × 100
  WFH_adoption    = current WFH % of total workforce

Reference points:
  18  = MCO/FMCO peak (Apr 2021)
  58  = WFH Crisis (Apr 2026, projected)
  82  = Recovery 2025
  85  = Pre-pandemic 2019
```

## 🔄 Daily Pipeline Flow

```
06:00 AM MYT  → GitHub Actions triggers
               → fetch_apis.py      (data.gov.my pull → mf_index_daily.json)
06:05 AM       → sentiment_gemini.py (Gemini analysis → sentiment.json)
06:10 AM       → country_compare.py  (World Bank → country_compare.json)
06:15 AM       → git commit + push to main
06:20 AM       → Netlify auto-deploys updated build
```

## 💻 Local ETL Development

```bash
# Install Python deps
cd etl
pip install -r requirements.txt

# Run pipeline manually
python fetch_apis.py
GEMINI_API_KEY=your_key python sentiment_gemini.py
python country_compare.py

# Check output
cat ../public/data/mf_index_daily.json | python -m json.tool | head -40
```

## 🛠 Tech Stack

- **Frontend**: React 18 · Vite · Tailwind CSS · Recharts · Framer Motion
- **Data pipeline**: Python 3.12 · requests · google-generativeai
- **CI/CD**: GitHub Actions (daily cron + push trigger)
- **Hosting**: Netlify (auto-deploy from main branch)
- **Design**: Polyglassism · white background · backdrop-filter blur

---
*Built for Malaysian transport policy analysis · Apr 2026*
