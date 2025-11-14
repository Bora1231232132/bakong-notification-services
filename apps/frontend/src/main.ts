import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { setupErrorHandler } from './plugins/errorHandler'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)
setupErrorHandler(app)
const authStore = useAuthStore()
authStore.initializeAuth()

const setupTokenRefresh = () => {
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && authStore.isAuthenticated) {
      await authStore.checkAndRefreshToken()
    }
  })

  window.addEventListener('focus', async () => {
    if (authStore.isAuthenticated) {
      await authStore.checkAndRefreshToken()
    }
  })

  const userInteractionEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
  let lastInteractionTime = Date.now()

  userInteractionEvents.forEach((event) => {
    document.addEventListener(
      event,
      async () => {
        const now = Date.now()

        if (now - lastInteractionTime > 30000 && authStore.isAuthenticated) {
          lastInteractionTime = now
          await authStore.checkAndRefreshToken()
        }
      },
      { passive: true },
    )
  })
}

setupTokenRefresh()

app.mount('#app')
