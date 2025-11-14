<template>
  <div class="notification-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      label-position="top"
    >
      <div class="form-section">
        <h3 class="section-title">Basic Information</h3>

        <el-form-item label="Category" prop="category">
          <el-select v-model="formData.category" placeholder="Select category" style="width: 100%">
            <el-option
              v-for="category in categories"
              :key="category.value"
              :label="category.label"
              :value="category.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Title" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="Enter notification title"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="Content" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="4"
            placeholder="Enter notification content"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </div>

      <div class="form-section">
        <h3 class="section-title">Media</h3>

        <el-form-item label="Image">
          <div class="image-upload">
            <div v-if="!uploadedImage" class="upload-placeholder" @click="triggerFileSelect">
              <el-icon class="upload-icon"><Plus /></el-icon>
              <p>Click to upload image</p>
              <p class="upload-hint">Supports JPG, PNG, GIF up to 5MB</p>
            </div>

            <div v-else class="image-preview">
              <img :src="uploadedImage" alt="Preview" />
              <div class="image-actions">
                <el-button type="primary" size="small" @click="triggerFileSelect">
                  Change
                </el-button>
                <el-button type="danger" size="small" @click="removeImage"> Remove </el-button>
              </div>
            </div>

            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleFileUpload"
            />
          </div>
        </el-form-item>
      </div>

      <div class="form-section">
        <h3 class="section-title">Translation</h3>

        <el-form-item>
          <el-button type="primary" plain @click="handleAddKhmer">
            <el-icon><Plus /></el-icon>
            Add Khmer Translation
          </el-button>
        </el-form-item>
      </div>

      <div class="form-actions">
        <el-button @click="handleCancel"> Cancel </el-button>
        <el-button type="primary" :loading="isPublishing" @click="handlePublish">
          {{ isPublishing ? 'Publishing...' : 'Publish Notification' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useForm } from '@/composables/useForm'
import { useFileUpload } from '@/composables/useFileUpload'
import type { FormInstance } from 'element-plus'

interface FormData {
  category: string
  title: string
  content: string
  image: File | null
}

interface Props {
  initialData?: Partial<FormData>
  onSubmit?: (data: FormData) => Promise<{ success: boolean; error?: string }>
  onCancel?: () => void
  onSuccess?: (data: FormData) => void
  onError?: (error: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  initialData: () => ({
    category: 'Product & Features',
    title: '',
    content: '',
    image: null,
  }),
})

const emit = defineEmits<{
  submit: [data: FormData]
  cancel: []
  success: [data: FormData]
  error: [error: string]
}>()

const categories = ref([
  { label: 'Product & Features', value: 'Product & Features' },
  { label: 'System Maintenance', value: 'System Maintenance' },
  { label: 'Announcement', value: 'Announcement' },
  { label: 'Security Alert', value: 'Security Alert' },
  { label: 'Update', value: 'Update' },
])

const formRules: Record<string, any[]> = {
  category: [{ required: true, message: 'Please select a category', trigger: 'change' }],
  title: [
    { required: true, message: 'Please enter notification title', trigger: 'blur' },
    { min: 3, max: 100, message: 'Title must be between 3 and 100 characters', trigger: 'blur' },
  ],
  content: [
    { required: true, message: 'Please enter notification content', trigger: 'blur' },
    {
      min: 10,
      max: 1000,
      message: 'Content must be between 10 and 1000 characters',
      trigger: 'blur',
    },
  ],
}

const {
  formRef,
  formData,
  loading: isPublishing,
  rules,
  validateForm,
  submitForm,
  resetForm,
  updateFormData,
} = useForm({
  initialData: {
    category: props.initialData.category || 'Product & Features',
    title: props.initialData.title || '',
    content: props.initialData.content || '',
    image: props.initialData.image || null,
  },
  validationRules: formRules,
  onSubmit: async (data) => {
    emit('submit', data as FormData)
    return (await props.onSubmit?.(data as FormData)) || { success: true }
  },
  onSuccess: (data) => {
    emit('success', data as FormData)
    props.onSuccess?.(data as FormData)
  },
  onError: (error) => {
    emit('error', error)
    props.onError?.(error)
  },
  resetOnSuccess: true,
})

const uploadedImage = ref<string | null>(null)

const { fileInput, handleFileSelect, removeFile, clearFiles, triggerFileSelect } = useFileUpload({
  maxSize: 5 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  multiple: false,
  onUpload: async (files) => {
    if (files.length > 0) {
      updateFormData({ image: files[0] })
    }
  },
})

const handleFileUpload = (event: Event) => {
  handleFileSelect(event)

  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadedImage.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const removeImage = () => {
  uploadedImage.value = null
  updateFormData({ image: null })
  clearFiles()
}

const handlePublish = async () => {
  await submitForm()
}

const handleCancel = () => {
  emit('cancel')
  props.onCancel?.()
}

const handleAddKhmer = () => {
  console.log('Add Khmer translation feature coming soon!')
}
</script>

<style scoped>
.notification-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.form-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.section-title {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
  font-weight: 600;
}

.image-upload {
  width: 100%;
}

.upload-placeholder {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.upload-placeholder:hover {
  border-color: #409eff;
}

.upload-icon {
  font-size: 2rem;
  color: #c0c4cc;
  margin-bottom: 0.5rem;
}

.upload-hint {
  color: #909399;
  font-size: 0.9rem;
  margin: 0.5rem 0 0 0;
}

.image-preview {
  position: relative;
  display: inline-block;
}

.image-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.image-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #333;
}

:deep(.el-input__count) {
  color: #909399;
}
</style>
