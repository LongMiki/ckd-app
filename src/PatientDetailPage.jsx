import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './PatientDetailPage.css'
import WaterRingChart from './WaterRingChart'
import DiagonalFlowParticles from './DiagonalFlowParticles'
import TimeNodeChart from './TimeNodeChart'

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

  return `${name}今天${assessment}`
}

// 生成详细的 HTML 报告（为医生准备，注重逻辑与内容）
function generatePatientReportHTML(patient, timeline = []) {
  const now = new Date()
  const patientName = patient?.name || '未命名患者'

  const metaText = String(patient?.metaFull || patient?.meta || '')
  const parsedWeight = (() => {
    const m = metaText.match(/(\d+(?:\.\d+)?)\s*kg/i)
    if (!m) return null
    const n = Number(m[1])
    return Number.isFinite(n) ? n : null
  })()
  const parsedStage = (() => {
    const m = metaText.match(/GFR\s*([\u2160-\u216BIVX0-9]+\s*\S*?期)/i)
    if (m) return m[1].replace(/\s+/g, '')
    const m2 = metaText.match(/([\u2160-\u216BIVX0-9]+\s*期)/i)
    if (m2) return m2[1].replace(/\s+/g, '')
    return null
  })()

  const weightDisplay = patient?.weight ?? parsedWeight ?? '-'
  const gfrDisplay = patient?.gfr ?? '-'
  const stageDisplay = patient?.stage ?? parsedStage ?? '-'

  const metaDisplay = (() => {
    if (!metaText) return '-'
    let s = metaText
    if (patient?.weight == null && parsedWeight != null) {
      s = s.replace(/\b\d+(?:\.\d+)?\s*kg\b/ig, '').trim()
    }
    if (!patient?.stage && parsedStage) {
      const stageNorm = String(parsedStage).replace(/\s+/g, '')
      const esc = stageNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      s = s.replace(new RegExp(`GFR\\s*${esc}`, 'ig'), '')
      s = s.replace(new RegExp(esc, 'ig'), '')
      s = s.trim()
    }
    s = s.replace(/[，,;；]+/g, ' ').replace(/\s+/g, ' ').trim()
    return s || '-'
  })()

  const parsedTimeline = (timeline || []).map((t) => {
    let date = null
    try {
      date = t.time ? new Date(t.time) : null
      if (date && isNaN(date.getTime())) date = null
    } catch (e) { date = null }
    return { ...t, _date: date }
  })

  const totalIntake = parsedTimeline.filter(x => x.kind === 'intake').reduce((s, x) => s + (x.valueMl || 0), 0)
  const totalOutput = parsedTimeline.filter(x => x.kind === 'output').reduce((s, x) => s + (x.valueMl || 0), 0)
  const intakeCount = parsedTimeline.filter(x => x.kind === 'intake').length
  const outputCount = parsedTimeline.filter(x => x.kind === 'output').length

  const header = `
    <div style="font-family: Helvetica, Arial, sans-serif; padding:20px; max-width:900px; margin:0 auto; color:#111">
      <h1>患者数据报告</h1>
      <p>姓名：${patientName}</p>
      <p>ID：${patient?.id || '-'} &nbsp;|&nbsp; 生成时间：${now.toLocaleString()}</p>
      <hr />
  `

  const basics = `
    <h2>一、基本信息</h2>
    <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:12px">
      <tr><td style="padding:6px; border:1px solid #eee; width:200px">姓名</td><td style="padding:6px; border:1px solid #eee">${patient?.name || '-'}</td></tr>
      <tr><td style="padding:6px; border:1px solid #eee">住院/床位</td><td style="padding:6px; border:1px solid #eee">${patient?.fullName || '-'}</td></tr>
      <tr><td style="padding:6px; border:1px solid #eee">既往/备注</td><td style="padding:6px; border:1px solid #eee">${metaDisplay}</td></tr>
      <tr><td style="padding:6px; border:1px solid #eee">体重 (kg)</td><td style="padding:6px; border:1px solid #eee">${weightDisplay}</td></tr>
      <tr><td style="padding:6px; border:1px solid #eee">GFR（数值） / CKD分期</td><td style="padding:6px; border:1px solid #eee">${gfrDisplay} / ${stageDisplay}</td></tr>
      <tr><td style="padding:6px; border:1px solid #eee">药物/过敏</td><td style="padding:6px; border:1px solid #eee">${(patient?.medications && patient.medications.join(', ')) || (patient?.allergies && patient.allergies.join(', ')) || '-'}</td></tr>
    </table>
  `

  const statsSection = `
    <h2>二、水分统计与趋势</h2>
    <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:12px">
      <tr><td style="padding:6px; border:1px solid #eee; width:260px">系统记录总摄入 (ml)</td><td style="padding:6px; border:1px solid #eee">${totalIntake || patient?.inMl || 0}</td></tr>
      <tr><td style="padding:6px; border:1px solid #eee">系统记录总排出 (ml)</td><td style="padding:6px; border:1px solid #eee">${totalOutput || patient?.outMl || 0}</td></tr>
      <tr><td style="padding:6px; border:1px solid #eee">事件计数（摄入 / 排出）</td><td style="padding:6px; border:1px solid #eee">${intakeCount} / ${outputCount}</td></tr>
      <tr><td style="padding:6px; border:1px solid #eee">平均每次摄入 (ml)</td><td style="padding:6px; border:1px solid #eee">${intakeCount? Math.round(totalIntake/intakeCount): '-'}</td></tr>
      <tr><td style="padding:6px; border:1px solid #eee">平均每次排出 (ml)</td><td style="padding:6px; border:1px solid #eee">${outputCount? Math.round(totalOutput/outputCount): '-'}</td></tr>
    </table>
  `

  const alerts = []
  const netBalanceToday = (patient?.inMl || 0) - (patient?.outMl || 0)
  if (netBalanceToday > 300) alerts.push('净平衡偏高：可能摄入过多')
  if (netBalanceToday > 150 && netBalanceToday <= 300) alerts.push('净平衡略高：注意液体摄入')
  if (netBalanceToday < -200) alerts.push('净平衡偏低：可能脱水或排出过多')
  if (patient?.urineOsmolality && (patient.urineOsmolality < 200 || patient.urineOsmolality > 1000)) alerts.push('尿渗透压异常')
  if (patient?.urineSpecificGravity && (patient.urineSpecificGravity < 1.005 || patient.urineSpecificGravity > 1.030)) alerts.push('尿比重异常')

  const alertsHtml = `
    <h2>三、阈值与警示</h2>
    ${alerts.length ? `<ul>${alerts.map(a=>`<li style="margin:6px 0">${a}</li>`).join('')}</ul>` : '<p>未发现明显异常阈值</p>'}
  `

  let gfrHtml = ''
  if (patient?.gfrHistory && Array.isArray(patient.gfrHistory) && patient.gfrHistory.length > 0) {
    const entries = patient.gfrHistory.slice().sort((a,b)=> new Date(a.date) - new Date(b.date))
    const first = entries[0].value
    const last = entries[entries.length-1].value
    const delta = last - first
    const trend = delta > 0 ? '上升' : (delta < 0 ? '下降' : '无明显变化')
    gfrHtml = `
      <h2>四、GFR 趋势</h2>
      <p>记录点：${entries.length} 项；起始 ${first}，最近 ${last}；趋势：${trend}（变化 ${delta}）</p>
    `
  }

  let timelineHtml = ''
  if (timeline && timeline.length > 0) {
    timelineHtml += '<h2>五、日志时间线（最近记录）</h2>'
    timelineHtml += '<table style="width:100%; border-collapse:collapse; font-size:13px">'
    timelineHtml += '<thead><tr style="background:#fafafa"><th style="padding:8px;border:1px solid #eee">时间</th><th style="padding:8px;border:1px solid #eee">类型</th><th style="padding:8px;border:1px solid #eee">来源</th><th style="padding:8px;border:1px solid #eee">数值</th><th style="padding:8px;border:1px solid #eee">备注</th></tr></thead>'
    timelineHtml += '<tbody>'
    timeline.slice().reverse().forEach((t) => {
      timelineHtml += `<tr><td style="padding:8px;border:1px solid #eee">${t.time || '-'}</td><td style="padding:8px;border:1px solid #eee">${t.kind || '-'}</td><td style="padding:8px;border:1px solid #eee">${t.source || '-'}</td><td style="padding:8px;border:1px solid #eee">${t.valueText || t.valueMl || '-'}</td><td style="padding:8px;border:1px solid #eee">${t.title || '-'}</td></tr>`
    })
    timelineHtml += '</tbody></table>'
  } else {
    timelineHtml += '<h2>五、日志时间线</h2><p>暂无日志数据</p>'
  }

  const aiSummary = generateAISummary(patient)

  const footer = `
      <h2>六、AI简要结论与建议</h2>
      <p>${aiSummary}</p>
      <hr />
      <p style="font-size:12px;color:#666">注：本报告为系统自动生成，用于临床参考。诊断与用药请以医生判断为准。</p>
    </div>
  `

  return header + basics + statsSection + alertsHtml + gfrHtml + timelineHtml + footer
}

