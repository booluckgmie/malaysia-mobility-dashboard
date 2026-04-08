import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { getMFInterpretation } from '../utils/mfIndex.js'
import { SECTORS } from '../data/baseline.js'
import { computeFuelSavingsLitresPerWeek } from '../utils/mfIndex.js'

const MCO_LITRES = 85e6

export default function MFIndexGauge({ score = 58 }) {
  const interp = getMFInterpretation(score)
  const totalLitres = computeFuelSavingsLitresPerWeek(SECTORS)
  const vsPercent = Math.round((totalLitres / MCO_LITRES) * 100)

  // SVG gauge params
  const cx = 160, cy = 140, r = 110
  const startAngle = -200, endAngle = 20 // degrees
  const toRad = d => d * Math.PI / 180
  const arcPath = (from, to) => {
    const x1 = cx + r * Math.cos(toRad(from))
    const y1 = cy + r * Math.sin(toRad(from))
    const x2 = cx + r * Math.cos(toRad(to))
    const y2 = cy + r * Math.sin(toRad(to))
    const large = (to - from) > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  const totalDeg = endAngle - startAngle
  const needleDeg = startAngle + (score / 100) * totalDeg
  const needleX = cx + (r * 0.75) * Math.cos(toRad(needleDeg))
  const needleY = cy + (r * 0.75) * Math.sin(toRad(needleDeg))

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Composite index</div>
        <h2 className="text-3xl font-light text-gray-800">The MF-Index explained</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Gauge */}
        <div className="glass rounded-3xl p-8 flex flex-col items-center">
          <svg viewBox="0 0 320 180" className="w-full max-w-sm">
            {/* Background arc */}
            <path d={arcPath(startAngle, endAngle)} fill="none" stroke="#f0f0f0" strokeWidth="18" strokeLinecap="round" />
            {/* Colored zone arcs */}
            {[
              { from: startAngle, to: startAngle + totalDeg * 0.3,  color: '#A32D2D' },
              { from: startAngle + totalDeg * 0.3,  to: startAngle + totalDeg * 0.5,  color: '#BA7517' },
              { from: startAngle + totalDeg * 0.5,  to: startAngle + totalDeg * 0.7,  color: '#3B6D11' },
              { from: startAngle + totalDeg * 0.7,  to: endAngle,   color: '#185FA5' },
            ].map((z, i) => (
              <path key={i} d={arcPath(z.from, z.to)} fill="none" stroke={z.color}
                strokeWidth="18" strokeLinecap="round" opacity="0.25" />
            ))}
            {/* Active fill arc */}
            <path d={arcPath(startAngle, startAngle + (score / 100) * totalDeg)}
              fill="none" stroke={interp.color} strokeWidth="18" strokeLinecap="round" opacity="0.85" />
            {/* Needle */}
            <motion.line
              x1={cx} y1={cy}
              x2={needleX} y2={needleY}
              stroke="#1a2236" strokeWidth="3" strokeLinecap="round"
              initial={{ x2: cx + r * 0.75 * Math.cos(toRad(startAngle)), y2: cy + r * 0.75 * Math.sin(toRad(startAngle)) }}
              animate={{ x2: needleX, y2: needleY }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            />
            <circle cx={cx} cy={cy} r="6" fill="#1a2236" />
            {/* Center score */}
            <text x={cx} y={cy + 30} textAnchor="middle" fontSize="32" fontWeight="300" fill={interp.color}>{score}</text>
            <text x={cx} y={cy + 46} textAnchor="middle" fontSize="10" fill="#9ca3af">/ 100</text>
            {/* Zone labels */}
            <text x="30" y="155" fontSize="9" fill="#A32D2D" textAnchor="middle">lockdown</text>
            <text x="290" y="155" fontSize="9" fill="#185FA5" textAnchor="middle">normal</text>
          </svg>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mt-2"
            style={{ background: interp.bg, color: interp.color }}>
            {interp.label}
          </div>

          {/* Reference points */}
          <div className="grid grid-cols-3 gap-3 mt-5 w-full text-center text-xs">
            {[
              { label: 'MCO 2021', val: 18, color: '#A32D2D' },
              { label: 'WFH 2026', val: score, color: interp.color, bold: true },
              { label: 'Pre-Covid', val: 85, color: '#185FA5' },
            ].map(r => (
              <div key={r.label} className="glass-sm rounded-xl p-2.5">
                <div className="text-gray-400">{r.label}</div>
                <div className={`text-xl font-${r.bold ? 'semibold' : 'light'} mt-1`} style={{ color: r.color }}>{r.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Formula breakdown */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Index formula</div>
            <div className="font-mono text-sm text-gray-700 space-y-2 leading-loose">
              <div>MF-Index =</div>
              <div className="pl-4 text-blue-600"><strong>0.4</strong> × Ridership<sub>norm</sub></div>
              <div className="pl-4 text-amber-600"><strong>+ 0.3</strong> × FuelPolicy<sub>norm</sub></div>
              <div className="pl-4 text-green-600"><strong>+ 0.3</strong> × (100 − WFH<sub>adoption</sub>)</div>
            </div>
            <div className="mt-4 text-xs text-gray-400 leading-relaxed">
              Ridership normalised to 2019 baseline (1.43M daily trips = 100)<br/>
              Fuel normalised to RM1.25–RM2.08 range<br/>
              WFH adoption as % of total workforce
            </div>
          </div>

          {[
            { label: 'Ridership component (40%)', value: Math.round(0.4 * 70), max: 40, color: '#185FA5' },
            { label: 'Fuel policy component (30%)', value: Math.round(0.3 * 65), max: 30, color: '#BA7517' },
            { label: 'WFH reduction (30%)', value: Math.round(0.3 * 60), max: 30, color: '#3B6D11' },
          ].map(c => (
            <div key={c.label} className="glass-sm rounded-xl p-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-600">{c.label}</span>
                <span className="font-mono font-semibold" style={{ color: c.color }}>{c.value} pts</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.value / c.max) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="h-full rounded-full"
                  style={{ background: c.color }} />
              </div>
            </div>
          ))}

          <div className="glass-sm rounded-xl p-4 border-l-2 border-green-400">
            <div className="text-xs text-gray-400 mb-1">vs MCO fuel saving</div>
            <div className="text-2xl font-semibold text-green-600">{vsPercent}%</div>
            <div className="text-xs text-gray-500">of MCO peak ~85M L/week</div>
          </div>
        </div>
      </div>
    </section>
  )
}
