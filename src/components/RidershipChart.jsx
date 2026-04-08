import React from 'react'
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
    <div className="glass rounded-xl p-3 text-xs shadow-lg border border-white/50 bg-white/80 backdrop-blur-md">
      <div className="font-semibold text-gray-700 mb-2">{label}</div>
      {payload.map((p, i) => (
        <div key={`${p.dataKey}-${i}`} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-800">
            {/* Safety check for value existence before formatting */}
            {p.value ? fmtM(p.value, 1) : '0M'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function RidershipChart() {
  const { data: liveData, loading, error } = useLiveRidership(35)

  // 1. Memoize or safely map annual data
  const annualChartData = React.useMemo(() => {
    return ANNUAL_RIDERSHIP.map(d => ({
      name: String(d.year),
      total: d.total || 0,
      prasarana: d.prasarana || 0,
      ktmb: d.ktmb || 0,
      phase: d.phase,
    }))
  }, [])

// 2. Build live daily data with enhanced field-name detection
  const liveChartData = React.useMemo(() => {
    if (!liveData || !Array.isArray(liveData)) return []
    
    return liveData.slice(-21).map(d => {
      // data.gov.my often changes between 'trips', 'abs', 'ridership', or 'total'
      // We also check if the value is already a small number or a large integer
      const rawValue = d.trips ?? d.abs ?? d.ridership ?? d.total ?? d.value ?? 0;
      
      // If the API returns 500,000, we want 500k. 
      // If the API already returns 500, we don't want to divide by 1000 (which results in 0.5)
      const displayValue = rawValue > 10000 ? rawValue / 1000 : rawValue;

      return {
        name: d.date ? d.date.slice(5) : 'N/A',
        total: displayValue,
        date: d.date,
      };
    })
  }, [liveData])

  const latestVal = liveData && liveData.length > 0 ? (liveData[liveData.length - 1]?.trips || liveData[liveData.length - 1]?.total || 0) : null
  const prevVal = liveData && liveData.length > 1 ? (liveData[liveData.length - 2]?.trips || liveData[liveData.length - 2]?.total || 0) : null
  const delta = latestVal !== null && prevVal !== null ? latestVal - prevVal : null

  return (
    <div className="space-y-6">
      {/* Annual historical chart */}
      <div className="glass rounded-3xl p-6 min-h-[350px]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">Annual PT Ridership</div>
            <div className="text-sm text-gray-600 mt-0.5">2017–2026 · Prasarana + KTMB (million trips)</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(ERA_COLORS).map(([k, v]) => (
              <span key={k} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: v.bg, color: v.text, border: `0.5px solid ${v.border}` }}>
                {{ pre: 'Pre', mco: 'MCO', recover: 'Recovery', crisis: 'Crisis' }[k]}
              </span>
            ))}
          </div>
        </div>
        
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={annualChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v + 'M'} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: '20px' }} />
              <Bar dataKey="prasarana" name="Prasarana" stackId="a" fill="#378ADD" fillOpacity={0.8} />
              <Bar dataKey="ktmb" name="KTMB" stackId="a" fill="#B5D4F4" radius={[3, 3, 0, 0]} />
              <Line dataKey="total" name="Total" type="monotone" stroke="#185FA5" strokeWidth={2} dot={{ r: 3, fill: '#185FA5' }} />
              <ReferenceLine x="2019" stroke="#185FA5" strokeDasharray="3 3" label={{ value: 'Peak', position: 'top', fontSize: 9, fill: '#185FA5' }} />
              <ReferenceLine x="2021" stroke="#993C1D" strokeDasharray="3 3" label={{ value: 'FMCO', position: 'top', fontSize: 9, fill: '#993C1D' }} />
              <ReferenceLine x="2026" stroke="#E24B4A" strokeWidth={1.5} strokeDasharray="5 3" label={{ value: 'WFH', position: 'top', fontSize: 9, fill: '#E24B4A' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="text-[10px] text-gray-400 mt-4 italic">Source: Prasarana/KTMB Reports · 2026 Projection</div>
      </div>

    {/* Live 21-day chart - ONLY SHOW IF DATA EXISTS AND IS NOT ZERO */}
    {!loading && !error && liveChartData.some(d => d.total > 0) ? (
      <div className="glass rounded-3xl p-6 min-h-[300px]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest flex items-center gap-2">
              Live Daily Ridership
              {!loading && !error && (
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  live
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-0.5">Last 21 days · data.gov.my API</div>
          </div>
          {latestVal !== null && (
            <div className="text-right">
              <div className="text-xl font-semibold text-blue-600">{fmtM(latestVal)}</div>
              <div className="text-xs">
                {delta !== null && (
                  <span className={delta >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {delta >= 0 ? '+' : ''}{fmtM(delta)} vs yesterday
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-[200px] w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                Connecting to data.gov.my...
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm text-amber-600 mb-1">⚠ Data unavailable</div>
                <div className="text-[10px] text-gray-400 max-w-[200px]">{error}</div>
              </div>
            </div>
          ) : liveChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={liveChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + 'k'} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f0f4f8' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass p-2 text-xs shadow-md border border-white bg-white/90">
                          <div className="font-bold text-gray-800">{payload[0].payload.date}</div>
                          <div className="text-blue-600">{fmtNum(payload[0].value * 1000)} trips</div>
                        </div>
                      )
                    }
                    return null;
                  }}
                /> */
                <Bar dataKey="total" fill="#378ADD" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                <Line dataKey="total" type="monotone" stroke="#185FA5" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">
              No recent data entries found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
