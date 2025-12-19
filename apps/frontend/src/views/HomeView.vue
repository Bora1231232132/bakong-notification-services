<template>
  <div class="home-page">
    <div class="main-content">
      <Tabs v-model="activeTab" :tabs="filterTabs" @tab-changed="handleTabChanged" />
      <div class="search-filter-bar">
        <div class="filter-dropdown">
          <el-select v-model="selectedFilter" placeholder="ALL" size="large" class="filter-select">
            <el-option
              v-for="option in filterOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="search-input">
          <el-input
            v-model="searchQuery"
            placeholder="search by title or description"
            class="search-field"
            size="large"
          >
            <template #suffix>
              <el-icon class="search-icon">
                <Search />
              </el-icon>
            </template>
          </el-input>
        </div>
        <div class="date-range">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            unlink-panels
            :shortcuts="shortcuts"
            :editable="false"
            :clearable="false"
            :teleported="false"
            popper-class="range-popper"
            ref="pickerRef"
            class="date-picker"
          >
            <template #trigger>
              <div class="custom-date-range">
                <span class="date-text"> {{ selectedLabel }} ({{ formattedRange }}) </span>
                <div class="calendar-icon-container">
                  <el-icon>
                    <Calendar />
                  </el-icon>
                </div>
              </div>
            </template>
          </el-date-picker>
        </div>
      </div>
      <div class="notifications-grid">
        <div class="notification-cards-container">
          <div v-if="loading" class="loading-container">
            <div class="loading-spinner">Loading notifications...</div>
          </div>
          <div v-else-if="filteredNotifications.length === 0" class="empty-state">
            <div class="empty-state-container">
              <img
                src="/src/assets/image/jomreadsur.png"
                alt="Empty State"
                class="image-empty-state"
              />
              <div class="empty-message text-center text-gray-500 text-sm">
                Jom Reab Sur, it is empty!
              </div>
            </div>
          </div>
          <NotificationCard
            v-else
            :active-tab="activeTab"
            :notifications="filteredNotifications"
            :loading="loading"
            @refresh="fetchNotifications"
            @delete="handleDeleteNotification"
            @publish="handlePublishNotification"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { Search, Calendar } from '@element-plus/icons-vue'
import NotificationCard from '@/components/common/NotificationCard.vue'
import { Tabs } from '@/components/common'
import { notificationApi } from '@/services/notificationApi'
import type { Notification } from '@/types/notification'
import { ElNotification } from 'element-plus'
import {
  NotificationType,
  SendType,
  Platform,
  formatNotificationType,
  formatBakongApp,
  getFormattedPlatformName,
  getNoUsersAvailableMessage,
  getNotificationMessage,
  formatPlatform,
} from '@/utils/helpers'
import { DateUtils } from '@bakong/shared'
import { mapBackendStatusToFrontend } from '../utils/helpers'
import { api } from '@/services/api'

const route = useRoute()

// Helper function to correct notification status based on isSent flag
const correctNotificationStatus = (notification: Notification): Notification => {
  let status = notification.status
  if (notification.isSent === true) {
    status = 'published'
  }
  return {
    ...notification,
    status: status,
  }
}

const activeTab = ref<'published' | 'scheduled' | 'draft'>('published')
const selectedFilter = ref('ALL')
const searchQuery = ref('')
const loading = ref(false)
const notifications = ref<Notification[]>([])
const filteredNotifications = ref<Notification[]>([])

const filterTabs = [
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Draft' },
]

const handleTabChanged = (tab: { value: string; label: string }) => {}

const filterOptions = computed(() => {
  const options = [{ label: 'ALL', value: 'ALL' }]

  Object.values(NotificationType).forEach((type) => {
    const label = formatNotificationType(String(type))
    options.push({ label, value: String(type) })
  })
  return options
})

const selectedLabel = ref('Last 30 days')
const dateRange = ref<[Date, Date]>([
  dayjs().subtract(29, 'day').startOf('day').toDate(),
  dayjs().endOf('day').toDate(),
])

const mockDateRange = ref<[Date, Date]>([
  dayjs().subtract(29, 'day').startOf('day').toDate(),
  dayjs().endOf('day').toDate(),
])

const formattedRange = computed(() => {
  const [s, e] = dateRange.value
  return `${dayjs(s).format('MM/DD/YY')} - ${dayjs(e).format('MM/DD/YY')}`
})

const shortcuts = [
  {
    text: 'Last 30 days',
    value: [dayjs().subtract(29, 'day').startOf('day').toDate(), dayjs().endOf('day').toDate()],
  },
  {
    text: 'Last 7 days',
    value: [dayjs().subtract(6, 'day').startOf('day').toDate(), dayjs().endOf('day').toDate()],
  },
  { text: 'Today', value: [dayjs().startOf('day').toDate(), dayjs().endOf('day').toDate()] },
  {
    text: 'Yesterday',
    value: [
      dayjs().subtract(1, 'day').startOf('day').toDate(),
      dayjs().subtract(1, 'day').endOf('day').toDate(),
    ],
  },
  {
    text: 'This month',
    value: [dayjs().startOf('month').toDate(), dayjs().endOf('month').toDate()],
  },
  {
    text: 'Last month',
    value: [
      dayjs().subtract(1, 'month').startOf('month').toDate(),
      dayjs().subtract(1, 'month').endOf('month').toDate(),
    ],
  },
  {
    text: 'All time',
    value: [dayjs().subtract(1, 'year').startOf('day').toDate(), dayjs().endOf('day').toDate()],
  },
]

