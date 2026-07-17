import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { ERA_COLORS } from '../data/baseline.js'

const ERA_BY_TYPE = { lockdown: 'mco', reopening: 'recover', fuel_policy: 'recover', wfh_policy: 'crisis' }

/**
 * Reads public/data/policy_impact.json (written by etl/causal_analysis.py)
 * and renders an event-study chart per real policy event: MCO/FMCO
 * lockdowns, the 2023 diesel float, the 2024 RON95 targeted subsidy, and
 * the 2026 WFH mandate. DiD / synthetic-control-vs-peers are shown as
 * "not yet available" — this repo doesn't collect a historical
 * comparator-country panel, so those methods report an honest reason
 * instead of a fabricated number.
 */
export default function PolicyImpactPanel() {
  const [data, setData] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/data/policy_impact.json')
      .then((r) => {
        if (!r.ok) throw new Error('policy_impact.json not found')
        return r.json()
      })
      .then((json) => {
        setData(json)
        if (json.events?.length) setActiveId(json.events[0].id)
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-500">
            Policy impact data isn't available yet — run{' '}
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">python etl/causal_analysis.py</code>{' '}
            to generate it.
          </p>
        </div>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="glass rounded-2xl p-6 animate-pulse">
          <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
          <div className="h-48 bg-gray-100 rounded" />
        </div>
      </section>
    )
  }

  const active = data.events.find((e) => e.id === activeId) || data.events[0]
  if (!active) return null

  const { event_study: es, diff_in_diff: did, synthetic_control: sc } = active
  const era = ERA_BY_TYPE[active.type] || 'recover'
  const eraColor = ERA_COLORS[era]
  const yLabel = es?.unit === 'pct_points_vs_pre_mean' ? 'pp vs pre-event mean' : '% vs pre-event mean'

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Causal analysis</div>
        <h2 className="text-3xl font-light text-gray-800">Policy impact</h2>
        <p className="text-sm text-gray-500 mt-3 max-w-lg mx-auto">
          Event-study estimates built from real annual/monthly data — Prasarana &amp; KTMB ridership, Google Mobility MY, KPDNHEP fuel prices.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {data.events.map((ev) => {
          const isActive = ev.id === activeId
          const pillEra = ERA_BY_TYPE[ev.type] || 'recover'
          return (
            <button
              key={ev.id}
              onClick={() => setActiveId(ev.id)}
              className="text-xs px-3 py-1.5 rounded-full border transition font-medium"
              style={isActive
                ? { background: ERA_COLORS[pillEra].fill, color: '#fff', borderColor: ERA_COLORS[pillEra].fill }
                : { background: ERA_COLORS[pillEra].bg, color: ERA_COLORS[pillEra].text, borderColor: ERA_COLORS[pillEra].border }}
            >
              {ev.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="glass rounded-2xl p-6 space-y-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest" style={{ color: eraColor.text }}>{active.date}</div>
              <h3 className="text-lg font-semibold text-gray-800">{active.label}</h3>
            </div>
          </div>

          {es?.available ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                Event study — {active.outcome.replace(/_/g, ' ')}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={es.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="rel_day" tick={{ fontSize: 11 }}
                    label={{ value: 'Days from event', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }}
                    label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip formatter={(v) => v.toFixed(2)} labelFormatter={(l) => `Day ${l}`} />
                  <ReferenceLine x={0} stroke={eraColor.fill} strokeDasharray="4 2"
                    label={{ value: 'Event', fontSize: 11, fill: eraColor.fill }} />
                  <Line type="monotone" dataKey="outcome_norm" stroke="#185FA5" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-1">
                {es.pct_change >= 0 ? '+' : ''}{es.pct_change}{es.unit === 'pct_points_vs_pre_mean' ? ' pts' : '%'} post-event
                {' '}({es.n_pre} pre / {es.n_post} post observations)
                {es.p_value < 0.05 ? ' — statistically significant, p<0.05' : ' — not statistically significant'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Event study</p>
              <p className="text-sm text-gray-500">{es?.reason || 'Not available.'}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Diff-in-Diff vs. regional peers</p>
              <p className="text-sm text-gray-500 mt-1">{did?.reason || 'Not available.'}</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Synthetic control gap</p>
              <p className="text-sm text-gray-500 mt-1">{sc?.reason || 'Not available.'}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
