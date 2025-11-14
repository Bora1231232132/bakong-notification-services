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
      const credentials = {
        username: request.Username,
        password: request.Password,
      }

      const result = await authStore.login(credentials)

      if (result.success && authStore.user) {
        storeUserName.value = authStore.user.username || authStore.user.email || ''
      }

      return result
    } catch (error) {
      console.error('Login error:', error)

      return { success: false, error: 'Login failed' }
    } finally {
      isLoading.value = false
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
