// ============================================================
// CKD 水分管理系统 - 阈值配置表
// 基于临床指标判定患者状态
// ============================================================

import type { GfrStage, GfrGroup, PatientStatus } from './types'

// ======================== GFR 分组映射 ========================

export function getGfrGroup(gfrStage: GfrStage): GfrGroup {
  if (gfrStage === null) return 'normal'
  if (gfrStage <= 2) return 'gfr_1_2'
  if (gfrStage === 3) return 'gfr_3'
  return 'gfr_4_5'
}

// ======================== 基础阈值配置 ========================

/**
 * 摄入/排出上限配置（单位：ml）
 * 用于计算患者每日目标
 */
export const LIMIT_CONFIG: Record<GfrGroup, { intakeLimit: number; outputLimit: number }> = {
  normal:   { intakeLimit: 2400, outputLimit: 2000 },
  gfr_1_2:  { intakeLimit: 2200, outputLimit: 1800 },
  gfr_3:    { intakeLimit: 2000, outputLimit: 1600 },
  gfr_4_5:  { intakeLimit: 1500, outputLimit: 1000 },
}

// ======================== 患者状态判定阈值表 ========================

/**
 * 患者状态判定阈值
 * 对应 Excel 表格中的指标定义
 * 
 * 判定规则：任一指标触发 Emergency 则为 Emergency
 *          否则任一指标触发 Risk 则为 Risk
 *          否则为 Normal
 * 
 * 注意：阈值范围应覆盖所有可能值，避免空隙
 * - normal: 理想范围
 * - risk: 需要关注的范围  
 * - emergency: 需要立即处理的范围
 */
export const PATIENT_THRESHOLDS: Record<GfrGroup, PatientThresholdConfig> = {
  // 无 CKD（正常人）
  normal: {
    // 24小时尿量 (ml): <800危急, 800-1500风险, >1500正常
    urine24h: { normal: [1500, Infinity], risk: [800, 1500], emergency: [0, 800] },
    // 单次尿量 (ml): <50危急, 50-200风险, 200-400正常
    singleUrine: { normal: [200, 400], risk: [50, 200], emergency: [0, 50] },
    // 每日摄入 (ml): <800危急, 800-1700风险, 1700-2200正常
    dailyIntake: { normal: [1700, 2200], risk: [800, 1700], emergency: [0, 800] },
    // 净入量 (ml): >500危急, 0-500或<-500风险, -500~0正常
    netIntake: { normal: [-500, 0], risk: [0, 500], emergency: [500, Infinity] },
    // 入出比: <0.5危急, 0.5-0.7风险, 0.7-0.9正常
    inOutRatio: { normal: [0.7, 0.9], risk: [0.5, 0.7], emergency: [0, 0.5] },
    // 尿比重: >1.030危急, 1.020-1.030风险, 1.010-1.020正常
    urineSpecificGravity: { normal: [1.010, 1.020], risk: [1.020, 1.030], emergency: [1.030, Infinity] },
    // 尿渗透压 (mOsm/kg): >900危急, 600-900风险, 300-600正常
    urineOsmolality: { normal: [300, 600], risk: [600, 900], emergency: [900, Infinity] },
    // 24小时体重变化 (%): <-3或>3危急, -3~-1或1~3风险, -1~1正常
    weightChange24h: { normal: [-1, 1], risk: [1, 3], emergency: [3, Infinity] },
    // 无饮水无尿时长 (小时): >12危急, 6-12风险, 0-6正常
    noDrinkNoUrineHours: { normal: [0, 6], risk: [6, 12], emergency: [12, Infinity] },
  },
  
  // GFR 1-2 期
  gfr_1_2: {
    urine24h: { normal: [800, 2000], risk: [400, 800], emergency: [0, 400] },
    singleUrine: { normal: [100, 300], risk: [50, 100], emergency: [0, 50] },
    dailyIntake: { normal: [1200, 2200], risk: [800, 1200], emergency: [0, 800] },
    netIntake: { normal: [-500, 500], risk: [500, 1000], emergency: [1000, Infinity] },
    inOutRatio: { normal: [0.8, 1.2], risk: [0.6, 0.8], emergency: [0, 0.6] },
    urineSpecificGravity: { normal: [1.010, 1.020], risk: [1.020, 1.030], emergency: [1.030, Infinity] },
    urineOsmolality: { normal: [300, 700], risk: [200, 300], emergency: [0, 200] },
    weightChange24h: { normal: [-1, 1], risk: [1, 2], emergency: [2, Infinity] },
    noDrinkNoUrineHours: { normal: [0, 8], risk: [8, 16], emergency: [16, Infinity] },
  },
  
  // GFR 3 期
  gfr_3: {
    urine24h: { normal: [700, 1600], risk: [350, 700], emergency: [0, 350] },
    singleUrine: { normal: [80, 200], risk: [40, 80], emergency: [0, 40] },
    dailyIntake: { normal: [1000, 1800], risk: [700, 1000], emergency: [0, 700] },
    netIntake: { normal: [-400, 400], risk: [400, 800], emergency: [800, Infinity] },
    inOutRatio: { normal: [0.8, 1.2], risk: [0.6, 0.8], emergency: [0, 0.6] },
    urineSpecificGravity: { normal: [1.010, 1.020], risk: [1.020, 1.028], emergency: [1.028, Infinity] },
    urineOsmolality: { normal: [250, 500], risk: [200, 250], emergency: [0, 200] },
    weightChange24h: { normal: [-1, 1], risk: [1, 2], emergency: [2, Infinity] },
    noDrinkNoUrineHours: { normal: [0, 8], risk: [8, 16], emergency: [16, Infinity] },
  },
  
  // GFR 4-5 期
  gfr_4_5: {
    urine24h: { normal: [600, 1200], risk: [300, 600], emergency: [0, 300] },
    singleUrine: { normal: [50, 150], risk: [30, 50], emergency: [0, 30] },
    dailyIntake: { normal: [800, 1500], risk: [600, 800], emergency: [0, 600] },
    netIntake: { normal: [-300, 300], risk: [300, 600], emergency: [600, Infinity] },
    inOutRatio: { normal: [0.8, 1.2], risk: [0.6, 0.8], emergency: [0, 0.6] },
    urineSpecificGravity: { normal: [1.008, 1.018], risk: [1.018, 1.026], emergency: [1.026, Infinity] },
    urineOsmolality: { normal: [200, 350], risk: [150, 200], emergency: [0, 150] },
    weightChange24h: { normal: [-0.8, 0.8], risk: [0.8, 1.5], emergency: [1.5, Infinity] },
    noDrinkNoUrineHours: { normal: [0, 8], risk: [8, 16], emergency: [16, Infinity] },
  },
}

