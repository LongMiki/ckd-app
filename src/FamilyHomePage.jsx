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

function FamilyHomePage({ setActiveTab, timeline = [], setTimeline }) {
  // 从 timeline 动态计算入量和出量
  const { inMl, outMl } = useMemo(() => {
    let totalIn = 0
    let totalOut = 0
    timeline.forEach(item => {
      if (item.kind === 'intake') {
        totalIn += item.valueMl || 0
      } else if (item.kind === 'output') {
        totalOut += item.valueMl || 0
      }
    })
    return { inMl: totalIn, outMl: totalOut }
  }, [timeline])

  // 根据净入量判断状态（与 data/thresholds.ts 保持一致）
  // netIntake: normal [-500, 0], risk [0, 500], emergency [500, Infinity]
  const patientStatus = useMemo(() => {
    const netBalance = inMl - outMl
    if (netBalance >= 500) return 'emergency'  // 净入量过高
    if (netBalance > 0) return 'risk'          // 需要注意
    return 'normal'                            // 正常
  }, [inMl, outMl])
  const statusInfo = PATIENT_STATUS[patientStatus]
  
  const profile = useMemo(() => {
    const inMlMax = 1200
    const outMlMax = 1200
    const fallback = {
      name: '王某某',
      subtitle: 'GFR Ⅰ期 60kg 依从性良好',
      inMlMax,
      outMlMax
    }

    const raw = localStorage.getItem('patientData')
    if (!raw) return fallback

    try {
      const data = JSON.parse(raw)
      // 兼容新旧字段名：新格式 patient_name / is_ckd_patient / gfr_stage
      const name = (data?.patient_name || data?.patientName) && (data?.patient_name || data?.patientName) !== '未填写' 
        ? (data?.patient_name || data?.patientName) 
        : fallback.name

      const roman = { 1: 'Ⅰ', 2: 'Ⅱ', 3: 'Ⅲ', 4: 'Ⅳ', 5: 'Ⅴ' }
      const isCKD = data?.is_ckd_patient ?? data?.isCKDPatient
      const gfrStage = data?.gfr_stage ?? data?.gfrStage
      const gfr = isCKD && gfrStage ? `GFR ${roman[gfrStage] || gfrStage}期` : 'GFR'
      const weight = data?.weight && data.weight !== '未填写' ? `${data.weight}kg` : '60kg'

      return {
        name,
        subtitle: `${gfr} ${weight} 依从性良好`,
        inMlMax,
        outMlMax
      }
    } catch {
      return fallback
    }
  }, [])

  // 格式化 timeline 用于显示
  const displayTimeline = useMemo(() => {
    return timeline.map(item => ({
      ...item,
      time: item.sourceLabel ? `${item.time} ${item.sourceLabel}` : item.time,
      valueText: item.kind === 'output' ? `- ${item.valueMl}ml` : `+ ${item.valueMl}ml`
    }))
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
              intakePercent={inMl + outMl > 0 ? Math.round((inMl / (inMl + outMl)) * 100) : 50}
              outputPercent={inMl + outMl > 0 ? Math.round((outMl / (inMl + outMl)) * 100) : 50}
              size={140}
              statusColor={statusInfo.color}
            />
            
            {/* 对角线流动粒子：左下→球心→右上 */}
            <DiagonalFlowParticles 
              intakePercent={inMl + outMl > 0 ? Math.round((inMl / (inMl + outMl)) * 100) : 50} 
              outputPercent={inMl + outMl > 0 ? Math.round((outMl / (inMl + outMl)) * 100) : 50} 
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
            <div className="fh-ai-text">AI生成简要报告：{profile.name}今天水分进量，排尿，整体在医生允许范围</div>

            <div className="fh-metrics">
              <div className="fh-metric-card">
                <div className="fh-metric-label">喝了</div>
                <div className="fh-metric-value">{inMl} ml</div>
                <div className="fh-metric-sub">建议 {profile.inMlMax} ml</div>
                <div className="fh-progress">
                  <div className="fh-progress-track fh-progress-track--blue">
                    <div className="fh-progress-fill fh-progress-fill--blue" style={{ width: `${profile.inMlMax > 0 ? Math.round((inMl / profile.inMlMax) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="fh-metric-card">
                <div className="fh-metric-label">排出</div>
                <div className="fh-metric-value">{outMl} ml</div>
                <div className="fh-metric-sub">含活动估算</div>
                <div className="fh-progress">
                  <div className="fh-progress-track fh-progress-track--purple">
                    <div className="fh-progress-fill fh-progress-fill--purple" style={{ width: `${profile.outMlMax > 0 ? Math.round((outMl / profile.outMlMax) * 100) : 0}%` }} />
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
                : item.source === 'output' ? imgIconOutput 
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
