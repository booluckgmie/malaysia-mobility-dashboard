import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ANNUAL_RIDERSHIP, GOOGLE_MOBILITY_MY, ERA_COLORS, POLICY_EVENTS } from '../data/baseline.js'
import { fmtM } from '../utils/formatters.js'

const ERAS = [
  {
    id: 'pre', label: 'Pre-Pandemic', years: '2017–2019',
    headline: '522M', headlineSub: 'annual PT trips (2019 peak)',
    story: 'Malaysia\'s public transport was on a growth trajectory — 522 million annual trips in 2019, up from 492M in 2017. But private cars still dominated ~80% of all trips. The structural problem: 38.7 million vehicles for 34 million people.',
    kpis: [
      { label: 'Prasarana (LRT/MRT/Bus)', value: '465M trips/yr' },
      { label: 'KTMB (rail)', value: '57M trips/yr' },
      { label: 'RON95 price', value: 'RM 2.08/L' },
      { label: 'WFH rate', value: '~5% (tech only)' },
    ],
    insight: 'Even with MRT3 under development, modal share for PT was stuck at ~20–25%. The car was king.',
  },
  {
    id: 'mco', label: 'MCO / FMCO', years: '2020–2021',
    headline: '−73%', headlineSub: 'workplace mobility · April 2020',
    story: 'MCO 1.0 (March 2020) was Malaysia\'s sharpest mobility shock. Workplace visits collapsed 73%, transit stations 78%. Annual PT ridership fell from 522M to just 175M in 2021. The global oil crash pushed RON95 to RM 1.25 — the lowest in a decade.',
    kpis: [
      { label: 'PT trips 2021 (FMCO year)', value: '175M (−66%)' },
      { label: 'RON95 lowest', value: 'RM 1.25 (Apr 2020)' },
      { label: 'WFH rate at FMCO', value: '~65%' },
      { label: 'Fuel saved (MCO peak)', value: '~85M L/week' },
    ],
    insight: 'The 85M litres/week fuel saving at MCO peak is now the benchmark the 2026 WFH policy is measured against. But MCO killed economic activity. WFH tries to replicate the saving without the pain.',
  },
  {
    id: 'recover', label: 'Recovery', years: '2022–2025',
    headline: '+97%', headlineSub: 'ridership rebound · 2021→2025',
    story: 'Malaysia\'s endemic declaration (2022) unlocked rapid mobility rebound. By 2025, PT ridership reached 506M trips — 97% of 2019\'s peak. But a structural split emerged: diesel was de-subsidised (RM 3.35/L) while RON95 stayed at RM 2.05, creating two-tier fuel pressure.',
    kpis: [
      { label: 'PT trips 2025', value: '506M (97% of 2019)' },
      { label: 'Workplace mobility', value: '+5% vs 2020 baseline' },
      { label: 'RON95 (held)', value: 'RM 2.05/L' },
      { label: 'Diesel (floated Jun 23)', value: 'RM 3.35/L' },
    ],
    insight: 'The diesel de-subsidisation in June 2023 was the tipping point. Logistics costs rose. The RON95 subsidy bill ballooned. This unresolved tension is what triggered the 2026 crisis policy.',
  },
  {
    id: 'crisis', label: 'WFH Crisis', years: 'Apr 2026',
    headline: '2.9M L', headlineSub: 'fuel saved per week (projection)',
    story: 'On 15 April 2026, ~1.6 million civil servants and GLC employees were mandated to work from home. This is a deliberate policy-driven mobility reduction — not a health lockdown. Ridership falls, but only for commuting. Retail, logistics, and construction remain near-full mobility.',
    kpis: [
      { label: 'Civil servants affected', value: '~1.6M' },
      { label: 'Projected workplace drop', value: '−30%' },
      { label: 'Projected PT trips 2026', value: '445M (−12%)' },
      { label: 'MF-Index', value: '58 / 100' },
    ],
    insight: 'WFH 2026 delivers ~34% of MCO\'s fuel savings at ~10% of the economic cost. Every additional 10% extension to private sector adds ~8M litres/week savings.',
  },
]

