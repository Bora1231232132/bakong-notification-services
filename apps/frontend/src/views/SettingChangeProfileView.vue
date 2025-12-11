<template>
  <div class="w-full min-h-screen font-['IBM_Plex_Sans'] relative">
    <div class="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full relative">
      <div
        class="change-profile-container grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full h-full"
      >
        <div class="rounded-2xl p-4 sm:p-6 lg:p-8 w-full h-auto opacity-100">
          <div class="flex flex-col gap-3">
            <ImageUpload
              v-model="selectedFile"
              accept-types="image/*"
              :max-size="2 * 1024 * 1024"
              format-text="Supported format: PNG, JPG (500x500px)"
              size-text="Maximum size: 2MB"
              :validate-aspect-ratio="false"
              @file-selected="handleFileSelected"
              @file-removed="handleFileRemoved"
              @error="handleUploadError"
            />
            <div v-if="errors.profilePicture" class="text-xs leading-snug text-red-500 mt-1">
              {{ errors.profilePicture }}
            </div>
          </div>
          <div
            class="w-full h-[56px] opacity-100 flex flex-col sm:flex-row justify-start items-center gap-3 sm:gap-[12px] !mt-4"
          >
            <button
                class="w-full sm:w-[197px] h-[56px] pt-[8px] pr-[16px] pb-[8px] pl-[16px] border-none rounded-[32px] bg-[#0F4AEA] text-white font-['IBM_Plex_Sans'] font-semibold text-[16px] cursor-pointer transition-all hover:bg-[#0F4AEA]-900 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none whitespace-nowrap"
                @click="handleChangeProfile"
              >
                <span>Change profile picture</span>
            </button>
            <button
                class="flex justify-center items-center gap-[8px] w-full sm:w-[83px] h-[56px] pt-[8px] pr-[16px] pb-[8px] pl-[16px]  rounded-[32px] bg-[rgba(0,19,70,0.05)] text-[#001346] font-['IBM_Plex_Sans'] font-semibold text-[16px] cursor-pointer transition-all hover:bg-[#0F4AEA]-900 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none whitespace-nowrap"
              style="height: 56px; border-radius: 32px; padding: 8px 16px; min-width: 83px"
                @click="router.push('/settings')"
                >
                  <span>Cancel</span>
              </button>
          </div>
        </div>
        <div class="lg:block flex items-center justify-center px-4 sm:px-6">
          <div class="flex flex-col items-center justify-center w-full">
            <div
              class="w-full h-[344.13px] rounded-[25px] bg-[#00134608] opacity-100 relative flex items-center justify-center sm:h-auto sm:min-h-[200px] md:h-[300px] lg:h-[344.13px]"
            >
              <div
                class="flex items-center gap-3 sm:gap-4 md:gap-5 p-3 sm:p-4 md:p-5 flex-col sm:flex-row relative w-full justify-center"
              >
                <div class="absolute -top-12 sm:-top-15 left-1/2 transform -translate-x-1/2 z-10">
                  <h3
                    class="text-base sm:text-lg font-semibold text-[#001346] text-center whitespace-nowrap"
                  >
                    Preview
                  </h3>
                </div>
                <el-button type="primary" class="create-notification-btn" disabled>
                  Create Notification
                  <div class="plus-icon">
                    <el-icon>
                      <CirclePlus />
                    </el-icon>
                  </div>
                </el-button>
                <div
                  class="w-[48px] h-[48px] sm:w-[54px] sm:h-[54px] rounded-full overflow-hidden flex items-center justify-center bg-[#f0f0f0] flex-shrink-0"
                >
                  <div v-if="getPreviewUrl()" class="w-full h-full">
                    <img
                      :src="getPreviewUrl()"
                      alt="Profile Preview"
                      class="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div v-else class="w-full h-full flex items-center justify-center bg-[#f0f0f0]">
                    <el-icon class="text-xl sm:text-2xl text-gray-400">
                      <User />
                    </el-icon>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElNotification } from 'element-plus'
import { ArrowRight, User, CirclePlus } from '@element-plus/icons-vue'
import ImageUpload from '@/components/common/ImageUpload.vue'
import Button from '@/components/common/Button.vue'
import { useAuthStore } from '@/stores/auth'
import { notificationApi } from '@/services/notificationApi'
import { authApi } from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()

const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isLoading = ref(false)

const errors = ref({
  profilePicture: '',
})

const getPreviewUrl = () => {
  return previewUrl.value || authStore.userAvatar || ''
}

const handleFileSelected = (file: File) => {
  selectedFile.value = file
  errors.value.profilePicture = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const handleFileRemoved = () => {
  selectedFile.value = null
  previewUrl.value = null
  errors.value.profilePicture = ''
}

const handleUploadError = (message: string) => {
  errors.value.profilePicture = message
}

const handleChangeProfile = async () => {
  console.log('=== SETTINGS CHANGE PROFILE SUBMISSION STARTED ===')
  console.log('Selected file:', selectedFile.value?.name)

  errors.value.profilePicture = ''

  if (!selectedFile.value) {
    errors.value.profilePicture = 'Please select a profile picture'
    return
  }

  try {
    isLoading.value = true
    console.log('Uploading profile picture...')

    // Upload image and update avatar in one API call
    const response = await authApi.uploadAvatar(selectedFile.value)
    console.log('Avatar uploaded and updated - full response:', response)
    console.log('Avatar uploaded and updated - response.data:', response.data)

    // Use image path directly from backend response
    const imagePath = response.data?.data?.image
    if (!imagePath) {
      throw new Error('Image path not found in response')
    }

    console.log('Image path from backend:', imagePath)

    const imageUrl = import.meta.env.DEV
      ? imagePath // Use relative URL in dev (goes through Vite proxy)
      : import.meta.env.VITE_API_BASE_URL && !imagePath.startsWith('http')
        ? `${import.meta.env.VITE_API_BASE_URL}${imagePath}`
        : imagePath

    console.log('Final image URL to use:', imageUrl)

    // Update the user avatar in the store
    authStore.updateUserAvatar(imageUrl)
    console.log('User avatar updated in store:', imageUrl)

    ElNotification({
      title: 'Success',
      message: 'Profile picture updated successfully!',
      type: 'success',
      duration: 2000,
    })

    selectedFile.value = null
    previewUrl.value = null

    setTimeout(() => {
      router.push('/settings')
    }, 1500)
  } catch (error: any) {
    console.error('Settings change profile error:', error)
    const errorMessage =
      error.response?.data?.responseMessage ||
      error.message ||
      'Failed to update profile picture. Please try again.'
    errors.value.profilePicture = errorMessage
    ElNotification({
      title: 'Error',
      message: errorMessage,
      type: 'error',
      duration: 3000,
    })
  } finally {
    isLoading.value = false
  }

  console.log('=== SETTINGS CHANGE PROFILE HANDLER END ===')
}
</script>

<style scoped>
.create-notification-btn {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 4px;
  width: 234px;
  height: 56px;
  background: rgba(0, 19, 70, 0.05);
  backdrop-filter: blur(64px);
  border-radius: 32px;
  flex: none;
  flex-grow: 0;
  color: #001346 !important;
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 150%;
  letter-spacing: 0;
  border: none;
  transition: all 0.3s ease;
  cursor: default;
}

.create-notification-btn :deep(span) {
  color: #001346 !important;
}

.create-notification-btn:hover {
  background: rgba(0, 19, 70, 0.05);
}

.create-notification-btn:disabled {
  opacity: 1;
  cursor: default;
}

.plus-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: 8px;
}

.plus-icon .el-icon {
  font-size: 24px;
  color: #001346;
}
</style>