// 生成并下载 HTML 报告文件
function downloadReportHTML(filename, htmlContent) {
  try {
    const blob = new Blob([
      `<!doctype html><html><head><meta charset="utf-8"><title>${filename}</title></head><body>${htmlContent}</body></html>`
    ], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.warn('download failed', e)
  }
}

// 在浏览器中打开报告并触发打印/导出
function openReportWindowAndPrint(htmlContent) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>患者数据报告</title></head><body>')
  w.document.write(htmlContent)
  w.document.write('</body></html>')
  w.document.close()
  setTimeout(() => {
    try { w.print() } catch (e) { /* ignore */ }
  }, 600)
}

const imgCaretCircleLeft = '/icons/CaretCircleLeft.svg'
const imgArrowUpRight = '/icons/ArrowUpRight.svg'
const imgDropHalfBottom = '/icons/DropHalfBottom.svg'
const imgCamera = '/icons/Camera.svg'
const imgApproximateEquals = '/icons/ApproximateEquals.svg'
const imgFrame745 = '/icons/Frame 745.svg'
const imgPencil = '/icons/PencilSimple.svg' // 手动记录图标

const imgPatientAvatar = '/figma/Rectangle 283.png'
const imgStatusDot = '/figma/family-status-dot.svg'
const imgDotBlue = '/figma/dot-blue.svg'
const imgDotPurple = '/figma/dot-purple.svg'
const imgFoodThumb = '/figma/analysis-food-thumb.png'

