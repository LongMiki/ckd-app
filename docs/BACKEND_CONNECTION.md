# 前后端对接指南

## 架构概览

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   硬件设备       │      │   userver.py    │      │   前端 (Netlify) │
│ (Arduino/传感器) │─────▶│ (硬件采集电脑)   │◀────▶│   React App      │
│                 │ POST │ Flask :5000     │ HTTP │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                              │
                              ▼
                         ┌─────────┐
                         │ ngrok   │ (内网穿透)
                         └─────────┘
```

## 问题：为什么 Netlify 不能直接访问你的后端？

1. **Netlify 是静态托管**：只能提供 HTML/JS/CSS，无法运行服务器代码
2. **你的后端在局域网内**：`userver.py` 运行在另一台电脑，没有公网 IP
3. **浏览器安全策略**：CORS 会阻止跨域请求

## 解决方案：内网穿透

使用 **ngrok** 或 **Cloudflare Tunnel** 将你的 Flask 服务暴露到公网。

---

## 步骤 1：在硬件采集电脑上配置

### 1.1 确保 userver.py 允许跨域

你的 `userver.py` 已经有 `CORS(app)`，这是正确的。

### 1.2 安装 ngrok

```bash
# Windows (使用 Chocolatey)
choco install ngrok

# 或者直接下载
# https://ngrok.com/download
```

### 1.3 启动 userver.py

```bash
python userver.py
# 服务运行在 http://localhost:5000
```

### 1.4 启动 ngrok 穿透

```bash
ngrok http 5000
```

ngrok 会给你一个公网地址，例如：
```
Forwarding  https://abc123.ngrok.io -> http://localhost:5000
```

**记住这个地址**：`https://abc123.ngrok.io`

---

## 步骤 2：配置前端

### 2.1 创建 .env 文件

在项目根目录创建 `.env` 文件：

```env
# 填入 ngrok 给你的公网地址
VITE_USERVER_API_URL=https://abc123.ngrok.io

# 设为 false 以使用真实后端
VITE_USE_MOCK=false
```

### 2.2 本地测试

```bash
npm run dev
```

前端会自动连接到你的后端。

---

## 步骤 3：部署到 Netlify

### 3.1 在 Netlify 设置环境变量

1. 登录 Netlify Dashboard
2. 进入你的站点 → Site settings → Environment variables
3. 添加：
   - `VITE_USERVER_API_URL` = `https://abc123.ngrok.io`
   - `VITE_USE_MOCK` = `false`

### 3.2 重新部署

```bash
git add .
git commit -m "添加后端连接配置"
git push
```

Netlify 会自动重新部署。

---

## 前端如何使用后端数据

### 方式 1：直接调用 API（推荐）

```typescript
import { getLatestData, getDailyVolume } from '@/services/userverApi'

// 获取最新硬件数据
const result = await getLatestData()
if (result.success) {
  console.log('尿量:', result.data.analysis.volume_analysis.current_volume)
  console.log('颜色:', result.data.analysis.basic_analysis.color_analysis.color_name)
}

// 获取每日统计
const daily = await getDailyVolume()
if (daily.success) {
  console.log('今日总尿量:', daily.data.daily_stats.total_volume)
}
```

### 方式 2：转换为前端数据格式

```typescript
import { getLatestData, convertToTimelineEntry } from '@/services/userverApi'

// 获取数据并转换为时间线条目
const result = await getLatestData()
if (result.success) {
  const timelineEntry = convertToTimelineEntry(result.data, 'patient_001')
  // timelineEntry 可以直接添加到前端的时间线中
}
```

---

## userver.py 提供的 API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/data/latest` | GET | 获取最新硬件数据 |
| `/ai/latest` | GET | 获取最新 AI 分析 |
| `/volume/stats?days=N` | GET | 获取 N 天尿量统计 |
| `/volume/daily` | GET | 获取今日尿量统计 |
| `/color/analyze` | POST | 分析尿液颜色 |
| `/color/chart` | GET | 获取颜色对照表 |
| `/upload` | POST | 接收硬件数据（硬件调用） |

---

## 数据流说明

```
硬件传感器
    │
    ▼ POST /upload
userver.py (Flask)
    │
    ├─ 解析数据
    ├─ 颜色分析
    ├─ 尿量统计
    └─ AI 分析
    │
    ▼ GET /data/latest
前端 (userverApi.ts)
    │
    ├─ 获取最新数据
    ├─ 转换格式
    └─ 显示在界面上
```

---

## 常见问题

### Q: ngrok 地址每次重启都会变？

**A**: 免费版 ngrok 每次重启地址会变。解决方案：
1. 升级 ngrok 付费版（固定域名）
2. 使用 Cloudflare Tunnel（免费固定域名）
3. 将后端部署到云服务器（Railway/Render）

### Q: 前端和后端必须在同一仓库吗？

**A**: 不需要。它们通过 HTTP API 通信，可以完全独立部署。

### Q: 如果后端电脑关机了怎么办？

**A**: 前端会显示"无法连接后端"。你可以：
1. 设置 `VITE_USE_MOCK=true` 使用模拟数据
2. 将后端部署到云服务器（24小时在线）

### Q: 数据会丢失吗？

**A**: `userver.py` 会将数据保存到 `urine_data.json` 文件。但如果要长期保存，建议接入数据库。

---

## 文件结构

```
APP-Studio/
├── .env.example          # 环境变量示例
├── .env                   # 你的实际配置（不要提交到 Git）
├── src/
│   ├── services/
│   │   └── userverApi.ts  # 后端 API 调用封装
│   ├── data/              # 前端数据层（不修改）
│   └── vite-env.d.ts      # TypeScript 类型定义
├── userver.py             # 后端服务（在另一台电脑运行）
└── docs/
    └── BACKEND_CONNECTION.md  # 本文档
```

---

## 下一步

1. 在硬件采集电脑上运行 `userver.py` 和 `ngrok`
2. 将 ngrok 地址填入 `.env` 文件
3. 本地测试连接是否正常
4. 部署到 Netlify 并配置环境变量
