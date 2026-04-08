export const fmtM = (n, dec = 1) => {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(dec) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(dec) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'k'
  return n.toLocaleString('en-MY')
}

export const fmtNum = (n, dec = 0) =>
  n == null ? '—' : Number(n).toLocaleString('en-MY', { minimumFractionDigits: dec, maximumFractionDigits: dec })

export const fmtRM = (n, dec = 2) =>
  n == null ? '—' : 'RM ' + Number(n).toFixed(dec)

export const fmtPct = (n, showPlus = true) => {
  if (n == null) return '—'
  const sign = n > 0 && showPlus ? '+' : ''
  return sign + Number(n).toFixed(1) + '%'
}

export const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const daysSince = (date) =>
  Math.max(0, Math.floor((new Date() - new Date(date)) / 86400000))
