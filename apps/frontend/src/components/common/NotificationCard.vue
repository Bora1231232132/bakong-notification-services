<template>
  <div class="notification-container">
    <div class="notification-wrapper">
      <div class="grid-container">
        <div v-if="props.loading" class="loading-state">
          <div class="loading-text">Loading notifications...</div>
        </div>
        <div v-else-if="filteredNotifications.length === 0" class="empty-state">
          <div class="empty-text">No {{ props.activeTab }} notifications found</div>
        </div>
        <div
          v-else
          v-for="notification in filteredNotifications"
          :key="notification.id"
          class="notification-card"
          :class="{ 'no-image': !hasValidImage(notification) }"
        >
          <div class="card-content">
            <p class="author-text">Posted by {{ notification.author }}</p>
            <h3 class="title-text">
              {{ notification.title }}
            </h3>
            <p class="description-text">
              {{ notification.description }}
            </p>
          </div>

          <div v-if="hasValidImage(notification)" class="image-container">
            <img
              :src="notification.image"
              :alt="notification.title"
              class="card-image"
              @error="handleImageError"
              loading="lazy"
            />
          </div>

          <div class="card-footer">
            <p class="date-text">
              {{ notification.date }}
            </p>

            <div class="button-container">
              <button
                v-if="notification.status === 'scheduled' || notification.status === 'draft'"
                class="publish-button"
                @click="handlePublishClick(notification)"
              >
                <span>Publish now</span>
              </button>
              <button class="edit-button" @click="handleEditClick(notification)">
                <span>Edit</span>
                <img src="/src/assets/image/edit.png" alt="Edit" class="button-icon" />
              </button>
              <button class="delete-button" @click="handleDeleteClick(notification)">
                <span>Delete</span>
                <img src="/src/assets/image/trash-can.png" alt="Delete" class="button-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredNotifications.length === 0" class="empty-state">
        <p class="empty-text">No notifications found</p>
      </div>
    </div>
  </div>

  <ConfirmationDialog
    v-model="isVisible"
    :title="options.title"
    :message="options.message"
    :confirm-text="options.confirmText"
    :cancel-text="options.cancelText"
    :type="options.type"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Calendar, Edit2, Trash2 } from 'lucide-vue-next'
import type { Notification } from '@/types/notification'
import ConfirmationDialog from './ConfirmationDialog.vue'
import { useConfirmationDialog } from '@/composables/useConfirmationDialog'

interface Props {
  activeTab?: 'published' | 'scheduled' | 'draft'
  notifications?: Notification[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'published',
  notifications: () => [],
  loading: false,
})

const emit = defineEmits<{
  refresh: []
  delete: [id: number | string]
  publish: [notification: Notification]
}>()

const router = useRouter()

const searchQuery = ref('')
const selectedFilter = ref('ALL')

const { isVisible, options, handleConfirm, handleCancel, showDeleteDialog } =
  useConfirmationDialog()

const displayNotifications = computed(() => {
  return props.notifications || []
})

const filteredNotifications = computed(() => {
  return displayNotifications.value.filter((n) => {
    const matchesTab = n.status === props.activeTab
    const matchesSearch =
      searchQuery.value === '' ||
      n.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (n.description && n.description.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (n.content && n.content.toLowerCase().includes(searchQuery.value.toLowerCase()))
    return matchesTab && matchesSearch
  })
})

const hasValidImage = (notification: Notification) => {
  return (
    notification.image &&
    typeof notification.image === 'string' &&
    notification.image.trim() !== '' &&
    notification.image !== 'null' &&
    notification.image !== 'undefined'
  )
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement

  const container = img.closest('.image-container') as HTMLElement
  if (container) {
    container.style.display = 'none'
  }
}

const handleDeleteClick = async (notification: Notification) => {
  const confirmed = await showDeleteDialog('notification')
  if (confirmed) {
    emit('delete', notification.id)
  }
}

const handlePublishClick = (notification: Notification) => {
  emit('publish', notification)
}

const handleEditClick = (notification: Notification) => {
  const editId = notification.templateId || notification.id
  router.push(`/notifications/edit/${editId}?fromTab=${props.activeTab}`)
}
</script>

<style scoped>
.notification-container {
  min-height: 100vh;
}

.notification-wrapper {
  max-width: 80rem;
  margin: 0 auto;
}

.tab-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.tab-button {
  padding: 0.5rem 1.5rem;
  border-radius: 9999px;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.15s ease-in-out;
  border: none;
  cursor: pointer;
  background-color: #f1f5f9;
  color: #0f172a;
}

.tab-button:hover {
  background-color: #e2e8f0;
}

.tab-button-active {
  background-color: #0f172a;
  color: white;
}

.filter-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  outline: none;
  background-color: white;
}