const ERA_ORDER = ['pre', 'mco', 'recover', 'crisis']

export default function EraTimeline() {
  const [activeEra, setActiveEra] = useState('pre')
  const era = ERAS.find(e => e.id === activeEra)
  const ec = ERA_COLORS[activeEra]

  // Ridership bar data
  const annualData = ANNUAL_RIDERSHIP

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">The story · era by era</div>
        <h2 className="text-3xl font-light text-gray-800">Seven years of mobility in context</h2>
      </div>

      {/* Era selector tabs */}
      <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
        {ERAS.map(e => (
          <button
            key={e.id}
            onClick={() => setActiveEra(e.id)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border
              ${activeEra === e.id
                ? 'shadow-sm'
                : 'bg-white/50 border-gray-200 text-gray-500 hover:bg-white'
              }`}
            style={activeEra === e.id ? { background: ec.bg, color: ec.text, borderColor: ec.border } : {}}
          >
            <span className="mr-1.5 opacity-60 text-xs">{e.years}</span>
            {e.label}
          </button>
        ))}
      </div>

      {/* Era content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeEra}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="grid md:grid-cols-2 gap-6">

          {/* Left: story card */}
          <div className="glass rounded-3xl p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-5"
              style={{ background: ec.bg, color: ec.text, border: `0.5px solid ${ec.border}` }}>
              {era.years} · {era.label}
            </div>
            <div className="text-5xl font-light mb-1" style={{ color: ec.text }}>{era.headline}</div>
            <div className="text-sm text-gray-400 mb-5">{era.headlineSub}</div>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">{era.story}</p>
            <div className="grid grid-cols-2 gap-3">
              {era.kpis.map(k => (
                <div key={k.label} className="glass-sm rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">{k.label}</div>
                  <div className="text-sm font-semibold text-gray-700">{k.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 p-4 rounded-xl border-l-2 text-sm leading-relaxed"
              style={{ background: ec.bg, borderColor: ec.fill, color: ec.text }}>
              <strong>Key insight:</strong> {era.insight}
            </div>
          </div>

          {/* Right: annual ridership bars */}
          <div className="glass rounded-3xl p-6">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-5">Annual PT ridership (million trips)</div>
            <div className="space-y-2">
              {annualData.map(d => {
                const isActive = d.phase === activeEra || (activeEra === 'pre' && d.phase === 'pre')
                const pct = Math.round((d.total / 522) * 100)
                const pc = ERA_COLORS[d.phase]
                return (
                  <div key={d.year} className="flex items-center gap-3 text-sm">
                    <span className={`w-10 text-right font-mono text-xs ${isActive ? 'font-bold' : 'text-gray-400'}`}>{d.year}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: annualData.indexOf(d) * 0.03 }}
                        className="h-full rounded flex items-center justify-end pr-2"
                        style={{
                          background: isActive ? pc.fill : `${pc.fill}44`,
                        }}>
                      </motion.div>
                    </div>
                    <span className={`w-14 font-mono text-xs ${isActive ? 'font-semibold' : 'text-gray-400'}`}
                      style={isActive ? { color: pc.text } : {}}>
                      {d.total}M
                    </span>
                    <span className="text-xs text-gray-300 hidden md:block w-20 truncate">{d.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Era switcher arrows */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  const idx = ERA_ORDER.indexOf(activeEra)
                  if (idx > 0) setActiveEra(ERA_ORDER[idx - 1])
                }}
                disabled={activeEra === 'pre'}
                className="text-xs px-4 py-2 glass-sm rounded-full text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-all">
                ← Previous era
              </button>
              <button
                onClick={() => {
                  const idx = ERA_ORDER.indexOf(activeEra)
                  if (idx < ERA_ORDER.length - 1) setActiveEra(ERA_ORDER[idx + 1])
                }}
                disabled={activeEra === 'crisis'}
                className="text-xs px-4 py-2 glass-sm rounded-full text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-all">
                Next era →
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
