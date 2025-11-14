<template>
  <div class="w-full min-h-screen font-['IBM_Plex_Sans'] relative">
    <div class="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto relative">
      <div
        class="change-profile-container grid grid-cols-1 lg:grid-cols-3 grid-rows-1 lg:grid-rows-4 gap-4 lg:gap-[550px] w-full h-full max-w-7xl mx-auto"
      >
        <div
          class="rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-[345px] mx-auto lg:mx-0 lg:w-[345px] h-auto lg:h-[232px] opacity-100 lg:row-span-2 sm:max-w-[400px] md:max-w-[345px]"
        >
          <div class="flex flex-col gap-3">
            <ImageUpload
              v-model="selectedFile"
              accept-types="image/*"
              :max-size="5 * 1024 * 1024"
              format-text="Supported format: PNG, JPG"
              size-text="Maximum size: 5MB"
              @file-selected="handleFileSelected"
              @file-removed="handleFileRemoved"
              @error="handleUploadError"
            />
            <div v-if="errors.profilePicture" class="text-xs leading-snug text-red-500 mt-1">
              {{ errors.profilePicture }}
            </div>
          </div>
          <div
            class="w-full max-w-[259px] h-[56px] lg:absolute lg:w-[259px] lg:top-[355px] lg:left-0 opacity-100 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-[12px]"
            style="margin-top: -86px !important"
          >
            <button
              type="button"
              class="flex justify-center items-center gap-[8px] w-full sm:w-[285px] h-[56px] pt-[8px] pr-[16px] pb-[8px] pl-[16px] border-none rounded-[32px] bg-[#0F4AEA] text-white font-['IBM_Plex_Sans'] font-semibold text-[16px] cursor-pointer transition-all hover:bg-[#0d3ec7] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,74,234,0.3)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none whitespace-nowrap"
              @click="handleChangeProfile"
              :disabled="isLoading || !selectedFile"
            >
              <span v-if="!isLoading" class="text-sm whitespace-nowrap">Update Picture</span>
              <span v-else class="text-sm whitespace-nowrap">Updating...</span>
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
          class="lg:block lg:col-span-2 lg:row-span-3 lg:col-start-2 lg:row-start-1 flex items-center justify-center px-4 sm:px-6"
        >
          <div class="flex flex-col items-center justify-center w-full">
            <div
              class="w-full max-w-[609.47px] h-[344.13px] rounded-[25px] bg-[#00134608] opacity-100 relative flex items-center justify-center sm:h-auto sm:min-h-[200px] md:h-[300px] lg:h-[344.13px]"
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
                <button
                  class="flex items-center justify-center gap-2 w-full max-w-[204px] h-[56px] pt-2 pr-4 pb-2 pl-4 bg-[#0013460D] border-none rounded-[32px] text-[#001346] font-medium cursor-pointer transition-all duration-200 hover:bg-[#0013461A] backdrop-blur-[128px] text-xs sm:text-sm"
                >
                  <span class="font-medium">Create Notification</span>
                  <div
                    class="w-4 h-4 sm:w-5 sm:h-5 bg-[#001346] text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold"
                  >
                    +
                  </div>
                </button>
                <div
                  class="w-[48px] h-[48px] sm:w-[54px] sm:h-[54px] rounded-full overflow-hidden flex items-center justify-center bg-[#f0f0f0] flex-shrink-0"
                >
                  <div v-if="selectedFile" class="w-full h-full">
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
import { ArrowRight, User } from '@element-plus/icons-vue'
import ImageUpload from '@/components/common/ImageUpload.vue'

const router = useRouter()

const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isLoading = ref(false)

const errors = ref({
  profilePicture: '',
})

const getPreviewUrl = () => {
  return previewUrl.value || ''
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
    console.log('Calling settings change profile API...')

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const mockResponse = {
      success: true,
      message: 'Profile picture updated successfully',
    }

    console.log('Mock API response:', mockResponse)

    if (mockResponse.success) {
      console.log('Settings profile change successful')
      ElNotification({
        title: 'Success',
        message: 'Profile picture updated successfully!',
        type: 'success',
        duration: 2000,
      })

      selectedFile.value = null

      setTimeout(() => {
        router.push('/settings')
      }, 1500)
    }
  } catch (error) {
    console.error('Settings change profile error:', error)
    ElNotification({
      title: 'Error',
      message: 'Failed to update profile picture. Please try again.',
      type: 'error',
      duration: 2000,
    })
  } finally {
    isLoading.value = false
  }

  console.log('=== SETTINGS CHANGE PROFILE HANDLER END ===')
}
</script>
