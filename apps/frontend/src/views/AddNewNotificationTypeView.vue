<template>
  <div class="min-h-screen p-4 md:p-8">
    <!-- Main Content Container with responsive dimensions -->
    <div class="max-w-2xl mx-auto">
      <!-- Loading State -->
      <div
        v-if="loadingData"
        class="bg-white rounded-lg p-6 md:p-8 flex flex-col items-center justify-center gap-4"
        style="min-height: 400px"
      >
        <LoadingSpinner class="w-8 h-8" />
        <p class="text-gray-600">Loading category type...</p>
      </div>
      <!-- Notification Type Form -->
      <div v-else class="bg-white rounded-lg p-6 md:p-8 flex flex-col gap-3">
        <!-- File Upload Section (disabled in view mode, enabled in edit mode) -->
        <div v-if="isViewMode" class="flex flex-col gap-3 w-full">
          <div
            v-if="existingImageUrl"
            class="w-full h-[213px] border-2 border-dashed border-gray-300 rounded-lg text-center flex flex-col items-center justify-center gap-4 p-8 bg-white"
          >
            <img
              :src="existingImageUrl"
              alt="Category Type Icon"
              class="w-full max-h-[200px] object-contain rounded-lg"
            />
          </div>
          <div
            v-else
            class="w-full h-[213px] border-2 border-dashed border-gray-300 rounded-lg text-center flex flex-col items-center justify-center gap-4 p-8 bg-white"
          >
            <p class="text-gray-400">No icon available</p>
          </div>
        </div>
        <ImageUpload
          v-else
          v-model="selectedFile"
          accept-types="image/png"
          :max-size="819200"
          format-text="Supported format: PNG (120x120px)"
          size-text="Maximum size: 800KB"
          :validate-aspect-ratio="false"
          :existing-image-url="existingImageUrl"
          @file-selected="handleFileSelected"
          @file-removed="handleFileRemoved"
          @error="handleUploadError"
        />

        <!-- Type Name Input -->
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
            :disabled="isViewMode"
            :readonly="isViewMode"
            class="w-full border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            style="height: 56px; border-radius: 8px; border-width: 1px; padding: 16px"
          />
        </div>

        <!-- Action Buttons (hidden in view mode) -->
        <div
          v-if="!isViewMode"
          class="flex flex-col sm:flex-row items-center gap-3 sm:gap-3 opacity-100"
          style="transform: rotate(0deg)"
        >
          <button
            @click="isEditMode ? handleUpdate() : handleCreate()"
            :disabled="!typeName.trim() || isLoading"
            class="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            style="height: 56px; border-radius: 32px; padding: 8px 16px; min-width: 117px"
          >
            <LoadingSpinner v-if="isLoading" class="w-4 h-4" />
            {{
              isLoading
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update now'
                  : 'Create now'
            }}
          </button>
          <button
            @click="handleCancel"
            class="w-full sm:w-auto border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            style="height: 56px; border-radius: 32px; padding: 8px 16px; min-width: 83px"
          >
            Cancel
          </button>
        </div>
        <!-- Back button for view mode -->
        <div
          v-else
          class="flex flex-col sm:flex-row items-center gap-3 sm:gap-3 opacity-100"
          style="transform: rotate(0deg)"
        >
          <button
            @click="handleCancel"
            class="w-full sm:w-auto border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            style="height: 56px; border-radius: 32px; padding: 8px 16px; min-width: 83px"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LoadingSpinner, ImageUpload } from '@/components/common'
import { categoryTypeApi, type CategoryType } from '@/services/categoryTypeApi'
import { useCategoryTypesStore } from '@/stores/categoryTypes'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const categoryTypesStore = useCategoryTypesStore()

// Check if in view or edit mode
const isViewMode = computed(() => route.name === 'view-template')
const isEditMode = computed(() => route.name === 'edit-template')
const categoryTypeId = computed(() => {
  if ((isViewMode.value || isEditMode.value) && route.params.id) {
    return parseInt(route.params.id as string)
  }
  return null
})

