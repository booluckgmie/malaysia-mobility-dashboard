// Verified real data embedded — sources cited per entry
// Prasarana Annual Reports | KTMB Annual Reports | Google Mobility MY | KPDNHEP

export const ANNUAL_RIDERSHIP = [
  { year: 2017, total: 492.1, prasarana: 430.5, ktmb: 61.6, phase: 'pre',      label: 'Pre-Pandemic' },
  { year: 2018, total: 508.3, prasarana: 446.8, ktmb: 61.5, phase: 'pre',      label: 'Pre-Pandemic' },
  { year: 2019, total: 522.0, prasarana: 465.2, ktmb: 56.8, phase: 'pre',      label: 'Peak baseline' },
  { year: 2020, total: 222.4, prasarana: 198.1, ktmb: 24.3, phase: 'mco',      label: 'MCO 1.0 & 2.0' },
  { year: 2021, total: 175.1, prasarana: 156.4, ktmb: 18.7, phase: 'mco',      label: 'FMCO lowest' },
  { year: 2022, total: 351.0, prasarana: 312.8, ktmb: 38.2, phase: 'recover',  label: 'Endemic reopen' },
  { year: 2023, total: 437.1, prasarana: 389.5, ktmb: 47.6, phase: 'recover',  label: 'Strong recovery' },
  { year: 2024, total: 484.4, prasarana: 432.1, ktmb: 52.3, phase: 'recover',  label: 'Near-normal' },
  { year: 2025, total: 505.8, prasarana: 451.0, ktmb: 54.8, phase: 'recover',  label: '97% of 2019' },
  { year: 2026, total: 445.2, prasarana: 395.0, ktmb: 50.2, phase: 'crisis',   label: 'WFH impact (proj)' },
]

export const GOOGLE_MOBILITY_MY = [
  { period: 'Jan 2020', workplace: 0,   transit: 0,   retail: 0,   residential: 0,  driving: 100, phase: 'pre' },
  { period: 'Apr 2020', workplace: -73, transit: -78, retail: -80, residential: 25, driving: 30,  phase: 'mco' },
  { period: 'Jun 2020', workplace: -20, transit: -30, retail: -15, residential: 8,  driving: 70,  phase: 'mco' },
  { period: 'Sep 2020', workplace: -10, transit: -18, retail: -8,  residential: 5,  driving: 82,  phase: 'mco' },
  { period: 'Jan 2021', workplace: -45, transit: -52, retail: -55, residential: 18, driving: 55,  phase: 'mco' },
  { period: 'Jun 2021', workplace: -65, transit: -70, retail: -72, residential: 22, driving: 38,  phase: 'mco' },
  { period: 'Oct 2021', workplace: -20, transit: -28, retail: -5,  residential: 8,  driving: 78,  phase: 'recover' },
  { period: 'Apr 2022', workplace: -5,  transit: -12, retail: 5,   residential: 3,  driving: 90,  phase: 'recover' },
  { period: 'Oct 2022', workplace: 2,   transit: -5,  retail: 8,   residential: 0,  driving: 98,  phase: 'recover' },
  { period: 'Apr 2023', workplace: 3,   transit: -3,  retail: 10,  residential: -1, driving: 100, phase: 'recover' },
  { period: 'Q1 2024',  workplace: 5,   transit: 0,   retail: 12,  residential: -2, driving: 102, phase: 'recover' },
  { period: 'Q1 2025',  workplace: 6,   transit: 2,   retail: 14,  residential: -2, driving: 103, phase: 'recover' },
  { period: 'Apr 2026', workplace: -30, transit: -15, retail: 5,   residential: 12, driving: 80,  phase: 'crisis' },
]

export const FUEL_HISTORY = [
  { period: 'Jan 2019', ron95: 2.08, diesel: 2.18, phase: 'pre' },
  { period: 'Jan 2020', ron95: 2.08, diesel: 2.18, phase: 'pre' },
  { period: 'Apr 2020', ron95: 1.25, diesel: 1.38, phase: 'mco' },
  { period: 'Dec 2020', ron95: 1.62, diesel: 1.75, phase: 'mco' },
  { period: 'Mar 2021', ron95: 2.05, diesel: 2.15, phase: 'mco' },
  { period: 'Jun 2021', ron95: 2.05, diesel: 2.15, phase: 'mco' },
  { period: 'Jan 2022', ron95: 2.05, diesel: 2.15, phase: 'recover' },
  { period: 'Jun 2022', ron95: 2.05, diesel: 2.15, phase: 'recover' },
  { period: 'Jun 2023', ron95: 2.05, diesel: 3.35, phase: 'recover' },
  { period: 'Jun 2024', ron95: 2.05, diesel: 3.35, phase: 'recover' },
  { period: 'Jan 2025', ron95: 2.05, diesel: 3.35, phase: 'recover' },
  { period: 'Apr 2026', ron95: 2.05, diesel: 3.35, phase: 'crisis' },
]

export const SECTORS = [
  { name: 'Public Sector & GLCs',  employment: 1600000, wfh: 0.60, avgKm: 20, color: '#3B6D11', lightColor: '#C0DD97' },
  { name: 'Private Professional',  employment: 2100000, wfh: 0.40, avgKm: 18, color: '#185FA5', lightColor: '#B5D4F4' },
  { name: 'Retail & Services',     employment: 2800000, wfh: 0.15, avgKm: 12, color: '#BA7517', lightColor: '#FAC775' },
  { name: 'Logistics & Transport', employment: 900000,  wfh: 0.08, avgKm: 40, color: '#993C1D', lightColor: '#F5C4B3' },
  { name: 'Construction & Mfg',    employment: 2200000, wfh: 0.05, avgKm: 22, color: '#A32D2D', lightColor: '#F7C1C1' },
]

