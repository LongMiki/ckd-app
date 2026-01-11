import React, { useEffect, useState } from 'react'
import App from './App.jsx'
import MainApp from './MainApp.jsx'


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
        {mode === 'main' ? <MainApp /> : <App onComplete={handleOnboardingComplete} />}
      </div>
    </div>
  )
}

export default Root
