// ============================================================
// CKD 水分管理系统 - Mock 数据
// 后端开发可参考此文件了解数据格式
// ============================================================

import type {
  PatientBasicInfo,
  PatientDashboard,
  PatientPeriodData,
  TimelineEntry,
  CaregiverDashboard,
  PatientListItem,
} from './types'

// ======================== 家属端患者数据 ========================

/**
 * 家属端患者基础信息
 * 来自建档表单，存储在 localStorage
 */
export const mockFamilyPatient: PatientBasicInfo = {
  id: 'family_patient_001',
  patientName: '张阿姨',
  age: 68,
  weight: 62,
  isCKD: true,
  gfrStage: 2,
  createdAt: '2026-01-08T10:30:00.000Z',
  updatedAt: '2026-01-09T08:00:00.000Z',
  intakeLimit: 2200,  // GFR 1-2 期
  outputLimit: 1800,
  avatar: '/figma/Rectangle 283.png',
}

/**
 * 家属端时间线数据（需要在 Dashboard 之前声明）
 */
export const mockFamilyTimeline: TimelineEntry[] = [
  {
    id: 'tl_001',
    patientId: 'family_patient_001',
    kind: 'intake',
    source: 'water_dispenser',
    valueMl: 200,
    time: '08:15',
    timestamp: '2026-01-10T08:15:00.000Z',
    timeAgo: '4小时前',
    title: '喝了一杯温水',
  },
  {
    id: 'tl_002',
    patientId: 'family_patient_001',
    kind: 'intake',
    source: 'camera',
    valueMl: 180,
    time: '12:30',
    timestamp: '2026-01-10T12:30:00.000Z',
    timeAgo: '1小时前',
    title: '午餐 · 一碗粥 + 青菜',
    imageUrl: '/figma/analysis-food-thumb.png',
    aiRecognition: {
      foodType: '汤羹类',
      estimatedWater: 180,
      confidence: 85,
      hasRisk: false,
      riskFactors: [],
    },
  },
  {
    id: 'tl_003',
    patientId: 'family_patient_001',
    kind: 'output',
    source: 'urinal',
    valueMl: 210,
    time: '10:45',
    timestamp: '2026-01-10T10:45:00.000Z',
    timeAgo: '2小时前',
    title: '排尿 · 颜色淡黄',
    urineColor: '淡黄',
    urineSpecificGravity: 1.012,
  },
  {
    id: 'tl_004',
    patientId: 'family_patient_001',
    kind: 'intake',
    source: 'water_dispenser',
    valueMl: 150,
    time: '14:20',
    timestamp: '2026-01-10T14:20:00.000Z',
    timeAgo: '30分钟前',
    title: '下午茶时间喝水',
  },
]

/**
 * 家属端患者当日数据
 */
export const mockFamilyDashboard: PatientDashboard = {
  patientId: 'family_patient_001',
  date: '2026-01-10',
  
  totalIntake: 890,
  intakeLimit: 2200,
  totalOutput: 620,
  outputLimit: 1800,
  
  urineSpecificGravity: 1.015,
  urineOsmolality: 450,
  urinationCount: 4,
  
  netIntake: 270,
  inOutRatio: 1.44,
  
  status: 'normal',
  
  aiSummary: {
    overall: '今日水分管理良好，各项指标正常',
    intakeText: '摄入量适中，继续保持',
    outputText: '排出正常，肾脏功能稳定',
  },
  
  timeline: mockFamilyTimeline,
}

// ======================== 护工端数据 ========================

/**
 * 护工端预设患者列表
 */