const mockNotifications: Notification[] = [
  {
    id: 1,
    author: 'Bopha',
    title: 'Thailand, Cambodia officials meet in Malaysia to cement ceasefire details',
    description:
      'Officials from Thailand and Cambodia have met in Malaysia for the start of border talks, a week after a fragile ceasefire brought an end to an eruption of five days of deadly clashes between the two countries.',
    content:
      'Officials from Thailand and Cambodia have met in Malaysia for the start of border talks, a week after a fragile ceasefire brought an end to an eruption of five days of deadly clashes between the two countries.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop',
    date: dayjs().subtract(1, 'day').format('D MMMM YYYY | HH:mm'),
    status: 'published',
    type: 'ANNOUNCEMENT',
    createdAt: dayjs().subtract(1, 'day').toDate(),
    templateId: 1,
    isSent: true,
    sendType: 'SEND_NOW',
    linkPreview: 'https://www.google.com',
  },
  {
    id: 1,
    author: 'Bopha',
    title: 'Notification Test',
    description: 'Notification Test',
    content:
      'Officials from Thailand and Cambodia have met in Malaysia for the start of border talks, a week after a fragile ceasefire brought an end to an eruption of five days of deadly clashes between the two countries.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop',
    date: dayjs().subtract(1, 'day').format('D MMMM YYYY | HH:mm'),
    status: 'published',
    type: 'NOTIFICATION',
    createdAt: dayjs().subtract(1, 'day').toDate(),
    templateId: 1,
    isSent: true,
    sendType: 'SEND_NOW',
    linkPreview: 'https://www.google.com',
  },
  {
    id: 2,
    author: 'Sokha',
    title: 'New Bakong System Update Available',
    description:
      'We are pleased to announce that a new system update is now available for all Bakong users. This update includes improved security features and enhanced user experience.',
    content:
      'We are pleased to announce that a new system update is now available for all Bakong users. This update includes improved security features and enhanced user experience.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop',
    date: dayjs().subtract(2, 'day').format('D MMMM YYYY | HH:mm'),
    status: 'published',
    type: 'ANNOUNCEMENT',
    createdAt: dayjs().subtract(2, 'day').toDate(),
    templateId: 2,
    isSent: true,
    sendType: 'SEND_NOW',
    linkPreview: 'https://www.google.com',
  },
  {
    id: 3,
    author: 'Ratanak',
    title: 'Scheduled Maintenance Notice',
    description:
      'Please be informed that our system will undergo scheduled maintenance on August 10th, 2025 from 2:00 AM to 4:00 AM. During this time, some services may be temporarily unavailable.',
    content:
      'Please be informed that our system will undergo scheduled maintenance on August 10th, 2025 from 2:00 AM to 4:00 AM. During this time, some services may be temporarily unavailable.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop',
    date: dayjs().subtract(3, 'day').format('D MMMM YYYY | HH:mm'),
    status: 'scheduled',
    type: 'NOTIFICATION',
    createdAt: dayjs().subtract(3, 'day').toDate(),
    templateId: 3,
    isSent: false,
    sendType: 'SEND_SCHEDULE',
    scheduledTime: '16:00',
    linkPreview: 'https://www.google.com',
  },
  {
    id: 7,
    author: 'Theany',
    title: 'Upcoming System Upgrade',
    description:
      'We will be performing a major system upgrade this weekend. The upgrade will include new features and performance improvements.',
    content:
      'We will be performing a major system upgrade this weekend. The upgrade will include new features and performance improvements.',
    image: '',
    date: dayjs().add(1, 'day').format('D MMMM YYYY | HH:mm'),
    status: 'scheduled',
    type: 'NOTIFICATION',
    createdAt: dayjs().add(1, 'day').toDate(),
    templateId: 7,
    isSent: false,
    sendType: 'SEND_SCHEDULE',
    scheduledTime: '20:00',
    linkPreview: 'https://www.google.com',
  },
  {
    id: 4,
    author: 'Sophea',
    title: 'Welcome New Bakong Members',
    description:
      'We would like to extend a warm welcome to all new members who have joined our Bakong community this month. Your participation helps strengthen our digital payment ecosystem.',
    content:
      'We would like to extend a warm welcome to all new members who have joined our Bakong community this month. Your participation helps strengthen our digital payment ecosystem.',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop',
    date: dayjs().subtract(4, 'day').format('D MMMM YYYY | HH:mm'),
    status: 'published',
    type: 'ANNOUNCEMENT',
    createdAt: dayjs().subtract(4, 'day').toDate(),
    templateId: 4,
    isSent: true,
    sendType: 'SEND_NOW',
    linkPreview: 'https://www.google.com',
  },
  {
    id: 5,
    author: 'Channary',
    title: 'Security Alert: Phishing Attempts',
    description:
      'We have detected increased phishing attempts targeting Bakong users. Please be cautious of suspicious emails and always verify the sender before clicking any links.',
    content:
      'We have detected increased phishing attempts targeting Bakong users. Please be cautious of suspicious emails and always verify the sender before clicking any links.',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=200&fit=crop',
    date: dayjs().subtract(5, 'day').format('D MMMM YYYY | HH:mm'),
    status: 'draft',
    type: 'NOTIFICATION',
    createdAt: dayjs().subtract(5, 'day').toDate(),
    templateId: 5,
    isSent: false,
    sendType: 'SEND_SCHEDULE',
    linkPreview: 'https://www.google.com',
  },
  {
    id: 6,
    author: 'Vicheka',
    title: 'Mobile App Update Released',
    description:
      'The latest version of the Bakong mobile app is now available for download. This update includes bug fixes, performance improvements, and new features.',
    content:
      'The latest version of the Bakong mobile app is now available for download. This update includes bug fixes, performance improvements, and new features.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=200&fit=crop',
    date: dayjs().subtract(6, 'day').format('D MMMM YYYY | HH:mm'),
    status: 'published',
    type: 'ANNOUNCEMENT',
    createdAt: dayjs().subtract(6, 'day').toDate(),
    templateId: 6,
    isSent: true,
    sendType: 'SEND_NOW',
    linkPreview: 'https://www.google.com',
  },
  {
    id: 8,
    author: 'Bopha',
    title: 'New Feature Announcement',
    description:
      'We are excited to announce a new feature that will enhance your Bakong experience. This feature will be available in the next update.',
    content:
      'We are excited to announce a new feature that will enhance your Bakong experience. This feature will be available in the next update.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop',
    date: dayjs().add(2, 'day').format('D MMMM YYYY | HH:mm'),
    status: 'draft',
    type: 'ANNOUNCEMENT',
    createdAt: dayjs().add(2, 'day').toDate(),
    templateId: 8,
    isSent: false,
    sendType: 'SEND_SCHEDULE',
    linkPreview: 'https://www.google.com',
  },
  {
    id: 9,
    author: 'Vicheka',
    title: 'Flash Alert: System Update',
    description: 'Important: System will be updated in 5 minutes. Please save your work.',
    content: 'Important: System will be updated in 5 minutes. Please save your work.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop',
    date: dayjs().subtract(6, 'day').format('D MMMM YYYY | HH:mm'),
    status: 'published',
    type: 'FLASH_NOTIFICATION',
    createdAt: dayjs().subtract(6, 'day').toDate(),
    templateId: 9,
    isSent: true,
    sendType: 'SEND_NOW',
    linkPreview: 'https://www.google.com',
  },
]

const USE_MOCK_DATA = false
let fetchNotificationTimeout: ReturnType<typeof setTimeout> | null = null
let isFetching = false
let lastFetchTime = 0
const MIN_FETCH_INTERVAL = 1000
const DATA_CACHE_DURATION = 30000 // 30 seconds (reduced for faster updates)
const SCHEDULED_TAB_CACHE_DURATION = 270000 // 4.5 minutes (more frequent for scheduled items)
const PUBLISHED_TAB_CACHE_DURATION = 10000 // 10 seconds (very short for published tab to show updates quickly)
const DUE_NOTIFICATION_CHECK_INTERVAL = 60000
const CACHE_STORAGE_KEY = 'notifications_cache'
const CACHE_TIMESTAMP_KEY = 'notifications_cache_timestamp'
const loadCacheFromStorage = (): { notifications: Notification[] | null; timestamp: number } => {
  try {
    const cachedData = localStorage.getItem(CACHE_STORAGE_KEY)
    const cachedTime = localStorage.getItem(CACHE_TIMESTAMP_KEY)

    if (cachedData && cachedTime) {
      const timestamp = parseInt(cachedTime, 10)
      const now = Date.now()
      if (now - timestamp < DATA_CACHE_DURATION) {
        return {
          notifications: JSON.parse(cachedData) as Notification[],
          timestamp,
        }
      } else {
        localStorage.removeItem(CACHE_STORAGE_KEY)
        localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      }
    }
  } catch (error) {
    console.warn('Failed to load cache from localStorage:', error)
    localStorage.removeItem(CACHE_STORAGE_KEY)
    localStorage.removeItem(CACHE_TIMESTAMP_KEY)
  }
  return { notifications: null, timestamp: 0 }
}
const saveCacheToStorage = (notifications: Notification[], timestamp: number) => {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(notifications))
    localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString())
  } catch (error) {
    console.warn('Failed to save cache to localStorage:', error)
    try {
      localStorage.removeItem(CACHE_STORAGE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(notifications))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString())
    } catch (e) {
      console.error('Could not save cache even after clearing:', e)
    }
  }
}
const clearCacheFromStorage = () => {
  localStorage.removeItem(CACHE_STORAGE_KEY)
  localStorage.removeItem(CACHE_TIMESTAMP_KEY)
}

let cachedNotifications: Notification[] | null = null
let cacheTimestamp = 0
const initialCache = loadCacheFromStorage()
if (initialCache.notifications && initialCache.notifications.length > 0) {
  // Apply isSent check to cached notifications
  const correctedNotifications = initialCache.notifications.map(correctNotificationStatus)
  cachedNotifications = correctedNotifications
  cacheTimestamp = initialCache.timestamp
  notifications.value = correctedNotifications
  let tempFiltered = [...correctedNotifications].filter(
    (notification) => notification.status === activeTab.value,
  )
  if (selectedFilter.value !== 'ALL') {
    tempFiltered = tempFiltered.filter((notification) => notification.type === selectedFilter.value)
  }
  if (dateRange.value && dateRange.value.length === 2) {
    const [startDate, endDate] = dateRange.value
    tempFiltered = tempFiltered.filter((notification) => {
      const notificationDate = new Date(notification.createdAt || notification.date || '')
      if (isNaN(notificationDate.getTime())) {
        console.warn('Invalid date for notification during cache init:', notification.id)
        return false
      }
      const startOfDay = new Date(startDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)
      return notificationDate >= startOfDay && notificationDate <= endOfDay
    })
  }
  filteredNotifications.value = tempFiltered
}
let lastDueCheckTime = 0
const checkForDueScheduledNotifications = (): boolean => {
  if (activeTab.value !== 'scheduled') {
    return false
  }

  const now = Date.now()
  if (now - lastDueCheckTime < DUE_NOTIFICATION_CHECK_INTERVAL) {
    return false
  }
  lastDueCheckTime = now
  const scheduledNotifications = notifications.value.filter((n) => n.status === 'scheduled')
  if (scheduledNotifications.length === 0) {
    return false
  }

  const currentDate = new Date()
  const hasDueNotifications = scheduledNotifications.some((notification) => {
    if (!notification.scheduledTime) return false

    try {
      let scheduledDate: Date | null = null
      const [datePart, timePart] = notification.scheduledTime.split('|').map((s) => s.trim())
      if (datePart && timePart) {
        const dateMatch = datePart.match(/(\d+)\s+(\w+)\s+(\d+)/)
        if (dateMatch) {
          const [, day, monthName, year] = dateMatch
          const monthNames = [
            'january',
            'february',
            'march',
            'april',
            'may',
            'june',
            'july',
            'august',
            'september',
            'october',
            'november',
            'december',
          ]
          const monthIndex = monthNames.findIndex(
            (m) => m.toLowerCase() === monthName.toLowerCase(),
          )
          if (monthIndex !== -1) {
            const [hours, minutes] = timePart.split(':').map(Number)
            if (!isNaN(hours) && !isNaN(minutes)) {
              const dateStr = `${monthIndex + 1}/${parseInt(day)}/${parseInt(year)}`
              scheduledDate = DateUtils.parseScheduleDateTime(dateStr, timePart)
            }
          }
        }
      }

      if (!scheduledDate || isNaN(scheduledDate.getTime())) {
        return false
      }

      const threeMinutesAgo = new Date(currentDate.getTime() - 3 * 60 * 1000)
      return scheduledDate <= threeMinutesAgo
    } catch (error) {
      console.warn('Error checking scheduled notification:', notification.id, error)
      return false
    }
  })

  return hasDueNotifications
}

const fetchNotifications = async (forceRefresh = false) => {
  if (fetchNotificationTimeout) {
    clearTimeout(fetchNotificationTimeout)
    fetchNotificationTimeout = null
  }
  if (isFetching) {
    return
  }
  const now = Date.now()
  // Use shorter cache duration for published tab to show updates faster
  const cacheDuration =
    activeTab.value === 'scheduled'
      ? SCHEDULED_TAB_CACHE_DURATION
      : activeTab.value === 'published'
        ? PUBLISHED_TAB_CACHE_DURATION
        : DATA_CACHE_DURATION

  if (!forceRefresh && cachedNotifications && now - cacheTimestamp < cacheDuration) {
    if (checkForDueScheduledNotifications()) {
      forceRefresh = true
    } else {
      // Apply isSent check to cached notifications before using them
      const correctedNotifications = cachedNotifications.map(correctNotificationStatus)
      notifications.value = correctedNotifications
      applyFilters()
      return
    }
  }
  if (!forceRefresh && now - lastFetchTime < MIN_FETCH_INTERVAL) {
    if (cachedNotifications) {
      // Apply isSent check to cached notifications before using them
      const correctedNotifications = cachedNotifications.map(correctNotificationStatus)
      notifications.value = correctedNotifications
      applyFilters()
    }
    return
  }

  try {
    isFetching = true
    lastFetchTime = Date.now()
    loading.value = true
    console.log(
      `📡 [API] Fetching notifications (forceRefresh: ${forceRefresh}, tab: ${activeTab.value})`,
    )
    if (USE_MOCK_DATA) {
      dateRange.value = mockDateRange.value
      selectedLabel.value = 'All Time (Mock Data)'

      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mappedMockNotifications = mockNotifications.map((notification) => {
        // Determine status: if isSent is true, it's always published regardless of status field
        let status = mapBackendStatusToFrontend(notification.status)
        if (notification.isSent === true) {
          status = 'published'
        }
        
        return {
          ...notification,
          id: Number(notification.id),
          status: status,
          author: notification.author,
          description: notification.content || '',
          image: notification.image || '',
          date: notification.date,
          linkPreview: notification.linkPreview,
        }
      })
      notifications.value = mappedMockNotifications
      cachedNotifications = mappedMockNotifications
      cacheTimestamp = Date.now()
      saveCacheToStorage(mappedMockNotifications, cacheTimestamp)
    } else {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await notificationApi.getAllNotifications({
        page: 1,
        pageSize: 100,
        language: 'KM',
      })

      const mappedNotifications = response.data.map((notification) => {
        // Determine status: if isSent is true, it's always published regardless of status field
        let status = mapBackendStatusToFrontend(notification.status)
        if (notification.isSent === true) {
          status = 'published'
        }
        
        const corrected = correctNotificationStatus({
          ...notification,
          id: Number(notification.id),
          status: status,
          author: notification.author,
          description: notification.content || '',
          image: notification.image || '',
          date: notification.date,
        })
        
        // Debug logging for status correction
        if (notification.isSent === true && corrected.status !== 'published') {
          console.warn(`⚠️ [Status Correction] Notification ${corrected.id} has isSent=true but status=${corrected.status}`)
        }
        
        return corrected
      })
      notifications.value = mappedNotifications
      cachedNotifications = mappedNotifications
      cacheTimestamp = Date.now()
      saveCacheToStorage(mappedNotifications, cacheTimestamp)
      console.log(`✅ [API] Successfully fetched ${mappedNotifications.length} notifications`)
    }

    applyFilters()
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    ElNotification({
      title: 'Error',
      message: 'Failed to load notifications',
      type: 'error',
      duration: 2000,
    })
  } finally {
    loading.value = false
    isFetching = false
  }
}
const debouncedFetchNotifications = () => {
  if (fetchNotificationTimeout) {
    clearTimeout(fetchNotificationTimeout)
  }
  fetchNotificationTimeout = setTimeout(() => {
    fetchNotifications()
  }, 300)
}

const applyFilters = () => {
  let filtered = [...notifications.value]

  filtered = filtered.filter((notification) => notification.status === activeTab.value)

  if (selectedFilter.value !== 'ALL') {
    filtered = filtered.filter((notification) => notification.type === selectedFilter.value)
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (notification) =>
        notification.title.toLowerCase().includes(query) ||
        (notification.content && notification.content.toLowerCase().includes(query)) ||
        notification.description.toLowerCase().includes(query),
    )
  }

  if (dateRange.value && dateRange.value.length === 2) {
    const [startDate, endDate] = dateRange.value
    filtered = filtered.filter((notification) => {
      const notificationDate = new Date(notification.createdAt || notification.date || '')

      if (isNaN(notificationDate.getTime())) {
        return false
      }
      const startOfDay = new Date(startDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)

      return notificationDate >= startOfDay && notificationDate <= endOfDay
    })
  }

  filteredNotifications.value = filtered
}

