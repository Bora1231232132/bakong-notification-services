<template>
  <div class="flex flex-col gap-3 w-full">
    <div
      class="w-full h-[213px] border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 p-8 bg-white hover:border-[#001346] hover:bg-gray-50"
      :class="{ 'border-[#001346] bg-gray-50': isDragOver }"
      @click="triggerFileUploadHandler"
      @dragover.prevent="handleDragOver"
      @drop.prevent="handleFileDropHandler"
      @dragleave="handleDragLeave"
    >
      <div v-if="showUploadArea" class="flex flex-col items-center gap-4">
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
          :src="imageSource"
          alt="Preview"
          class="w-full max-h-[200px] object-contain rounded-lg"
        />
        <button
          @click.stop="removeFile"
          class="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white border-none cursor-pointer flex items-center justify-center transition-black duration-200 hover:bg-red-600"
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
    <div class="w-full h-5 flex justify-between items-center">
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
      class="w-full bg-red-50 border border-red-200 rounded-lg p-4 pr-2 flex items-start gap-3 pl-2"
      role="alert"
      aria-live="assertive"
    >
      <el-icon :size="20" color="#DC2626" class="w-5 h-5 flex items-center justify-center">
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
import { ElNotification } from 'element-plus'
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
  maxSize: 2 * 1024 * 1024, // 2MB per image (safer for batch uploads)
  formatText: 'Supported format: PNG, JPG (2:1 W:H or 880:440)',
  sizeText: 'Maximum size: 2MB (will be auto-compressed)',
  validateAspectRatio: true,
})

const emit = defineEmits<Emits>()

const selectedFile = ref<File | null>(props.modelValue || null)
const filePreview = ref('')
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const errorMessage = ref('')

// Initialize preview if modelValue exists
if (props.modelValue) {
  const reader = new FileReader()
  reader.onload = (e) => {
    filePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(props.modelValue)
}

watch(
  () => props.modelValue,
  (newValue) => {
    const previousFile = selectedFile.value
    selectedFile.value = newValue as File | null

    if (newValue) {
      // Only read file if it's a different file or we don't have a preview yet
      if (!filePreview.value || previousFile !== newValue) {
        const reader = new FileReader()
        reader.onload = (e) => {
          filePreview.value = e.target?.result as string
        }
        reader.readAsDataURL(newValue)
      }
    } else {
      // Don't clear filePreview when modelValue becomes null
      // This preserves the preview when modelValue temporarily becomes null (e.g., during validation errors)
      // The preview will only be cleared when the user explicitly removes the file via removeFile()
      // Only clear the file input value, but keep the preview
      if (fileInput.value && !props.existingImageUrl && !filePreview.value) {
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

// Computed property to check if we should show the upload area
const showUploadArea = computed(() => {
  return !selectedFile.value && !props.existingImageUrl && !filePreview.value
})

// Computed property for image source
const imageSource = computed(() => {
  return filePreview.value || props.existingImageUrl || ''
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

const processFileSuccess = (file: File, previewUrl: string, wasConverted?: boolean) => {
  errorMessage.value = ''
  selectedFile.value = file
  emit('update:modelValue', file)
  emit('file-selected', file)
  filePreview.value = previewUrl

  // Show success message if image was converted
  if (wasConverted) {
    // Determine aspect ratio message based on formatText prop and validateAspectRatio
    let message = `Image has been automatically adjusted to correct size (max ${maxSizeText.value})`

    if (props.validateAspectRatio) {
      const isProfilePicture = props.formatText?.includes('500x500px') || false
      const aspectRatioMessage = isProfilePicture
        ? 'aspect ratio (500x500px)'
        : 'aspect ratio (2:1 W:H or 880:440)'
      message += ` and ${aspectRatioMessage}`
    }

    message += '.'

    ElNotification({
      title: 'Image Converted',
      message,
      type: 'success',
      duration: 3000,
    })
  }
}

const processFileHandler = async (file: File) => {
  try {
    await processFile(
      file,
      processFileSuccess,
      (error: string) => {
        errorMessage.value = error
        emit('error', error)
      },
      props.validateAspectRatio,
      props.acceptTypes,
      props.maxSize,
      true, // autoConvert = true - automatically convert instead of rejecting
      2 / 1, // targetAspectRatio = 2:1 (as shown in UI)
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to process image'
    errorMessage.value = errorMsg
    emit('error', errorMsg)
  }
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
