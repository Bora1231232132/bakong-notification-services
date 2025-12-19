<template>
  <div class="w-full p-4 md:p-6 lg:p-8">
    <div class="max-w-7xl mx-auto flex flex-col min-h-[350px]">
      <div class="h-auto sm:h-[56px] flex-shrink-0">
        <NotificationTableHeader
          v-model="searchQuery"
          :show-refresh="false"
          @addNew="addNew"
          @filter="filter"
          @search="handleSearch"
        />
      </div>
      <div class="h-2"></div>
      <div class="flex-1 min-h-0 overflow-hidden">
        <TableBody
          mode="notification"
          :items="displayItems"
          @view="viewItem"
          @edit="editItem"
          @delete="deleteItem"
        />
      </div>
      <div class="h-2"></div>
      <div class="h-auto sm:h-[56px] flex-shrink-0">
        <NotificationPagination
          :page="page"
          :per-page="perPage"
          :total-pages="totalPages"
          @next="nextPage"
          @prev="prevPage"
          @goto="goToPage"
          @update:per-page="handlePerPageChange"
        />
      </div>
    </div>
  </div>
  <ConfirmationDialog
    v-model="showDeleteDialog"
    title="You want to delete?"
    message="This action cannot be undone. This will permanently delete category and remove data from our servers."
    confirm-text="Continue"
    cancel-text="Cancel"
    type="warning"
    confirm-button-type="primary"
    @confirm="handleDeleteConfirm"
    @cancel="handleDeleteCancel"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import NotificationTableHeader from '@/components/common/Type-Feature/NotificationTableHeader.vue'
import TableBody from '@/components/common/TableBody.vue'
import NotificationPagination from '@/components/common/Type-Feature/NotificationPagination.vue'
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue'
import type { CategoryType } from '@/services/categoryTypeApi'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { ElMessage, ElNotification } from 'element-plus'
import { mockCategoryTypes } from '../../Data/mockCategoryTypes'

const router = useRouter()
const route = useRoute()

// Use mock data for testing
const categoryTypes = ref<CategoryType[]>([...mockCategoryTypes])
const loading = ref(false)

const page = ref(1)
const perPage = ref(10)
const searchQuery = ref('')
const showDeleteDialog = ref(false)
const categoryToDelete = ref<CategoryType | null>(null)

const { handleApiError, showSuccess, showInfo } = useErrorHandler({
  operation: 'categoryType',
})

const filteredItems = computed(() => {
  let items = categoryTypes.value.map((ct) => ({
    id: ct.id,
    name: ct.name,
    icon: ct.icon || '', // Icon is now included in the main response as base64
    categoryType: ct,
  }))

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    items = items.filter((item) => item.name.toLowerCase().includes(query))
  }

  return items
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredItems.value.length / perPage.value))
})

const displayItems = computed(() => {
  const start = (page.value - 1) * perPage.value
  const end = start + perPage.value
  return filteredItems.value.slice(start, end)
})

const nextPage = () => {
  if (page.value < totalPages.value) {
    page.value++
  }
}

const prevPage = () => {
  if (page.value > 1) page.value--
}

const goToPage = (num: number) => {
  const targetPage = Number(num)
  if (targetPage >= 1 && targetPage <= totalPages.value) {
    page.value = targetPage
  }
}

const handlePerPageChange = (newPerPage: number) => {
  perPage.value = newPerPage
  // If current page exceeds total pages after perPage change, reset to page 1
  if (page.value > totalPages.value) {
    page.value = 1
  }
}

const addNew = () => {
  // Commented out: Add Category feature - coming soon
  // router.push('/templates/create')

  // Show notification that feature is coming soon
  ElNotification({
    title: 'Coming Soon',
    message: 'This feature is coming soon!',
    type: 'info',
    duration: 3000,
  })
}

const filter = () => {
  ElNotification({
    title: 'Coming Soon',
    message: 'Filter functionality coming soon',
    type: 'info',
    duration: 3000,
  })
}

const handleSearch = (value: string) => {
  searchQuery.value = value
  page.value = 1
}

const fetchCategoryTypes = async () => {
  try {
    // Use mock data for testing
    loading.value = true
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300))
    categoryTypes.value = [...mockCategoryTypes]
    loading.value = false
  } catch (error) {
    loading.value = false
    handleApiError(error, { operation: 'fetchCategoryTypes' })
  }
}

const viewItem = (item: any) => {
  const categoryType = item.categoryType as CategoryType
  if (categoryType) {
    router.push(`/templates/view/${categoryType.id}`)
  }
}

const editItem = (item: any) => {
  const categoryType = item.categoryType as CategoryType
  if (categoryType) {
    router.push(`/templates/edit/${categoryType.id}`)
  }
}

const deleteItem = (item: any) => {
  const categoryType = item.categoryType as CategoryType
  if (!categoryType) return

  categoryToDelete.value = categoryType
  showDeleteDialog.value = true
}

const handleDeleteConfirm = async () => {
  if (!categoryToDelete.value) return

  try {
    // Simulate API call with mock data
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Remove from local mock data
    const index = categoryTypes.value.findIndex((ct) => ct.id === categoryToDelete.value!.id)
    if (index > -1) {
      categoryTypes.value.splice(index, 1)
    }

    showSuccess(`Category type "${categoryToDelete.value.name}" deleted successfully`)
  } catch (error) {
    handleApiError(error, { operation: 'deleteCategoryType' })
  } finally {
    categoryToDelete.value = null
    showDeleteDialog.value = false
  }
}

const handleDeleteCancel = () => {
  categoryToDelete.value = null
  showDeleteDialog.value = false
}

onMounted(async () => {
  await fetchCategoryTypes()
})

// Watch filteredItems to reset page when data changes (search/filter/delete)
watch(
  () => filteredItems.value.length,
  (newLength, oldLength) => {
    // Reset to page 1 if current page exceeds total pages or if items were deleted
    if (page.value > totalPages.value || (oldLength && newLength < oldLength && page.value > 1)) {
      page.value = 1
    }
  },
)

// Refresh data when refresh query param is present (triggered after creating new category type)
watch(
  () => route.query.refresh,
  async (refreshParam) => {
    if (refreshParam) {
      // Force refresh to get latest mock data
      await fetchCategoryTypes()
      // Remove the refresh param from URL without triggering another refresh
      router.replace({ path: '/templates', query: {} })
    }
  },
  { immediate: false },
)
</script>
