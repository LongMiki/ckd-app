import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import './FlowParticles.css'

/**
 * 流动粒子组件 - 表现摄入到排出的视觉流程
 * 
 * @param {string} direction - 'left' (摄入方向，从左向右进入) 或 'right' (排出方向，从中心向右飘散)
 * @param {number} percentage - 占比百分比，用于动态计算粒子数量
 * @param {number} baseCount - 基础粒子数量（100%时的数量）
 */
function FlowParticles({ direction = 'left', percentage = 50, baseCount = 24 }) {
  // 根据占比计算实际粒子数量，最少8个，最多baseCount个
  const particleCount = Math.max(8, Math.round(baseCount * percentage / 100))

  // 生成粒子配置
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const size = Math.random() * 10 + 3 // 3-13px，更大的尺寸范围
      const delay = Math.random() * 4 // 0-4s 延迟，更分散
      const duration = Math.random() * 2.5 + 2.5 // 2.5-5s 动画时长
      const yOffset = (Math.random() - 0.5) * 120 // -60 to 60px 垂直偏移，更大范围
      const opacity = Math.random() * 0.5 + 0.3 // 0.3-0.8 透明度
      // 分层分布，让粒子在不同深度
      const layer = Math.floor(Math.random() * 3) // 0, 1, 2 三层
      
      return {
        id: i,
        size,
        delay,
        duration,
        yOffset,
        opacity,
        layer,
        // 随机初始位置，覆盖更大的垂直范围
        initialY: 15 + Math.random() * 70, // 15%-85% 垂直位置
        // 水平起始偏移
        initialX: Math.random() * 30,
      }
    })
  }, [particleCount])

  // 左侧粒子：从屏幕左侧向右飘入（摄入）
  // 右侧粒子：从中心向右飘出（排出）
  const isLeft = direction === 'left'

  return (
    <div className={`flow-particles flow-particles-${direction}`}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`flow-particle ${isLeft ? 'particle-intake' : 'particle-output'} layer-${particle.layer}`}
          style={{
            width: particle.size,
            height: particle.size,
            top: `${particle.initialY}%`,
            left: isLeft ? `${particle.initialX}%` : 'auto',
            right: isLeft ? 'auto' : `${particle.initialX}%`,
            zIndex: particle.layer,
          }}
          initial={{
            x: isLeft ? -30 - particle.initialX : 0,
            y: 0,
            opacity: 0,
            scale: isLeft ? 0.3 : 1,
          }}
          animate={{
            x: isLeft 
              ? [null, 60 + particle.layer * 20, 100 + particle.layer * 15] 
              : [null, 40 + particle.layer * 15, 90 + particle.layer * 20],
            y: [null, particle.yOffset * 0.4, particle.yOffset * 0.8],
            opacity: [0, particle.opacity, particle.opacity * 0.6, 0],
            scale: isLeft 
              ? [0.3, 0.8 + particle.layer * 0.1, 0.6] 
              : [1, 0.7, 0.2],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            repeatDelay: Math.random() * 1.5 + 0.5,
            ease: 'easeInOut',
            times: [0, 0.4, 0.7, 1],
          }}
        />
      ))}
      
      {/* 装饰性光晕 */}
      <motion.div 
        className={`flow-glow ${isLeft ? 'glow-intake' : 'glow-output'}`}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}

export default FlowParticles
