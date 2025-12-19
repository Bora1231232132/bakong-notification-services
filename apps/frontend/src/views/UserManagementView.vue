<template>
  <div class="w-full p-4 md:p-6 lg:p-8">
    <div class="max-w-7xl mx-auto flex flex-col min-h-[350px]">
      <div class="h-auto sm:h-[56px] flex-shrink-0 !mb-4">
        <NotificationTableHeader
          v-model="searchQuery"
          label-text="User"
          @addNew="addNew"
          @filter="filter"
          @search="handleSearch"
          @refresh="handleRefresh"
        />
      </div>
      <div class="flex-1 w-full" style="min-height: 434px">
        <TableBody
          mode="user"
          :items="displayUsers"
          @view="handleView"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
      <div class="h-2"></div>
      <div class="h-auto sm:h-[56px] flex-shrink-0">
        <NotificationPagination
          :style="paginationStyle"
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
    message="This action cannot be undone. This will permanently delete user and remove data from our servers."
    confirm-text="Continue"
    cancel-text="Cancel"
    type="warning"
    confirm-button-type="primary"
    @confirm="handleDeleteConfirm"
    @cancel="handleDeleteCancel"
  />
</template>

<script setup lang="ts">
import NotificationTableHeader from '@/components/common/Type-Feature/NotificationTableHeader.vue'
import TableBody from '@/components/common/TableBody.vue'
import NotificationPagination, {
  type PaginationStyle,
} from '@/components/common/Type-Feature/NotificationPagination.vue'
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue'
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { mockUsers } from '../../Data/mockUsers'
import type { UserItem } from '@/components/common'
import { useErrorHandler } from '@/composables/useErrorHandler'

const paginationStyle: PaginationStyle = 'user-management'

const router = useRouter()
const { showSuccess, handleApiError } = useErrorHandler({
  operation: 'user',
})

const searchQuery = ref('')
const page = ref(1)
const perPage = ref(10)

const users = ref<UserItem[]>(mockUsers)
const showDeleteDialog = ref(false)
const userToDelete = ref<UserItem | null>(null)

const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) {
    return users.value
  }

  const query = searchQuery.value.toLowerCase()
  return users.value.filter(
    (user: UserItem) =>
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phoneNumber?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query),
  )
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredUsers.value.length / perPage.value))
})

const displayUsers = computed(() => {
  const start = (page.value - 1) * perPage.value
  const end = start + perPage.value
  return filteredUsers.value.slice(start, end)
})

const nextPage = () => {
  if (page.value < totalPages.value) {
    page.value++
  }
}

const prevPage = () => {
  if (page.value > 1) {
    page.value--
  }
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
  router.push({ name: 'create-user' })
}

const filter = () => {
  console.log('filter')
}

const handleSearch = () => {
  console.log('handleSearch', searchQuery.value)
  // Reset to page 1 when searching
  page.value = 1
}

const handleRefresh = () => {
  // Reset search and pagination, and emit refresh intent
  searchQuery.value = ''
  page.value = 1
  console.log('refresh table')
}

const handleView = (user: UserItem) => {
  if (user.id) {
    router.push({ name: 'view-user', params: { id: user.id } })
  }
}

const handleEdit = (user: UserItem) => {
  if (user.id) {
    router.push({ name: 'edit-user', params: { id: user.id } })
  }
}

const handleDelete = (user: UserItem) => {
  if (!user) return

  userToDelete.value = user
  showDeleteDialog.value = true
}

const handleDeleteConfirm = async () => {
  if (!userToDelete.value) return

  try {
    // Simulate API call with mock data
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Remove from local mock data
    const index = users.value.findIndex((u) => u.id === userToDelete.value!.id)
    if (index > -1) {
      const userName =
        userToDelete.value.name ||
        userToDelete.value.displayName ||
        userToDelete.value.username ||
        'User'
      users.value.splice(index, 1)
      showSuccess(`User "${userName}" deleted successfully`)
    }
  } catch (error) {
    handleApiError(error, { operation: 'deleteUser' })
  } finally {
    userToDelete.value = null
    showDeleteDialog.value = false
  }
}

const handleDeleteCancel = () => {
  userToDelete.value = null
  showDeleteDialog.value = false
}

// Watch filteredUsers to reset page when data changes (search/filter/delete)
watch(
  () => filteredUsers.value.length,
  (newLength, oldLength) => {
    // Reset to page 1 if current page exceeds total pages or if items were deleted
    if (page.value > totalPages.value || (oldLength && newLength < oldLength && page.value > 1)) {
      page.value = 1
    }
  },
)
</script>

<style scoped>
/* Typography styles for user table data rows */
:deep(table tbody tr td) {
  font-family: 'IBM Plex Sans', sans-serif !important;
  font-weight: 400 !important;
  font-style: normal !important;
  font-size: 14px !important;
  line-height: 150% !important;
  letter-spacing: 0% !important;
}

/* Typography styles for ID column (span inside first td) */
:deep(table tbody tr td:first-child span) {
  font-family: 'IBM Plex Sans', sans-serif !important;
  font-weight: 400 !important;
  font-style: normal !important;
  font-size: 14px !important;
  line-height: 150% !important;
  letter-spacing: 0% !important;
}
</style>
