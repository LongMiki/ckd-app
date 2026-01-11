import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import './WaterRingChartMini.css'

/**
 * 迷你双轨径向进度图 - 患者卡片用
 * 
 * 设计说明：
 * - 外环（排出）：顺时针延伸，紫粉色渐变
 * - 内环（摄入）：逆时针延伸，青蓝色渐变
 * - 中间细圆环：表示完整的100%参考线
 * - 起始点在12点钟方向
 * - 中心绿色圆形显示核心数据
 * - 尺寸更小，字体更紧凑
 */
function WaterRingChartMini({ 
  intakePercent = 65,  // 总摄入百分比
  outputPercent = 35,  // 总排出百分比
  size = 90,
  uniqueId = '',  // 用于区分多个实例的唯一ID
  statusColor = '#46C761'  // 中心圆形颜色，默认安全绿色
}) {
  // 外环数据（排出）- 顺时针
  const outerData = useMemo(() => [
    { name: 'output', value: outputPercent },
    { name: 'empty', value: 100 - outputPercent }
  ], [outputPercent])

  // 内环数据（摄入）- 逆时针
  const innerData = useMemo(() => [
    { name: 'intake', value: intakePercent },
    { name: 'empty', value: 100 - intakePercent }
  ], [intakePercent])

  // 参考环数据 - 完整圆环
  const referenceData = useMemo(() => [
    { name: 'full', value: 100 }
  ], [])

  // 使用唯一ID避免多实例渐变冲突
  const outerGradientId = `outerGradientMini-${uniqueId}`
  const innerGradientId = `innerGradientMini-${uniqueId}`

  return (
    <div className="water-ring-chart-mini" style={{ width: size, height: size }}>
      {/* SVG 渐变定义 */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {/* 外环渐变 - 紫粉色 */}
          <linearGradient id={outerGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="50%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#F472B6" />
          </linearGradient>
          {/* 内环渐变 - 青蓝色 */}
          <linearGradient id={innerGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </svg>

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* 外环背景轨道 */}
          <Pie
            data={referenceData}
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            startAngle={0}
            endAngle={360}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="rgba(255, 255, 255, 0.08)" />
          </Pie>

          {/* 外环 - 排出（顺时针） */}
          <Pie
            data={outerData}
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
            cornerRadius={6}
          >
            <Cell fill={`url(#${outerGradientId})`} />
            <Cell fill="transparent" />
          </Pie>

          {/* 中间参考细圆环 */}
          <Pie
            data={referenceData}
            cx="50%"
            cy="50%"
            innerRadius="68.5%"
            outerRadius="69.5%"
            startAngle={0}
            endAngle={360}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="rgba(255, 255, 255, 0.2)" />
          </Pie>

          {/* 内环背景轨道 */}
          <Pie
            data={referenceData}
            cx="50%"
            cy="50%"
            innerRadius="50%"
            outerRadius="68%"
            startAngle={0}
            endAngle={360}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="rgba(255, 255, 255, 0.08)" />
          </Pie>

          {/* 内环 - 摄入（逆时针） */}
          <Pie
            data={innerData}
            cx="50%"
            cy="50%"
            innerRadius="50%"
            outerRadius="68%"
            startAngle={90}
            endAngle={450}
            dataKey="value"
            stroke="none"
            cornerRadius={6}
          >
            <Cell fill={`url(#${innerGradientId})`} />
            <Cell fill="transparent" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* 中心绿色圆形 + 数据标签 */}
      <div className="water-ring-center-mini">
        <div 
          className="water-ring-center-circle-mini"
          style={{
            '--status-gradient': `linear-gradient(145deg, ${statusColor}E6 0%, ${statusColor}CC 50%, ${statusColor}B3 100%)`,
            '--status-shadow': `rgba(${parseInt(statusColor.slice(1, 3), 16)}, ${parseInt(statusColor.slice(3, 5), 16)}, ${parseInt(statusColor.slice(5, 7), 16)}, 0.35)`
          }}
        >
          <div className="water-ring-labels-mini">
            {/* 摄入量 - 左上，右对齐 */}
            <div className="water-ring-label-intake-mini">
              <div className="water-ring-value-wrapper-mini">
                <span className="water-ring-value-mini">{intakePercent}</span>
                <span className="water-ring-percent-mini">%</span>
              </div>
              <span className="water-ring-text-mini">摄入量</span>
            </div>
            {/* 排出量 - 右下，左对齐 */}
            <div className="water-ring-label-output-mini">
              <span className="water-ring-text-mini">排出量</span>
              <div className="water-ring-value-wrapper-mini">
                <span className="water-ring-value-mini">{outputPercent}</span>
                <span className="water-ring-percent-mini">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WaterRingChartMini
