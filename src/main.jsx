import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './Root.jsx'
import './index.css'
import { normalizeObject, normalizeTimelineEntries } from './data'

// Normalize legacy localStorage payloads at startup
try {
  const rawPatient = localStorage.getItem('patientData')
  if (rawPatient) {
    const parsed = JSON.parse(rawPatient)
    const normalized = normalizeObject(parsed)
    localStorage.setItem('patientData', JSON.stringify(normalized))
  }
} catch {}

try {
  const rawTimeline = localStorage.getItem('timelineData')
  if (rawTimeline) {
    const parsed = JSON.parse(rawTimeline)
    const normalized = normalizeTimelineEntries(parsed)
    localStorage.setItem('timelineData', JSON.stringify(normalized))
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
