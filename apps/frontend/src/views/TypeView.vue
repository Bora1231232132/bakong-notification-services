<template>
  <div class="w-full p-4 md:p-6 lg:p-8">
    <div class="max-w-7xl mx-auto flex flex-col min-h-[350px]">
      <div class="h-auto sm:h-[56px] flex-shrink-0">
        <NotificationTableHeader
          v-model="searchQuery"
          @addNew="addNew"
          @filter="filter"
          @search="handleSearch"
        />
      </div>
      <div class="h-2"></div>
      <div class="flex-1 min-h-0 overflow-hidden">
        <NotificationTableBody
          :notifications="displayItems"
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import NotificationTableHeader from '@/components/common/Type-Feature/NotificationTableHeader.vue'
import NotificationTableBody from '@/components/common/Type-Feature/NotificationTableBody.vue'
import NotificationPagination from '@/components/common/Type-Feature/NotificationPagination.vue'
import { categoryTypeApi, type CategoryType } from '@/services/categoryTypeApi'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()

const page = ref(1)
const perPage = ref(10)
const categoryTypes = ref<CategoryType[]>([])
const iconUrls = ref<Map<number, string>>(new Map())
const loading = ref(false)
const searchQuery = ref('')

const { handleApiError, showSuccess, showInfo } = useErrorHandler({
  operation: 'categoryType',
})

const filteredItems = computed(() => {
  let items = categoryTypes.value.map((ct) => ({
    id: ct.id,
    name: ct.name,
    icon: iconUrls.value.get(ct.id) || '',
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
  router.push('/templates/create')
}

const filter = () => {
  ElMessage.info('Filter functionality coming soon')
}

const handleSearch = (value: string) => {
  searchQuery.value = value
  page.value = 1
}

const fetchCategoryTypes = async () => {
  loading.value = true
  try {
    const types = await categoryTypeApi.getAll()
    categoryTypes.value = types

    // Load icons for all category types
    await Promise.all(
      types.map(async (ct) => {
        try {
          const iconUrl = await categoryTypeApi.getIcon(ct.id)
          iconUrls.value.set(ct.id, iconUrl)
        } catch (error) {
          console.warn(`Failed to load icon for category type ${ct.id}:`, error)
          // Keep default icon
        }
      }),
    )
  } catch (error) {
    handleApiError(error, { operation: 'fetchCategoryTypes' })
  } finally {
    loading.value = false
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

const deleteItem = async (item: any) => {
  const categoryType = item.categoryType as CategoryType
  if (!categoryType) return

  try {
    await ElMessageBox.confirm(
      `This action cannot be undone. This will permanently delete "${categoryType.name}" and remove data from our servers.`,
      'You want to delete?',
      {
        confirmButtonText: 'Continue',
        cancelButtonText: 'Cancel',
        type: 'warning',
      },
    )

    // User confirmed deletion
    await categoryTypeApi.delete(categoryType.id)
    showSuccess(`Category type "${categoryType.name}" deleted successfully`)

    // Clean up icon URL
    const iconUrl = iconUrls.value.get(categoryType.id)
    if (iconUrl) {
      URL.revokeObjectURL(iconUrl)
      iconUrls.value.delete(categoryType.id)
    }

    // Refresh the list
    await fetchCategoryTypes()
  } catch (error) {
    // User cancelled or error occurred
    if (error !== 'cancel') {
      handleApiError(error, { operation: 'deleteCategoryType' })
    }
  }
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
      await fetchCategoryTypes()
      // Remove the refresh param from URL without triggering another refresh
      router.replace({ path: '/templates', query: {} })
    }
  },
  { immediate: false },
)

onUnmounted(() => {
  // Clean up all icon URLs to prevent memory leaks
  iconUrls.value.forEach((url) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
  iconUrls.value.clear()
})
</script>
