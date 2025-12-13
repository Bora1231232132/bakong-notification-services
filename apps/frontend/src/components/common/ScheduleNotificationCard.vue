<template>
  <div class="flex flex-col gap-3 w-full">
    <div
      v-for="n in notificationsForDay"
      :key="n.id"
      class="schedule-card flex-shrink-0"
      :style="{ height: cardHeight(n) }"
    >
      <div class="text-[14px] font-semibold leading-[150%] text-black line-clamp-2">
        {{ n.title }}
      </div>

      <div class="text-[11px] font-normal leading-[150%] text-black line-clamp-3">
        {{ n.description }}
      </div>

      <div v-if="hasImage(n)" class="w-full h-[86.98px] overflow-hidden rounded">
        <img :src="(n as any).image || n.image" class="w-full h-full object-cover" alt="" />
      </div>

      <div class="text-[13px] font-normal leading-[150%] text-black">
        Scheduled on {{ formatTime(n) }}
      </div>

      <button
        v-if="showButton(n)"  
        class="mt-2 w-[123px] h-[56px] rounded-[32px] bg-[#0F4AEA] text-white text-[16px] font-semibold leading-[150%] hover:bg-[#0d3bc7] transition-colors"
        @click="$emit('send-now', n)"
      >
        Publish now
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Notification } from '@/services/notificationApi'

defineEmits<{
  (e: 'send-now', n: Notification): void
}>()

const props = defineProps<{
  notificationsForDay: Notification[]
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
const showButton = (n: Notification) => isScheduled(n)

const cardHeight = (n: Notification) => {
  const hasImg = hasImage(n)
  const hasBtn = showButton(n)
  
  if (hasImg && hasBtn) {
    // Image + Button case: 275.74px (base) + 56px (button) + 12px (gap) = 343.74px
    return '343.74px'
  }
  if (hasImg) {
    // Frame 69: image, NO button
    return '275.74px'
  }
  if (hasBtn) {
    // Frame 80: no image, WITH button
    return '244.75px'
  }
  // Frame 78: no image, NO button
  return 'full-height'
}

const formatTime = (n: Notification) => {
  const raw = (n as any).sendSchedule || (n as any).templateStartAt
  if (!raw) return ''
  const d = new Date(raw)
  if (isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
</script>

<style scoped>
.schedule-card {    
  margin-bottom: -55px;
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

