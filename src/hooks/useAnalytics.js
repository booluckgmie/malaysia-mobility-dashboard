/**
 * useAnalytics.js
 * React hook that wires GA4 tracking into the app automatically.
 * - Tracks section changes + dwell time
 * - Fires MF-Index score on load
 * - Sets user properties once per session
 */
import { useEffect, useRef } from 'react'
import {
  trackSection,
  startDwellTimer,
  endDwellTimer,
  trackMFIndexScore,
  setUserProperties,
  isTrackingEnabled,
} from '../utils/analytics.js'

/**
 * Call in App.jsx at the top level.
 * @param {string} activeSection - current section ID
 * @param {number|null} mfScore  - live MF-Index score (null until computed)
 */
export function useAnalytics(activeSection, mfScore = null) {
  const prevSection  = useRef(null)
  const mfTracked    = useRef(false)
  const sessionFired = useRef(false)

  // Set user properties once per session
  useEffect(() => {
    if (sessionFired.current) return
    sessionFired.current = true
    setUserProperties()
  }, [])

  // Track MF-Index once it's computed
  useEffect(() => {
    if (mfScore != null && !mfTracked.current) {
      mfTracked.current = true
      trackMFIndexScore(mfScore)
    }
  }, [mfScore])

  // Track section changes + dwell time
  useEffect(() => {
    const prev = prevSection.current

    // End dwell timer on previous section
    if (prev) {
      endDwellTimer(prev)
    }

    // Start dwell timer + fire section view
    prevSection.current = activeSection
    startDwellTimer(activeSection)
    trackSection(activeSection, mfScore)

    // End dwell on unmount / tab close
    return () => {
      endDwellTimer(activeSection)
    }
  }, [activeSection]) // intentionally exclude mfScore to avoid double-fires
}

/**
 * Lightweight hook for component-level interactions.
 * Returns a stable trackEvent function bound to a category.
 */
export function useTrack(category) {
  return (action, extraParams = {}) => {
    if (typeof window === 'undefined') return
    if (typeof window.gtag !== 'function') return
    window.gtag('event', action, {
      event_category: category,
      ...extraParams,
    })
  }
}
