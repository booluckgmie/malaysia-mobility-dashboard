import { useState } from 'react'
import { motion } from 'framer-motion'
import { COUNTRY_COMPARE } from '../data/baseline.js'
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

const METRICS = [
  { key: 'ptModalShare',        label: 'PT Modal Share %',       unit: '%' },
  { key: 'ptTripsPerCapita',    label: 'PT Trips/Capita',        unit: '' },
  { key: 'wfhRate2026',         label: 'WFH Rate 2026 %',        unit: '%' },
  { key: 'ridershipRecovery2025', label: 'Ridership Recovery %', unit: '%' },
  { key: 'mfIndex',             label: 'MF-Index',               unit: '' },
]

const COLORS = ['#185FA5', '#3B6D11', '#BA7517', '#534AB7', '#993C1D', '#0F6E56']

function normalise(val, key) {
  const allVals = COUNTRY_COMPARE.map(c => c[key])
  const min = Math.min(...allVals), max = Math.max(...allVals)
  return max === min ? 50 : Math.round(((val - min) / (max - min)) * 100)
}

export default function CountryComparison() {
  const [activeMetric, setActiveMetric] = useState('ptModalShare')

  const radarData = METRICS.map(m => {
    const entry = { subject: m.label }
    COUNTRY_COMPARE.forEach(c => {
      entry[c.code] = normalise(c[m.key], m.key)
    })
    return entry
  })

  const barData = COUNTRY_COMPARE.map(c => ({
    name: `${c.flag} ${c.code}`,
    value: c[activeMetric],
    highlight: c.highlight,
  }))

  const metricDef = METRICS.find(m => m.key === activeMetric)

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Country comparison</div>
        <h2 className="text-3xl font-light text-gray-800">Malaysia vs peers</h2>
        <p className="text-sm text-gray-500 mt-3 max-w-lg mx-auto">IEA · World Bank · UITP Global Transit Barometer · 2025 data</p>
      </div>

      {/* Country cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {COUNTRY_COMPARE.map((c, i) => (
          <motion.div key={c.code}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`glass rounded-2xl p-4 text-center ${c.highlight ? 'ring-1 ring-blue-400/50' : ''}`}>
            <div className="text-2xl mb-2">{c.flag}</div>
            <div className="text-xs font-semibold text-gray-700">{c.country}</div>
            <div className="mt-2 space-y-1">
              <div className="text-xs text-gray-400">PT modal share</div>
              <div className="text-sm font-semibold text-blue-600">{c.ptModalShare}%</div>
            </div>
            <div className="mt-2">
              <div className="text-xs text-gray-400">MF-Index</div>
              <div className="text-sm font-semibold" style={{
                color: c.mfIndex < 50 ? '#A32D2D' : c.mfIndex < 70 ? '#BA7517' : '#3B6D11'
              }}>{c.mfIndex}</div>
            </div>
            {c.highlight && <div className="mt-2 text-xs text-blue-600 font-medium">← Malaysia</div>}
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="glass rounded-3xl p-6">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Normalised comparison radar</div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#f0f0f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#9ca3af' }} />
              <Tooltip formatter={(v, name) => [v + ' (normalised)', name]} />
              {COUNTRY_COMPARE.map((c, i) => (
                <Radar key={c.code} name={`${c.flag} ${c.code}`} dataKey={c.code}
                  stroke={COLORS[i]} fill={COLORS[i]}
                  fillOpacity={c.highlight ? 0.15 : 0.04}
                  strokeWidth={c.highlight ? 2 : 1} />
              ))}
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {COUNTRY_COMPARE.map((c, i) => (
              <span key={c.code} className="flex items-center gap-1 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                {c.flag} {c.code}
              </span>
            ))}
          </div>
        </div>

        {/* Bar: select metric */}
        <div className="glass rounded-3xl p-6">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Compare by metric</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {METRICS.map(m => (
              <button key={m.key}
                onClick={() => setActiveMetric(m.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150
                  ${activeMetric === m.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                  }`}>
                {m.label}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + (metricDef?.unit || '')} />
              <Tooltip formatter={(v) => [v + (metricDef?.unit || ''), metricDef?.label]} />
              <Bar dataKey="value" name={metricDef?.label}
                fill="#B5D4F4"
                radius={[4,4,0,0]}>
                {barData.map((entry, i) => (
                  <rect key={i} fill={entry.highlight ? '#185FA5' : '#B5D4F4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-400 mt-2">
            Blue bar = Malaysia · Sources: IEA, World Bank, UITP 2025
          </div>
        </div>
      </div>

      {/* Key takeaways */}
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {[
          { title: 'PT modal share gap', body: 'Malaysia at 21% vs Singapore 67%. Even Thailand (28%) outperforms. The structural car dependence is a Southeast Asian outlier only matched by Australia.', color: '#185FA5' },
          { title: 'WFH adoption context', body: 'Malaysia\'s 40% WFH mandate is among the highest in Asia-Pacific for 2026. South Korea and Japan shifted back to <20% post-pandemic, reflecting culture differences.', color: '#BA7517' },
          { title: 'Ridership recovery', body: 'Singapore (104%) and South Korea (101%) have exceeded pre-pandemic ridership. Malaysia at 97% is close but needs sustained PT investment to cross 100% in 2027.', color: '#3B6D11' },
        ].map(t => (
          <div key={t.title} className="glass-sm rounded-2xl p-5">
            <div className="text-sm font-semibold mb-2" style={{ color: t.color }}>{t.title}</div>
            <p className="text-xs text-gray-500 leading-relaxed">{t.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