watch(
  [activeTab, selectedFilter, searchQuery, dateRange],
  () => {
    applyFilters()
  },
  { deep: true },
)

const handleDeleteNotification = async (notificationId: number | string) => {
  try {
    if (USE_MOCK_DATA) {
      const index = notifications.value.findIndex((n) => n.id === notificationId)
      if (index > -1) {
        notifications.value.splice(index, 1)
        applyFilters()
        ElNotification({
          title: 'Success',
          message: 'Notification deleted successfully',
          type: 'success',
          duration: 2000,
        })
      }
    } else {
      await notificationApi.deleteNotification(Number(notificationId))
      ElNotification({
        title: 'Success',
        message: 'Notification deleted successfully',
        type: 'success',
        duration: 2000,
      })
      cachedNotifications = null
      cacheTimestamp = 0
      clearCacheFromStorage()
      await fetchNotifications(true)
    }
  } catch (error: any) {
    console.error('Failed to delete notification:', error)

    if (error.response?.data?.responseMessage) {
      ElNotification({
        title: 'Error',
        message: error.response.data.responseMessage,
        type: 'error',
        duration: 2000,
      })
    } else if (error.message) {
      ElNotification({
        title: 'Error',
        message: error.message,
        type: 'error',
        duration: 2000,
      })
    } else {
      ElNotification({
        title: 'Error',
        message: 'Failed to delete notification',
        type: 'error',
        duration: 2000,
      })
    }
  }
}

const publishingNotifications = new Set<number | string>()

