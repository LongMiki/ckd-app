
# Copilot Instructions for CKD Patient Hydration App

## 项目概览
本项目为基于 React 18 + Vite 的慢性肾病（CKD）患者补水监测应用，支持**双模式**（护理端/家属端），所有 UI 文本为**简体中文**。

## 快速开发指令
- 启动开发环境：`npm install && npm run dev`（自动打开浏览器）
- 构建生产包：`npm run build`

## 架构与核心模式
- 入口：`main.jsx` → `Root.jsx`，根据本地 `localStorage.appRole` 跳转 `App.jsx`（引导）或 `MainApp.jsx`（主应用）
- **双模式路由**：
  - 护理端：`WaterManagement`、`PatientPage`、`PatientDetailPage`、`DevicePage`、`SettingsPage`，底部导航见 `BottomNavigation.jsx`
  - 家属端：`FamilyHomePage`、`FamilyAnalysisPage`、`FamilyKnowledgePage`、`FamilySettingsPage`，底部导航见 `FamilyBottomNavigation.jsx`
- **状态管理**：无 Redux/Context，全部通过 `localStorage` + React 顶层状态（`MainApp.jsx`）传递
  - 患者列表：`patients` 状态在 `MainApp.jsx`，通过 props 下发
  - 时间线数据：家属端为 `familyTimeline`，护理端为 `patient.timeline`
  - 当前 Tab：`activeTab` 控制主内容渲染
- **数据层**（`src/data/`）：
  - `types.ts`：类型定义（如 PatientDashboard, TimelineEntry）
  - `thresholds.ts`：GFR 阈值与状态判定
  - `mockData.ts`：Mock 数据，`USE_MOCK = false` 时对接真实 API

## 组件与样式约定
- 每个组件为 `.jsx` + `.css` 配对，位于 `src/` 目录
  - 示例：`src/PatientPage.jsx` + `src/PatientPage.css`
- 组件模式：
  ```jsx
  import React from 'react'
  import './ComponentName.css'
  function ComponentName({ activeTab, setActiveTab }) {
    return <div className="component-name">...</div>
  }
  export default ComponentName
  ```
- 样式：
  - 固定视口 390×844px，移动端优先
  - 主题色：护理端 `#49BDD8`，家属端 `#2D5FFF`，切换时容器加 `.family-mode` 类
  - 静态资源优先使用 `public/figma/`、`public/icons/`

## 数据结构与判定
- 患者基本信息（写入 localStorage，见 `App.jsx`）：
  ```js
  {
    id: 'current_patient',
    user_type: 'family' | 'caregiver',
    patient_name: string | null,
    age: number | null,
    weight: number | null,
    is_ckd_patient: boolean,
    gfr_stage: 1 | 2 | 3 | 4 | 5 | null,
  }
  ```
- 患者状态对象（`MainApp.jsx`）：
  ```js
  {
    id: number | 'current_patient',
    name: string, gfrStage: 1-5 | null,
    inMl: number, outMl: number,           // 当日摄入/排出 (ml)
    inMlMax: number, outMlMax: number,     // 目标上限
    urineOsmolality: number | null,        // 尿渗透压 (mOsm/kg)
    urineSpecificGravity: number | null,   // 尿比重
    status: 'normal' | 'risk' | 'emergency',
    timeline: TimelineEntry[]
  }
  ```
- 时间线条目（入量/出量日志）：
  ```js
  {
    id: 'drink-1',
    kind: 'intake' | 'output',
    source: 'water_dispenser' | 'camera' | 'urinal' | 'manual',
    time: '19:45',
    sourceLabel: '饮水机',
    title: '喝了一杯白水',
    valueMl: 200
  }
  ```
- GFR 分期展示：
  ```js
  const roman = { 1: 'Ⅰ', 2: 'Ⅱ', 3: 'Ⅲ', 4: 'Ⅳ', 5: 'Ⅴ' }
  const gfr = data?.is_ckd_patient && data?.gfr_stage ? `GFR ${roman[data.gfr_stage]}期` : 'GFR'
  ```
- 状态色彩（见 `thresholds.ts`）：
  ```js
  import { STATUS_COLORS, STATUS_LABELS } from './data/thresholds'
  // STATUS_COLORS: { normal: '#10B981', risk: '#F59E0B', emergency: '#EF4444' }
  ```

## 新功能开发流程
- 新页面：
  1. 新建 `NewPage.jsx` + `NewPage.css` 于 `src/`
  2. 在 `MainApp.jsx` 引入并添加 `{activeTab === 'newTab' && <NewPage />}`
  3. 更新底部导航组件
- 新患者字段：需同步更新 `FamilyHomePage.jsx`、`FamilyAnalysisPage.jsx`、`MainApp.jsx`、`PatientDetailPage.jsx`

## 依赖与集成
- 主要依赖：
  - `recharts`（圆环图，见 `WaterRingChart.jsx`、`RiskDoubleRing.jsx`）
  - `framer-motion`（动画，见 `FamilyAnalysisPage.jsx`）
  - `socket.io-client`（设备实时数据，待集成）
- 后端接口规范见 `src/data/README.md`，`txe.py` 为后端原型，尚未集成

## 注意事项
- 旧数据兼容：老数据用 `role: '我是家属'`，新数据用 `user_type: 'family'`
- 切换角色会强制跳转到设置页
- 资源优先本地 `/figma/` 路径

---
如有不清楚或遗漏之处，请反馈以便补充完善。