function PatientDetailPage({ patientData, onBack, patients, setPatients, aiSummary = '' }) {
  // 从 patients 中获取最新的患者数据（patientData 是快照，不会更新）
  const currentPatient = patients?.find(p => p.id === patientData?.id) || patientData
  
  // 获取患者状态
  const patientStatus = currentPatient?.status || 'normal'
  const statusInfo = PATIENT_STATUS[patientStatus]
  
  // 患者摄入排出数据
  const inMl = Math.round(currentPatient?.inMl ?? 0)
  const outMl = Math.round(currentPatient?.outMl ?? 0)
  const inMlMax = currentPatient?.inMlMax || 1000
  const outMlMax = currentPatient?.outMlMax || 1000
  const inPercent = inMlMax > 0 ? Math.round((inMl / inMlMax) * 100) : 0
  const outPercent = outMlMax > 0 ? Math.round((outMl / outMlMax) * 100) : 0

  const totalIo = inMl + outMl
  const intakeRatioPercent = totalIo > 0 ? Math.round((inMl / totalIo) * 100) : 50
  const outputRatioPercent = totalIo > 0 ? Math.round((outMl / totalIo) * 100) : 50
  
  // 判断是否有数据
  const hasIntakeOutputData = inMl > 0 || outMl > 0
  
  // 尿液指标数据
  // 尿渗透压: 200-1000 mOsm/kg H₂O 为正常范围
  const urineOsmolality = currentPatient?.urineOsmolality
  const hasUrineOsmolality = urineOsmolality !== null && urineOsmolality !== undefined
  // 尿渗透压进度条：将 200-1000 映射到 0-100%
  const osmolalityPercent = hasUrineOsmolality 
    ? Math.max(0, Math.min(100, ((urineOsmolality - 200) / (1000 - 200)) * 100))
    : 0
  
  // 尿比重: 1.005-1.030 为正常范围
  const urineSpecificGravity = currentPatient?.urineSpecificGravity
  const hasUrineSpecificGravity = urineSpecificGravity !== null && urineSpecificGravity !== undefined
  // 尿比重进度条：将 1.005-1.030 映射到 0-100%
  const specificGravityPercent = hasUrineSpecificGravity
    ? Math.max(0, Math.min(100, ((urineSpecificGravity - 1.005) / (1.030 - 1.005)) * 100))
    : 0
  
  // 排尿次数
  const urinationCount = currentPatient?.urinationCount ?? 0
  
  // 使用患者自己的 timeline 数据（从最新的 patients 状态获取）
  const timelineData = currentPatient?.timeline || []
  const hasTimelineData = timelineData.length > 0

  const getDisplayAISummary = () => {
    if (currentPatient?.aiSummary?.overall) {
      return String(currentPatient.aiSummary.overall)
    }
    if (String(currentPatient?.id) === 'current_patient' && aiSummary) {
      return aiSummary.replace(/^AI生成简要报告[：:]\s*/, '')
    }
    return generateAISummary(currentPatient)
  }

  const weekData = [
    { day: '一', height: 83 },
    { day: '二', height: 108 },
    { day: '三', height: 63 },
    { day: '四', height: 124 },
    { day: '五', height: 67 },
    { day: '六', height: 97 },
    { day: '七', height: 74 },
  ]

  const [activeFilter, setActiveFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  
  // 长按删除相关状态
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const longPressTimerRef = useRef(null)
  const longPressThreshold = 500 // 500ms 长按触发

  // 处理删除时间线条目
  const handleDeleteEntry = useCallback((entryId) => {
    if (!setPatients || !currentPatient) return
    
    const entry = timelineData.find(e => e.id === entryId)
    if (!entry) return
    
    setPatients(prev => prev.map(p => {
      if (p.id === currentPatient.id) {
        const newTimeline = p.timeline.filter(e => e.id !== entryId)
        // 同时更新入量/出量
        let newInMl = p.inMl
        let newOutMl = p.outMl
        let newUrinationCount = p.urinationCount
        
        if (entry.kind === 'intake') {
          newInMl = Math.max(0, p.inMl - (entry.valueMl || 0))
        } else if (entry.kind === 'output') {
          newOutMl = Math.max(0, p.outMl - (entry.valueMl || 0))
          newUrinationCount = Math.max(0, (p.urinationCount || 1) - 1)
        }
        
        return {
          ...p,
          timeline: newTimeline,
          inMl: newInMl,
          outMl: newOutMl,
          urinationCount: newUrinationCount
        }
      }
      return p
    }))
    
    setDeleteConfirmId(null)
  }, [setPatients, currentPatient, timelineData])

  // 长按开始
  const handleLongPressStart = useCallback((entryId) => {
    longPressTimerRef.current = setTimeout(() => {
      setDeleteConfirmId(entryId)
    }, longPressThreshold)
  }, [])

  // 长按结束
  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const safeParseDate = useCallback((value) => {
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
  }, [])

  const getTimeText = useCallback((item) => {
    if (item?.time) return String(item.time)
    const d = safeParseDate(item?.timestamp)
    if (!d) return ''
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }, [safeParseDate])

  const formatAgo = useCallback((date) => {
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
  }, [])

  const getPeriodLabel = useCallback((item) => {
    const d = safeParseDate(item?.timestamp) || safeParseDate(item?.time)
    if (!d) return ''
    const hour = d.getHours() + d.getMinutes() / 60
    if (hour >= 6 && hour < 10) return '早上'
    if (hour >= 10 && hour < 14) return '中午'
    if (hour >= 14 && hour < 18) return '下午'
    if (hour >= 18 && hour < 22) return '晚上'
    return ''
  }, [safeParseDate])

  const getSourceText = useCallback((source) => {
    if (source === 'water_dispenser') return '饮水机'
    if (source === 'camera') return '拍照上传'
    if (source === 'urinal') return '智能马桶'
    if (source === 'manual') return '手动'
    if (source === 'intake') return '摄入'
    if (source === 'output') return '排出'
    return ''
  }, [])

  const timelineItems = useMemo(
    () => timelineData.map((item) => {
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
    [formatAgo, getPeriodLabel, getSourceText, getTimeText, safeParseDate, timelineData]
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

  // 导出报告处理函数
  const handleExportReport = useCallback(() => {
    const html = generatePatientReportHTML(currentPatient, timelineData)
    // 同时打开报告窗口并触发打印；并下载 HTML 文件以便存档
    try {
      openReportWindowAndPrint(html)
      const safeName = (currentPatient?.name || 'patient').replace(/\s+/g,'_')
      const filename = `${safeName}_report_${new Date().toISOString().slice(0,10)}.html`
      downloadReportHTML(filename, html)
    } catch (e) {
      console.error('Export report failed', e)
    }
  }, [currentPatient, timelineData])

  return (
    <div className="patient-detail-page">
      {/* 顶部固定栏 Frame 711 */}
      <div className="pd-header">
        <div className="pd-header-content">
          <div className="pd-back-btn" onClick={onBack} style={{ cursor: 'pointer' }}>
            <img src={imgCaretCircleLeft} alt="返回" />
          </div>
          <div className="pd-header-title">
            <h1 className="pd-title">患者详情</h1>
          </div>
          <div
            className="pd-link-btn"
            onClick={handleExportReport}
            style={{ cursor: 'pointer' }}
            title="导出患者报告"
          >
            <img src={imgArrowUpRight} alt="导出报告" />
          </div>
        </div>
      </div>

      {/* 可滚动内容区 */}
      <div className="pd-scroll-content">
        {/* 患者基本信息卡片 - Frame764 */}
        <div className="pd-patient-card">
          <div className="pd-patient-info">
            <div className="pd-patient-avatar">
              <img src={imgPatientAvatar} alt="患者头像" />
            </div>
            <div className="pd-patient-details">
              <h2 className="pd-patient-name">{currentPatient?.name || '王叔叔'}</h2>
              <div className="pd-patient-meta">
                <p>{currentPatient?.fullName || '王叔叔-病床三'}</p>
                <p>{currentPatient?.metaFull || 'GFR Ⅰ期 60kg 依从性良好'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 水分球总览区 */}
        <div className="pd-summary">
          <div className="pd-ring-wrap">
            <WaterRingChart 
              intakePercent={intakeRatioPercent} 
              outputPercent={outputRatioPercent} 
              size={140}
              statusColor={statusInfo.color}
            />
            <div className="pd-particles">
              <DiagonalFlowParticles intakePercent={intakeRatioPercent} outputPercent={outputRatioPercent} baseCount={20} />
            </div>
          </div>

          <div className="pd-summary-right">
            <div className="pd-status-pill">
              <svg className="pd-status-dot" width="8" height="8" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="4" fill={statusInfo.color} />
              </svg>
              <div className="pd-status-text">{statusInfo.label}状态</div>
            </div>
            <div className="pd-ai-text">{getDisplayAISummary()}</div>

            <div className="pd-metrics">
              <div className="pd-metric-card">
                <div className="pd-metric-label">喝了</div>
                <div className="pd-metric-value">
                  <span className="pd-metric-number">{inMl}</span>
                  <span className="pd-metric-unit">ml</span>
                </div>
                <div className="pd-metric-sub">建议 {inMlMax} ml</div>
                <div className="pd-progress">
                  <div className="pd-progress-track pd-progress-track--blue">
                    <div className="pd-progress-fill pd-progress-fill--blue" style={{ width: `${inPercent}%` }} />
                  </div>
                </div>
              </div>

              <div className="pd-metric-card">
                <div className="pd-metric-label">排出</div>
                <div className="pd-metric-value">
                  <span className="pd-metric-number">{outMl}</span>
                  <span className="pd-metric-unit">ml</span>
                </div>
                <div className="pd-metric-sub">含活动估算</div>
                <div className="pd-progress">
                  <div className="pd-progress-track pd-progress-track--purple">
                    <div className="pd-progress-fill pd-progress-fill--purple" style={{ width: `${outPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 日志区域 - 使用家属端分析页样式 */}
        <div className="pd-timeline-card">
          <div className="pd-timeline-header">
            <div className="pd-timeline-title">
              <h3>日志</h3>
              <p>完全由设备自动记录，护工已经全部核对</p>
            </div>
            <div className="pd-timeline-filters">
              <div className="pd-filter-pills">
                <button
                  className={`pd-filter-pill ${activeFilter === 'all' ? 'pd-filter-pill--active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  全部
                </button>
                <button
                  className={`pd-filter-pill ${activeFilter === 'intake' ? 'pd-filter-pill--active' : ''}`}
                  onClick={() => setActiveFilter('intake')}
                >
                  摄入+
                </button>
                <button
                  className={`pd-filter-pill ${activeFilter === 'output' ? 'pd-filter-pill--active' : ''}`}
                  onClick={() => setActiveFilter('output')}
                >
                  排出-
                </button>
              </div>
              <div className="pd-filter-icons">
                <button
                  className={`pd-filter-icon pd-filter-icon--intake ${activeFilter === 'source:intake' ? 'pd-filter-icon--active' : ''}`}
                  onClick={() => setActiveFilter('source:intake')}
                >
                  <img src={imgDropHalfBottom} alt="摄入" />
                </button>
                <button
                  className={`pd-filter-icon pd-filter-icon--camera ${activeFilter === 'source:camera' ? 'pd-filter-icon--active' : ''}`}
                  onClick={() => setActiveFilter('source:camera')}
                >
                  <img src={imgCamera} alt="拍照" />
                </button>
                <button
                  className={`pd-filter-icon pd-filter-icon--output ${activeFilter === 'source:output' ? 'pd-filter-icon--active' : ''}`}
                  onClick={() => setActiveFilter('source:output')}
                >
                  <img src={imgApproximateEquals} alt="排出" />
                </button>
              </div>
            </div>
          </div>

          <div className="pd-timeline">
            <div className="pd-timeline-line" />
            {hasTimelineData ? (
              <AnimatePresence initial={false} mode="popLayout">
                {filteredTimeline.map((item) => {
                  const dotImg = item.kind === 'output' ? imgDotPurple : imgDotBlue
                  // 根据来源选择图标
                  const miniIcon =
                    item.source === 'manual'
                      ? imgPencil
                      : item.source === 'camera'
                        ? imgCamera
                        : (item.source === 'output' || item.source === 'urinal')
                          ? imgApproximateEquals
                          : imgDropHalfBottom
                  
                  // 构建时间显示文本
                  const timeDisplay = item.time

                  const valueClass = item.kind === 'output' ? 'pd-timeline-value--output' : 'pd-timeline-value--intake'
                  const isExpanded = expandedId === item.id
                  const isDeleting = deleteConfirmId === item.id

                  return (
                    <motion.div
                      key={item.id}
                      className={`pd-timeline-item ${isDeleting ? 'pd-timeline-item--deleting' : ''}`}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6, height: 0 }}
                      transition={{ duration: 0.18 }}
                  >
                    <img className="pd-timeline-dot" src={dotImg} alt="" />
                    <div className="pd-timeline-body">
                      <div
                        className={`pd-timeline-row ${item.expandable ? 'pd-timeline-row--clickable' : ''}`}
                        role={item.expandable ? 'button' : undefined}
                        tabIndex={item.expandable ? 0 : undefined}
                        onClick={() => {
                          if (isDeleting) return
                          handleRowClick(item)
                        }}
                        onKeyDown={(e) => {
                          if (!item.expandable) return
                          if (e.key === 'Enter' || e.key === ' ') handleRowClick(item)
                        }}
                        onMouseDown={() => handleLongPressStart(item.id)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(item.id)}
                        onTouchEnd={handleLongPressEnd}
                      >
                        <div className="pd-timeline-left">
                          <div className="pd-timeline-top">
                            <img className="pd-timeline-icon" src={miniIcon} alt="" />
                            <span className="pd-timeline-time">{timeDisplay}</span>
                          </div>
                          <div className="pd-timeline-title">{item.title}</div>
                          <div className="pd-timeline-ago">{item.ago}</div>
                        </div>
                        <div className={`pd-timeline-value ${valueClass}`}>{item.valueText}</div>
                      </div>

                      {/* 删除确认弹出 */}
                      <AnimatePresence>
                        {isDeleting && (
                          <motion.div
                            className="pd-delete-confirm"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.15 }}
                          >
                            <span>删除这条记录？</span>
                            <div className="pd-delete-actions">
                              <button 
                                className="pd-delete-btn pd-delete-btn--cancel"
                                onClick={() => setDeleteConfirmId(null)}
                              >
                                取消
                              </button>
                              <button 
                                className="pd-delete-btn pd-delete-btn--confirm"
                                onClick={() => handleDeleteEntry(item.id)}
                              >
                                删除
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence initial={false}>
                        {item.expandable && isExpanded && (
                          <motion.div
                            className="pd-expand-wrap"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                          >
                            <motion.div
                              className="pd-expand-content"
                              layout
                              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                            >
                              <div className="pd-expand-left">
                                <div className="pd-expand-thumb">
                                  <img src={item.imageUrl || imgFoodThumb} alt="" />
                                </div>
                                <div className="pd-expand-badge">{item.expand.confidence}</div>
                              </div>

                              <div className="pd-expand-right">
                                <div className="pd-observe-block">
                                  <div className="pd-observe-line" />
                                  <div className="pd-observe-text">
                                    <div className="pd-observe-h">系统观察</div>
                                    <div className="pd-observe-p">{item.expand.observe}</div>
                                  </div>
                                </div>

                                <div className="pd-risk-block">
                                  <div className="pd-risk-line" />
                                  <div className="pd-risk-text">
                                    <div className="pd-risk-h">风险推断</div>
                                    <div className="pd-risk-p">{item.expand.riskA}</div>
                                    <div className="pd-risk-p pd-risk-p--clamp">{item.expand.riskB}</div>
                                  </div>
                                </div>

                                <div className="pd-expand-sync">{item.expand.sync}</div>
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
            ) : (
              <div className="pd-timeline-empty">
                <div className="pd-empty-icon">📋</div>
                <div className="pd-empty-text">暂无日志记录</div>
                <div className="pd-empty-hint">等待设备数据或手动添加</div>
              </div>
            )}
          </div>
        </div>

        <div className="pd-time-node-wrap">
          <TimeNodeChart patientTimeline={timelineData} intakeGoalMl={inMlMax} outputGoalMl={outMlMax} />
        </div>

        {/* 周统计 */}
        <div className="pd-week-card">
          <div className="pd-week-header">
            <h3>周统计</h3>
            <p>平均：1093 mL</p>
          </div>
          <div className="pd-week-bars">
            {weekData.map((item, idx) => (
              <div key={idx} className="pd-week-bar-wrap">
                <div
                  className={`pd-week-bar ${idx === 3 ? 'pd-week-bar--active' : ''}`}
                  style={{ height: `${item.height}px` }}
                />
                <div className="pd-week-day">{item.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 活动与体重体液关联 */}
        <div className="pd-activity-card">
          <h3>活动与体重体液关联</h3>
          <div className="pd-activity-items">
            <div className="pd-activity-item">
              <span>上午活动</span>
              <span className="pd-activity-value">散步30分</span>
            </div>
            <div className="pd-activity-item">
              <span>排尿次数</span>
              <span className="pd-activity-value">{urinationCount}次</span>
            </div>
            <div className="pd-activity-item">
              <span>体温/血压</span>
              <span className="pd-activity-value">37.1℃ / 138/88</span>
            </div>
          </div>
        </div>

        {/* 底部两栏：尿液指标 + 依从性分析 */}
        <div className="pd-bottom-row">
          {/* 尿液指标 */}
          <div className="pd-urine-card">
            <div className="pd-urine-section">
              <div className="pd-urine-header">
                <h4>尿渗透压</h4>
                <span className="pd-urine-unit">Uosm</span>
              </div>
              <>
                <div className="pd-urine-value">{urineOsmolality ?? 0} mOsm/kg H₂O</div>
                <div className="pd-urine-progress">
                  <div className="pd-urine-track pd-urine-track--purple">
                    <div className="pd-urine-fill pd-urine-fill--purple" style={{ width: `${osmolalityPercent}%` }} />
                  </div>
                  <div className="pd-urine-labels">
                    <span>&lt;200 过低</span>
                    <span>&gt;1000 过高</span>
                  </div>
                </div>
              </>
            </div>

            <div className="pd-urine-section">
              <div className="pd-urine-header">
                <h4>尿比重</h4>
                <span className="pd-urine-unit">SG</span>
              </div>
              <>
                <div className="pd-urine-value pd-urine-value--blue">{(urineSpecificGravity ?? 0).toFixed(3)}</div>
                <div className="pd-urine-progress">
                  <div className="pd-urine-track pd-urine-track--blue">
                    <div className="pd-urine-fill pd-urine-fill--blue" style={{ width: `${specificGravityPercent}%` }} />
                  </div>
                  <div className="pd-urine-labels">
                    <span>&lt;1.005 过低</span>
                    <span>&gt;1.030 过高</span>
                  </div>
                </div>
              </>
            </div>
          </div>

          {/* 依从性分析 */}
          <div className="pd-compliance-card">
            <h4>依从性分析</h4>
            <div className="pd-radar-chart">
              <svg width="158" height="143" viewBox="0 0 158 143" fill="none">
                {/* 背景多边形网格 */}
                <polygon
                  points="79,11 122,44 122,99 79,132 36,99 36,44"
                  fill="none"
                  stroke="#E0E0E0"
                  strokeWidth="0.5"
                />
                <polygon
                  points="79,21 112,48 112,94 79,122 46,94 46,48"
                  fill="none"
                  stroke="#E0E0E0"
                  strokeWidth="0.5"
                />
                <polygon
                  points="79,31 102,54 102,89 79,112 56,89 56,54"
                  fill="none"
                  stroke="#E0E0E0"
                  strokeWidth="0.5"
                />
                <polygon
                  points="79,41 92,60 92,84 79,102 66,84 66,60"
                  fill="none"
                  stroke="#E0E0E0"
                  strokeWidth="0.5"
                />
                <polygon
                  points="79,51 82,66 82,79 79,92 76,79 76,66"
                  fill="none"
                  stroke="#E0E0E0"
                  strokeWidth="0.5"
                />
                {/* 数据区域 */}
                <polygon
                  points="79,18 115,50 108,103 75,125 48,91 55,42"
                  fill="rgba(45, 95, 255, 0.2)"
                  stroke="#2D5FFF"
                  strokeWidth="1.5"
                />
                {/* 轴线 */}
                <line x1="79" y1="71" x2="79" y2="11" stroke="#E0E0E0" strokeWidth="0.5" />
                <line x1="79" y1="71" x2="122" y2="44" stroke="#E0E0E0" strokeWidth="0.5" />
                <line x1="79" y1="71" x2="122" y2="99" stroke="#E0E0E0" strokeWidth="0.5" />
                <line x1="79" y1="71" x2="79" y2="132" stroke="#E0E0E0" strokeWidth="0.5" />
                <line x1="79" y1="71" x2="36" y2="99" stroke="#E0E0E0" strokeWidth="0.5" />
                <line x1="79" y1="71" x2="36" y2="44" stroke="#E0E0E0" strokeWidth="0.5" />
                {/* 标签 */}
                <text x="79" y="8" fontSize="6" fill="#121827" textAnchor="middle">
                  入量控制
                </text>
                <text x="130" y="48" fontSize="6" fill="#121827" textAnchor="start">
                  出量充足
                </text>
                <text x="130" y="103" fontSize="6" fill="#121827" textAnchor="start">
                  平衡稳定
                </text>
                <text x="79" y="141" fontSize="6" fill="#121827" textAnchor="middle">
                  饮食配合
                </text>
                <text x="20" y="103" fontSize="6" fill="#121827" textAnchor="end">
                  尿渗透压
                </text>
                <text x="20" y="48" fontSize="6" fill="#121827" textAnchor="end">
                  尿比重
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientDetailPage
