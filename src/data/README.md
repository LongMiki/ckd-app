# CKD 水分管理系统 - 数据层文档

## 目录结构

```
src/data/
├── index.ts           # 统一导出入口
├── types.ts           # TypeScript 类型定义 ⭐ 后端必读
├── thresholds.ts      # 阈值配置表
├── mockData.ts        # Mock 数据
├── patientService.ts  # 患者服务层
└── caregiverService.ts # 护工服务层
```

## 快速开始

### 前端使用

```typescript
// 统一从 data 目录导入
import {
  getPatientDashboard,
  getCaregiverDashboard,
  PatientDashboard,
  STATUS_COLORS,
} from '@/data'

// 调用服务
const result = await getPatientDashboard('patient_001')
if (result.success) {
  console.log(result.data)
}
```

### 切换到真实 API

在 `patientService.ts` 和 `caregiverService.ts` 中：

```typescript
// 改为 false 即可切换到真实 API
export const USE_MOCK = false
```

---

## API 接口规范

### 1. 患者基础信息

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/patients/:id` | 获取患者基础信息 |
| PUT | `/api/v1/patients/:id` | 更新患者信息 |

**响应格式：**
```json
{
  "success": true,
  "data": {
    "id": "patient_001",
    "patientName": "张阿姨",
    "age": 68,
    "weight": 62,
    "isCKD": true,
    "gfrStage": 2,
    "intakeLimit": 2200,
    "outputLimit": 1800
  }
}
```

### 2. 患者仪表盘

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/patients/:id/dashboard?date=YYYY-MM-DD` | 获取当日仪表盘 |

**响应格式：**
```json
{
  "success": true,
  "data": {
    "patientId": "patient_001",
    "date": "2026-01-10",
    "totalIntake": 890,
    "intakeLimit": 2200,
    "totalOutput": 620,
    "outputLimit": 1800,
    "urineSpecificGravity": 1.015,
    "urineOsmolality": 450,
    "urinationCount": 4,
    "netIntake": 270,
    "inOutRatio": 1.44,
    "status": "normal",
    "aiSummary": {
      "overall": "今日水分管理良好",
      "intakeText": "摄入量适中",
      "outputText": "排出正常"
    },
    "timeline": []
  }
}
```

### 3. 时间线数据

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/patients/:id/timeline?date=YYYY-MM-DD` | 获取时间线 |
| POST | `/api/v1/timeline` | 添加条目 |

**时间线条目格式：**
```json
{
  "id": "tl_001",
  "patientId": "patient_001",
  "kind": "intake",
  "source": "water_dispenser",
  "value": 200,
  "time": "08:15",
  "timestamp": "2026-01-10T08:15:00.000Z",
  "timeAgo": "4小时前",
  "title": "喝了一杯温水"
}
```

**source 可选值：**
- `water_dispenser` - 饮水机
- `camera` - 相机识别
- `urinal` - 尿壶传感器
- `manual` - 手动输入

### 4. 分时段数据

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/patients/:id/periods?date=YYYY-MM-DD` | 获取分时段数据 |
| GET | `/api/v1/patients/:id/current-period` | 获取当前时段 |

**时段配置：**
```
8:00-11:00   限量 300ml
11:00-14:00  限量 400ml
14:00-17:00  限量 300ml
17:00-20:00  限量 300ml
```

### 5. 护工仪表盘

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/caregiver/:id/dashboard?date=YYYY-MM-DD` | 获取护工仪表盘 |

**响应格式：**
```json
{
  "success": true,
  "data": {
    "caregiverId": "caregiver_001",
    "date": "2026-01-10",
    "totalPatients": 6,
    "emergencyCount": 3,
    "riskCount": 1,
    "normalCount": 2,
    "overallStatus": "emergency",
    "patients": []
  }
}
```

### 6. 患者列表

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/caregiver/:id/patients` | 获取患者列表 |
| GET | `/api/v1/caregiver/:id/patients/attention` | 需关注患者 |
| GET | `/api/v1/caregiver/:id/patients/sorted-by-risk` | 按风险排序 |

---

## 状态判定规则

### 患者状态

基于以下指标综合判定：

| 指标 | 正常范围 | 风险范围 | 紧急范围 |
|------|----------|----------|----------|
| 24h尿量 | 1000-2000ml | 800-1000 或 2000-2500 | <800 或 >2500 |
| 日入量 | 1500-2000ml | 1200-1500 或 2000-2200 | <1200 或 >2200 |
| 净摄入 | -200~+200ml | ±200~500 | >±500 |
| 出入比 | 0.8-1.2 | 0.6-0.8 或 1.2-1.5 | <0.6 或 >1.5 |
| 尿比重 | 1.010-1.025 | 1.005-1.010 或 1.025-1.030 | <1.005 或 >1.030 |

> 详见 `thresholds.ts` 中的 `PATIENT_THRESHOLDS`

### 护工整体状态

```
Emergency ≥ 2 人 OR Risk ≥ 5 人 → 紧急
Emergency = 1 人 OR Risk ≥ 3 人 → 风险
其他 → 正常
```

---

## GFR 分期配置

| 分期 | 入量上限 | 出量上限 |
|------|----------|----------|
| 正常 | 2400ml | 2000ml |
| GFR Ⅰ-Ⅱ期 | 2200ml | 1800ml |
| GFR Ⅲ期 | 2000ml | 1600ml |
| GFR Ⅳ-Ⅴ期 | 1500ml | 1000ml |

---

## 错误处理

所有 API 响应统一格式：

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
```

常见错误码：
- `NOT_FOUND` - 资源不存在
- `VALIDATION_ERROR` - 参数校验失败
- `NETWORK_ERROR` - 网络请求失败
- `HTTP_401` - 未授权
- `HTTP_500` - 服务器错误

---

## 完整类型定义

详见 [types.ts](./types.ts)
