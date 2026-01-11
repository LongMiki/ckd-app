import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    allowedHosts: [
      'd64a6676525bef0b-175-13-211-118.serveousercontent.com'
    ]
  }
})
