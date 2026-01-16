import React, { useState, useMemo } from 'react'
import './TimeNodeChart.css'

// 时间段配置
const TIME_PERIODS = [
  { start: 6, end: 10, label: '06:00' },
  { start: 10, end: 14, label: '10:00' },
  { start: 14, end: 18, label: '14:00' },
  { start: 18, end: 22, label: '18:00' },
  { end: 22, label: '22:00' },
]

const BASE_PERIOD_INTAKE = [450, 550, 550, 350]
const BASE_PERIOD_OUTPUT = [350, 450, 450, 350]
const BASE_TOTAL_INTAKE = BASE_PERIOD_INTAKE.reduce((s, x) => s + x, 0)
const BASE_TOTAL_OUTPUT = BASE_PERIOD_OUTPUT.reduce((s, x) => s + x, 0)

// 默认 Y 轴最小上限
const MIN_Y_MAX = 400

function TimeNodeChart({ 
  patientTimeline = [], 
  intakeData = null, // 可选：直接传入摄入数据 [0, 120, 280, 450, 600]
  outputData = null,  // 可选：直接传入排出数据 [0, 100, 250, 400, 550]
  intakeGoalMl = null,
  outputGoalMl = null
}) {
  const [activeMode, setActiveMode] = useState('intake') // 'intake' | 'output'

  // 基线参考：分时段上限（不累计、不缩放）
  const baselineLimits = useMemo(() => {
    const base = activeMode === 'intake' ? BASE_PERIOD_INTAKE : BASE_PERIOD_OUTPUT
    const p1 = Math.round(base[0] || 0)
    const p2 = Math.round(base[1] || 0)
    const p3 = Math.round(base[2] || 0)
    const p4 = Math.round(base[3] || 0)
    return [0, p1, p2, p3, p4]
  }, [activeMode, intakeGoalMl, outputGoalMl])

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
    // 优先 timestamp，其次 time
    const d = safeParseDate(entry?.timestamp) || safeParseDate(entry?.time)
    return d
  }

  const normalizeKind = (entry) => {
    if (entry?.kind === 'intake' || entry?.kind === 'output') return entry.kind
    // 兼容仅有 source 的情况
    if (entry?.source === 'intake' || entry?.source === 'output') return entry.source
    if (entry?.source === 'water_dispenser' || entry?.source === 'camera') return 'intake'
    if (entry?.source === 'urinal' || entry?.source === 'manual_entry') return 'output'
    // 兜底：根据标题/文案判断
    const title = String(entry?.title || '')
    const valueText = String(entry?.valueText || '')
    if (valueText.trim().startsWith('-')) return 'output'
    if (valueText.trim().startsWith('+')) return 'intake'
    if (title.includes('排') || title.includes('尿')) return 'output'
    if (
      title.includes('喝') ||
      title.includes('饮') ||
      title.includes('上传') ||
      title.includes('早餐') ||
      title.includes('午餐') ||
      title.includes('晚餐')
    ) return 'intake'
    return null
  }

  // 计算每个时间点的实际累计值
  const chartData = useMemo(() => {
    if (intakeData && outputData) {
      // 如果直接传入数据，使用传入的数据
      return {
        intake: intakeData,
        output: outputData
      }
    }

    const nodes = [
      { h: 6, m: 0 },
      { h: 10, m: 0 },
      { h: 14, m: 0 },
      { h: 18, m: 0 },
      { h: 22, m: 0 },
    ]

    const parsed = (patientTimeline || [])
      .map((e) => {
        const d = getEntryDate(e)
        const kind = normalizeKind(e)
        const raw = e?.valueMl ?? e?.value ?? 0
        const value = Math.round(Number(raw) || 0)
        return { ...e, __date: d, __value: value, __kind: kind }
      })
      .filter((e) => e.__date && !isNaN(e.__date.getTime()) && e.__kind)
      .sort((a, b) => a.__date.getTime() - b.__date.getTime())

    const dayBase = parsed[0]?.__date ? parsed[0].__date : new Date()
    const nodeDates = nodes.map(n => new Date(dayBase.getFullYear(), dayBase.getMonth(), dayBase.getDate(), n.h, n.m, 0, 0))

    const now = new Date()
    const lastVisibleNodeIndex = Math.max(
      0,
      nodeDates.reduce((acc, nd, idx) => (nd.getTime() <= now.getTime() ? idx : acc), 0)
    )

    const getPeriodIndex = (date) => {
      const hour = date.getHours() + date.getMinutes() / 60
      if (hour >= 6 && hour < 10) return 0
      if (hour >= 10 && hour < 14) return 1
      if (hour >= 14 && hour < 18) return 2
      if (hour >= 18 && hour < 22) return 3
      return null
    }

    const buildSeries = (kind) => {
      const byKind = parsed.filter(e => e.__kind === kind)
      const sums = [0, 0, 0, 0] // 每个时段的独立累计

      let lastEventPeriodIndex = null
      for (const e of byKind) {
        const pIdx = getPeriodIndex(e.__date)
        if (pIdx == null) continue
        sums[pIdx] += e.__value
        lastEventPeriodIndex = pIdx
      }

      // 没有任何事件：仅保留 06:00 的 0，其余不展示
      if (lastEventPeriodIndex == null) {
        return [0, null, null, null, null]
      }

      // 分时段曲线：节点 i(1..4) 对应该时段的量
      // 关键点：即使当前时间未到 22:00，只要 18-22 时段已有事件（如 19:45），也要渲染 22:00 节点
      const series = [0, sums[0], sums[1], sums[2], sums[3]]
      const lastEventNodeIndex = Math.min(4, Math.max(1, lastEventPeriodIndex + 1))
      for (let i = lastEventNodeIndex + 1; i < series.length; i++) series[i] = null
      return series
    }

    return {
      intake: buildSeries('intake'),
      output: buildSeries('output'),
    }
  }, [patientTimeline, intakeData, outputData])

  const yAxis = useMemo(() => {
    const baselineMax = Math.max(...baselineLimits.map(v => Number(v) || 0), 0)
    const maxActual = Math.max(
      ...((chartData?.intake || []).filter(v => v != null).map(v => Number(v) || 0)),
      ...((chartData?.output || []).filter(v => v != null).map(v => Number(v) || 0)),
      0
    )
    const rawMax = Math.max(MIN_Y_MAX, baselineMax, maxActual)
    // 使用 50ml 的粒度生成 9 条刻度线（8 段）
    const step = Math.max(50, Math.ceil(rawMax / 8 / 50) * 50)
    const maxY = step * 8
    const ticks = Array.from({ length: 9 }, (_, i) => maxY - i * step)
    return { maxY, ticks }
  }, [chartData, baselineLimits])

  // 图表尺寸配置 - 增加 padding 防止溢出
  const chartWidth = 280
  const chartHeight = 130
  const paddingX = 10  // 左右留白，让数据点不会溢出
  const paddingY = 8   // 上下留白

  // 计算 Y 值对应的像素位置
  const yScale = (value) => {
    const maxY = yAxis.maxY
    const v = Math.max(0, Math.min(maxY, Number(value) || 0))
    return paddingY + (chartHeight - 2 * paddingY) * (1 - v / maxY)
  }

  // 计算 X 值对应的像素位置（5个时间点均匀分布）
  const xScale = (index) => {
    return paddingX + (index / 4) * (chartWidth - 2 * paddingX)
  }

  // 生成实际数据曲线路径（平滑曲线）
  const generateCurvePath = (data) => {
    const usable = (data || []).filter(v => v != null)
    if (usable.length < 2) return ''

    // 只支持末尾为 null 的截断（用于“后续无数据则不显示”）
    const lastIdx = (() => {
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i] != null) return i
      }
      return -1
    })()
    if (lastIdx < 1) return ''
    const sliced = data.slice(0, lastIdx + 1)
    
    const points = sliced.map((value, idx) => ({
      x: xScale(idx),
      y: yScale(value)
    }))

    // 使用贝塞尔曲线生成平滑路径
    let path = `M ${points[0].x} ${points[0].y}`
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpx = (prev.x + curr.x) / 2
      path += ` Q ${cpx} ${prev.y}, ${cpx} ${(prev.y + curr.y) / 2}`
      path += ` Q ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
    }
    
    return path
  }

  // 生成填充区域路径
  const generateAreaPath = (data) => {
    const curvePath = generateCurvePath(data)
    if (!curvePath) return ''

    const lastIdx = (() => {
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i] != null) return i
      }
      return -1
    })()
    if (lastIdx < 0) return ''

    const lastX = xScale(lastIdx)
    const firstX = xScale(0)
    const bottomY = chartHeight - paddingY
    
    return `${curvePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
  }

  // 生成基线参考曲线路径
  const generateBaselinePath = () => {
    // 基线是阶梯式的：每个时间段有不同的上限
    // 简化为平滑曲线连接累计上限点
    const baselineData = baselineLimits.map(v => Math.min(v, yAxis.maxY))
    return generateCurvePath(baselineData)
  }

  // 生成基线填充区域
  const generateBaselineAreaPath = () => {
    const baselineData = baselineLimits.map(v => Math.min(v, yAxis.maxY))
    return generateAreaPath(baselineData)
  }

  // 当前模式的数据
  const currentData = activeMode === 'intake' ? chartData.intake : chartData.output

  // ... (rest of the code remains the same)
  const colors = activeMode === 'intake' 
    ? {
        bg: '#e9f0f9',
        primary: '#2D5FFF',
        gradient: ['rgba(45, 95, 255, 0.6)', 'rgba(45, 95, 255, 0.1)'],
        baseline: '#00E5C8',
        baselineGradient: ['rgba(0, 229, 200, 0.4)', 'rgba(0, 229, 200, 0.1)'],
        dot: '#2D5FFF',
        baselineDot: '#00E5C8'
      }
    : {
        bg: '#f4e9f9',
        primary: '#8848DB',
        gradient: ['rgba(136, 72, 219, 0.6)', 'rgba(136, 72, 219, 0.1)'],
        baseline: '#FF9EC4',
        baselineGradient: ['rgba(255, 158, 196, 0.4)', 'rgba(255, 158, 196, 0.1)'],
        dot: '#8848DB',
        baselineDot: '#FF9EC4'
      }

  return (
    <div className="time-node-chart" style={{ backgroundColor: colors.bg }}>
      {/* 标题和切换按钮 */}
      <div className="tnc-header">
        <h3 className="tnc-title">时间节点</h3>
        
        <div className="tnc-legend">
          <div className="tnc-legend-item">
            <span className="tnc-legend-dot" style={{ backgroundColor: colors.dot }} />
            <span className="tnc-legend-text">
              {activeMode === 'intake' ? '实际摄入(ml)' : '实际排出(ml)'}
            </span>
          </div>
          <div className="tnc-legend-item">
            <span className="tnc-legend-dot" style={{ backgroundColor: colors.baselineDot }} />
            <span className="tnc-legend-text">基线参考(ml)</span>
          </div>
        </div>

        <div className="tnc-toggle">
          <button 
            className={`tnc-toggle-btn ${activeMode === 'intake' ? 'tnc-toggle-btn--active-intake' : ''}`}
            onClick={() => setActiveMode('intake')}
          >
            摄入
          </button>
          <button 
            className={`tnc-toggle-btn ${activeMode === 'output' ? 'tnc-toggle-btn--active-output' : ''}`}
            onClick={() => setActiveMode('output')}
          >
            排出
          </button>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="tnc-chart-container">
        {/* Y轴刻度 */}
        <div className="tnc-y-axis">
          {yAxis.ticks.map((tick, idx) => (
            <span key={idx} className="tnc-y-tick">{tick}</span>
          ))}
        </div>

        {/* 图表主体 */}
        <div className="tnc-chart-body">
          <svg 
            className="tnc-svg" 
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* 实际数据渐变 */}
              <linearGradient id={`dataGradient-${activeMode}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.gradient[0]} />
                <stop offset="100%" stopColor={colors.gradient[1]} />
              </linearGradient>
              {/* 基线渐变 */}
              <linearGradient id={`baselineGradient-${activeMode}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.baselineGradient[0]} />
                <stop offset="100%" stopColor={colors.baselineGradient[1]} />
              </linearGradient>
            </defs>

            {/* 水平网格线 */}
            {yAxis.ticks.map((tick, idx) => (
              <line
                key={idx}
                x1="0"
                y1={yScale(tick)}
                x2={chartWidth}
                y2={yScale(tick)}
                className="tnc-grid-line"
              />
            ))}

            {/* 基线填充区域 */}
            <path
              d={generateBaselineAreaPath()}
              fill={`url(#baselineGradient-${activeMode})`}
              className="tnc-baseline-area"
            />

            {/* 实际数据填充区域 */}
            <path
              d={generateAreaPath(currentData)}
              fill={`url(#dataGradient-${activeMode})`}
              className="tnc-data-area"
            />

            {/* 基线曲线 */}
            <path
              d={generateBaselinePath()}
              fill="none"
              stroke={colors.baseline}
              strokeWidth="2"
              className="tnc-baseline-curve"
            />

            {/* 实际数据曲线 */}
            <path
              d={generateCurvePath(currentData)}
              fill="none"
              stroke={colors.primary}
              strokeWidth="2"
              className="tnc-data-curve"
            />

            {/* 基线数据点 */}
            {baselineLimits.map((value, idx) => (
              <circle
                key={`baseline-${idx}`}
                cx={xScale(idx)}
                cy={yScale(Math.min(value, yAxis.maxY))}
                r="4"
                fill="white"
                stroke={colors.baseline}
                strokeWidth="2"
                className="tnc-baseline-dot"
              />
            ))}

            {/* 实际数据点 */}
            {currentData.map((value, idx) => {
              if (value == null) return null
              return (
                <circle
                  key={`data-${idx}`}
                  cx={xScale(idx)}
                  cy={yScale(value)}
                  r="4"
                  fill="white"
                  stroke={colors.primary}
                  strokeWidth="2"
                  className="tnc-data-dot"
                />
              )
            })}
          </svg>
        </div>
      </div>

      {/* X轴时间标签 */}
      <div className="tnc-x-axis">
        {TIME_PERIODS.map((period, idx) => (
          <span key={idx} className="tnc-x-tick">{period.label}</span>
        ))}
      </div>
    </div>
  )
}

export default TimeNodeChart
