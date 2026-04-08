import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, Fuel, Train, Users, ChevronDown } from 'lucide-react'
import { daysSince, fmtM, fmtRM } from '../utils/formatters.js'
import { getMFInterpretation } from '../utils/mfIndex.js'

const WFH_START = '2026-04-15'

function AnimatedNumber({ target, duration = 1500, suffix = '' }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return <>{val.toLocaleString('en-MY')}{suffix}</>
}

export default function HeroSection({ mfScore = 58, ridershipLatest, fuelPrice, onScrollDown }) {
  const interp = getMFInterpretation(mfScore)
  const wfhDays = daysSince(WFH_START)

  const kpis = [
    { icon: Train,      label: 'PT Ridership', value: ridershipLatest ? fmtM(ridershipLatest) : '~1.4M', sub: 'daily trips (live)', color: 'text-blue-600' },
    { icon: Fuel,       label: 'RON95 Price',  value: fuelPrice ? fmtRM(fuelPrice) : 'RM 2.05', sub: 'per litre (subsidised)', color: 'text-amber-600' },
    { icon: Users,      label: 'WFH Active',   value: wfhDays + ' days', sub: 'since 15 Apr 2026', color: 'text-green-600' },
    { icon: TrendingDown, label: 'Fuel Saved',  value: '~2.9M L', sub: 'per week (projection)', color: 'text-emerald-600' },
  ]

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden px-4 py-20">
      {/* Ambient background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-200/30 blur-3xl animate-float" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-green-200/25 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-blue-100/20 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto w-full">
        {/* Era badge */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full era-pill-crisis text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-slow" />
          2026 · WFH &amp; Fuel Crisis Era
        </motion.div>

        {/* Main headline */}
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-5xl md:text-7xl font-light leading-tight mb-4 tracking-tight">
          Malaysia's mobility
          <br />
          <span className="text-gradient-blue font-semibold">in numbers</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="text-lg text-gray-500 max-w-xl mb-10 leading-relaxed">
          Seven years of public transport, fuel prices, and work patterns — from 2019 peak to pandemic collapse to the 2026 WFH oil-crisis response.
        </motion.p>

        {/* MF-Index centrepiece */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}
          className="glass rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-center gap-8 max-w-2xl">
          <div className="text-center">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">MF-Index</div>
            <div className="text-8xl font-light leading-none" style={{ color: interp.color }}>
              <AnimatedNumber target={mfScore} duration={1800} />
            </div>
            <div className="text-sm text-gray-500 mt-1">out of 100</div>
          </div>
          <div className="flex-1">
            <div className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-3"
              style={{ background: interp.bg, color: interp.color }}>
              {interp.label}
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Composite of live ridership, fuel policy pressure, and WFH adoption rate. 
              <strong className="text-gray-700"> 100 = pre-pandemic full mobility · 0 = MCO lockdown.</strong>
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="glass-sm rounded-xl p-2">
                <div className="font-semibold text-red-600">18</div>
                <div className="text-gray-400">MCO peak</div>
              </div>
              <div className="glass-sm rounded-xl p-2">
                <div className="font-semibold" style={{ color: interp.color }}>{mfScore}</div>
                <div className="text-gray-400">now</div>
              </div>
              <div className="glass-sm rounded-xl p-2">
                <div className="font-semibold text-blue-600">85</div>
                <div className="text-gray-400">pre-covid</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPI strip */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="glass-sm rounded-2xl p-4">
              <Icon size={16} className={color + ' mb-2'} />
              <div className={`text-xl font-semibold ${color}`}>{value}</div>
              <div className="text-xs text-gray-400 mt-1">{label}</div>
              <div className="text-xs text-gray-300">{sub}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.button onClick={onScrollDown} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
        <span className="text-xs">Explore the story</span>
        <ChevronDown size={20} className="animate-bounce" />
      </motion.button>
    </section>
  )
}
