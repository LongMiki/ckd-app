// ============================================================
// CKD 水分管理系统 - 统一数据类型定义
// 后端开发请参照此文件设计 API 返回格式
// ============================================================

// ======================== 枚举类型 ========================

/** 患者状态（影响水分球颜色） */
export type PatientStatus = 'normal' | 'risk' | 'emergency'

/** 用户角色 */
export type UserRole = 'family' | 'caregiver'

/** 时间线条目类型 */
export type TimelineKind = 'intake' | 'output'

/** 数据来源设备 */
export type DataSource = 
  | 'water_dispenser'  // 饮水机
  | 'camera'           // 拍照模块
  | 'urinal'           // 智能尿壶
  | 'manual'           // 手动记录

/** GFR 分期（CKD 严重程度） */
export type GfrStage = 1 | 2 | 3 | 4 | 5 | null

/** GFR 分组（用于阈值查询） */
export type GfrGroup = 'normal' | 'gfr_1_2' | 'gfr_3' | 'gfr_4_5'

// ======================== 患者建档 ========================

/**
 * 患者建档信息
 * 前端表单提交 → 后端存储
 */
export interface PatientRegistration {
  patientName: string           // 患者名称
  age?: number | null           // 年龄（可选/可为 null）
  weight?: number | null        // 体重(kg)（可选/可为 null）
  isCKD?: boolean               // 是否 CKD 患者（可选）
  gfrStage?: GfrStage | null    // GFR 分期（非CKD为null 或可省略）
}

/**
 * 患者基础信息
 * 后端返回的完整患者信息
 */
export interface PatientBasicInfo extends PatientRegistration {
  id: string                    // 患者唯一ID
  createdAt?: string            // 建档时间 ISO8601（可选）
  updatedAt?: string | null     // 更新时间 ISO8601（可选/可为 null）

  // 根据 GFR 计算的阈值（后端可选返回，前端 normalize 可补齐）
  intakeLimit?: number | null   // 摄入上限(ml)
  outputLimit?: number | null   // 排出上限(ml)
  
  // 显示用（可选）
  avatar?: string               // 头像URL
  bedNumber?: string            // 床位号（护工端）
  compliance?: string           // 依从性，如"依从性良好"
}

// ======================== 患者当日数据 ========================

/**
 * 患者当日仪表盘数据
 * 后端聚合硬件数据后返回
 */
export interface PatientDashboard {
  patientId: string
  date: string                  // ISO 日期 '2026-01-10'
  updatedAt?: string            // 可选更新时间
  
  // ===== 摄入数据 =====
  totalIntake?: number | null           // 当日总摄入(ml) - 可能缺失
  intakeLimit?: number | null           // 摄入上限(ml)
  
  // ===== 排出数据 =====
  totalOutput?: number | null           // 当日总排出(ml) - 可能缺失
  outputLimit?: number | null           // 排出上限(ml)
  
  // ===== 尿液指标（来自智能尿壶）=====
  urineSpecificGravity?: number | null  // 尿比重 (可能未上报)
  urineOsmolality?: number | null       // 尿渗透压 (可能未上报)
  urinationCount?: number | null        // 排尿次数（可选）
  
  // ===== 计算指标 =====
  netIntake?: number | null             // 净入量 = totalIntake - totalOutput
  inOutRatio?: number | null            // 入出比
  
  // ===== 状态（后端根据阈值表判定）=====
  status?: PatientStatus
  
  // ===== AI 报告 =====
  aiSummary?: AIPatientSummary
  
  // ===== 时间线 =====
  timeline?: TimelineEntry[]
}

/**
 * AI 患者简略报告
 */
export interface AIPatientSummary {
  overall: string               // 整体描述，如"水分平衡，整体正常"
  intakeText: string            // 摄入描述，如"摄入量正常"
  outputText: string            // 排出描述，如"排出量偏少"
}

// ======================== 分时段数据 ========================

/**
 * 时间段定义
 */
export interface TimePeriod {
  start: number                 // 开始小时(24h)
  end: number                   // 结束小时(24h)
  limit: number                 // 该时段上限(ml)
  label: string                 // 显示标签
}

/**
 * 患者分时段数据
 * 用于时间节点图表
 */
export interface PatientPeriodData {
  patientId: string
  date: string
  
