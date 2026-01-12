// ============================================================
// CKD 水分管理系统 - 护工服务层
// 提供 Mock / API 切换能力
// ============================================================

import type {
  CaregiverDashboard,
  PatientListItem,
  PatientStatus,
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
} from './types'
import {
  mockCaregiverDashboard,
  mockPatientList,
} from './mockData'
import normalize from './normalize'
import { calculateCaregiverStatus } from './thresholds'

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

// ========== 护工仪表盘 ==========

/**
 * 获取护工端仪表盘数据
 * 包含所有患者概览、状态统计、AI 摘要
 */
export async function getCaregiverDashboard(
  caregiverId: string,
  date?: string
): Promise<ApiResponse<CaregiverDashboard>> {
  if (USE_MOCK) {
    // 根据患者状态重新计算护工整体状态
    const emergencyCount = mockPatientList.filter(p => p.status === 'emergency').length
    const riskCount = mockPatientList.filter(p => p.status === 'risk').length
    const overallStatus = calculateCaregiverStatus(emergencyCount, riskCount)
    
    const normalizedPatients = mockPatientList.map(p => normalize.normalizeObject(p))
    const normalizedDashboard = normalize.normalizeObject({
      ...mockCaregiverDashboard,
      overallStatus,
      emergencyCount,
      riskCount,
      normalCount: mockPatientList.length - emergencyCount - riskCount,
    })
    normalizedDashboard.patients = normalizedPatients
    return mockDelay(normalizedDashboard)
  }
  
  const dateParam = date || new Date().toISOString().split('T')[0]
  return fetchApi<CaregiverDashboard>(`/caregiver/${caregiverId}/dashboard?date=${dateParam}`)
}

// ========== 患者列表 ==========

/**
 * 获取护工负责的患者列表
 */
export async function getPatientList(
  caregiverId: string,
  params?: PaginationParams & { status?: PatientStatus }
): Promise<ApiResponse<PaginatedResponse<PatientListItem>>> {
  if (USE_MOCK) {
    let filtered = [...mockPatientList]
    
    // 状态过滤
    if (params?.status) {
      filtered = filtered.filter(p => p.status === params.status)
    }
    
    // 分页
    const page = params?.page || 1
    const pageSize = params?.pageSize || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paged = filtered.slice(start, end)
    const normalizedPaged = paged.map(p => normalize.normalizeObject(p))
    
    return mockDelay({
      items: normalizedPaged,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    })
  }
  
  const queryParams = new URLSearchParams()
  if (params?.page) queryParams.set('page', String(params.page))
  if (params?.pageSize) queryParams.set('pageSize', String(params.pageSize))
  if (params?.status) queryParams.set('status', params.status)
  
  return fetchApi<PaginatedResponse<PatientListItem>>(
    `/caregiver/${caregiverId}/patients?${queryParams}`
  )
}

/**
 * 获取需要关注的患者（紧急 + 风险）
 */
export async function getNeedAttentionPatients(
  caregiverId: string
): Promise<ApiResponse<PatientListItem[]>> {
  if (USE_MOCK) {
    const attention = mockPatientList.filter(
      p => p.status === 'emergency' || p.status === 'risk'
    ).map(p => normalize.normalizeObject(p))
    return mockDelay(attention)
  }
  
  return fetchApi<PatientListItem[]>(`/caregiver/${caregiverId}/patients/attention`)
}

/**
 * 按风险排序获取患者列表
 * 排序规则：紧急 > 风险 > 正常，同状态按净摄入量降序
 */
export async function getPatientsSortedByRisk(
  caregiverId: string
): Promise<ApiResponse<PatientListItem[]>> {
  if (USE_MOCK) {
    const statusOrder: Record<PatientStatus, number> = {
      emergency: 0,
      risk: 1,
      normal: 2,
    }

    const sorted = [...mockPatientList].sort((a, b) => {
      // 先按状态排序，status 可能为 undefined，使用默认 'normal'
      const aStatus = (a.status ?? 'normal') as PatientStatus
      const bStatus = (b.status ?? 'normal') as PatientStatus
      const statusDiff = statusOrder[aStatus] - statusOrder[bStatus]
      if (statusDiff !== 0) return statusDiff

      // 同状态按净摄入量降序，数值可能为 null/undefined，使用 0 作为兜底
      const aNet = (a.totalIntake ?? 0) - (a.totalOutput ?? 0)
      const bNet = (b.totalIntake ?? 0) - (b.totalOutput ?? 0)
      return bNet - aNet
    })

    return mockDelay(sorted.map(p => normalize.normalizeObject(p)))
  }
  
  return fetchApi<PatientListItem[]>(`/caregiver/${caregiverId}/patients/sorted-by-risk`)
}

// ========== 患者详情 ==========

/**
 * 获取单个患者详情（护工端）
 */
export async function getPatientDetail(
  patientId: string
): Promise<ApiResponse<PatientListItem>> {
  if (USE_MOCK) {
    const patient = mockPatientList.find(p => p.id === patientId)
    if (patient) {
      return mockDelay(normalize.normalizeObject(patient))
    }
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: '患者不存在' },
    }
  }
  
  return fetchApi<PatientListItem>(`/patients/${patientId}/detail`)
}

// ========== 状态统计 ==========

/**
 * 获取患者状态统计
 */
export async function getPatientStatusStats(
  caregiverId: string
): Promise<ApiResponse<{
  total: number
  emergency: number
  risk: number
  normal: number
  overallStatus: PatientStatus
}>> {
  if (USE_MOCK) {
    const emergency = mockPatientList.filter(p => p.status === 'emergency').length
    const risk = mockPatientList.filter(p => p.status === 'risk').length
    const normal = mockPatientList.filter(p => p.status === 'normal').length
    
    return mockDelay({
      total: mockPatientList.length,
      emergency,
      risk,
      normal,
      overallStatus: calculateCaregiverStatus(emergency, risk),
    })
  }
  
  return fetchApi(`/caregiver/${caregiverId}/stats`)
}

// ========== 批量操作 ==========

/**
 * 批量更新患者状态（如确认已处理）
 */
export async function batchUpdatePatientStatus(
  patientIds: string[],
  status: PatientStatus
): Promise<ApiResponse<{ updated: number }>> {
  if (USE_MOCK) {
    // Mock: 仅模拟成功响应
    return mockDelay({ updated: patientIds.length })
  }
  
  return fetchApi('/patients/batch-status', {
    method: 'PUT',
    body: JSON.stringify({ patientIds, status }),
  })
}
