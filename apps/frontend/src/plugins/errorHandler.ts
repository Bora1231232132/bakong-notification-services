import type { App } from 'vue'
import { errorHandler } from '@/services/errorHandler'

// Extension-related errors that should be ignored
const IGNORED_ERRORS = [
  'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received',
  'message channel closed',
  'The message port closed before a response was received',
]

/**
 * Check if error is from browser extensions and should be ignored
 */
function isExtensionError(error: any): boolean {
  if (!error) return false

  const errorMessage = String(error?.message || error).toLowerCase()
  const errorStack = String(error?.stack || '').toLowerCase()

  return IGNORED_ERRORS.some(
    (ignoredMsg) =>
      errorMessage.includes(ignoredMsg.toLowerCase()) ||
      errorStack.includes(ignoredMsg.toLowerCase()),
  )
}

export function setupErrorHandler(app: App) {
  window.addEventListener('unhandledrejection', (event) => {
    // Suppress extension-related errors
    if (isExtensionError(event.reason)) {
      event.preventDefault()
      return
    }

    errorHandler.handleGeneralError(event.reason, {
      operation: 'unhandled_promise_rejection',
      component: 'GlobalErrorHandler',
    })
  })

  window.addEventListener('error', (event) => {
    // Suppress extension-related errors
    if (isExtensionError(event.error)) {
      event.preventDefault()
      return
    }

    errorHandler.handleGeneralError(event.error, {
      operation: 'global_error',
      component: 'GlobalErrorHandler',
    })
  })

  app.config.errorHandler = (err, instance, info) => {
    // Suppress extension-related errors
    if (isExtensionError(err)) {
      return
    }

    errorHandler.handleGeneralError(err, {
      operation: 'vue_error',
      component: 'VueErrorHandler',
      timestamp: new Date(),
    })
  }

  app.config.globalProperties.$errorHandler = errorHandler
}

export { errorHandler }
