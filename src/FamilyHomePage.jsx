import React, { useMemo } from 'react'
import './FamilyHomePage.css'
import WaterRingChart from './WaterRingChart'
import DiagonalFlowParticles from './DiagonalFlowParticles'
import { STATUS_COLORS, STATUS_LABELS } from './data/thresholds'

// 患者状态配置（使用 data 层统一配置）
const PATIENT_STATUS = {
  emergency: { key: 'emergency', label: STATUS_LABELS.emergency, color: STATUS_COLORS.emergency },
  risk: { key: 'risk', label: STATUS_LABELS.risk, color: STATUS_COLORS.risk },
  normal: { key: 'normal', label: '安全', color: STATUS_COLORS.normal }
}

const imgAvatar = '/figma/family-avatar.png'
const imgIn = '/figma/family-in.svg'
const imgOut = '/figma/family-out.svg'
const imgStatusDot = '/figma/family-status-dot.svg'

const imgIconIntake = '/icons/DropHalfBottom.svg'
const imgIconCamera = '/icons/Camera.svg'
const imgIconOutput = '/icons/ApproximateEquals.svg'
const imgIconPencil = '/icons/PencilSimple.svg'

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
  return `${name}今天${assessment}`
}

function FamilyHomePage({ setActiveTab, timeline = [], setTimeline, patientData = null, aiSummary = '' }) {
  // 从 timeline 动态计算入量和出量
  const { inMl, outMl } = useMemo(() => {
    // 同步口径：若传入 patientData（来自 MainApp/patients[current_patient]），优先使用其中的汇总值
    if (patientData && (patientData.inMl != null || patientData.outMl != null)) {
      return {
        inMl: Number(patientData.inMl ?? 0) || 0,
        outMl: Number(patientData.outMl ?? 0) || 0,
      }
    }
    let totalIn = 0
    let totalOut = 0
    timeline.forEach(item => {
      if (item.kind === 'intake') {
        totalIn += item.valueMl ?? 0
      } else if (item.kind === 'output') {
        totalOut += item.valueMl ?? 0
      }
    })
    return { inMl: totalIn, outMl: totalOut }
  }, [timeline, patientData?.inMl, patientData?.outMl])

  const inMlInt = useMemo(() => Math.round(inMl || 0), [inMl])
  const outMlInt = useMemo(() => Math.round(outMl || 0), [outMl])

  const safeParseDate = (value) => {
    if (!value) return null
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value
    if (typeof value === 'number') {
      const d = new Date(value)
      return isNaN(d.getTime()) ? null : d
    }
    if (typeof value === 'string') {
      const normalized = value.replace(' ', 'T').replace(/\.(\d{3})\d+(Z)?$/, '.$1$2')
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

  const getTimeText = (item) => {
    if (item?.time) return String(item.time)
    const d = safeParseDate(item?.timestamp)
    if (!d) return ''
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const getPeriodLabel = (item) => {
    const d = safeParseDate(item?.timestamp) || safeParseDate(item?.time)
    if (!d) return ''
    const hour = d.getHours() + d.getMinutes() / 60
    if (hour >= 6 && hour < 10) return '早上'
    if (hour >= 10 && hour < 14) return '中午'
    if (hour >= 14 && hour < 18) return '下午'
    if (hour >= 18 && hour < 22) return '晚上'
    return ''
  }

  const getSourceText = (source) => {
    if (source === 'water_dispenser') return '饮水机'
    if (source === 'camera') return '拍照上传'
    if (source === 'urinal') return '智能马桶'
    if (source === 'manual') return '手动'
    if (source === 'intake') return '摄入'
    if (source === 'output') return '排出'
    return ''
  }

  const formatAgo = (date) => {
    if (!date) return ''
    const diffMs = Date.now() - date.getTime()
    if (diffMs < 0) return '刚刚'
    const min = Math.floor(diffMs / 60000)
    if (min <= 0) return '刚刚'
    if (min < 60) return `${min}分钟前`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h}小时前`
    const d = Math.floor(h / 24)
    return `${d}天前`
  }

  const patientStatus = useMemo(() => {
    if (patientData?.status) return patientData.status
    const netBalance = inMl - outMl
    if (netBalance >= 500) return 'emergency'
    if (netBalance > 0) return 'risk'
    return 'normal'
  }, [patientData?.status, inMl, outMl])
  const statusInfo = PATIENT_STATUS[patientStatus]
  
  const profile = useMemo(() => {
    const inMlMax = patientData?.inMlMax || 1200
    const outMlMax = patientData?.outMlMax || 1200
    const fallback = {
      name: patientData?.name || '王某某',
      subtitle: patientData?.metaFull || patientData?.meta || 'GFR Ⅰ期 60kg 依从性良好',
      inMlMax,
      outMlMax
    }

    return fallback
  }, [patientData])

  // 格式化 timeline 用于显示
  const displayTimeline = useMemo(() => {
    return timeline.map((item) => {
      const isCamera = item.source === 'camera'
      const isUrinal = item.source === 'urinal'
      const timeText = getTimeText(item)
      const periodLabel = isCamera ? getPeriodLabel(item) : ''
      const sourceText = getSourceText(item.source)

      const ai = item.aiRecognition || null
      const cameraValue = ai?.estimatedWater ?? item.valueMl ?? item.value ?? 0
      const valueRaw = isCamera ? cameraValue : (item.valueMl ?? item.value ?? 0)
      const valueText = item.kind === 'output' ? `- ${valueRaw}ml` : `+ ${valueRaw}ml`

      const title = isCamera
        ? (ai?.foodType || item.title)
        : (isUrinal
          ? (item.urineColor ? `排尿 · ${item.urineColor}` : '排尿')
          : item.title)

      const timeDisplay = isCamera
        ? `${timeText}${periodLabel ? ` ${periodLabel}` : ''} ${sourceText || '拍照上传'}`.trim()
        : `${timeText}${sourceText ? ` ${sourceText}` : ''}`.trim()

      return {
        ...item,
        title,
        time: timeDisplay,
        valueText,
        ago: formatAgo(safeParseDate(item.timestamp) || safeParseDate(item.time)) || item.ago || '刚刚',
      }
    })
  }, [timeline])

  return (
    <div className="family-home-page">
      <div className="fh-header">
        <div className="fh-header-content">
          <div className="fh-title-group">
            <div className="fh-title">{profile.name}</div>
            <div className="fh-subtitle">{profile.subtitle}</div>
          </div>
          <div className="fh-avatar" onClick={() => setActiveTab('settings')} style={{ cursor: 'pointer' }}>
            <img src={imgAvatar} alt="头像" />
          </div>
        </div>
      </div>

      <div className="fh-scroll">


        <div className="fh-summary">
          <div className="fh-ring-wrap">
            {/* 动态水分球图表 - 从timeline计算百分比 */}
            <WaterRingChart 
              intakePercent={inMlInt + outMlInt > 0 ? Math.round((inMlInt / (inMlInt + outMlInt)) * 100) : 50}
              outputPercent={inMlInt + outMlInt > 0 ? Math.round((outMlInt / (inMlInt + outMlInt)) * 100) : 50}
              size={140}
              statusColor={statusInfo.color}
            />
            
            {/* 对角线流动粒子：左下→球心→右上 */}
            <DiagonalFlowParticles 
              intakePercent={inMlInt + outMlInt > 0 ? Math.round((inMlInt / (inMlInt + outMlInt)) * 100) : 50} 
              outputPercent={inMlInt + outMlInt > 0 ? Math.round((outMlInt / (inMlInt + outMlInt)) * 100) : 50} 
              baseCount={20} 
            />
          </div>

          <div className="fh-summary-right">
            <div className="fh-status-pill">
              <svg className="fh-status-dot" width="8" height="8" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="4" fill={statusInfo.color} />
              </svg>
              <div className="fh-status-text">{statusInfo.label}状态</div>
            </div>
            <div className="fh-ai-text">
              {patientData?.aiSummary?.overall || (aiSummary || '').replace(/^AI生成简要报告[：:]\s*/, '') || generateAISummary(patientData || { name: profile.name, inMl: inMlInt, outMl: outMlInt })}
            </div>

            <div className="fh-metrics">
              <div className="fh-metric-card">
                <div className="fh-metric-label">喝了</div>
                <div className="fh-metric-value">
                  <span className="fh-metric-number">{inMlInt}</span>
                  <span className="fh-metric-unit">ml</span>
                </div>
                <div className="fh-metric-sub">建议 {profile.inMlMax} ml</div>
                <div className="fh-progress">
                  <div className="fh-progress-track fh-progress-track--blue">
                    <div className="fh-progress-fill fh-progress-fill--blue" style={{ width: `${profile.inMlMax > 0 ? Math.round((inMlInt / profile.inMlMax) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="fh-metric-card">
                <div className="fh-metric-label">排出</div>
                <div className="fh-metric-value">
                  <span className="fh-metric-number">{outMlInt}</span>
                  <span className="fh-metric-unit">ml</span>
                </div>
                <div className="fh-metric-sub">含活动估算</div>
                <div className="fh-progress">
                  <div className="fh-progress-track fh-progress-track--purple">
                    <div className="fh-progress-fill fh-progress-fill--purple" style={{ width: `${profile.outMlMax > 0 ? Math.round((outMlInt / profile.outMlMax) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fh-day-card">
          <div className="fh-day-header">
            <div className="fh-day-title">{profile.name}的一天</div>
            <div className="fh-day-sub">完全由设备自动记录，护工已经全部核对</div>
          </div>

          <div className="fh-day-timeline">
            <div className="fh-day-line" aria-hidden="true" />

            {displayTimeline.map((item) => {
              const miniIcon =
                item.source === 'camera' ? imgIconCamera 
                : (item.source === 'output' || item.source === 'urinal') ? imgIconOutput 
                : item.source === 'manual' ? imgIconPencil
                : imgIconIntake
              const valueClass = item.kind === 'output' ? 'fh-item-value--output' : 'fh-item-value--intake'
              const dotClass = item.kind === 'output' ? 'fh-dot--output' : 'fh-dot--intake'

              return (
                <div key={item.id} className="fh-item">
                  <div className={`fh-dot ${dotClass}`} aria-hidden="true" />
                  <div className="fh-item-row">
                    <div className="fh-item-left">
                      <div className="fh-item-top">
                        <img className="fh-mini-icon" src={miniIcon} alt="" />
                        <div className="fh-mini-meta">{item.time}</div>
                      </div>
                      <div className="fh-item-title">{item.title}</div>
                      <div className="fh-item-time">{item.ago}</div>
                    </div>
                    <div className={`fh-item-value ${valueClass}`}>{item.valueText}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="fh-plan-card">
          <div className="fh-plan-title">目标&计划</div>

          <div className="fh-goal-box">
            <div className="fh-goal-label">目标</div>
            <ul className="fh-goal-list">
              <li>每天净入量不超过 +100 mL</li>
              <li>保持排尿规律，尿液颜色淡黄</li>
              <li>坚持每天散步 20 分钟</li>
            </ul>
          </div>

          <div className="fh-visit-box">
            <div className="fh-visit-label">下次复诊</div>
            <div className="fh-visit-main">2025-12-28（本周日） · 肾内科李医生</div>
            <div className="fh-visit-sub">建议做：Bolz 复查·血压血糖监测</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FamilyHomePage
