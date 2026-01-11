在手机上扫码运行演示（局域网访问）

目标：让手机通过扫码访问本地开发服务器并看到实时设备数据（由本地 mock socket 提供）。

步骤：

1) 启动 mock socket 服务（可选，但用于演示设备数据）

```bash
npm run mock-socket
```

2) 在本地启动 Vite 开发服务器并允许局域网访问

```bash
npm run dev:lan
```

- 该命令等价于 `vite --host`，Vite 会监听 0.0.0.0 并在控制台打印 LAN 地址，例如 `http://192.168.1.42:3000`。

3) 获取你的机器局域网 IP（在 Windows PowerShell）

```powershell
ipconfig
# 查找 IPv4 地址，例如 192.168.1.42
```

4) 在手机上打开浏览器访问该地址，或用手机相机扫描生成的二维码（URL 为 `http://<你的IP>:3000`）。

- 如果你希望直接生成二维码并在终端查看，安装 `qrcode-terminal`：

```bash
# 可选：全局或本地安装一次
npm i -g qrcode-terminal
# 然后在 Node REPL 中生成，或使用：https://www.npmjs.com/package/qrcode-terminal
```

快速命令（推荐）

1. 一次性并行启动 mock socket 与前端（会在控制台显示 LAN 地址）：

```bash
npm run dev:all
```

2. 在另一个终端生成并打印二维码（或传端口）：

```bash
npm run qr -- 3000
# 或
node scripts/print-qr.js 3000
```

注意事项：

- 确保手机和开发机在同一 Wi-Fi 子网（同一局域网）。
- 防火墙可能阻止外部访问，请在 Windows 防火墙中允许 `node` 或 端口 `3000` 的入站。
- 如果在公司网络或受限网络（存在 VLAN/网段隔离），请连接到同一 Wi‑Fi 或建立热点。
- Vite 会自动开启 HMR（热重载），并在局域网下使用 websocket，已在 `vite.config.js` 中启用 `host: true`。

演示流程建议：

- 先在浏览器打开开发机上的 LAN 地址，确认页面加载正常；再用手机访问同一地址。
- 启动 `npm run mock-socket` 后，前端（在护理端/家属端切换）会收到 `device:update` 事件并更新 UI。