import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/phone-report-analyzer/' : '/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'build'
  }
}))
