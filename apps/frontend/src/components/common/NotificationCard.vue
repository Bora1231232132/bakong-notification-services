<template>
  <div class="notification-container">
    <div class="notification-wrapper">
      <div class="grid-container">
        <div v-if="props.loading" class="loading-state">
          <div class="loading-text">Loading notifications...</div>
        </div>
        <div v-else-if="filteredNotifications.length === 0" class="empty-state">
          <div class="empty-state-container">
            <img
              :src="emptyStateImage"
              alt="Empty State"
              class="image-empty-state"
            />
            <div class="empty-message text-center text-gray-500 text-sm">
              Jom Reab Sur, it is empty!
            </div>
          </div>
        </div>
        <div
          v-else
          v-for="notification in filteredNotifications"
          :key="notification.id"
          class="notification-card"
          :class="{ 
            'no-image': !hasValidImage(notification)
          }"
        >
          <div class="card-content">
            <p class="author-text">
              Posted by {{ notification.author }}
              <span 
                v-if="shouldShowBadge(notification)" 
                class="approval-badge-tag" 
                :class="getApprovalBadgeClass(notification.approvalStatus || 'APPROVED')"
              >
                {{ getBadgeLabel(notification) }}
              </span>
            </p>
            <h3 
              class="title-text"
              :class="{ 'lang-khmer': containsKhmer(notification.title) }"
              :data-content-lang="containsKhmer(notification.title) ? 'km' : ''"
            >
              {{ notification.title }}
            </h3>
            <p 
              v-if="notification.description && notification.description.trim()"
              class="description-text"
              :class="{ 'lang-khmer': containsKhmer(notification.description) }"
              :data-content-lang="containsKhmer(notification.description) ? 'km' : ''"
            >
              <span v-html="notification.description"></span>
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
              {{ formatDateWithScheduledTime(notification) }}
            </p>

            <div class="button-container">
              <!-- View button - Hidden for approver role in pending approval tab -->
              <button
                v-if="!(isApprover && props.activeTab === 'pending')"
                class="view-button"
                @click="handleViewClick(notification)"
              >
                <span>View</span>
                <img src="@/assets/image/view_16.svg" alt="View" class="button-icon" />
              </button>
              
              <!-- Approval Now button for Approver in Pending tab -->
              <button
                v-if="canShowApprovalNow(notification)"
                class="approval-now-button"
                @click="handleApprovalNowClick(notification)"
              >
                <span>Approval Now</span>
              </button>
              
              <!-- Approval/Reject buttons for APPROVAL role in Pending tab (if not using Approval Now) -->
              <template v-if="isApprover && props.activeTab === 'pending' && notification.approvalStatus === 'PENDING' && !canShowApprovalNow(notification)">
                <button
                  class="approve-button"
                  @click="handleApproveClick(notification)"
                >
                  <span>Approve</span>
                </button>
                <button
                  class="reject-button"
                  @click="handleRejectClick(notification)"
                >
                  <span>Reject</span>
                </button>
              </template>
              
              <!-- Publish Now button for Approver in Scheduled/Pending tabs -->
              <button
                v-if="canPublishNow(notification)"
                class="publish-now-button"
                @click="handlePublishNowClick(notification)"
              >
                <span>Publish Now</span>
              </button>
              
              <!-- Submit Now button for Admin/Editor in Draft tab -->
              <button
                v-if="canSubmitNotification(notification)"
                class="submit-button"
                @click="handleSubmitClick(notification)"
              >
                <span>Submit Now</span>
              </button>
              
              <!-- Edit button - Based on role and tab -->
              <button 
                v-if="canEditNotification(notification)" 
                class="edit-button" 
                @click="handleEditClick(notification)"
              >
                <span>Edit</span>
                <img :src="editIcon" alt="Edit" class="button-icon" />
              </button>
              
              <!-- Delete button - Always visible but disabled when not allowed -->
              <button 
                class="delete-button" 
                :class="{ 'disabled': !canDeleteNotification(notification) }"
                :disabled="!canDeleteNotification(notification)"
                @click="canDeleteNotification(notification) ? handleDeleteClick(notification) : null"
              >
                <span>Delete</span>
                <img :src="deleteIcon" alt="Delete" class="button-icon" />
              </button>
            </div>
          </div>
        </div>
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
    :show-reason-input="options.showReasonInput"
    @confirm="(reason?: string) => handleConfirm(reason)"
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
import { containsKhmer } from '@/utils/helpers'
import { useAuthStore } from '@/stores/auth'
import { UserRole } from '@bakong/shared'
import { notificationApi } from '@/services/notificationApi'
import { ElNotification } from 'element-plus'
import emptyStateImage from '@/assets/image/jomreadsur.png'

