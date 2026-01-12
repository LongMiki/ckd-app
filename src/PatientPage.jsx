import React, { useState } from 'react'
import './PatientPage.css'
import WaterRingChartMini from './WaterRingChartMini'
import IntakeModal from './IntakeModal'
import OutputModal from './OutputModal'

// 患者状态配置
const PATIENT_STATUS = {
  emergency: { key: 'emergency', label: '严重', color: '#F43859' },
  risk: { key: 'risk', label: '注意', color: '#FA8534' },
  normal: { key: 'normal', label: '安全', color: '#46C761' }
}

// AI 简要报告生成函数
function generateAISummary(patient) {
  if (!patient) return ''

  const name = patient.name || '患者'
  const netBalance = (patient.inMl ?? 0) - (patient.outMl ?? 0)
  
  let assessment = ''
  if (netBalance > 300) {
    assessment = '摄入过多，需减少饮水量'
  } else if (netBalance > 150) {
    assessment = '摄入略多，建议控制饮水'
  } else if (netBalance < -200) {
    assessment = '排出过多，需增加补液'
  } else if (netBalance < -100) {
    assessment = '排出略多，建议适当补液'
  } else {
    assessment = '水分平衡，整体正常'
  }
  
  return `AI生成简要报告：${name}今天${assessment}`
}

// 图片资源 URL（从 Figma 设计稿获取）
const imgAdd = '/figma/group.svg'
const imgMinus = '/figma/soup.svg'

