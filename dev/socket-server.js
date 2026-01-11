// dev/socket-server.js
// 本地 mock socket.io 服务，用于向前端推送设备事件
// 运行: 
//   npm i socket.io --save-dev
//   node dev/socket-server.js

const http = require('http')
const { Server } = require('socket.io')

const server = http.createServer()
const io = new Server(server, {
  cors: {
    origin: '*',
  }
})

const PORT = process.env.PORT || 4000

io.on('connection', (socket) => {
  console.log('client connected', socket.id)

  socket.on('hello', (msg) => {
    console.log('hello from client', msg)
  })

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id)
  })
})

// 随机产生事件并广播
const patientIds = [1,2,3,4,5,6,7,8,9,10,11,12, 'current_patient']
const kinds = ['intake', 'output']

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function emitRandomEvent() {
  const patientId = patientIds[randInt(0, patientIds.length - 1)]
  const kind = kinds[randInt(0, kinds.length - 1)]
  const value = randInt(50, 400)
  const msg = {
    patientId,
    kind,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    data: {
      valueMl: value,
      inMl: kind === 'intake' ? value : 0,
      outMl: kind === 'output' ? value : 0,
      source: 'mock-device',
      sourceLabel: '模拟设备',
      title: kind === 'intake' ? `饮水 ${value}ml (模拟)` : `出量 ${value}ml (模拟)`,
    }
  }

  io.emit('device:update', msg)
  console.log('emit device:update', JSON.stringify(msg))
}

// 每 6-12 秒发送一次事件
setInterval(emitRandomEvent, randInt(6000, 12000))

server.listen(PORT, () => {
  console.log(`Mock socket server running on http://localhost:${PORT}`)
})
