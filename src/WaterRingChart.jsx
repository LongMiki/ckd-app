import React, { useMemo, useState, useEffect } from 'react'
import './WaterRingChart.css'

// Dynamically load recharts to reduce initial bundle size
function useRecharts() {
  const [mod, setMod] = useState(null)
  useEffect(() => {
    let mounted = true
    import('recharts').then(m => { if (mounted) setMod(m) }).catch(() => {})
    return () => { mounted = false }
  }, [])
  return mod
}

/**
 * 双轨径向进度图 - 护工端水分球组件
 * 
 * 设计说明：
 * - 外环（排出）：顺时针延伸，紫粉色渐变
 * - 内环（摄入）：逆时针延伸，青蓝色渐变
 * - 中间细圆环：表示完整的100%参考线
 * - 起始点在12点钟方向
 * - 中心绿色圆形显示核心数据
 */
function WaterRingChart({ 
  intakePercent = 65,  // 总摄入百分比
  outputPercent = 35,  // 总排出百分比
  size = 200,
  statusColor = '#46C761'  // 中心圆形颜色，默认安全绿色
}) {
  const Recharts = useRecharts()
  // 重要：所有 hooks（包括 useRecharts 自身内部的 hooks）必须在组件的同一顺序调用
  // 即使 Recharts 尚未加载，也要在渲染路径上保持 hooks 顺序一致。
  // 下面先计算与渲染无关的 memoized 数据，然后再判断 Recharts 是否可用并渲染占位或真实图表。

  // 外环数据（排出）- 顺时针
  const outerData = useMemo(() => [
    { name: 'output', value: outputPercent },
    { name: 'empty', value: 100 - outputPercent }
  ], [outputPercent])

  // 内环数据（摄入）- 逆时针（通过反向数据实现）
  const innerData = useMemo(() => [
    { name: 'intake', value: intakePercent },
    { name: 'empty', value: 100 - intakePercent }
  ], [intakePercent])

  // 参考环数据 - 完整圆环
  const referenceData = useMemo(() => [
    { name: 'full', value: 100 }
  ], [])

  if (!Recharts) {
    // 占位元素：保持尺寸一致但不执行任何 Recharts 渲染，这样 hooks 的数量与顺序保持稳定
    return <div style={{ width: size, height: size }} />
  }

  const { PieChart, Pie, Cell, ResponsiveContainer } = Recharts

  // 渐变色定义
  const outerGradientId = 'outerGradient'
  const innerGradientId = 'innerGradient'

  return (
    <div className="water-ring-chart" style={{ width: size, height: size }}>
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

      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          {/* 外环背景轨道 - 淡色完整圆环 */}
          <Pie
            data={referenceData}
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="92%"
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
            innerRadius="72%"
            outerRadius="92%"
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
            cornerRadius={10}
          >
            <Cell fill={`url(#${outerGradientId})`} />
            <Cell fill="transparent" />
          </Pie>

          {/* 内环背景轨道 - 淡色完整圆环，紧贴外环 */}
          <Pie
            data={referenceData}
            cx="50%"
            cy="50%"
            innerRadius="52%"
            outerRadius="72%"
            startAngle={0}
            endAngle={360}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="rgba(255, 255, 255, 0.08)" />
          </Pie>

          {/* 内环 - 摄入（逆时针，通过反向角度实现） */}
          <Pie
            data={innerData}
            cx="50%"
            cy="50%"
            innerRadius="52%"
            outerRadius="72%"
            startAngle={90}
            endAngle={450}
            dataKey="value"
            stroke="none"
            cornerRadius={10}
          >
            <Cell fill={`url(#${innerGradientId})`} />
            <Cell fill="transparent" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* 中心绿色圆形 + 数据标签 */}
      <div className="water-ring-center">
        <div 
          className="water-ring-center-circle"
          style={{
            '--status-gradient': `linear-gradient(145deg, ${statusColor}E6 0%, ${statusColor}CC 50%, ${statusColor}B3 100%)`,
            '--status-shadow': `rgba(${parseInt(statusColor.slice(1, 3), 16)}, ${parseInt(statusColor.slice(3, 5), 16)}, ${parseInt(statusColor.slice(5, 7), 16)}, 0.4)`
          }}
        >
          {/* 数据标签区域 - 严格按照 Figma 1530:1116 布局 */}
          <div className="water-ring-labels">
            {/* 摄入量 - 左上，右对齐 */}
            <div className="water-ring-label-intake">
              <div className="water-ring-value-wrapper">
                <span className="water-ring-value">{intakePercent}</span>
                <span className="water-ring-percent">%</span>
              </div>
              <span className="water-ring-text">摄入量</span>
            </div>
            {/* 排出量 - 右下，左对齐 */}
            <div className="water-ring-label-output">
              <span className="water-ring-text">排出量</span>
              <div className="water-ring-value-wrapper">
                <span className="water-ring-value">{outputPercent}</span>
                <span className="water-ring-percent">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WaterRingChart
