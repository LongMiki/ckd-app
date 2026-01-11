import React, { useState } from 'react'
import './DatePickerModal.css'

function DatePickerModal({ isOpen, onClose }) {
  const [selectedYear, setSelectedYear] = useState(2025)
  const [selectedMonth, setSelectedMonth] = useState(8)

  const years = [2023, 2024, 2025, 2026]
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  const handleConfirm = () => {
    console.log('选择日期:', { year: selectedYear, month: selectedMonth })
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="dpm-overlay" onClick={onClose} />
      <div className="dpm-modal">
        <div className="dpm-content">
          <h2 className="dpm-title">选择日期</h2>

          <div className="dpm-form">
            <div className="dpm-field">
              <label className="dpm-label">年份</label>
              <div className="dpm-year-grid">
                {years.map((year) => (
                  <button
                    key={year}
                    className={`dpm-year-btn ${selectedYear === year ? 'dpm-year-btn--active' : ''}`}
                    onClick={() => setSelectedYear(year)}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            <div className="dpm-field">
              <label className="dpm-label">月份</label>
              <div className="dpm-month-grid">
                {months.map((month) => (
                  <button
                    key={month}
                    className={`dpm-month-btn ${selectedMonth === month ? 'dpm-month-btn--active' : ''}`}
                    onClick={() => setSelectedMonth(month)}
                  >
                    {month}月
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="dpm-actions">
            <button className="dpm-btn dpm-btn--confirm" onClick={handleConfirm}>
              确认
            </button>
            <button className="dpm-btn dpm-btn--cancel" onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default DatePickerModal
