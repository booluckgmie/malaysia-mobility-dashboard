import { useLiveFuelPrice } from '../hooks/useLiveAPI.js'
import { FUEL_HISTORY } from '../data/baseline.js'
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, Area
} from 'recharts'

// ── FIX 1: Tooltip — shows all fuel types including new columns ─────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  // Only show series with real values (skip zero / null)
  const visible = payload.filter(p => p.value != null && p.value > 0)
  return (
    <div className="glass rounded-xl p-3 text-xs shadow-lg min-w-[180px]">
      <div className="font-semibold text-gray-700 mb-2">{label}</div>
      {visible.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium">RM {Number(p.value).toFixed(3)}</span>
        </div>
      ))}
    </div>
  )
}

export default function FuelChart() {
  // FIX 2: Fetch more rows — API returns 2 rows per week (level + change_weekly)
  // so we need 2× the limit to get the same number of actual price records
  const { data: liveData, loading, error } = useLiveFuelPrice(60)

  // ── FIX 3: Filter to series_type='level' ONLY ─────────────────────────────
  // The API returns TWO rows per date:
  //   series_type='level'         → actual prices (2.05, 3.35, etc.)
  //   series_type='change_weekly' → weekly delta  (0.00, -0.10, etc.)
  // Without this filter, change_weekly rows (near-zero values) corrupt the chart.
  const levelRows = liveData
    ? liveData.filter(d => d.series_type === 'level')
    : []

  // ── FIX 4: Extract change_weekly rows for the delta indicator ─────────────
  const changeRows = liveData
    ? liveData.filter(d => d.series_type === 'change_weekly')
    : []
  const latestChange = changeRows.length > 0
    ? changeRows[changeRows.length - 1]
    : null

  // ── Build live slice using ALL available columns from the real schema ──────
  // Actual columns: ron95, ron97, diesel, diesel_eastmsia, ron95_budi95
  const liveSlice = levelRows.slice(-12).map(d => ({
    period:          d.date?.slice(0, 7) || d.date,
    ron95:           Number(d.ron95)           || null,
    ron97:           Number(d.ron97)           || null,
    diesel:          Number(d.diesel)          || null,
    diesel_eastmsia: Number(d.diesel_eastmsia) || null,
    ron95_budi95:    Number(d.ron95_budi95)    || null,
    isLive: true,
  }))

  // Merge embedded historical + live (historical has only ron95 + diesel)
  const combined = [
    ...FUEL_HISTORY.map(d => ({ ...d, isHistorical: true })),
    ...liveSlice,
  ]

  // ── Latest values — from filtered level rows only ─────────────────────────
  const latestLevel    = levelRows.length > 0 ? levelRows[levelRows.length - 1] : null
  const latestRON95    = latestLevel ? Number(latestLevel.ron95)           || 2.05 : 2.05
  const latestRON97    = latestLevel ? Number(latestLevel.ron97)           || 3.47 : 3.47
  const latestDiesel   = latestLevel ? Number(latestLevel.diesel)          || 3.35 : 3.35
  const latestDieselEM = latestLevel ? Number(latestLevel.diesel_eastmsia) || 2.65 : 2.65
  const latestBudi95   = latestLevel ? Number(latestLevel.ron95_budi95)    || 1.99 : 1.99

  const deltaRON95  = latestChange ? Number(latestChange.ron95)  : null
  const deltaDiesel = latestChange ? Number(latestChange.diesel) : null

  const fmtDelta = v => v == null ? null : (v >= 0 ? '+' : '') + 'RM ' + Math.abs(v).toFixed(3)
  const deltaColor = v => v == null ? '' : v > 0 ? 'text-red-500' : v < 0 ? 'text-green-600' : 'text-gray-400'

  return (
    <div className="glass rounded-3xl p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-widest flex items-center gap-2">
            Fuel Price History
            {!loading && !error && (
              <span className="flex items-center gap-1 text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />live
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 mt-0.5">RON95 · RON97 · Diesel · RM/litre · 2019–2026</div>
        </div>

        {/* FIX 5: Show all 5 fuel types, not just 2 */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'RON95',          val: latestRON95,    delta: deltaRON95,  color: 'text-amber-600'  },
            { label: 'RON97',          val: latestRON97,    delta: null,        color: 'text-orange-500' },
            { label: 'Diesel (Pen.)',   val: latestDiesel,   delta: deltaDiesel, color: 'text-red-700'    },
            { label: 'Diesel (EM)',     val: latestDieselEM, delta: null,        color: 'text-red-500'    },
            { label: 'BUDI 95',         val: latestBudi95,   delta: null,        color: 'text-green-600'  },
          ].map(f => (
            <div key={f.label} className="glass-sm rounded-xl px-3 py-2 text-center">
              <div className="text-xs text-gray-400">{f.label}</div>
              <div className={`text-sm font-semibold ${f.color}`}>RM {f.val.toFixed(2)}</div>
              {f.delta != null && (
                <div className={`text-xs font-mono ${deltaColor(f.delta)}`}>
                  {fmtDelta(f.delta)} wk
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={combined} margin={{ top: 10, right: 24, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="ron95Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#D85A30" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#D85A30" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={50} tickLine={false} />
          <YAxis
            domain={[0.8, 4.0]}
            tick={{ fontSize: 10 }}
            tickFormatter={v => 'RM' + v.toFixed(2)}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />

          {/* Area fill under RON95 */}
          {/* <Area dataKey="ron95" fill="url(#ron95Grad)" stroke="none" legendType="none" /> */}

          {/* FIX 6: Plot all real columns from the API schema */}
          <Line dataKey="ron95"           name="RON95"          type="monotone" stroke="#D85A30" strokeWidth={2.5} dot={{ r: 2.5, fill: '#D85A30' }} connectNulls />
          <Line dataKey="ron97"           name="RON97"          type="monotone" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} connectNulls />
          <Line dataKey="diesel"          name="Diesel (Pen.)"  type="monotone" stroke="#991b1b" strokeWidth={2}   strokeDasharray="6 3" dot={{ r: 2.5, fill: '#991b1b' }} connectNulls />
          <Line dataKey="diesel_eastmsia" name="Diesel (EM)"    type="monotone" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="3 4" dot={{ r: 2 }} connectNulls />
          <Line dataKey="ron95_budi95"    name="BUDI 95 subsidy" type="monotone" stroke="#15803d" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2 }} connectNulls />

          <ReferenceLine y={1.25} stroke="#E24B4A" strokeDasharray="4 3"
            label={{ value: 'MCO low RM1.25', fontSize: 9, fill: '#E24B4A', position: 'insideTopRight' }} />
          <ReferenceLine y={2.08} stroke="#185FA5" strokeDasharray="4 3"
            label={{ value: '2019 norm RM2.08', fontSize: 9, fill: '#185FA5', position: 'insideTopRight' }} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Key event annotations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        {[
          { period: 'Apr 2020', event: 'RON95 crashed to RM1.25 (global oil crash)',  color: '#993C1D' },
          { period: 'Jun 2023', event: 'Diesel de-subsidised to RM3.35',               color: '#BA7517' },
          { period: 'Jun 2024', event: 'RON95 targeted subsidy + BUDI 95 launched',    color: '#185FA5' },
          { period: 'Apr 2026', event: 'RON95 held at RM2.05 during WFH policy',       color: '#A32D2D' },
        ].map(a => (
          <div key={a.period} className="glass-sm rounded-xl p-2.5">
            <div className="text-xs font-medium mb-0.5" style={{ color: a.color }}>{a.period}</div>
            <div className="text-xs text-gray-500 leading-tight">{a.event}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-400 mt-3">
        Source: KPDNHEP weekly gazette · api.data.gov.my · id=fuelprice ·
        Columns: ron95, ron97, diesel, diesel_eastmsia, ron95_budi95 · Filtered: series_type=level only
      </div>
    </div>
  )
}
