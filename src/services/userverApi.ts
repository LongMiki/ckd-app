// ============================================================
// CKD 水分管理系统 - userver.py 后端 API 服务
// 用于连接硬件数据采集后端，不修改 data 文件夹的任何内容
// ============================================================

// API 基础地址（从环境变量读取）
const USERVER_API_URL = import.meta.env.VITE_USERVER_API_URL || 'http://localhost:5000'

// 是否使用 Mock 数据
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// ========== 类型定义 ==========

/** userver 返回的尿液颜色分析 */
export interface UrineColorAnalysis {
  success: boolean
  color_name: string
  health_status: string
  clinical_meaning: string
  description: string
  rgb: string
  hsv_values: { h: number; s: number; v: number }
  recommendations: string[]
}

/** userver 返回的尿量统计 */
export interface VolumeStats {
  period_days: number
  total_volume: number
  event_count: number
  average_volume: number
  max_volume: number
  min_volume: number
  daily_goal: number
  normal_daily_range: string
  normal_single_range: string
}

/** userver 返回的每日统计 */
export interface DailyStats {
  date: string
  total_volume: number
  event_count: number
  average_volume: number
  frequency_hours: number
  max_volume: number
  min_volume: number
  volume_percentage: number
  goal_ml: number
}

/** userver 返回的最新数据 */
export interface LatestData {
  timestamp: string
  device_id: string
  parsed_data: Record<string, unknown>
  analysis: {
    basic_analysis: {
      risk_level: 'low' | 'medium' | 'high'
      risk_description: string
      key_findings: string[]
      recommendations: string[]
      color_analysis: UrineColorAnalysis
    }
    volume_analysis: {
      volume_status: string
      current_volume: number
      daily_stats: DailyStats
      alerts: string[]
    }
  }
  warnings: string[]
}

/** userver 返回的 AI 分析 */
export interface AIAnalysis {
  timestamp: string
  analysis_id: string
  text: string
  formatted_text: string
  summary: string
  response_time: number
  model_used: string
}

// ========== API 响应类型 ==========

interface ApiResponse<T> {
  success: boolean
  timestamp: string
  data?: T
  message?: string
  error?: string
}

// ========== 网络请求封装 ==========

async function fetchUserver<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  if (USE_MOCK) {
    console.log(`[userver] Mock 模式，跳过请求: ${endpoint}`)
    return { success: false, timestamp: new Date().toISOString(), message: 'Mock 模式已启用' }
  }

  try {
    const url = `${USERVER_API_URL}${endpoint}`
    console.log(`[userver] 请求: ${url}`)

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    })

    if (!response.ok) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const json = await response.json()
    return {
      success: json.success ?? true,
      timestamp: json.timestamp ?? new Date().toISOString(),
      data: json.data ?? json,
      message: json.message,
    }
  } catch (error) {
    console.error(`[userver] 请求失败:`, error)
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '网络请求失败',
    }
  }
}

// ========== API 方法 ==========

/**
 * 获取最新硬件数据
 */
export async function getLatestData(): Promise<ApiResponse<LatestData>> {
  return fetchUserver<LatestData>('/data/latest')
}

/**
 * 获取最新 AI 分析结果
 */
export async function getLatestAIAnalysis(): Promise<ApiResponse<AIAnalysis>> {
  return fetchUserver<AIAnalysis>('/ai/latest')
}

/**
 * 获取尿量统计
 * @param days 统计天数（默认1天，最多30天）
 */
export async function getVolumeStats(days: number = 1): Promise<ApiResponse<{ stats: VolumeStats; daily_details: DailyStats[]; events: unknown[] }>> {
  return fetchUserver(`/volume/stats?days=${Math.min(days, 30)}`)
}

/**
 * 获取每日尿量统计
 */
export async function getDailyVolume(): Promise<ApiResponse<{ daily_stats: DailyStats }>> {
  return fetchUserver('/volume/daily')
}

/**
 * 分析尿液颜色
 * @param rgb RGB 字符串，格式 "R,G,B"
 */
export async function analyzeColor(rgb: string): Promise<ApiResponse<{ analysis: UrineColorAnalysis }>> {
  return fetchUserver('/color/analyze', {
    method: 'POST',
    body: JSON.stringify({ rgb }),
  })
}

/**
 * 获取尿液颜色对照表
 */
export async function getColorChart(): Promise<ApiResponse<{ color_chart: Array<{ name: string; description: string; health_status: string }> }>> {
  return fetchUserver('/color/chart')
}

/**
 * 检查后端连接状态
 */
export async function checkConnection(): Promise<{ connected: boolean; message: string }> {
  if (USE_MOCK) {
    return { connected: false, message: 'Mock 模式已启用，未连接后端' }
  }

  try {
    const response = await fetch(`${USERVER_API_URL}/data/latest`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5秒超时
    })
    
    if (response.ok) {
      return { connected: true, message: `已连接到 ${USERVER_API_URL}` }
    } else {
      return { connected: false, message: `后端响应异常: ${response.status}` }
    }
  } catch (error) {
    return { connected: false, message: `无法连接到后端: ${error instanceof Error ? error.message : '未知错误'}` }
  }
}

// ========== 数据转换工具 ==========

/**
 * 将 userver 的尿量数据转换为前端 TimelineEntry 格式
 * 这样可以直接在前端时间线中显示硬件采集的数据
 */
export function convertToTimelineEntry(data: LatestData, patientId: string) {
  const volumeAnalysis = data.analysis?.volume_analysis
  const colorAnalysis = data.analysis?.basic_analysis?.color_analysis

  return {
    id: `hw_${Date.now()}`,
    patientId,
    kind: 'output' as const,
    source: 'urinal' as const,
    valueMl: volumeAnalysis?.current_volume ?? 0,
    timestamp: data.timestamp,
    time: new Date(data.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    title: `排尿 · ${colorAnalysis?.color_name ?? '颜色未知'}`,
    urineColor: colorAnalysis?.color_name,
    urineOsmolality: undefined, // userver 暂不提供
    urineSpecificGravity: undefined, // userver 暂不提供
  }
}

/**
 * 将 userver 的每日统计转换为前端 PatientDashboard 格式的部分字段
 */
export function convertToDashboardOutput(dailyStats: DailyStats) {
  return {
    totalOutput: dailyStats.total_volume,
    urinationCount: dailyStats.event_count,
    // 其他字段由前端 data 层提供
  }
}

// ========== 导出配置 ==========

export const userverConfig = {
  apiUrl: USERVER_API_URL,
  useMock: USE_MOCK,
}
