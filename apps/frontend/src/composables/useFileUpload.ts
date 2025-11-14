import { ref, computed } from 'vue'
import { ElNotification } from 'element-plus'

export interface FileUploadConfig {
  maxSize?: number
  allowedTypes?: string[]
  multiple?: boolean
  onUpload?: (files: File[]) => Promise<void>
  onError?: (error: string) => void
}

export function useFileUpload(config: FileUploadConfig = {}) {
  const {
    maxSize = 5 * 1024 * 1024,
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    multiple = false,
    onUpload,
    onError,
  } = config

  const files = ref<File[]>([])
  const previews = ref<string[]>([])
  const uploading = ref(false)
  const fileInput = ref<HTMLInputElement>()

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    }

    return null
  }

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve(e.target?.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      } else {
        resolve('')
      }
    })
  }

  const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const selectedFiles = Array.from(target.files || [])

    if (selectedFiles.length === 0) return

    const errors: string[] = []
    const validFiles: File[] = []

    for (const file of selectedFiles) {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    }

    if (errors.length > 0) {
      const errorMessage = errors.join('\n')
      ElNotification({
        title: 'Error',
        message: errorMessage,
        type: 'error',
        duration: 2000,
      })
      onError?.(errorMessage)
      return
    }

    if (!multiple && validFiles.length > 1) {
      ElNotification({
        title: 'Warning',
        message: 'Only one file can be selected',
        type: 'warning',
        duration: 2000,
      })
      return
    }

    if (!multiple) {
      files.value = [validFiles[0]]
    } else {
      files.value = [...files.value, ...validFiles]
    }

    try {
      const newPreviews = await Promise.all(validFiles.map((file) => createPreview(file)))

      if (!multiple) {
        previews.value = newPreviews
      } else {
        previews.value = [...previews.value, ...newPreviews]
      }
    } catch (error) {
      ElNotification({
        title: 'Error',
        message: 'Failed to create file previews',
        type: 'error',
        duration: 2000,
      })
    }

    if (onUpload) {
      try {
        uploading.value = true
        await onUpload(files.value)
        ElNotification({
          title: 'Success',
          message: 'Files uploaded successfully',
          type: 'success',
          duration: 2000,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        ElNotification({
          title: 'Error',
          message: errorMessage,
          type: 'error',
          duration: 2000,
        })
        onError?.(errorMessage)
      } finally {
        uploading.value = false
      }
    }
  }

  const removeFile = (index: number) => {
    files.value.splice(index, 1)
    previews.value.splice(index, 1)
  }

  const clearFiles = () => {
    files.value = []
    previews.value = []
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }

  const triggerFileSelect = () => {
    fileInput.value?.click()
  }

  const getFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const isImageFile = (file: File): boolean => {
    return file.type.startsWith('image/')
  }

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)
  }

  return {
    files: computed(() => files.value),
    previews: computed(() => previews.value),
    uploading: computed(() => uploading.value),
    fileInput,

    handleFileSelect,
    removeFile,
    clearFiles,
    triggerFileSelect,
    getFileSize,
    getFileExtension,
    isImageFile,
    downloadFile,
    validateFile,
  }
}