const editIcon = new URL('@/assets/image/edit.png', import.meta.url).href
const deleteIcon = new URL('@/assets/image/trash-can.png', import.meta.url).href

interface Props {
  activeTab?: 'published' | 'scheduled' | 'draft' | 'pending'
  notifications?: Notification[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'published',
  notifications: () => [],
  loading: false,
})

const emit = defineEmits<{
  (e: 'refresh', forceRefresh?: boolean): void
  (e: 'delete', id: number | string): void
  (e: 'publish', notification: Notification): void
  (e: 'switch-tab', tab: 'published' | 'scheduled' | 'draft' | 'pending'): void
  (e: 'update-notification', notification: Notification): void
}>()

const router = useRouter()
const authStore = useAuthStore()

const searchQuery = ref('')
const selectedFilter = ref('ALL')

const { isVisible, options, handleConfirm, handleCancel, showDeleteDialog, showRejectDialog } =
  useConfirmationDialog()

// Permission checks
const canApprove = computed(() => {
  const role = authStore.user?.role as any
  return role === UserRole.APPROVAL || role === UserRole.ADMINISTRATOR
})

const canEdit = computed(() => {
  const role = authStore.user?.role as any
  return role !== UserRole.APPROVAL && role !== UserRole.VIEW_ONLY
})

const canDelete = computed(() => {
  const role = authStore.user?.role as any
  return role !== UserRole.APPROVAL && role !== UserRole.VIEW_ONLY
})

const isApprover = computed(() => {
  return (authStore.user?.role as any) === UserRole.APPROVAL
})

// Check if delete button should be enabled based on role and tab
const canDeleteNotification = (notification: Notification) => {
  const role = authStore.user?.role as any
  
  // Approver can delete in Published, Scheduled, Pending, and Draft tabs
  if (role === UserRole.APPROVAL) {
    return props.activeTab === 'published' || props.activeTab === 'scheduled' || props.activeTab === 'pending' || props.activeTab === 'draft'
  }
  
  // Admin and Editor can delete in Draft tab only (remove after all code done kept only draft tab)
  if (role === UserRole.ADMINISTRATOR || role === UserRole.EDITOR) {
    return props.activeTab === 'draft' || props.activeTab === 'published' || props.activeTab === 'scheduled' || props.activeTab === 'pending'
  }

  return false
}

// Check if edit button should be enabled based on role and tab
const canEditNotification = (notification: Notification) => {
  const role = authStore.user?.role as any
  
  // Approver cannot edit in any tab
  if (role === UserRole.APPROVAL) {
    return false
  }
  
  // Viewer cannot edit
  if (role === UserRole.VIEW_ONLY) {
    return false
  }
  
  // Admin and Editor can edit in Published, Scheduled, Pending, Draft tabs
  return props.activeTab === 'published' || props.activeTab === 'scheduled' || props.activeTab === 'pending' || props.activeTab === 'draft'
}

// Check if submit button should be enabled
const canSubmitNotification = (notification: Notification) => {
  const role = authStore.user?.role as any
  
  // Only Admin and Editor can submit in Draft tab
  if (props.activeTab !== 'draft') return false
  if (role !== UserRole.ADMINISTRATOR && role !== UserRole.EDITOR) return false
  if (notification.status !== 'draft') return false
  if (notification.approvalStatus === 'PENDING' || notification.approvalStatus === 'APPROVED') return false
  
  return true
}

// Check if publish now button should be shown for Approver
const canPublishNow = (notification: Notification) => {
  const role = authStore.user?.role as any
  if (role !== UserRole.APPROVAL) return false
  return props.activeTab === 'scheduled' || props.activeTab === 'pending'
}

// Check if approval now button should be shown for Approver in Pending tab
const canShowApprovalNow = (notification: Notification) => {
  const role = authStore.user?.role as any
  if (role !== UserRole.APPROVAL) return false
  return props.activeTab === 'pending' && notification.approvalStatus === 'PENDING'
}

