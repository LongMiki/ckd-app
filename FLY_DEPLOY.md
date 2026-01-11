# Fly.io 部署说明

快速说明：本仓库已包含 `Dockerfile`、`fly.toml` 与 GitHub Actions 工作流，支持将项目部署到 Fly.io 并保留 socket.io 实时连接。

手动部署（开发者本地）

1. 安装 `flyctl`：

```bash
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"
```

2. 登陆并创建 app：

```bash
flyctl auth login
flyctl apps create <your-app-name>
```

3. 部署：

```bash
flyctl deploy --config fly.toml
```

自动部署（通过 GitHub Actions）

1. 在 GitHub 仓库设置中添加 Secret `FLY_API_TOKEN`（值为 `flyctl auth token` 生成的 token）。
2. 根据需要编辑 `fly.toml` 中的 `app` 字段（或留空由 Fly 分配）。
3. 推送到 `main` 分支将触发自动部署。

注意事项
- Fly 将在运行时提供 `PORT` 环境变量；容器应监听 `process.env.PORT`（`server/index.cjs` 已使用该方式）。
- 若需要自定义域名或 TLS，使用 Fly 控制台或 `flyctl certs` 配置。
