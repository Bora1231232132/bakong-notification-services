import { ref, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import type { FormInstance } from 'element-plus'
import type { IRequestRegister, IRegisterFormData } from '../models/register'
import { UserRole } from '../stores/auth'
import { useAuthStore } from '../stores/auth'
import { passwordFormat } from '../utils/helpers'
import { getRules } from '../utils/helpers'

export const useRegister = () => {
  const authStore = useAuthStore()
  const { register } = authStore
  const { loading } = storeToRefs(authStore)

  const registerFormRef = ref<FormInstance>()
  const registerFormData: IRegisterFormData = reactive({
    username: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    role: UserRole.NORMAL_USER,
  })

  const passwordRule = () => passwordFormat(registerFormData.password, true)
  const confirmPasswordRule = () => {
    if (registerFormData.password !== registerFormData.confirmPassword) {
      return 'Passwords do not match'
    }
    return true
  }
  const usernameRule = () => {
    if (!registerFormData.username) {
      return 'Username is required'
    }
    if (registerFormData.username.length < 3) {
      return 'Username must be at least 3 characters long'
    }
    return true
  }
  const displayNameRule = () => {
    if (!registerFormData.displayName) {
      return 'Display name is required'
    }
    if (registerFormData.displayName.length < 2) {
      return 'Display name must be at least 2 characters long'
    }
    return true
  }
  const roleRule = () => {
    if (!registerFormData.role) {
      return 'Role is required'
    }
    return true
  }

  const rules = {
    username: { customRule: usernameRule, required: true },
    password: { customRule: passwordRule, required: true },
    confirmPassword: { customRule: confirmPasswordRule, required: true },
    displayName: { customRule: displayNameRule, required: true },
    role: { customRule: roleRule, required: true },
  }
  const registerRules = getRules(rules)

  const submitRegister = async (formRef: any) => {
    if (!formRef) return { success: false, error: 'Form reference not found' }

    try {
      const valid = await formRef.validate()
      if (!valid) return { success: false, error: 'Form validation failed' }
      const request: IRequestRegister = {
        username: registerFormData.username,
        password: registerFormData.password,
        displayName: registerFormData.displayName,
        role: registerFormData.role,
      }
      return await register(request)
    } catch (error) {
      return { success: false, error: 'An error occurred during registration' }
    }
  }

  return {
    loading,
    registerFormRef,
    registerRules,
    registerFormData,
    submitRegister,
  }
}
