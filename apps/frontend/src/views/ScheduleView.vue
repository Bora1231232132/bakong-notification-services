<template>
  <div class="w-full h-full min-h-0">
    <!-- page padding 20 -->
    <div class="h-full min-h-0 flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between h-14 mb-[23px]" style="padding-bottom: 20px;">
        <div class="flex items-center gap-6">
          <!-- Month/Year -->
          <div class="text-[23px] font-semibold leading-none text-slate-900">
            {{ currentMonthYear }}
          </div>

          <!-- Week navigation -->
          <div class="inline-flex items-center h-10 gap-4">
            <button
              type="button"
              @click="goToPreviousWeek"
              class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200"
              aria-label="Previous week"
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
              aria-label="Next week"
            >
              <el-icon class="text-[#0B1A46] text-2xl">
                <ArrowRight />
              </el-icon>
            </button>
          </div>
        </div>

        <!-- Platform select -->
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

      <!-- Grid area
           ✅ mb-5 = bottom spacing outside border
           ✅ flex-1 min-h-0 = allow grid to size correctly and scroll if needed
      -->
      <div class="flex-1 min-h-0" style="padding-bottom: 20px;">
        <!-- calendar grid wrapper (border around everything) -->
        <div class="h-full flex flex-col bg-white border border-[rgba(0,19,70,0.1)]">
          <!-- day headers -->
          <div
            class="grid grid-cols-7 h-16 border-b border-[rgba(0,19,70,0.1)]"
          >
            <div
              v-for="(day, idx) in weekDays"
              :key="day.date.toISOString() + '-h'"
              class="flex items-center justify-center text-[16px] font-normal text-black
                     border-l border-[rgba(0,19,70,0.1)]"
              :class="idx === 0 ? 'border-l-0' : ''"
            >
              {{ day.label }}
            </div>
          </div>

          <!-- day columns -->
          <div class="grid grid-cols-7 flex-1 min-h-0">
            <div
              v-for="(day, idx) in weekDays"
              :key="day.date.toISOString()"
              class="min-w-0 min-h-0 p-2 flex flex-col gap-3
                     border-l border-[rgba(0,19,70,0.1)] overflow-y-auto"
              :class="idx === 0 ? 'border-l-0' : ''"
            >
              <!-- cards -->

            </div>
          </div>
        </div>
        <!-- ✅ bottom space comes from mb-5 above -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { BakongApp } from '@bakong/shared'
import { notificationApi, type Notification } from '@/services/notificationApi'
import { useErrorHandler } from '@/composables/useErrorHandler'

const { handleApiError, showSuccess } = useErrorHandler({ component: 'ScheduleView' })

const selectedPlatform = ref<BakongApp>(BakongApp.BAKONG)
const notifications = ref<Notification[]>([])
const loading = ref(false)
const sendingNotifications = ref<Set<number>>(new Set())
const currentWeekStart = ref<Date>(new Date())

const weekDays = computed(() => {
  const start = new Date(currentWeekStart.value)
  const sunday = new Date(start)
  sunday.setDate(start.getDate() - start.getDay())

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + i)
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
    const raw = n.sendSchedule || n.templateStartAt || n.date
    if (!raw) return false
    const scheduleDate = new Date(raw as any)
    if (isNaN(scheduleDate.getTime())) return false
    return formatDateForComparison(scheduleDate) === dateStr
  })
}

const getScheduledTime = (n: Notification) => {
  const raw = n.sendSchedule || n.templateStartAt
  if (!raw) return ''
  const d = new Date(raw)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const canPublishNow = (n: Notification) => n.status === 'SCHEDULED' || n.status === 'scheduled'


let isMounted = false
let isFetching = false

const fetchNotifications = async () => {
  if (isFetching) return
  try {
    isFetching = true
    loading.value = true

    const res = await notificationApi.getAllNotifications({ page: 1, pageSize: 100 })
    notifications.value = res.data
  } catch (e) {
    handleApiError(e, { operation: 'fetchNotifications' })
  } finally {
    loading.value = false
    isFetching = false
  }
}

const handleSendNow = async (notification: Notification) => {
  try {
    const templateId = notification.templateId || notification.id
    sendingNotifications.value.add(notification.id as number)

    await notificationApi.sendNotificationNow(Number(templateId))
    showSuccess(`Notification sent: ${notification.title}`, { operation: 'sendNotification' })
  } catch (e) {
    handleApiError(e, { operation: 'sendNotification' })
  } finally {
    sendingNotifications.value.delete(notification.id as number)
  }
}

onMounted(async () => {
  if (isMounted) return
  isMounted = true
  await fetchNotifications()
})

onUnmounted(() => {
  isMounted = false
})
</script>

<style scoped>
/* Element Plus select needs deep styling (Tailwind can't reach internal parts) */
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

</style>
