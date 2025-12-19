<template>
  <!-- fixed height layout so scroll can work -->
  <div class="w-full h-full min-h-0">
    <div class="h-full min-h-0 flex flex-col" >
      <!-- Header -->
      <div class="flex items-center justify-between h-14 flex-shrink-0">
        <div class="flex items-center gap-6">
          <div class="text-[23px] font-semibold leading-none text-slate-900">
            {{ currentMonthYear }}
          </div>

          <div class="inline-flex items-center h-10 gap-4">
            <button
              type="button"
              @click="goToPreviousWeek"
              class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200"
            >
              <el-icon class="text-[#0B1A46] text-2xl">
                <ArrowLeft />
              </el-icon>
            </button>

            <span class="text-[16px] font-semibold leading-none text-slate-900">
              {{ weekLabel }}
            </span>

            <button
              type="button"
              @click="goToNextWeek"
              class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200"
            >
              <el-icon class="text-[#0B1A46] text-2xl">
                <ArrowRight />
              </el-icon>
            </button>
          </div>
        </div>

        <el-select
          v-model="selectedPlatform"
          class="platform-select"
          size="large"
          placeholder="BAKONG"
          popper-class="platform-popper"
        >
          <el-option label="BAKONG" :value="BakongApp.BAKONG" />
          <el-option label="BAKONG TOURIST" :value="BakongApp.BAKONG_TOURIST" />
          <el-option label="BAKONG JUNIOR" :value="BakongApp.BAKONG_JUNIOR" />
        </el-select>
      </div>

      <!-- gap -->
      <div class="h-[23px] flex-shrink-0" />

      <!-- Calendar container -->
      <div class="flex-1 min-h-0" style="padding-bottom: 20px;">
        <div class="h-full flex flex-col bg-white border border-[rgba(0,19,70,0.1)]">
          <!-- Loading indicator -->
          <div v-if="loading" class="flex items-center justify-center h-full">
            <div class="text-slate-500">Loading notifications...</div>
          </div>
          
          <!-- Error message -->
          <div v-else-if="error" class="flex items-center justify-center h-full">
            <div class="text-red-500">Error: {{ error }}</div>
          </div>
          
          <!-- Calendar content -->
          <template v-else>
            <!-- day headers -->
            <div class="grid grid-cols-7 h-16 flex-shrink-0 border-b border-[rgba(0,19,70,0.1)]">
              <div
                v-for="(day, idx) in weekDays"
                :key="day.date.toISOString() + '-h'"
                class="flex items-center justify-center text-[16px] font-normal text-black border-l border-[rgba(0,19,70,0.1)]"
                :class="idx === 0 ? 'border-l-0' : ''"
              >
                {{ day.label }}
              </div>
            </div>

            <!-- ✅ THIS wrapper reserves 20px bottom space INSIDE the border -->
            <div class="flex-1 min-h-0 overflow-hidden">
              <!-- grid row (doesn't scroll) -->
              <div class="calendar-columns grid grid-cols-7 h-full overflow-hidden">
                <!-- each column scrolls -->
                <div
                  v-for="(day, idx) in weekDays"
                  :key="day.date.toISOString()"
                  class="calendar-column
                        min-w-0
                        min-h-0
                        h-full
                        p-2
                        flex flex-col gap-3
                        border-l border-[rgba(0,19,70,0.1)]
                        overflow-y-auto overflow-x-hidden"
                  :class="idx === 0 ? 'border-l-0' : ''"
                >
                  <ScheduleNotificationCard
                    :notifications-for-day="getNotificationsForDay(day.date)"
                    @send-now="handleSendNow"
                  />

                  <!-- guarantees last item visibility -->
                  <div style="padding-bottom: 20px;">
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElNotification } from 'element-plus'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import type { Notification } from '@/services/notificationApi'
import { notificationApi } from '@/services/notificationApi'
import { api } from '@/services/api'
import ScheduleNotificationCard from '@/components/common/ScheduleNotificationCard.vue'
import {
  BakongApp,
  SendType,
  Platform,
  getNotificationMessage,
  getFormattedPlatformName,
  getNoUsersAvailableMessage,
} from '@/utils/helpers'

