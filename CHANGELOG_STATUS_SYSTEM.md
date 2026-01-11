# 数据结构变更追踪 - 患者状态系统

## 📅 更新时间
2026年1月4日

---

## 🎯 变更概述

实现了完整的**患者状态系统**，支持三种状态：严重(emergency)、注意(risk)、安全(normal)。状态会影响UI中的颜色显示、文本显示和统计计数。

---

## 📊 新增数据字段

### 1. **患者数据新增 `status` 字段**

```typescript
interface PatientData {
  // ... 现有字段
  status: 'emergency' | 'risk' | 'normal'  // 新增：患者状态
}
```

### 2. **状态配置常量**

```javascript
const PATIENT_STATUS = {
  emergency: { 
    key: 'emergency', 
    label: '严重', 
    color: '#F43859' 
  },
  risk: { 
    key: 'risk', 
    label: '注意', 
    color: '#FA8534' 
  },
  normal: { 
    key: 'normal', 
    label: '安全', 
    color: '#46C761' 
  }
}
```

---

## 📝 文件修改清单

### ✅ 护工端 - WaterManagement.jsx
**位置**: `src/WaterManagement.jsx`

**修改内容**:
1. ✅ 添加 `PATIENT_STATUS` 配置常量
2. ✅ 9个患者数据添加 `status` 字段
   - emergency: 陈阿姨(id:4), 钱奶奶(id:8)
   - risk: 李阿姨(id:2)
   - normal: 其他6位
3. ✅ 新增 `getStatusInfo()` 函数获取状态信息
4. ✅ 新增 `needAttentionCount` 计算需要关注人数 (emergency + risk)
5. ✅ 更新排序逻辑按状态排序 (emergency → risk → normal)
6. ✅ 动态显示"X位需要关注"
7. ✅ 风险卡片使用新状态系统显示标签
8. ✅ 主水分球传入 `statusColor` 参数

**代码片段**:
```javascript
// 计算需要关注人数
const needAttentionCount = patients.filter(
  p => p.status === 'emergency' || p.status === 'risk'
).length

// 护工端整体状态颜色
const overallStatusColor = PATIENT_STATUS[overallStatus]?.color || '#46C761'
```

---

### ✅ 护工端 - PatientPage.jsx
**位置**: `src/PatientPage.jsx`

**修改内容**:
1. ✅ 添加 `PATIENT_STATUS` 配置常量
2. ✅ 12个患者数据添加 `status` 字段
   - emergency: 陈阿姨(id:4), 钱奶奶(id:8)
   - risk: 李阿姨(id:2), 杨叔叔(id:11)
   - normal: 其他8位
3. ✅ 新增 `getStatusColor()` 函数
4. ✅ 水分球组件传入 `statusColor={getStatusColor(p.status)}`

---

### ✅ 护工端 - PatientDetailPage.jsx
**位置**: `src/PatientDetailPage.jsx`

**修改内容**:
1. ✅ 添加 `PATIENT_STATUS` 配置常量
2. ✅ 从 `patientData?.status` 读取状态
3. ✅ 水分球传入 `statusColor={statusInfo.color}`
4. ✅ 状态标签动态显示：
   - 文本: `{statusInfo.label}状态` (严重状态/注意状态/安全状态)
   - 颜色: 小点和文字应用状态颜色

**代码片段**:
```jsx
<div className="pd-status-pill" style={{ '--status-color': statusInfo.color }}>
  <img className="pd-status-dot" src={imgStatusDot} alt="" 
    style={{ filter: `drop-shadow(0 0 4px ${statusInfo.color})` }} />
  <div className="pd-status-text">{statusInfo.label}状态</div>
</div>
```

---

### ✅ 家属端 - FamilyHomePage.jsx
**位置**: `src/FamilyHomePage.jsx`

**修改内容**:
1. ✅ 添加 `PATIENT_STATUS` 配置常量
2. ✅ 新增 `patientStatus` 变量 (默认'normal')
3. ✅ 水分球传入 `statusColor={statusInfo.color}`
4. ✅ 状态标签动态显示颜色和文本

---

### ✅ 组件 - WaterRingChart.jsx
**位置**: `src/WaterRingChart.jsx`

**修改内容**:
1. ✅ 新增 props: `statusColor = '#46C761'`
2. ✅ 中心圆形使用 CSS 变量支持动态颜色
3. ✅ 渐变色根据 `statusColor` 动态生成

**代码片段**:
```jsx
<div 
  className="water-ring-center-circle"
  style={{
    '--status-gradient': `linear-gradient(145deg, ${statusColor}E6 0%, ${statusColor}CC 50%, ${statusColor}B3 100%)`,
    '--status-shadow': `rgba(${r}, ${g}, ${b}, 0.4)`
  }}
>
```

---

### ✅ 组件 - WaterRingChartMini.jsx
**位置**: `src/WaterRingChartMini.jsx`

**修改内容**:
1. ✅ 新增 props: `statusColor = '#46C761'`
2. ✅ 中心圆形使用 CSS 变量支持动态颜色
3. ✅ 与 WaterRingChart 同样的实现方式

---

### ✅ 样式 - WaterManagement.css
**位置**: `src/WaterManagement.css`

