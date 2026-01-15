import React, { useState, useEffect, useMemo } from 'react'
import './OutputModal.css'

const imgCaretDown = '/icons/CaretDown.svg'
const imgClock = '/icons/Clock.svg'

function OutputModal({ isOpen, onClose, patientName, patientList, onRecordOutput }) {
  const [selectedVolume, setSelectedVolume] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [notes, setNotes] = useState('')
  const [recordTime, setRecordTime] = useState('')

  const volumes = useMemo(() => [
    { label: '100 mL', volume: 100 },
    { label: '200 mL', volume: 200 },
    { label: '300 mL', volume: 300 },
    { label: '400 mL', volume: 400 },
  ], [])

  // 当弹窗打开时，重置表单并设置默认值
  useEffect(() => {
    if (isOpen) {
      setSelectedPatient(patientName || '')
      setSelectedVolume(volumes[0])
      setNotes('')
      // 设置当前时间
      const now = new Date()
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      setRecordTime(timeStr)
    }
  }, [isOpen, patientName, volumes])

  const handleConfirm = () => {
    if (!selectedPatient || !selectedVolume) return

    // 构建日志条目
    const newEntry = {
      id: `output-${Date.now()}`,
      kind: 'output',
      source: 'manual', // 护工手动记录
      time: recordTime,
      title: `排尿${notes ? ` · ${notes}` : ''}`,
      ago: '刚刚',
      valueText: `- ${selectedVolume.volume}ml`,
      valueMl: selectedVolume.volume,
    }

    // 调用回调函数更新患者数据
    if (onRecordOutput) {
      onRecordOutput(selectedPatient, newEntry)
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
      <div className="om-overlay" onClick={onClose} />
      <div className="om-modal">
        <div className="om-content">
          <h2 className="om-title">记录出量</h2>

          <div className="om-form">
            <div className="om-section">
              <div className="om-field">
                <label className="om-label">患者</label>
                <div className="om-select" onClick={() => setShowPatientDropdown(!showPatientDropdown)}>
                  <span className="om-select-text">{selectedPatient || '选择患者'}</span>
                  <img src={imgCaretDown} alt="" className="om-select-icon" />
                </div>
                {showPatientDropdown && patientList && (
                  <div className="om-dropdown">
                    {patientList.map((patient) => (
                      <div
                        key={patient.id}
                        className={`om-dropdown-item ${selectedPatient === patient.name ? 'om-dropdown-item--active' : ''}`}
                        onClick={() => handlePatientSelect(patient.name)}
                      >
                        {patient.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="om-field">
                <label className="om-label">时间</label>
                <div className="om-select om-select--time">
                  <span className="om-select-text">{recordTime || '选择时间'}</span>
                  <input
                    type="time"
                    className="om-time-input"
                    value={recordTime}
                    onChange={(e) => setRecordTime(e.target.value)}
                  />
                  <img src={imgClock} alt="" className="om-select-icon" />
                </div>
              </div>
            </div>

            <div className="om-field">
              <label className="om-label">尿量</label>
              <div className="om-volumes">
                {volumes.map((vol) => (
                  <button
                    key={vol.label}
                    className={`om-volume-btn ${selectedVolume?.label === vol.label ? 'om-volume-btn--active' : ''}`}
                    onClick={() => setSelectedVolume(vol)}
                  >
                    {vol.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="om-field">
              <label className="om-label">备注（可选）</label>
              <textarea
                className="om-textarea"
                placeholder="例如：颜色偏深"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="om-actions">
            <button className="om-btn om-btn--confirm" onClick={handleConfirm}>
              确认记录
            </button>
            <button className="om-btn om-btn--cancel" onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default OutputModal
