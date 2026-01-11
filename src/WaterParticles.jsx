import React, { useEffect, useState, useMemo } from 'react'
import { motion, useAnimation } from 'framer-motion'
import './WaterParticles.css'

/**
 * 水分粒子动画 - 护工端水分球区域粒子效果
 * 
 * @param {number} intakePercent - 摄入占比（0-100），用于计算粒子数量
 * @param {number} outputPercent - 排出占比（0-100），用于计算粒子数量
 * @param {number} baseCount - 基础粒子数量（100%时的数量），默认20
 */
function WaterParticles({ intakePercent = 65, outputPercent = 35, baseCount = 20 }) {
  const [particles, setParticles] = useState([])
  const controls = useAnimation()

  // 根据占比动态计算粒子数量
  const maxParticles = useMemo(() => {
    // 总粒子数 = baseCount * (摄入占比 + 排出占比) / 100
    // 因为总占比是100%，所以 = baseCount
    // 但为了体现摄入/排出的动态变化，使用平均占比的倍数
    const avgPercent = (intakePercent + outputPercent) / 2
    return Math.max(8, Math.round(baseCount * avgPercent / 100))
  }, [intakePercent, outputPercent, baseCount])

  useEffect(() => {
    // 生成更复杂的初始粒子
    const initialParticles = Array.from({ length: maxParticles }, (_, i) => ({
      id: i,
      x: 600 + Math.random() * 120, // 从右侧随机位置开始
      y: 140 + Math.random() * 120, // 在水分球区域随机Y位置
      scale: 0.1 + Math.random() * 0.8, // 更宽范围的大小
      opacity: 0,
      delay: Math.random() * 4, // 更长的随机延迟
      rotation: Math.random() * 360, // 初始旋转
      hue: 190 + Math.random() * 40, // 青蓝色调变化
    }))

    setParticles(initialParticles)

    // 定期生成新粒子，带有更复杂的属性
    const interval = setInterval(() => {
      setParticles(prev => {
        const newParticle = {
          id: Date.now(),
          x: 600 + Math.random() * 120,
          y: 140 + Math.random() * 120,
          scale: 0.1 + Math.random() * 0.8,
          opacity: 0,
          delay: Math.random() * 3,
          rotation: Math.random() * 360,
          hue: 190 + Math.random() * 40,
        }
        // 保持粒子数量在maxParticles-1之间
        return [...prev.slice(-(maxParticles - 1)), newParticle]
      })
    }, 800) // 更频繁地生成

    return () => clearInterval(interval)
  }, [maxParticles])

  return (
    <div className="water-particles">
      {particles.map((particle, index) => (
        <motion.div
          key={particle.id}
          className="water-particle"
          initial={{
            x: particle.x - 650,
            y: particle.y - 260,
            scale: particle.scale,
            opacity: particle.opacity,
            rotate: particle.rotation,
          }}
          animate={{
            x: [
              particle.x - 650,
              particle.x - 700,
              particle.x - 770,
              particle.x - 850,
              particle.x - 930,
              particle.x - 1010,
              particle.x - 1100,
              particle.x - 1200,
            ],
            y: [
              particle.y - 260,
              (particle.y + Math.sin(index * 0.5) * 15) - 260,
              (particle.y + Math.cos(index * 0.3) * 20) - 260,
              (particle.y + Math.sin(index * 0.7) * 25) - 260,
              (particle.y + Math.cos(index * 0.4) * 15) - 260,
              (particle.y + Math.sin(index * 0.6) * 10) - 260,
              (particle.y + Math.cos(index * 0.8) * 5) - 260,
              (particle.y + Math.sin(index * 0.2) * 8) - 260,
            ],
            scale: [
              particle.scale,
              particle.scale * 1.3, // 在group121放大
              particle.scale * 1.8, // 在水分球最大
              particle.scale * 1.4, // 在group122缩小
              particle.scale * 0.6, // 流出时变小
              particle.scale * 0.2,
              0,
            ],
            opacity: [
              0,
              0.4, // 淡入
              0.8, // 在group121半透明
              1, // 在水分球最亮
              0.7, // 在group122
              0.3, // 流出时变淡
              0,
            ],
            rotate: [
              particle.rotation,
              particle.rotation + 45, // 轻微旋转
              particle.rotation + 90, // 在水分球旋转
              particle.rotation + 135, // 在group122
              particle.rotation + 180, // 流出时
              particle.rotation + 225,
              particle.rotation + 270,
            ],
          }}
          transition={{
            duration: 6 + Math.random() * 3, // 更长的持续时间6-9秒
            delay: particle.delay,
            ease: [0.25, 0.46, 0.45, 0.94], // 自定义贝塞尔曲线，更自然的缓动
            times: [0, 0.15, 0.3, 0.5, 0.7, 0.85, 0.95, 1], // 更精细的时间控制
            repeat: Infinity,
            repeatDelay: 2 + Math.random() * 3, // 更长的重复延迟
          }}
          style={{
            background: `radial-gradient(circle,
              hsla(${particle.hue}, 85%, 65%, 0.9) 0%,
              hsla(${particle.hue}, 75%, 55%, 0.7) 30%,
              hsla(${particle.hue}, 65%, 45%, 0.4) 60%,
              hsla(${particle.hue}, 55%, 35%, 0.2) 80%,
              transparent 100%)`,
            borderRadius: '50%',
            position: 'absolute',
            width: '24px',
            height: '24px',
            pointerEvents: 'none',
            boxShadow: `0 0 8px hsla(${particle.hue}, 70%, 50%, 0.3),
                       inset 0 0 4px hsla(${particle.hue}, 90%, 70%, 0.5)`,
            filter: 'blur(0.5px)', // 轻微模糊增加深度
          }}
        />
      ))}
    </div>
  )
}

export default WaterParticles