const isViewOnly = computed(() => {
  return (authStore.user?.role as any) === UserRole.VIEW_ONLY
})

const isAdmin = computed(() => {
  return (authStore.user?.role as any) === UserRole.ADMINISTRATOR
})

const isEditor = computed(() => {
  return (authStore.user?.role as any) === UserRole.EDITOR
})

const canPublish = (notification: Notification) => {
  return notification.approvalStatus === 'APPROVED' || !notification.approvalStatus
}

const canSubmit = (notification: Notification) => {
  // Editor can submit if:
  // 1. User is Editor role
  // 2. Currently in Draft tab only (scheduled templates auto-move to Pending when time arrives)
  // 3. Status is draft (not scheduled - scheduled templates are handled automatically by scheduler)
  // 4. approvalStatus is null (DRAFT) or REJECTED (not PENDING or APPROVED)
  if (!isEditor.value) return false
  if (props.activeTab !== 'draft') return false // Only show Submit in Draft tab
  if (notification.status !== 'draft') return false // Only for draft status, not scheduled
  if (notification.approvalStatus === 'PENDING' || notification.approvalStatus === 'APPROVED') return false
  return true
}

const getApprovalStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'Pending Approval'
    case 'APPROVED':
      return 'Approved'
    case 'REJECTED':
      return 'Rejected'
    case 'EXPIRED':
      return 'Expired Time'
    default:
      return ''
  }
}

// Format date with "(scheduled time)" suffix for scheduled notifications in Published tab only
const formatDateWithScheduledTime = (notification: Notification): string => {
  const baseDate = notification.date || ''
  
  // Only add "(scheduled time)" for scheduled notifications that are in Published tab
  // Check if it was sent via schedule (sendType === 'SEND_SCHEDULE' and isSent === true)
  // AND it's currently in the Published tab (not Scheduled or other tabs)
  const isScheduledNotification = 
    notification.sendType === 'SEND_SCHEDULE' && 
    notification.isSent === true &&
    props.activeTab === 'published'
  
  if (isScheduledNotification) {
    return `${baseDate} (scheduled time)`
  }
  
  return baseDate
}

// Badge display logic per tab
const shouldShowBadge = (notification: Notification) => {
  // Published tab: No badge (remove "(approved)")
  if (props.activeTab === 'published') {
    return false
  }
  
  // Scheduled tab: Show "(approved)" badge
  if (props.activeTab === 'scheduled') {
    return notification.approvalStatus === 'APPROVED' || !notification.approvalStatus
  }
  
  // Pending tab: Show "(pending approve)" badge
  if (props.activeTab === 'pending') {
    return notification.approvalStatus === 'PENDING'
  }
  
  // Draft tab: Show "(rejected)" or "(expired time)" badge if rejected/expired, otherwise no badge
  if (props.activeTab === 'draft') {
    return notification.approvalStatus === 'REJECTED' || notification.approvalStatus === 'EXPIRED'
  }
  
  return false
}

const getBadgeLabel = (notification: Notification) => {
  if (props.activeTab === 'scheduled') {
    return 'Approved'
  }
  if (props.activeTab === 'pending') {
    return 'Pending Approval'
  }
  if (props.activeTab === 'draft' && notification.approvalStatus === 'REJECTED') {
    return 'Rejected'
  }
  if (props.activeTab === 'draft' && notification.approvalStatus === 'EXPIRED') {
    return 'Expired Time'
  }
  return getApprovalStatusLabel(notification.approvalStatus || '')
}

const getApprovalBadgeClass = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'badge-pending'
    case 'APPROVED':
      return 'badge-approved'
    case 'REJECTED':
      return 'badge-rejected'
    case 'EXPIRED':
      return 'badge-expired'
    default:
      return ''
  }
}

const displayNotifications = computed(() => {
  return props.notifications || []
})

