<template>
  <div class="min-h-screen p-4 md:p-8">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-lg p-6 md:p-8 flex flex-col gap-3">
        <div>
          <div
            class="w-full h-48 md:h-56 border border-dashed border-gray-300 rounded-lg text-center hover:border-blue-400 transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 custom-dashed-border"
            style="padding: 16px 32px"
            @click="triggerFileUpload"
            @dragover.prevent
            @drop.prevent="handleFileDrop"
          >
            <div class="w-[72px] h-[72px] text-gray-400">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                />
              </svg>
            </div>
            <p
              class="text-[#011246] font-bold"
              style="
                font-family: 'IBM Plex Sans', sans-serif;
                font-weight: 400;
                font-size: 16px;
                line-height: 150%;
                letter-spacing: 0%;
              "
            >
              Drag & drop here or choose files
            </p>
          </div>
          <div
            class="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 opacity-100"
            style="transform: rotate(0deg); margin-top: 12px"
          >
            <p
              class="text-[#011246]"
              style="
                font-family: 'IBM Plex Sans', sans-serif;
                font-weight: 400;
                font-size: 13px;
                line-height: 150%;
                letter-spacing: 0%;
              "
            >
              Supported format: PNG (120x120px)
            </p>
            <p
              class="text-[#011246]"
              style="
                font-family: 'IBM Plex Sans', sans-serif;
                font-weight: 400;
                font-size: 13px;
                line-height: 150%;
                letter-spacing: 0%;
                text-align: right;
              "
            >
              Maximum size: 800KB
            </p>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/png"
            @change="handleFileSelect"
            class="hidden"
          />
          <div v-if="selectedFile" class="mt-4 p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3">
              <img :src="filePreview" alt="Preview" class="w-12 h-12 object-cover rounded" />
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">{{ selectedFile.name }}</p>
                <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
              <button @click="removeFile" class="text-red-500 hover:text-red-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="w-full flex flex-col gap-[7px] opacity-100" style="transform: rotate(0deg)">
          <label
            class="text-[#011246]"
            style="
              font-family: 'IBM Plex Sans', sans-serif;
              font-weight: 400;
              font-size: 14px;
              line-height: 150%;
              letter-spacing: 0%;
            "
            >Type name <span class="text-red-500">*</span></label
          >
          <input
            v-model="typeName"
            type="text"
            placeholder="Product and feature"
            required
            class="w-full border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            style="height: 56px; border-radius: 8px; border-width: 1px; padding: 16px"
          />
        </div>
        <div
          class="flex flex-col sm:flex-row items-center gap-3 sm:gap-3 opacity-100"
          style="transform: rotate(0deg)"
        >
          <button
            @click="handleCreate"
            :disabled="!typeName.trim() || isLoading"
            class="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            style="height: 56px; border-radius: 32px; padding: 8px 16px; min-width: 117px"
          >
            <LoadingSpinner v-if="isLoading" class="w-4 h-4" />
            {{ isLoading ? 'Creating...' : 'Create now' }}
          </button>
          <button
            @click="handleCancel"
            class="w-full sm:w-auto border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            style="height: 56px; border-radius: 32px; padding: 8px 16px; min-width: 83px"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatFileSize } from '@/utils/helpers'
import { LoadingSpinner } from '@/components/common'

const router = useRouter()
const typeName = ref('')
const selectedFile = ref<File | null>(null)
const filePreview = ref('')
const fileInput = ref<HTMLInputElement>()
const isLoading = ref(false)
const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

const handleFileDrop = (event: DragEvent) => {
  const file = event.dataTransfer?.files[0]
  if (file) {
    processFile(file)
  }
}

const processFile = (file: File) => {
  if (file.type !== 'image/png') {
    alert('Please select a PNG file')
    return
  }
  if (file.size > 819200) {
    alert('File size must be less than 800KB')
    return
  }

  selectedFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    filePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const removeFile = () => {
  selectedFile.value = null
  filePreview.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleCancel = () => {
  router.back()
}

const handleCreate = async () => {
  if (!typeName.value.trim()) {
    alert('Please enter a type name')
    return
  }
  isLoading.value = true
  try {
    console.log('Creating notification type:', {
      name: typeName.value,
      file: selectedFile.value,
    })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    router.push('/templates')
  } catch (error) {
    console.error('Error creating notification type:', error)
    alert('Failed to create notification type')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.custom-dashed-border {
  border-style: dashed;
  border-width: 2px;
  border-image: repeating-linear-gradient(
      deg,
      #d1d5db 0,
      #d1d5db 12px,
      transparent 12px,
      transparent 20px
    )
    1;
}
</style>
