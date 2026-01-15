/**
 * 硬件数据 Hook
 * 用于从 userver.py 后端获取实时硬件数据
 * 
 * 使用方法：
 * const { latestData, dailyStats, isConnected, error } = useHardwareData()
 */

import { useState, useEffect, useCallback } from 'react'

// 后端 API 地址（从环境变量读取，默认为空表示不连接）
const API_URL = import.meta.env.VITE_USERVER_API_URL || ''

// 是否启用硬件数据（如果没有配置 API 地址，则不启用）
const ENABLED = !!API_URL

// 轮询间隔（毫秒）
const POLL_INTERVAL = 3000

/**
 * 硬件数据 Hook
 * @param {Object} options 配置选项
 * @param {boolean} options.autoRefresh 是否自动刷新（默认 true）
 * @param {number} options.interval 刷新间隔毫秒（默认 3000）
 */
export function useHardwareData(options = {}) {
  const { autoRefresh = true, interval = POLL_INTERVAL } = options

  // 状态
  const [latestData, setLatestData] = useState(null)
  const [dailyStats, setDailyStats] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  // 获取最新数据
  const fetchLatestData = useCallback(async () => {
    if (!ENABLED) return

    try {
      const response = await fetch(`${API_URL}/data/latest`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const json = await response.json()
        if (json.success !== false) {
          setLatestData(json.data || json)
          setIsConnected(true)
          setError(null)
          setLastUpdate(new Date())
        }
      } else if (response.status === 404) {
        // 暂无数据，但连接正常
        setIsConnected(true)
        setError(null)
      } else {
        setError(`HTTP ${response.status}`)
        setIsConnected(false)
      }
    } catch (err) {
      setError(err.message)
      setIsConnected(false)
    }
  }, [])

  // 获取每日统计
  const fetchDailyStats = useCallback(async () => {
    if (!ENABLED) return

    try {
      const response = await fetch(`${API_URL}/volume/daily`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const json = await response.json()
        if (json.success !== false) {
          setDailyStats(json.daily_stats || json)
        }
      }
    } catch (err) {
      // 静默失败，不影响主流程
      console.warn('[useHardwareData] 获取每日统计失败:', err.message)
    }
  }, [])

  // 手动刷新
  const refresh = useCallback(() => {
    fetchLatestData()
    fetchDailyStats()
  }, [fetchLatestData, fetchDailyStats])

  // 自动轮询
  useEffect(() => {
    if (!ENABLED || !autoRefresh) return

    // 首次加载
    refresh()

    // 定时轮询
    const timer = setInterval(refresh, interval)

    return () => clearInterval(timer)
  }, [autoRefresh, interval, refresh])

  return {
    // 数据
    latestData,
    dailyStats,
    
    // 状态
    isConnected,
    error,
    lastUpdate,
    
    // 方法
    refresh,
    
    // 配置
    enabled: ENABLED,
    apiUrl: API_URL,
  }
}

/**
 * 从硬件数据中提取尿量信息
 * @param {Object} latestData 最新数据
 * @returns {Object} { volume, colorName, colorStatus, timestamp }
 */
export function extractUrineInfo(latestData) {
  if (!latestData) return null

  const volumeAnalysis = latestData.analysis?.volume_analysis
  const colorAnalysis = latestData.analysis?.basic_analysis?.color_analysis

  return {
    volume: volumeAnalysis?.current_volume ?? 0,
    colorName: colorAnalysis?.color_name ?? '未知',
    colorStatus: colorAnalysis?.health_status ?? '未知',
    riskLevel: latestData.analysis?.basic_analysis?.risk_level ?? 'low',
    timestamp: latestData.timestamp,
  }
}

/**
 * 从每日统计中提取摘要
 * @param {Object} dailyStats 每日统计
 * @returns {Object} { totalVolume, eventCount, averageVolume }
 */
export function extractDailySummary(dailyStats) {
  if (!dailyStats) return null

  return {
    totalVolume: dailyStats.total_volume ?? 0,
    eventCount: dailyStats.event_count ?? 0,
    averageVolume: dailyStats.average_volume ?? 0,
    goalPercent: dailyStats.volume_percentage ?? 0,
  }
}

export default useHardwareData
