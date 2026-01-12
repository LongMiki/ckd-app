// ============================================================
// CKD 水分管理系统 - 统一导出入口
// ============================================================

// ========== 类型定义 ==========
export * from './types'

// ========== 阈值配置 ==========
export {
  getGfrGroup,
  LIMIT_CONFIG,
  PATIENT_THRESHOLDS,
  calculateCaregiverStatus,
  TIME_PERIODS,
  CUMULATIVE_LIMITS,
  getCurrentTimePeriod,
  GFR_ROMAN,
  STATUS_COLORS,
  STATUS_LABELS,
} from './thresholds'

// ========== Mock 数据 ==========
export {
  mockFamilyPatient,
  mockFamilyDashboard,
  mockFamilyTimeline,
  mockPatientList,
  mockCaregiverDashboard,
  mockPeriodData,
  generateTimelineWithAgo,
} from './mockData'

// ========== 兼容性工具 ==========
export { normalizeObject, normalizeTimelineEntries, validateTimelineEntry, validatePatientBasicInfo, safeGet } from './normalize'

// ========== 患者服务 ==========
export {
  USE_MOCK as PATIENT_USE_MOCK,
  getPatientBasicInfo,
  savePatientBasicInfo,
  getPatientDashboard,
  getPatientTimeline,
  addTimelineEntry,
  getPatientPeriodData,
  getCurrentPeriodDataForPatient,
} from './patientService'

// ========== 护工服务 ==========
export {
  USE_MOCK as CAREGIVER_USE_MOCK,
  getCaregiverDashboard,
  getPatientList,
  getNeedAttentionPatients,
  getPatientsSortedByRisk,
  getPatientDetail,
  getPatientStatusStats,
  batchUpdatePatientStatus,
} from './caregiverService'
