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

function FamilyAnalysisPage({ setActiveTab, timeline = [], setTimeline, patientData = null }) {
  const profile = useMemo(() => {
    return {
      name: patientData?.name || '王某某',
      subtitle: patientData?.metaFull || patientData?.meta || 'GFR Ⅰ期 60kg 依从性良好',
    }
  }, [patientData])

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

  // 使用从props传入的timeline，格式化用于显示（严格按 types.ts 字段）
  const timelineItems = useMemo(
    () => timeline.map((item) => {
      const isCamera = item.source === 'camera'
      const isUrinal = item.source === 'urinal'
      const timeText = getTimeText(item)
      const periodLabel = isCamera ? getPeriodLabel(item) : ''
      const sourceText = getSourceText(item.source)

      const agoText = formatAgo(safeParseDate(item.timestamp) || safeParseDate(item.time)) || item.ago || '刚刚'

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

      const riskB = (() => {
        if (!ai) return '风险评估：暂无'
        if (ai.hasRisk) {
          const rf = Array.isArray(ai.riskFactors) ? ai.riskFactors.filter(Boolean) : []
          return rf.length > 0 ? `风险评估：${rf.join('、')}` : '风险评估：存在风险'
        }
        return '风险评估：未发现明显风险'
      })()

      return {
        ...item,
        title,
        time: timeDisplay,
        valueText,
        ago: agoText,
        expandable: isCamera && (ai || item.imageUrl),
        expand: isCamera && (ai || item.imageUrl)
          ? {
              confidence: `置信度：${ai?.confidence ?? 0}`,
              observe: periodLabel
                ? `监测到${periodLabel}的食物摄入，图像识别为${ai?.foodType || '未知'}`
                : `监测到食物摄入，图像识别为${ai?.foodType || '未知'}`,
              riskA: `推测就餐摄入约${cameraValue}ml`,
              riskB,
              sync: `数据同步：${agoText}`,
            }
          : undefined,
      }
    }),
    [timeline]
  )

  const filteredTimeline = useMemo(() => {
    return timelineItems.filter((item) => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'intake') return item.kind === 'intake'
      if (activeFilter === 'output') return item.kind === 'output'
      if (activeFilter === 'source:intake') return item.source === 'intake' || item.source === 'water_dispenser'
      if (activeFilter === 'source:camera') return item.source === 'camera'
      if (activeFilter === 'source:output') return item.source === 'output' || item.source === 'urinal'
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
                    : (item.source === 'output' || item.source === 'urinal')
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
                                  <img src={item.imageUrl || imgFoodThumb} alt="" />
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
                                    <div className="fap-risk-p fap-risk-p--clamp">{item.expand.riskB}</div>
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
