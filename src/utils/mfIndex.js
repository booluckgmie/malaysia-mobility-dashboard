import { WFH_START_DATE } from './constants.js'

/**
 * Compute MF-Index: Mobility-Fuel composite (0=lockdown, 100=full pre-crisis normal)
 * α·Ridership(0.4) + β·FuelPolicy(0.3) + γ·(100−WFH)(0.3)
 */
export function computeMFIndex({ ridershipNorm, fuelNorm, wfhAdoption }) {
  const wfhComponent = Math.max(0, 100 - (wfhAdoption * 100))
  const raw = 0.4 * ridershipNorm + 0.3 * fuelNorm + 0.3 * wfhComponent
  return Math.round(Math.max(0, Math.min(100, raw)))
}

export function normaliseRidership(dailyTrips, baseline = 1430000) {
  return Math.min(100, Math.round((dailyTrips / baseline) * 100))
}

export function normaliseFuelPolicy(ron95Price) {
  // RM1.25 (MCO low) → 0, RM2.08 (pre-covid) → 100
  const min = 1.25, max = 2.08
  return Math.min(100, Math.max(0, Math.round(((ron95Price - min) / (max - min)) * 100)))
}

export function computeFuelSavingsLitresPerWeek(sectors) {
  return sectors.reduce((sum, s) => {
    const litres = s.employment * s.wfh * 2 * s.avgKm * 5 * 8 / 100
    return sum + litres
  }, 0)
}

export function getMFInterpretation(score) {
  if (score < 30) return { label: 'Lockdown-level suppression', color: '#A32D2D', bg: '#FCEBEB', severity: 'critical' }
  if (score < 50) return { label: 'WFH working — good fuel saving', color: '#BA7517', bg: '#FAEEDA', severity: 'good' }
  if (score < 70) return { label: 'Moderate — partial WFH impact', color: '#3B6D11', bg: '#EAF3DE', severity: 'moderate' }
  if (score < 85) return { label: 'Near-normal mobility', color: '#185FA5', bg: '#EEF5FF', severity: 'normal' }
  return { label: 'Full mobility — no fuel savings', color: '#534AB7', bg: '#EEEDFE', severity: 'high' }
}
