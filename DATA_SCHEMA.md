# CKD 水分管理系统 - 前端数据结构清单

> 生成时间：2026-01-10（最后更新）
> 用途：前后端数据对接参考文档

---

## 目录

1. [患者建档数据](#1-患者建档数据)
2. [患者完整数据](#2-患者完整数据)
3. [时间线条目](#3-时间线条目)
4. [摄入记录](#4-摄入记录)
5. [排出记录](#5-排出记录)
6. [护工端汇总数据](#6-护工端汇总数据)
7. [家属端数据](#7-家属端数据)
8. [时间段配置与数据](#8-时间段配置与数据)
9. [时间节点图表数据](#9-时间节点图表数据)
10. [风险排序双环数据](#10-风险排序双环数据)
11. [枚举值定义](#11-枚举值定义)
12. [数据流向图](#12-数据流向图)
13. [后端接口建议](#13-后端接口建议)
14. [localStorage 键值清单](#14-localstorage-键值清单)
15. [版本记录](#15-版本记录)

---

## 1. 患者建档数据

**来源文件**: `src/App.jsx`  
**存储位置**: `localStorage.patientData`, `localStorage.newPatientData`  
**触发时机**: 用户完成建档表单并点击进入系统

```typescript
interface PatientRegistration {
  // ===== 元数据 =====
  id: string                    // 患者唯一标识，固定值 'current_patient'（覆盖模式）
  created_at: string            // ISO 8601 格式时间戳，如 '2026-01-04T10:30:00.000Z'
  
  // ===== 角色信息 =====
  user_type: 'family' | 'caregiver'  // 用户角色：家属 | 护工
  
  // ===== 基础体征 =====
  patient_name: string | null   // 患者姓名，未填写为 null
  age: number | null            // 年龄（岁），未填写为 null
  weight: number | null         // 体重（kg），未填写为 null
  
  // ===== CKD 信息 =====
  is_ckd_patient: boolean       // 是否为 CKD 患者
  gfr_stage: 1 | 2 | 3 | 4 | 5 | null  // GFR 分期，非CKD患者为 null
  
  // ===== 完整性标记 =====
  is_complete: boolean          // 是否完整填写（姓名+年龄+体重+CKD状态）
  
  // ===== 前端显示用（可选，后端可忽略）=====
  _display: {
    role_text: '我是家属' | '我是护工'
    stage_text: 'Stage 1' | 'Stage 2' | 'Stage 3' | null
    timestamp_cn: string        // 中文格式时间，如 '2026/01/04 10:30:00'
  }
}
```

**示例数据**:
```json
{
  "id": "current_patient",
  "created_at": "2026-01-04T02:30:00.000Z",
  "user_type": "family",
  "patient_name": "张三",
  "age": 65,
  "weight": 70,
  "is_ckd_patient": true,
  "gfr_stage": 2,
  "is_complete": true,
  "_display": {
    "role_text": "我是家属",
    "stage_text": "Stage 1",
    "timestamp_cn": "2026/01/04 10:30:00"
  }
}
```

---

## 2. 患者完整数据

**来源文件**: `src/MainApp.jsx`  
**状态变量**: `patients: Patient[]`  
**用途**: 护工端患者列表、患者详情页

```typescript
interface Patient {
  // ===== 身份标识 =====
  id: number | string           // 患者唯一ID（预设患者为数字，建档患者为 'current_patient'）
  
  // ===== 基础信息 =====
  name: string                  // 显示名称，如 '王叔叔'
  shortName: string             // 短名称，同 name
  fullName: string              // 完整名称，如 '王叔叔-病床三' 或 '张三-建档患者'
  age?: number                  // 年龄（岁），可选
  
  // ===== GFR/CKD 信息 =====
  meta: string                  // 简要信息，如 'GFR Ⅱ期 70kg'
  metaFull: string              // 完整信息，如 'GFR Ⅱ期 70kg 依从性良好'
  gfrStage: 1 | 2 | 3 | 4 | 5 | null  // GFR 分期
  
  // ===== 水分摄入/排出数据（当日总量）=====
  inMl: number                  // 今日摄入量（毫升），新患者为 0
  outMl: number                 // 今日排出量（毫升），新患者为 0
  inMlMax: number               // 摄入量上限/目标（毫升），默认 1000-1400
  outMlMax: number              // 排出量上限/目标（毫升），默认 1000-1400
  inPercent: number             // 摄入占比（0-100），用于环形图
  outPercent: number            // 排出占比（0-100），用于环形图
  
  // ===== 分时段水分数据（NEW - 用于时间节点图表和风险排序）=====
  periodData?: PatientPeriodData  // 各时间段的实际摄入/排出数据
  
  // ===== 尿液检测指标 =====
  urineOsmolality: number | null      // 尿渗透压 (mOsm/kg H₂O)，正常范围 200-1000，无数据为 null
  urineSpecificGravity: number | null // 尿比重，正常范围 1.005-1.030，无数据为 null
  urinationCount: number              // 今日排尿次数，无数据为 0
  
  // ===== 状态与显示 =====
  status: 'emergency' | 'risk' | 'normal'  // 患者状态
  avatar: string                // 头像URL
  
  // ===== 时间线日志 =====
  timeline: TimelineEntry[]     // 今日摄入/排出日志，新患者为空数组
}

// 患者分时段数据（NEW）
interface PatientPeriodData {
  // 各时间段累计摄入量（5个时间点：08:00, 11:00, 14:00, 17:00, 20:00）
  intakeCumulative: [number, number, number, number, number]
  // 各时间段累计排出量（5个时间点）
  outputCumulative: [number, number, number, number, number]
  
  // 各时间段单独摄入量（4个时间段）
  intakeByPeriod: [number, number, number, number]  // [08-11, 11-14, 14-17, 17-20]
  // 各时间段单独排出量（4个时间段）
  outputByPeriod: [number, number, number, number]
  
  // 当前时间段索引 (0-3)
  currentPeriodIndex: number
}
```

**示例数据**:
```json
{
  "id": 1,
  "name": "王叔叔",
  "shortName": "王叔叔",
  "fullName": "王叔叔-病床三",
  "age": 68,
  "meta": "GFR Ⅰ期 60kg",
  "metaFull": "GFR Ⅰ期 60kg 依从性良好",
  "gfrStage": 1,
  "inMl": 810,
  "outMl": 560,
  "inMlMax": 1200,
  "outMlMax": 1200,
  "inPercent": 65,
  "outPercent": 35,
  "urineOsmolality": 650,
  "urineSpecificGravity": 1.015,
  "urinationCount": 5,
  "status": "normal",
  "avatar": "https://...",
  "timeline": [...]
}
```

**新建档患者示例**（无监测数据）:
```json
{
  "id": "current_patient",
  "name": "张三",
  "shortName": "张三",
  "fullName": "张三-建档患者",
  "age": 65,
  "meta": "GFR Ⅱ期 70kg",
  "metaFull": "GFR Ⅱ期 70kg 新建档",
  "gfrStage": 2,
  "inMl": 0,
  "outMl": 0,
  "inMlMax": 1000,
  "outMlMax": 1000,
  "inPercent": 50,
  "outPercent": 50,
  "urineOsmolality": null,
  "urineSpecificGravity": null,
  "urinationCount": 0,
  "status": "normal",
  "avatar": "https://...",
  "timeline": []
}
```

---

## 3. 时间线条目

**来源文件**: `src/MainApp.jsx`, `src/PatientDetailPage.jsx`, `src/FamilyHomePage.jsx`  
**用途**: 患者每日摄入/排出日志记录

```typescript
interface TimelineEntry {
  // ===== 标识 =====
  id: string                    // 唯一ID，如 'drink-1', 'intake_1735993200000'
  
  // ===== 类型 =====
  kind: 'intake' | 'output'     // 类型：摄入 | 排出
  source: 'intake' | 'camera' | 'output' | 'manual'  // 数据来源
  // - 'intake': 饮水机/智能水杯自动记录
  // - 'camera': 拍照上传（AI识别）
  // - 'output': 智能尿壶自动记录
  // - 'manual': 护工手动记录
  
  // ===== 时间信息 =====
  time: string                  // 时间，如 '19:45'
  sourceLabel: string           // 来源标签，如 '饮水机', '午餐·拍照上传', '护工手动记录'
  ago: string                   // 相对时间，如 '25分钟前', '6小时35分钟前'
  
  // ===== 内容 =====
  title: string                 // 描述，如 '喝了一杯白水', '排尿 · 颜色淡黄'
  
  // ===== 数值 =====
  valueText: string             // 显示文本，如 '+ 200ml', '- 210ml'
  valueMl: number               // 毫升数值，如 200, 210
  
  // ===== 可选：AI分析详情 =====
  expandable?: boolean          // 是否可展开查看详情
  expand?: {
    confidence: string          // 置信度，如 '置信度：82%'
    observe: string             // 系统观察
    riskA: string               // 风险推断A
    riskB: string               // 风险推断B
    sync: string                // 同步时间
  }
}
```

**示例数据**:

**自动记录（饮水机）**:
```json
{
  "id": "drink-1",
  "kind": "intake",
  "source": "intake",
  "time": "19:45",
  "sourceLabel": "饮水机",
  "title": "喝了一杯白水",
  "ago": "25分钟前",
  "valueText": "+ 200ml",
  "valueMl": 200
}
```

**拍照上传（AI识别）**:
```json
{
  "id": "lunch-1",
  "kind": "intake",
  "source": "camera",
  "time": "13:25",
  "sourceLabel": "午餐·拍照上传",
  "title": "一碗粥 + 小菜",
  "ago": "6小时35分钟前",
  "valueText": "+ 180ml",
  "valueMl": 180,
  "expandable": true,
  "expand": {
    "confidence": "置信度：82%",
    "observe": "检测到午餐时间端的食物摄入，图像识别为高水分汤羹类。",
    "riskA": "推测就餐摄入约180ml",
    "riskB": "此次行为可能导致水分积累上升",
    "sync": "数据同步：1分钟前"
  }
}
```

**智能尿壶（自动排出）**:
```json
{
  "id": "pee-1",
  "kind": "output",
  "source": "output",
  "time": "11:05",
  "sourceLabel": "智能尿壶",
  "title": "排尿 · 颜色淡黄",
  "ago": "8小时55分钟前",
  "valueText": "- 210ml",
  "valueMl": 210
}
```

**护工手动记录**:
```json
{
  "id": "intake_1735993200000",
  "kind": "intake",
  "source": "manual",
  "time": "14:30",
  "sourceLabel": "护工手动记录",
  "title": "喝水",
  "ago": "刚刚",
  "valueText": "+ 150ml",
  "valueMl": 150
}
```

---

## 4. 摄入记录

**来源文件**: `src/IntakeModal.jsx`  
**触发时机**: 护工在患者页面点击"+"按钮手动添加摄入记录

```typescript
interface IntakeRecord {
  patientName: string           // 患者姓名
  ml: number                    // 摄入量（毫升）
  note: string                  // 备注，如 '喝水', '吃粥'
  time: string                  // 记录时间，如 '14:30'
  source: 'manual'              // 来源固定为 'manual'
}
```

**回调函数**: `onRecordIntake(patientName: string, entry: TimelineEntry)`

---

## 5. 排出记录

**来源文件**: `src/OutputModal.jsx`  
**触发时机**: 护工在患者页面点击"-"按钮手动添加排出记录

```typescript
interface OutputRecord {
  patientName: string           // 患者姓名
  ml: number                    // 排出量（毫升）
  note: string                  // 备注，如 '排尿', '颜色正常'
  time: string                  // 记录时间，如 '15:00'
  source: 'manual'              // 来源固定为 'manual'
}
```

**回调函数**: `onRecordOutput(patientName: string, entry: TimelineEntry)`

---

## 6. 护工端汇总数据

**来源文件**: `src/MainApp.jsx`  
**计算方式**: 从 `patients[]` 聚合计算  
**用途**: 护工首页总览、设置页卡片

```typescript
interface CaregiverSummary {
  // ===== 原始毫升值 =====
  totalInMl: number             // 所有患者总摄入量（毫升）
  totalOutMl: number            // 所有患者总排出量（毫升）
  totalInMlMax: number          // 所有患者摄入上限总和（毫升）
  totalOutMlMax: number         // 所有患者排出上限总和（毫升）
  
  // ===== 升值（显示用）=====
  totalInL: string              // 总摄入量（升），如 '8.7'
  totalOutL: string             // 总排出量（升），如 '8.5'
  totalInLMax: string           // 总摄入上限（升），如 '14.2'
  totalOutLMax: string          // 总排出上限（升），如 '14.2'
  
  // ===== 完成度百分比（相对于上限）=====
  totalInPercent: number        // 摄入完成度，如 61（表示61%）
  totalOutPercent: number       // 排出完成度，如 60（表示60%）
  
  // ===== 入量出量比例（用于环形图）=====
  intakeRatio: number           // 入量占比，如 51（表示51%）
  outputRatio: number           // 出量占比，如 49（表示49%）
  // 计算公式：intakeRatio = totalInMl / (totalInMl + totalOutMl) * 100
}
```

**计算逻辑**:
```javascript
// 原始值
const totalInMl = patients.reduce((sum, p) => sum + p.inMl, 0)
const totalOutMl = patients.reduce((sum, p) => sum + p.outMl, 0)

// 升值（保留1位小数）
const totalInL = (totalInMl / 1000).toFixed(1)
const totalOutL = (totalOutMl / 1000).toFixed(1)

// 完成度（相对于上限）
const totalInPercent = Math.round((totalInMl / totalInMlMax) * 100)
const totalOutPercent = Math.round((totalOutMl / totalOutMlMax) * 100)

// 入出比例（用于环形图，总和=100%）
const totalSum = totalInMl + totalOutMl
const intakeRatio = Math.round((totalInMl / totalSum) * 100)
const outputRatio = Math.round((totalOutMl / totalSum) * 100)
```

---

## 7. 家属端数据

**来源文件**: `src/MainApp.jsx`, `src/FamilyHomePage.jsx`  
**状态变量**: `familyTimeline: TimelineEntry[]`

```typescript
interface FamilyData {
  // ===== 时间线 =====
  timeline: TimelineEntry[]     // 家属端专用时间线（与护工端患者timeline结构相同）
  
  // ===== 动态计算值（从timeline计算）=====
  inMl: number                  // 今日摄入总量，从timeline.filter(kind=intake).sum(valueMl)
  outMl: number                 // 今日排出总量，从timeline.filter(kind=output).sum(valueMl)
  
  // ===== 上限值 =====
  inMlMax: number               // 摄入上限，默认 1200
  outMlMax: number              // 排出上限，默认 1200
  
  // ===== 百分比（用于进度条和环形图）=====
  inPercent: number             // 摄入完成度 = inMl / inMlMax * 100
  outPercent: number            // 排出完成度 = outMl / outMlMax * 100
  intakeRatio: number           // 入量占比 = inMl / (inMl + outMl) * 100
  outputRatio: number           // 出量占比 = outMl / (inMl + outMl) * 100
  
  // ===== 状态（动态计算）=====
  patientStatus: 'emergency' | 'risk' | 'normal'
  // 计算规则：
  // - 净入量 > 300ml → emergency
  // - 净入量 > 150ml 或 < -200ml → risk
  // - 其他 → normal
}
```

**计算逻辑**（FamilyHomePage.jsx）:
```javascript
const { inMl, outMl } = useMemo(() => {
  let totalIn = 0, totalOut = 0
  timeline.forEach(item => {
    if (item.kind === 'intake') totalIn += item.valueMl || 0
    else if (item.kind === 'output') totalOut += item.valueMl || 0
  })
  return { inMl: totalIn, outMl: totalOut }
}, [timeline])

const patientStatus = useMemo(() => {
  const netBalance = inMl - outMl
  if (netBalance > 300) return 'emergency'
  if (netBalance > 150 || netBalance < -200) return 'risk'
  return 'normal'
}, [inMl, outMl])
```

---

## 8. 时间段配置与数据

**来源文件**: `src/WaterManagement.jsx`, `src/TimeNodeChart.jsx`  
**用途**: 将一天划分为4个时间段，每个时间段有独立的摄入/排出上限，用于风险排序和时间节点图表

### 8.1 时间段配置 (TIME_PERIODS)

```typescript
interface TimePeriod {
  start: number                 // 开始小时（24小时制）
  end: number                   // 结束小时（24小时制）
  limit: number                 // 该时间段的摄入/排出上限（毫升）
  label: string                 // 显示标签
}

// 系统预设时间段
const TIME_PERIODS: TimePeriod[] = [
  { start: 8,  end: 11, limit: 300, label: '8:00-11:00' },   // 早间
  { start: 11, end: 14, limit: 400, label: '11:00-14:00' },  // 午间（含午餐，上限较高）
  { start: 14, end: 17, limit: 300, label: '14:00-17:00' },  // 下午
  { start: 17, end: 20, limit: 300, label: '17:00-20:00' }   // 傍晚
]
```

### 8.2 累计上限 (CUMULATIVE_LIMITS)

```typescript
// 每个时间点的累计摄入/排出上限
// 时间点：08:00, 11:00, 14:00, 17:00, 20:00
const CUMULATIVE_LIMITS = [0, 300, 700, 1000, 1300]

// 计算逻辑：
// 08:00 → 0（一天开始，还未摄入）
// 11:00 → 0 + 300 = 300（第一时间段结束）
// 14:00 → 300 + 400 = 700（第二时间段结束）
// 17:00 → 700 + 300 = 1000（第三时间段结束）
// 20:00 → 1000 + 300 = 1300（第四时间段结束，一天总上限）
```

### 8.3 患者分时段数据

**后端需要提供的数据结构**：

```typescript
interface PatientPeriodDataFromAPI {
  patientId: string | number
  date: string                  // ISO 日期，如 '2026-01-10'
  
  // 各时间段实际摄入量（毫升）
  intakeByPeriod: {
    '08:00-11:00': number       // 例如 120
    '11:00-14:00': number       // 例如 280
    '14:00-17:00': number       // 例如 150
    '17:00-20:00': number       // 例如 180
  }
  
  // 各时间段实际排出量（毫升）
  outputByPeriod: {
    '08:00-11:00': number       // 例如 100
    '11:00-14:00': number       // 例如 200
    '14:00-17:00': number       // 例如 180
    '17:00-20:00': number       // 例如 150
  }
}
```

**前端转换为累计值**（用于图表显示）：

```javascript
// 将分段数据转换为累计数据
function convertToCumulative(periodData) {
  const intakeValues = Object.values(periodData.intakeByPeriod)
  const outputValues = Object.values(periodData.outputByPeriod)
  
  // 累计摄入：[0, p1, p1+p2, p1+p2+p3, p1+p2+p3+p4]
  const intakeCumulative = [0]
  let intakeSum = 0
  intakeValues.forEach(v => {
    intakeSum += v
    intakeCumulative.push(intakeSum)
  })
  
  // 累计排出：同理
  const outputCumulative = [0]
  let outputSum = 0
  outputValues.forEach(v => {
    outputSum += v
    outputCumulative.push(outputSum)
  })
  
  return { intakeCumulative, outputCumulative }
}
```

**示例数据**：

```json
{
  "patientId": 1,
  "date": "2026-01-10",
  "intakeByPeriod": {
    "08:00-11:00": 120,
    "11:00-14:00": 280,
    "14:00-17:00": 150,
    "17:00-20:00": 180
  },
  "outputByPeriod": {
    "08:00-11:00": 100,
    "11:00-14:00": 200,
    "14:00-17:00": 180,
    "17:00-20:00": 150
  }
}
```

转换后的累计数据：
```json
{
  "intakeCumulative": [0, 120, 400, 550, 730],
  "outputCumulative": [0, 100, 300, 480, 630]
}
```

---

## 9. 时间节点图表数据

**来源文件**: `src/TimeNodeChart.jsx`  
**用途**: 患者详情页展示单个患者一天内各时间点的摄入/排出趋势与基线参考对比

### 9.1 组件 Props

```typescript
interface TimeNodeChartProps {
  // 患者时间线数据（用于自动计算累计值）
  patientTimeline?: TimelineEntry[]
  
  // 或直接传入已计算好的数据（优先级更高）
  intakeData?: [number, number, number, number, number]   // 5个时间点的累计摄入
  outputData?: [number, number, number, number, number]   // 5个时间点的累计排出
}
```

### 9.2 图表数据结构

```typescript
interface TimeNodeChartData {
  // 当前显示模式
  activeMode: 'intake' | 'output'
  
  // 实际数据（5个时间点的累计值）
  intake: [number, number, number, number, number]   // 例如 [0, 120, 400, 550, 730]
  output: [number, number, number, number, number]   // 例如 [0, 100, 300, 480, 630]
  
  // 基线参考（系统预设累计上限）
  baseline: [0, 300, 700, 1000, 1300]
  
  // X轴标签
  xLabels: ['08:00', '11:00', '14:00', '17:00', '20:00']
  
  // Y轴范围
  yMax: 400   // Y轴最大值（毫升）
  yTicks: [400, 350, 300, 250, 200, 150, 100, 50, 0]
}
```

### 9.3 颜色配置

```typescript
// 摄入模式颜色
const INTAKE_COLORS = {
  bg: '#e9f0f9',              // 背景色（浅蓝）
  primary: '#2D5FFF',          // 实际数据曲线（蓝色）
  baseline: '#00E5C8',         // 基线参考曲线（青色）
  gradient: ['rgba(45, 95, 255, 0.6)', 'rgba(45, 95, 255, 0.1)']  // 渐变填充
}

// 排出模式颜色
const OUTPUT_COLORS = {
  bg: '#f4e9f9',              // 背景色（浅紫）
  primary: '#8848DB',          // 实际数据曲线（紫色）
  baseline: '#FF9EC4',         // 基线参考曲线（粉色）
  gradient: ['rgba(136, 72, 219, 0.6)', 'rgba(136, 72, 219, 0.1)']
}
```

---

## 10. 风险排序双环数据

**来源文件**: `src/RiskDoubleRing.jsx`, `src/WaterManagement.jsx`  
**用途**: 护工首页风险排序卡片，展示单个患者在**当前时间段**的摄入/排出占上限比例

### 10.1 组件 Props

```typescript
interface RiskDoubleRingProps {
  intakePercent: number         // 外环：当前时间段摄入量占上限百分比（0-100）
  outputPercent: number         // 内环：当前时间段排出量占上限百分比（0-100）
  size?: number                 // 圆环尺寸（像素），默认 64
  centerColor?: string          // 中心圆点颜色（使用患者状态颜色）
}
```

### 10.2 计算逻辑

```javascript
// 获取当前时间段
function getCurrentTimePeriod() {
  const hour = new Date().getHours()
  for (const period of TIME_PERIODS) {
    if (hour >= period.start && hour < period.end) {
      return period
    }
  }
  // 不在任何时间段内，返回最近的时间段
  return findClosestPeriod(hour)
}

// 计算患者在当前时间段的百分比
function getPatientPercents(patient, currentPeriod) {
  const periodLimit = currentPeriod.limit  // 当前时间段上限
  
  // 从 patient.periodData 获取当前时间段的实际数据
  // 或从 patient.timeline 实时计算
  const periodIntake = getPeriodIntake(patient, currentPeriod)
  const periodOutput = getPeriodOutput(patient, currentPeriod)
  
  return {
    intakePercent: Math.min(100, Math.round((periodIntake / periodLimit) * 100)),
    outputPercent: Math.min(100, Math.round((periodOutput / periodLimit) * 100))
  }
}
```

### 10.3 双环视觉含义

```
┌──────────────────────────────────────────┐
│                                          │
│    ┌─────────────────┐                   │
│    │   外环（蓝色）   │ = 摄入占比        │
│    │   ┌─────────┐   │                   │
│    │   │内环(紫色)│   │ = 排出占比        │
│    │   │  ┌───┐  │   │                   │
│    │   │  │ ● │  │   │ = 中心点（状态色） │
│    │   │  └───┘  │   │                   │
│    │   └─────────┘   │                   │
│    └─────────────────┘                   │
│                                          │
│  起点：12点钟方向（白色小球标记）         │
│  过少阈值线：6点钟方向（红色线，约50%）   │
│  过多阈值线：9点钟方向（蓝色线，约75%）   │
│                                          │
└──────────────────────────────────────────┘
```

### 10.4 后端数据需求

```typescript
// 后端需要提供的当前时间段数据
interface CurrentPeriodData {
  patientId: string | number
  periodLabel: string           // 如 '17:00-20:00'
  periodLimit: number           // 当前时间段上限，如 300
  periodIntake: number          // 当前时间段已摄入量
  periodOutput: number          // 当前时间段已排出量
}

// 或者后端直接返回百分比
interface CurrentPeriodPercent {
  patientId: string | number
  intakePercent: number         // 0-100
  outputPercent: number         // 0-100
}
```

---

## 11. 枚举值定义

### 8.1 患者状态 (PatientStatus)

```typescript
type PatientStatus = 'emergency' | 'risk' | 'normal'

const PATIENT_STATUS = {
  emergency: { 
    key: 'emergency', 
    label: '严重', 
    color: '#F43859'  // 红色
  },
  risk: { 
    key: 'risk', 
    label: '注意', 
    color: '#FA8534'  // 橙色
  },
  normal: { 
    key: 'normal', 
    label: '安全', 
    color: '#46C761'  // 绿色
  }
}
```

### 8.2 用户角色 (UserRole)

```typescript
type UserRole = 'family' | 'caregiver'

// family: 家属端 - 单患者视图
// caregiver: 护工端 - 多患者管理视图
```

### 8.3 时间线条目类型 (TimelineKind)

```typescript
type TimelineKind = 'intake' | 'output'

// intake: 水分摄入
// output: 水分排出（排尿）
```

### 8.4 数据来源 (DataSource)

```typescript
type DataSource = 'intake' | 'camera' | 'output' | 'manual'

// intake: 饮水机/智能水杯自动记录
// camera: 拍照上传（AI图像识别）
// output: 智能尿壶自动记录
// manual: 护工手动记录
```

### 8.5 GFR 分期 (GfrStage)

```typescript
type GfrStage = 1 | 2 | 3 | 4 | 5 | null

// CKD分期与GFR对应关系：
// Stage 1: GFR ≥ 90 (轻度)
// Stage 2: GFR 60-89 (轻度)
// Stage 3: GFR 30-59 (中度)
// Stage 4: GFR 15-29 (重度)
// Stage 5: GFR < 15 (重度/肾衰竭)

// 前端筛选映射：
// CKD轻度 → gfrStage === 1 || gfrStage === 2
// CKD中度 → gfrStage === 3
// CKD重度 → gfrStage === 4 || gfrStage === 5
```

### 8.6 GFR 罗马数字映射

```typescript
const GFR_ROMAN = {
  1: 'Ⅰ',
  2: 'Ⅱ',
  3: 'Ⅲ',
  4: 'Ⅳ',
  5: 'Ⅴ'
}

// 用于显示：GFR Ⅱ期
```

---

## 12. 数据流向图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          患者建档流程                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐     ┌──────────────────┐     ┌──────────────────┐   │
│  │ App.jsx  │────▶│ localStorage     │────▶│ MainApp.jsx      │   │
│  │ 建档表单  │     │ - patientData    │     │ patients[]       │   │
│  └──────────┘     │ - newPatientData │     │ 状态初始化        │   │
│                   │ - appRole        │     └──────────────────┘   │
│                   └──────────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          护工端数据流                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐                                                   │
│  │ MainApp.jsx  │                                                   │
│  │ patients[]   │───────────────────────────────────────────┐      │
│  └──────┬───────┘                                           │      │
│         │                                                   │      │
│         ▼                                                   ▼      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ WaterManagement  │  │ PatientPage      │  │ SettingsPage     │ │
│  │ - 总览环形图      │  │ - 患者列表       │  │ - 统计卡片       │ │
│  │ - 风险排序卡片    │  │ - 快捷操作       │  │                  │ │
│  │ - 当前时间段      │  └────────┬─────────┘  └──────────────────┘ │
│  └──────────────────┘           │                                  │
│                                 ▼                                  │
│                    ┌──────────────────────┐                        │
│                    │ PatientDetailPage    │                        │
│                    │ - 患者详情           │                        │
│                    │ - 时间节点图表       │ ◀─── NEW              │
│                    │ - 时间线日志         │                        │
│                    │ - 尿液指标           │                        │
│                    └──────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          家属端数据流                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐                                               │
│  │ MainApp.jsx      │                                               │
│  │ familyTimeline[] │─────────────────────────────────────┐        │
│  └──────────────────┘                                     │        │
│                                                           ▼        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ FamilyHomePage   │  │FamilyAnalysisPage│  │FamilySettingsPage│ │
│  │ - 环形图         │  │ - 周统计         │  │ - 统计卡片       │ │
│  │ - 统计卡片       │  │ - 时间线日志     │  │                  │ │
│  │ - 今日时间线     │  │ - 筛选功能       │  │                  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       摄入/排出记录流程                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐│
│  │ PatientPage  │────▶│ IntakeModal /    │────▶│ 更新 patients[]  ││
│  │ 点击 +/- 按钮 │     │ OutputModal      │     │ - timeline.push  ││
│  └──────────────┘     │ 填写记录         │     │ - inMl/outMl++   ││
│                       └──────────────────┘     └──────────────────┘│
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       时间线删除流程                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐│
│  │PatientDetailPage │────▶│ 长按500ms触发    │────▶│ 确认删除     ││
│  │ 时间线条目       │     │ 删除确认UI       │     │ 更新timeline ││
│  └──────────────────┘     └──────────────────┘     └──────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## 13. 后端接口建议

### 13.1 患者相关

```typescript
// 获取患者列表
GET /api/patients
Response: Patient[]

// 获取单个患者详情
GET /api/patients/:id
Response: Patient

// 创建/更新患者（建档）
POST /api/patients
Body: PatientRegistration
Response: Patient

// 更新患者状态
PATCH /api/patients/:id
Body: Partial<Patient>
Response: Patient
```

### 13.2 时间线相关

```typescript
// 获取患者时间线
GET /api/patients/:id/timeline?date=2026-01-04
Response: TimelineEntry[]

// 添加时间线条目
POST /api/patients/:id/timeline
Body: {
  kind: 'intake' | 'output'
  source: DataSource
  valueMl: number
  title: string
  time: string
}
Response: TimelineEntry

// 删除时间线条目
DELETE /api/patients/:id/timeline/:entryId
Response: { success: boolean }
```

### 13.3 分时段数据（NEW）

```typescript
// 获取患者分时段水分数据
GET /api/patients/:id/period-data?date=2026-01-10
Response: PatientPeriodDataFromAPI

// 获取当前时间段数据（用于风险排序双环）
GET /api/patients/:id/current-period
Response: CurrentPeriodData

// 批量获取所有患者当前时间段数据（护工首页风险排序）
GET /api/patients/current-period-batch
Response: CurrentPeriodData[]
```

**响应示例**：

```json
// GET /api/patients/1/period-data?date=2026-01-10
{
  "patientId": 1,
  "date": "2026-01-10",
  "intakeByPeriod": {
    "08:00-11:00": 120,
    "11:00-14:00": 280,
    "14:00-17:00": 150,
    "17:00-20:00": 0
  },
  "outputByPeriod": {
    "08:00-11:00": 100,
    "11:00-14:00": 200,
    "14:00-17:00": 180,
    "17:00-20:00": 0
  }
}

// GET /api/patients/1/current-period
{
  "patientId": 1,
  "periodLabel": "17:00-20:00",
  "periodLimit": 300,
  "periodIntake": 85,
  "periodOutput": 60,
  "intakePercent": 28,
  "outputPercent": 20
}
```

### 13.4 设备数据推送（WebSocket）

```typescript
// 智能设备实时数据推送
WS /ws/device-data

// 消息格式
interface DeviceDataMessage {
  type: 'intake' | 'output'
  patientId: string | number
  deviceType: 'water_dispenser' | 'smart_cup' | 'smart_urinal'
  valueMl: number
  timestamp: string
  metadata?: {
    urineColor?: string      // 尿液颜色
    urineOsmolality?: number // 尿渗透压
    urineSpecificGravity?: number // 尿比重
  }
}
```

---

## 14. localStorage 键值清单

| 键名 | 类型 | 说明 |
|------|------|------|
| `patientData` | `PatientRegistration` | 当前建档数据 |
| `newPatientData` | `PatientRegistration` | 待添加到患者列表的完整建档数据 |
| `appRole` | `'family' \| 'caregiver'` | 当前用户角色 |

---

## 15. 版本记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0 | 2026-01-04 | 初始版本，包含所有数据结构定义 |
| 1.1 | 2026-01-10 | 新增：时间段配置、时间节点图表数据、风险排序双环数据、分时段API接口 |
