import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import type { IRequestLogin } from '@/models/login'
import { ElNotification } from 'element-plus'

export const useAppStore = defineStore('app', () => {
  const authStore = useAuthStore()
  const isLoading = ref(false)
  const storeUserName = ref('')

  const isAuthenticated = computed(() => authStore.isAuthenticated)

  const proceedLogin = async (request: IRequestLogin) => {
    isLoading.value = true

    try {
      // Normalize email: convert to lowercase and trim spaces
      const normalizedEmail = request.Email.toLowerCase().trim()

      const credentials = {
        email: normalizedEmail,
        password: request.Password,
      }

      const result = await authStore.login(credentials)

      if (result.success && authStore.user) {
        storeUserName.value =
          authStore.user.displayName || authStore.user.username || authStore.user.email || ''
      }

      return result
    } catch (err: any) {
      console.error('Login error:', err)
    
      return {
        success: false,
        error: err?.message || 'Login failed',
        errorCode: err?.response?.data?.errorCode,
        responseMessage: err?.response?.data?.responseMessage,
      }
    }    
  }

  const onLogout = () => {
    authStore.logout()
    storeUserName.value = ''
    ElNotification({
      title: 'Success',
      type: 'success',
      message: 'Logged out successfully',
    })
  }

  return {
    isLoading,
    storeUserName,
    isAuthenticated,
    proceedLogin,
    onLogout,
  }
})
