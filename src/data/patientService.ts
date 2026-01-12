// ============================================================
// CKD 水分管理系统 - 患者服务层
// 提供 Mock / API 切换能力
// ============================================================

import type {
  PatientBasicInfo,
  PatientDashboard,
  PatientPeriodData,
  TimelineEntry,
  CurrentPeriodData,
  ApiResponse,
} from './types'
import {
  mockFamilyPatient,
  mockFamilyDashboard,
  mockFamilyTimeline,
  mockPeriodData,
} from './mockData'
import normalize from './normalize'
import { getCurrentTimePeriod } from './thresholds'

// ========== 配置开关 ==========
// 改为 false 即可切换到真实 API
export const USE_MOCK = true

// API 基础路径
const API_BASE = '/api/v1'

// ========== 网络请求封装 ==========

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        // 可添加 Authorization header
      },
      ...options,
    })
    
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: response.statusText,
        },
      }
    }
    
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : '网络请求失败',
      },
    }
  }
}

// ========== Mock 延迟模拟 ==========

function mockDelay<T>(data: T, ms = 200): Promise<ApiResponse<T>> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ success: true, data })
    }, ms)
  })
}

// ========== 患者基础信息 ==========

/**
 * 获取患者基础信息
 * 家属端：获取建档时填写的患者信息
 */
export async function getPatientBasicInfo(patientId: string): Promise<ApiResponse<PatientBasicInfo>> {
  if (USE_MOCK) {
    // Mock: 从 localStorage 读取（家属端建档数据）
    const raw = localStorage.getItem('patientData')
    if (raw) {
      try {
        const storedRaw = JSON.parse(raw)
        const stored = normalize.normalizeObject(storedRaw)
        const patient: PatientBasicInfo = {
          id: stored.id || 'family_patient',
          patientName: stored.patientName ?? stored.patient_name ?? '未命名',
          age: stored.age ?? null,
          weight: stored.weight ?? null,
          isCKD: stored.isCKD ?? stored.is_ckd_patient ?? true,
          gfrStage: stored.gfrStage ?? stored.gfr_stage ?? null,
          createdAt: stored.createdAt ?? stored._display?.timestamp_cn ?? new Date().toISOString(),
          updatedAt: stored.updatedAt ?? undefined,
          intakeLimit: getIntakeLimitByGfr(stored.gfrStage ?? stored.gfr_stage ?? null),
          outputLimit: getOutputLimitByGfr(stored.gfrStage ?? stored.gfr_stage ?? null),
        }
        return mockDelay(patient)
      } catch {
        return mockDelay(mockFamilyPatient)
      }
    }
    const normalized = normalize.normalizeObject(mockFamilyPatient) as PatientBasicInfo
    // ensure limits computed from gfr if missing
    normalized.intakeLimit = normalized.intakeLimit ?? getIntakeLimitByGfr(normalized.gfrStage ?? null)
    normalized.outputLimit = normalized.outputLimit ?? getOutputLimitByGfr(normalized.gfrStage ?? null)
    return mockDelay(normalized)
  }
  
  return fetchApi<PatientBasicInfo>(`/patients/${patientId}`)
}

/**
 * 保存/更新患者基础信息
 */
export async function savePatientBasicInfo(patient: PatientBasicInfo): Promise<ApiResponse<PatientBasicInfo>> {
  if (USE_MOCK) {
    // Mock: 存入 localStorage
    const stored = {
      id: patient.id,
      user_type: 'family',
      patient_name: patient.patientName,
      age: patient.age,
      weight: patient.weight,
      is_ckd_patient: patient.isCKD,
      gfr_stage: patient.gfrStage,
      _display: {
        timestamp_cn: new Date().toLocaleString('zh-CN'),
      },
    }
    localStorage.setItem('patientData', JSON.stringify(stored))
    return mockDelay(patient)
  }
  
  return fetchApi<PatientBasicInfo>(`/patients/${patient.id}`, {
    method: 'PUT',
    body: JSON.stringify(patient),
  })
}

// ========== 患者仪表盘 ==========

/**
 * 获取患者当日仪表盘数据
 */
export async function getPatientDashboard(
  patientId: string,
  date?: string
): Promise<ApiResponse<PatientDashboard>> {
  if (USE_MOCK) {
    // 从 localStorage 读取 timeline 数据计算
    const raw = localStorage.getItem('timelineData')
    if (raw) {
      try {
        const timelineRaw: any[] = JSON.parse(raw)
        const timeline: TimelineEntry[] = normalize.normalizeTimelineEntries(timelineRaw)
        const dashboard = calculateDashboardFromTimeline(patientId, timeline)
        return mockDelay(dashboard)
      } catch {
        const normalized = normalize.normalizeObject(mockFamilyDashboard)
        normalized.timeline = normalize.normalizeTimelineEntries(normalized.timeline || [])
        return mockDelay(normalized)
      }
    }
    const normalized = normalize.normalizeObject(mockFamilyDashboard)
    normalized.timeline = normalize.normalizeTimelineEntries(normalized.timeline || [])
    return mockDelay(normalized)
  }
  
  const dateParam = date || new Date().toISOString().split('T')[0]
  return fetchApi<PatientDashboard>(`/patients/${patientId}/dashboard?date=${dateParam}`)
}

