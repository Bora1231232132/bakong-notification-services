<template>
  <div class="setting-page">
    <div class="setting-container">
      <div class="personal-info-section">
        <h2 class="section-title">Personal information</h2>
        <div class="info-item">
          <span class="info-label">Name</span>
          <span class="info-value" :class="{ loading: loading }">
            {{ loading ? 'Loading...' : userInfo.name }}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Role</span>
          <span class="info-value" :class="{ loading: loading }">
            {{ loading ? 'Loading...' : userInfo.role }}
          </span>
        </div>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
      <div class="profile-action-section">
        <h2 class="section-title">Profile action</h2>
        <div class="action-item" @click="handleChangePassword">
          <span class="action-label">Change password</span>
          <el-icon class="action-arrow">
            <ArrowRight />
          </el-icon>
        </div>
        <div class="action-item" @click="handleChangePicture">
          <span class="action-label">Change picture</span>
          <el-icon class="action-arrow">
            <ArrowRight />
          </el-icon>
        </div>
        <el-button type="danger" class="logout-btn" @click="handleLogout"> Logout </el-button>
      </div>
    </div>
    <ConfirmationDialog
      v-model="dialog.isVisible.value"
      :title="dialog.options.value.title"
      :message="dialog.options.value.message"
      :confirm-text="dialog.options.value.confirmText"
      :cancel-text="dialog.options.value.cancelText"
      :type="dialog.options.value.type"
      :confirm-button-type="dialog.options.value.confirmButtonType"
      @confirm="dialog.handleConfirm"
      @cancel="dialog.handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ArrowRight } from '@element-plus/icons-vue'
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue'
import { useConfirmationDialog } from '@/composables/useConfirmationDialog'
import { ElNotification } from 'element-plus'

const formatUserRole = (role: string) => {
  switch (role) {
    case 'ADMIN_USER':
      return 'Admin User'
    case 'NORMAL_USER':
      return 'Normal User'
    case 'API_USER':
      return 'API User'
    default:
      return role || 'Unknown'
  }
}

const router = useRouter()
const authStore = useAuthStore()
const dialog = useConfirmationDialog()

const loading = ref(false)
const error = ref<string | null>(null)

const userInfo = computed(() => {
  if (authStore.user) {
    return {
      name: authStore.user.displayName || authStore.user.username,
      role: formatUserRole(authStore.user.role),
    }
  }
  return {
    name: 'Loading...',
    role: 'Loading...',
  }
})

const handleChangePassword = () => {
  router.push('/settings/change-password')
}

const handleChangePicture = () => {
  router.push('/settings/change-profile')
}

const handleLogout = async () => {
  const confirmed = await dialog.showLogoutDialog()
  if (confirmed) {
    authStore.logout()
    ElNotification({
      title: 'Success',
      type: 'success',
      message: 'Logged out successfully',
    })
    router.push('/login')
  }
}

onMounted(() => {
  loading.value = false
  error.value = null
})
</script>

<style scoped>
.setting-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.setting-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 393px;
}

.personal-info-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;
  gap: 32px;
}

.section-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 18px;
  line-height: 150%;
  color: #001346;
  margin: 0;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 19, 70, 0.1);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 150%;
  color: #001346;
}

.info-value {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 500;
  font-size: 16px;
  line-height: 150%;
  color: #001346;
  text-align: right;
}

.profile-action-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;
  gap: 16px;
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-item:hover {
  background-color: rgba(0, 19, 70, 0.05);
  border-radius: 8px;
  padding: 12px 16px;
}

.action-label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 150%;
  color: #001346;
}

.action-arrow {
  font-size: 16px;
  color: #001346;
}

.logout-btn {
  width: 100%;
  height: 48px;
  background-color: #dc3545;
  border-color: #dc3545;
  color: white;
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 500;
  font-size: 16px;
  border-radius: 8px;
  margin-top: 8px;
}

.logout-btn:hover {
  background-color: #c82333;
  border-color: #bd2130;
}

.info-value.loading {
  color: #999999;
  font-style: italic;
}

.error-message {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 150%;
  color: #dc3545;
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .setting-page {
    padding: 16px;
  }

  .setting-container {
    max-width: 100%;
  }
}
</style>
