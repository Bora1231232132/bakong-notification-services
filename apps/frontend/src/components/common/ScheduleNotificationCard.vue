<template>
  <div class="flex flex-col gap-3 w-full">
    <div
      v-for="n in notificationsForDay"
      :key="n.id"
      class="schedule-card flex-shrink-0"
      :style="{ height: cardHeight(n) }"
    >
      <div 
        class="text-[14px] font-semibold leading-[150%] text-black line-clamp-2"
        :class="{ 'lang-khmer': containsKhmer(n.title) }"
      >
        {{ n.title }}
      </div>

      <div 
        class="text-[11px] font-normal leading-[150%] text-black line-clamp-3"
        :class="{ 'lang-khmer': containsKhmer(n.description) }"
      >
        {{ n.description }}
      </div>

      <div v-if="hasImage(n)" class="w-full h-[86.98px] overflow-hidden rounded">
        <img :src="(n as any).image || n.image" class="w-full h-full object-cover" alt="" />
      </div>

      <div class="text-[13px] font-normal leading-[150%] text-black">
        Scheduled on {{ formatTime(n) }}
      </div>

      <!-- Approval button for approver role when notification is pending -->
      <button
        v-if="showApprovalButton(n)"  
        :disabled="!canUseButtons()"
        class="mt-2 w-[123px] h-[56px] rounded-[32px] text-white text-[16px] font-semibold leading-[150%] transition-colors"
        :class="canUseButtons() 
          ? 'bg-[#10B981] hover:bg-[#059669] cursor-pointer' 
          : 'bg-gray-400 cursor-not-allowed opacity-60'"
        @click="canUseButtons() && $emit('approve-navigate', n)"
      >
        Approval
      </button>

      <!-- Publish now button for scheduled notifications -->
      <button
        v-else-if="showButton(n)"  
        :disabled="!canUseButtons()"
        class="mt-2 w-[123px] h-[56px] rounded-[32px] text-white text-[16px] font-semibold leading-[150%] transition-colors"
        :class="canUseButtons() 
          ? 'bg-[#0F4AEA] hover:bg-[#0d3bc7] cursor-pointer' 
          : 'bg-gray-400 cursor-not-allowed opacity-60'"
        @click="canUseButtons() && $emit('send-now', n)"
      >
        Publish now
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Notification } from '@/services/notificationApi'
import { containsKhmer } from '@/utils/helpers'
import { UserRole } from '@bakong/shared'

defineEmits<{
  (e: 'send-now', n: Notification): void
  (e: 'approve', n: Notification): void
  (e: 'approve-navigate', n: Notification): void
}>()

const props = defineProps<{
  notificationsForDay: Notification[]
  userRole?: string
}>()

const hasImage = (n: Notification) => {
  // Check both direct property and any cast for maximum compatibility
  const img = (n as any).image || n.image
  // Explicitly check for falsy values
  if (img === null || img === undefined) return false
  // Must be a non-empty string
  if (typeof img !== 'string') return false
  const trimmed = img.trim()
  // Return true if image URL is valid (not empty, null, or undefined strings)
  return trimmed.length > 0 && trimmed !== 'null' && trimmed !== 'undefined'
}

const isScheduled = (n: Notification) => {
  const status = (n as any).status
  return status === 'SCHEDULED' || status === 'scheduled'
}

/**
 * Frame rules based on design:
 * - Frame 69: image, NO button, height 275.74px
 * - Frame 80: no image, WITH button, height 244.75px
 * - Frame 78: no image, NO button, height 176.75px
 * - Image + Button: image, WITH button, height 343.74px (275.74 + 56 button + 12 gap)
 */
const isApprover = () => {
  // Only APPROVAL role can use buttons
  return props.userRole === UserRole.APPROVAL
}

const canUseButtons = () => {
  // Only APPROVAL role can click buttons, others see them disabled
  return props.userRole === UserRole.APPROVAL
}

const isPending = (n: Notification) => {
  const approvalStatus = (n as any).approvalStatus
  return approvalStatus === 'PENDING'
}

const showApprovalButton = (n: Notification) => {
  // Show approval button for all roles when notification is pending (but disabled for non-approvers)
  return isPending(n)
}

const isApproved = (n: Notification) => {
  const approvalStatus = (n as any).approvalStatus
  return approvalStatus === 'APPROVED' || !approvalStatus // Approved or legacy (no approvalStatus)
}

const showButton = (n: Notification) => {
  // Show publish now button for all roles when notification is scheduled and approved (but disabled for non-approvers)
  return isScheduled(n) && !isPending(n) && isApproved(n)
}

const cardHeight = (n: Notification) => {
  const hasImg = hasImage(n)
  // Check if any button should be shown (approval or publish now)
  const hasBtn = showApprovalButton(n) || showButton(n)
  
  // if (hasImg && hasBtn) {
  //   // Image + Button case: 275.74px (base) + 56px (button) + 12px (gap) = 343.74px
  //   return '343.74px'
  // }
  // if (hasImg) {
  //   // Frame 69: image, NO button
  //   return '275.74px'
  // }
  // if (hasBtn) {
  //   // Frame 80: no image, WITH button
  //   return '244.75px'
  // }
  // Frame 78: no image, NO button
  return 'full-height'
}

const formatTime = (n: Notification) => {
  // Try multiple sources for schedule time
  const raw = (n as any).sendSchedule || (n as any).templateStartAt || (n as any).scheduledTime || (n as any).date
  
  if (!raw) return ''
  
  // Handle Date objects
  let d: Date
  if (raw instanceof Date) {
    d = raw
  } else if (typeof raw === 'string') {
    // Parse ISO string or other date formats
    d = new Date(raw)
  } else {
    return ''
  }
  
  if (isNaN(d.getTime())) {
    // Try parsing scheduledTime if it's a formatted string like "HH:MM"
    const scheduledTime = (n as any).scheduledTime
    if (scheduledTime && typeof scheduledTime === 'string') {
      // Extract time from formatted string like "13 December 2025 | 16:46" or "16:46"
      const timeMatch = scheduledTime.match(/(\d{1,2}):(\d{2})/)
      if (timeMatch) {
        return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
      }
    }
    return ''
  }
  
  // Format as HH:MM
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
</script>

<style scoped>
.schedule-card {    
  margin-bottom: -22px;
  width: 176px;
  padding: 8px 8px 0px 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  background: white;
  border-radius: 0;
  padding-bottom: 20px;
}

.line-clamp-2,
.line-clamp-3 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.line-clamp-3 {
  -webkit-line-clamp: 3;
  line-clamp: 3;
}
</style>

