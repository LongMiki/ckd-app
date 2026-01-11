import React from 'react';
import './RiskDoubleRing.css';

// 护工端首页风险排序专用双环组件
// - 外环（蓝色）：该时间段摄入量 / 时间段上限
// - 内环（紫色）：该时间段排出量 / 时间段上限
// - 中心圆点：使用状态颜色（严重/注意/正常）
// - 起点标记：外环和内环顶部（12点钟方向）各有一个白色小球标记起点
// - 警示线：6点钟方向红色线表示数值过多阈值
function RiskDoubleRing({ intakePercent = 0, outputPercent = 0, size = 64, centerColor = '#FF8A3B' }) {
  const clampedIntake = Math.max(0, Math.min(100, intakePercent));
  const clampedOutput = Math.max(0, Math.min(100, outputPercent));

  const strokeOuter = 5;
  const strokeInner = 5;

  const center = size / 2;
  const radiusOuter = center - strokeOuter / 2 - 1;
  const radiusInner = radiusOuter - 8;
  const centerDotRadius = radiusInner - strokeInner - 3;

  const circumferenceOuter = 2 * Math.PI * radiusOuter;
  const circumferenceInner = 2 * Math.PI * radiusInner;

  // 外圈：摄入量占比
  const dashOffsetOuter = circumferenceOuter * (1 - clampedIntake / 100);
  // 内圈：排出量占比
  const dashOffsetInner = circumferenceInner * (1 - clampedOutput / 100);

  // 起点位置（12点钟方向，固定不动）
  const outerStartX = center;
  const outerStartY = center - radiusOuter;
  const innerStartX = center;
  const innerStartY = center - radiusInner;

  return (
    <div className="risk-double-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 灰色起点指示线（从中心向12点钟方向） */}
        <line
          x1={center}
          y1={center}
          x2={center}
          y2={center - radiusOuter - strokeOuter / 2}
          stroke="#D1D5DB"
          strokeWidth="1"
        />
        
        {/* 红色警示线（从中心向6点钟方向）- 表示数值过少阈值（约50%） */}
        <line
          x1={center}
          y1={center}
          x2={center}
          y2={center + radiusOuter + strokeOuter / 2}
          stroke="#F43859"
          strokeWidth="1"
        />
        
        {/* 蓝色警示线（从中心向9点钟方向）- 表示数值过多阈值（约75%） */}
        <line
          x1={center}
          y1={center}
          x2={center - radiusOuter - strokeOuter / 2}
          y2={center}
          stroke="#3B82F6"
          strokeWidth="1"
        />
        
        <g transform={`rotate(-90 ${center} ${center})`}>
          {/* 外圈背景轨道 */}
          <circle
            className="risk-ring-track risk-ring-track--outer"
            cx={center}
            cy={center}
            r={radiusOuter}
            strokeWidth={strokeOuter}
          />
          {/* 外圈数值：摄入占比（蓝色） */}
          <circle
            className="risk-ring-value risk-ring-value--outer"
            cx={center}
            cy={center}
            r={radiusOuter}
            strokeWidth={strokeOuter}
            strokeDasharray={circumferenceOuter}
            strokeDashoffset={dashOffsetOuter}
            strokeLinecap="round"
          />

          {/* 内圈背景轨道 */}
          <circle
            className="risk-ring-track risk-ring-track--inner"
            cx={center}
            cy={center}
            r={radiusInner}
            strokeWidth={strokeInner}
          />
          {/* 内圈数值：排出占比（紫色） */}
          <circle
            className="risk-ring-value risk-ring-value--inner"
            cx={center}
            cy={center}
            r={radiusInner}
            strokeWidth={strokeInner}
            strokeDasharray={circumferenceInner}
            strokeDashoffset={dashOffsetInner}
            strokeLinecap="round"
          />
        </g>

        {/* 中心状态圆点 */}
        <circle
          className="risk-ring-center"
          cx={center}
          cy={center}
          r={centerDotRadius}
          style={{ fill: centerColor }}
        />

        {/* 外环起点白色小球（固定在12点钟方向） */}
        <circle
          cx={outerStartX}
          cy={outerStartY}
          r={3}
          fill="#FFFFFF"
          stroke="#3B82F6"
          strokeWidth="1"
        />

        {/* 内环起点白色小球（固定在12点钟方向） */}
        <circle
          cx={innerStartX}
          cy={innerStartY}
          r={2.5}
          fill="#FFFFFF"
          stroke="#8B5CF6"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

export default RiskDoubleRing;
