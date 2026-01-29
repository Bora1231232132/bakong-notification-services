<template>
  <div class="w-full min-h-screen font-['IBM_Plex_Sans'] relative">
    <div class="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto relative">
      <div
        class="change-password-container grid grid-cols-1 lg:grid-cols-3 grid-rows-1 lg:grid-rows-4 gap-4 lg:gap-[60px] w-full h-full"
      >
        <div
          class="rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-[345px] mx-auto lg:mx-0 lg:w-[345px] h-auto lg:min-h-[232px] opacity-100 lg:row-span-2 lg:relative lg:overflow-visible"
        >
          <form
            ref="changePasswordFormRef"
            class="grid grid-cols-1 gap-3"
            @submit.prevent="handleChangePassword"
          >
            <div class="flex flex-col gap-1">
              <div class="flex items-end gap-1">
                <span class="font-medium text-sm leading-snug text-[#001346]"
                  >Current password</span
                >
                <span class="text-red-500 text-sm">*</span>
              </div>
              <div
                class="relative flex items-center w-full max-w-[345px] h-[56px] gap-[8px] border border-[rgba(0,19,70,0.1)] rounded-[8px] bg-white transition-all focus-within:border-[#0F4AEA] focus-within:shadow-[0_0_0_3px_rgba(15,74,234,0.1)]"
              >
                <input
                  :type="showCurrentPassword ? 'text' : 'password'"
                  v-model="formData.currentPassword"
                  class="flex-1 items-center border-none outline-none bg-transparent font-['IBM_Plex_Sans'] text-base leading-normal text-[#001346] pl-[24px] pr-4 py-2"
                  style="
                    padding-left: 24px !important;
                    padding-right: 16px !important;
                    padding-top: 15px !important;
                    padding-bottom: 8px !important;
                  "
                  :class="{ 'text-red-500': errors.currentPassword }"
                  placeholder="********"
                  autocomplete="current-password"
                  @input="clearFieldError('currentPassword')"
                />
                <button
                  type="button"
                  class="flex items-center justify-around w-8 h-8 border-none bg-transparent cursor-pointer rounded-md transition-all text-[rgba(0,19,70,0.6)] hover:bg-[rgba(0,19,70,0.05)] hover:text-[#001346]"
                  @click="toggleCurrentPasswordVisibility"
                  aria-label="Toggle current password visibility"
                >
                  <el-icon class="text-lg">
                    <View v-if="!showCurrentPassword" />
                    <Hide v-else />
                  </el-icon>
                </button>
              </div>
              <div v-if="errors.currentPassword" class="text-xs leading-snug text-red-500 mt-1">
                {{ errors.currentPassword }}
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1">
                <span class="font-medium text-sm leading-snug text-[#001346]">New password</span>
                <span class="text-red-500 text-sm">*</span>
              </div>
              <div
                class="relative flex items-center w-full max-w-[345px] h-[56px] gap-[8px] pt-[8px] pr-[8px] pb-[8px] pl-[8px] border border-[rgba(0,19,70,0.1)] rounded-[8px] bg-white transition-all focus-within:border-[#0F4AEA] focus-within:shadow-[0_0_0_3px_rgba(15,74,234,0.1)]"
              >
                <input
                  :type="showNewPassword ? 'text' : 'password'"
                  v-model="formData.newPassword"
                  class="flex-1 border-none outline-none bg-transparent font-['IBM_Plex_Sans'] text-base leading-normal text-[#001346] pl-[24px] pr-4 py-2"
                  style="
                    padding-left: 24px !important;
                    padding-right: 16px !important;
                    padding-top: 15px !important;
                    padding-bottom: 8px !important;
                  "
                  :class="{ 'text-red-500': errors.newPassword }"
                  placeholder="********"
                  autocomplete="new-password"
                  @input="clearFieldError('newPassword')"
                />
                <button
                  type="button"
                  class="flex items-center justify-center w-8 h-8 border-none bg-transparent cursor-pointer rounded-md transition-all text-[rgba(0,19,70,0.6)] hover:bg-[rgba(0,19,70,0.05)] hover:text-[#001346]"
                  @click="toggleNewPasswordVisibility"
                  aria-label="Toggle new password visibility"
                >
                  <el-icon class="text-lg">
                    <View v-if="!showNewPassword" />
                    <Hide v-else />
                  </el-icon>
                </button>
              </div>
              <div v-if="errors.newPassword" class="text-xs leading-snug text-red-500 mt-1">
                {{ errors.newPassword }}
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1">
                <span class="font-medium text-sm leading-snug text-[#001346]"
                  >Confirm new password</span
                >
                <span class="text-red-500 text-sm">*</span>
              </div>
              <div
                class="relative flex items-center w-full max-w-[345px] h-[56px] gap-[8px] pt-[8px] pr-[8px] pb-[8px] pl-[8px] border border-[rgba(0,19,70,0.1)] rounded-[8px] bg-white transition-all focus-within:border-[#0F4AEA] focus-within:shadow-[0_0_0_3px_rgba(15,74,234,0.1)]"
              >
                <input
                  :type="showConfirmPassword ? 'text' : 'password'"
                  v-model="formData.confirmPassword"
                  class="flex-1 border-none outline-none bg-transparent font-['IBM_Plex_Sans'] text-base leading-normal text-[#001346] pl-[24px] pr-4 py-2"
                  style="
                    padding-left: 24px !important;
                    padding-right: 16px !important;
                    padding-top: 15px !important;
                    padding-bottom: 8px !important;
                  "
                  :class="{ 'text-red-500': errors.confirmPassword }"
                  placeholder="********"
                  autocomplete="new-password"
                  @input="clearFieldError('confirmPassword')"
                />
                <button
                  type="button"
                  class="flex items-center justify-center w-8 h-8 border-none bg-transparent cursor-pointer rounded-md transition-all text-[rgba(0,19,70,0.6)] hover:bg-[rgba(0,19,70,0.05)] hover:text-[#001346]"
                  @click="toggleConfirmPasswordVisibility"
                  aria-label="Toggle confirm password visibility"
                >
                  <el-icon class="text-lg">
                    <View v-if="!showConfirmPassword" />
                    <Hide v-else />
                  </el-icon>
                </button>
              </div>
              <div v-if="errors.confirmPassword" class="text-xs leading-snug text-red-500 mt-1">
                {{ errors.confirmPassword }}
              </div>
            </div>
          </form>
          <div
            class="w-full max-w-[300px] h-auto min-h-[56px] opacity-100 flex flex-col sm:flex-row justify-start items-center gap-3 sm:gap-[15px] mt-[25px]!"
          >
            <button
              type="button"
              class="flex justify-center items-center gap-[8px] w-full sm:w-[285px] h-[56px] pt-[8px] pr-[16px] pb-[8px] pl-[16px] border-none rounded-[32px] bg-[#0F4AEA] text-white font-['IBM_Plex_Sans'] font-semibold text-[16px] cursor-pointer transition-all hover:bg-[#0d3ec7] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,74,234,0.3)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none whitespace-nowrap"
              :disabled="isLoading"
              @click="handleChangePassword"
            >
              <span v-if="!isLoading" class="text-sm whitespace-nowrap">Change Password</span>
              <span v-else class="text-sm whitespace-nowrap">Changing...</span>
              <el-icon v-if="!isLoading" class="text-sm">
                <ArrowRight />
              </el-icon>
            </button>
            <button
              type="button"
              class="flex justify-center items-center gap-[8px] w-full sm:w-[164px] h-[56px] pt-[8px] pr-[16px] pb-[8px] pl-[16px] border border-[rgba(0,19,70,0.2)] rounded-[32px] bg-white text-[#001346] font-['IBM_Plex_Sans'] font-semibold text-[16px] cursor-pointer transition-all hover:bg-[rgba(0,19,70,0.05)] hover:border-[rgba(0,19,70,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
              @click="router.push('/settings')"
              :disabled="isLoading"
            >
              Cancel
            </button>
          </div>
        </div>
        <div
          class="lg:block lg:col-span-2 lg:row-span-3 lg:col-start-2 lg:row-start-1 rounded-lg p-4 flex items-center justify-center"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElNotification } from 'element-plus'