const handlePublishNotification = async (notification: Notification) => {
  const notificationId = notification.templateId || notification.id
  const key = Number(notificationId)

  // Prevent duplicate sends
  if (publishingNotifications.has(key)) {
    ElNotification({
      title: 'Info',
      message: 'Notification is already being published. Please wait...',
      type: 'info',
      duration: 2000,
    })
    return
  }

  publishingNotifications.add(key)

  try {
    if (USE_MOCK_DATA) {
      const notificationIndex = notifications.value.findIndex((n) => n.id === notification.id)
      if (notificationIndex !== -1) {
        notifications.value[notificationIndex].status = 'published'
        notifications.value[notificationIndex].isSent = true
        activeTab.value = 'published'
        applyFilters()
        ElNotification({
          title: 'Success',
          message: 'Notification published successfully',
          type: 'success',
          duration: 2000,
        })
      }
    } else {
      // Publish the template by updating it with sendType=SEND_NOW and isSent=true
      // This will trigger the backend to send the notification and mark it as published
      // Clear sendSchedule if it exists since we're publishing immediately
      try {
        // First, fetch the full template data to get platforms and translations
        const fullTemplate = await api.get(`/api/v1/template/${notificationId}`)
        const template = fullTemplate.data?.data || fullTemplate.data

        // Check if notification is already sent
        const isAlreadySent = template?.isSent === true || notification.isSent === true

        if (isAlreadySent) {
          // Notification is already sent - just move it to published tab and show info message
          ElNotification({
            title: 'Info',
            message:
              'This notification has already been sent to users. It has been moved to the Published tab.',
            type: 'info',
            duration: 3000,
          })

          // Update local state and move to published tab
          const notificationIndex = notifications.value.findIndex((n) => n.id === notification.id)
          if (notificationIndex !== -1) {
            notifications.value[notificationIndex].status = 'published'
            notifications.value[notificationIndex].isSent = true
          }
          activeTab.value = 'published'
          cachedNotifications = null
          cacheTimestamp = 0
          clearCacheFromStorage()
          await fetchNotifications(true)
          applyFilters()
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
          publishingNotifications.delete(key)
          ElNotification({
            title: 'Error',
            message: 'This record cannot be sent. Please review the <strong>title</strong> and <strong>content</strong> and other fields, then try again.',
            type: 'error',
            duration: 4000,
            dangerouslyUseHTMLString: true,
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

        const result = await notificationApi.updateTemplate(Number(notificationId), updatePayload)

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
          // Keep in draft tab
          activeTab.value = 'draft'
          cachedNotifications = null
          cacheTimestamp = 0
          clearCacheFromStorage()
          await fetchNotifications(true)
          applyFilters()
          return
        }

        // Use unified message handler for draft/failure cases
        const platformName = getFormattedPlatformName({
          platformName: result?.data?.platformName,
          bakongPlatform: result?.data?.bakongPlatform,
          notification: notification as any,
        })

        const bakongPlatform = result?.data?.bakongPlatform || (notification as any)?.bakongPlatform
        
        // Get device platform from result data or template
        const platforms = result?.data?.platforms || template?.platforms || []
        let devicePlatform = 'ALL'
        if (Array.isArray(platforms) && platforms.length > 0) {
          // If platforms array contains only one platform, use it; otherwise use 'ALL'
          if (platforms.length === 1) {
            devicePlatform = String(platforms[0])
          } else {
            devicePlatform = 'ALL'
          }
        }

        const devicePlatformFormatted = formatPlatform(devicePlatform )
        
        const messageConfig = getNotificationMessage(result?.data, platformName, bakongPlatform, devicePlatformFormatted)
        const successfulCount = result?.data?.successfulCount ?? 0
        const failedCount = result?.data?.failedCount ?? 0
        const isPartialSuccess = successfulCount > 0 && failedCount > 0

        // Show notification for non-success cases (errors, warnings, info) or partial success
        if (messageConfig.type !== 'success' || isPartialSuccess) {
          ElNotification({
            title: messageConfig.title,
            message: messageConfig.message,
            type: messageConfig.type,
            duration: messageConfig.duration,
            dangerouslyUseHTMLString: messageConfig.dangerouslyUseHTMLString,
          })

          // Stay in draft tab for failures
          if (
            messageConfig.type === 'error' ||
            messageConfig.type === 'warning' ||
            messageConfig.type === 'info'
          ) {
            activeTab.value = 'draft'
            cachedNotifications = null
            cacheTimestamp = 0
            clearCacheFromStorage()
            await fetchNotifications(true)
            applyFilters()
            return
          }

          // For partial success, still show the notification but don't redirect to draft
          if (isPartialSuccess) {
            // Update notification status if some were successful
            const notificationIndex = notifications.value.findIndex((n) => n.id === notification.id)
            if (notificationIndex !== -1 && successfulCount > 0) {
              notifications.value[notificationIndex].status = 'published'
              notifications.value[notificationIndex].isSent = true
            }
            activeTab.value = 'published'
            return
          }
        }

        // Handle full success cases (only reached if messageConfig.type === 'success' and not partial)
        if (result?.data?.successfulCount !== undefined && result?.data?.successfulCount > 0) {
          // Successfully published and sent to users
          const successfulCount = result?.data?.successfulCount ?? 0

          // Check if this is a flash notification - check result data first, then template, then notification
          const notificationType =
            result?.data?.notificationType || template?.notificationType || notification.type
          const isFlashNotification = notificationType === NotificationType.FLASH_NOTIFICATION

          let message = ''
          if (isFlashNotification) {
            // Flash notification message
            message = 'Flash notification published successfully, and when user open bakongPlatform it will saw it!'
            const platformNameForFlash = getFormattedPlatformName({
              platformName: result?.data?.platformName,
              bakongPlatform: result?.data?.bakongPlatform || template?.bakongPlatform,
              notification: notification as any,
            })
            message = message.replace('bakongPlatform', `<strong>${platformNameForFlash}</strong>`)
          } else {
            // Use standardized message format with bakongPlatform and devicePlatform bolded
            const successMessageConfig = getNotificationMessage(
              result?.data,
              platformName,
              bakongPlatform,
              devicePlatformFormatted
            )
            message = successMessageConfig.message
          }

          ElNotification({
            title: 'Success',
            message: message,
            type: 'success',
            duration: 2000,
            dangerouslyUseHTMLString: true,
          })
          const notificationIndex = notifications.value.findIndex((n) => n.id === notification.id)
          if (notificationIndex !== -1) {
            notifications.value[notificationIndex].status = 'published'
            notifications.value[notificationIndex].isSent = true
          }
          activeTab.value = 'published'
        } else {
          // Check if this is a flash notification - even if no successfulCount, show flash message
          const notificationType =
            result?.data?.notificationType || template?.notificationType || notification.type
          const isFlashNotification = notificationType === NotificationType.FLASH_NOTIFICATION

          if (isFlashNotification) {
            // For flash notifications, show success message even if no user count
            let message =
              'Flash notification published successfully, and when user open bakongPlatform it will saw it!'
            const platformName = getFormattedPlatformName({
              platformName: result?.data?.platformName,
              bakongPlatform: result?.data?.bakongPlatform || template?.bakongPlatform,
              notification: notification as any,
            })
            message = message.replace('bakongPlatform', `<strong>${platformName}</strong>`)

            ElNotification({
              title: 'Success',
              message: message,
              type: 'success',
              duration: 2000,
              dangerouslyUseHTMLString: true,
            })

            const notificationIndex = notifications.value.findIndex((n) => n.id === notification.id)
            if (notificationIndex !== -1) {
              notifications.value[notificationIndex].status = 'published'
              notifications.value[notificationIndex].isSent = true
            }
            activeTab.value = 'published'
          } else {
            // Check if notification was already sent (successfulCount might be 0 but isSent is true)
            // This can happen for flash notifications or if it was already sent via scheduler
            const isAlreadySent = result?.data?.isSent === true || template?.isSent === true

            if (isAlreadySent) {
              // Notification was already sent - move to published tab
              ElNotification({
                title: 'Info',
                message:
                  'This notification has already been sent. It has been moved to the Published tab.',
                type: 'info',
                duration: 3000,
              })

              const notificationIndex = notifications.value.findIndex(
                (n) => n.id === notification.id,
              )
              if (notificationIndex !== -1) {
                notifications.value[notificationIndex].status = 'published'
                notifications.value[notificationIndex].isSent = true
              }
              activeTab.value = 'published'
            } else {
              // No users received the notification - use unified message handler
              const platformName = getFormattedPlatformName({
                platformName: result?.data?.platformName,
                bakongPlatform: result?.data?.bakongPlatform,
                notification: notification as any,
              })

              const bakongPlatform =
                result?.data?.bakongPlatform || (notification as any)?.bakongPlatform
              const messageConfig = getNotificationMessage(
                result?.data,
                platformName,
                bakongPlatform,
              )

              ElNotification({
                title: messageConfig.title,
                message: messageConfig.message,
                type: messageConfig.type,
                duration: messageConfig.duration,
                dangerouslyUseHTMLString: messageConfig.dangerouslyUseHTMLString,
              })
              activeTab.value = 'draft'
            }
          }
        }
        cachedNotifications = null
        cacheTimestamp = 0
        clearCacheFromStorage()
        await fetchNotifications(true)
        applyFilters()
      } catch (updateError: any) {
        // If updateTemplate fails, throw to be caught by outer catch block
        throw updateError
      }
    }
  } catch (error: any) {
    console.error('Failed to publish notification:', error)
    const errorMessage =
      error?.response?.data?.responseMessage ||
      error?.response?.data?.message ||
      error?.message ||
      'Failed to publish notification'

    // Use unified message handler for error cases
    const errorData = error?.response?.data?.data || {}
    const failedDueToInvalidTokens = errorData.failedDueToInvalidTokens === true
    const failedCount = errorData.failedCount || 0

    if (failedDueToInvalidTokens && failedCount > 0) {
      // Failures due to invalid tokens - use unified message handler
      const bakongPlatform = errorData.bakongPlatform || (notification as any)?.bakongPlatform
      const platformName = bakongPlatform ? formatBakongApp(bakongPlatform) : undefined
      const messageConfig = getNotificationMessage(
        { failedDueToInvalidTokens: true, failedCount },
        platformName,
        bakongPlatform,
      )
      ElNotification({
        title: messageConfig.title,
        message: messageConfig.message,
        type: messageConfig.type,
        duration: messageConfig.duration,
        dangerouslyUseHTMLString: messageConfig.dangerouslyUseHTMLString,
      })
      activeTab.value = 'draft'
      cachedNotifications = null
      cacheTimestamp = 0
      clearCacheFromStorage()
      await fetchNotifications(true)
      applyFilters()
    } else if (
      errorMessage.includes('NO_USERS_FOR_BAKONG_PLATFORM') ||
      errorMessage.includes('No users found for')
    ) {
      // Get platform name from error response data or notification
      const bakongPlatform = errorData.bakongPlatform || (notification as any)?.bakongPlatform
      const platformName = getFormattedPlatformName({
        platformName: errorData.platformName,
        bakongPlatform: bakongPlatform,
        notification: notification as any,
      })

      ElNotification({
        title: 'Info',
        message: getNoUsersAvailableMessage(platformName),
        type: 'info',
        duration: 3000,
        dangerouslyUseHTMLString: true,
      })
      activeTab.value = 'draft'
      cachedNotifications = null
      cacheTimestamp = 0
      clearCacheFromStorage()
      await fetchNotifications(true)
      applyFilters()
    } else {
      ElNotification({
        title: 'Error',
        message: errorMessage,
        type: 'error',
        duration: 2000,
      })
    }
  } finally {
    publishingNotifications.delete(key)
  }
}
let pollingInterval: ReturnType<typeof setInterval> | null = null
let pollingSetup = false // Flag to prevent duplicate polling setup
let isMounted = false // Flag to prevent duplicate mount operations

onMounted(async () => {
  // Prevent duplicate mount operations
  if (isMounted) {
    console.log('⏭️ [Mount] Component already mounted, skipping duplicate mount')
    return
  }
  isMounted = true
  
  let tabChanged = false
  if (route.query?.tab && ['published', 'scheduled', 'draft'].includes(route.query.tab as string)) {
    const queryTab = route.query.tab as 'published' | 'scheduled' | 'draft'
    if (activeTab.value !== queryTab) {
      activeTab.value = queryTab
      tabChanged = true
    }
  }
  if (notifications.value.length > 0 && (tabChanged || filteredNotifications.value.length === 0)) {
    console.log(
      '📦 Re-applying filters to cached data on mount (tab changed or filters not applied)',
    )
    applyFilters()
  }

  await new Promise((resolve) => setTimeout(resolve, 200))
  
  // Check if cache was recently cleared - force refresh
  const cacheWasCleared = !localStorage.getItem('notifications_cache_timestamp')
  const shouldForceRefresh = cacheWasCleared || tabChanged
  
  // Use appropriate cache duration based on active tab
  const cacheDuration =
    activeTab.value === 'scheduled'
      ? SCHEDULED_TAB_CACHE_DURATION
      : activeTab.value === 'published'
        ? PUBLISHED_TAB_CACHE_DURATION
        : DATA_CACHE_DURATION
  
  // Only fetch once on mount - avoid duplicate fetches
  if (cachedNotifications && cacheTimestamp && !shouldForceRefresh) {
    const now = Date.now()
    if (now - cacheTimestamp < cacheDuration) {
      if (notifications.value.length === 0) {
        // Apply status correction to cached notifications
        const correctedNotifications = cachedNotifications.map(correctNotificationStatus)
        notifications.value = correctedNotifications
        applyFilters()
      }
      // Still fetch in background for published tab to get updates quickly
      if (activeTab.value === 'published') {
        fetchNotifications(true).catch((err) => {
          console.warn('Background refresh failed, using cache:', err)
        })
      } else {
        // For other tabs, skip background fetch if cache is fresh to avoid duplicate calls
        console.log('⏭️ [Mount] Skipping background fetch - cache is fresh and tab is not published')
      }
    } else {
      // Cache expired - fetch once
      await fetchNotifications(true)
    }
  } else {
    // Force refresh if cache was cleared or tab changed - fetch once
    await fetchNotifications(true)
  }
  const setupPolling = () => {
    // Prevent duplicate polling setup
    if (pollingSetup && pollingInterval) {
      console.log('⏭️ [Polling] Polling already set up, skipping duplicate setup')
      return
    }
    
    // Clear any existing polling interval to prevent duplicates
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
    const pollingIntervalDuration = 900000 // 15 minutes

    pollingInterval = setInterval(() => {
      const now = Date.now()
      const cacheAge = now - cacheTimestamp
      const cacheDuration =
        activeTab.value === 'scheduled'
          ? SCHEDULED_TAB_CACHE_DURATION
          : activeTab.value === 'published'
            ? PUBLISHED_TAB_CACHE_DURATION
            : DATA_CACHE_DURATION

      console.log(
        `🔄 [Polling Check] Active tab: ${activeTab.value}, Cache age: ${Math.round(cacheAge / 1000)}s, Cache duration: ${Math.round(cacheDuration / 1000)}s`,
      )

      if (activeTab.value === 'scheduled' && checkForDueScheduledNotifications()) {
        console.log('✅ [Polling] Triggering refresh - scheduled notification due')
        fetchNotifications(true)
        return
      }
      if (
        (activeTab.value === 'scheduled' || activeTab.value === 'published') &&
        cacheAge >= cacheDuration
      ) {
        console.log(
          `✅ [Polling] Triggering refresh - cache expired (${Math.round(cacheAge / 1000)}s >= ${Math.round(cacheDuration / 1000)}s)`,
        )
        fetchNotifications(true)
      } else {
        console.log('⏭️ [Polling] Skipping refresh - cache still valid')
      }
    }, pollingIntervalDuration)

    pollingSetup = true
    console.log(
      `🔄 [Polling] Started with interval: ${pollingIntervalDuration / 1000}s (${pollingIntervalDuration / 60000} minutes)`,
    )
  }
  // Setup polling once on mount - no need to restart on tab change since polling checks activeTab.value dynamically
  setupPolling()
})

onUnmounted(() => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
  pollingSetup = false
  isMounted = false
})
</script>

<style scoped>
.home-page {
  width: 100%;
  height: 100%;
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow-x: hidden;
}

.search-filter-bar {
  display: grid;
  grid-template-columns: 202px 18px 313px 18px 1fr;
  grid-template-areas: 'filter . search . date';
  align-items: center;
  width: 100%;
  padding: 17px 0;
  position: relative;
}

.filter-dropdown {
  grid-area: filter;
}

.search-input {
  grid-area: search;
}

.date-range {
  grid-area: date;
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
}

.date-picker {
  width: 100%;
  height: 40px;
}

.custom-date-range {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 40px;
  padding: 0 20px;
  background: #fff;
  border: 1px solid rgba(0, 19, 70, 0.15);
  border-radius: 28px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  box-sizing: border-box;
}

.custom-date-range:hover {
  border-color: rgba(0, 19, 70, 0.4);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.date-text {
  color: #7a8190;
  font-size: 15px;
  letter-spacing: 0.2px;
}

.calendar-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(0, 19, 70, 0.1);
  background: rgba(0, 19, 70, 0.03);
  color: #001346;
}

.date-range .date-picker :deep(.el-date-editor.el-date-editor--daterange) {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  height: 40px !important;
  --el-input-height: 40px !important;
  --el-date-editor-width: 100% !important;
  flex: 1 !important;
}

.date-range .date-picker :deep(.el-range-editor.el-input__wrapper) {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  height: 40px !important;
  border-radius: 28px !important;
  border: 1px solid rgba(0, 19, 70, 0.15) !important;
  background: #fff !important;
  padding: 0 20px !important;
  box-shadow: none !important;
  transition:
    border-color 0.2s,
    box-shadow 0.2s !important;
  --el-input-border-color: rgba(0, 19, 70, 0.15) !important;
  --el-border-color: rgba(0, 19, 70, 0.15) !important;
  flex: 1 !important;
  display: flex !important;
  align-items: center !important;
}

.date-range .date-picker :deep(.el-range-editor.el-input__wrapper:hover) {
  border-color: rgba(0, 19, 70, 0.4) !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05) !important;
  --el-input-border-color: rgba(0, 19, 70, 0.4) !important;
  --el-border-color: rgba(0, 19, 70, 0.4) !important;
}

