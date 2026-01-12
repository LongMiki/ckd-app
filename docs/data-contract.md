## 简要数据契约（供后端对接）

说明：本文件给出前端常用的数据结构与示例，基于 `src/data/types.ts` 与 `src/data/mockData.ts` 的使用场景。仅包含关键字段，便于后端实现接口返回。

---

**1. 患者列表 - GET /api/patients**
- 返回：数组，每项为患者列表项（用于列表页）
- 字段：
  - `id` (string): 患者唯一 id
  - `name` (string)
  - `age` (number)
  - `gender` ("male"|"female"|"other")
  - `avatar` (string|null): 头像 URL
  - `gfr` (number|null): 最近的肾小球滤过率（GFR）
  - `lastSeen` (ISO 8601 string|null)

示例：
```json
[{
  "id": "p-001",
  "name": "张三",
  "age": 68,
  "gender": "male",
  "avatar": "/figma/avatar/p-001.png",
  "gfr": 42.5,
  "lastSeen": "2025-12-31T08:30:00.000Z"
}]
```

---

**2. 患者详情与时间线 - GET /api/patient/:id**
- 返回：患者对象，包含基本信息与 `timeline` 数组
- `timeline` 条目字段（按时间降序或升序均可）：
  - `id` (string)
  - `type` ("intake" | "output" | "note" | "measurement")
  - `timestamp` (ISO 8601 string)
  - `volume` (number|null) 单位：ml（仅对 intake/output 有效）
  - `source` (string|null) 例如："caregiver"、"device"、"family"
  - `notes` (string|null)

患者对象附加字段：
  - `targetDailyIntake` (number|null) 单位 ml
  - `todayTotalIntake` (number|null) 单位 ml
  - `alerts` (string[])

示例：
```json
{
  "id": "p-001",
  "name": "张三",
  "age": 68,
  "gfr": 42.5,
  "targetDailyIntake": 1500,
  "todayTotalIntake": 740,
  "timeline": [
    {
      "id": "t-1001",
      "type": "intake",
      "timestamp": "2026-01-12T09:10:00.000Z",
      "volume": 250,
      "source": "caregiver",
      "notes": "早餐后"
    },
    {
      "id": "t-1000",
      "type": "measurement",
      "timestamp": "2026-01-12T07:00:00.000Z",
      "volume": null,
      "source": "device",
      "notes": "体重: 62kg"
    }
  ],
  "alerts": ["低 GFR: 42.5"]
}
```

---

**3. 家属端概览 - GET /api/family/dashboard**
- 返回示例字段（用于家属首页）
  - `familyTimeline` : TimelineEntry[] （见上）
  - `summary` : {
      `weeklyAvgIntake` (number), `trend` ("up"|"down"|"stable")
    }

示例：
```json
{
  "familyTimeline": [],
  "summary": {"weeklyAvgIntake": 1320, "trend": "stable"}
}
```

---

**4. 护理端看板 - GET /api/caregiver/dashboard**
- 返回关注患者的聚合信息，用于 `WaterManagement` 页面：
  - `patients` : PatientListItem[]
  - `alerts` : { patientId: string, message: string }[]
  - `overview` : { activePatients: number, needsAttention: number }

示例：
```json
{
  "patients": [],
  "alerts": [{"patientId":"p-002","message":"今天尚未补水"}],
  "overview": {"activePatients": 12, "needsAttention": 3}
}
```

---

**5. 新增补水/记录 - POST /api/patient/:id/intake**
- 请求体：
  - `timestamp` (ISO 8601 string, optional, 默认服务器时间)
  - `volume` (number, 必需) ml
  - `source` (string, optional)
  - `notes` (string, optional)
- 返回：更新后的 `timeline` 或成功状态 + 新条目的 id

示例请求体：
```json
{
  "timestamp": "2026-01-12T09:10:00.000Z",
  "volume": 250,
  "source": "caregiver",
  "notes": "白开水"
}
```

示例成功返回：
```json
{ "ok": true, "entryId": "t-1001" }
```

---

附录：字段约束建议
- `id`: 使用 UUID 或短字符串唯一标识，前端不依赖特定格式
- `timestamp`: ISO 8601（UTC）推荐，前端按本地时区展示
- `volume`: 非负整数（ml）

示例数据文件位置：
- 参考前端 mock 示例： `src/data/mockData.ts`

后续可选项：
- 我可以基于以上内容生成 OpenAPI / JSON Schema 文档（自动化校验）
- 或导出更详细的接口示例（按 endpoint 单独文件）
