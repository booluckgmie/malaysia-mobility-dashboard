import { useState, useEffect, useRef } from 'react'
import Nav from './components/Nav.jsx'
import HeroSection from './components/HeroSection.jsx'
import EraTimeline from './components/EraTimeline.jsx'
import RidershipChart from './components/RidershipChart.jsx'
import FuelChart from './components/FuelChart.jsx'
import SectorBreakdown from './components/SectorBreakdown.jsx'
import CountryComparison from './components/CountryComparison.jsx'
import SentimentPanel from './components/SentimentPanel.jsx'
import MFIndexGauge from './components/MFIndexGauge.jsx'
import PipelineStatus from './components/PipelineStatus.jsx'
import { useDataPipeline } from './hooks/useDataPipeline.js'
import { useLiveRidership, useLiveFuelPrice } from './hooks/useLiveAPI.js'
import { computeMFIndex, normaliseRidership, normaliseFuelPolicy } from './utils/mfIndex.js'

const SECTIONS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'story',      label: 'Story' },
  { id: 'live-data',  label: 'Live Data' },
  { id: 'sectors',    label: 'Sectors' },
  { id: 'countries',  label: 'Countries' },
  { id: 'sentiment',  label: 'AI Insights' },
  { id: 'pipeline',   label: 'Pipeline' },
]

export default function App() {
  const [activeSection, setActiveSection] = useState('overview')
  const sectionRefs = useRef({})

  // Live data hooks
  const { data: riderData } = useLiveRidership(5)
  const { data: fuelData  } = useLiveFuelPrice(3)

  // Pipeline pre-computed data
  const pipeline = useDataPipeline()

  // Compute live MF-Index
  const latestRidership = riderData ? (riderData[riderData.length - 1]?.trips || riderData[riderData.length - 1]?.total || 0) : 0
  const latestFuel      = fuelData  ? Number(fuelData[fuelData.length - 1]?.ron95 || 2.05) : 2.05
  const riderNorm       = latestRidership ? normaliseRidership(latestRidership) : 70
  const fuelNorm        = normaliseFuelPolicy(latestFuel)
  const mfScore         = computeMFIndex({ ridershipNorm: riderNorm, fuelNorm, wfhAdoption: 0.40 })

  const handleNav = (id) => {
    setActiveSection(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="gradient-bg min-h-screen">
      <Nav
        activeSection={activeSection}
        onNav={handleNav}
        sections={SECTIONS}
        lastUpdated={pipeline.lastUpdated}
        apiSource={pipeline.source}
      />

      {activeSection === 'overview' && (
        <div>
          <HeroSection
            mfScore={mfScore}
            ridershipLatest={latestRidership}
            fuelPrice={latestFuel}
            onScrollDown={() => handleNav('story')}
          />
          <MFIndexGauge score={mfScore} />
        </div>
      )}

      {activeSection === 'story' && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <EraTimeline />
        </div>
      )}

      {activeSection === 'live-data' && (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest font-mono mb-2">Live APIs · data.gov.my</p>
            <h2 className="text-3xl font-light text-gray-800 mb-8">Real-time data feeds</h2>
          </div>
          <RidershipChart />
          <FuelChart />
        </div>
      )}

      {activeSection === 'sectors' && <SectorBreakdown />}
      {activeSection === 'countries' && <CountryComparison />}

      {activeSection === 'sentiment' && (
        <SentimentPanel pipelineData={pipeline.sentiment} />
      )}

      {activeSection === 'pipeline' && <PipelineStatus />}

      <footer className="border-t border-gray-200/50 bg-white/40 backdrop-blur-sm py-6 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400 space-y-1 font-mono">
          <p>MY Mobility Index · Malaysia Fuel & WFH Dashboard · April 2026</p>
          <p>
            Data: <a href="https://data.gov.my" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">data.gov.my</a> ·{' '}
            Prasarana Annual Reports · KTMB Annual Reports · Google Mobility MY · KPDNHEP · DOSM · IEA · World Bank
          </p>
          <p>Built with React + Vite · Deployed on Netlify · ETL via GitHub Actions</p>
        </div>
      </footer>
    </div>
  )
}
