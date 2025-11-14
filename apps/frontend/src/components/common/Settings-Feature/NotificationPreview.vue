<template>
  <div class="notification-preview">
    <div class="preview-container">
      <div class="preview-header">
        <h3 class="preview-title">Notification Preview</h3>
        <p class="preview-description">See how your notifications will appear to users</p>
      </div>
      <div class="preview-content">
        <div class="notification-card">
          <div class="notification-header">
            <div class="notification-icon">
              <el-icon>
                <Bell />
              </el-icon>
            </div>
            <div class="notification-info">
              <h4 class="notification-title">{{ notificationTitle }}</h4>
              <p class="notification-time">{{ formatTime(new Date()) }}</p>
            </div>
            <div class="notification-status">
              <el-tag :type="notificationType" size="small">
                {{ notificationType === 'success' ? 'New' : 'Important' }}
              </el-tag>
            </div>
          </div>
          <div class="notification-body">
            <p class="notification-message">{{ notificationMessage }}</p>
          </div>
        </div>
        <div class="customization-section">
          <h4 class="customization-title">Customize Preview</h4>
          <div class="customization-options">
            <div class="option-group">
              <label class="option-label">Notification Title</label>
              <el-input
                v-model="notificationTitle"
                placeholder="Enter notification title"
                size="small"
              />
            </div>
            <div class="option-group">
              <label class="option-label">Notification Message</label>
              <el-input
                v-model="notificationMessage"
                type="textarea"
                :rows="3"
                placeholder="Enter notification message"
                size="small"
              />
            </div>
            <div class="option-group">
              <label class="option-label">Notification Type</label>
              <el-select v-model="notificationType" size="small" style="width: 100%">
                <el-option label="Success" value="success" />
                <el-option label="Warning" value="warning" />
                <el-option label="Info" value="info" />
                <el-option label="Error" value="danger" />
              </el-select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Bell } from '@element-plus/icons-vue'

const notificationTitle = ref('Welcome to Bakong!')
const notificationMessage = ref(
  'Thank you for using our notification service. You can customize your preferences in the settings.',
)
const notificationType = ref('success')

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
</script>

<style scoped>
.notification-preview {
  width: 100%;
}

.preview-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-header {
  text-align: center;
}

.preview-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 18px;
  line-height: 1.3;
  color: #001346;
  margin: 0 0 8px 0;
}

.preview-description {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 1.4;
  color: #6c757d;
  margin: 0;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.notification-card {
  background-color: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.notification-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  flex-shrink: 0;
}

.notification-info {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 1.3;
  color: #001346;
  margin: 0 0 4px 0;
}

.notification-time {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-size: 12px;
  line-height: 1.3;
  color: #6c757d;
  margin: 0;
}

.notification-status {
  flex-shrink: 0;
}

.notification-body {
  margin-top: 8px;
}

.notification-message {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 1.4;
  color: #495057;
  margin: 0;
}

.customization-section {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.customization-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 1.3;
  color: #001346;
  margin: 0 0 16px 0;
}

.customization-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.option-label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 500;
  font-size: 14px;
  line-height: 1.3;
  color: #001346;
}

@media (max-width: 768px) {
  .notification-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .notification-status {
    align-self: flex-start;
  }
}
</style>