**修改内容**:
```css
/* 旧类名 → 新类名 */
.wm-risk-level.wm-serious   →  .wm-risk-level.wm-emergency
.wm-risk-level.wm-warning   →  .wm-risk-level.wm-risk
.wm-risk-level.wm-normal    →  .wm-risk-level.wm-normal  (保持不变)
```

---

### ✅ 样式 - WaterRingChart.css
**位置**: `src/WaterRingChart.css`

**修改内容**:
```css
.water-ring-center-circle {
  background: var(--status-gradient, linear-gradient(...));
  box-shadow: 0 4px 16px var(--status-shadow, rgba(70, 199, 97, 0.4)), ...;
}
```

---

### ✅ 样式 - WaterRingChartMini.css
**位置**: `src/WaterRingChartMini.css`

**修改内容**: 同 WaterRingChart.css

---

## 🎨 UI 影响范围

### 1. **护工端首页** (WaterManagement)
- ✅ "X位需要关注" - 动态计数
- ✅ 主水分球中心颜色 - 基于整体状态
- ✅ 风险卡片标签 - 严重/注意/安全 + 对应颜色

### 2. **护工端患者列表** (PatientPage)
- ✅ 水分球中心颜色 - 每个患者独立状态
- ⏳ 安全状态标签 (需要添加到UI)

### 3. **护工端患者详情** (PatientDetailPage)
- ✅ 水分球中心颜色
- ✅ 状态标签文本和颜色

### 4. **家属端首页** (FamilyHomePage)
- ✅ 水分球中心颜色
- ✅ 状态标签文本和颜色

---

## 🔄 状态判定逻辑

### 当前实现
⏳ **暂时硬编码** - 根据现有患者数据手动分配状态

### 待实现（等待数据判定条件）
```javascript
// 未来的判定函数示例
function calculatePatientStatus(patient) {
  const { inMl, outMl, gfr_stage, ... } = patient
  
  // TODO: 根据医学规则判定
  // 例如：
  // - 摄入/排出比例异常
  // - GFR分期严重程度
  // - 持续时长等
  
  return 'emergency' | 'risk' | 'normal'
}
```

---

## 📦 数据迁移指南

### 现有患者数据需要添加 `status` 字段

#### WaterManagement.jsx 患者数据
```javascript
const patients = [
  { id: 1, ..., status: 'normal' },    // 王叔叔
  { id: 2, ..., status: 'risk' },      // 李阿姨
  { id: 3, ..., status: 'normal' },    // 张叔叔
  { id: 4, ..., status: 'emergency' }, // 陈阿姨
  { id: 5, ..., status: 'normal' },    // 赵叔叔
  { id: 6, ..., status: 'normal' },    // 周阿姨
  { id: 7, ..., status: 'normal' },    // 孙叔叔
  { id: 8, ..., status: 'emergency' }, // 钱奶奶
  { id: 9, ..., status: 'normal' },    // 刘大爷
]
```

#### PatientPage.jsx 患者数据 (额外3位)
```javascript
const patients = [
  // ...前9位同上
  { id: 10, ..., status: 'normal' },   // 马阿姨
  { id: 11, ..., status: 'risk' },     // 杨叔叔
  { id: 12, ..., status: 'normal' },   // 徐奶奶
]
```

---

## 🧪 测试要点

### 验证清单
- [ ] 护工端首页：需要关注人数正确 (当前应显示"2位")
- [ ] 护工端首页：风险卡片按状态排序（严重 → 注意 → 安全）
- [ ] 护工端首页：水分球中心为绿色 (整体安全)
- [ ] 患者列表：每个患者水分球颜色正确
  - [ ] 陈阿姨、钱奶奶 → 红色 (#F43859)
  - [ ] 李阿姨、杨叔叔 → 橙色 (#FA8534)
  - [ ] 其他患者 → 绿色 (#46C761)
- [ ] 患者详情：状态标签文字动态变化
- [ ] 家属端：状态标签和水分球颜色正确

---

## 📌 下一步工作

1. ⏳ **实现状态判定算法** - 需要医学规则输入
2. ⏳ **添加患者列表的状态标签UI** - PatientPage需要显示状态标签
3. ⏳ **持久化患者状态** - 保存到localStorage或后端
4. ⏳ **状态变化动画** - 状态切换时的过渡效果
5. ⏳ **状态历史记录** - 追踪状态变化趋势

---

## 🔗 相关文件索引

### 核心文件
- `src/WaterManagement.jsx` - 护工端首页
- `src/PatientPage.jsx` - 患者列表
- `src/PatientDetailPage.jsx` - 患者详情
- `src/FamilyHomePage.jsx` - 家属端首页

### 组件文件
- `src/WaterRingChart.jsx` - 主水分球图表
- `src/WaterRingChartMini.jsx` - 迷你水分球图表

### 样式文件
- `src/WaterManagement.css`
- `src/WaterRingChart.css`
- `src/WaterRingChartMini.css`

### 文档文件
- `.github/copilot-instructions.md` - AI协作指南 (需更新)

---

## 💡 设计决策记录

### 为什么使用 CSS 变量？
允许运行时动态改变颜色，而不需要预定义所有状态的CSS类。

### 为什么状态配置重复在多个文件？
避免循环依赖，每个页面独立管理。未来可提取到 `src/constants/patientStatus.js`。

### 为什么使用十六进制颜色值？
便于计算RGB分量用于 `rgba()` 阴影效果。

---

**文档生成时间**: 2026年1月4日
**最后更新人**: GitHub Copilot
