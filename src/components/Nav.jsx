import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'

// UPDATE THIS
export default function Nav({ activeSection, onNav, lastUpdated, apiSource, sections }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const srcColor = apiSource === 'pipeline' ? 'text-green-600' : apiSource === 'live-api' ? 'text-blue-600' : 'text-amber-600'
  const srcLabel = apiSource === 'pipeline' ? 'Pipeline ✓' : apiSource === 'live-api' ? 'Live API' : 'Cached'

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Activity size={15} color="white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-blue-700 leading-tight">MY Mobility Index</div>
            <div className="text-xs text-gray-400 leading-tight hidden sm:block">
              <span className={srcColor}>{srcLabel}</span>
              {lastUpdated && <span className="ml-2">{new Date(lastUpdated).toLocaleDateString('en-MY')}</span>}
            </div>
          </div>
        </div>

        {/* Nav pills */}
        <div className="flex items-center gap-1 overflow-x-auto glass-sm rounded-full px-2 py-1.5 flex-1 max-w-2xl">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => onNav(sec.id)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap
                ${activeSection === sec.id
                  ? 'bg-white shadow-sm text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
              {LABELS[i]}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
