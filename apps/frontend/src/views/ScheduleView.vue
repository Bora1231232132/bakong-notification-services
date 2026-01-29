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
                    :user-role="authStore.user?.role"
                    @send-now="handleSendNow"
                    @approve="handleApproval"
                    @approve-navigate="handleApprovalNavigate"
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
import { useRouter } from 'vue-router'
import { ElNotification } from 'element-plus'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import type { Notification } from '@/services/notificationApi'
import { notificationApi } from '@/services/notificationApi'
import { api } from '@/services/api'
import ScheduleNotificationCard from '@/components/common/ScheduleNotificationCard.vue'
import { ErrorCode } from '@bakong/shared'
import { useAuthStore } from '@/stores/auth'
import {
  BakongApp,
  SendType,
  Platform,
  getNotificationMessage,
  getFormattedPlatformName,
  getNoUsersAvailableMessage,
} from '@/utils/helpers'

const router = useRouter()
const authStore = useAuthStore()

const handleSendNow = async (notification: Notification) => {
  // Show loading notification immediately (same as NotificationCard)
  const loadingNotification = ElNotification({
    title: 'Sending Notification',
    message: 'Please wait while we send the notification to all users. This may take a moment if there are many recipients...',
    type: 'info',
    duration: 0, // Keep it open until we close it manually
  })

  try {
    const templateId = notification.templateId || notification.id
    const notificationId = typeof templateId === 'number' ? templateId : parseInt(String(templateId))
    
    if (isNaN(notificationId)) {
      throw new Error('Invalid template ID')
    }

    // Fetch full template to get all data FIRST (same as NotificationCard)
    const fullTemplate = await api.get(`/api/v1/template/${notificationId}`)
    const template = fullTemplate.data?.data || fullTemplate.data

    // Check if notification is already sent
    const isAlreadySent = template?.isSent === true || notification.isSent === true

    if (isAlreadySent) {
      loadingNotification.close()
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
      loadingNotification.close()
      ElNotification({
        title: 'Error',
        message: 'This record cannot be sent. Please review the title and content and try again.',
        type: 'error',
        duration: 4000,
      })
      return
    }

    // Prepare update payload - FORCE immediate sending by setting sendType to SEND_NOW
    // This ensures notifications are sent immediately, not scheduled
    const updatePayload: any = {
      isSent: true, // Send immediately
      sendType: SendType.SEND_NOW, // ALWAYS set to SEND_NOW to force immediate sending
      sendSchedule: null, // Clear schedule when publishing immediately
      // Keep all other original data
      platforms: template?.platforms || [], 
      bakongPlatform: template?.bakongPlatform,
      notificationType: template?.notificationType,
      categoryTypeId: template?.categoryTypeId,
      translations: template?.translations?.map((t: any) => ({
        language: t.language,
        title: t.title,
        content: t.content,
        image: t.image?.fileId || t.imageId || t.image?.id || '',
        linkPreview: t.linkPreview || undefined,
      })) || [],
    }

    // Call API and WAIT for it to complete (same as NotificationCard)
    const result = await notificationApi.updateTemplate(notificationId, updatePayload)

    // Close loading notification
    loadingNotification.close()

    // Check if error response (no users found or approval required)
    if (result?.responseCode !== 0 || result?.errorCode !== 0) {
      const errorMessage =
        result?.responseMessage || result?.message || 'Failed to publish notification'
      const errorCode = result?.errorCode

      // Handle approval required error specifically
      if (
        errorCode === ErrorCode.NO_PERMISSION &&
        errorMessage.includes('Template must be approved')
      ) {
        const canApprove = authStore.isAdmin || authStore.isApproval

        ElNotification({
          title: 'Approval Required',
          message: canApprove
            ? `This notification requires approval before sending. You can approve it from the Pending tab.`
            : `This notification requires approval before sending. Please wait for an administrator to approve it.`,
          type: 'warning',
          duration: 5000,
          dangerouslyUseHTMLString: true,
        })

        await fetchNotifications()
        return
      }

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

    // Extract response data - handle different response structures (same as NotificationCard)
    const responseData = result?.data?.data || result?.data || result
    const successfulCount = responseData?.successfulCount || 0
    const failedCount = responseData?.failedCount || 0
    const isSent = responseData?.isSent === true
    const approvalStatus = responseData?.approvalStatus

    // Show success message with send results (same as NotificationCard)
    if (isSent || approvalStatus === 'APPROVED') {
      if (successfulCount > 0) {
        ElNotification({
          title: 'Success',
          message: `<strong>Notification published and sent to ${successfulCount} user(s) immediately.</strong>${failedCount > 0 ? ` (${failedCount} failed)` : ''} please wait for a moment to see the notification on the user's device.`,
          type: 'success',
          duration: 3000,
        })
      } else {
        ElNotification({
          title: 'Success',
          message: '<strong>Notification published successfully.</strong> please wait for a moment to see the notification on the user\'s device.',
          type: 'success',
          duration: 3000,
        })
      }
    } else {
      // Fallback: if response doesn't show isSent/APPROVED, fetch template to verify
      const verifyTemplate = await api.get(`/api/v1/template/${notificationId}`)
      const verifiedData = verifyTemplate.data?.data || verifyTemplate.data
      
      if (verifiedData?.isSent === true || verifiedData?.approvalStatus === 'APPROVED') {
        ElNotification({
          title: 'Success',
          message: `<strong>Notification published and sent to users immediately.</strong> please wait for a moment to see the notification on the user's device.`,
          type: 'success',
          duration: 3000,
        })
      } else {
        ElNotification({
          title: 'Warning',
          message: '<strong>Notification was updated but may not have been sent.</strong>',
          type: 'warning',
          duration: 5000,
        })
      }
    }

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
    // Close loading notification on error
    loadingNotification.close()
    
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
    
    // On error, still refresh to show current state
    await fetchNotifications()
  }
}

const handleApprovalNavigate = async (notification: Notification) => {
  try {
    const templateId = notification.templateId || notification.id
    const viewId = templateId
    
    console.log('🔵 [APPROVAL NAVIGATE] Starting approval navigation for template:', {
      templateId,
      notificationId: notification.id,
      sendType: notification.sendType,
      scheduledTime: (notification as any).scheduledTime,
    })
    
    // Check if this is a scheduled notification that might be expired
    if (notification.sendType === 'SEND_SCHEDULE' && (notification as any).scheduledTime) {
      try {
        // Fetch full template to check scheduled time
        const fullTemplateResponse = await api.get(`/api/v1/template/${templateId}`)
        const template = fullTemplateResponse.data?.data || fullTemplateResponse.data
        
        console.log('🔵 [APPROVAL NAVIGATE] Fetched template:', {
          templateId,
          sendSchedule: template?.sendSchedule,
          sendType: template?.sendType,
          approvalStatus: template?.approvalStatus,
        })
        
        if (template?.sendSchedule) {
          // Parse scheduled time
          const scheduledTime = new Date(template.sendSchedule)
          const now = new Date()
          
          // Check if scheduled time has passed (with 1 minute grace period)
          const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
          
          console.log('⏰ [APPROVAL NAVIGATE] Checking scheduled time:', {
            scheduledTimeUTC: scheduledTime.toISOString(),
            currentTimeUTC: now.toISOString(),
            scheduledTimeLocal: scheduledTime.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
            currentTimeLocal: now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
            hasPassed: scheduledTime < oneMinuteAgo,
          })
          
          if (scheduledTime < oneMinuteAgo) {
            // Scheduled time has passed - auto-expire it
            console.warn('⏰ [APPROVAL NAVIGATE] Scheduled time has passed - auto-expiring template')
            
            try {
              // Call approve API - backend will auto-expire it
              await notificationApi.approveTemplate(Number(templateId))
            } catch (error: any) {
              // Check if this is an auto-expiration response
              const isAutoExpired = error.response?.data?.data?.autoExpired === true
              const expiredReason = error.response?.data?.responseMessage || error.response?.data?.data?.expiredReason || 'Scheduled time has passed. Please contact team member to update the schedule first.'
              
              if (isAutoExpired) {
                console.log('✅ [APPROVAL NAVIGATE] Template auto-expired successfully')
                ElNotification({
                  title: 'Notification Expired',
                  message: `<strong>Scheduled time has expired</strong>. Please contact <strong>team member</strong> to update the schedule first.`,
                  type: 'warning',
                  duration: 5000,
                  dangerouslyUseHTMLString: true,
                })
                
                // Refresh notifications to show updated status
                await fetchNotifications()
                return
              } else {
                // Unexpected error - still show message
                console.error('❌ [APPROVAL NAVIGATE] Unexpected error during auto-expiration:', error)
                ElNotification({
                  title: 'Error',
                  message: 'Failed to process expired notification. Please try again.',
                  type: 'error',
                  duration: 5000,
                })
                await fetchNotifications()
                return
              }
            }
          } else {
            // Scheduled time is still valid - proceed to view page
            console.log('✅ [APPROVAL NAVIGATE] Scheduled time is valid - navigating to view page')
            router.push(`/notifications/view/${viewId}?fromTab=schedule`)
          }
        } else {
          // No schedule - proceed normally
          console.log('✅ [APPROVAL NAVIGATE] No schedule - navigating to view page')
          router.push(`/notifications/view/${viewId}?fromTab=schedule`)
        }
      } catch (error) {
        console.error('❌ [APPROVAL NAVIGATE] Error checking template:', error)
        // On error, still navigate to view page (fallback)
        router.push(`/notifications/view/${viewId}?fromTab=schedule`)
      }
    } else {
      // Not a scheduled notification - proceed normally
      console.log('✅ [APPROVAL NAVIGATE] Not scheduled - navigating to view page')
      router.push(`/notifications/view/${viewId}?fromTab=schedule`)
    }
  } catch (err: any) {
    console.error('Error navigating to approval page:', err)
    ElNotification({
      title: 'Error',
      message: 'Failed to navigate to approval page. Please try again.',
      type: 'error',
      duration: 5000,
    })
  }
}

const handleApproval = async (notification: Notification) => {
  try {
    const notificationId = typeof notification.id === 'number' ? notification.id : parseInt(String(notification.id))
    if (isNaN(notificationId)) {
      throw new Error('Invalid template ID')
    }

    const templateId = notification.templateId || notificationId

    // Show loading notification
    const loadingNotification = ElNotification({
      title: 'Approving Notification',
      message: 'Please wait while we approve the notification...',
      type: 'info',
      duration: 0,
    })

    try {
      // Call approval API
      const { notificationApi } = await import('@/services/notificationApi')
      const result = await notificationApi.approveTemplate(Number(templateId))

      // Fetch updated template after approval to get the latest status
      const { api } = await import('@/services/api')
      const updatedTemplateResponse = await api.get(`/api/v1/template/${templateId}`)
      const updatedTemplate = updatedTemplateResponse.data?.data || updatedTemplateResponse.data

      // Determine redirect tab based on sendType and isSent status
      const isScheduled = 
        (updatedTemplate?.sendType === 'SEND_SCHEDULE' || updatedTemplate?.sendSchedule !== null) &&
        updatedTemplate?.isSent === false

      const message = isScheduled 
        ? '<strong>Notification approved successfully!</strong> It will be sent at the scheduled time and moved to Published tab automatically.'
        : '<strong>Notification approved and published successfully!</strong> Users will receive it shortly.'

      loadingNotification.close()

      ElNotification({
        title: 'Success',
        message: message,
        type: 'success',
        duration: 3000,
        dangerouslyUseHTMLString: true,
      })

      // Refresh notifications to show updated status
      await fetchNotifications()

      // Clear HomeView cache to ensure fresh data when navigating to Home
      try {
        localStorage.removeItem('notifications_cache')
        localStorage.removeItem('notifications_cache_timestamp')
      } catch (error) {
        console.warn('Failed to clear HomeView cache:', error)
      }
    } catch (error: any) {
      loadingNotification.close()

      // Check if this is an auto-expiration or auto-rejection due to passed scheduled time
      const isAutoExpired = error.response?.data?.data?.autoExpired === true
      const expiredReason = error.response?.data?.responseMessage || error.response?.data?.data?.expiredReason || 'Scheduled time has passed. Please contact team member to update the schedule first.'

      if (isAutoExpired) {
        ElNotification({
          title: 'Notification Expired',
          message: `<strong>Scheduled time has expired</strong>. Please contact <strong>team member</strong> to update the schedule first.`,
          type: 'warning',
          duration: 5000,
          dangerouslyUseHTMLString: true,
        })
      } else {
        const errorMsg =
          error.response?.data?.responseMessage ||
          error.response?.data?.message ||
          error.message ||
          'Failed to approve notification'

        ElNotification({
          title: 'Error',
          message: errorMsg,
          type: 'error',
          duration: 5000,
        })
      }

      // Refresh notifications even on error to show updated status
      await fetchNotifications()
    }
  } catch (err: any) {
    console.error('Error approving notification:', err)
    const errorMsg =
      err.response?.data?.responseMessage ||
      err.response?.data?.message ||
      err.message ||
      'Failed to approve notification'

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
    // Filter by date - use sendSchedule field which is set in mappedNotifications
    // This field contains the appropriate date for all notification types:
    // - sendSchedule for scheduled notifications
    // - updatedAt for published/sent notifications
    // - updatedAt or createdAt for pending notifications
    const raw = (n as any).sendSchedule || (n as any).templateStartAt || (n as any).date
    if (!raw) return false
    
    try {
      const scheduleDate = new Date(raw)
      if (isNaN(scheduleDate.getTime())) return false
      const dateMatches = formatDateForComparison(scheduleDate) === dateStr
      if (!dateMatches) return false
    } catch (error) {
      // If date parsing fails, skip this notification
      return false
    }

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
    // Fetch raw template data first to get sendSchedule for filtering
    const rawTemplatesResponse = await api.get('/api/v1/template/all')
    const rawTemplatesMap = new Map<number, any>()

    const rawTemplatesData = rawTemplatesResponse.data?.data || rawTemplatesResponse.data
    if (Array.isArray(rawTemplatesData)) {
      rawTemplatesData.forEach((template: any) => {
        const id = template.templateId || template.id
        rawTemplatesMap.set(id, template)
      })
    }

    // Use the existing API endpoint with notification format
    const notificationResponse = await notificationApi.getAllNotifications({
      page: 1,
      pageSize: 1000, // Get all templates for schedule view
      language: 'KM',
    })

    // Filter for Published, Scheduled, and Pending Approval notifications
    // Schedule page should show all notifications that have a date/time (sent, scheduled, or pending)
    const filteredNotifications = notificationResponse.data.filter((n) => {
      const status = n.status?.toLowerCase()
      const approvalStatus = (n as any).approvalStatus
      const templateId = Number(n.templateId || n.id)
      const rawTemplate = rawTemplatesMap.get(templateId)
      
      // Include published notifications (already sent)
      if (status === 'published' || n.isSent === true) {
        return true
      }
      
      // Include scheduled notifications (approved, waiting to be sent)
      if (status === 'scheduled' && (approvalStatus === 'APPROVED' || !approvalStatus)) {
        return true
      }
      
      // Include pending approval notifications (with or without sendSchedule)
      // If it has sendSchedule, it's scheduled for future
      // If it doesn't have sendSchedule but is PENDING, it might be SEND_NOW pending approval
      if (approvalStatus === 'PENDING') {
        // Check if it has sendSchedule in raw template data
        if (rawTemplate?.sendSchedule) {
          return true
        }
        // Also include PENDING notifications even without sendSchedule (they might be SEND_NOW pending)
        // But only if they have a date (createdAt or updatedAt)
        if (n.createdAt || (n as any).updatedAt) {
          return true
        }
      }
      
      return false
    })

    // Map and normalize the data for schedule view
    const mappedNotifications = filteredNotifications.map((n) => {
      // Normalize status to match component expectations
      let normalizedStatus = n.status?.toUpperCase()
      if (normalizedStatus === 'PUBLISHED') {
        normalizedStatus = 'SENT' // Component expects SENT for published
      } else if (normalizedStatus === 'SCHEDULED') {
        normalizedStatus = 'SCHEDULED'
      } else if (normalizedStatus === 'PENDING') {
        normalizedStatus = 'PENDING'
      }

      // Get sendSchedule from raw template data
      // Use templateId if available, otherwise fall back to id
      const templateId = Number(n.templateId || n.id)
      const rawTemplate = rawTemplatesMap.get(templateId)

      // Get date for calendar display
      // Priority order:
      // 1. For scheduled notifications: use sendSchedule
      // 2. For sent/published notifications: use updatedAt (the time it was sent)
      // 3. For pending notifications: use sendSchedule if available, otherwise updatedAt or createdAt
      let displayDate: string | Date | undefined

      // First check for sendSchedule (scheduled time)
      if (rawTemplate?.sendSchedule) {
        displayDate = rawTemplate.sendSchedule
      } else if (n.sendSchedule) {
        displayDate = n.sendSchedule
      } 
      // For sent/published notifications, use updatedAt (the time it was sent)
      else if (normalizedStatus === 'SENT' || n.isSent || normalizedStatus === 'PUBLISHED') {
        displayDate = (n as any).updatedAt || n.createdAt
      } 
      // For pending notifications without sendSchedule, use updatedAt or createdAt
      else if (normalizedStatus === 'PENDING') {
        displayDate = (n as any).updatedAt || n.createdAt
      }
      // Fallback to templateStartAt or createdAt
      else if (rawTemplate?.templateStartAt) {
        displayDate = rawTemplate.templateStartAt
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
        // Include approvalStatus for filtering and button display
        approvalStatus: (n as any).approvalStatus || rawTemplate?.approvalStatus || undefined,
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
