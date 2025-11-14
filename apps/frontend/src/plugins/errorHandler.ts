import type { App } from 'vue'
import { errorHandler } from '@/services/errorHandler'

export function setupErrorHandler(app: App) {
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleGeneralError(event.reason, {
      operation: 'unhandled_promise_rejection',
      component: 'GlobalErrorHandler',
    })
  })

  window.addEventListener('error', (event) => {
    errorHandler.handleGeneralError(event.error, {
      operation: 'global_error',
      component: 'GlobalErrorHandler',
    })
  })

  app.config.errorHandler = (err, instance, info) => {
    errorHandler.handleGeneralError(err, {
      operation: 'vue_error',
      component: 'VueErrorHandler',
      timestamp: new Date(),
    })
  }

  app.config.globalProperties.$errorHandler = errorHandler
}

export { errorHandler }
