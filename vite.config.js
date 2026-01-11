import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 允许局域网访问（0.0.0.0）
    port: 3000,
    open: true,
    hmr: {
      protocol: 'ws',
    },
    // 若需要限制允许的主机，可把 host 列表放到环境变量中
    allowedHosts: [
      'd64a6676525bef0b-175-13-211-118.serveousercontent.com'
    ]
  }
})