.date-range .date-picker :deep(.el-range-editor.el-input__wrapper.is-focus) {
  border-color: rgba(0, 19, 70, 0.4) !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05) !important;
  --el-input-border-color: rgba(0, 19, 70, 0.4) !important;
  --el-border-color: rgba(0, 19, 70, 0.4) !important;
}

.date-range .date-picker :deep(.el-input__inner) {
  height: 38px !important;
  line-height: 38px !important;
  font-size: 15px !important;
  color: #7a8190 !important;
  padding: 0 !important;
  letter-spacing: 0.2px !important;
}

.date-range .date-picker :deep(.el-range-separator) {
  margin: 0 8px !important;
  color: #7a8190 !important;
}

.date-range .date-picker :deep(.el-range-input) {
  border: none !important;
  background: transparent !important;
  color: #7a8190 !important;
  font-size: 15px !important;
  letter-spacing: 0.2px !important;
}

.date-range .date-picker :deep(.el-input__suffix) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 36px !important;
  height: 36px !important;
  border-radius: 50% !important;
  border: 1px solid rgba(0, 19, 70, 0.1) !important;
  background: rgba(0, 19, 70, 0.03) !important;
  color: #001346 !important;
}

.date-range .date-picker :deep(.el-input__suffix .el-icon) {
  color: #001346 !important;
  font-size: 16px !important;
}

