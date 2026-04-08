import { useState, useEffect, useCallback } from 'react'

const CACHE_TTL = 1000 * 60 * 60 // 1 hour

let cache = {}

async function fetchWithCache(url, key) {
  const now = Date.now()
  if (cache[key] && now - cache[key].ts < CACHE_TTL) return cache[key].data
  try {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    cache[key] = { data, ts: now }
    return data
  } catch (e) {
    if (cache[key]) return cache[key].data // stale ok
    throw e
  }
}

/**
 * Loads pre-processed pipeline output from /public/data/
 * Falls back to live data.gov.my calls if pipeline JSON not found
 */
export function useDataPipeline() {
  const [state, setState] = useState({
    mfIndex: null, ridership: null, fuel: null,
    sentiment: null, lastUpdated: null,
    loading: true, error: null, source: 'loading'
  })

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true }))
    try {
      // Try pipeline output first
      const [mfData, sentimentData, lastUpdated] = await Promise.allSettled([
        fetchWithCache('/data/mf_index_daily.json', 'mf'),
        fetchWithCache('/data/sentiment.json', 'sentiment'),
        fetchWithCache('/data/last_updated.json', 'ts'),
      ])

      const hasPipeline = mfData.status === 'fulfilled'

      if (hasPipeline) {
        setState({
          mfIndex: mfData.value,
          sentiment: sentimentData.status === 'fulfilled' ? sentimentData.value : null,
          lastUpdated: lastUpdated.status === 'fulfilled' ? lastUpdated.value?.updated_at : null,
          ridership: null, fuel: null,
          loading: false, error: null, source: 'pipeline'
        })
        return
      }

      // Fallback: direct API calls
      const API = 'https://api.data.gov.my/data-catalogue'
      const [rider, fuelR] = await Promise.allSettled([
        fetchWithCache(`${API}?id=ridership_headline&limit=35&sort=-date`, 'rider'),
        fetchWithCache(`${API}?id=fuelprice&limit=24&sort=-date`, 'fuel'),
      ])

      setState({
        mfIndex: null,
        ridership: rider.status === 'fulfilled' ? (rider.value.data || rider.value) : null,
        fuel: fuelR.status === 'fulfilled' ? (fuelR.value.data || fuelR.value) : null,
        sentiment: null, lastUpdated: new Date().toISOString(),
        loading: false,
        error: null,
        source: 'live-api'
      })
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message, source: 'error' }))
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { ...state, refresh: load }
}
