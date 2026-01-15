/**
 * 硬件数据显示组件
 * 显示从 userver.py 后端获取的实时数据
 * 
 * 使用方法：在任意页面中引入
 * import HardwareDataDisplay from './components/HardwareDataDisplay'
 * <HardwareDataDisplay />
 */

import React from 'react'
import { useHardwareData, extractUrineInfo, extractDailySummary } from '../hooks/useHardwareData'

function HardwareDataDisplay() {
  const { latestData, dailyStats, isConnected, error, lastUpdate, enabled, refresh } = useHardwareData()

  // 如果没有配置后端地址，不显示任何内容
  if (!enabled) {
    return null
  }

  const urineInfo = extractUrineInfo(latestData)
  const dailySummary = extractDailySummary(dailyStats)

  return (
    <div style={styles.container}>
      {/* 连接状态 */}
      <div style={styles.header}>
        <span style={{
          ...styles.statusDot,
          backgroundColor: isConnected ? '#46C761' : '#F43859'
        }} />
        <span style={styles.statusText}>
          {isConnected ? '硬件已连接' : '硬件未连接'}
        </span>
        <button onClick={refresh} style={styles.refreshBtn}>刷新</button>
      </div>

      {/* 错误信息 */}
      {error && (
        <div style={styles.error}>
          连接错误: {error}
        </div>
      )}

      {/* 最新数据 */}
      {urineInfo && (
        <div style={styles.dataSection}>
          <div style={styles.sectionTitle}>最新检测</div>
          <div style={styles.dataRow}>
            <span>尿量:</span>
            <span style={styles.value}>{urineInfo.volume} ml</span>
          </div>
          <div style={styles.dataRow}>
            <span>颜色:</span>
            <span style={styles.value}>{urineInfo.colorName}</span>
          </div>
          <div style={styles.dataRow}>
            <span>状态:</span>
            <span style={{
              ...styles.value,
              color: urineInfo.riskLevel === 'high' ? '#F43859' 
                   : urineInfo.riskLevel === 'medium' ? '#FA8534' 
                   : '#46C761'
            }}>
              {urineInfo.riskLevel === 'high' ? '高风险' 
               : urineInfo.riskLevel === 'medium' ? '中风险' 
               : '正常'}
            </span>
          </div>
        </div>
      )}

      {/* 每日统计 */}
      {dailySummary && (
        <div style={styles.dataSection}>
          <div style={styles.sectionTitle}>今日统计</div>
          <div style={styles.dataRow}>
            <span>总尿量:</span>
            <span style={styles.value}>{dailySummary.totalVolume} ml</span>
          </div>
          <div style={styles.dataRow}>
            <span>排尿次数:</span>
            <span style={styles.value}>{dailySummary.eventCount} 次</span>
          </div>
          <div style={styles.dataRow}>
            <span>平均尿量:</span>
            <span style={styles.value}>{dailySummary.averageVolume} ml</span>
          </div>
        </div>
      )}

      {/* 最后更新时间 */}
      {lastUpdate && (
        <div style={styles.footer}>
          更新于 {lastUpdate.toLocaleTimeString('zh-CN')}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    padding: '16px',
    margin: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '8px',
  },
  statusText: {
    fontSize: '14px',
    fontWeight: '500',
    flex: 1,
  },
  refreshBtn: {
    padding: '4px 12px',
    fontSize: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  error: {
    color: '#F43859',
    fontSize: '12px',
    marginBottom: '12px',
    padding: '8px',
    backgroundColor: '#FFF0F0',
    borderRadius: '4px',
  },
  dataSection: {
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
    fontWeight: '500',
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '4px',
  },
  value: {
    fontWeight: '600',
  },
  footer: {
    fontSize: '11px',
    color: '#999',
    textAlign: 'center',
    marginTop: '8px',
  },
}

export default HardwareDataDisplay
