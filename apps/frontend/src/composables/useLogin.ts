import { ref, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import type { FormInstance } from 'element-plus'
import type { IRequestLogin } from '../models/login'
import { useAppStore } from '../stores/app'
import { passwordFormat } from '../utils/helpers'
import { getRules } from '../utils/helpers'

export const useLogin = () => {
  const appStore = useAppStore()
  const { proceedLogin } = appStore
  const { isLoading } = storeToRefs(appStore)

  const loginFormRef = ref<FormInstance>()
  const loginFormData: IRequestLogin = reactive({
    Username: '',
    Password: '',
  })

  const passwordRule = () => passwordFormat(loginFormData.Password, true)
  const usernameRule = () => {
    if (!loginFormData.Username) {
      return 'Username is required'
    }
    return true
  }
  const rules = {
    Username: { customRule: usernameRule, required: true },
    Password: { customRule: passwordRule, required: true },
  }
  const loginRules = getRules(rules)

  const submitLogin = async (formRef: any) => {
    if (!formRef) return { success: false, error: 'Form reference not found' }

    try {
      const valid = await formRef.validate()
      if (!valid) return { success: false, error: 'Form validation failed' }

      const request: IRequestLogin = {
        Username: loginFormData.Username,
        Password: loginFormData.Password,
      }
      return await proceedLogin(request)
    } catch (error) {
      return { success: false, error: 'An error occurred during login' }
    }
  }

  return {
    isLoading,
    loginFormRef,
    loginRules,
    loginFormData,
    submitLogin,
  }
}
