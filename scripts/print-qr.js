// scripts/print-qr.js
// 在终端打印本地 LAN 地址的二维码，便于手机扫码打开
// 用法：
//   node scripts/print-qr.js [port]
// 或使用 package.json 脚本：
//   npm run qr -- 3000

const os = require('os')
const qrcode = require('qrcode-terminal')

function getLocalIPv4() {
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

const portArg = process.argv[2] || process.env.PORT || '3000'
const hostIp = process.env.HOST_IP || getLocalIPv4()
const url = `http://${hostIp}:${portArg}`

console.log('\nScan this QR code with your phone to open:\n')
qrcode.generate(url, { small: true })
console.log('\nURL:', url, '\n')
