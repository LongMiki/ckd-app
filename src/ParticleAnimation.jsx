import React, { useEffect, useState } from 'react'
import './ParticleAnimation.css'

function ParticleAnimation() {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    // 创建新粒子的函数
    const createParticle = () => {
      const particle = {
        id: Date.now() + Math.random(),
        x: -20, // 从界面左侧开始
        y: Math.random() * 300 + 100, // 随机Y位置
        size: Math.random() * 8 + 4, // 4-12px大小
        opacity: 1,
        speed: Math.random() * 2 + 1, // 1-3的速度
      }
      return particle
    }

    // 动画循环
    const animateParticles = () => {
      setParticles(prevParticles => {
        // 添加新粒子
        const newParticles = [...prevParticles]
        if (Math.random() < 0.3) { // 30%的概率创建新粒子
          newParticles.push(createParticle())
        }

        // 更新现有粒子
        return newParticles.map(particle => {
          const newX = particle.x + particle.speed
          const newOpacity = particle.opacity - 0.005 // 逐渐消散

          // 如果粒子到达水分球区域（大约x: 95-295, y: 100-400），加速消散
          const chartCenterX = 195 // 水分球中心X坐标
          const chartCenterY = 250 // 水分球中心Y坐标
          const distanceToCenter = Math.sqrt(
            Math.pow(newX - chartCenterX, 2) + Math.pow(particle.y - chartCenterY, 2)
          )

          let finalOpacity = newOpacity
          if (distanceToCenter < 120) { // 进入水分球范围
            finalOpacity = newOpacity - 0.02 // 加速消散
          }

          return {
            ...particle,
            x: newX,
            opacity: Math.max(0, finalOpacity) // 不小于0
          }
        }).filter(particle => particle.opacity > 0 && particle.x < 400) // 移除不可见的粒子
      })
    }

    // 启动动画循环
    const interval = setInterval(animateParticles, 16) // 约60fps

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="particle-animation">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            background: `radial-gradient(circle, rgba(73, 189, 216, ${particle.opacity}) 0%, rgba(73, 189, 216, ${particle.opacity * 0.5}) 70%, transparent 100%)`,
          }}
        />
      ))}
    </div>
  )
}

export default ParticleAnimation