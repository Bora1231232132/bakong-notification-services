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
          v-if="!loading"
          mode="user"
          :items="displayUsers"
          @view="handleView"
          @edit="handleEdit"
          @delete="handleDelete"
        />
        <div v-else class="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
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
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { UserItem } from '@/components/common'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { userApi } from '@/services/userApi'
import { UserRole } from '@bakong/shared'

const paginationStyle: PaginationStyle = 'user-management'

const router = useRouter()
const { showSuccess, showWarning, handleApiError } = useErrorHandler({
  operation: 'user',
})

const searchQuery = ref('')
const page = ref(1)
const perPage = ref(10)
const loading = ref(false)

const users = ref<UserItem[]>([])
const totalUsers = ref(0)
const showDeleteDialog = ref(false)
const userToDelete = ref<UserItem | null>(null)

// Convert API User to UserItem format
const convertApiUserToUserItem = (user: any): UserItem => {
  // Map backend status (ACTIVE/DEACTIVATED) to frontend format (Active/Deactivate)
  let status: 'Active' | 'Deactivate' = 'Active'
  if (user.status === 'DEACTIVATED' || user.status === 'Deactivate') {
    status = 'Deactivate'
  } else if (user.status === 'ACTIVE' || user.status === 'Active') {
    status = 'Active'
  }

  return {
    id: user.id,
    name: user.name || user.displayName || '',
    email: user.email || user.username || '',
    phoneNumber: user.phoneNumber || '',
    role: user.role || '',
    status: status,
  }
}

// Fetch users from API
const fetchUsers = async () => {
  try {
    loading.value = true
    const response = await userApi.getAllUsers({
      page: page.value,
      pageSize: perPage.value,
      search: searchQuery.value.trim() || undefined,
    })

    // Convert API users to UserItem format
    users.value = response.data.map(convertApiUserToUserItem)
    totalUsers.value = response.total
  } catch (error) {
    handleApiError(error, { operation: 'fetchUsers' })
    users.value = []
    totalUsers.value = 0
  } finally {
    loading.value = false
  }
}

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalUsers.value / perPage.value))
})

const displayUsers = computed(() => {
  // Filter out ADMINISTRATOR users to prevent accidental deletion
  return users.value.filter((user) => user.role !== UserRole.ADMINISTRATOR)
})

const nextPage = async () => {
  if (page.value < totalPages.value) {
    page.value++
    await fetchUsers()
  }
}

const prevPage = async () => {
  if (page.value > 1) {
    page.value--
    await fetchUsers()
  }
}

const goToPage = async (num: number) => {
  const targetPage = Number(num)
  if (targetPage >= 1 && targetPage <= totalPages.value) {
    page.value = targetPage
    await fetchUsers()
  }
}

const handlePerPageChange = async (newPerPage: number) => {
  perPage.value = newPerPage
  // Reset to page 1 when changing page size
  page.value = 1
  await fetchUsers()
}

const addNew = () => {
  router.push({ name: 'create-user' })
}

const filter = () => {
  console.log('filter')
}

const handleSearch = async () => {
  // Reset to page 1 when searching
  page.value = 1
  await fetchUsers()
}

const handleRefresh = async () => {
  // Reset search and pagination, then fetch fresh data
  searchQuery.value = ''
  page.value = 1
  await fetchUsers()
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
  if (!userToDelete.value || !userToDelete.value.id) return

  try {
    // Ensure id is a number
    const userId = typeof userToDelete.value.id === 'string'
      ? parseInt(userToDelete.value.id, 10)
      : userToDelete.value.id

    if (isNaN(userId)) {
      throw new Error('Invalid user ID')
    }

    const success = await userApi.deleteUser(userId)

    if (success) {
      const userName =
        userToDelete.value.name ||
        userToDelete.value.displayName ||
        userToDelete.value.username ||
        'User'
      showSuccess(`User "${userName}" deleted successfully`)

      // Refresh the user list
      await fetchUsers()
    } else {
      showWarning('Failed to delete user. Please try again.')
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

// Fetch users on mount
onMounted(() => {
  fetchUsers()
})

// Watch for page/perPage changes to refetch
watch([page, perPage], () => {
  fetchUsers()
})
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
