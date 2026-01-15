import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import './WaterManagement.css'
import WaterParticles from './WaterParticles'
import WaterRingChart from './WaterRingChart'
import FlowParticles from './FlowParticles'
import RiskDoubleRing from './RiskDoubleRing'
import { getCurrentTimePeriod, calculateCaregiverStatus, STATUS_COLORS, TIME_PERIODS } from './data/thresholds'

// 患者状态配置
const PATIENT_STATUS = {
  emergency: { key: 'emergency', label: '严重', color: '#F43859' },
  risk: { key: 'risk', label: '注意', color: '#FA8534' },
  normal: { key: 'normal', label: '安全', color: '#46C761' }
}

// 图片资源 URL
const imgCaregiverAvatar = "/figma/caregiver-avatar.png"
const imgCorrect = "/icons/correct.svg"
const imgChart = "/figma/chart.svg"

function WaterManagement({ activeTab, setActiveTab, onOpenPatientDetail, patients, setPatients, totalInL, totalOutL, totalInLMax, totalOutLMax, totalInPercent, totalOutPercent, intakeRatio, outputRatio }) {
  const [userData, setUserData] = useState(null)
  const scrollableContentRef = useRef(null)
  const riskCardsRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  
  // 当前时间段
  const currentPeriod = getCurrentTimePeriod()

  const BASE_PERIOD_INTAKE = [450, 550, 550, 350]
  const BASE_PERIOD_OUTPUT = [350, 450, 450, 350]
  const BASE_TOTAL_INTAKE = BASE_PERIOD_INTAKE.reduce((s, x) => s + x, 0)
  const BASE_TOTAL_OUTPUT = BASE_PERIOD_OUTPUT.reduce((s, x) => s + x, 0)
  
  // 计算各状态患者数量
  const emergencyCount = patients.filter(p => p.status === 'emergency').length
  const riskCount = patients.filter(p => p.status === 'risk').length
  
  // 护工端整体状态（基于患者状态动态计算）
  const overallStatus = calculateCaregiverStatus(emergencyCount, riskCount)
  const overallStatusColor = STATUS_COLORS[overallStatus] || '#46C761'

  const safeParseDate = (value) => {
    if (!value) return null
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value
    if (typeof value === 'number') {
      const d = new Date(value)
      return isNaN(d.getTime()) ? null : d
    }
    if (typeof value === 'string') {
      const normalized = value
        .replace(' ', 'T')
        .replace(/\.(\d{3})\d+(Z)?$/, '.$1$2')
      const d = new Date(normalized)
      if (!isNaN(d.getTime())) return d
      const m = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
      if (m) {
        const now = new Date()
        const hh = Number(m[1])
        const mm = Number(m[2])
        const ss = Number(m[3] || 0)
        const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, ss)
        return isNaN(d2.getTime()) ? null : d2
      }
    }
    return null
  }

  const getEntryDate = (entry) => {
    const d = safeParseDate(entry?.timestamp) || safeParseDate(entry?.time)
    return d
  }

  const normalizeKind = (entry) => {
    if (entry?.kind === 'intake' || entry?.kind === 'output') return entry.kind
    if (entry?.source === 'intake' || entry?.source === 'output') return entry.source
    if (entry?.source === 'water_dispenser' || entry?.source === 'camera') return 'intake'
    if (entry?.source === 'urinal') return 'output'
    return null
  }

  // 单个患者在当前时间段的摄入/排出占上限百分比（用于风险排序双环）
  // 外环 = 该时间段摄入量占上限比例
  // 内环 = 该时间段排出量占上限比例
  const getPatientPercents = (patient) => {
    const periodIndex = Math.max(
      0,
      TIME_PERIODS.findIndex(p => p.start === currentPeriod.start && p.end === currentPeriod.end)
    )

    const periodLimitIntake = Math.max(1, Math.round(BASE_PERIOD_INTAKE[periodIndex] || BASE_PERIOD_INTAKE[0]))
    const periodLimitOutput = Math.max(1, Math.round(BASE_PERIOD_OUTPUT[periodIndex] || BASE_PERIOD_OUTPUT[0]))

    const timeline = patient?.timeline || []
    const parsed = timeline
      .map((e) => {
        const d = getEntryDate(e)
        const kind = normalizeKind(e)
        const raw = e?.valueMl ?? e?.value ?? 0
        const value = Math.round(Number(raw) || 0)
        return { __date: d, __kind: kind, __value: value }
      })
      .filter(e => e.__date && e.__kind)
      .sort((a, b) => a.__date.getTime() - b.__date.getTime())

    const base = parsed[0]?.__date || new Date()
    const periodStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), currentPeriod.start, 0, 0, 0)
    const periodEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate(), currentPeriod.end, 0, 0, 0)

    let periodIntake = 0
    let periodOutput = 0
    for (const e of parsed) {
      const t = e.__date.getTime()
      if (t < periodStart.getTime()) continue
      if (t >= periodEnd.getTime()) break
      if (e.__kind === 'intake') periodIntake += e.__value
      if (e.__kind === 'output') periodOutput += e.__value
    }
    
    const intakePercent = periodLimitIntake > 0
      ? Math.min(100, Math.round((periodIntake / periodLimitIntake) * 100))
      : 0
    const outputPercent = periodLimitOutput > 0
      ? Math.min(100, Math.round((periodOutput / periodLimitOutput) * 100))
      : 0
    return { intakePercent, outputPercent }
  }

  // 获取患者状态信息
  const getStatusInfo = (patient) => {
    const statusKey = patient.status || 'normal'
    const statusConfig = PATIENT_STATUS[statusKey]
    return {
      key: statusKey,
      label: statusConfig.label,
      color: statusConfig.color,
      className: `wm-${statusKey}`
    }
  }

  // 计算需要关注的人数（严重+注意）
  const needAttentionCount = patients.filter(p => p.status === 'emergency' || p.status === 'risk').length

  // 按状态排序患者（严重 > 注意 > 安全）
  const sortedPatients = [...patients].sort((a, b) => {
    const statusOrder = { 'emergency': 0, 'risk': 1, 'normal': 2 }
    const aStatus = a.status ?? 'normal'
    const bStatus = b.status ?? 'normal'
    return statusOrder[aStatus] - statusOrder[bStatus]
  })
  
  // 平均净入量 = 所有患者 (摄入 - 排出) 的平均值
  const averageNetMl = patients.length
    ? Math.round(patients.reduce((sum, p) => sum + ((p.inMl ?? 0) - (p.outMl ?? 0)), 0) / patients.length)
    : 0
  const averageNetText = `${averageNetMl >= 0 ? '+' : ''}${averageNetMl} mL`
  
  // ========== 动态生成「整体情况」文案 ==========
  // 计算喝水异常的患者数（摄入量超过上限的80%视为偏多，低于30%视为偏少）
  const intakeAbnormal = patients.reduce((acc, p) => {
    const ratio = p.inMlMax > 0 ? (p.inMl || 0) / p.inMlMax : 0
    if (ratio > 0.8) {
      acc.tooMuch++
      acc.tooMuchNames.push(p.name || p.fullName || '患者')
    } else if (ratio < 0.3 && (p.inMl || 0) > 0) {
      acc.tooLittle++
      acc.tooLittleNames.push(p.name || p.fullName || '患者')
    }
    return acc
  }, { tooMuch: 0, tooLittle: 0, tooMuchNames: [], tooLittleNames: [] })
  
  // 计算排尿异常的患者数（排出量超过上限的80%视为偏多，低于30%视为偏少）
  const outputAbnormal = patients.reduce((acc, p) => {
    const ratio = p.outMlMax > 0 ? (p.outMl || 0) / p.outMlMax : 0
    if (ratio > 0.8) {
      acc.tooMuch++
      acc.tooMuchNames.push(p.name || p.fullName || '患者')
    } else if (ratio < 0.3 && (p.outMl || 0) > 0) {
      acc.tooLittle++
      acc.tooLittleNames.push(p.name || p.fullName || '患者')
    }
    return acc
  }, { tooMuch: 0, tooLittle: 0, tooMuchNames: [], tooLittleNames: [] })
  
  // 生成整体情况描述
  const getOverallDescription = () => {
    // 整体状态文案
    let statusText = '整体情况良好'
    if (overallStatus === 'emergency') {
      statusText = '整体情况紧急'
    } else if (overallStatus === 'risk') {
      statusText = '整体情况需注意'
    }
    
    // 异常情况文案
    const abnormalParts = []
    if (intakeAbnormal.tooMuch > 0) {
      abnormalParts.push(intakeAbnormal.tooMuch === 1 ? `${intakeAbnormal.tooMuchNames[0]}喝水偏多` : `${intakeAbnormal.tooMuch}位喝水偏多`)
    }
    if (intakeAbnormal.tooLittle > 0) {
      abnormalParts.push(intakeAbnormal.tooLittle === 1 ? `${intakeAbnormal.tooLittleNames[0]}喝水偏少` : `${intakeAbnormal.tooLittle}位喝水偏少`)
    }
    if (outputAbnormal.tooMuch > 0) {
      abnormalParts.push(outputAbnormal.tooMuch === 1 ? `${outputAbnormal.tooMuchNames[0]}排尿偏多` : `${outputAbnormal.tooMuch}位排尿偏多`)
    }
    if (outputAbnormal.tooLittle > 0) {
      abnormalParts.push(outputAbnormal.tooLittle === 1 ? `${outputAbnormal.tooLittleNames[0]}排尿偏少` : `${outputAbnormal.tooLittle}位排尿偏少`)
    }
    
    if (abnormalParts.length === 0) {
      return statusText
    }
    return `${statusText}，${abnormalParts.join('，')}`
  }
  
  const overallDescription = getOverallDescription()
  
  // 任务列表数据
  const [tasks, setTasks] = useState([
    { id: 1, text: '08:10 李阿姨 记录早餐饮水量', completed: true },
    { id: 2, text: '10:30 王叔叔 核对拍照上传摄入估算', completed: false },
    { id: 3, text: '14:20 张爷爷 记录下午饮水机入量', completed: false },
    { id: 4, text: '19:05 陈奶奶 记录尿壶排出量与尿色', completed: false }
  ])

  // 从localStorage获取用户数据
  useEffect(() => {
    const patientData = localStorage.getItem('patientData')
    if (patientData) {
      setUserData(JSON.parse(patientData))
    }
  }, [])

  // 拖动滚动处理
  const handleMouseDown = (e) => {
    if (!riskCardsRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - riskCardsRef.current.offsetLeft)
    setScrollLeft(riskCardsRef.current.scrollLeft)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !riskCardsRef.current) return
    e.preventDefault()
    const x = e.pageX - riskCardsRef.current.offsetLeft
    const walk = (x - startX) * 2 // 滚动速度倍数
    riskCardsRef.current.scrollLeft = scrollLeft - walk
  }

  const handleTouchStart = (e) => {
    if (!riskCardsRef.current) return
    setIsDragging(true)
    setStartX(e.touches[0].pageX - riskCardsRef.current.offsetLeft)
    setScrollLeft(riskCardsRef.current.scrollLeft)
  }

  const handleTouchMove = (e) => {
    if (!isDragging || !riskCardsRef.current) return
    const x = e.touches[0].pageX - riskCardsRef.current.offsetLeft
    const walk = (x - startX) * 2
    riskCardsRef.current.scrollLeft = scrollLeft - walk
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // 切换任务完成状态
  const toggleTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ))
  }

  return (
    <div className="water-management-content">
      {/* 顶部固定栏 - Frame 711 */}
      <div className="wm-top-header">
        <div className="wm-user-info">
          <div className="wm-user-details">
            <h2 className="wm-user-name">王护工</h2>
            <p className="wm-shift-info">A班（6：00-14：00） 剩余4h10min</p>
          </div>
          <div className="wm-user-avatar" onClick={() => setActiveTab('settings')} style={{ cursor: 'pointer' }}>
            <img src={imgCaregiverAvatar} alt="头像" />
          </div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="wm-scrollable-content" ref={scrollableContentRef}>
        {/* 水分粒子动画 */}
        <WaterParticles intakePercent={intakeRatio} outputPercent={outputRatio} baseCount={20} />

        {/* 圆环图表区域 */}
        <div className="wm-chart-section">
          <div className="wm-chart-wrapper">
            {/* 左侧流动粒子 - 摄入方向，粒子量与摄入占比成正比 */}
            <FlowParticles direction="left" percentage={intakeRatio} baseCount={28} />
            
            {/* 主圆环图 - 使用动态图表组件替代静态图片 */}
            <div className="wm-main-chart">
              <WaterRingChart 
                intakePercent={intakeRatio} 
                outputPercent={outputRatio} 
                size={200}
                statusColor={overallStatusColor}
              />
            </div>
            
            {/* 右侧流动粒子 - 排出方向，粒子量与排出占比成正比 */}
            <FlowParticles direction="right" percentage={outputRatio} baseCount={28} />
          </div>
        </div>

        {/* 关注提示区域 */}
        <div className="wm-attention-section">
          <div className="wm-attention-content">
            <h3 className="wm-attention-title">{needAttentionCount}位需要关注</h3>
            <p className="wm-attention-desc">{overallDescription}</p>
          </div>
          
          {/* 水分统计卡片 */}
          <div className="wm-water-stats">
            {/* 总入量卡片 */}
            <div className="wm-stat-card">
              <p className="wm-stat-label">总入量</p>
              <p className="wm-stat-value">{totalInL} L</p>
              <p className="wm-stat-target">目标：{totalInLMax} L</p>
              <div className="wm-progress-bar">
                <div className="wm-progress-bg wm-intake-bg"></div>
                <div className="wm-progress-fill wm-intake-fill" style={{ width: `${totalInPercent}%` }}></div>
              </div>
            </div>
            
            {/* 总出量卡片 */}
            <div className="wm-stat-card">
              <p className="wm-stat-label">总出量</p>
              <p className="wm-stat-value">{totalOutL} L</p>
              <p className="wm-stat-target">含估算 {totalOutLMax} L</p>
              <div className="wm-progress-bar">
                <div className="wm-progress-bg wm-output-bg"></div>
                <div className="wm-progress-fill wm-output-fill" style={{ width: `${totalOutPercent}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 风险排序 */}
        <div className="wm-risk-section">
          <div className="wm-risk-header">
            <h3 className="wm-section-title">风险排序</h3>
            <span style={{ color: '#375DFB', fontSize: '13px' }}>{currentPeriod.label}</span>
          </div>
          <div 
            className="wm-risk-cards"
            ref={riskCardsRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {sortedPatients.map((patient) => {
              const statusInfo = getStatusInfo(patient)
              const { intakePercent, outputPercent } = getPatientPercents(patient)
              return (
                <div 
                  key={patient.id} 
                  className="wm-risk-card" 
                  onClick={(e) => {
                    if (!isDragging) {
                      // 传递完整的患者对象，保持与 PatientPage 一致
                      onOpenPatientDetail(patient)
                    }
                  }} 
                  style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
                >
                  <div className="wm-patient-avatar">
                    <RiskDoubleRing
                      intakePercent={intakePercent}
                      outputPercent={outputPercent}
                      size={64}
                      centerColor={statusInfo.color}
                    />
                  </div>
                  <div className="wm-patient-details">
                    <p className="wm-patient-name">{patient.shortName}</p>
                    <p className={`wm-risk-level ${statusInfo.className}`} style={{ color: statusInfo.color }}>{statusInfo.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 今日任务 */}
        <div className="wm-tasks-section">
          <h3 className="wm-section-title">今日任务</h3>
          <div className="wm-tasks-list">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className="wm-task-item"
                onClick={() => toggleTask(task.id)}
              >
                <div className={`wm-checkbox ${task.completed ? 'wm-checked' : ''}`}>
                  {task.completed && <img src={imgCorrect} alt="已选中" className="wm-check-icon" />}
                </div>
                <span className={`wm-task-text ${task.completed ? 'wm-completed' : ''}`}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 病区趋势 */}
        <div className="wm-trend-section">
          <div className="wm-trend-header">
            <div className="wm-trend-title-group">
              <h3 className="wm-section-title">病区趋势</h3>
              <p className="wm-trend-subtitle">过去7天</p>
            </div>
            <div className="wm-trend-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="#7B9BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          
          <div className="wm-trend-content">
            <div className="wm-trend-stats">
              <p className="wm-trend-value">3/7</p>
              <p className="wm-trend-label">已达标</p>
            </div>
            
            <div className="wm-week-chart">
              {['一', '二', '三', '四', '五', '六', '七'].map((day, index) => (
                <div key={index} className="wm-day-column">
                  <div className="wm-day-chart">
                    <img src={imgChart} alt={`周${day}`} />
                  </div>
                  <span className="wm-day-label">{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 关键指标对比 */}
        <div className="wm-metrics-section">
          <h3 className="wm-section-title">关键指标对比</h3>
          <div className="wm-metrics-cards">
            <div className="wm-metric-card">
              <p className="wm-metric-label">平均净入量</p>
              <p className="wm-metric-value">{averageNetText}</p>
              <p className="wm-metric-desc">病区总平均</p>
            </div>
            <div className="wm-metric-card">
              <p className="wm-metric-label">达标率</p>
              <p className="wm-metric-value">33%</p>
              <p className="wm-metric-desc">1/3患者达标</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WaterManagement