.filter-select:focus {
  border-color: #9ca3af;
}

.search-container {
  position: relative;
  flex: 1;
  max-width: 20rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  padding-right: 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  outline: none;
}

.search-input:focus {
  border-color: #9ca3af;
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: #9ca3af;
}

.date-container {
  position: relative;
  flex: 1;
}

.date-input {
  width: 100%;
  padding: 0.75rem 1rem;
  padding-right: 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  outline: none;
}

.date-input:focus {
  border-color: #9ca3af;
}

.date-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: #9ca3af;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

.notification-card {
  width: 100%;
  min-height: 254.5px;
  background-color: white;
  border-radius: 0;
  overflow: visible;
  border: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
  box-sizing: border-box;
}

.notification-card:has(.image-container) {
  min-height: 472.5px;
}

.card-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-height: 143.5px;
}

.author-text {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-size: 13px;
  line-height: 150%;
  color: #000000;
  margin: 0;
  width: 100%;
  height: 20px;
}

.title-text {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 600;
  font-size: 18px;
  line-height: 150%;
  color: #000000;
  margin: 0;
  width: 100%;
  max-height: 54px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.description-text {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-size: 13px;
  line-height: 150%;
  color: #000000;
  margin: 0;
  width: 100%;
  height: 55.5px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.image-container {
  width: 100%;
  height: 218px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  position: relative;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  border: none;
  display: block;
}

.card-footer {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
  overflow: visible;
  border: none;
  background-color: transparent;
}

.date-text {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-size: 13px;
  line-height: 150%;
  color: #000000;
  margin: 0;
  width: 100%;
  height: 20px;
}

.scheduled-text {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-size: 13px;
  line-height: 150%;
  color: #000000;
  margin: 0;
  width: 100%;
  height: 20px;
}

.button-container {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  height: 56px;
  min-width: 0;
  overflow: visible;
}

.publish-button {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 12px;
  gap: 6px;

  min-width: 123px;
  height: 56px;
  flex: 0 0 auto;

  background: #0f4aea;
  border-radius: 32px;
  border: none;
  cursor: pointer;

  order: 0;

  color: white;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
}

.publish-button:hover {
  background: #0d3bc7;
}

.edit-button {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 12px;
  gap: 6px;

  min-width: 93px;
  height: 56px;
  flex: 0 0 auto;

  background: rgba(0, 19, 70, 0.05);

  backdrop-filter: blur(64px);
  border-radius: 32px;
  border: none;
  cursor: pointer;

  order: 1;

  color: #001346;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
}

.edit-button:hover {
  background: rgba(0, 19, 70, 0.1);
}

.delete-button {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 12px;
  gap: 6px;
  min-width: 113px;
  height: 56px;
  flex: 0 0 auto;
  background: #f24444;

  backdrop-filter: blur(64px);
  border-radius: 32px;
  border: none;
  cursor: pointer;
  order: 2;
  color: white;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
}

.delete-button:hover {
  background: #e03e3e;
}

.button-icon {
  width: 24px;
  height: 24px;
}

.empty-state {
  text-align: center;
  padding: 3rem 0;
}

.empty-text {
  color: #6b7280;
  margin: 0;
}

@media (max-width: 1200px) {
  .grid-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .button-container {
    gap: 6px;
  }

  .publish-button {
    min-width: 123px;
    padding: 8px 10px;
  }

  .edit-button {
    min-width: 93px;
    padding: 8px 10px;
  }

  .delete-button {
    min-width: 113px;
    padding: 8px 10px;
  }
}

@media (max-width: 768px) {
  .grid-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .button-container {
    gap: 4px;
    flex-wrap: wrap;
    height: auto;
    min-height: 56px;
  }

  .publish-button,
  .edit-button,
  .delete-button {
    min-width: 123px;
    padding: 6px 8px;
    height: 48px;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .grid-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 200px;
  grid-column: 1 / -1;
}

.loading-text,
.empty-text {
  color: #7a8190;
  font-size: 16px;
  font-weight: 500;
}
</style>