export const mockPatientList: PatientListItem[] = [
  {
    id: '1',
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-09T18:00:00.000Z',
    name: '陈阿姨',
    fullName: '陈阿姨-病床一',
    avatar: '/figma/Rectangle 283.png',
    gfrStage: 1,
    gfrDisplay: 'GFR Ⅰ期',
    meta: 'GFR Ⅰ期 60kg',
    totalIntake: 950,
    totalOutput: 420,
    intakeLimit: 2200,
    outputLimit: 1800,
    status: 'emergency',
    currentPeriod: {
      patientId: '1',
      periodLabel: '17:00-20:00',
      periodLimit: 300,
      periodIntake: 180,
      periodOutput: 80,
      intakePercent: 60,
      outputPercent: 27,
    },
  },
  {
    id: '2',
    createdAt: '2026-01-02T09:00:00.000Z',
    updatedAt: '2026-01-09T18:05:00.000Z',
    name: '钱奶奶',
    fullName: '钱奶奶-病床二',
    avatar: '/figma/Rectangle 283.png',
    gfrStage: 2,
    gfrDisplay: 'GFR Ⅱ期',
    meta: 'GFR Ⅱ期 55kg',
    totalIntake: 780,
    totalOutput: 650,
    intakeLimit: 2200,
    outputLimit: 1800,
    status: 'emergency',
    currentPeriod: {
      patientId: '2',
      periodLabel: '17:00-20:00',
      periodLimit: 300,
      periodIntake: 150,
      periodOutput: 120,
      intakePercent: 50,
      outputPercent: 40,
    },
  },
  {
    id: '3',
    createdAt: '2026-01-03T09:00:00.000Z',
    updatedAt: '2026-01-09T18:10:00.000Z',
    name: '王叔叔',
    fullName: '王叔叔-病床三',
    avatar: '/figma/Rectangle 283.png',
    gfrStage: 3,
    gfrDisplay: 'GFR Ⅲ期',
    meta: 'GFR Ⅲ期 70kg',
    totalIntake: 810,
    totalOutput: 560,
    intakeLimit: 2000,
    outputLimit: 1600,
    status: 'emergency',
    currentPeriod: {
      patientId: '3',
      periodLabel: '17:00-20:00',
      periodLimit: 300,
      periodIntake: 200,
      periodOutput: 100,
      intakePercent: 67,
      outputPercent: 33,
    },
  },
  {
    id: '4',
    createdAt: '2026-01-04T09:00:00.000Z',
    updatedAt: '2026-01-09T18:15:00.000Z',
    name: '李阿姨',
    fullName: '李阿姨-病床四',
    avatar: '/figma/Rectangle 283.png',
    gfrStage: 2,
    gfrDisplay: 'GFR Ⅱ期',
    meta: 'GFR Ⅱ期 58kg',
    totalIntake: 720,
    totalOutput: 680,
    intakeLimit: 2200,
    outputLimit: 1800,
    status: 'risk',
    currentPeriod: {
      patientId: '4',
      periodLabel: '17:00-20:00',
      periodLimit: 300,
      periodIntake: 220,
      periodOutput: 180,
      intakePercent: 73,
      outputPercent: 60,
    },
  },
  {
    id: '5',
    createdAt: '2026-01-05T09:00:00.000Z',
    updatedAt: '2026-01-09T18:20:00.000Z',
    name: '赵爷爷',
    fullName: '赵爷爷-病床五',
    avatar: '/figma/Rectangle 283.png',
    gfrStage: 4,
    gfrDisplay: 'GFR Ⅳ期',
    meta: 'GFR Ⅳ期 65kg',
    totalIntake: 650,
    totalOutput: 480,
    intakeLimit: 1500,
    outputLimit: 1000,
    status: 'normal',
    currentPeriod: {
      patientId: '5',
      periodLabel: '17:00-20:00',
      periodLimit: 300,
      periodIntake: 90,
      periodOutput: 110,
      intakePercent: 30,
      outputPercent: 37,
    },
  },
  {
    id: '6',
    createdAt: '2026-01-06T09:00:00.000Z',
    updatedAt: '2026-01-09T18:25:00.000Z',
    name: '孙奶奶',
    fullName: '孙奶奶-病床六',
    avatar: '/figma/Rectangle 283.png',
    gfrStage: 1,
    gfrDisplay: 'GFR Ⅰ期',
    meta: 'GFR Ⅰ期 52kg',
    totalIntake: 880,
    totalOutput: 720,
    intakeLimit: 2200,
    outputLimit: 1800,
    status: 'normal',
    currentPeriod: {
      patientId: '6',
      periodLabel: '17:00-20:00',
      periodLimit: 300,
      periodIntake: 100,
      periodOutput: 130,
      intakePercent: 33,
      outputPercent: 43,
    },
  },
]

/**
 * 护工端仪表盘数据
 */
export const mockCaregiverDashboard: CaregiverDashboard = {
  caregiverId: 'caregiver_001',
  date: '2026-01-10',
  updatedAt: '2026-01-10T12:00:00.000Z',
  
  totalPatients: 6,
  emergencyCount: 3,
  riskCount: 1,
  normalCount: 2,
  needAttentionCount: 4,
  
  overallStatus: 'emergency',  // Emergency ≥ 2
  
  totalIntake: 4790,
  totalIntakeLimit: 12300,
  totalOutput: 3510,
  totalOutputLimit: 9800,
  avgNetIntake: 213,
  
  aiSummary: {
    overall: '当前有3名患者处于紧急状态，需要立即关注',
    intakeAbnormal: { tooMuch: 2, tooLittle: 1 },
    outputAbnormal: { tooMuch: 0, tooLittle: 2 },
  },
  
  patients: mockPatientList,
}

// ======================== 分时段数据 ========================

/**
 * 患者分时段数据示例
 */
export const mockPeriodData: PatientPeriodData = {
  patientId: '1',
  date: '2026-01-10',
  periods: {
    '8:00-11:00': { intake: 250, output: 180, limit: 300 },
    '11:00-14:00': { intake: 380, output: 220, limit: 400 },
    '14:00-17:00': { intake: 200, output: 150, limit: 300 },
    '17:00-20:00': { intake: 120, output: 70, limit: 300 },
  },
  intakeCumulative: [0, 250, 630, 830, 950],
  outputCumulative: [0, 180, 400, 550, 620],
}

// ======================== 生成时间线数据的工具函数 ========================

/**
 * 生成带 timeAgo 的时间线
 */
export function generateTimelineWithAgo(entries: Omit<TimelineEntry, 'timeAgo'>[]): TimelineEntry[] {
  const now = new Date()
  return entries.map(entry => {
    // entry.timestamp 可能为 undefined，使用当前时间作为回退
    const entryTime = entry.timestamp ? new Date(entry.timestamp) : new Date()
    const diffMs = now.getTime() - entryTime.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMinutes / 60)
    
    let timeAgo: string
    if (diffMinutes < 1) {
      timeAgo = '刚刚'
    } else if (diffMinutes < 60) {
      timeAgo = `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      const remainMinutes = diffMinutes % 60
      timeAgo = remainMinutes > 0 
        ? `${diffHours}小时${remainMinutes}分钟前`
        : `${diffHours}小时前`
    } else {
      timeAgo = `${Math.floor(diffHours / 24)}天前`
    }
    
    return { ...entry, timeAgo }
  })
}