// Form data
const typeName = ref('')
const selectedFile = ref<File | null>(null)
const isLoading = ref(false)
const existingImageUrl = ref<string>('')
const existingName = ref<string>('')
const loadingData = ref(false)

const { handleApiError, showSuccess } = useErrorHandler({
  operation: isViewMode.value
    ? 'viewCategoryType'
    : isEditMode.value
      ? 'updateCategoryType'
      : 'createCategoryType',
})

// File handling
const handleFileSelected = (file: File) => {
  selectedFile.value = file
}

const handleFileRemoved = () => {
  selectedFile.value = null
}

const handleUploadError = (message: string) => {
  ElMessage.error(message)
}

// Fetch category type data for view/edit mode
const fetchCategoryType = async () => {
  if ((!isViewMode.value && !isEditMode.value) || !categoryTypeId.value) return

  loadingData.value = true
  try {
    const categoryType = await categoryTypeApi.getById(categoryTypeId.value)
    typeName.value = categoryType.name
    existingName.value = categoryType.name

    // Load icon
    try {
      const iconUrl = await categoryTypeApi.getIcon(categoryTypeId.value)
      existingImageUrl.value = iconUrl
    } catch (error) {
      console.warn('Failed to load icon:', error)
    }
  } catch (error) {
    handleApiError(error, { operation: 'fetchCategoryType' })
    router.back()
  } finally {
    loadingData.value = false
  }
}

// Actions
const handleCancel = () => {
  router.back()
}

const handleCreate = async () => {
  if (!typeName.value.trim()) {
    ElMessage.warning('Please enter a type name')
    return
  }

  if (!selectedFile.value) {
    ElMessage.warning('Please select an icon file')
    return
  }

  isLoading.value = true

  try {
    const created = await categoryTypeApi.create(typeName.value.trim(), selectedFile.value)

    // Add to store and clear cache
    categoryTypesStore.addCategoryType(created)
    categoryTypesStore.clearCache()

    showSuccess(`Category type "${typeName.value}" created successfully`)

    // Navigate back to templates list with refresh trigger
    router.replace({
      path: '/templates',
      query: { refresh: Date.now().toString() },
    })
  } catch (error) {
    handleApiError(error, { operation: 'createCategoryType' })
  } finally {
    isLoading.value = false
  }
}

const handleUpdate = async () => {
  if (!typeName.value.trim()) {
    ElMessage.warning('Please enter a type name')
    return
  }

  if (!categoryTypeId.value) {
    ElMessage.error('Category type ID is missing')
    return
  }

  // Check if anything has changed
  const nameChanged = typeName.value.trim() !== existingName.value
  const iconChanged = selectedFile.value !== null

  if (!nameChanged && !iconChanged) {
    ElMessage.warning('Please make at least one change (name or icon)')
    return
  }

  isLoading.value = true

  try {
    // Only send name if it changed, only send icon if a new file was selected
    const updated = await categoryTypeApi.update(
      categoryTypeId.value,
      nameChanged ? typeName.value.trim() : undefined,
      iconChanged && selectedFile.value ? selectedFile.value : undefined,
    )

    // Update store and clear cache
    categoryTypesStore.updateCategoryType(updated)
    categoryTypesStore.clearCache()

    showSuccess(`Category type "${typeName.value}" updated successfully`)

    // Navigate back to templates list with refresh trigger
    router.replace({
      path: '/templates',
      query: { refresh: Date.now().toString() },
    })
  } catch (error) {
    handleApiError(error, { operation: 'updateCategoryType' })
  } finally {
    isLoading.value = false
  }
}

// Load data on mount if in view or edit mode
onMounted(async () => {
  if (isViewMode.value || isEditMode.value) {
    await fetchCategoryType()
  }
})

// Clean up icon URL on unmount
onUnmounted(() => {
  if (existingImageUrl.value && existingImageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(existingImageUrl.value)
  }
})
</script>

<style scoped>
/* Custom styles for this component */
</style>
