import { useState } from 'react'
import { motion } from 'framer-motion'
import { SECTORS } from '../data/baseline.js'
import { fmtM } from '../utils/formatters.js'
import { computeFuelSavingsLitresPerWeek } from '../utils/mfIndex.js'

function calcSector(s) {
  const tripCutPerDay = Math.round(s.employment * s.wfh * 2)
  const kmSavedPerWeek = s.employment * s.wfh * 2 * s.avgKm * 5
  const litresSavedPerWeek = kmSavedPerWeek * 8 / 100
  const mobilityScore = Math.round((1 - s.wfh) * 100)
  const risk = mobilityScore >= 80 ? 'HIGH' : mobilityScore >= 55 ? 'MED' : 'LOW'
  const riskColors = { HIGH: { bg: '#FCEBEB', text: '#A32D2D' }, MED: { bg: '#FAEEDA', text: '#BA7517' }, LOW: { bg: '#EAF3DE', text: '#3B6D11' } }
  return { ...s, tripCutPerDay, litresSavedPerWeek, mobilityScore, risk, riskColors: riskColors[risk] }
}

const computed = SECTORS.map(calcSector)
const totalLitres = computeFuelSavingsLitresPerWeek(SECTORS)
const totalTrips = computed.reduce((s, c) => s + c.tripCutPerDay, 0)

const MCO_LITRES_WEEK = 85e6 // 85M at MCO peak

export default function SectorBreakdown() {
  const [hovered, setHovered] = useState(null)

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Sector impact model</div>
        <h2 className="text-3xl font-light text-gray-800">Who is actually cutting trips?</h2>
        <p className="text-sm text-gray-500 mt-3 max-w-lg mx-auto">DOSM Employment Census 2023 · WFH% from Labour Force Survey estimates</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total trips cut/day', value: fmtM(totalTrips), sub: 'across all WFH sectors', color: 'text-blue-600' },
          { label: 'Fuel saved/week', value: (totalLitres / 1e6).toFixed(1) + 'M L', sub: 'across public + private WFH', color: 'text-green-600' },
          { label: 'vs MCO peak saving', value: Math.round((totalLitres / MCO_LITRES_WEEK) * 100) + '%', sub: '~85M L/week at lockdown', color: 'text-amber-600' },
          { label: 'Private sector gap', value: '~8M L/wk', sub: 'added per +10% adoption', color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="glass rounded-2xl p-5">
            <div className={`text-2xl font-semibold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
            <div className="text-xs text-gray-300 mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Sector table */}
      <div className="glass rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">Sector breakdown</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Sector', 'Employees', 'WFH%', 'Mobility score', 'Daily trip cut', 'Litres saved/wk', 'Risk'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {computed.map((s, i) => (
                <motion.tr key={s.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onMouseEnter={() => setHovered(s.name)}
                  onMouseLeave={() => setHovered(null)}
                  className={`border-b border-gray-50 transition-colors ${hovered === s.name ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-700">{s.name}</div>
                    <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full w-32 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.mobilityScore}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ background: s.color }} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{fmtM(s.employment)}</td>
                  <td className="px-6 py-4 font-semibold font-mono" style={{ color: s.color }}>{Math.round(s.wfh * 100)}%</td>
                  <td className="px-6 py-4 font-mono text-gray-700">{s.mobilityScore}<span className="text-gray-300">/100</span></td>
                  <td className="px-6 py-4 font-mono text-gray-700">{fmtM(s.tripCutPerDay)}</td>
                  <td className="px-6 py-4 font-mono text-gray-700">{(s.litresSavedPerWeek / 1e6).toFixed(1)}M L</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ background: s.riskColors.bg, color: s.riskColors.text }}>
                      {s.risk}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            Formula: Employees × WFH% × 2 trips/day × avg_km × 5 days × 8L/100km · Source: DOSM Employment Census 2023
          </div>
        </div>
      </div>
    </section>
  )
}