// ========== 时间线 ==========

/**
 * 获取患者时间线数据
 */
export async function getPatientTimeline(
  patientId: string,
  date?: string
): Promise<ApiResponse<TimelineEntry[]>> {
  if (USE_MOCK) {
    const raw = localStorage.getItem('timelineData')
    if (raw) {
      try {
        const timelineRaw: any[] = JSON.parse(raw)
        const timeline: TimelineEntry[] = normalize.normalizeTimelineEntries(timelineRaw)
        return mockDelay(timeline.filter(t => t.patientId === patientId))
      } catch {
        return mockDelay(normalize.normalizeTimelineEntries(mockFamilyTimeline).filter(t => t.patientId === patientId))
      }
    }
    return mockDelay(normalize.normalizeTimelineEntries(mockFamilyTimeline).filter(t => t.patientId === patientId))
  }
  
  const dateParam = date || new Date().toISOString().split('T')[0]
  return fetchApi<TimelineEntry[]>(`/patients/${patientId}/timeline?date=${dateParam}`)
}

/**
 * 添加时间线条目（入量/出量）
 */
export async function addTimelineEntry(entry: Omit<TimelineEntry, 'id'>): Promise<ApiResponse<TimelineEntry>> {
  if (USE_MOCK) {
    const rawNew = {
      ...entry,
      id: `tl_${Date.now()}`,
      valueMl: (entry as any).valueMl ?? (entry as any).value ?? 0,
      timestamp: (entry as any).timestamp ?? new Date().toISOString(),
    }
    const newEntry: TimelineEntry = normalize.normalizeTimelineEntries([rawNew])[0]
    
    // 更新 localStorage
    const raw = localStorage.getItem('timelineData')
    const timelineRaw: any[] = raw ? JSON.parse(raw) : []
    const timeline: TimelineEntry[] = normalize.normalizeTimelineEntries(timelineRaw)
    timeline.push(newEntry)
    localStorage.setItem('timelineData', JSON.stringify(timeline))
    
    return mockDelay(newEntry)
  }
  
  return fetchApi<TimelineEntry>('/timeline', {
    method: 'POST',
    body: JSON.stringify(entry),
  })
}

// ========== 分时段数据 ==========

/**
 * 获取患者分时段数据
 */
export async function getPatientPeriodData(
  patientId: string,
  date?: string
): Promise<ApiResponse<PatientPeriodData>> {
  if (USE_MOCK) {
    return mockDelay(mockPeriodData)
  }
  
  const dateParam = date || new Date().toISOString().split('T')[0]
  return fetchApi<PatientPeriodData>(`/patients/${patientId}/periods?date=${dateParam}`)
}

/**
 * 获取当前时段数据
 */
export async function getCurrentPeriodDataForPatient(
  patientId: string
): Promise<ApiResponse<CurrentPeriodData>> {
  if (USE_MOCK) {
    const currentPeriod = getCurrentTimePeriod()
    const periodLabel = currentPeriod.label
    
    return mockDelay({
      patientId,
      periodLabel,
      periodLimit: currentPeriod.limit,
      periodIntake: mockPeriodData.periods[periodLabel]?.intake || 0,
      periodOutput: mockPeriodData.periods[periodLabel]?.output || 0,
      intakePercent: 60,
      outputPercent: 40,
    })
  }
  
  return fetchApi<CurrentPeriodData>(`/patients/${patientId}/current-period`)
}

// ========== 工具函数 ==========

function getIntakeLimitByGfr(gfrStage: number | null): number {
  if (!gfrStage) return 2400
  if (gfrStage <= 2) return 2200
  if (gfrStage === 3) return 2000
  return 1500
}

function getOutputLimitByGfr(gfrStage: number | null): number {
  if (!gfrStage) return 2000
  if (gfrStage <= 2) return 1800
  if (gfrStage === 3) return 1600
  return 1000
}

function calculateDashboardFromTimeline(
  patientId: string,
  timeline: TimelineEntry[]
): PatientDashboard {
  const patientTimeline = timeline.filter(t => t.patientId === patientId)
  
  const totalIntake = patientTimeline
    .filter(t => t.kind === 'intake')
    .reduce((sum, t) => sum + ((t as any).valueMl ?? (t as any).value ?? 0), 0)
  
  const totalOutput = patientTimeline
    .filter(t => t.kind === 'output')
    .reduce((sum, t) => sum + ((t as any).valueMl ?? (t as any).value ?? 0), 0)
  
  return {
    patientId,
    date: new Date().toISOString().split('T')[0],
    totalIntake,
    intakeLimit: 2200,
    totalOutput,
    outputLimit: 1800,
    urineSpecificGravity: 1.015,
    urineOsmolality: 450,
    urinationCount: patientTimeline.filter(t => t.kind === 'output').length,
    netIntake: totalIntake - totalOutput,
    inOutRatio: totalOutput > 0 ? totalIntake / totalOutput : 0,
    status: 'normal',
    aiSummary: {
      overall: '水分管理正常',
      intakeText: '摄入量适中',
      outputText: '排出正常',
    },
    timeline: patientTimeline,
  }
}
