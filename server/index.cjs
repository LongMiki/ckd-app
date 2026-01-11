// server/index.cjs
// 单一 Node 服务：静态托管前端 build(`dist/`) + socket.io 实时通道
const path = require('path')
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
  }
})

const PORT = process.env.PORT || 3000

// 静态文件目录（生产构建输出）
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// SPA 回退
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

io.on('connection', (socket) => {
  console.log('socket connected', socket.id)

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id)
  })

  // 接受模拟或后端代理的 device:update 并广播给所有客户端
  socket.on('device:update', (msg) => {
    console.log('recv device:update', msg)
    // 直接广播给所有客户端（生产请做认证与校验）
    io.emit('device:update', msg)
  })
})

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
