import { ref, reactive, computed } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElNotification } from 'element-plus'

export interface FormField {
  value: any
  rules?: any[]
  required?: boolean
}

export interface FormConfig<T> {
  initialData: T
  validationRules?: Record<keyof T, any[]>
  onSubmit?: (data: T) => Promise<{ success: boolean; error?: string }>
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
  resetOnSuccess?: boolean
}

export function useForm<T extends Record<string, any>>(config: FormConfig<T>) {
  const {
    initialData,
    validationRules = {},
    onSubmit,
    onSuccess,
    onError,
    resetOnSuccess = false,
  } = config

  const formRef = ref<FormInstance>()
  const loading = ref(false)
  const formData = reactive<T>({ ...initialData })

  const rules = computed(() => {
    const computedRules: Record<string, any[]> = {}

    Object.keys(formData as Record<string, any>).forEach((key) => {
      const fieldRules = (validationRules as Record<string, any[]>)[key] || []
      computedRules[key] = fieldRules
    })

    return computedRules
  })

  const resetForm = () => {
    Object.assign(formData as Record<string, any>, initialData)
    if (formRef.value) {
      formRef.value.clearValidate()
    }
  }

  const clearValidation = () => {
    if (formRef.value) {
      formRef.value.clearValidate()
    }
  }

  const validateForm = async (): Promise<boolean> => {
    if (!formRef.value) return false

    try {
      await formRef.value.validate()
      return true
    } catch (error) {
      return false
    }
  }

  const submitForm = async (): Promise<{ success: boolean; error?: string }> => {
    if (!onSubmit) {
      return { success: false, error: 'No submit handler provided' }
    }

    const isValid = await validateForm()
    if (!isValid) {
      return { success: false, error: 'Form validation failed' }
    }

    loading.value = true

    try {
      const result = await onSubmit(formData as T)

      if (result.success) {
        onSuccess?.(formData as T)
        if (resetOnSuccess) {
          resetForm()
        }
        ElNotification({
          title: 'Success',
          message: 'Operation completed successfully',
          type: 'success',
          duration: 2000,
        })
      } else {
        onError?.(result.error || 'Operation failed')
        ElNotification({
          title: 'Error',
          message: result.error || 'Operation failed',
          type: 'error',
          duration: 2000,
        })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      onError?.(errorMessage)
      ElNotification({
        title: 'Error',
        message: errorMessage,
        type: 'error',
        duration: 2000,
      })
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  const updateFormData = (updates: Partial<T>) => {
    Object.assign(formData as Record<string, any>, updates)
  }

  const setFieldValue = (field: keyof T, value: any) => {
    ;(formData as Record<string, any>)[field as string] = value
  }

  const getFieldValue = (field: keyof T) => {
    return (formData as Record<string, any>)[field as string]
  }

  return {
    formRef,
    formData,
    loading,
    rules,
    resetForm,
    clearValidation,
    validateForm,
    submitForm,
    updateFormData,
    setFieldValue,
    getFieldValue,
  }
}