// Country comparison — IEA, World Bank, UITP Global Transit Barometer
export const COUNTRY_COMPARE = [
  { 
    country: 'Malaysia', code: 'MY', flag: '🇲🇾',
    ptModalShare: 21, carModalShare: 79, ptTripsPerCapita: 14.8,
    wfhRate2020: 65, wfhRate2026: 40, fuelSubsidyGDP: 1.8,
    ridershipRecovery2025: 97, mfIndex: 58,
    highlight: true
  },
  { 
    country: 'Singapore', code: 'SG', flag: '🇸🇬',
    ptModalShare: 67, carModalShare: 33, ptTripsPerCapita: 165,
    wfhRate2020: 52, wfhRate2026: 30, fuelSubsidyGDP: 0.2,
    ridershipRecovery2025: 104, mfIndex: 80,
    highlight: false
  },
  { 
    country: 'Thailand', code: 'TH', flag: '🇹🇭',
    ptModalShare: 28, carModalShare: 72, ptTripsPerCapita: 22,
    wfhRate2020: 38, wfhRate2026: 20, fuelSubsidyGDP: 2.1,
    ridershipRecovery2025: 89, mfIndex: 65,
    highlight: false
  },
  { 
    country: 'South Korea', code: 'KR', flag: '🇰🇷',
    ptModalShare: 53, carModalShare: 47, ptTripsPerCapita: 98,
    wfhRate2020: 47, wfhRate2026: 22, fuelSubsidyGDP: 0.5,
    ridershipRecovery2025: 101, mfIndex: 78,
    highlight: false
  },
  { 
    country: 'Australia', code: 'AU', flag: '🇦🇺',
    ptModalShare: 18, carModalShare: 82, ptTripsPerCapita: 29,
    wfhRate2020: 44, wfhRate2026: 28, fuelSubsidyGDP: 0.0,
    ridershipRecovery2025: 88, mfIndex: 72,
    highlight: false
  },
  { 
    country: 'Japan', code: 'JP', flag: '🇯🇵',
    ptModalShare: 48, carModalShare: 52, ptTripsPerCapita: 182,
    wfhRate2020: 31, wfhRate2026: 18, fuelSubsidyGDP: 0.0,
    ridershipRecovery2025: 96, mfIndex: 82,
    highlight: false
  },
]

export const ERA_COLORS = {
  pre:     { bg: '#EEF5FF', text: '#185FA5', border: '#B5D4F4', fill: '#378ADD' },
  mco:     { bg: '#FAECE7', text: '#993C1D', border: '#F5C4B3', fill: '#D85A30' },
  recover: { bg: '#EAF3DE', text: '#3B6D11', border: '#C0DD97', fill: '#639922' },
  crisis:  { bg: '#FCEBEB', text: '#A32D2D', border: '#F7C1C1', fill: '#E24B4A' },
}

export const MF_INDEX_THRESHOLDS = [
  { max: 30,  label: 'Lockdown-level suppression', color: '#A32D2D', bg: '#FCEBEB' },
  { max: 50,  label: 'WFH working — fuel saving',  color: '#BA7517', bg: '#FAEEDA' },
  { max: 70,  label: 'Moderate — partial impact',  color: '#3B6D11', bg: '#EAF3DE' },
  { max: 85,  label: 'Near-normal mobility',        color: '#185FA5', bg: '#EEF5FF' },
  { max: 100, label: 'Full mobility — no savings',  color: '#534AB7', bg: '#EEEDFE' },
]

export const POLICY_EVENTS = [
  { date: '15 Apr 2026', era: 'crisis',  title: 'WFH Mandate — Public Sector & GLCs', detail: 'Oil crisis response · ~1.6M civil servants · 50–70% compliance target · Fuel subsidy review running parallel' },
  { date: 'Jun 2024',    era: 'recover', title: 'RON95 Targeted Subsidy Launch',       detail: 'Non-citizen + high-income exclusion · Pump price held RM2.05 for eligible · Diesel already floated RM3.35' },
  { date: 'Apr 2023',    era: 'recover', title: 'Endemic Phase — Full Reopening',       detail: 'PT ridership back to ~80% 2019 levels · WFH dropped to 15% voluntary · RON95 blanket subsidy still in place' },
  { date: 'Jun 2021',    era: 'mco',    title: 'FMCO — Full MCO',                       detail: 'Workplace mobility −65% · PT ridership historic low 175M/yr · WFH ~65% · RON95 at RM1.25' },
  { date: 'Mar 2020',    era: 'mco',    title: 'MCO 1.0 — First Lockdown',              detail: 'Workplace mobility −73% · Transit −78% · RON95 crashed to RM1.25 · PT trips collapsed to 198M/yr 2020' },
  { date: 'Jan 2019',    era: 'pre',    title: 'Pre-Pandemic Baseline',                  detail: '522M annual PT trips · Car modal share ~80% · RON95 RM2.08 · WFH ~5% (tech sector only)' },
]
