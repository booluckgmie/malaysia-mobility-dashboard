import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, RefreshCw, Database, Cpu, Globe } from 'lucide-react'

const PIPELINE_STEPS = [
  {
    step: 1, icon: Globe, label: 'Fetch live ridership',
    api: 'api.data.gov.my · ridership_headline',
    schedule: 'Daily 6:00 AM MYT',
    status: 'live', method: 'GET · no auth · 30 records',
  },
  {
    step: 2, icon: Globe, label: 'Fetch fuel prices',
    api: 'api.data.gov.my · fuelprice',
    schedule: 'Daily 6:00 AM MYT',
    status: 'live', method: 'GET · no auth · 24 records',
  },
  {
    step: 3, icon: Globe, label: 'Fetch employment data',
    api: 'api.data.gov.my · employment_by_industry',
    schedule: 'Weekly Sunday',
    status: 'live', method: 'GET · no auth · DOSM quarterly',
  },
  {
    step: 4, icon: Database, label: 'Merge historical baseline',
    api: 'etl/baseline/historical.json',
    schedule: 'Every run',
    status: 'embedded', method: 'Local file · 2017–2025 anchors',
  },
  {
    step: 5, icon: Cpu, label: 'Compute MF-Index',
    api: 'etl/compute_index.py',
    schedule: 'Every run',
    status: 'computed', method: 'α·Ridership + β·Fuel + γ·WFH',
  },
  {
    step: 6, icon: Cpu, label: 'Gemini sentiment analysis',
    api: 'generativelanguage.googleapis.com',
    schedule: 'Daily 6:10 AM MYT',
    status: 'key-required', method: 'GEMINI_API_KEY → secret',
  },
  {
    step: 7, icon: Database, label: 'Write JSON outputs',
    api: 'public/data/mf_index_daily.json + sentiment.json',
    schedule: 'Every run',
    status: 'computed', method: 'git commit + push',
  },
]

const STATUS_CONFIG = {
  'live':         { label: 'Live · no auth', color: '#3B6D11', bg: '#EAF3DE', icon: CheckCircle },
  'embedded':     { label: 'Embedded',        color: '#185FA5', bg: '#EEF5FF', icon: Database },
  'computed':     { label: 'Computed',         color: '#534AB7', bg: '#EEEDFE', icon: Cpu },
  'key-required': { label: 'Needs API key',   color: '#BA7517', bg: '#FAEEDA', icon: Clock },
}

const SECRETS = [
  { name: 'GEMINI_API_KEY', desc: 'Google AI Studio → Create API Key', required: true },
  { name: 'GITHUB_TOKEN',   desc: 'Auto-provided by GitHub Actions (write:contents)', required: true },
  { name: 'PETRONAS_KEY',   desc: 'developer.petronas.com (optional)', required: false },
  { name: 'WAZE_KEY',       desc: 'waze.com/api/partners (optional)', required: false },
]

export default function PipelineStatus() {
  const [showYAML, setShowYAML] = useState(false)

  const workflowYAML = `name: Daily ETL + Sentiment

on:
  schedule:
    - cron: '0 22 * * *'  # 6:00 AM MYT (UTC+8)
  workflow_dispatch:        # manual trigger

jobs:
  etl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        run: pip install -r etl/requirements.txt

      - name: Fetch APIs & compute index
        run: python etl/fetch_apis.py

      - name: Run sentiment analysis
        run: python etl/sentiment_gemini.py
        env:
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}

      - name: Run country comparison
        run: python etl/country_compare.py

      - name: Commit data outputs
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add public/data/
          git diff --staged --quiet || git commit -m "chore: daily data update \$(date -u +%Y-%m-%d)"
          git push`

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Daily update pipeline</div>
        <h2 className="text-3xl font-light text-gray-800">How the data stays fresh</h2>
        <p className="text-sm text-gray-500 mt-3 max-w-lg mx-auto">GitHub Actions runs daily at 6 AM MYT — pulls APIs, computes index, runs Gemini analysis, commits JSON outputs</p>
      </div>

      {/* Pipeline steps */}
      <div className="glass rounded-3xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">Pipeline steps</div>
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Runs daily · 6:00 AM MYT
          </div>
        </div>
        {PIPELINE_STEPS.map((s, i) => {
          const cfg = STATUS_CONFIG[s.status]
          const Icon = s.icon
          const StatusIcon = cfg.icon
          return (
            <motion.div key={s.step}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-start gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-blue-50/20 transition-colors">
              <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-blue-600">{s.step}</span>
              </div>
              <Icon size={15} className="text-gray-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">{s.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
                <div className="text-xs font-mono text-blue-600 mt-0.5 truncate">{s.api}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.method} · {s.schedule}</div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Secrets */}
        <div className="glass rounded-3xl p-6">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">GitHub Secrets needed</div>
          <div className="space-y-3">
            {SECRETS.map(s => (
              <div key={s.name} className="flex items-start gap-3">
                <span className={`text-xs px-2 py-1 rounded font-mono mt-0.5 flex-shrink-0 ${s.required ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.required ? 'REQUIRED' : 'OPTIONAL'}
                </span>
                <div>
                  <div className="text-xs font-mono text-blue-700 font-semibold">{s.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 leading-relaxed">
            Set at: github.com → your-repo → Settings → Secrets → Actions → New repository secret
          </div>
        </div>

        {/* Workflow YAML */}
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">.github/workflows/daily-etl.yml</div>
            <button onClick={() => setShowYAML(!showYAML)}
              className="text-xs px-3 py-1.5 glass-sm rounded-full text-blue-600 hover:bg-blue-50 transition-colors">
              {showYAML ? 'Hide' : 'Show'} YAML
            </button>
          </div>
          {showYAML ? (
            <pre className="text-xs font-mono text-gray-600 overflow-x-auto leading-relaxed max-h-80 overflow-y-auto">
              {workflowYAML}
            </pre>
          ) : (
            <div className="space-y-3">
              {[
                ['Trigger', 'cron: 0 22 * * * (6 AM MYT)'],
                ['Runtime', 'ubuntu-latest · Python 3.12'],
                ['Output', 'public/data/*.json committed to main'],
                ['Deploy', 'Netlify auto-deploys on push to main'],
                ['Fallback', 'Dashboard shows embedded data if pipeline skipped'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 text-xs">
                  <span className="text-gray-400 w-20 flex-shrink-0">{k}</span>
                  <span className="text-gray-600 font-mono">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