const handleSendNow = async (notification: Notification) => {
  try {
    const notificationId = typeof notification.id === 'number' ? notification.id : parseInt(String(notification.id))
    if (isNaN(notificationId)) {
      throw new Error('Invalid template ID')
    }

    // First, fetch the full template data to get platforms and translations
    const fullTemplate = await api.get(`/api/v1/template/${notificationId}`)
    const template = fullTemplate.data?.data || fullTemplate.data

    // Check if notification is already sent
    const isAlreadySent = template?.isSent === true || notification.isSent === true

    if (isAlreadySent) {
      // Notification is already sent - show info message
      ElNotification({
        title: 'Info',
        message: 'This notification has already been sent to users.',
        type: 'info',
        duration: 3000,
      })
      await fetchNotifications()
      return
    }

    // Validate that draft has enough data to send (both title and content required)
    const translations = template?.translations || []
    let hasValidData = false
    
    for (const translation of translations) {
      const hasTitle = translation?.title && translation.title.trim() !== ''
      const hasContent = translation?.content && translation.content.trim() !== ''
      
      if (hasTitle && hasContent) {
        hasValidData = true
        break
      }
    }
    
    if (!hasValidData) {
      ElNotification({
        title: 'Error',
        message: 'This record cannot be sent. Please review the title and content and try again.',
        type: 'error',
        duration: 4000,
      })
      return
    }

    // Prepare update payload with existing template data
    const updatePayload: any = {
      sendType: SendType.SEND_NOW,
      isSent: true,
      sendSchedule: null, // Clear schedule when publishing immediately
    }

    // Include platforms from template (default to [IOS, ANDROID] if not set)
    if (
      template?.platforms &&
      Array.isArray(template.platforms) &&
      template.platforms.length > 0
    ) {
      updatePayload.platforms = template.platforms
    } else {
      // Default to both platforms if not set (ALL)
      updatePayload.platforms = [Platform.IOS, Platform.ANDROID]
    }

    // Include translations from template
    if (
      template?.translations &&
      Array.isArray(template.translations) &&
      template.translations.length > 0
    ) {
      updatePayload.translations = template.translations.map((t: any) => ({
        language: t.language,
        title: t.title,
        content: t.content,
        image: t.image?.fileId || t.imageId || t.image?.id || '',
        linkPreview: t.linkPreview || undefined,
      }))
    }

    const result = await notificationApi.updateTemplate(notificationId, updatePayload)

    // Check if error response (no users found)
    if (result?.responseCode !== 0 || result?.errorCode !== 0) {
      const errorMessage =
        result?.responseMessage || result?.message || 'Failed to publish notification'

      // Get platform name from response data or notification
      const platformName = getFormattedPlatformName({
        platformName: result?.data?.platformName,
        bakongPlatform: result?.data?.bakongPlatform,
        notification: notification as any,
      })

      ElNotification({
        title: 'Info',
        message: errorMessage.includes('No users found')
          ? getNoUsersAvailableMessage(platformName)
          : errorMessage,
        type: 'info',
        duration: 3000,
        dangerouslyUseHTMLString: true,
      })
      await fetchNotifications()
      return
    }

    // Use unified message handler for draft/failure cases
    const platformName = getFormattedPlatformName({
      platformName: result?.data?.platformName,
      bakongPlatform: result?.data?.bakongPlatform,
      notification: notification as any,
    })

    const bakongPlatform = result?.data?.bakongPlatform || (notification as any)?.bakongPlatform
    const messageConfig = getNotificationMessage(result?.data, platformName, bakongPlatform)
    const successfulCount = result?.data?.successfulCount ?? 0
    const failedCount = result?.data?.failedCount ?? 0
    const isPartialSuccess = successfulCount > 0 && failedCount > 0

    // Show notification for all cases
    ElNotification({
      title: messageConfig.title,
      message: messageConfig.message,
      type: messageConfig.type,
      duration: messageConfig.duration,
      dangerouslyUseHTMLString: messageConfig.dangerouslyUseHTMLString,
    })

    // Refresh notifications after publishing
    await fetchNotifications()
    
    // REDIRECT TO CURRENT DATE: Set currentWeekStart to today so the user sees the notification on today's date
    currentWeekStart.value = new Date()
    
    // Clear HomeView cache to ensure fresh data when navigating to Home
    try {
      localStorage.removeItem('notifications_cache')
      localStorage.removeItem('notifications_cache_timestamp')
    } catch (error) {
      console.warn('Failed to clear HomeView cache:', error)
    }
  } catch (err: any) {
    console.error('Error publishing notification:', err)
    const errorMsg =
      err.response?.data?.responseMessage ||
      err.response?.data?.message ||
      err.message ||
      'Failed to publish notification'
    
    ElNotification({
      title: 'Error',
      message: errorMsg,
      type: 'error',
      duration: 5000,
    })
  }
}

