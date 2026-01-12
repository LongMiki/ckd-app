import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import './WaterManagement.css'
import WaterParticles from './WaterParticles'
import WaterRingChart from './WaterRingChart'
import FlowParticles from './FlowParticles'
import RiskDoubleRing from './RiskDoubleRing'
import { getCurrentTimePeriod, calculateCaregiverStatus, STATUS_COLORS } from './data/thresholds'

// 患者状态配置
const PATIENT_STATUS = {
  emergency: { key: 'emergency', label: '严重', color: '#F43859' },
  risk: { key: 'risk', label: '注意', color: '#FA8534' },
  normal: { key: 'normal', label: '正常', color: '#46C761' }
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
  
  // 计算各状态患者数量
  const emergencyCount = patients.filter(p => p.status === 'emergency').length
  const riskCount = patients.filter(p => p.status === 'risk').length
  
  // 护工端整体状态（基于患者状态动态计算）
  const overallStatus = calculateCaregiverStatus(emergencyCount, riskCount)
  const overallStatusColor = STATUS_COLORS[overallStatus] || '#46C761'

  // 单个患者在当前时间段的摄入/排出占上限百分比（用于风险排序双环）
  // 外环 = 该时间段摄入量占上限比例
  // 内环 = 该时间段排出量占上限比例
  const getPatientPercents = (patient) => {
    const periodLimit = currentPeriod.limit
    // 这里暂时使用患者当日数据的一部分模拟当前时间段数据
    // 实际应该从 patient.periodIntake / patient.periodOutput 获取
    const periodIntake = Math.round(patient.inMl * 0.3) // 模拟当前时间段摄入
    const periodOutput = Math.round(patient.outMl * 0.3) // 模拟当前时间段排出
    
    const intakePercent = periodLimit > 0
      ? Math.min(100, Math.round((periodIntake / periodLimit) * 100))
      : 0
    const outputPercent = periodLimit > 0
      ? Math.min(100, Math.round((periodOutput / periodLimit) * 100))
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
  
  // 任务列表数据
  const [tasks, setTasks] = useState([
    { id: 1, text: '时间-李阿姨早餐水分记录', completed: true },
    { id: 2, text: '时间-李阿姨早餐水分记录', completed: false },
    { id: 3, text: '时间-李阿姨早餐水分记录', completed: false },
    { id: 4, text: '时间-李阿姨早餐水分记录', completed: false }
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
            <p className="wm-attention-desc">整体情况可以，1位喝水偏多，1位排尿偏少</p>
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
