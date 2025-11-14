import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // Get the directory where this config file is located
  const root = fileURLToPath(new URL('.', import.meta.url))
  // Load env file based on `mode` - use root directory for env files
  const env = loadEnv(mode, root, '')

  // Default values for development
  const frontendPort = parseInt(env.VITE_FRONTEND_PORT || '3000', 10)
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:4005'

  return {
    root: root,
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
    },
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    },
  }
})
