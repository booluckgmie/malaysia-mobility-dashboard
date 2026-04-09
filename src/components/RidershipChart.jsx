import { useLiveRidership } from '../hooks/useLiveAPI.js'
import { ANNUAL_RIDERSHIP, ERA_COLORS } from '../data/baseline.js'
import { fmtM, fmtNum } from '../utils/formatters.js'
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts'

// ── Real column names from data.gov.my ridership_headline schema ─────────────
const BUS_COLS  = ['bus_rkl', 'bus_rkn', 'bus_rpn']
const RAIL_COLS = [
  'rail_lrt_ampang', 'rail_lrt_kj', 'rail_monorail',
  'rail_mrt_kajang',  'rail_mrt_pjy',
  'rail_ets', 'rail_intercity', 'rail_komuter',
  'rail_komuter_utara', 'rail_tebrau',
]
const ALL_COLS = [...BUS_COLS, ...RAIL_COLS]

// Sum all operator columns for a single row → total daily trips
function sumTrips(row) {
  return ALL_COLS.reduce((acc, col) => acc + (Number(row[col]) || 0), 0)
}
function sumBus(row)  { return BUS_COLS.reduce((a, c)  => a + (Number(row[c]) || 0), 0) }
function sumRail(row) { return RAIL_COLS.reduce((a, c) => a + (Number(row[c]) || 0), 0) }

// ── Tooltips ─────────────────────────────────────────────────────────────────
const AnnualTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs shadow-lg">
      <div className="font-semibold text-gray-700 mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium">{fmtM(p.value, 1)}M</span>
        </div>
      ))}
    </div>
  )
}

const LiveTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs shadow-lg min-w-[160px]">
      <div className="font-semibold text-gray-700 mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium">{fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Operator breakdown legend ─────────────────────────────────────────────────
const OPERATOR_META = [
  { key: 'rail_lrt_kj',      name: 'LRT Kelana Jaya', color: '#1d4ed8' },
  { key: 'rail_mrt_kajang',  name: 'MRT Kajang',      color: '#2563eb' },
  { key: 'rail_mrt_pjy',     name: 'MRT Putrajaya',   color: '#3b82f6' },
  { key: 'rail_lrt_ampang',  name: 'LRT Ampang',      color: '#60a5fa' },
  { key: 'rail_komuter',     name: 'KTM Komuter',     color: '#93c5fd' },
  { key: 'rail_monorail',    name: 'Monorail',         color: '#bfdbfe' },
  { key: 'bus_rkl',          name: 'Rapid Bus KL',    color: '#15803d' },
  { key: 'bus_rpn',          name: 'Rapid Bus Penang', color: '#22c55e' },
  { key: 'bus_rkn',          name: 'Rapid Bus Kuantan',color: '#86efac' },
  { key: 'rail_ets',         name: 'KTMB ETS',        color: '#b45309' },
  { key: 'rail_intercity',   name: 'KTM Intercity',   color: '#d97706' },
  { key: 'rail_komuter_utara',name:'KTM Komuter Utara',color:'#fbbf24' },
  { key: 'rail_tebrau',      name: 'KTM Tebrau',      color: '#fde68a' },
]

export default function RidershipChart() {
  const { data: liveData, loading, error } = useLiveRidership(35)

  // ── Annual historical (unchanged) ─────────────────────────────────────────
  const annualChartData = ANNUAL_RIDERSHIP.map(d => ({
    name: String(d.year),
    total: d.total,
    prasarana: d.prasarana,
    ktmb: d.ktmb,
    phase: d.phase,
  }))

  // ── Live chart — correctly sum all operator columns ───────────────────────
  const liveChartData = liveData
    ? liveData.slice(-21).map(row => ({
        name:  row.date?.slice(5) || row.date,
        date:  row.date,
        // Total
        total: sumTrips(row),
        bus:   sumBus(row),
        rail:  sumRail(row),
        // Individual operators for stacked breakdown
        ...OPERATOR_META.reduce((acc, op) => {
          acc[op.key] = Number(row[op.key]) || 0
          return acc
        }, {}),
      }))
    : []

  const latestRow = liveData?.[liveData.length - 1]
  const prevRow   = liveData?.[liveData.length - 2]
  const latestVal = latestRow ? sumTrips(latestRow) : null
  const prevVal   = prevRow   ? sumTrips(prevRow)   : null
  const delta     = latestVal && prevVal ? latestVal - prevVal : null

  const latestBus  = latestRow ? sumBus(latestRow)  : 0
  const latestRail = latestRow ? sumRail(latestRow)  : 0

  return (
    <div className="space-y-6">

      {/* ── Annual historical chart ── */}
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">Annual PT Ridership</div>
            <div className="text-sm text-gray-600 mt-0.5">2017–2026 · Prasarana + KTMB (million trips)</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(ERA_COLORS).map(([k, v]) => (
              <span key={k} className="text-xs px-2 py-1 rounded-full"
                style={{ background: v.bg, color: v.text, border: `0.5px solid ${v.border}` }}>
                {{ pre: 'Pre', mco: 'MCO', recover: 'Recovery', crisis: 'Crisis' }[k]}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={annualChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v + 'M'} />
            <Tooltip content={<AnnualTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="prasarana" name="Prasarana" stackId="a" fill="#378ADD" fillOpacity={0.8} radius={[0,0,0,0]} />
            <Bar dataKey="ktmb"      name="KTMB"      stackId="a" fill="#B5D4F4" radius={[3,3,0,0]} />
            <Line dataKey="total" name="Total" type="monotone" stroke="#185FA5"
              strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
            <ReferenceLine x="2019" stroke="#185FA5" strokeDasharray="3 3"
              label={{ value: 'Peak', fontSize: 9, fill: '#185FA5' }} />
            <ReferenceLine x="2021" stroke="#993C1D" strokeDasharray="3 3"
              label={{ value: 'FMCO low', fontSize: 9, fill: '#993C1D' }} />
            <ReferenceLine x="2026" stroke="#E24B4A" strokeWidth={1.5} strokeDasharray="5 3"
              label={{ value: 'WFH', fontSize: 9, fill: '#E24B4A' }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-400 mt-2">
          Source: Prasarana Annual Reports · KTMB Annual Reports · 2026 = projection based on WFH model
        </div>
      </div>

      {/* ── Live daily chart ── */}
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest flex items-center gap-2">
              Live Daily Ridership
              {!loading && !error && (
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />live
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-0.5">Last 21 days · 13 operators · data.gov.my</div>
          </div>

          {latestVal != null && (
            <div className="flex gap-4 items-start">
              <div className="text-right">
                <div className="text-xl font-semibold text-blue-600">{fmtM(latestVal)}</div>
                <div className="text-xs text-gray-400">total trips</div>
                {delta !== null && (
                  <div className={`text-xs font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {delta >= 0 ? '+' : ''}{fmtM(delta)} vs prev day
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <div className="glass-sm rounded-xl px-3 py-2 text-center">
                  <div className="text-sm font-semibold text-green-600">{fmtM(latestRail)}</div>
                  <div className="text-xs text-gray-400">rail</div>
                </div>
                <div className="glass-sm rounded-xl px-3 py-2 text-center">
                  <div className="text-sm font-semibold text-emerald-600">{fmtM(latestBus)}</div>
                  <div className="text-xs text-gray-400">bus</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="h-48 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              Fetching from data.gov.my...
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-amber-600 mb-1">⚠ API unreachable</div>
              <div className="text-xs text-gray-400">{String(error)}</div>
              <div className="text-xs text-gray-400 mt-1">Showing historical data above</div>
            </div>
          </div>
        )}

        {/* Live chart — stacked bar: bus + rail */}
        {!loading && !error && liveChartData.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={liveChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={v => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : (v / 1_000).toFixed(0) + 'k'}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<LiveTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="rail" name="Rail (all operators)" stackId="a"
                  fill="#3b82f6" fillOpacity={0.85} radius={[0,0,0,0]} />
                <Bar dataKey="bus"  name="Bus (Rapid KL/Penang/Kuantan)" stackId="a"
                  fill="#22c55e" fillOpacity={0.75} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Operator breakdown table — latest day */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
                Latest day breakdown — {latestRow?.date}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {OPERATOR_META.map(op => {
                  const val = latestRow ? (Number(latestRow[op.key]) || 0) : 0
                  if (val === 0) return null
                  const pct = latestVal ? Math.round((val / latestVal) * 100) : 0
                  return (
                    <div key={op.key} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: op.color }} />
                      <span className="text-gray-600 truncate flex-1">{op.name}</span>
                      <span className="font-mono text-gray-700 flex-shrink-0">{fmtM(val)}</span>
                      <span className="text-gray-400 flex-shrink-0 w-8 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        <div className="text-xs text-gray-400 mt-3">
          Source: api.data.gov.my · id=ridership_headline · 13 operators: LRT, MRT, Monorail, KTM, Rapid Bus
        </div>
      </div>
    </div>
  )
}
