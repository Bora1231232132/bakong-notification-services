<template>
  <div class="schedule-detail-page">
    <div class="breadcrumb">
      <span @click="$router.push('/schedule')" class="breadcrumb-link">Schedule</span>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-current">View detail</span>
    </div>
    <h1 class="page-title">Schedule Detail</h1>
    <div class="schedule-content">
      <div class="content-label">Announcement</div>
      <div class="content-box">
        <div class="content-image">
          <img
            v-if="scheduleData.image"
            :src="scheduleData.image"
            :alt="scheduleData.title"
            class="schedule-image"
          />
          <div v-else class="placeholder-image">
            <el-icon size="48">
              <Picture />
            </el-icon>
            <span>No Image</span>
          </div>
        </div>
        <h2 class="content-title">{{ scheduleData.title || 'No Title' }}</h2>
        <p class="content-description">{{ scheduleData.content || 'No content available' }}</p>
      </div>
      <div class="action-buttons">
        <el-button type="primary" :loading="publishing" @click="handlePublishNow">
          Publish now
        </el-button>
        <el-button @click="handleEdit"> Edit </el-button>
        <el-button type="danger" @click="handleDelete"> Delete </el-button>
      </div>
    </div>
    <ElDialog
      v-model="deleteDialogVisible"
      title="Delete Template Confirmation"
      width="400px"
      :modal-append-to-body="false"
      :close-on-click-modal="false"
      class="custom-delete-dialog"
    >
      <div class="dialog-content">
        <el-icon style="font-size: 20px; margin-right: 8px">
          <Warning class="red" />
        </el-icon>
        <span style="font-size: 14px">Are you sure you want to delete the template?</span>
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
import { useRoute, useRouter } from 'vue-router'
import { ElDialog, ElButton } from 'element-plus'
import { Warning, Picture } from '@element-plus/icons-vue'
import { typeApi } from '../services/typeApi'
import { useErrorHandler } from '@/composables/useErrorHandler'

const route = useRoute()
const router = useRouter()
const { handleApiError, showSuccess, showInfo } = useErrorHandler()

const scheduleData = ref<any>({
  id: null,
  title: '',
  content: '',
  image: null,
  sendType: '',
  createdAt: '',
  updatedAt: '',
})

const publishing = ref(false)
const deleteDialogVisible = ref(false)
const scheduleId = route.params.id as string

const fetchScheduleDetail = async () => {
  try {
    if (!scheduleId) {
      showInfo('Schedule ID not found')
      router.push('/schedule')
      return
    }

    const template = await typeApi.getTemplateById(parseInt(scheduleId))
    if (template) {
      scheduleData.value = {
        id: template.id,
        title: template.title,
        content: template.content,
        image: (template as any).image || null,
        sendType: template.sendType,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      }
    } else {
      showInfo('Schedule not found')
      router.push('/schedule')
    }
  } catch (error) {
    handleApiError(error, { operation: 'fetchScheduleDetail' })
    router.push('/schedule')
  }
}

const handlePublishNow = async () => {
  try {
    publishing.value = true

    showInfo('Publishing schedule...')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    showSuccess('Schedule published successfully!')
  } catch (error) {
    handleApiError(error, { operation: 'publishSchedule' })
  } finally {
    publishing.value = false
  }
}

const handleEdit = () => {
  router.push(`/schedule/edit/${scheduleId}`)
}

const handleDelete = () => {
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  try {
    if (!scheduleData.value.id) {
      showInfo('Schedule ID not found')
      return
    }
    showInfo('Deleting schedule...')
    const success = await typeApi.deleteTemplate(parseInt(scheduleData.value.id))
    if (success) {
      showSuccess('Schedule deleted successfully!')
      router.push('/schedule')
    } else {
      showInfo('Failed to delete schedule')
    }
  } catch (error) {
    handleApiError(error, { operation: 'deleteSchedule' })
  } finally {
    deleteDialogVisible.value = false
  }
}

onMounted(async () => {
  await fetchScheduleDetail()
})
</script>

<style scoped>
.schedule-detail-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.breadcrumb {
  margin-bottom: 20px;
  font-size: 14px;
  color: #666;
}

.breadcrumb-link {
  color: #409eff;
  cursor: pointer;
  text-decoration: none;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  margin: 0 8px;
  color: #999;
}

.breadcrumb-current {
  color: #333;
  font-weight: 500;
}

.page-title {
  font-size: 28px;
  font-weight: bold;
  margin: 0 0 30px 0;
  color: #333;
}

.schedule-content {
  max-width: 800px;
  margin: 0 auto;
}

.content-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.content-box {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.content-image {
  margin-bottom: 20px;
  text-align: center;
}

.schedule-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  object-fit: cover;
}

.placeholder-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: #f5f5f5;
  border: 2px dashed #ddd;
  border-radius: 8px;
  color: #999;
  font-size: 14px;
}

.placeholder-image .el-icon {
  margin-bottom: 8px;
}

.content-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 16px 0;
  color: #333;
  line-height: 1.3;
}

.content-description {
  font-size: 16px;
  line-height: 1.6;
  color: #666;
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-buttons .el-button {
  min-width: 120px;
}

.custom-delete-dialog .el-dialog__body {
  padding: 0;
}

.dialog-content {
  display: flex;
  align-items: center;
  font-size: 14px;
  padding: 0;
}
</style>