function PatientPage({ activeTab, setActiveTab, onOpenPatientDetail, patients, setPatients }) {
  const [selectedFilter, setSelectedFilter] = useState('全部')
  const [intakeModalOpen, setIntakeModalOpen] = useState(false)
  const [outputModalOpen, setOutputModalOpen] = useState(false)
  const [currentPatient, setCurrentPatient] = useState(null)
  
  // 获取状态颜色
  const getStatusColor = (status) => {
    return PATIENT_STATUS[status]?.color || '#46C761'
  }

  const filters = [
    { id: '全部', label: '全部', active: true },
    { id: 'ckd-light', label: 'CKD轻度 ', active: false },
    { id: 'ckd-medium', label: 'CKD中度 ', active: false },
    { id: 'ckd-heavy', label: 'CKD重度 ', active: false },
    { id: 'danger', label: '危险', active: false },
    { id: 'normal', label: '正常', active: false }
  ]

  // 筛选并排序患者列表
    // Removed duplicate import of React
  const filteredAndSortedPatients = patients
    .filter(p => {
      if (selectedFilter === '全部') return true
      if (selectedFilter === 'danger') return p.status === 'emergency'
      if (selectedFilter === 'warning') return p.status === 'risk'
      if (selectedFilter === 'normal') return p.status === 'normal'
      // CKD轻度: GFR 1-2期
      if (selectedFilter === 'ckd-light') return p.gfrStage === 1 || p.gfrStage === 2
      // CKD中度: GFR 3期
      if (selectedFilter === 'ckd-medium') return p.gfrStage === 3
      // CKD重度: GFR 4-5期
      if (selectedFilter === 'ckd-heavy') return p.gfrStage === 4 || p.gfrStage === 5
      return true
    })
    .sort((a, b) => {
      // 按状态严重程度排序：emergency > risk > normal
      const statusOrder = { 'emergency': 0, 'risk': 1, 'normal': 2 }
      const aStatus = a.status ?? 'normal'
      const bStatus = b.status ?? 'normal'
      return statusOrder[aStatus] - statusOrder[bStatus]
    })

  return (
    <div className="patient-page-content">
      {/* 顶部标题栏 */}
      <div className="pp-header">
        <div className="pp-header-content">
          <div className="pp-title-section">
            <h2 className="pp-title">病区患者</h2>
            <p className="pp-subtitle">区域A 患者13位 总摄入：总排出=1.5:1</p>
          </div>
          <div className="pp-menu-button">
            <img src="/icons/DotsThreeOutline.svg" alt="菜单" />
          </div>
        </div>
      </div>

      <div className="pp-body">
        {/* 左侧筛选栏 - Group141（固定不动） */}
        <div className="pp-filter-section">
          <div className="pp-filter-list">
            {filters.map((filter, index) => (
              <button
                key={filter.id}
                className={`pp-filter-item ${index === 0 ? 'pp-filter-first' : ''} ${index === filters.length - 1 ? 'pp-filter-last' : ''} ${selectedFilter === filter.id ? 'pp-filter-active' : ''}`}
                onClick={() => setSelectedFilter(filter.id)}
              >
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧患者卡片列表 - Frame755（可滚动） */}
        <div className="pp-patient-list">
          {filteredAndSortedPatients.map((p) => (
            <div key={p.id} className="pp-patient-card" onClick={() => onOpenPatientDetail(p)} style={{ cursor: 'pointer' }}>
              <div className="pp-card-inner">
                <div className="pp-card-top">
                  <div className="pp-card-title-group">
                    <div className="pp-card-title">{p.fullName || p.name}</div>
                    <div className="pp-card-meta">{p.metaFull || p.meta}</div>
                  </div>

                  <div className="pp-card-actions">
                    <button 
                      className="pp-icon-btn" 
                      type="button" 
                      aria-label="增加"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentPatient(p.name)
                        setIntakeModalOpen(true)
                      }}
                    >
                      <img src={imgAdd} alt="" />
                    </button>
                    <button 
                      className="pp-icon-btn" 
                      type="button" 
                      aria-label="减少"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentPatient(p.name)
                        setOutputModalOpen(true)
                      }}
                    >
                      <img src={imgMinus} alt="" />
                    </button>
                  </div>
                </div>

                <div className="pp-card-bottom">
                  <div className="pp-ring-wrap">
                    <WaterRingChartMini 
                      intakePercent={p.inPercent} 
                      outputPercent={p.outPercent} 
                      size={90}
                      uniqueId={`patient-${p.id}`}
                      statusColor={getStatusColor(p.status)}
                    />
                  </div>

                  <div className="pp-card-info">
                    <div className="pp-ai-text">{generateAISummary(p)}</div>

                    <div className="pp-metrics">
                      <div className="pp-metric-box">
                        <div className="pp-metric-row">
                          <div className="pp-metric-label">摄入量</div>
                          <div className="pp-metric-value">{p.inMl ?? 0} ml</div>
                        </div>
                        <div className="pp-meter-bg pp-meter-bg-blue">
                          <div className="pp-meter-fill pp-meter-fill-blue" style={{ width: `${(p.inMlMax ?? 0) > 0 ? Math.round(((p.inMl ?? 0) / (p.inMlMax ?? 1)) * 100) : 0}%` }} />
                        </div>
                      </div>

                      <div className="pp-metric-box">
                        <div className="pp-metric-row">
                          <div className="pp-metric-label">排出量</div>
                          <div className="pp-metric-value">{p.outMl ?? 0} ml</div>
                        </div>
                        <div className="pp-meter-bg pp-meter-bg-purple">
                          <div className="pp-meter-fill pp-meter-fill-purple" style={{ width: `${(p.outMlMax ?? 0) > 0 ? Math.round(((p.outMl ?? 0) / (p.outMlMax ?? 1)) * 100) : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 弹窗 */}
      <IntakeModal 
        isOpen={intakeModalOpen} 
        onClose={() => setIntakeModalOpen(false)} 
        patientName={currentPatient}
        patientList={patients}
                onRecordIntake={(patientName, entry) => {
          // 更新患者的 timeline 和 inMl
          setPatients(prev => prev.map(p => {
            if (p.name === patientName) {
              return {
                ...p,
                timeline: [entry, ...(p.timeline || [])],
                        inMl: (p.inMl ?? 0) + (entry.valueMl ?? 0)
              }
            }
            return p
          }))
        }}
      />
      <OutputModal 
        isOpen={outputModalOpen} 
        onClose={() => setOutputModalOpen(false)} 
        patientName={currentPatient}
        patientList={patients}
        onRecordOutput={(patientName, entry) => {
          // 更新患者的 timeline 和 outMl
          setPatients(prev => prev.map(p => {
            if (p.name === patientName) {
              return {
                ...p,
                timeline: [entry, ...(p.timeline || [])],
                outMl: (p.outMl ?? 0) + (entry.valueMl ?? 0),
                urinationCount: (p.urinationCount ?? 0) + 1
              }
            }
            return p
          }))
        }}
      />
    </div>
  )
}

export default PatientPage
