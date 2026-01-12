import React, { useState, useMemo } from 'react'
import './TimeNodeChart.css'

// 时间段配置 - 与 WaterManagement 保持一致
const TIME_PERIODS = [
  { start: 8, end: 11, limit: 300, label: '08:00' },
  { start: 11, end: 14, limit: 400, label: '11:00' },
  { start: 14, end: 17, limit: 300, label: '14:00' },
  { start: 17, end: 20, limit: 300, label: '17:00' },
  { end: 20, label: '20:00' } // 最后一个时间点
]

// 累计上限：每个时间点的累计摄入/排出上限
// 08:00: 0, 11:00: 300, 14:00: 700, 17:00: 1000, 20:00: 1300
const CUMULATIVE_LIMITS = [0, 300, 700, 1000, 1300]

// Y轴刻度
const Y_TICKS = [400, 350, 300, 250, 200, 150, 100, 50, 0]

function TimeNodeChart({ 
  patientTimeline = [], 
  intakeData = null, // 可选：直接传入摄入数据 [0, 120, 280, 450, 600]
  outputData = null  // 可选：直接传入排出数据 [0, 100, 250, 400, 550]
}) {
  const [activeMode, setActiveMode] = useState('intake') // 'intake' | 'output'

  // 计算每个时间点的实际累计值
  const chartData = useMemo(() => {
    if (intakeData && outputData) {
      // 如果直接传入数据，使用传入的数据
      return {
        intake: intakeData,
        output: outputData
      }
    }

    // 从 timeline 计算每个时间段结束时的累计值
    const intakeByPeriod = [0, 0, 0, 0, 0] // 5个时间点的累计摄入
    const outputByPeriod = [0, 0, 0, 0, 0] // 5个时间点的累计排出

    let cumulativeIntake = 0
    let cumulativeOutput = 0

    // 解析时间字符串为小时数
    const parseTimeToHour = (timeStr) => {
      if (!timeStr) return 0
      const [h] = timeStr.split(':').map(Number)
      return h
    }

    // 按时间排序 timeline
    const sortedTimeline = [...patientTimeline].sort((a, b) => {
      const hourA = parseTimeToHour(a.time)
      const hourB = parseTimeToHour(b.time)
      return hourA - hourB
    })

    // 遍历 timeline，累计到对应时间段
    sortedTimeline.forEach(entry => {
      const hour = parseTimeToHour(entry.time)
      const value = entry.valueMl ?? 0

      if (entry.kind === 'intake') {
        cumulativeIntake += value
      } else if (entry.kind === 'output') {
        cumulativeOutput += value
      }

      // 更新对应时间点之后的所有累计值
      TIME_PERIODS.forEach((period, idx) => {
        if (idx === 0) return // 08:00 时间点始终为 0
        const periodEndHour = period.start || TIME_PERIODS[idx - 1]?.end || 8
        if (hour < periodEndHour) {
          // 这个条目在该时间点之前，更新该时间点的值
        }
      })
    })

    // 简化：根据当前小时计算每个时间点的累计值
    const now = new Date()
    const currentHour = now.getHours()

    // 模拟数据：基于 timeline 生成每个时间点的累计值
    let runningIntake = 0
    let runningOutput = 0

    TIME_PERIODS.forEach((period, idx) => {
      if (idx === 0) {
        intakeByPeriod[0] = 0
        outputByPeriod[0] = 0
        return
      }

      const periodStart = TIME_PERIODS[idx - 1].start
      const periodEnd = period.start || TIME_PERIODS[idx - 1].end

      // 统计该时间段内的所有条目
      sortedTimeline.forEach(entry => {
        const hour = parseTimeToHour(entry.time)
        if (hour >= periodStart && hour < periodEnd) {
          if (entry.kind === 'intake') {
            runningIntake += entry.valueMl ?? 0
          } else if (entry.kind === 'output') {
            runningOutput += entry.valueMl ?? 0
          }
        }
      })

      intakeByPeriod[idx] = runningIntake
      outputByPeriod[idx] = runningOutput
    })

    return {
      intake: intakeByPeriod,
      output: outputByPeriod
    }
  }, [patientTimeline, intakeData, outputData])

  // 图表尺寸配置 - 增加 padding 防止溢出
  const chartWidth = 280
  const chartHeight = 130
  const paddingX = 10  // 左右留白，让数据点不会溢出
  const paddingY = 8   // 上下留白

  // 计算 Y 值对应的像素位置
  const yScale = (value) => {
    const maxY = 400
    return paddingY + (chartHeight - 2 * paddingY) * (1 - value / maxY)
  }

  // 计算 X 值对应的像素位置（5个时间点均匀分布）
  const xScale = (index) => {
    return paddingX + (index / 4) * (chartWidth - 2 * paddingX)
  }

  // 生成实际数据曲线路径（平滑曲线）
  const generateCurvePath = (data) => {
    if (data.length < 2) return ''
    
    const points = data.map((value, idx) => ({
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
    
    const lastX = xScale(data.length - 1)
    const firstX = xScale(0)
    const bottomY = chartHeight - paddingY
    
    return `${curvePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
  }

  // 生成基线参考曲线路径
  const generateBaselinePath = () => {
    // 基线是阶梯式的：每个时间段有不同的上限
    // 简化为平滑曲线连接累计上限点
    const baselineData = CUMULATIVE_LIMITS.map(v => Math.min(v, 400)) // 限制在Y轴范围内
    return generateCurvePath(baselineData)
  }

  // 生成基线填充区域
  const generateBaselineAreaPath = () => {
    const baselineData = CUMULATIVE_LIMITS.map(v => Math.min(v, 400))
    return generateAreaPath(baselineData)
  }

  // 当前模式的数据
  const currentData = activeMode === 'intake' ? chartData.intake : chartData.output
  
  // 颜色配置
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
          {Y_TICKS.map((tick, idx) => (
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
            {Y_TICKS.map((tick, idx) => (
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
            {CUMULATIVE_LIMITS.map((value, idx) => (
              <circle
                key={`baseline-${idx}`}
                cx={xScale(idx)}
                cy={yScale(Math.min(value, 400))}
                r="4"
                fill="white"
                stroke={colors.baseline}
                strokeWidth="2"
                className="tnc-baseline-dot"
              />
            ))}

            {/* 实际数据点 */}
            {currentData.map((value, idx) => (
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
            ))}
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
