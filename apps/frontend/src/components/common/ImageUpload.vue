<template>
  <div class="flex flex-col gap-3 w-[603px]">
    <div
      class="w-[603px] h-[213px] border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 p-8 bg-white hover:border-[#001346] hover:bg-gray-50"
      :class="{ 'border-[#001346] bg-gray-50': isDragOver }"
      @click="triggerFileUploadHandler"
      @dragover.prevent="handleDragOver"
      @drop.prevent="handleFileDropHandler"
      @dragleave="handleDragLeave"
    >
      <div v-if="!selectedFile && !props.existingImageUrl" class="flex flex-col items-center gap-4">
        <div class="w-[72px] h-[72px] flex items-center justify-center">
          <img
            src="@/assets/image/copy--file.png"
            alt="Upload Icon"
            class="w-full h-full object-cover"
          />
        </div>
        <p
          class="text-[#011246] font-normal text-base leading-[150%] tracking-[0%] font-['IBM_Plex_Sans']"
        >
          Drag & drop here or choose files
        </p>
      </div>
      <div v-else class="relative w-full h-full flex items-center justify-center py-[5px]">
        <img
          :src="selectedFile ? filePreview : props.existingImageUrl || ''"
          alt="Preview"
          class="w-full max-h-[200px] object-contain rounded-lg"
        />
        <button
          @click.stop="removeFile"
          class="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white border-none cursor-pointer flex items-center justify-center transition-colors duration-200 hover:bg-red-600"
        >
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
    <div class="w-[603px] h-5 flex justify-between items-center">
      <p
        class="text-[#011246] font-normal text-[13px] leading-[150%] tracking-[0%] font-['IBM_Plex_Sans'] m-0"
      >
        {{ formatText }}
      </p>
      <p
        class="text-[#011246] font-normal text-[13px] leading-[150%] tracking-[0%] font-['IBM_Plex_Sans'] m-0 text-right"
      >
        {{ sizeText }}
      </p>
    </div>
    <div
      v-if="errorMessage"
      class="w-[603px] bg-red-50 border border-red-200 rounded-lg p-4 pr-2 flex items-start gap-3 pl-2"
      role="alert"
      aria-live="assertive"
    >
      <el-icon :size="20" color="#DC2626" class="w-5 h-5 flex items-center justify-center flex">
        <InfoFilled />
      </el-icon>

      <p class="text-red-700 text-[13px] leading-[150%] font-['IBM_Plex_Sans']">
        {{ errorMessage }}
      </p>
    </div>
    <input
      ref="fileInput"
      type="file"
      :accept="acceptTypes"
      @change="handleFileSelectHandler"
      class="hidden"
    />
  </div>
</template>

<script setup lang="ts">
import { InfoFilled } from '@element-plus/icons-vue'
import { ref, computed, watch } from 'vue'
import { formatFileSize } from '@/utils/helpers'
import {
  processFile,
  handleFileSelect,
  handleFileDrop,
  triggerFileUpload,
} from '../../utils/helpers'

interface Props {
  acceptTypes?: string
  maxSize?: number
  formatText?: string
  sizeText?: string
  modelValue?: File | null
  existingImageUrl?: string
  validateAspectRatio?: boolean
}

interface Emits {
  (e: 'update:modelValue', file: File | null): void
  (e: 'file-selected', file: File): void
  (e: 'file-removed'): void
  (e: 'error', message: string): void
}

const props = withDefaults(defineProps<Props>(), {
  acceptTypes: 'image/png,image/jpeg',
  maxSize: 3 * 1024 * 1024,
  formatText: 'Supported format: PNG, JPG (2:1 W:H)',
  sizeText: 'Maximum size: 3MB',
  validateAspectRatio: true,
})

const emit = defineEmits<Emits>()

const selectedFile = ref<File | null>(props.modelValue || null)
const filePreview = ref('')
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const errorMessage = ref('')
watch(
  () => props.modelValue,
  (newValue) => {
    selectedFile.value = newValue as File | null
    if (newValue) {
      const reader = new FileReader()
      reader.onload = (e) => {
        filePreview.value = e.target?.result as string
      }
      reader.readAsDataURL(newValue)
    } else {
      filePreview.value = ''
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }
  },
  { immediate: true },
)

const maxSizeText = computed(() => {
  if (props.maxSize >= 1024 * 1024) {
    return `${Math.round(props.maxSize / (1024 * 1024))}MB`
  } else if (props.maxSize >= 1024) {
    return `${Math.round(props.maxSize / 1024)}KB`
  }
  return `${props.maxSize} bytes`
})

const triggerFileUploadHandler = () => {
  triggerFileUpload(fileInput.value)
}

const handleFileSelectHandler = (event: Event) => {
  handleFileSelect(event, (file: File) => {
    processFileHandler(file)
  })
}

const handleFileDropHandler = (event: DragEvent) => {
  isDragOver.value = false
  handleFileDrop(event, (file: File) => {
    processFileHandler(file)
  })
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const processFileSuccess = (file: File, previewUrl: string) => {
  errorMessage.value = ''
  selectedFile.value = file
  emit('update:modelValue', file)
  emit('file-selected', file)
  filePreview.value = previewUrl
}

const processFileHandler = (file: File) => {
  processFile(
    file,
    processFileSuccess,
    (error: string) => {
      errorMessage.value = error
    },
    props.validateAspectRatio,
    props.acceptTypes,
    props.maxSize,
  )
}

const removeFile = () => {
  selectedFile.value = null
  filePreview.value = ''
  errorMessage.value = ''
  emit('update:modelValue', null)
  emit('file-removed')

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>