import { View, Hide, ArrowRight } from '@element-plus/icons-vue'
import { userApi } from '@/services/userApi'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)

const changePasswordFormRef = ref()

const errors = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const clearFieldError = (field: string) => {
  if (errors.value[field as keyof typeof errors.value]) {
    errors.value[field as keyof typeof errors.value] = ''
  }
}

const toggleCurrentPasswordVisibility = () => {
  showCurrentPassword.value = !showCurrentPassword.value
}

const toggleNewPasswordVisibility = () => {
  showNewPassword.value = !showNewPassword.value
}

const toggleConfirmPasswordVisibility = () => {
  showConfirmPassword.value = !showConfirmPassword.value
}

const handleChangePassword = async () => {
  errors.value.currentPassword = ''
  errors.value.newPassword = ''
  errors.value.confirmPassword = ''

  let hasErrors = false

  if (!formData.value.currentPassword) {
    errors.value.currentPassword = 'Please enter your current password'
    hasErrors = true
  }

  if (!formData.value.newPassword) {
    errors.value.newPassword = 'Please enter your new password'
    hasErrors = true
  } else if (formData.value.newPassword.length < 6) {
    errors.value.newPassword = 'Password must be at least 6 characters long'
    hasErrors = true
  }

  if (!formData.value.confirmPassword) {
    errors.value.confirmPassword = 'Please confirm your new password'
    hasErrors = true
  } else if (formData.value.newPassword !== formData.value.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match'
    hasErrors = true
  }

  if (hasErrors) {
    return
  }

  try {
    isLoading.value = true

    const result = await userApi.changePassword(
      formData.value.currentPassword,
      formData.value.newPassword,
    )

    if (result.success) {
      ElNotification({
        title: 'Success',
        message: result.message || 'Password changed successfully!',
        type: 'success',
        duration: 3000,
      })

      // Clear form data
      formData.value.currentPassword = ''
      formData.value.newPassword = ''
      formData.value.confirmPassword = ''
      showCurrentPassword.value = false
      showNewPassword.value = false
      showConfirmPassword.value = false

      // Redirect to settings page after a short delay
      setTimeout(() => {
        router.push('/settings')
      }, 1500)
    } else {
      ElNotification({
        title: 'Error',
        message: result.message || 'Failed to change password. Please try again.',
        type: 'error',
        duration: 3000,
      })
    }
  } catch (error: any) {
    console.error('Settings change password error:', error)

    // Extract error message from various possible locations
    const errorMessage =
      error?.response?.data?.responseMessage ||
      error?.response?.data?.message ||
      error?.message ||
      'Failed to change password. Please try again.'

    const errorMessageLower = errorMessage.toLowerCase()

    // Handle authentication errors (401) - redirect to login
    if (
      error?.response?.status === 401 ||
      errorMessageLower.includes('authentication failed') ||
      errorMessageLower.includes('please login again') ||
      errorMessageLower.includes('session has expired') ||
      errorMessageLower.includes('token expired') ||
      errorMessageLower.includes('invalid token') ||
      errorMessageLower.includes('unauthorized')
    ) {
      // Clear auth state
      authStore.logout()

      ElNotification({
        title: 'Authentication Required',
        message: 'Your session has expired. Please login again.',
        type: 'error',
        duration: 3000,
      })
      setTimeout(() => {
        router.push('/login')
      }, 1500)
      return
    }

    // Handle validation errors - show field-specific errors
    if (errorMessage.toLowerCase().includes('current password')) {
      errors.value.currentPassword = errorMessage
    } else if (errorMessage.toLowerCase().includes('new password')) {
      errors.value.newPassword = errorMessage
    } else if (errorMessage.toLowerCase().includes('password')) {
      // Generic password error - show in current password field
      errors.value.currentPassword = errorMessage
    } else {
      ElNotification({
        title: 'Error',
        message: errorMessage,
        type: 'error',
        duration: 3000,
      })
    }
  } finally {
    isLoading.value = false
  }
}
</script>
