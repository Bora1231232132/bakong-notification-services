import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Get the directory where this config file is located
const root = fileURLToPath(new URL('.', import.meta.url))

// Use environment variables directly (Vite automatically loads .env files)
// For Docker builds, these will come from process.env
const frontendPort = parseInt(process.env.VITE_FRONTEND_PORT || '3000', 10)
const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:4005'

export default defineConfig({
  root: root,
  publicDir: 'public',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@bakong/shared': fileURLToPath(new URL('../packages/shared/src', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['@bakong/shared'],
  },
  server: {
    port: frontendPort,
    host: true,
    proxy: {
      '/api': {
        target: apiBaseUrl,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err)
          })
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url)
          })
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url)
          })
        },
      },
      '/images': {
        target: apiBaseUrl,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/images/, '/api/v1/image'),
      },
    },
  },
  build: {
    rollupOptions: {
      external: [],
    },
    // Ensure public directory files are copied to dist root
    copyPublicDir: true,
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },
})
