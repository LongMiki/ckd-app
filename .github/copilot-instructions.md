
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
This file has been moved to `docs/copilot-instructions.md` to reduce editor warnings in the `.github` folder.

Open `docs/copilot-instructions.md` for the full guidance.
  - 静态资源优先使用 `public/figma/`、`public/icons/`
