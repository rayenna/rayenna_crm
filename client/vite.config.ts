import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
// base: '/' required so CSS/JS chunk paths work on hard reload (Fix Help reload losing formatting)
export default defineConfig({
  base: '/',
  plugins: [react()],
  /** Pre-bundle markdown stack so dev server does not return 504 Outdated Optimize Dep after dependency changes. */
  optimizeDeps: {
    include: ['react-markdown'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
