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
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { BakongApp } from '@bakong/shared'
import ScheduleNotificationCard from '@/components/common/ScheduleNotificationCard.vue'
import type { Notification } from '@/services/notificationApi'

const selectedPlatform = ref<BakongApp>(BakongApp.BAKONG)
const notifications = ref<Notification[]>([])

// Set to August 2025 for demo
const currentWeekStart = ref<Date>(new Date(2025, 7, 3)) // Aug 3, 2025

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
    const raw = (n as any).sendSchedule || (n as any).templateStartAt || (n as any).date
    if (!raw) return false
    const scheduleDate = new Date(raw)
    if (isNaN(scheduleDate.getTime())) return false
    return formatDateForComparison(scheduleDate) === dateStr
  })
}

// MOCK DATA
const buildMock = (): Notification[] => {
  const weekStart = currentWeekStart.value
  const sunday = new Date(weekStart)
  sunday.setDate(weekStart.getDate() - weekStart.getDay())

  const mk = (offset: number, h: number, m = 0) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + offset)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  return [
    { id: 1, title: 'Thailand, Cambodia officials meet in Malay...', description: 'Officials from Thailand and Cambodia...', image: 'https://picsum.photos/seed/a/400/220', status: 'SCHEDULED', sendSchedule: mk(0, 9) } as any,
    { id: 2, title: 'Thailand, Cambodia officials meet in Malay...', description: 'Officials from Thailand and Cambodia...', image: 'https://picsum.photos/seed/b/400/220', status: 'SENT', sendSchedule: mk(0, 11) } as any,
    { id: 3, title: 'Thailand, Cambodia officials meet in Malay...', description: 'Officials from Thailand and Cambodia...', status: 'SCHEDULED', sendSchedule: mk(0, 14) } as any,
    { id: 4, title: 'Thailand, Cambodia officials meet in Malay...', description: 'Officials from Thailand and Cambodia...', image: 'https://picsum.photos/seed/c/400/220', status: 'SENT', sendSchedule: mk(0, 16) } as any,
    { id: 5, title: 'Thailand, Cambodia officials meet in Malay...', description: 'Officials from Thailand and Cambodia...', status: 'SENT', sendSchedule: mk(0, 18) } as any,

    { id: 6, title: 'Thailand, Cambodia officials meet in Malay...', description: 'Officials from Thailand and Cambodia...', status: 'SENT', sendSchedule: mk(2, 15) } as any,
    { id: 7, title: 'Thailand, Cambodia officials meet in Malay...', description: 'Officials from Thailand and Cambodia...', image: 'https://picsum.photos/seed/d/400/220', status: 'SENT', sendSchedule: mk(2, 16) } as any,

    { id: 8, title: 'Thailand, Cambodia officials meet in Malay...', description: 'Officials from Thailand and Cambodia...', status: 'SCHEDULED', sendSchedule: mk(5, 15) } as any,
  ]
}

const handleSendNow = (n: Notification) => {
  alert(`Publish now: ${n.title}`)
}

onMounted(() => {
  notifications.value = buildMock()
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
