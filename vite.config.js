import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/userver': {
        target: 'https://symmetrical-progravid-benito.ngrok-free.dev',
        changeOrigin: true,
        secure: true,
        headers: {
          'ngrok-skip-browser-warning': '1',
        },
        rewrite: (path) => path.replace(/^\/userver/, ''),
      },
    },
    allowedHosts: [
      'd64a6676525bef0b-175-13-211-118.serveousercontent.com'
    ]
  }
  ,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          recharts: ['recharts']
        }
      }
    }
  }
})
