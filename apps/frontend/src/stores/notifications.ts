import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificationApi } from '@/services/api'

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  createdAt: string
  updatedAt: string
  isRead: boolean
}

export interface NotificationFilters {
  page?: number
  limit?: number
  type?: string
  isRead?: boolean
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length)

  const fetchNotifications = async (filters: NotificationFilters = {}) => {
    loading.value = true
    error.value = null

    try {
      const response = await notificationApi.getNotifications(filters)
      const { data, pagination: paginationData } = response.data.data

      notifications.value = data
      pagination.value = paginationData

      return { success: true }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const sendNotification = async (notificationData: any) => {
    loading.value = true
    error.value = null

    try {
      const response = await notificationApi.sendNotification(notificationData)

      await fetchNotifications()
      return { success: true, data: response.data }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to send notification'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const markAsRead = (notificationId: string) => {
    const notification = notifications.value.find((n) => n.id === notificationId)
    if (notification) {
      notification.isRead = true
    }
  }

  const markAllAsRead = () => {
    notifications.value.forEach((notification) => {
      notification.isRead = true
    })
  }

  const clearError = () => {
    error.value = null
  }

  return {
    notifications,
    loading,
    error,
    pagination,
    unreadCount,
    fetchNotifications,
    sendNotification,
    markAsRead,
    markAllAsRead,
    clearError,
  }
})