const filteredNotifications = computed(() => {
  return displayNotifications.value.filter((n) => {
    // For pending tab, filter by approvalStatus instead of status
    let matchesTab = false
    if (props.activeTab === 'pending') {
      matchesTab = n.approvalStatus === 'PENDING'
    } else {
      matchesTab = n.status === props.activeTab
    }
    
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

const handleViewClick = (notification: Notification) => {
  const viewId = notification.templateId || notification.id
  // Navigate to view page (read-only mode)
  router.push(`/notifications/view/${viewId}?fromTab=${props.activeTab}`)
}

const handleApprovalNowClick = async (notification: Notification) => {
  const templateId = notification.templateId || notification.id
  const viewId = templateId
  
  console.log('🔵 [APPROVAL NOW CLICK] Starting approval check for template:', {
    templateId,
    notificationId: notification.id,
    activeTab: props.activeTab,
    sendType: notification.sendType,
    scheduledTime: notification.scheduledTime,
  })
  
  // Check if this is a scheduled notification that might be expired
  if (notification.sendType === 'SEND_SCHEDULE' && notification.scheduledTime) {
    try {
      // Fetch full template to check scheduled time
      const { api } = await import('@/services/api')
      const fullTemplateResponse = await api.get(`/api/v1/template/${templateId}`)
      const template = fullTemplateResponse.data?.data || fullTemplateResponse.data
      
      console.log('🔵 [APPROVAL NOW CLICK] Fetched template:', {
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
        
        console.log('⏰ [APPROVAL NOW CLICK] Checking scheduled time:', {
          scheduledTimeUTC: scheduledTime.toISOString(),
          currentTimeUTC: now.toISOString(),
          scheduledTimeLocal: scheduledTime.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
          currentTimeLocal: now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
          hasPassed: scheduledTime < oneMinuteAgo,
        })
        
        if (scheduledTime < oneMinuteAgo) {
          // Scheduled time has passed - auto-expire it
          console.warn('⏰ [APPROVAL NOW CLICK] Scheduled time has passed - auto-expiring template')
          
          try {
            // Call approve API - backend will auto-expire it
            await notificationApi.approveTemplate(Number(templateId))
          } catch (error: any) {
            // Check if this is an auto-expiration response
            const isAutoExpired = error.response?.data?.data?.autoExpired === true
            const expiredReason = error.response?.data?.responseMessage || error.response?.data?.data?.expiredReason || 'Scheduled time has passed. Please contact team member to update the schedule first.'
            
            if (isAutoExpired) {
              console.log('✅ [APPROVAL NOW CLICK] Template auto-expired successfully')
              ElNotification({
                title: 'Notification Expired',
                message: `<strong>Scheduled time has expired</strong>. Please contact <strong>team member</strong> to update the schedule first.`,
                type: 'warning',
                duration: 5000,
                dangerouslyUseHTMLString: true,
              })
              
              // Redirect to Draft tab
              emit('switch-tab', 'draft')
              setTimeout(() => {
                emit('refresh', true) // Force refresh to show updated status
              }, 500)
              return
            } else {
              // Unexpected error - still show message and redirect
              console.error('❌ [APPROVAL NOW CLICK] Unexpected error during auto-expiration:', error)
              ElNotification({
                title: 'Error',
                message: 'Failed to process expired notification. Please try again.',
                type: 'error',
                duration: 5000,
              })
              emit('switch-tab', 'draft')
              setTimeout(() => {
                emit('refresh', true)
              }, 500)
              return
            }
          }
        } else {
          // Scheduled time is still valid - proceed to view page
          console.log('✅ [APPROVAL NOW CLICK] Scheduled time is valid - navigating to view page')
          router.push(`/notifications/view/${viewId}?fromTab=${props.activeTab}`)
        }
      } else {
        // No schedule - proceed normally
        console.log('✅ [APPROVAL NOW CLICK] No schedule - navigating to view page')
        router.push(`/notifications/view/${viewId}?fromTab=${props.activeTab}`)
      }
    } catch (error) {
      console.error('❌ [APPROVAL NOW CLICK] Error checking template:', error)
      // On error, still navigate to view page (fallback)
      router.push(`/notifications/view/${viewId}?fromTab=${props.activeTab}`)
    }
  } else {
    // Not a scheduled notification - proceed normally
    console.log('✅ [APPROVAL NOW CLICK] Not scheduled - navigating to view page')
    router.push(`/notifications/view/${viewId}?fromTab=${props.activeTab}`)
  }
}

const handleApproveClick = async (notification: Notification) => {
  const templateId = notification.templateId || notification.id
  
  console.log('🔵 [APPROVE CLICK] Starting approval for template:', {
    templateId,
    notificationId: notification.id,
    activeTab: props.activeTab,
    sendType: notification.sendType,
    scheduledTime: notification.scheduledTime,
  })
  
  try {
    // Fetch full template to validate and check schedule status
    const { api } = await import('@/services/api')
    const fullTemplate = await api.get(`/api/v1/template/${templateId}`)
    const template = fullTemplate.data?.data || fullTemplate.data
    
    console.log('🔵 [APPROVE CLICK] Fetched template:', {
      templateId,
      sendSchedule: template?.sendSchedule,
      sendType: template?.sendType,
      approvalStatus: template?.approvalStatus,
      isSent: template?.isSent,
    })
    
    // If approving from draft tab, validate required data first
    if (props.activeTab === 'draft') {
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
          message: 'Please check data again. This template is missing required fields (title or content).',
          type: 'error',
          duration: 4000,
          dangerouslyUseHTMLString: true,
        })
        return
      }
    }
    
    console.log('📤 [APPROVE CLICK] Calling approve API for template:', templateId)
    const result = await notificationApi.approveTemplate(Number(templateId))
    console.log('✅ [APPROVE CLICK] Approval API call successful:', result)
    
    // Fetch updated template after approval to get the latest status
    const updatedTemplateResponse = await api.get(`/api/v1/template/${templateId}`)
    const updatedTemplate = updatedTemplateResponse.data?.data || updatedTemplateResponse.data
    
    console.log('📥 [APPROVE CLICK] Fetched updated template:', {
      templateId,
      sendType: updatedTemplate?.sendType,
      sendSchedule: updatedTemplate?.sendSchedule,
      isSent: updatedTemplate?.isSent,
      approvalStatus: updatedTemplate?.approvalStatus,
    })
    
    // Determine redirect tab based on sendType and isSent status
    // If scheduled and not yet sent, it should stay in Scheduled tab
    const isScheduled = 
      (updatedTemplate?.sendType === 'SEND_SCHEDULE' || updatedTemplate?.sendSchedule !== null) &&
      updatedTemplate?.isSent === false
    
    const redirectTab = isScheduled ? 'scheduled' : 'published'
    
    const message = isScheduled 
      ? '<strong>Notification approved successfully!</strong> It will be sent at the scheduled time and moved to Published tab automatically.'
      : '<strong>Notification approved and published successfully!</strong> Users will receive it shortly.'
    
    ElNotification({
      title: 'Success',
      message: message,
      type: 'success',
      duration: 3000,
      dangerouslyUseHTMLString: true,
    })
    
    // Redirect to appropriate tab
    emit('switch-tab', redirectTab)
    emit('refresh')
  } catch (error: any) {
    console.log('❌ [APPROVE CLICK] Error caught:', {
      error: error,
      response: error.response,
      responseData: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    })
    
    // Check if this is an auto-expiration or auto-rejection due to passed scheduled time
    const isAutoExpired = error.response?.data?.data?.autoExpired === true
    const isAutoRejected = error.response?.data?.data?.autoRejected === true
    const expiredReason = error.response?.data?.responseMessage || error.response?.data?.data?.expiredReason || 'Scheduled time has passed. Please contact team member to update the schedule first.'
    const rejectionReason = error.response?.data?.responseMessage || error.response?.data?.data?.rejectionReason || 'Failed to approve template'
    
    console.log('🔍 [APPROVE CLICK] Error analysis:', {
      isAutoExpired,
      isAutoRejected,
      expiredReason,
      rejectionReason,
      errorResponseData: error.response?.data,
    })
    
    if (isAutoExpired) {
      // Auto-expired due to passed scheduled time - redirect to Draft tab
      console.log('⏰ [APPROVE CLICK] Template auto-expired - redirecting to Draft tab')
      ElNotification({
        title: 'Notification Expired',
        message: `<strong>Scheduled time has expired</strong>. Please contact <strong>team member</strong> to update the schedule first.`,
        type: 'warning',
        duration: 5000,
        dangerouslyUseHTMLString: true,
      })
      
      // Redirect to Draft tab and refresh after a short delay to ensure backend has processed
      console.log('🔄 [APPROVE CLICK] Switching to Draft tab and refreshing')
      emit('switch-tab', 'draft')
      setTimeout(() => {
        emit('refresh', true) // Force refresh to show updated status
      }, 500) // Small delay to ensure backend has updated
    } else if (isAutoRejected) {
      // Auto-rejected due to passed scheduled time - redirect to Draft tab
      ElNotification({
        title: 'Notification Rejected',
        message: rejectionReason,
        type: 'warning',
        duration: 5000,
      })
      
      // Redirect to Draft tab and refresh
      emit('switch-tab', 'draft')
      emit('refresh', true) // Force refresh to show updated status
    } else {
      ElNotification({
        title: 'Error',
        message: rejectionReason,
        type: 'error',
        duration: 3000,
      })
    }
  }
}

const handleSubmitClick = async (notification: Notification) => {
  try {
    const templateId = notification.templateId || notification.id
    
    // Validate all required fields before submitting
    const { api } = await import('@/services/api')
    const fullTemplate = await api.get(`/api/v1/template/${templateId}`)
    const template = fullTemplate.data?.data || fullTemplate.data
    
    // Validate that all required fields are filled
    const translations = template?.translations || []
    let hasAllRequiredData = true
    const missingFields: string[] = []

    for (const translation of translations) {
      const hasTitle = translation?.title && translation.title.trim() !== ''
      const hasContent = translation?.content && translation.content.trim() !== ''

      if (!hasTitle) {
        hasAllRequiredData = false
        missingFields.push(`Title (${translation.language})`)
      }
      if (!hasContent) {
        hasAllRequiredData = false
        missingFields.push(`Content (${translation.language})`)
      }
    }

    if (!hasAllRequiredData) {
      ElNotification({
        title: 'Error',
        message: 'Please check data, fill data missing on required field.',
        type: 'error',
        duration: 4000,
      })
      return
    }
    
    const response = await notificationApi.submitTemplate(Number(templateId))
    
    // Optimistically update the notification in the list
    const updatedNotification = {
      ...notification,
      approvalStatus: 'PENDING' as const,
    }
    
    ElNotification({
      title: 'Success',
      message: 'Notification has been submitted for approval. It will appear in the Pending Approval tab.',
      type: 'success',
      duration: 3000,
    })
    
    // Emit update event with the updated notification for immediate UI update
    emit('update-notification', updatedNotification)
    // Switch to Pending tab to show the submitted template
    emit('switch-tab', 'pending')
    // Refresh in background to get the latest data from server
    emit('refresh')
  } catch (error: any) {
    ElNotification({
      title: 'Error',
      message: error.response?.data?.responseMessage || 'Failed to submit template for approval',
      type: 'error',
      duration: 3000,
    })
  }
}

const handlePublishNowClick = async (notification: Notification) => {
  // Show loading notification immediately
  const loadingNotification = ElNotification({
    title: 'Sending Notification',
    message: 'Please wait while we send the notification to all users. This may take a moment if there are many recipients...',
    type: 'info',
    duration: 0, // Keep it open until we close it manually
  })

  try {
    const templateId = notification.templateId || notification.id
    
    // Fetch full template to get all data FIRST
    const { api } = await import('@/services/api')
    const fullTemplate = await api.get(`/api/v1/template/${templateId}`)
    const template = fullTemplate.data?.data || fullTemplate.data
    
    // Prepare update payload - keep all original data, just set isSent=true to send immediately
    // Don't change sendType, sendSchedule, or any other fields - keep as submitted
    const updatePayload: any = {
      isSent: true, // Only change this - send immediately
      // Keep original sendType (could be SEND_NOW, SEND_SCHEDULE, etc.)
      sendType: template?.sendType || 'SEND_NOW',
      // Keep original sendSchedule if it exists
      sendSchedule: template?.sendSchedule || null,
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
    
    // Call API and WAIT for it to complete BEFORE redirecting
    // This ensures the template is updated in the database before we show it
    const result = await notificationApi.updateTemplate(Number(templateId), updatePayload)
    
    // Close loading notification
    loadingNotification.close()
    
    // Extract response data - handle different response structures
    const responseData = result?.data?.data || result?.data || result
    const successfulCount = responseData?.successfulCount || 0
    const failedCount = responseData?.failedCount || 0
    const isSent = responseData?.isSent === true
    const approvalStatus = responseData?.approvalStatus
    
    // NOW redirect to Published tab AFTER API completes successfully
    // This ensures the template will appear immediately with correct status
    emit('switch-tab', 'published')
    
    // Force refresh immediately after redirect to show the updated template
    // Use small delay to ensure tab switch completes
    await new Promise(resolve => setTimeout(resolve, 50))
    emit('refresh', true) // Pass true to force refresh (bypass cache)
    
    // Show success message with send results
    if (isSent || approvalStatus === 'APPROVED') {
      if (successfulCount > 0) {
        ElNotification({
          title: 'Success',
          // it will remove this message in the future
          message: `Notification published and sent to ${successfulCount} user(s) immediately.${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
          type: 'success',
          duration: 3000,
        })
      } else {
        ElNotification({
          title: 'Success',
          message: 'Notification published successfully.',
          type: 'success',
          duration: 3000,
        })
      }
    } else {
      // Fallback: if response doesn't show isSent/APPROVED, fetch template to verify
      const verifyTemplate = await api.get(`/api/v1/template/${templateId}`)
      const verifiedData = verifyTemplate.data?.data || verifyTemplate.data
      
      if (verifiedData?.isSent === true || verifiedData?.approvalStatus === 'APPROVED') {
        ElNotification({
          title: 'Success',
          message: `Notification published and sent to users immediately.`,
          type: 'success',
          duration: 3000,
        })
      } else {
        ElNotification({
          title: 'Warning',
          message: 'Notification was updated but may not have been sent. Please check the notification status.',
          type: 'warning',
          duration: 5000,
        })
      }
    }
  } catch (error: any) {
    // Close loading notification on error
    loadingNotification.close()
    
    ElNotification({
      title: 'Error',
      message: error.response?.data?.responseMessage || 'Failed to publish notification',
      type: 'error',
      duration: 3000,
    })
    // On error, still refresh to show current state
    emit('refresh', true)
  }
}

const handleRejectClick = async (notification: Notification) => {
  const result = await showRejectDialog()
  if (result.confirmed && result.reason) {
    try {
      const templateId = notification.templateId || notification.id
      await notificationApi.rejectTemplate(Number(templateId), result.reason)
      
      ElNotification({
        title: 'Success',
        message: 'Template rejected successfully and moved to Draft tab',
        type: 'success',
        duration: 2000,
      })
      
      // Set localStorage immediately to ensure tab switches instantly
      try {
        localStorage.setItem('notification_active_tab', 'draft')
        // Clear cache to force immediate refresh
        localStorage.removeItem('notifications_cache')
        localStorage.removeItem('notifications_cache_timestamp')
      } catch (error) {
        console.warn('Failed to update localStorage:', error)
      }
      
      // Redirect to draft tab and force refresh
      emit('switch-tab', 'draft')
      // Force refresh immediately with cache cleared
      emit('refresh', true)
    } catch (error: any) {
      ElNotification({
        title: 'Error',
        message: error.response?.data?.responseMessage || 'Failed to reject template',
        type: 'error',
        duration: 3000,
      })
    }
  }
}
</script>

<style scoped>
.notification-container {
  width: 100%;
}

.notification-wrapper {
  width: 100%;
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
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 100%;
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
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 56px;
  min-width: 0;
  overflow: visible;
  flex-wrap: wrap;
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

.submit-button {
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

.submit-button:hover {
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

.delete-button:hover:not(:disabled) {
  background: #e03e3e;
}

.delete-button.disabled,
.delete-button:disabled {
  background: #9ca3af !important;
  color: #6b7280 !important;
  opacity: 0.6;
  cursor: not-allowed !important;
  pointer-events: none;
}

.delete-button.disabled:hover,
.delete-button:disabled:hover {
  background: #9ca3af !important;
  opacity: 0.6;
}

.approval-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  height: 24px;
}

.approval-badge-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
  height: 24px;
  white-space: nowrap;
}

.approval-badge-tag.badge-pending {
  background-color: #fef3c7;
  color: #92400e;
}

.approval-badge-tag.badge-approved {
  background-color: #d1fae5;
  color: #065f46;
}

.approval-badge-tag.badge-rejected {
  background-color: #fee2e2;
  color: #991b1b;
}

.approval-badge-tag.badge-expired {
  background-color: #fef3c7;
  color: #92400e;
}

.view-button {
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
  color: #001346;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
}

.view-button:hover:not(:disabled) {
  background: rgba(0, 19, 70, 0.1);
}

.view-button:disabled,
.view-button.disabled {
  background: #9ca3af !important;
  color: #6b7280 !important;
  cursor: not-allowed !important;
  opacity: 0.6;
  pointer-events: none;
}

.view-button:disabled:hover,
.view-button.disabled:hover {
  background: #9ca3af !important;
  color: #6b7280 !important;
}

.approval-now-button {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 12px;
  gap: 6px;
  min-width: 130px;
  height: 56px;
  flex: 0 0 auto;
  background: #10b981;
  border-radius: 32px;
  border: none;
  cursor: pointer;
  color: white;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
}

.approval-now-button:hover:not(:disabled) {
  background: #059669;
}

.approval-now-button:disabled,
.approval-now-button.disabled {
  background: #9ca3af !important;
  color: #6b7280 !important;
  cursor: not-allowed !important;
  opacity: 0.6;
  pointer-events: none;
}

.approval-now-button:disabled:hover,
.approval-now-button.disabled:hover {
  background: #9ca3af !important;
}

.publish-now-button {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 12px;
  gap: 6px;
  min-width: 130px;
  height: 56px;
  flex: 0 0 auto;
  background: #0f4aea;
  border-radius: 32px;
  border: none;
  cursor: pointer;
  color: white;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
}

.publish-now-button:hover:not(:disabled) {
  background: #0d3bc7;
}

.publish-now-button:disabled,
.publish-now-button.disabled {
  background: #9ca3af !important;
  color: #6b7280 !important;
  cursor: not-allowed !important;
  opacity: 0.6;
  pointer-events: none;
}

.publish-now-button:disabled:hover,
.publish-now-button.disabled:hover {
  background: #9ca3af !important;
}

.approve-button {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 12px;
  gap: 6px;
  min-width: 100px;
  height: 56px;
  flex: 0 0 auto;
  background: #10b981;
  border-radius: 32px;
  border: none;
  cursor: pointer;
  color: white;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
}

.approve-button:hover:not(:disabled) {
  background: #059669;
}

.approve-button:disabled,
.approve-button.disabled {
  background: #9ca3af !important;
  color: #6b7280 !important;
  cursor: not-allowed !important;
  opacity: 0.6;
  pointer-events: none;
}

.approve-button:disabled:hover,
.approve-button.disabled:hover {
  background: #9ca3af !important;
}

.reject-button {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 12px;
  gap: 6px;
  min-width: 100px;
  height: 56px;
  flex: 0 0 auto;
  background: #ef4444;
  border-radius: 32px;
  border: none;
  cursor: pointer;
  color: white;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
}

.reject-button:hover:not(:disabled) {
  background: #dc2626;
}

.reject-button:disabled,
.reject-button.disabled {
  background: #9ca3af !important;
  color: #6b7280 !important;
  cursor: not-allowed !important;
  opacity: 0.6;
  pointer-events: none;
}

.reject-button:disabled:hover,
.reject-button.disabled:hover {
  background: #9ca3af !important;
}

.button-icon {
  width: 24px;
  height: 24px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  height: 100%;
  min-height: 400px;
  grid-column: 1 / -1;
  padding-top: 80px;
}

.empty-state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 24px;
  width: 241px;
  height: 391.87px;
}

.image-empty-state {
  width: 191.96px;
  height: 337.87px;
  display: flex;
}

.empty-message {
  color: #000000;
  font-size: 20px;
  font-weight: 600;
  font-family: 'IBM Plex Sans';
}

@media (max-width: 1400px) {
  .grid-container {
    gap: 20px;
  }
}

@media (max-width: 1200px) {
  .grid-container {
    gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }

  .button-container {
    gap: 6px;
  }

  .publish-button,
  .submit-button,
  .edit-button,
  .delete-button {
    min-width: 0;
    flex: 1;
    padding: 8px 4px;
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .grid-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .button-container {
    flex-wrap: nowrap;
  }

  .publish-button,
  .submit-button,
  .edit-button,
  .delete-button {
    flex: 1;
    min-width: 0;
  }
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 200px;
  grid-column: 1 / -1;
}

.loading-text {
  color: #7a8190;
  font-size: 16px;
  font-weight: 500;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  height: 100%;
  min-height: 400px;
  grid-column: 1 / -1;
  padding-top: 80px;
}

.empty-state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 24px;
  width: 241px;
  height: 391.87px;
}

.image-empty-state {
  width: 191.96px;
  height: 337.87px;
  display: flex;
}
</style>
