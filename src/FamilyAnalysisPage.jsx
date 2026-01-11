import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './FamilyAnalysisPage.css'
import DatePickerModal from './DatePickerModal'

const imgAvatar = '/figma/family-avatar.png'

const imgCaretLeft = '/icons/CaretLeft.svg'
const imgCaretRight = '/icons/CaretRight.svg'
const imgCalendar = '/icons/CalendarBlank.svg'

const imgTimelineLine = '/figma/analysis-timeline-line.svg'
const imgDotBlue = '/figma/dot-blue.svg'
const imgDotPurple = '/figma/dot-purple.svg'

const imgIconIntake = '/icons/DropHalfBottom.svg'
const imgIconCamera = '/icons/Camera.svg'
const imgIconOutput = '/icons/ApproximateEquals.svg'

const imgIconPencil = '/icons/PencilSimple.svg'

const imgFoodThumb = '/figma/analysis-food-thumb.png'

function FamilyAnalysisPage({ setActiveTab, timeline = [], setTimeline }) {
  const profile = useMemo(() => {
    const fallback = {
      name: '王某某',
      subtitle: 'GFR Ⅰ期 60kg 依从性良好',
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
      }
    } catch {
      return fallback
    }
  }, [])

  const [activeFilter, setActiveFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const weekBars = useMemo(
    () => [
      { day: '一', height: 83, active: false },
      { day: '二', height: 108, active: false },
      { day: '三', height: 63, active: false },
      { day: '四', height: 124, active: true },
      { day: '五', height: 67, active: false },
      { day: '六', height: 97, active: false },
      { day: '七', height: 74, active: false },
    ],
    []
  )

  // 使用从props传入的timeline，格式化用于显示
  const timelineItems = useMemo(
    () => timeline.map(item => ({
      ...item,
      time: item.sourceLabel ? `${item.time} ${item.sourceLabel}` : item.time,
      valueText: item.kind === 'output' ? `- ${item.valueMl}ml` : `+ ${item.valueMl}ml`,
      // 为汤类条目添加展开详情（示例）
      expandable: item.title?.includes('汤'),
      expand: item.title?.includes('汤') ? {
        confidence: '置信度：82%',
        observe: '检测到午餐时间端的食物摄入，图像识别为高水分汤羹类。',
        riskA: `推测就餐摄入约${item.valueMl}ml`,
        riskB: '此次行为可能导致水分积累上升',
        sync: '数据同步：1分钟前',
      } : undefined,
    })),
    [timeline]
  )

  const filteredTimeline = useMemo(() => {
    return timelineItems.filter((item) => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'intake') return item.kind === 'intake'
      if (activeFilter === 'output') return item.kind === 'output'
      if (activeFilter === 'source:intake') return item.source === 'intake'
      if (activeFilter === 'source:camera') return item.source === 'camera'
      if (activeFilter === 'source:output') return item.source === 'output'
      return true
    })
  }, [timelineItems, activeFilter])

  useEffect(() => {
    if (!expandedId) return
    const stillVisible = filteredTimeline.some((x) => x.id === expandedId)
    if (!stillVisible) setExpandedId(null)
  }, [expandedId, filteredTimeline])

  const handleRowClick = (item) => {
    if (!item.expandable) return
    setExpandedId((prev) => (prev === item.id ? null : item.id))
  }

  return (
    <div className="family-analysis-page">
      <div className="fap-header">
        <div className="fap-header-content">
          <div className="fap-title-group">
            <div className="fap-title">{profile.name}</div>
            <div className="fap-subtitle">{profile.subtitle}</div>
          </div>
          <div className="fap-avatar" onClick={() => setActiveTab('settings')} style={{ cursor: 'pointer' }}>
            <img src={imgAvatar} alt="头像" />
          </div>
        </div>
      </div>

      <div className="fap-scroll">
        {/* Date + Week summary */}
        <div className="fap-top">
          <div className="fap-date-row">
            <button className="fap-round-btn" type="button" aria-label="上一周">
              <img src={imgCaretLeft} alt="" />
            </button>

            <div className="fap-date" onClick={() => setDatePickerOpen(true)} style={{ cursor: 'pointer' }}>
              <img className="fap-date-icon" src={imgCalendar} alt="" />
              <div className="fap-date-text">
                <span>8.15-<span className="fap-date-highlight">8.21</span>,2025</span>
              </div>
            </div>

            <button className="fap-round-btn" type="button" aria-label="下一周">
              <img src={imgCaretRight} alt="" />
            </button>
          </div>

          <div className="fap-week-card">
            <div className="fap-week-header">
              <div className="fap-week-title">周统计</div>
              <div className="fap-week-avg">平均：1093 mL</div>
            </div>

            <div className="fap-bars">
              {weekBars.map((x) => {
                return (
                  <div key={x.day} className="fap-bar-col">
                    <div className="fap-week-bar-wrap">
                      <motion.div
                        className={`fap-week-bar ${x.active ? 'fap-week-bar--active' : ''}`}
                        initial={{ height: 0 }}
                        animate={{ height: x.height }}
                        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                      />
                    </div>
                    <div className="fap-bar-label">{x.day}</div>
                  </div>
                )
              })}
            </div>

            <div className="fap-medical">
              <div className="fap-medical-title">医学解释</div>
              <div className="fap-medical-text">
                本周的液体变化在预期范围内。周五偏高是因为进食量大，但经过周六的透析已经好转。今天虽然仍有 +130 mL，但相比周五已经下降 180 mL，说明王叔叔在逐步恢复。
              </div>
            </div>
          </div>
        </div>

        {/* Log */}
        <div className="fap-log-card">
          <div className="fap-log-header">
            <div className="fap-log-title-group">
              <div className="fap-log-title">日志</div>
              <div className="fap-log-sub">完全由设备自动记录，护工已经全部核对</div>
            </div>

            <div className="fap-log-controls">
              <div className="fap-filter-row">
                <button
                  className={`fap-chip fap-chip--all ${activeFilter === 'all' ? 'fap-chip--active' : ''}`}
                  type="button"
                  onClick={() => setActiveFilter('all')}
                >
                  全部
                </button>
                <button
                  className={`fap-chip fap-chip--intake ${activeFilter === 'intake' ? 'fap-chip--active' : ''}`}
                  type="button"
                  onClick={() => setActiveFilter('intake')}
                >
                  摄入+
                </button>
                <button
                  className={`fap-chip fap-chip--output ${activeFilter === 'output' ? 'fap-chip--active' : ''}`}
                  type="button"
                  onClick={() => setActiveFilter('output')}
                >
                  排出-
                </button>
              </div>
              <div className="fap-icon-row">
                <button
                  className={`fap-icon-btn fap-icon-btn--intake ${activeFilter === 'source:intake' ? 'fap-icon-btn--active' : ''}`}
                  type="button"
                  aria-label="筛选：摄入设备"
                  onClick={() => setActiveFilter('source:intake')}
                >
                  <img src={imgIconIntake} alt="" />
                </button>
                <button
                  className={`fap-icon-btn fap-icon-btn--camera ${activeFilter === 'source:camera' ? 'fap-icon-btn--active' : ''}`}
                  type="button"
                  aria-label="筛选：拍照上传"
                  onClick={() => setActiveFilter('source:camera')}
                >
                  <img src={imgIconCamera} alt="" />
                </button>
                <button
                  className={`fap-icon-btn fap-icon-btn--output ${activeFilter === 'source:output' ? 'fap-icon-btn--active' : ''}`}
                  type="button"
                  aria-label="筛选：排出设备"
                  onClick={() => setActiveFilter('source:output')}
                >
                  <img src={imgIconOutput} alt="" />
                </button>
              </div>
            </div>
          </div>

          <div className="fap-timeline">
            <div className="fap-line" aria-hidden="true">
              <img src={imgTimelineLine} alt="" />
            </div>

            <AnimatePresence initial={false} mode="popLayout">
              {filteredTimeline.map((item) => {
                const dotImg = item.kind === 'output' ? imgDotPurple : imgDotBlue
                const miniIcon =
                  item.source === 'camera'
                    ? imgIconCamera
                    : item.source === 'output'
                      ? imgIconOutput
                      : item.source === 'manual'
                        ? imgIconPencil
                        : imgIconIntake

                const valueClass = item.kind === 'output' ? 'fap-item-value--output' : 'fap-item-value--intake'
                const isExpanded = expandedId === item.id

                return (
                  <motion.div
                    key={item.id}
                    className="fap-item"
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                  >
                    <img className="fap-dot" src={dotImg} alt="" />
                    <div className="fap-item-body">
                      <div
                        className={`fap-item-row ${item.expandable ? 'fap-item-row--clickable' : ''}`}
                        role={item.expandable ? 'button' : undefined}
                        tabIndex={item.expandable ? 0 : undefined}
                        onClick={() => handleRowClick(item)}
                        onKeyDown={(e) => {
                          if (!item.expandable) return
                          if (e.key === 'Enter' || e.key === ' ') handleRowClick(item)
                        }}
                      >
                        <div className="fap-item-left">
                          <div className="fap-item-top">
                            <img className="fap-mini-icon" src={miniIcon} alt="" />
                            <div className="fap-mini-meta">{item.time}</div>
                          </div>
                          <div className="fap-item-title">{item.title}</div>
                          <div className="fap-item-time">{item.ago}</div>
                        </div>
                        <div className={`fap-item-value ${valueClass}`}>{item.valueText}</div>
                      </div>

                      <AnimatePresence initial={false}>
                        {item.expandable && isExpanded && (
                          <motion.div
                            className="fap-expand-wrap"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                          >
                            <motion.div
                              className="fap-observe"
                              layout
                              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                            >
                              <div className="fap-observe-left">
                                <div className="fap-observe-thumb">
                                  <img src={imgFoodThumb} alt="" />
                                </div>
                                <div className="fap-observe-badge">{item.expand.confidence}</div>
                              </div>

                              <div className="fap-observe-right">
                                <div className="fap-observe-block">
                                  <div className="fap-observe-line" />
                                  <div className="fap-observe-text">
                                    <div className="fap-observe-h">系统观察</div>
                                    <div className="fap-observe-p">{item.expand.observe}</div>
                                  </div>
                                </div>

                                <div className="fap-risk-block">
                                  <div className="fap-risk-line" />
                                  <div className="fap-risk-text">
                                    <div className="fap-risk-h">风险推断</div>
                                    <div className="fap-risk-p">{item.expand.riskA}</div>
                                    <div className="fap-risk-p">{item.expand.riskB}</div>
                                  </div>
                                </div>

                                <div className="fap-sync">{item.expand.sync}</div>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 日期选择弹窗 */}
      <DatePickerModal 
        isOpen={datePickerOpen} 
        onClose={() => setDatePickerOpen(false)} 
      />
    </div>
  )
}

export default FamilyAnalysisPage
