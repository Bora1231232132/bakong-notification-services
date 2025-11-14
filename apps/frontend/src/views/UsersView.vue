<template>
  <div class="users-page">
    <PageHeader title="Users Management" />
    <DataTable
      :data="users"
      :columns="tableColumns"
      :border="true"
      :show-pagination="false"
      :use-api-pagination="true"
      :pagination-info="paginationInfo"
      :stripe="true"
      :max-height="'500px'"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <template #role="{ row }">
        <el-tag :type="getRoleType(row.role)">
          {{ row.role }}
        </el-tag>
      </template>
      <template #actions="{ row }">
        <el-button type="text" size="small" @click="handleEdit(row)"> Edit </el-button>
        <el-button type="text" size="small" @click="handleDelete(row)"> Delete </el-button>
      </template>
    </DataTable>
    <div class="users-bottom-section">
      <el-pagination
        v-model:current-page="paginationInfo.currentPage"
        v-model:page-size="paginationInfo.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="paginationInfo.total"
        layout="total, sizes, prev, pager, next, jumper"
        :background="true"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
    <ElDialog
      v-model="deleteDialogVisible"
      title="Delete User Confirmation"
      width="400px"
      :modal-append-to-body="false"
      :close-on-click-modal="false"
      class="custom-delete-dialog"
    >
      <div class="dialog-content">
        <el-icon style="font-size: 20px; margin-right: 8px">
          <Warning class="red" />
        </el-icon>
        <span style="font-size: 14px"
          >Are you sure you want to delete user "{{ selectedUser?.username }}"?</span
        >
        <br />
        <span style="font-size: 12px; color: #666; margin-top: 8px; display: block"
          >This action cannot be undone.</span
        >
      </div>
      <template #footer>
        <div class="dialog-footer" style="padding: 0">
          <ElButton @click="deleteDialogVisible = false">Cancel</ElButton>
          <ElButton type="primary" @click="confirmDelete"> Delete </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElDialog, ElButton } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DataTable from '@/components/common/DataTable.vue'
import { usePagination } from '@/composables/usePagination'
import { userApi, type User } from '../services/userApi'
import { useErrorHandler } from '@/composables/useErrorHandler'

const { handleApiError, showSuccess, showInfo } = useErrorHandler()

const tableColumns = ref([
  { prop: 'username', label: 'Username', minWidth: 150, showOverflowTooltip: true },
  { prop: 'displayName', label: 'Display Name', minWidth: 200, showOverflowTooltip: true },
  { prop: 'role', label: 'Role', minWidth: 120, slot: 'role' },
  { prop: 'createdAt', label: 'Created', minWidth: 150, showOverflowTooltip: true },
  { prop: 'actions', label: 'Actions', minWidth: 200, slot: 'actions' },
])

const users = ref<User[]>([])
const loading = ref(false)

const deleteDialogVisible = ref(false)
const selectedUser = ref<User | null>(null)

const {
  paginationInfo,
  updatePaginationInfo,
  handlePageChange: paginationPageChange,
  handleSizeChange: paginationSizeChange,
} = usePagination({
  initialPageSize: 10,
  pageSizes: [10, 20, 50, 100],
  onPageChange: async (page, pageSize) => {
    await fetchUsers({ page, pageSize })
  },
  onSizeChange: async (pageSize) => {
    await fetchUsers({ page: 1, pageSize })
  },
})

const fetchUsers = async (
  filters: { page?: number; pageSize?: number; search?: string; role?: string } = {},
) => {
  try {
    loading.value = true

    const response = await userApi.getAllUsers({
      page: filters.page || 1,
      pageSize: filters.pageSize || 10,
      search: filters.search,
      role: filters.role,
    })

    users.value = response.data
    updatePaginationInfo({
      currentPage: response.page,
      pageSize: response.pageSize,
      total: response.total,
    })
  } catch (error) {
    handleApiError(error, { operation: 'fetchUsers' })
  } finally {
    loading.value = false
  }
}

const handlePageChange = async (page: number, pageSize: number) => {
  await paginationPageChange(page, pageSize)
}

const handleSizeChange = async (pageSize: number) => {
  await paginationSizeChange(pageSize)
}

const getRoleType = (role: string) => {
  switch (role) {
    case 'ADMIN_USER':
      return 'danger'
    case 'NORMAL_USER':
      return 'success'
    case 'API_USER':
      return 'primary'
    default:
      return 'info'
  }
}

const handleCreateUser = () => {
  showInfo('Create user feature coming soon!')
}

const handleEdit = (user: User) => {
  showInfo(`Editing user: ${user.username}`)
}

const handleDelete = (user: User) => {
  selectedUser.value = user
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  try {
    if (!selectedUser.value) return
    const user = selectedUser.value
    showInfo(`Deleting user: ${user.username}`)

    const success = await userApi.deleteUser(user.id)
    if (success) {
      showSuccess(`User deleted successfully: ${user.username}`)
      await fetchUsers()
    } else {
      showInfo('Failed to delete user')
    }
  } catch (error) {
    handleApiError(error, { operation: 'deleteUser' })
  } finally {
    deleteDialogVisible.value = false
    selectedUser.value = null
  }
}

onMounted(async () => {
  await fetchUsers()
})
</script>

<style scoped>
.users-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border-radius: 2px;
}

.users-bottom-section {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  margin-top: auto;
}

.users-page :deep(.data-table-wrapper) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.users-page :deep(.el-pagination) {
  justify-content: flex-start;
}

.users-page :deep(.el-pagination .el-pagination__total) {
  margin-right: 1rem;
}

.users-page :deep(.el-pagination .el-pagination__sizes) {
  margin-right: 1rem;
}

.custom-delete-dialog .dialog-content {
  display: flex;
  align-items: flex-start;
  padding: 16px 0;
}

.custom-delete-dialog .red {
  color: #f56c6c;
}

.custom-delete-dialog .dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
