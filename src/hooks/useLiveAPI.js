import { useState, useEffect } from 'react'

const API = 'https://api.data.gov.my/data-catalogue'

export function useLiveRidership(limit = 30) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API}?id=ridership_headline&limit=${limit}&sort=-date`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => { setData((j.data || j).sort((a,b) => a.date > b.date ? 1 : -1)); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [limit])

  return { data, loading, error }
}

export function useLiveFuelPrice(limit = 30) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API}?id=fuelprice&limit=${limit}&sort=-date`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => { setData((j.data || j).sort((a,b) => a.date > b.date ? 1 : -1)); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [limit])

  return { data, loading, error }
}

export function useLiveVehicles(limit = 18) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API}?id=vehicles_type&limit=${limit}&sort=-date`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => { setData((j.data || j).sort((a,b) => a.date > b.date ? 1 : -1)); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [limit])

  return { data, loading, error }
}
