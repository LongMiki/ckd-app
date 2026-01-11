import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import './DiagonalFlowParticles.css'

/**
 * 对角线流动粒子组件 - 家属端专用
 * 粒子从左下角流向右上角，经过球心
 * 
 * @param {number} intakePercent - 摄入占比，用于计算摄入粒子数量
 * @param {number} outputPercent - 排出占比，用于计算排出粒子数量
 * @param {number} baseCount - 基础粒子数量
 */
function DiagonalFlowParticles({ intakePercent = 65, outputPercent = 35, baseCount = 20 }) {
  // 根据占比计算粒子数量
  const intakeCount = Math.max(6, Math.round(baseCount * intakePercent / 100))
  const outputCount = Math.max(6, Math.round(baseCount * outputPercent / 100))

  // 生成摄入粒子（左下 → 球心）
  const intakeParticles = useMemo(() => {
    return Array.from({ length: intakeCount }, (_, i) => {
      const size = Math.random() * 8 + 4 // 4-12px
      const delay = Math.random() * 3 // 0-3s 延迟
      const duration = Math.random() * 1.5 + 2 // 2-3.5s 动画时长
      const layer = Math.floor(Math.random() * 3)
      
      return {
        id: `intake-${i}`,
        type: 'intake',
        size,
        delay,
        duration,
        layer,
        // 起点：左下区域
        startX: Math.random() * 40,
        startY: 60 + Math.random() * 40,
        // 终点：球心附近
        endX: 40 + Math.random() * 20,
        endY: 40 + Math.random() * 20,
      }
    })
  }, [intakeCount])

  // 生成排出粒子（球心 → 右上）
  const outputParticles = useMemo(() => {
    return Array.from({ length: outputCount }, (_, i) => {
      const size = Math.random() * 8 + 4
      const delay = Math.random() * 3
      const duration = Math.random() * 1.5 + 2
      const layer = Math.floor(Math.random() * 3)
      
      return {
        id: `output-${i}`,
        type: 'output',
        size,
        delay,
        duration,
        layer,
        // 起点：球心附近
        startX: 40 + Math.random() * 20,
        startY: 40 + Math.random() * 20,
        // 终点：右上区域
        endX: 60 + Math.random() * 40,
        endY: Math.random() * 40,
      }
    })
  }, [outputCount])

  const allParticles = [...intakeParticles, ...outputParticles]

  return (
    <div className="diagonal-flow-particles">
      {allParticles.map((particle) => {
        const isIntake = particle.type === 'intake'
        return (
          <motion.div
            key={particle.id}
            className={`diagonal-particle ${isIntake ? 'diagonal-particle--intake' : 'diagonal-particle--output'} layer-${particle.layer}`}
            style={{
              width: particle.size,
              height: particle.size,
            }}
            initial={{
              left: `${particle.startX}%`,
              top: `${particle.startY}%`,
              opacity: 0,
              scale: 0.3,
            }}
            animate={{
              left: [`${particle.startX}%`, `${particle.endX}%`],
              top: [`${particle.startY}%`, `${particle.endY}%`],
              opacity: [0, 0.8, 0.7, 0],
              scale: [0.3, 1, 0.8, 0.2],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              repeatDelay: Math.random() * 1 + 0.5,
              ease: 'easeInOut',
              times: [0, 0.3, 0.7, 1],
            }}
          />
        )
      })}
    </div>
  )
}

export default DiagonalFlowParticles