.date-range {
  --el-input-height: 40px !important;
  --el-date-editor-width: 100% !important;
  --el-input-border-color: rgba(0, 19, 70, 0.15) !important;
  --el-border-color: rgba(0, 19, 70, 0.15) !important;
  --el-input-border-radius: 28px !important;
  --el-input-bg-color: #fff !important;
  --el-input-text-color: #7a8190 !important;
  --el-input-placeholder-color: #7a8190 !important;
  --el-component-size: 40px !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  flex: 1 !important;
  display: flex !important;
}

.date-range * {
  box-sizing: border-box !important;
}

.date-range .date-picker {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  flex: 1 !important;
  display: block !important;
}

.date-range :deep(.el-date-editor) {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  display: block !important;
}

.date-range :deep(.el-input) {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  display: block !important;
}

.date-range :deep(.el-input__wrapper) {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  display: flex !important;
}

.range-popper .el-picker-panel__sidebar {
  width: 160px;
}

.notifications-grid {
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 124px;
  left: 32px;
  right: 32px;
  bottom: 32px;
  overflow-y: auto;
  scrollbar-width: none;
}

.notifications-grid .notification-cards-container {
  width: 100%;
  margin-top: 20px;
}

.notifications-grid::-webkit-scrollbar {
  display: none;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  width: 100%;
}

.loading-spinner {
  color: #001346;
  font-size: 16px;
  font-weight: 500;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  margin-right: 40px;
  width: 100%;
}

.empty-state-container {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  top: 123px;
  gap: 24px;
  display: flex;
  position: relative;
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
</style>