interface ThresholdRange {
  normal: [number, number]      // [min, max] 正常范围
  risk: [number, number]        // 风险范围
  emergency: [number, number]   // 紧急范围
}

interface PatientThresholdConfig {
  urine24h: ThresholdRange
  singleUrine: ThresholdRange
  dailyIntake: ThresholdRange
  netIntake: ThresholdRange
  inOutRatio: ThresholdRange
  urineSpecificGravity: ThresholdRange
  urineOsmolality: ThresholdRange
  weightChange24h: ThresholdRange
  noDrinkNoUrineHours: ThresholdRange
}

// ======================== 护工状态判定 ========================

/**
 * 护工整体状态判定
 * @param emergencyCount 紧急患者人数
 * @param riskCount 风险患者人数
 */
export function calculateCaregiverStatus(
  emergencyCount: number, 
  riskCount: number
): PatientStatus {
  // Emergency ≥ 2 OR Risk ≥ 5 → Emergency
  if (emergencyCount >= 2 || riskCount >= 5) return 'emergency'
  // Emergency = 1 OR Risk ≥ 3 → Risk
  if (emergencyCount === 1 || riskCount >= 3) return 'risk'
  // Emergency = 0 AND Risk ≤ 2 → Normal
  return 'normal'
}

// ======================== 时间段配置 ========================

/**
 * 每日时间段划分
 */
export const TIME_PERIODS = [
  { start: 8,  end: 11, limit: 300, label: '8:00-11:00' },
  { start: 11, end: 14, limit: 400, label: '11:00-14:00' },
  { start: 14, end: 17, limit: 300, label: '14:00-17:00' },
  { start: 17, end: 20, limit: 300, label: '17:00-20:00' },
]

/**
 * 累计上限（5个时间点）
 */
export const CUMULATIVE_LIMITS = [0, 300, 700, 1000, 1300]

/**
 * 获取当前时间段
 */
export function getCurrentTimePeriod() {
  const hour = new Date().getHours()
  for (const period of TIME_PERIODS) {
    if (hour >= period.start && hour < period.end) {
      return period
    }
  }
  // 不在时间段内，返回最近的
  if (hour < 8) return TIME_PERIODS[0]
  return TIME_PERIODS[TIME_PERIODS.length - 1]
}

// ======================== 工具函数 ========================

/**
 * 根据 GFR 分期获取摄入/排出上限
 */
export function getLimitsByGfr(gfrStage: GfrStage) {
  const group = getGfrGroup(gfrStage)
  return LIMIT_CONFIG[group]
}

/**
 * GFR 罗马数字显示
 */
export const GFR_ROMAN: Record<number, string> = {
  1: 'Ⅰ',
  2: 'Ⅱ',
  3: 'Ⅲ',
  4: 'Ⅳ',
  5: 'Ⅴ',
}

/**
 * 状态颜色配置
 */
export const STATUS_COLORS: Record<PatientStatus, string> = {
  normal: '#46C761',     // 绿色
  risk: '#FA8534',       // 橙色
  emergency: '#F43859',  // 红色
}

/**
 * 状态中文标签
 */
export const STATUS_LABELS: Record<PatientStatus, string> = {
  normal: '正常',
  risk: '注意',
  emergency: '严重',
}
