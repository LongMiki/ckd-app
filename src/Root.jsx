import React, { useEffect, useState, Suspense, lazy } from 'react'

const App = lazy(() => import('./App.jsx'))
const MainApp = lazy(() => import('./MainApp.jsx'))


function Root() {
  const [mode, setMode] = useState('onboarding') // onboarding | main

  useEffect(() => {
    const raw = localStorage.getItem('patientData')
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      if (data?.role === '我是家属') localStorage.setItem('appRole', 'family')
      if (data?.role === '我是护工') localStorage.setItem('appRole', 'caregiver')
    } catch {}
  }, [])

  const handleOnboardingComplete = (formData) => {
    if (formData?.role === '我是家属') {
      localStorage.setItem('appRole', 'family')
    }
    if (formData?.role === '我是护工') {
      localStorage.setItem('appRole', 'caregiver')
    }
    setMode('main')
  }

  return (
    <div className="app-root-container">
      <div className="app-root-scroll">
        <Suspense fallback={<div style={{ width: 390, height: 844 }} />}>
          {mode === 'main' ? <MainApp /> : <App onComplete={handleOnboardingComplete} />}
        </Suspense>
      </div>
    </div>
  )
}

export default Root
