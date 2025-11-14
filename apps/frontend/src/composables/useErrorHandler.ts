import { ref, computed } from 'vue'
import { errorHandler } from '@/services/errorHandler'
import type { ErrorContext } from '@/services/errorHandler'

export interface ErrorState {
  hasError: boolean
  errorMessage: string | null
  errorCode: number | null
  isLoading: boolean
}

export function useErrorHandler(initialContext: ErrorContext = {}) {
  const errorState = ref<ErrorState>({
    hasError: false,
    errorMessage: null,
    errorCode: null,
    isLoading: false,
  })

  const context = ref<ErrorContext>({ ...initialContext })

  const hasError = computed(() => errorState.value.hasError)
  const errorMessage = computed(() => errorState.value.errorMessage)
  const errorCode = computed(() => errorState.value.errorCode)
  const isLoading = computed(() => errorState.value.isLoading)

  const handleApiError = (error: any, customContext?: ErrorContext) => {
    const mergedContext = { ...context.value, ...customContext }
    const message = errorHandler.handleApiError(error, mergedContext)

    errorState.value = {
      hasError: true,
      errorMessage: message,
      errorCode: error?.response?.data?.errorCode || 1,
      isLoading: false,
    }

    return message
  }

  const handleGeneralError = (error: any, customContext?: ErrorContext) => {
    const mergedContext = { ...context.value, ...customContext }
    const message = errorHandler.handleGeneralError(error, mergedContext)

    errorState.value = {
      hasError: true,
      errorMessage: message,
      errorCode: null,
      isLoading: false,
    }

    return message
  }

  const handleValidationError = (errors: any[], customContext?: ErrorContext) => {
    const mergedContext = { ...context.value, ...customContext }
    const message = errorHandler.handleValidationError(errors, mergedContext)

    errorState.value = {
      hasError: true,
      errorMessage: message,
      errorCode: 10,
      isLoading: false,
    }

    return message
  }

  const clearError = () => {
    errorState.value = {
      hasError: false,
      errorMessage: null,
      errorCode: null,
      isLoading: errorState.value.isLoading,
    }
  }

  const setLoading = (loading: boolean) => {
    errorState.value.isLoading = loading
  }

  const showSuccess = (message: string, customContext?: ErrorContext) => {
    const mergedContext = { ...context.value, ...customContext }
    errorHandler.showSuccess(message, mergedContext)
    clearError()
  }

  const showInfo = (message: string, customContext?: ErrorContext) => {
    const mergedContext = { ...context.value, ...customContext }
    errorHandler.showInfo(message, mergedContext)
  }

  const showWarning = (message: string, customContext?: ErrorContext) => {
    const mergedContext = { ...context.value, ...customContext }
    errorHandler.showWarning(message, mergedContext)
  }

  const updateContext = (newContext: Partial<ErrorContext>) => {
    context.value = { ...context.value, ...newContext }
  }

  const executeWithErrorHandling = async <T>(
    operation: () => Promise<T>,
    customContext?: ErrorContext,
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    setLoading(true)
    clearError()

    try {
      const data = await operation()
      setLoading(false)
      return { success: true, data }
    } catch (error) {
      const message = handleApiError(error, customContext)
      setLoading(false)
      return { success: false, error: message }
    }
  }

  const executeWithCallbacks = async <T>(
    operation: () => Promise<T>,
    options: {
      onSuccess?: (data: T) => void
      onError?: (error: string) => void
      successMessage?: string
      customContext?: ErrorContext
    } = {},
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    const { onSuccess, onError, successMessage, customContext } = options

    const result = await executeWithErrorHandling(operation, customContext)

    if (result.success && result.data) {
      if (successMessage) {
        showSuccess(successMessage, customContext)
      }
      onSuccess?.(result.data)
    } else if (result.error) {
      onError?.(result.error)
    }

    return result
  }

  return {
    errorState: errorState.value,
    hasError,
    errorMessage,
    errorCode,
    isLoading,
    context,

    handleApiError,
    handleGeneralError,
    handleValidationError,
    clearError,
    setLoading,
    showSuccess,
    showInfo,
    showWarning,
    updateContext,
    executeWithErrorHandling,
    executeWithCallbacks,
  }
}
