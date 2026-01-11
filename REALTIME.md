实时开发与本地测试（socket 模拟）

快速说明

1) 安装前端 socket 客户端依赖

```bash
# 在项目根目录
npm install socket.io-client
```

2) 安装 mock server 依赖并启动（仅用于本地开发）

```bash
# 在项目根目录（将 mock server dev/socket-server.js 作为 dev dependency）
npm install --save-dev socket.io
# 启动 mock socket 服务
node dev/socket-server.js
```

3) 启动前端（另一个终端）

```bash
npm run dev
```

默认前端会连接到 `http://localhost:4000`（可通过环境变量 `REACT_APP_SOCKET_URL` 覆盖）。

事件约定（前端监听）

- 事件名: `device:update`
- 消息体示例:
```json
{
  "patientId": 1,
  "kind": "intake",
  "time": "19:45",
  "data": {
    "valueMl": 200,
    "inMl": 200,
    "source": "mock-device",
    "sourceLabel": "模拟设备",
    "title": "饮水 200ml (模拟)"
  }
}
```

前端行为

- 护理端 (`appRole === 'caregiver'`)：根据 `patientId` 更新 `patients` 列表中对应患者的 `inMl/outMl`、尿检字段并将条目追加到 `timeline`。
- 家属端 (`appRole === 'family'`)：当 `patientId` 为 `current_patient`（或后端不提供 ID）时，将条目追加到 `familyTimeline`，并更新本地 `current_patient` 的尿检 / inMl/outMl。

其它说明

- 这是开发用的模拟服务；生产环境请用真实后端（建议使用 socket.io 或者 WebSocket）并遵循上述事件格式。
- 如需按患者 ID 精确路由，请确保后端发送与 `patients[].id` 对应的 `patientId`。