const selectedPlatform = ref<BakongApp>(BakongApp.BAKONG)
const notifications = ref<Notification[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Set to current date or August 2025 for demo
const currentWeekStart = ref<Date>(new Date())

const weekDays = computed(() => {
  const start = new Date(currentWeekStart.value)
  const monday = new Date(start)
  // Calculate days to subtract to get to Monday: (day + 6) % 7
  // Sun(0) -> 6, Mon(1) -> 0, Tue(2) -> 1, ..., Sat(6) -> 5
  const day = start.getDay()
  const diff = (day + 6) % 7
  monday.setDate(start.getDate() - diff)

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    return { date, label: `${dayName} ${date.getDate()}` }
  })
})

const currentMonthYear = computed(() => {
  const date = currentWeekStart.value
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const weekLabel = computed(() => {
  const d = currentWeekStart.value
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
  const pastDays = Math.floor((d.getTime() - firstDay.getTime()) / 86400000)
  const weekNumber = Math.ceil((pastDays + firstDay.getDay() + 1) / 7)
  return `Week ${weekNumber}`
})

const goToPreviousWeek = () => {
  const newDate = new Date(currentWeekStart.value)
  newDate.setDate(newDate.getDate() - 7)
  currentWeekStart.value = newDate
}

const goToNextWeek = () => {
  const newDate = new Date(currentWeekStart.value)
  newDate.setDate(newDate.getDate() + 7)
  currentWeekStart.value = newDate
}

const formatDateForComparison = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getNotificationsForDay = (date: Date): Notification[] => {
  const dateStr = formatDateForComparison(date)
  return notifications.value.filter((n) => {
    // Filter by date
    const raw = (n as any).sendSchedule || (n as any).templateStartAt || (n as any).date
    if (!raw) return false
    const scheduleDate = new Date(raw)
    if (isNaN(scheduleDate.getTime())) return false
    const dateMatches = formatDateForComparison(scheduleDate) === dateStr
    if (!dateMatches) return false
    
    // Filter by selected bakongPlatform
    // If no platform is selected, show all (shouldn't happen with current setup)
    if (!selectedPlatform.value) return true
    
    const notificationPlatform = (n as any).bakongPlatform
    // If notification has no platform, don't show it when filtering
    if (!notificationPlatform) return false
    
    // Compare platforms (case-insensitive)
    const normalizedNotificationPlatform = String(notificationPlatform).toUpperCase().trim()
    const normalizedSelectedPlatform = String(selectedPlatform.value).toUpperCase().trim()
    
    return normalizedNotificationPlatform === normalizedSelectedPlatform
  })
}

// Fetch notifications from API
const fetchNotifications = async () => {
  loading.value = true
  error.value = null
  
  try {
    // Use the existing API endpoint with notification format
    const notificationResponse = await notificationApi.getAllNotifications({
      page: 1,
      pageSize: 1000, // Get all templates for schedule view
      language: 'KM',
    })
    
    // Filter for published and scheduled templates only
    const filteredNotifications = notificationResponse.data.filter((n) => {
      const status = n.status?.toLowerCase()
      return status === 'published' || status === 'scheduled'
    })
    
    // Fetch raw template data to get sendSchedule for date matching
    const rawTemplatesResponse = await api.get('/api/v1/template/all')
    const rawTemplatesMap = new Map<number, any>()
    
    const rawTemplatesData = rawTemplatesResponse.data?.data || rawTemplatesResponse.data
    if (Array.isArray(rawTemplatesData)) {
      rawTemplatesData.forEach((template: any) => {
        const id = template.templateId || template.id
        rawTemplatesMap.set(id, template)
      })
    }
    
    // Map and normalize the data for schedule view
    const mappedNotifications = filteredNotifications.map((n) => {
      // Normalize status to match component expectations
      let normalizedStatus = n.status?.toUpperCase()
      if (normalizedStatus === 'PUBLISHED') {
        normalizedStatus = 'SENT' // Component expects SENT for published
      } else if (normalizedStatus === 'SCHEDULED') {
        normalizedStatus = 'SCHEDULED'
      }
      
      // Get sendSchedule from raw template data
      // Use templateId if available, otherwise fall back to id
      const templateId = Number(n.templateId || n.id)
      const rawTemplate = rawTemplatesMap.get(templateId)
      
      // Get date for calendar display
      // For sent/published notifications, use updatedAt (the time it was sent)
      // For scheduled notifications, use sendSchedule
      let displayDate: string | Date | undefined
      
      if (normalizedStatus === 'SENT' || n.isSent) {
        // Use updatedAt for sent notifications, fallback to createdAt
        displayDate = (n as any).updatedAt || n.createdAt
      } else if (rawTemplate?.sendSchedule) {
        displayDate = rawTemplate.sendSchedule
      } else if (rawTemplate?.templateStartAt) {
        displayDate = rawTemplate.templateStartAt
      } else if (n.sendSchedule) {
        displayDate = n.sendSchedule
      } else {
        displayDate = n.createdAt
      }
      
      // Ensure displayDate is an ISO string for consistent parsing in getNotificationsForDay
      const finalDisplayDate = displayDate instanceof Date 
        ? displayDate.toISOString() 
        : displayDate
      
      // Format time helper for scheduledTime display
      const formatTimeFromDate = (date: Date | string | null | undefined): string | null => {
        if (!date) return null
        try {
          const d = date instanceof Date ? date : new Date(date)
          if (isNaN(d.getTime())) return null
          const hh = String(d.getHours()).padStart(2, '0')
          const mm = String(d.getMinutes()).padStart(2, '0')
          return `${hh}:${mm}`
        } catch {
          return null
        }
      }
      
      return {
        ...n,
        status: normalizedStatus,
        // Use finalDisplayDate for accurate date matching in the calendar
        sendSchedule: finalDisplayDate as string,
        templateStartAt: rawTemplate?.templateStartAt instanceof Date
          ? rawTemplate.templateStartAt.toISOString()
          : rawTemplate?.templateStartAt,
        templateEndAt: rawTemplate?.templateEndAt instanceof Date
          ? rawTemplate.templateEndAt.toISOString()
          : rawTemplate?.templateEndAt,
        // Include scheduledTime from notification API for time display, or format from sendSchedule
        scheduledTime: (n as any).scheduledTime || formatTimeFromDate(finalDisplayDate),
        // Ensure description is set (use content if description is missing)
        description: n.description || n.content || '',
        // Include bakongPlatform: prioritize from notification response, then raw template
        bakongPlatform: (n as any).bakongPlatform || rawTemplate?.bakongPlatform || undefined,
      } as Notification
    })
    
    notifications.value = mappedNotifications
  } catch (err: any) {
    console.error('Error fetching notifications:', err)
    error.value = err.response?.data?.message || err.message || 'Failed to load notifications'
    notifications.value = []
  } finally {
    loading.value = false
  }
}

// Watch for week changes to refresh data
watch(currentWeekStart, () => {
  fetchNotifications()
})

// Watch for platform filter changes - no need to refetch, just filter existing data
watch(selectedPlatform, () => {
  // Data is already filtered in getNotificationsForDay computed function
  // This watch ensures reactivity when platform changes
})

onMounted(() => {
  fetchNotifications()
})
</script>

<style scoped>
.platform-select {
  width: 202px;
}

.platform-select :deep(.el-select__wrapper) {
  height: 56px;
  border-radius: 8px;
  padding: 16px 12px;
  border: 1px solid rgba(0, 19, 70, 0.1);
  box-shadow: none !important;
  background: #fff;
}

.platform-select :deep(.el-select__placeholder),
.platform-select :deep(.el-select__selected-item) {
  font-size: 16px;
  font-weight: 400;
  color: rgba(0, 19, 70, 0.4);
  line-height: 150%;
}

.platform-select :deep(.el-select__caret) {
  font-size: 28px;
  color: #0b1a46;
}

.platform-popper {
  min-width: 202px !important;
}

.calendar-column {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.calendar-column::-webkit-scrollbar {
  display: none;
}

</style>
