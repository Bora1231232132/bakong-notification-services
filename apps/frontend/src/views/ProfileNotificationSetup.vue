<template>
  <div class="profile-notification-setup">
    <div class="setup-container">
      <div class="header-section">
        <h1 class="page-title">Profile Notification Setup</h1>
        <p class="page-description">Configure your notification preferences and profile settings</p>
      </div>
      <div class="profile-section">
        <h2 class="section-title">Profile Picture</h2>
        <UploadProfilePicture />
      </div>
      <div class="notification-section">
        <h2 class="section-title">Notification Preview</h2>
        <NotificationPreview />
      </div>
      <div class="action-section">
        <el-button type="primary" size="large" @click="handleSave" :loading="saving">
          Save Changes
        </el-button>
        <el-button size="large" @click="handleCancel"> Cancel </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UploadProfilePicture from '@/components/common/Settings-Feature/UploadProfilePicture.vue'
import NotificationPreview from '@/components/common/Settings-Feature/NotificationPreview.vue'

const router = useRouter()
const saving = ref(false)

const handleSave = async () => {
  saving.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    router.push('/settings')
  } catch (error) {
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  router.push('/settings')
}
</script>

<style scoped>
.profile-notification-setup {
  width: 100%;
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 24px;
}

.setup-container {
  max-width: 800px;
  margin: 0 auto;
  background-color: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-section {
  margin-bottom: 32px;
  text-align: center;
}

.page-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 28px;
  line-height: 1.2;
  color: #001346;
  margin: 0 0 8px 0;
}

.page-description {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 1.5;
  color: #6c757d;
  margin: 0;
}

.profile-section,
.notification-section {
  margin-bottom: 32px;
}

.section-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 20px;
  line-height: 1.3;
  color: #001346;
  margin: 0 0 16px 0;
}

.action-section {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e9ecef;
}

@media (max-width: 768px) {
  .profile-notification-setup {
    padding: 16px;
  }
  .setup-container {
    padding: 24px;
  }
  .page-title {
    font-size: 24px;
  }
  .action-section {
    flex-direction: column;
    align-items: center;
  }
  .action-section .el-button {
    width: 100%;
    max-width: 300px;
  }
}
</style>