  // 各时段数据 { '8:00-11:00': { intake: 120, output: 100 }, ... }
  periods: Record<string, {
    intake: number
    output: number
    limit: number
  }>
  
  // 累计值（5个时间点）
  intakeCumulative: number[]    // [0, 120, 400, 550, 730]
  outputCumulative: number[]    // [0, 100, 300, 480, 630]
}

/**
 * 当前时间段数据
 * 用于风险排序双环
 */
export interface CurrentPeriodData {
  patientId: string
  periodLabel: string           // '17:00-20:00'
  periodLimit: number
  periodIntake: number
  periodOutput: number
  intakePercent: number         // 0-100
  outputPercent: number         // 0-100
}

// ======================== 时间线条目 ========================

/**
 * 时间线条目（统一结构）
 */
export interface TimelineEntry {
  id: string                    // 唯一ID
  patientId: string
  kind: TimelineKind            // 'intake' | 'output'
  source: DataSource            // 数据来源设备
  valueMl?: number | null               // 数值(ml)
  value?: number | null                 // 兼容字段（旧版可能使用 `value`）
  time?: string                  // 时间 '14:30'（可选）
  timestamp?: string             // ISO8601 完整时间戳（可选）
  timeAgo?: string               // 相对时间 '25分钟前'（可选）
  title?: string                 // 描述文本（可选）
  
  // ===== 拍照模块专有（source='camera'）=====
  imageUrl?: string
  aiRecognition?: AIFoodRecognition
  
  // ===== 尿壶专有（source='urinal'）=====
  urineColor?: string
  urineOsmolality?: number
  urineSpecificGravity?: number
  
  // ===== 手动记录专有 =====
  note?: string
}

/**
 * AI 食物识别结果
 */
export interface AIFoodRecognition {
  foodType: string              // 食物种类
  estimatedWater: number        // 估计水分(ml)
  confidence: number            // 置信度(0-100)
  hasRisk: boolean              // 是否有风险
  riskFactors: string[]         // 风险因素 ['钾含量偏高']
}

// ======================== 护工端数据 ========================

/**
 * 护工端仪表盘数据
 */
export interface CaregiverDashboard {
  caregiverId: string
  date: string
  updatedAt?: string            // 可选更新时间
  
  // ===== 患者统计 =====
  totalPatients: number
  emergencyCount: number        // 紧急人数
  riskCount: number             // 风险人数
  normalCount: number           // 正常人数
  needAttentionCount: number    // 需关注 = emergency + risk
  
  // ===== 护工整体状态（根据图2规则判定）=====
  overallStatus: PatientStatus
  
  // ===== 汇总数据 =====
  totalIntake?: number | null           // 所有患者总摄入（可选）
  totalIntakeLimit?: number | null
  totalOutput?: number | null           // 所有患者总排出（可选）
  totalOutputLimit?: number | null
  avgNetIntake?: number | null          // 平均净入量（可选）
  
  // ===== AI 整体报告 =====
  aiSummary?: AICaregiverSummary
  
  // ===== 患者列表 =====
  patients: PatientListItem[]
}

/**
 * AI 护工端整体报告
 */
export interface AICaregiverSummary {
  overall: string
  intakeAbnormal: { tooMuch: number; tooLittle: number }
  outputAbnormal: { tooMuch: number; tooLittle: number }
}

/**
 * 患者列表项（护工端用）
 */
export interface PatientListItem {
  id: string
  name?: string
  fullName?: string              // '王叔叔-病床三'
  avatar?: string
  gfrStage?: GfrStage | null
  gfrDisplay?: string            // 'GFR Ⅱ期'
  meta?: string                  // 'GFR Ⅱ期 70kg'
  createdAt?: string
  updatedAt?: string | null
  
  totalIntake?: number | null
  totalOutput?: number | null
  intakeLimit?: number | null
  outputLimit?: number | null
  status?: PatientStatus
  
  // 当前时段（风险排序用）
  currentPeriod: CurrentPeriodData
  
  timeline?: TimelineEntry[]
}

// ======================== API 请求/响应 ========================

/** 通用 API 响应（联合类型） */
export type ApiResponse<T> = 
  | { success: true; data: T; message?: string }
  | { success: false; error: { code: string; message: string; details?: unknown } }

/** 分页请求 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
