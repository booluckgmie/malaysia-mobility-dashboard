import { useLiveFuelPrice } from '../hooks/useLiveAPI.js'
import { FUEL_HISTORY, ERA_COLORS } from '../data/baseline.js'
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Area } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs shadow-lg">
      <div className="font-semibold text-gray-700 mb-2">{label}</div>
      {payload.map(p => (
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
  const { data: liveData, loading, error } = useLiveFuelPrice(24)

  // Merge embedded historical + live
  const liveSlice = liveData ? liveData.slice(-8).map(d => ({
    period: d.date?.slice(0, 7) || d.week || d.date,
    ron95: Number(d.ron95 || d.price_ron95 || 0),
    diesel: Number(d.diesel || d.price_diesel || 0),
    phase: 'crisis',
  })) : []

  const combined = [
    ...FUEL_HISTORY.map(d => ({ ...d, isHistorical: true })),
    ...liveSlice.map(d => ({ ...d, isLive: true })),
  ]

  const latestRON = liveData ? Number(liveData[liveData.length - 1]?.ron95 || 2.05) : 2.05
  const latestDiesel = liveData ? Number(liveData[liveData.length - 1]?.diesel || 3.35) : 3.35

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-widest flex items-center gap-2">
            Fuel Price History
            {!loading && !error && <span className="flex items-center gap-1 text-green-600"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />live</span>}
          </div>
          <div className="text-sm text-gray-600 mt-0.5">RON95 &amp; Diesel · RM/litre · 2019–2026</div>
        </div>
        <div className="flex gap-3">
          <div className="glass-sm rounded-xl px-3 py-2 text-center">
            <div className="text-xs text-gray-400">RON95 now</div>
            <div className="text-base font-semibold text-amber-600">RM {latestRON.toFixed(2)}</div>
          </div>
          <div className="glass-sm rounded-xl px-3 py-2 text-center">
            <div className="text-xs text-gray-400">Diesel now</div>
            <div className="text-base font-semibold text-orange-700">RM {latestDiesel.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={combined} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="ron95Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D85A30" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#D85A30" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={50} />
          <YAxis domain={[0.8, 3.8]} tick={{ fontSize: 11 }} tickFormatter={v => 'RM' + v.toFixed(2)} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Area dataKey="ron95" name="RON95" fill="url(#ron95Grad)" stroke="none" />
          <Line dataKey="ron95" name="RON95" type="monotone" stroke="#D85A30" strokeWidth={2.5} dot={{ r: 3, fill: '#D85A30' }} />
          <Line dataKey="diesel" name="Diesel" type="monotone" stroke="#993C1D" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2.5, fill: '#993C1D' }} />
          <ReferenceLine y={1.25} stroke="#E24B4A" strokeDasharray="4 3" label={{ value: 'MCO low RM1.25', fontSize: 9, fill: '#E24B4A', position: 'right' }} />
          <ReferenceLine y={2.08} stroke="#185FA5" strokeDasharray="4 3" label={{ value: '2019 normal RM2.08', fontSize: 9, fill: '#185FA5', position: 'right' }} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Key event annotations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        {[
          { period: 'Apr 2020', event: 'RON95 crashed to RM1.25 (global oil crash)', color: '#993C1D' },
          { period: 'Jun 2023', event: 'Diesel de-subsidised to RM3.35', color: '#BA7517' },
          { period: 'Jun 2024', event: 'RON95 targeted subsidy launched', color: '#185FA5' },
          { period: 'Apr 2026', event: 'RON95 held at RM2.05 during WFH policy', color: '#A32D2D' },
        ].map(a => (
          <div key={a.period} className="glass-sm rounded-xl p-2.5">
            <div className="text-xs font-medium mb-0.5" style={{ color: a.color }}>{a.period}</div>
            <div className="text-xs text-gray-500 leading-tight">{a.event}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-400 mt-3">Source: KPDNHEP weekly gazette · api.data.gov.my · id=fuelprice</div>
    </div>
  )
}
