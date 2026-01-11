import React, { useEffect, useState } from 'react'
import App from './App.jsx'
import MainApp from './MainApp.jsx'

function Root() {
  const [mode, setMode] = useState('onboarding') // onboarding | main

  useEffect(() => {
    const raw = localStorage.getItem('patientData')
    if (!raw) return

    // 选项B：每次启动都先显示建档页，但仍用已保存的信息补齐 appRole，保证提交前后主题一致
    try {
      const data = JSON.parse(raw)
      if (data?.role === '我是家属') localStorage.setItem('appRole', 'family')
      if (data?.role === '我是护工') localStorage.setItem('appRole', 'caregiver')
    } catch {
      // ignore parse errors
    }
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

  return mode === 'main' ? (
    <MainApp />
  ) : (
    <App onComplete={handleOnboardingComplete} />
  )
}

export default Root
