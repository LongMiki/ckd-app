import React, { useState, useEffect, useMemo } from 'react'
import './IntakeModal.css'

const imgCaretDown = '/icons/CaretDown.svg'
const imgClock = '/icons/Clock.svg'

function IntakeModal({ isOpen, onClose, patientName, patientList, onRecordIntake }) {
  const [selectedDrink, setSelectedDrink] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [notes, setNotes] = useState('')
  const [recordTime, setRecordTime] = useState('')

  const drinks = useMemo(() => [
    { label: '一杯白水', volume: 200, displayVolume: '200ml' },
    { label: '一碗汤', volume: 150, displayVolume: '150ml' },
    { label: '一杯奶', volume: 150, displayVolume: '150ml' },
    { label: '半杯果汁', volume: 100, displayVolume: '100ml' },
  ], [])

  // 当弹窗打开时，重置表单并设置默认值
  useEffect(() => {
    if (isOpen) {
      setSelectedPatient(patientName || '')
      setSelectedDrink(drinks[0])
      setNotes('')
      // 设置当前时间
      const now = new Date()
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      setRecordTime(timeStr)
    }
  }, [isOpen, patientName])

  const handleConfirm = () => {
    if (!selectedPatient || !selectedDrink) return

    // 构建日志条目
    const newEntry = {
      id: `intake-${Date.now()}`,
      kind: 'intake',
      source: 'manual', // 护工手动记录
      time: recordTime,
      sourceLabel: '护工手动记录',
      title: `喝了${selectedDrink.label}${notes ? ` · ${notes}` : ''}`,
      ago: '刚刚',
      valueText: `+ ${selectedDrink.volume}ml`,
      valueMl: selectedDrink.volume,
    }

    // 调用回调函数更新患者数据
    if (onRecordIntake) {
      onRecordIntake(selectedPatient, newEntry)
    }

    setShowPatientDropdown(false)
    onClose()
  }

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient)
    setShowPatientDropdown(false)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="im-overlay" onClick={onClose} />
      <div className="im-modal">
        <div className="im-content">
          <h2 className="im-title">记录入量</h2>

          <div className="im-form">
            <div className="im-section">
              <div className="im-field">
                <label className="im-label">患者</label>
                <div className="im-select" onClick={() => setShowPatientDropdown(!showPatientDropdown)}>
                  <span className="im-select-text">{selectedPatient || '选择患者'}</span>
                  <img src={imgCaretDown} alt="" className="im-select-icon" />
                </div>
                {showPatientDropdown && patientList && (
                  <div className="im-dropdown">
                    {patientList.map((patient) => (
                      <div
                        key={patient.id}
                        className={`im-dropdown-item ${selectedPatient === patient.name ? 'im-dropdown-item--active' : ''}`}
                        onClick={() => handlePatientSelect(patient.name)}
                      >
                        {patient.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="im-field">
                <label className="im-label">时间</label>
                <div className="im-select im-select--time">
                  <span className="im-select-text">{recordTime || '选择时间'}</span>
                  <input
                    type="time"
                    className="im-time-input"
                    value={recordTime}
                    onChange={(e) => setRecordTime(e.target.value)}
                  />
                  <img src={imgClock} alt="" className="im-select-icon" />
                </div>
              </div>
            </div>

            <div className="im-field">
              <label className="im-label">选择饮品</label>
              <div className="im-drinks">
                {drinks.map((drink) => (
                  <button
                    key={drink.label}
                    className={`im-drink-btn ${selectedDrink?.label === drink.label ? 'im-drink-btn--active' : ''}`}
                    onClick={() => setSelectedDrink(drink)}
                  >
                    <div>{drink.label}</div>
                    <div>{drink.displayVolume}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="im-field">
              <label className="im-label">备注（可选）</label>
              <textarea
                className="im-textarea"
                placeholder="例如：患者出汗较多"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="im-actions">
            <button className="im-btn im-btn--confirm" onClick={handleConfirm}>
              确认记录
            </button>
            <button className="im-btn im-btn--cancel" onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default IntakeModal
