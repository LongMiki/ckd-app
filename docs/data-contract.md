# 前端 → 后端 数据契约（概要）

本文件为前端给后端的快速字段契约说明，基于 `src/data/types.ts` 与 `src/data/mockData.ts`。
目的是让后端能快速了解前端期望的 API 返回字段、可选性与示例数据，便于接口对齐与联调。

---

## 目录
- 概览
- 通用约定
- 主要对象与字段说明（强制 / 可选）
  - TimelineEntry
  - PatientBasicInfo / PatientRegistration
  - PatientDashboard
  - PatientListItem
  - CaregiverDashboard
  - PatientPeriodData / CurrentPeriodData
- 示例：完整 JSON 片段（来自 `mockData.ts`）
- 建议的接口（示例）

---

## 概览
- 类型定义文件：`src/data/types.ts`（以此为权威说明）
- Mock 示例：`src/data/mockData.ts`

前端容错策略：许多字段为可选或可为 `null`（前端 normalize 层会补齐或回退默认值），因此后端在返回时可以选择性地省略非必需字段，但建议尽量返回 `id` / `patientId` / `date` / `kind` / `valueMl` 等核心字段以保证前端展示完整性。

---

## 通用约定
- 时间：后端优先返回 `timestamp`（ISO8601），前端可展示 `time`（如 `14:30`）和 `timeAgo`（相对时间，可由前端生成，后端可不必返回）。
- 数值：使用毫升（ml）作为摄入/排出统一单位，名称以 `valueMl` 为主；兼容字段 `value` 可能出现在旧接口中。
- 状态：`status` 枚举为 `'normal' | 'risk' | 'emergency'`。
- API 通用响应：参考 `ApiResponse<T>`（成功：{ success: true, data }, 失败：{ success: false, error }）。

---

## 主要对象与字段（精简）

### TimelineEntry（时间线条目）
- 必要字段：
  - `id` (string)
  - `patientId` (string)
  - `kind` ('intake' | 'output')
  - `source` (设备来源类型，例如 'water_dispenser' / 'camera' / 'urinal' / 'manual')
- 建议返回：
  - `valueMl` (number) 或 `value`（兼容），`timestamp` (ISO string), `time` (显示用字符串)
  - `title`, `imageUrl`, `aiRecognition`（拍照识别结果）、`urineSpecificGravity`（来自尿壶）等可选字段

### PatientBasicInfo / PatientRegistration
- 必要：`id`（后端生成）、`patientName`
- 可选：`age`, `weight`, `isCKD`, `gfrStage`, `avatar`, `bedNumber`, `intakeLimit`, `outputLimit`

### PatientDashboard（患者当日数据）
- 必要：`patientId`, `date`
- 建议返回：`totalIntake`, `totalOutput`, `inOutRatio`, `netIntake`, `urineSpecificGravity`, `urineOsmolality`, `urinationCount`, `status`, `timeline`（数组）
- AI summary 可以返回 `aiSummary` 对象：`{ overall, intakeText, outputText }`

### PatientListItem（护工端患者列表项）
- 必要：`id`
- 建议返回：`name`/`fullName`、`avatar`、`gfrStage`、`meta`、`totalIntake`、`totalOutput`、`intakeLimit`、`outputLimit`、`status`、`currentPeriod`（用于风险排序）及 `timeline`（可选）

### CaregiverDashboard（护工端汇总）
- 必要：`caregiverId`, `date`, `patients`（数组）
- 建议返回：患者统计（`totalPatients`, `emergencyCount`, `riskCount`, `needAttentionCount`）和汇总数值（`totalIntake`, `totalOutput` 等）以及 `aiSummary`（可选）

### PatientPeriodData / CurrentPeriodData
- `PatientPeriodData.periods` 以时段字符串为键，值含 `intake`, `output`, `limit`。
- `CurrentPeriodData` 用于排序，字段：`periodLabel`, `periodLimit`, `periodIntake`, `periodOutput`, `intakePercent`, `outputPercent`。

---

## 示例 JSON（摘录自 `src/data/mockData.ts`）

- TimelineEntry（示例）

```json
{
  "id": "tl_002",
  "patientId": "family_patient_001",
  "kind": "intake",
  "source": "camera",
  "valueMl": 180,
  "time": "12:30",
  "timestamp": "2026-01-10T12:30:00.000Z",
  "title": "午餐 · 一碗粥 + 青菜",
  "imageUrl": "/figma/analysis-food-thumb.png",
  "aiRecognition": { "foodType": "汤羹类", "estimatedWater": 180, "confidence": 85 }
}
```

- PatientDashboard（示例）

```json
{
  "patientId": "family_patient_001",
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
  "aiSummary": { "overall": "今日水分管理良好，各项指标正常" },
  "timeline": [ /* timeline items */ ]
}
```

- CaregiverDashboard（示例）

```json
{
  "caregiverId": "caregiver_001",
  "date": "2026-01-10",
  "totalPatients": 6,
  "emergencyCount": 3,
  "riskCount": 1,
  "normalCount": 2,
  "needAttentionCount": 4,
  "overallStatus": "emergency",
  "totalIntake": 4790,
  "totalOutput": 3510,
  "patients": [ /* patient list items */ ]
}
```

---

## 建议的后端接口（示例）

- GET /api/patients?page=1&pageSize=20
  - 返回：`ApiResponse<PaginatedResponse<PatientListItem>>`

- GET /api/patients/:id/dashboard?date=2026-01-10
  - 返回：`ApiResponse<PatientDashboard>`

- GET /api/patients/:id/timeline?date=2026-01-10
  - 返回：`ApiResponse<TimelineEntry[]>`

- GET /api/caregiver/:id/dashboard?date=2026-01-10
  - 返回：`ApiResponse<CaregiverDashboard>`

- POST /api/patients/:id/timeline
  - 请求体：`TimelineEntry`（部分字段由后端生成，如 `id`、`timestamp`）
  - 返回：`ApiResponse<{ ok: true }>` 或新创建条目

---

## 交付物清单（repo 内）
- `src/data/types.ts`：字段权威定义
- `src/data/mockData.ts`：示例数据
- `docs/data-contract.md`（本文件）：简要契约与示例

---

如果需要，我可以：
- 把 `mockData` 导出为一组 JSON 文件（例如 `docs/samples/family-dashboard.json` 等），便于后端快速导入测试；
- 或者根据你们后端的 API 风格把 OpenAPI 3.0 草案自动生成一个 `openapi.yaml`（需要确认哪些接口必须实现）。

请选择下一步（我会继续完成）：
- 生成 JSON 示例文件并提交到 `docs/samples/`；或
- 生成 OpenAPI 草案；或
- 直接把当前 `docs/data-contract.md` 提交并 push（我将完成并 push）。
