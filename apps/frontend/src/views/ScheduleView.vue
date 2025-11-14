<template>
  <div class="schedule-page"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePagination } from '@/composables/usePagination'
import { notificationApi } from '@/services/notificationApi'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { type Notification } from '@/services/notificationApi'

const router = useRouter()

const { handleApiError, showSuccess, showInfo } = useErrorHandler({
  component: 'ScheduleView',
})

const saveNotificationStatus = (notificationId: number, notification: Notification) => {
  try {
    const savedStatuses = JSON.parse(localStorage.getItem('notificationStatuses') || '{}')
    savedStatuses[notificationId] = {
      status: notification.status,
      isSent: notification.isSent,
      lastSentAt: notification.lastSentAt,
      nextSendAt: notification.nextSendAt,
      sendCount: notification.sendCount,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem('notificationStatuses', JSON.stringify(savedStatuses))
  } catch (error) {}
}

const loadNotificationStatuses = () => {
  try {
    const savedStatuses = JSON.parse(localStorage.getItem('notificationStatuses') || '{}')

    return savedStatuses
  } catch (error) {
    return {}
  }
}

const applySavedStatuses = (notifications: Notification[]) => {
  const savedStatuses = loadNotificationStatuses()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return notifications.map((notification) => {
    const savedStatus = savedStatuses[notification.id]
    if (savedStatus) {
      const shouldReset = checkStatusReset(notification, savedStatus, now, today)

      if (shouldReset) {
        delete savedStatuses[notification.id]
        localStorage.setItem('notificationStatuses', JSON.stringify(savedStatuses))

        const resetNotification = {
          ...notification,
          status: notification.sendType === 'SEND_INTERVAL' ? 'INTERVALED' : 'SCHEDULED',
          isSent: false,
          lastSentAt: undefined,
          nextSendAt:
            notification.sendType === 'SEND_INTERVAL'
              ? new Date(now.getTime() + (notification.sendInterval || (10 as any)) * 60 * 1000)
              : undefined,
          sendCount: 0,
        }

        return resetNotification
      } else {
        return {
          ...notification,
          status: savedStatus.status,
          isSent: savedStatus.isSent,
          lastSentAt: savedStatus.lastSentAt
            ? new Date(savedStatus.lastSentAt)
            : notification.lastSentAt,
          nextSendAt: savedStatus.nextSendAt
            ? new Date(savedStatus.nextSendAt)
            : notification.nextSendAt,
          sendCount: savedStatus.sendCount || notification.sendCount,
        }
      }
    }
    return notification
  })
}

const checkStatusReset = (
  notification: Notification,
  savedStatus: any,
  now: Date,
  today: Date,
): boolean => {
  const savedDate = new Date(savedStatus.updatedAt)
  const savedDay = new Date(savedDate.getFullYear(), savedDate.getMonth(), savedDate.getDate())

  if (savedStatus.status === 'SENT' || savedStatus.status === 'SCHEDULED') {
    if (savedDay.getTime() !== today.getTime()) {
      console.log(
        `Date mismatch: saved ${savedDate.toDateString()} → ${today.toDateString()}, resetting ${notification.id}`,
      )
      return true
    }
  }

  if (savedStatus.status === 'INTERVALED' && savedStatus.nextSendAt) {
    const nextSendTime = new Date(savedStatus.nextSendAt)
    console.log('Interval check:', {
      now: now.toISOString(),
      nowTime: now.getTime(),
      nextSendTimeMs: nextSendTime.getTime(),
      shouldReset: now.getTime() >= nextSendTime.getTime(),
    })

    if (now.getTime() >= nextSendTime.getTime()) {
      console.log(
        `Interval expired: ${nextSendTime.toISOString()} <= ${now.toISOString()}, resetting ${notification.id}`,
      )
      return true
    }
  }

  return false
}

const getSendTypeTagType = (sendType: string) => {
  switch (sendType) {
    case 'SEND_NOW':
      return 'primary'
    case 'SEND_SCHEDULE':
      return 'warning'
    case 'SEND_INTERVAL':
      return 'purple'
    default:
      return 'default'
  }
}

const tableColumns = ref([
  { prop: 'type', label: 'Type', minWidth: 150, showOverflowTooltip: true },
  { prop: 'title', label: 'Title', minWidth: 150, showOverflowTooltip: true },
  { prop: 'content', label: 'Content', minWidth: 150, showOverflowTooltip: true },
  {
    prop: 'sendType',
    label: 'Send Type',
    minWidth: 150,
    showOverflowTooltip: true,
    slot: 'sendType',
  },
  { prop: 'date', label: 'Date', minWidth: 150, showOverflowTooltip: true },
  { prop: 'actions', label: 'Action', minWidth: 150, slot: 'actions' },
])

const notifications = ref<Notification[]>([])
const loading = ref(false)
const sendingNotifications = ref<Set<number>>(new Set())
const currentTime = ref(new Date())
const activeIntervals = ref<Map<number, number>>(new Map())

const {
  paginationInfo,
  updatePaginationInfo,
  handlePageChange: paginationPageChange,
  handleSizeChange: paginationSizeChange,
} = usePagination({
  initialPageSize: 10,
  pageSizes: [10, 20, 50, 100],
  onPageChange: async (page, pageSize) => {
    await fetchNotifications({ page, pageSize })
  },
  onSizeChange: async (pageSize) => {
    await fetchNotifications({ page: 1, pageSize })
  },
})

let fetchCount = 0
let isFetching = false
let isMounted = false
let timer: number | null = null

const fetchNotifications = async (
  filters: {
    page?: number
    pageSize?: number
    status?: string
    type?: string
    search?: string
  } = {},
) => {
  if (isFetching) {
    return
  }

  try {
    isFetching = true
    fetchCount++

    loading.value = true
    const response = await notificationApi.getAllNotifications({
      page: filters.page || 1,
      pageSize: filters.pageSize || 10,
      status: filters.status,
      type: filters.type,
      search: filters.search,
    })

    notifications.value = applySavedStatuses(response.data)
    updatePaginationInfo({
      currentPage: response.page,
      pageSize: response.pageSize,
      total: response.total,
    })

    const sentCount = notifications.value.filter((n) => n.status === 'SENT').length
    const scheduledCount = notifications.value.filter((n) => n.status === 'SCHEDULED').length
  } catch (error) {
    handleApiError(error, { operation: 'fetchNotifications' })
  } finally {
    loading.value = false
    isFetching = false
  }
}

const handlePageChange = async (page: number, pageSize: number) => {
  await paginationPageChange(page, pageSize)
}

const handleSizeChange = async (pageSize: number) => {
  await paginationSizeChange(pageSize)
}

const handleSendNow = async (notification: Notification) => {
  try {
    console.log('Sending notification now:', notification.id)
    console.log('Notification:', notification)

    const templateId = notification.templateId || notification.id

    sendingNotifications.value.add(notification.id as number)

    await notificationApi.sendNotificationNow(Number(templateId))

    const today = new Date()
    const sendTime = new Date()
    const todayNotification = {
      ...notification,
      id: `schedule_${notification.id}_${Date.now()}`,
      createdAt: today.toISOString(),
      date: today.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      status: 'SENT',
      isSent: true,
      lastSentAt: sendTime,
      sendCount: 1,

      sendType: notification.sendType,

      nextSendAt:
        notification.sendType === 'SEND_INTERVAL'
          ? new Date(today.getTime() + (notification.sendInterval || (10 as any)) * 60 * 1000)
          : undefined,
    }

    const savedNotifications = JSON.parse(localStorage.getItem('notification_statuses') || '{}')
    savedNotifications[todayNotification.id] = todayNotification
    localStorage.setItem('notification_statuses', JSON.stringify(savedNotifications))

    showSuccess(`Notification sent: ${notification.title} - Now available in Notification page`, {
      operation: 'sendNotification',
    })
  } catch (error) {
    handleApiError(error, { operation: 'sendNotification' })
  } finally {
    sendingNotifications.value.delete(notification.id as number)
  }
}

const handleView = (notification: Notification) => {
  const scheduleId = notification.templateId || notification.id

  router.push(`/schedule/${scheduleId}`)
}

onMounted(async () => {
  if (isMounted) {
    return
  }

  isMounted = true

  await new Promise((resolve) => setTimeout(resolve, 100))

  try {
    await fetchNotifications()
  } catch (error) {}
})

onUnmounted(() => {
  isMounted = false
  if (timer) {
    clearInterval(timer)
  }

  activeIntervals.value.forEach((intervalTimer) => {
    clearTimeout(intervalTimer)
  })
  activeIntervals.value.clear()
})
</script>

<style scoped>
.schedule-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.schedule-header {
  display: flex;
  justify-content: start;
  align-content: left;
  align-items: center;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-buttons .el-button {
  color: #409eff;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
}

.action-buttons .el-button:hover {
  color: #337ecc;
}

.disabled-action {
  opacity: 0.3 !important;
  cursor: not-allowed !important;
  color: #c0c4cc !important;
}

.disabled-action:hover {
  color: #c0c4cc !important;
}

.schedule-header-title {
  margin-right: 20px;
}

.schedule-middle-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  background: #fff;
  border-radius: 2px;
}

.schedule-top-section {
  flex-shrink: 0;
  margin-bottom: 1rem;
}

.schedules-title {
  color: #333;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 1rem 0;
  text-align: left;
}

.schedule-center-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  margin-bottom: 1rem;
}

.schedule-bottom-section {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  margin-top: auto;
}

.schedule-page :deep(.data-table-wrapper) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.schedule-page :deep(.el-pagination) {
  justify-content: flex-start;
}

.schedule-page :deep(.el-pagination .el-pagination__total) {
  margin-right: 1rem;
}

.schedule-page :deep(.el-pagination .el-pagination__sizes) {
  margin-right: 1rem;
}

:deep(.el-tag--purple) {
  background-color: #f3e8ff;
  color: #7c3aed;
  border-color: white;
}

:deep(.el-tag--purple.el-tag--light) {
  background-color: #f3e8ff;
  color: #7c3aed;
  border-color: white;
}

:deep(.el-tag--purple.el-tag--plain) {
  background-color: #faf5ff;
  color: #7c3aed;
  border-color: white;
}
</style>
