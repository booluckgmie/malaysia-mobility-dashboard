import { useLiveRidership } from '../hooks/useLiveAPI.js'
import { ANNUAL_RIDERSHIP, ERA_COLORS } from '../data/baseline.js'
import { fmtM, fmtNum } from '../utils/formatters.js'
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ReferenceLine 
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs shadow-lg">
      <div className="font-semibold text-gray-700 mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium">{fmtM(p.value, 1)}</span>
        </div>
      ))}
    </div>
  )
}

export default function RidershipChart() {
  const { data: liveData, loading, error } = useLiveRidership(35)

  // Build combined chart: annual historical + live daily
  const annualChartData = ANNUAL_RIDERSHIP.map(d => ({
    name: String(d.year),
    total: d.total,
    prasarana: d.prasarana,
    ktmb: d.ktmb,
    phase: d.phase,
  }))

  const liveChartData = liveData
    ? liveData.slice(-21).map(d => ({
        name: d.date?.slice(5) || d.date,
        total: (d.trips || d.ridership || d.total || 0) / 1000,
        date: d.date,
      }))
    : []

  const latestVal = liveData ? (liveData[liveData.length - 1]?.trips || liveData[liveData.length - 1]?.total || 0) : null
  const prevVal   = liveData ? (liveData[liveData.length - 2]?.trips || liveData[liveData.length - 2]?.total || 0) : null
  const delta     = latestVal && prevVal ? latestVal - prevVal : null

  return (
    <div className="space-y-6">
      {/* Annual historical chart */}
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">Annual PT Ridership</div>
            <div className="text-sm text-gray-600 mt-0.5">2017–2026 · Prasarana + KTMB (million trips)</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(ERA_COLORS).map(([k, v]) => (
              <span key={k} className="text-xs px-2 py-1 rounded-full" style={{ background: v.bg, color: v.text, border: `0.5px solid ${v.border}` }}>
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
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="prasarana" name="Prasarana" stackId="a" fill="#378ADD" fillOpacity={0.8} radius={[0,0,0,0]} />
            <Bar dataKey="ktmb" name="KTMB" stackId="a" fill="#B5D4F4" radius={[3,3,0,0]} />
            <Line dataKey="total" name="Total" type="monotone" stroke="#185FA5" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
            <ReferenceLine x="2019" stroke="#185FA5" strokeDasharray="3 3" label={{ value: 'Peak', fontSize: 9, fill: '#185FA5' }} />
            <ReferenceLine x="2021" stroke="#993C1D" strokeDasharray="3 3" label={{ value: 'FMCO low', fontSize: 9, fill: '#993C1D' }} />
            <ReferenceLine x="2026" stroke="#E24B4A" strokeWidth={1.5} strokeDasharray="5 3" label={{ value: 'WFH', fontSize: 9, fill: '#E24B4A' }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-400 mt-2">Source: Prasarana Annual Reports · KTMB Annual Reports · 2026 = projection based on WFH model</div>
      </div>

      {/* Live 21-day chart */}
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest flex items-center gap-2">
              Live Daily Ridership
              {!loading && !error && <span className="flex items-center gap-1 text-green-600"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />live</span>}
            </div>
            <div className="text-sm text-gray-600 mt-0.5">Last 21 days · data.gov.my API</div>
          </div>
          {latestVal && (
            <div className="text-right">
              <div className="text-xl font-semibold text-blue-600">{fmtM(latestVal)}</div>
              <div className="text-xs text-gray-400">
                {delta !== null && <span className={delta >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {delta >= 0 ? '+' : ''}{fmtM(delta)} vs prev
                </span>}
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="h-48 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              Fetching from data.gov.my...
            </div>
          </div>
        )}

        {error && (
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-amber-600 mb-1">⚠ API unreachable</div>
              <div className="text-xs text-gray-400">{error}</div>
              <div className="text-xs text-gray-400 mt-1">Showing historical data above</div>
            </div>
          </div>
        )}

        {!loading && !error && liveChartData.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={liveChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + 'k'} />
              <Tooltip formatter={(v) => [fmtNum(v * 1000) + ' trips', 'Ridership']} />
              <Bar dataKey="total" name="Daily trips (k)" fill="#378ADD" fillOpacity={0.7} radius={[2,2,0,0]} />
              <Line dataKey="total" type="monotone" stroke="#185FA5" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        <div className="text-xs text-gray-400 mt-2">Source: api.data.gov.my · id=ridership_headline · Prasarana, KTMB, MyBas operators</div>
      </div>
    </div>
  )
}
