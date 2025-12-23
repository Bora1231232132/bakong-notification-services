<template>
  <div class="create-notification-container">
    <div class="main-content">
      <Tabs v-model="activeLanguage" :tabs="languageTabs" @tab-changed="handleLanguageChanged" />
      <div class="form-content">
        <div class="form-group">
          <ImageUpload
            :key="`image-upload-${activeLanguage}-${existingImageIds[activeLanguage] || 'new'}`"
            v-model="currentImageFile"
            accept-types="image/png,image/jpeg"
            :max-size="3 * 1024 * 1024"
            format-text="Supported format: PNG, JPG (2:1 W:H or 880:440)"
            size-text="Maximum size: 3MB"
            :existing-image-url="currentImageUrl || undefined"
            @file-selected="handleLanguageImageSelected"
            @file-removed="handleLanguageImageRemoved"
            @error="handleUploadError"
          />
        </div>
        <div class="form-fields">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Type <span class="required">*</span></label>
              <el-dropdown
                @command="(command: number) => (formData.categoryTypeId = command)"
                trigger="click"
                class="custom-dropdown"
                :disabled="loadingCategoryTypes"
              >
                <span class="dropdown-trigger">
                  {{
                    formatCategoryType(
                      categoryTypes.find((ct: CategoryTypeData ) => ct.id === formData.categoryTypeId)?.name ||
                        'Select Category',
                    )
                  }}
                  <el-icon class="dropdown-icon">
                    <ArrowDown />
                  </el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="category in categoryTypes"
                      :key="category.id"
                      :command="category.id"
                    >
                      {{ formatCategoryType(category.name) }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="form-group">
              <label class="form-label">Push to OS Platforms <span class="required">*</span></label>
              <el-dropdown
                @command="(command: Platform) => (formData.pushToPlatforms = command)"
                trigger="click"
                class="custom-dropdown"
              >
                <span class="dropdown-trigger">
                  {{ formatPlatform(formData.pushToPlatforms) }}
                  <el-icon class="dropdown-icon">
                    <ArrowDown />
                  </el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="platform in Object.values(Platform)"
                      :key="platform"
                      :command="platform"
                    >
                      {{ formatPlatform(platform) }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Title <span class="required">*</span></label>
            <input
              v-model="currentTitle"
              type="text"
              class="form-input-title"
              :class="{ 'lang-khmer': titleHasKhmer }"
              :data-content-lang="titleHasKhmer ? 'km' : ''"
              placeholder="Attractive title"
              @blur="validateTitle()"
            />
            <span
              v-if="titleError"
              style="color: #ef4444; font-size: 12px; margin-top: 2px; display: block"
              >{{ titleError }}</span
            >
          </div>
          <div class="form-group">
            <label class="form-label"
              >Description (Support HTML) <span class="required">*</span></label
            >
            <textarea
              v-model="currentDescription"
              class="form-textarea"
              :class="{ 'lang-khmer': descriptionHasKhmer }"
              :data-content-lang="descriptionHasKhmer ? 'km' : ''"
              placeholder="Description of the title <bold>input</bold>"
              rows="4"
              @blur="validateDescription()"
            ></textarea>
            <span
              v-if="descriptionError"
              style="color: #ef4444; font-size: 12px; margin-top: 2px; display: block"
              >{{ descriptionError }}</span
            >
          </div>
          <div class="form-group">
            <label class="form-label">Bakong Platform <span class="required">*</span></label>
            <el-dropdown
              @command="(command: BakongApp) => (formData.platform = command)"
              trigger="click"
              class="custom-dropdown full-width-dropdown"
            >
              <span class="dropdown-trigger full-width-trigger">
                {{ formatBakongApp(formData.platform) }}
                <el-icon class="dropdown-icon">
                  <ArrowDown />
                </el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="app in Object.values(BakongApp)"
                    :key="app"
                    :command="app"
                  >
                    {{ formatBakongApp(app) }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="form-group">
            <label class="form-label">Link to see more (optional)</label>
            <input
              v-model="currentLinkToSeeMore"
              type="url"
              class="form-input-link"
              placeholder="https://google.com"
              inputmode="url"
              pattern="https?://.+"
              @blur="validateLink()"
            />
            <span
              v-if="linkError"
              style="color: #ef4444; font-size: 12px; margin-top: 2px; display: block"
              >{{ linkError }}</span
            >
          </div>
          <div class="schedule-options-container">
            <div class="schedule-options">
              <div class="schedule-options-header">
                <div class="schedule-option-left">
                  <span class="option-title">Posting Schedule</span>
                  <span class="option-description">
                    <template v-if="formData.scheduleEnabled">
                      Notifications will be sent according to schedule.
                    </template>
                    <template v-else> </template>
                  </span>
                </div>
                <div class="schedule-option-right">
                  <span class="option-label">Set time and date</span>
                  <label class="toggle-switch">
                    <input v-model="formData.scheduleEnabled" type="checkbox" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div v-if="formData.scheduleEnabled" class="schedule-datetime-row">
                <div class="schedule-form-group">
                  <label class="schedule-form-label">Date <span class="required">*</span></label>
                  <el-date-picker
                    v-model="formData.scheduleDate"
                    type="date"
                    :placeholder="datePlaceholder"
                    format="M/D/YYYY"
                    value-format="M/D/YYYY"
                    class="schedule-date-picker"
                    style="width: 277.5px !important; height: 56px !important; border-radius: 16px"
                    :prefix-icon="null"
                    :clear-icon="null"
                    :disabled-date="disabledDate"
                    @change="(val: string | null) => { formData.scheduleDate = val ?? ''; console.log('Date changed:', val) }"
                  />
                </div>
                <div class="schedule-form-group">
                  <label class="schedule-form-label">Time <span class="required">*</span></label>
                  <el-time-picker
                    v-model="formData.scheduleTime"
                    :placeholder="timePlaceholder"
                    format="HH:mm"
                    value-format="HH:mm"
                    class="schedule-time-picker"
                    style="width: 277.5px !important; height: 56px !important; border-radius: 16px"
                    :prefix-icon="null"
                    :clear-icon="null"
                    :disabled-hours="() => disabledHours(formData.scheduleDate)"
                    :disabled-minutes="
                      (hour: number) => disabledMinutes(hour, formData.scheduleDate)
                    "
                    @change="(val: string | null) => { formData.scheduleTime = val; console.log('Time changed:', val) }"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="schedule-options-container" style="display: none">
            <div class="splash-options">
              <div class="schedule-options-header">
                <div class="schedule-option-left">
                  <span class="option-title">Show flash on launch</span>
                  <span class="option-description">
                    <template v-if="formData.splashEnabled">
                      Users will see the flash message on next launch.
                    </template>
                    <template v-else> </template>
                  </span>
                </div>
                <div class="schedule-option-right">
                  <span class="option-label">Set number of showing</span>
                  <label class="toggle-switch">
                    <input v-model="formData.splashEnabled" type="checkbox" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div v-if="formData.splashEnabled" class="schedule-datetime-row">
                <div class="schedule-form-group flash-input-group">
                  <label class="schedule-form-label"
                    >Number showing per day: <span class="required">*</span></label
                  >
                  <div class="flash-input-wrapper">
                    <ElInputNumber
                      v-model="formData.showPerDay"
                      :min="1"
                      :max="10"
                      :disabled="true"
                      controls-position="right"
                      class="flash-number-input"
                    />
                    <el-icon class="flash-dropdown-icon">
                      <ArrowDown />
                    </el-icon>
                  </div>
                </div>
                <div class="schedule-form-group flash-input-group">
                  <label class="schedule-form-label"
                    >Maximum day showing: <span class="required">*</span></label
                  >
                  <div class="flash-input-wrapper">
                    <ElInputNumber
                      v-model="formData.maxDayShowing"
                      :min="1"
                      :max="30"
                      :disabled="true"
                      controls-position="right"
                      class="flash-number-input"
                    />
                    <el-icon class="flash-dropdown-icon">
                      <ArrowDown />
                    </el-icon>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="action-buttons">
            <Button
              :text="publishButtonText"
              variant="primary"
              size="medium"
              width="123px"
              height="56px"
              @click="handlePublishNow"
            />
            <Button
              v-if="!isEditingPublished"
              text="Save draft"
              variant="secondary"
              size="medium"
              width="116px"
              height="56px"
              @click="handleFinishLater"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="sticky top-24">
      <MobilePreview
        :title="currentTitle"
        :description="currentDescription"
        :image="currentImageUrl || ''"
        :categoryType="categoryTypes.find((ct: CategoryTypeData) => ct.id === formData.categoryTypeId)?.name || ''"
        :title-has-khmer="titleHasKhmer"
        :description-has-khmer="descriptionHasKhmer"
      />
    </div>
  </div>
  <ConfirmationDialog
    v-model="showConfirmationDialog"
    title="Save as Draft?"
    message="Do you want to save this notification as a draft or discard your changes?"
    confirm-text="Save Draft"
    cancel-text="Discard"
    type="warning"
    confirm-button-type="primary"
    @confirm="handleConfirmationDialogConfirm"
    @cancel="handleConfirmationDialogCancel"
  />
  <ConfirmationDialog
    v-model="showLeaveDialog"
    title="Are you sure you want to leave?"
    :message="isEditMode ? 'If you leave now, any changes you made will be updated. If there are no changes, nothing will be updated.' : 'If you leave now, your progress will be saved as a draft. You can resume and complete it anytime.'"
    :confirm-text="isEditMode ? 'Update and leave' : 'Save as draft & leave'"
    cancel-text="Stay on page"
    type="warning"
    confirm-button-type="primary"
    @confirm="handleLeaveDialogConfirm"
    @cancel="handleLeaveDialogCancel"
  />
  <ConfirmationDialog
    v-model="showUpdateConfirmationDialog"
    title="You want to update?"
    message="Updating will immediately change the announcement for all users."
    confirm-text="Continue"
    cancel-text="Cancel"
    type="warning"
    confirm-button-type="primary"
    @confirm="handleUpdateConfirmationConfirm"
    @cancel="handleUpdateConfirmationCancel"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { ElNotification, ElInputNumber, ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { MobilePreview, ImageUpload, Tabs, Button } from '@/components/common'
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue'
import { notificationApi, type CreateTemplateRequest } from '@/services/notificationApi'
import { api } from '@/services/api'
import {
  NotificationType,
  Platform,
  Language,
  SendType,
  BakongApp,
  formatNotificationType,
  formatPlatform,
  formatCategoryType,
  getNoUsersAvailableMessage,
  getNotificationMessage,
  containsKhmer,
} from '@/utils/helpers'
import { useCategoryTypesStore } from '@/stores/categoryTypes'
import type { CategoryType as CategoryTypeData } from '@/services/categoryTypeApi'
import { DateUtils } from '@bakong/shared'
import {
  getCurrentDateTimeInCambodia,
  getCurrentTimePlaceholder,
  getCurrentDatePlaceholder,
  disabledDate,
  disabledHours,
  disabledMinutes,
  mapNotificationTypeToFormType,
  mapPlatformToFormPlatform,
  mapTypeToNotificationType,
  mapPlatformToEnum,
  mapLanguageToEnum,
  compressImage,
} from '../utils/helpers'

const router = useRouter()
const route = useRoute()

const isEditMode = computed(() => route.name === 'edit-notification')
const notificationId = computed(() => route.params.id as string)
const fromTab = computed(() => (route.query.fromTab as string) || '')
const isEditingPublished = ref(false)
const wasScheduled = ref(false)
const isLoadingData = ref(false)

// Dynamic button text based on context
const publishButtonText = computed(() => {
  if (isEditingPublished.value) {
    return 'Update now'
  }
  if (formData.scheduleEnabled) {
    return 'Schedule Now'
  }
  return 'Publish now'
})

const languages = [
  { code: Language.KM, name: 'Khmer' },
  { code: Language.EN, name: 'English' },
  { code: Language.JP, name: 'Japan' },
]

const languageTabs = languages.map((lang) => ({
  value: lang.code,
  label: lang.name,
}))

const activeLanguage = ref<Language>(Language.KM)

const handleLanguageChanged = (tab: { value: string; label: string }) => {
  activeLanguage.value = tab.value as Language
  titleError.value = ''
  descriptionError.value = ''
  linkError.value = ''
}

// Flash notification settings - defaults and disabled for first version

const datePlaceholder = ref(getCurrentDatePlaceholder())
const timePlaceholder = ref(getCurrentTimePlaceholder())

type LanguageFormData = {
  title: string
  description: string
  linkToSeeMore: string
  imageFile?: File | null
  imageUrl?: string | null
}

const languageFormData = reactive<Record<string, LanguageFormData>>({
  [Language.KM]: {
    title: '',
    description: '',
    linkToSeeMore: '',
    imageFile: null,
    imageUrl: null,
  },
  [Language.EN]: {
    title: '',
    description: '',
    linkToSeeMore: '',
    imageFile: null,
    imageUrl: null,
  },
  [Language.JP]: {
    title: '',
    description: '',
    linkToSeeMore: '',
    imageFile: null,
    imageUrl: null,
  },
})
const existingImageIds = reactive<Record<string, string | null>>({
  [Language.KM]: null,
  [Language.EN]: null,
  [Language.JP]: null,
})

const existingTranslationIds = reactive<Record<string, number | null>>({
  [Language.KM]: null,
  [Language.EN]: null,
  [Language.JP]: null,
})

// Store original values when loading notification data to detect changes
const originalLanguageFormData = reactive<Record<string, LanguageFormData>>({
  [Language.KM]: {
    title: '',
    description: '',
    linkToSeeMore: '',
    imageFile: null,
    imageUrl: null,
  },
  [Language.EN]: {
    title: '',
    description: '',
    linkToSeeMore: '',
    imageFile: null,
    imageUrl: null,
  },
  [Language.JP]: {
    title: '',
    description: '',
    linkToSeeMore: '',
    imageFile: null,
    imageUrl: null,
  },
})

const originalImageIds = reactive<Record<string, string | null>>({
  [Language.KM]: null,
  [Language.EN]: null,
  [Language.JP]: null,
})

const originalFormData = reactive({
  categoryTypeId: null as number | null,
  pushToPlatforms: Platform.ALL,
  platform: BakongApp.BAKONG,
})

const getTodayDateString = (): string => {
  const now = DateUtils.nowInCambodia()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const year = now.getFullYear()
  return `${month}/${day}/${year}`
}

// Use category types store
const categoryTypesStore = useCategoryTypesStore()
const categoryTypes = computed(() => categoryTypesStore.categoryTypes)
const loadingCategoryTypes = computed(() => categoryTypesStore.loading)

const formData = reactive({
  notificationType: NotificationType.ANNOUNCEMENT, // Default to ANNOUNCEMENT when flash is off
  categoryTypeId: null as number | null,
  pushToPlatforms: Platform.ALL,
  showPerDay: 1, // Default: 1 time per day (disabled for first version)
  maxDayShowing: 1, // Default: 1 days maximum (disabled for first version)
  platform: BakongApp.BAKONG,
  scheduleEnabled: false,
  scheduleDate: getTodayDateString(),
  scheduleTime: null as string | null,
  splashEnabled: false,
})

// Initialize category types from store
const initializeCategoryTypes = async () => {
  try {
    await categoryTypesStore.initialize()
    // Set default to first category or NEWS if available
    if (categoryTypes.value.length > 0) {
      const newsCategory = categoryTypes.value.find(
        (ct: CategoryTypeData) => ct.name === 'News' || ct.name === 'NEWS',
      )
      const defaultCategoryId = newsCategory?.id || categoryTypes.value[0].id
      formData.categoryTypeId = defaultCategoryId
      
      // If we're creating a new notification, synchronize the original value
      // so the default selection isn't counted as an "unsaved change"
      if (!isEditMode.value) {
        originalFormData.categoryTypeId = defaultCategoryId
      }
    }
  } catch (error) {
    console.error('Failed to initialize category types:', error)
  }
}

onMounted(() => {
  initializeCategoryTypes()
  // ... existing onMounted code
})

const currentTitle = computed({
  get: () => languageFormData[activeLanguage.value]?.title || '',
  set: (value: string) => {
    if (languageFormData[activeLanguage.value]) {
      languageFormData[activeLanguage.value].title = value
    }
    // Validate on every change to show length limit errors immediately
    validateTitle()
  },
})

const currentDescription = computed({
  get: () => languageFormData[activeLanguage.value]?.description || '',
  set: (value: string) => {
    if (languageFormData[activeLanguage.value]) {
      languageFormData[activeLanguage.value].description = value
    }
    // Validate on every change to show length limit errors immediately
    validateDescription()
  },
})

const currentLinkToSeeMore = computed({
  get: () => languageFormData[activeLanguage.value]?.linkToSeeMore || '',
  set: (value: string) => {
    if (languageFormData[activeLanguage.value]) {
      languageFormData[activeLanguage.value].linkToSeeMore = value
    }
  },
})

const currentImageFile = computed({
  get: () => languageFormData[activeLanguage.value]?.imageFile || null,
  set: (value: File | null) => {
    if (languageFormData[activeLanguage.value]) {
      languageFormData[activeLanguage.value].imageFile = value
    }
  },
})

const currentImageUrl = computed({
  get: () => languageFormData[activeLanguage.value]?.imageUrl || null,
  set: (value: string | null) => {
    if (languageFormData[activeLanguage.value]) {
      languageFormData[activeLanguage.value].imageUrl = value
    }
  },
})

// Detect Khmer content for dynamic font application
const titleHasKhmer = computed(() => containsKhmer(currentTitle.value))
const descriptionHasKhmer = computed(() => containsKhmer(currentDescription.value))

// Store template creation date to check if notification is old
const templateCreatedAt = ref<Date | null>(null)

const loadNotificationData = async () => {
  if (!isEditMode.value || !notificationId.value) return

  isLoadingData.value = true
  try {
    const res = await api.get(`/api/v1/template/${notificationId.value}`)
    const template = res.data?.data

    if (!template) {
      isLoadingData.value = false
      return
    }

    // Store creation date to check if notification is old
    if (template.createdAt) {
      templateCreatedAt.value = new Date(template.createdAt)
    } else {
      templateCreatedAt.value = null
    }

    // Check if editing a published notification (either from fromTab query or isSent status)
    isEditingPublished.value = fromTab.value === 'published' || template.isSent === true

    formData.notificationType =
      mapNotificationTypeToFormType(template.notificationType) || NotificationType.NOTIFICATION
    formData.categoryTypeId = template.categoryTypeId || null
    formData.platform = (template.bakongPlatform as BakongApp) || BakongApp.BAKONG
    
    // Store original global values for change detection
    originalFormData.categoryTypeId = template.categoryTypeId || null
    originalFormData.platform = (template.bakongPlatform as BakongApp) || BakongApp.BAKONG
    
    // Load pushToPlatforms from template.platforms array
    if (template.platforms && Array.isArray(template.platforms) && template.platforms.length > 0) {
      const formPlatform = mapPlatformToFormPlatform(template.platforms)
      formData.pushToPlatforms = formPlatform
      originalFormData.pushToPlatforms = formPlatform
    } else {
      // Default to ALL if platforms not provided
      formData.pushToPlatforms = Platform.ALL
      originalFormData.pushToPlatforms = Platform.ALL
    }

    if (template.sendSchedule) {
      formData.scheduleEnabled = true
      wasScheduled.value = true
      try {
        const { date, time } = DateUtils.formatUTCToCambodiaDateTime(template.sendSchedule)
        if (date && time) {
          formData.scheduleDate = date
          formData.scheduleTime = time
          console.log('✅ [Load Data] Set schedule:', { date, time })
        }
      } catch (error) {
        console.error('Error parsing schedule date/time:', error)
      }
    }

    formData.splashEnabled = template.notificationType === NotificationType.FLASH_NOTIFICATION
    if (Array.isArray(template.translations)) {
      for (const t of template.translations) {
        const lang = t.language as string as Language
        if (!languageFormData[lang]) continue
        const title = t.title || ''
        const description = t.content || ''
        const linkPreview = t.linkPreview || ''
        const fileId = t.image?.fileId || t.image?.fileID || t.imageId || t.image?.id
        
        // Set current values
        languageFormData[lang].title = title
        languageFormData[lang].description = description
        languageFormData[lang].linkToSeeMore = linkPreview
        languageFormData[lang].imageUrl = fileId ? `/api/v1/image/${fileId}` : null
        languageFormData[lang].imageFile = null
        existingImageIds[lang] = fileId || null
        
        // Store original values for change detection
        originalLanguageFormData[lang].title = title
        originalLanguageFormData[lang].description = description
        originalLanguageFormData[lang].linkToSeeMore = linkPreview
        originalLanguageFormData[lang].imageUrl = fileId ? `/api/v1/image/${fileId}` : null
        originalLanguageFormData[lang].imageFile = null
        originalImageIds[lang] = fileId || null
        
        // Store translation ID to preserve it during updates
        existingTranslationIds[lang] = t.id || null
      }
    }

    // Wait for Vue to process all reactive changes (like the scheduleEnabled watcher)
    // while isLoadingData is still true, to prevent overwriting with defaults
    await nextTick()
  } catch (error) {
    console.error('Error loading notification data:', error)
    ElNotification({
      title: 'Error',
      message: 'Failed to load notification data',
      type: 'error',
      duration: 2000,
    })
  } finally {
    isLoadingData.value = false
  }
}

onMounted(async () => {
  datePlaceholder.value = getCurrentDatePlaceholder()
  timePlaceholder.value = getCurrentTimePlaceholder()

  if (isEditMode.value) {
    await loadNotificationData()
  }
})

const showConfirmationDialog = ref(false)
const showLeaveDialog = ref(false)
const showUpdateConfirmationDialog = ref(false)
let pendingNavigation: (() => void) | null = null
let isSavingOrPublishing = ref(false) // Flag to prevent blocking during save/publish
const isDiscarding = ref(false) // Flag to allow navigation when discarding changes

// Watch splashEnabled toggle to update notificationType
watch(
  () => formData.splashEnabled,
  (isEnabled) => {
    if (isEnabled) {
      // When "Show as flash" is turned ON, set to FLASH_NOTIFICATION
      formData.notificationType = NotificationType.FLASH_NOTIFICATION
    } else {
      // When "Show as flash" is turned OFF, set to ANNOUNCEMENT
      formData.notificationType = NotificationType.ANNOUNCEMENT
    }
  },
)

// Watch scheduleEnabled to auto-set date and time when enabled
watch(
  () => formData.scheduleEnabled,
  (isEnabled) => {
    // Only auto-set date/time if we are NOT currently loading existing data
    if (isEnabled && !isLoadingData.value) {
      // When schedule is turned ON, set date to today and time to current time
      formData.scheduleDate = getTodayDateString()
      formData.scheduleTime = getCurrentTimePlaceholder()
      console.log('✅ [Schedule Toggle] Enabled - Set date:', formData.scheduleDate, 'time:', formData.scheduleTime)
    } else if (!isEnabled) {
      // When schedule is turned OFF, clear time but keep date for next time
      formData.scheduleTime = null
      console.log('✅ [Schedule Toggle] Disabled - Cleared time')
    }
  },
)

const titleError = ref('')
const descriptionError = ref('')
const linkError = ref('')

// Database limits (from template_translation entity)
// Title: VARCHAR(1024) - max 1024 characters (database constraint)
// Content: TEXT - PostgreSQL TEXT has no explicit character limit (can store up to ~1GB)
// For practical purposes, we'll use a reasonable limit for notifications
// Database schema limits (matching exactly):
// - title: VARCHAR(1024) - explicit limit of 1024 characters
// - content: TEXT - NO explicit limit (PostgreSQL TEXT can store up to ~1GB)
// Note: iOS FCM payload has 4KB limit, so content is truncated in payload (but full content stored in DB)
const DB_TITLE_MAX_LENGTH = 1024 // Database VARCHAR(1024) limit - matches DB exactly
// DB_CONTENT_MAX_LENGTH removed - database TEXT has no limit, so we don't restrict it in frontend
// PostgreSQL TEXT type can store unlimited data (up to ~1GB), so we allow unlimited in frontend validation

const validateTitle = () => {
  const val = currentTitle.value?.trim()
  if (!val) {
    titleError.value = 'Please enter a title'
  } else if (val.length > DB_TITLE_MAX_LENGTH) {
    titleError.value = `Title is too long (max ${DB_TITLE_MAX_LENGTH}), current length: ${val.length}.`
  } else {
    titleError.value = ''
  }
}

const validateDescription = () => {
  const val = currentDescription.value?.trim()
  if (!val) {
    descriptionError.value = 'Please enter a description'
  } else {
    // Database TEXT has no explicit limit (unlimited), so we don't restrict length
    // PostgreSQL TEXT can store up to ~1GB, so frontend validation follows DB schema exactly
    descriptionError.value = ''
  }
}


const isValidUrl = (val: string): boolean => {
  try {
    if (!val) return true
    const u = new URL(val)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const validateLink = () => {
  const val = currentLinkToSeeMore.value
  linkError.value = isValidUrl(val)
    ? ''
    : 'Please enter a valid URL starting with http:// or https://'
}

const handleUploadError = (message: string) => {
  ElNotification({
    title: 'Error',
    message: message,
    type: 'error',
    duration: 2000,
  })
}

const handleLanguageImageSelected = (file: File) => {
  const currentLang = activeLanguage.value
  languageFormData[currentLang].imageFile = file

  const reader = new FileReader()
  reader.onload = (e) => {
    languageFormData[currentLang].imageUrl = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const handleLanguageImageRemoved = () => {
  const currentLang = activeLanguage.value
  languageFormData[currentLang].imageFile = null
  languageFormData[currentLang].imageUrl = null
  existingImageIds[currentLang] = null
}

// Check if notification is old (created more than 1 day ago)
const isNotificationOld = (): boolean => {
  if (!templateCreatedAt.value) return false
  const now = new Date()
  const daysDiff = (now.getTime() - templateCreatedAt.value.getTime()) / (1000 * 60 * 60 * 24)
  return daysDiff > 1 // More than 1 day old
}

const handlePublishNow = async () => {
  // Check if current language tab has existing data
  const currentLangHasExistingData = isEditMode.value && existingTranslationIds[activeLanguage.value] !== null
  
  // Check if user has entered any data for current language
  const currentLangHasUserInput = !!(currentTitle.value?.trim() || currentDescription.value?.trim() || currentImageFile.value)
  
  // If editing and current language tab has no existing data and no user input, check for changes in other languages
  if (isEditMode.value && !currentLangHasExistingData && !currentLangHasUserInput) {
    // Check if there are any changes across all languages OR in global fields
    let hasAnyChanges = false
    
    // Check global fields first
    const globalFieldsChanged = 
      formData.platform !== originalFormData.platform ||
      formData.categoryTypeId !== originalFormData.categoryTypeId ||
      formData.pushToPlatforms !== originalFormData.pushToPlatforms
    
    if (globalFieldsChanged) {
      hasAnyChanges = true
    } else {
      // Check translations
      for (const langKey of Object.keys(languageFormData)) {
        const originalData = originalLanguageFormData[langKey]
        const currentData = languageFormData[langKey]
        
        if (!originalData) continue // Skip if no original data for this language
        
        // Compare current values with original values
        const titleChanged = (currentData?.title?.trim() || '') !== (originalData?.title?.trim() || '')
        const descriptionChanged = (currentData?.description?.trim() || '') !== (originalData?.description?.trim() || '')
        const linkChanged = (currentData?.linkToSeeMore?.trim() || '') !== (originalData?.linkToSeeMore?.trim() || '')
        const imageChanged = currentData?.imageFile !== null || 
                             (existingImageIds[langKey] !== originalImageIds[langKey])
        
        if (titleChanged || descriptionChanged || linkChanged || imageChanged) {
          hasAnyChanges = true
          break // Found at least one change, no need to check further
        }
      }
    }
    
    if (!hasAnyChanges) {
      // No changes at all - just navigate to home without updating or showing notification
      const redirectTab = fromTab.value || 'published'
      setTimeout(() => {
        window.location.href = `/?tab=${redirectTab}`
      }, 100)
      return
    }
    
    // There are changes in other languages - proceed with update
    const token = localStorage.getItem('auth_token')
    if (!token || token.trim() === '') {
      ElNotification({
        title: 'Error',
        message: 'Please login first',
        type: 'error',
        duration: 2000,
      })
      router.push('/login')
      return
    }
    
    // Clear any errors and proceed
    titleError.value = ''
    descriptionError.value = ''
    await handlePublishNowInternal()
    return
  }

  // Check if current language has changes (including deletions) OR global fields have changes
  // If editing and there are changes, allow update even if fields are empty (deletion is a change)
  let hasChangesForCurrentLang = false
  
  // Check global fields first (visible on all tabs)
  const globalFieldsChanged = 
    formData.platform !== originalFormData.platform ||
    formData.categoryTypeId !== originalFormData.categoryTypeId ||
    formData.pushToPlatforms !== originalFormData.pushToPlatforms
  
  if (globalFieldsChanged) {
    hasChangesForCurrentLang = true
  } else if (isEditMode.value && currentLangHasExistingData) {
    const currentLang = activeLanguage.value
    const originalData = originalLanguageFormData[currentLang]
    
    // Check if values changed (including deletion - from something to empty)
    const titleChanged = (currentTitle.value?.trim() || '') !== (originalData?.title?.trim() || '')
    const descriptionChanged = (currentDescription.value?.trim() || '') !== (originalData?.description?.trim() || '')
    const linkChanged = (currentLinkToSeeMore.value?.trim() || '') !== (originalData?.linkToSeeMore?.trim() || '')
    const imageChanged = currentImageFile.value !== null || 
                         (existingImageIds[currentLang] !== originalImageIds[currentLang])
    
    hasChangesForCurrentLang = titleChanged || descriptionChanged || linkChanged || imageChanged
  }
  
  // Only validate if there's no existing data or no changes (creating new content)
  // If there are changes (including deletions or global fields), skip validation and allow update
  if (!hasChangesForCurrentLang) {
    validateTitle()
    validateDescription()
    
    // Check if there are validation errors
    if (
      !currentTitle.value ||
      !currentDescription.value ||
      titleError.value ||
      descriptionError.value
    ) {
      // Re-validate to ensure errors are set
      if (!titleError.value) validateTitle()
      if (!descriptionError.value) validateDescription()
      
      // Don't show notification - errors are already visible inline below the form fields
      // Just prevent publishing
      return
    }
  } else {
    // Has changes (including deletions or global fields) - clear validation errors and proceed
    titleError.value = ''
    descriptionError.value = ''
  }

  const token = localStorage.getItem('auth_token')
  if (!token || token.trim() === '') {
    ElNotification({
      title: 'Error',
      message: 'Please login first',
      type: 'error',
      duration: 2000,
    })
    router.push('/login')
    return
  }

  // If editing a published notification, check for changes across all languages OR global fields
  if (isEditMode.value && isEditingPublished.value) {
    // Check if there are any changes across all languages OR in global fields
    let hasAnyChanges = false
    
    // Global fields check
    if (globalFieldsChanged) {
      hasAnyChanges = true
    } else {
      // Check translations
      for (const langKey of Object.keys(languageFormData)) {
        const originalData = originalLanguageFormData[langKey]
        const currentData = languageFormData[langKey]
        
        if (!originalData) continue // Skip if no original data for this language
        
        // Compare current values with original values
        const titleChanged = (currentData?.title?.trim() || '') !== (originalData?.title?.trim() || '')
        const descriptionChanged = (currentData?.description?.trim() || '') !== (originalData?.description?.trim() || '')
        const linkChanged = (currentData?.linkToSeeMore?.trim() || '') !== (originalData?.linkToSeeMore?.trim() || '')
        const imageChanged = currentData?.imageFile !== null || 
                             (existingImageIds[langKey] !== originalImageIds[langKey])
        
        if (titleChanged || descriptionChanged || linkChanged || imageChanged) {
          hasAnyChanges = true
          break // Found at least one change, no need to check further
        }
      }
    }
    
    // Only show confirmation if there are actual changes
    if (hasAnyChanges) {
      showUpdateConfirmationDialog.value = true
      return
    } else {
      // No changes at all - just navigate to home without updating or showing notification
      const redirectTab = fromTab.value || 'published'
      setTimeout(() => {
        window.location.href = `/?tab=${redirectTab}`
      }, 100)
      return
    }
  }

  // Note: Removed old notification warning popup - backend now handles old notifications better
  // by attempting to send to all format-valid tokens regardless of validation results

  // Otherwise, proceed with publish/update
  await handlePublishNowInternal()
}

const handlePublishNowInternal = async () => {
  isSavingOrPublishing.value = true

  const loadingNotification = ElNotification({
    title: isEditMode.value ? 'Updating notification...' : 'Creating notification...',
    message: isEditMode.value
      ? 'Please wait while we update your notification'
      : 'Please wait while we create your notification',
    type: 'warning',
    duration: 0,
  })

  // Wait for Vue to update reactive values (especially from Element Plus pickers)
  await nextTick()

  // Declare redirectTab outside try block so it's accessible in catch and after try-catch
  let redirectTab = 'published'

  try {
    let sendType = SendType.SEND_NOW
    let isSent = true

    // Common schedule validation logic for both create and edit modes
    const validateSchedule = async (): Promise<boolean> => {
      if (formData.scheduleEnabled) {
        // Debug: Log formData values before validation
        console.log('🔍 [Schedule Validation] Form data:', {
          scheduleEnabled: formData.scheduleEnabled,
          scheduleDate: formData.scheduleDate,
          scheduleTime: formData.scheduleTime,
        })
        
        const dateValue = formData.scheduleDate
        const timeValue = formData.scheduleTime
        
        const dateStr = dateValue != null && dateValue !== '' ? String(dateValue).trim() : ''
        const timeStr = timeValue != null && timeValue !== '' ? String(timeValue).trim() : ''
        
        const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/
        const timePattern = /^\d{2}:\d{2}$/
        
        const hasValidDate = dateStr !== '' && datePattern.test(dateStr)
        const hasValidTime = timeStr !== '' && timePattern.test(timeStr)
        
        if (!hasValidDate || !hasValidTime) {
          ElNotification({
            title: 'Error',
            message: 'Please select both Date and Time for scheduling',
            type: 'error',
            duration: 2000,
          })
          return false
        }
        
        try {
          const scheduleDateTime = DateUtils.parseScheduleDateTime(dateStr, timeStr)
          const nowUTC = new Date()
          const diffMs = scheduleDateTime.getTime() - nowUTC.getTime()
          
          if (diffMs <= 0) {
            ElNotification({
              title: 'Error',
              message: 'Scheduled time must be in the future. Please select a future time.',
              type: 'error',
              duration: 3000,
            })
            return false
          }
          return true
        } catch (error) {
          console.error('❌ [Schedule Validation] Error:', error)
          ElNotification({
            title: 'Error',
            message: 'Invalid date or time format. Please check your selection.',
            type: 'error',
            duration: 2000,
          })
          return false
        }
      }
      return true
    }

    // When editing, determine redirect tab based on notification status and fromTab
    if (isEditMode.value) {
      // If editing a published notification, always keep it published
      if (isEditingPublished.value) {
        sendType = SendType.SEND_NOW
        isSent = true
        redirectTab = 'published'
        // Clear schedule fields to prevent any scheduling
        formData.scheduleEnabled = false
        formData.scheduleDate = ''
        formData.scheduleTime = ''
      } else {
        // Editing draft or scheduled notification
        if (formData.scheduleEnabled) {
          // Perform schedule validation even in edit mode!
          const isValid = await validateSchedule()
          if (!isValid) {
            loadingNotification.close()
            isSavingOrPublishing.value = false
            return
          }
          
          sendType = SendType.SEND_SCHEDULE
          isSent = false
          redirectTab = 'scheduled'
        } else {
          // User disabled schedule or no schedule - redirect to published tab
          sendType = SendType.SEND_NOW
          isSent = true
          redirectTab = 'published'
        }
      }
    } else {
      // Creating new notification
      if (formData.scheduleEnabled) {
        const isValid = await validateSchedule()
        if (!isValid) {
          loadingNotification.close()
          isSavingOrPublishing.value = false
          return
        }
        
        sendType = SendType.SEND_SCHEDULE
        isSent = false
        redirectTab = 'scheduled'
      } else {
        redirectTab = 'published'
      }
    }
    const imagesToUpload: { file: File; language: string }[] = []
    const translations = []

    for (const [langKey, langData] of Object.entries(languageFormData)) {
      if (langData.title && langData.description) {
        if (langData.linkToSeeMore && !isValidUrl(langData.linkToSeeMore)) {
          ElNotification({
            title: 'Error',
            message: `Invalid URL for ${langKey}. Must start with http(s)://`,
            type: 'error',
            duration: 2000,
          })
          loadingNotification.close()
          isSavingOrPublishing.value = false
          return
        }
        let imageId: string | undefined = undefined
        if (langData.imageFile) {
          try {
            // Compress to 2MB per image (safer for batch uploads)
            // 3 images × 2MB = 6MB total, well under 18MB limit
            const { file: compressed, dataUrl } = await compressImage(langData.imageFile, {
              maxBytes: 2 * 1024 * 1024, // 2MB per image (safer for batch uploads)
              maxWidth: 2000,
              targetAspectRatio: 2 / 1, // 2:1 aspect ratio as shown in UI
              correctAspectRatio: true, // Automatically correct aspect ratio
            })
            imagesToUpload.push({ file: compressed, language: langKey })
            if (languageFormData[langKey]) {
              languageFormData[langKey].imageUrl = dataUrl
            }
          } catch (e) {
            console.error('Compression failed for', langKey, e)
            ElNotification({
              title: 'Error',
              message: `Failed to prepare image for ${langKey}`,
              type: 'error',
              duration: 2000,
            })
            loadingNotification.close()
            isSavingOrPublishing.value = false
            return
          }
        } else if (isEditMode.value && existingImageIds[langKey] && langData.imageUrl !== null) {
          imageId = existingImageIds[langKey] || undefined
        }

        const translationData: any = {
          language: mapLanguageToEnum(langKey),
          title: langData.title,
          content: langData.description,
          linkPreview: langData.linkToSeeMore || undefined,
          image: imageId || '',
        }
        // Include translation ID when updating to preserve the same record
        if (isEditMode.value && existingTranslationIds[langKey]) {
          translationData.id = existingTranslationIds[langKey]
        }
        translations.push(translationData)
      }
    }
    let uploadedImages: {
      language?: string
      fileId: string
      mimeType: string
      originalFileName: string
    }[] = []
    if (imagesToUpload.length > 0) {
      try {
        const items = imagesToUpload.map((item) => ({
          file: item.file,
          language: String(item.language),
        }))
        // Calculate total size before upload
        const totalSize = items.reduce((sum, item) => sum + item.file.size, 0)
        const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2)
        
        console.log(
          'Files to upload:',
          items.map((i) => ({
            name: i.file.name,
            size: i.file.size,
            sizeMB: (i.file.size / 1024 / 1024).toFixed(2) + 'MB',
            type: i.file.type,
            language: i.language,
          })),
        )
        console.log(`Total upload size: ${totalSizeMB}MB (limit: 18MB)`)

        uploadedImages = await notificationApi.uploadImages(items)
        console.log('Batch uploaded images:', uploadedImages)
      } catch (error: any) {
        console.error('Error uploading images:', error)
        const errorMessage =
          error?.response?.status === 413
            ? 'Upload size too large. Images have been compressed, but total size still exceeds limit. Please try uploading fewer images or use smaller images.'
            : error?.message ||
              error?.response?.data?.responseMessage ||
              'Failed to upload images. Please ensure total size is under 18MB and try again.'
        
        ElNotification({
          title: 'Upload Error',
          message: errorMessage,
          type: 'error',
          duration: 5000,
        })
        loadingNotification.close()
        isSavingOrPublishing.value = false
        return
      }
    }
    const langToFileId = new Map<string, string>()
    uploadedImages.forEach((u) => {
      if (u.language && u.fileId) {
        langToFileId.set(String(u.language), u.fileId)
        const langKey = String(u.language)
        existingImageIds[langKey] = u.fileId
        if (languageFormData[langKey]) {
          languageFormData[langKey].imageFile = null
          languageFormData[langKey].imageUrl = `/api/v1/image/${u.fileId}`
        }
      }
    })
    for (const [index, trans] of translations.entries()) {
      const fid = langToFileId.get(String(trans.language))
      if (fid) {
        translations[index].image = fid
      }
    }

    if (translations.length === 0) {
      let fallbackImageId: string | undefined
      if (currentImageFile.value) {
        try {
          fallbackImageId = await notificationApi.uploadImage(currentImageFile.value)
        } catch (error) {
          console.error('Error uploading fallback image:', error)
          ElNotification({
            title: 'Error',
            message: 'Failed to upload image. Please try again.',
            type: 'error',
            duration: 2000,
          })
          loadingNotification.close()
          isSavingOrPublishing.value = false
          return
        }
      }

      if (currentLinkToSeeMore.value && !isValidUrl(currentLinkToSeeMore.value)) {
        ElNotification({
          title: 'Error',
          message: 'Invalid URL. Must start with http(s)://',
          type: 'error',
          duration: 2000,
        })
        loadingNotification.close()
        isSavingOrPublishing.value = false
        return
      }
      const fallbackTranslationData: any = {
        language: mapLanguageToEnum(activeLanguage.value),
        title: currentTitle.value,
        content: currentDescription.value,
        linkPreview: currentLinkToSeeMore.value || undefined,
        image: fallbackImageId,
      }
      // Include translation ID when updating to preserve the same record
      if (isEditMode.value && existingTranslationIds[activeLanguage.value]) {
        fallbackTranslationData.id = existingTranslationIds[activeLanguage.value]
      }
      translations.push(fallbackTranslationData)
    }

    const templateData: CreateTemplateRequest = {
      platforms: [mapPlatformToEnum(formData.pushToPlatforms)],
      bakongPlatform: formData.platform,
      sendType: sendType,
      isSent: isSent,
      translations: translations,
      notificationType: mapTypeToNotificationType(formData.notificationType),
      categoryTypeId: formData.categoryTypeId ?? undefined,
      priority: 1,
    }

    // Only set schedule if not editing a published notification
    if (formData.scheduleEnabled && !(isEditMode.value && isEditingPublished.value)) {
      const scheduleDateTime = DateUtils.parseScheduleDateTime(
        String(formData.scheduleDate),
        String(formData.scheduleTime),
      )
      templateData.sendSchedule = scheduleDateTime.toISOString()
    } else if (isEditMode.value && isEditingPublished.value) {
      // Explicitly clear schedule when editing published notification
      templateData.sendSchedule = undefined
    }

    let result
    if (isEditMode.value) {
      result = await notificationApi.updateTemplate(parseInt(notificationId.value), templateData)
    } else {
      result = await notificationApi.createTemplate(templateData)
    }

    loadingNotification.close()

    // Special handling for updating published notifications
    if (isEditMode.value && isEditingPublished.value) {
      // When updating a published notification, show update success message
      ElNotification({
        title: 'Success',
        message: `Notification for <strong>${formatBakongApp(formData.platform)}</strong> has been updated successfully!`,
        type: 'success',
        duration: 3000,
        dangerouslyUseHTMLString: true,
      })
      // Stay in published tab (notification was published)
      redirectTab = 'published'
    } else if (isEditMode.value && redirectTab === 'scheduled') {
      // Editing a scheduled notification - check if it was actually sent
      const successfulCountFromResult = result?.data?.successfulCount
      const wasActuallySent = successfulCountFromResult !== undefined && successfulCountFromResult !== null && successfulCountFromResult > 0
      
      if (wasActuallySent) {
        // Scheduled notification was sent immediately - redirect to published
      redirectTab = 'published'
      } else {
        // Scheduled notification remains scheduled - stay in scheduled tab
        redirectTab = 'scheduled'
      }
    } else {
      // Use unified message handler for draft/failure cases
      const platformName = formatBakongApp(formData.platform)
      const bakongPlatform = formData.platform || result?.data?.bakongPlatform
      const successfulCount = result?.data?.successfulCount ?? 0
      const failedCount = result?.data?.failedCount ?? 0
      const successfulCountFromResult = result?.data?.successfulCount
      const failedCountFromResult = result?.data?.failedCount
      const wasActuallySent = successfulCountFromResult !== undefined && successfulCountFromResult !== null && successfulCountFromResult > 0
      const isPartialSuccess = successfulCount > 0 && failedCount > 0

      // Handle scheduled notifications FIRST (before checking messageConfig)
      if (redirectTab === 'scheduled') {
        if (wasActuallySent) {
          // Notification was scheduled but sent immediately (scheduled time was in past or very soon)
          const userText = successfulCountFromResult === 1 ? 'user' : 'users'
          const platformNameForScheduled = formatBakongApp(formData.platform)
          let message = `Notification for <strong>${platformNameForScheduled}</strong> sent to ${successfulCountFromResult} ${userText} on time`
          
          if (failedCountFromResult > 0) {
            message += `. Failed to send to ${failedCountFromResult} user(s)`
          }

          ElNotification({
            title: 'Success',
            message: message,
            type: 'success',
            duration: 3000,
            dangerouslyUseHTMLString: true,
          })
          // Redirect to published since it was actually sent
          redirectTab = 'published'
        } else {
          // Scheduled notification created successfully (not sent yet)
          const platformNameForScheduled = formatBakongApp(formData.platform)
          ElNotification({
            title: 'Success',
            message: isEditMode.value
              ? `Notification for <strong>${platformNameForScheduled}</strong> updated and scheduled successfully!`
              : `Notification for <strong>${platformNameForScheduled}</strong> created and scheduled successfully!`,
            type: 'success',
            duration: 2000,
            dangerouslyUseHTMLString: true,
          })
          // Keep in scheduled tab
        }
      } else {
        // Handle non-scheduled notifications (published, draft, etc.)
        // Get device platform for message (Android, iOS, or ALL)
        const devicePlatform = formatPlatform(String(formData.pushToPlatforms))
        
      const messageConfig = getNotificationMessage(result?.data, platformName, bakongPlatform, devicePlatform)
      
        // Check if all sends failed due to invalid tokens (old notification issue)
        const failedDueToInvalidTokens = result?.data?.failedDueToInvalidTokens === true
        const allFailed = successfulCount === 0 && failedCount > 0
        
        // Show notification for non-success cases (errors, warnings, info) or partial success
        if (messageConfig.type !== 'success' || isPartialSuccess) {
          if (isPartialSuccess) {
            // Handle partial success - use standardized message format from getNotificationMessage
            // This ensures consistent formatting with bakongPlatform and devicePlatform bolded
            const failedUsers = result?.data?.failedUsers || []
            
            // Show success notification using standardized format
            ElNotification({
              title: messageConfig.title,
              message: messageConfig.message,
              type: messageConfig.type,
              duration: messageConfig.duration,
              dangerouslyUseHTMLString: messageConfig.dangerouslyUseHTMLString,
            })
            
            // Show detailed failure information
            if (failedUsers.length > 0) {
              const failedUsersList = failedUsers.length <= 5 
                ? failedUsers.join(', ') 
                : `${failedUsers.slice(0, 5).join(', ')} and ${failedUsers.length - 5} more`
              
              const failureReason = result?.data?.failedDueToInvalidTokens 
                ? 'invalid or expired FCM tokens. These users need to update their tokens by opening the mobile app.'
                : 'unknown reasons'
              
              // Use standardized message format with bakongPlatform and devicePlatform bolded
              const detailedMessageConfig = getNotificationMessage(
                result?.data,
                undefined,
                bakongPlatform,
                devicePlatform
              )
              ElNotification({
                title: detailedMessageConfig.title,
                message: detailedMessageConfig.message,
                type: detailedMessageConfig.type,
                duration: detailedMessageConfig.duration,
                dangerouslyUseHTMLString: detailedMessageConfig.dangerouslyUseHTMLString,
              })
            }
            
            // For partial success, redirect to published tab
            redirectTab = 'published'
          } else {
            ElNotification({
              title: messageConfig.title,
              message: messageConfig.message,
              type: messageConfig.type,
              duration: messageConfig.duration,
              dangerouslyUseHTMLString: messageConfig.dangerouslyUseHTMLString,
            })
            
            // Redirect to draft tab for failures
            if (
              messageConfig.type === 'error' ||
              messageConfig.type === 'warning' ||
              messageConfig.type === 'info'
            ) {
              redirectTab = 'draft'
            }
          }
      } else {
          // Handle full success cases for published notifications
      const failedUsers = result?.data?.failedUsers || []
          const isFlashNotification =
            formData.notificationType === NotificationType.FLASH_NOTIFICATION

      let message = isFlashNotification
        ? isEditMode.value
          ? 'Flash notification updated and published successfully, and when user open bakongPlatform it will saw it!'
          : 'Flash notification created and published successfully, and when user open bakongPlatform it will saw it!'
        : isEditMode.value
          ? 'Notification updated and published successfully!'
          : 'Notification created and published successfully!'

      // Add user count if available (only for non-flash notifications)
      // Use standardized message format with bakongPlatform and devicePlatform bolded
      if (
        !isFlashNotification &&
            successfulCountFromResult !== undefined &&
            successfulCountFromResult !== null &&
            successfulCountFromResult > 0
      ) {
        // Use standardized message format from getNotificationMessage
        const messageConfig = getNotificationMessage(
          result?.data,
          undefined,
          bakongPlatform,
          devicePlatform
        )
        message = messageConfig.message
      }

      // For flash notifications, replace bakongPlatform with bold platform name
      if (isFlashNotification) {
            const platformNameForFlash = formatBakongApp(formData.platform)
            message = message.replace('bakongPlatform', `<strong>${platformNameForFlash}</strong>`)
      }

      // Show success notification (full success - no failures)
      ElNotification({
        title: 'Success',
        message: message,
        type: 'success',
        duration: 2000,
        dangerouslyUseHTMLString: true,
      })
      }
      }
    }
    try {
      localStorage.removeItem('notifications_cache')
      localStorage.removeItem('notifications_cache_timestamp')
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }

    // Close any open dialogs before navigation
    showLeaveDialog.value = false
    showConfirmationDialog.value = false
    pendingNavigation = null

    // Determine final redirect tab
    // For edit mode: respect fromTab if it matches the action result, otherwise use redirectTab
    // For create mode: always use redirectTab (published/scheduled based on action)
    let finalRedirectTab = redirectTab
    if (isEditMode.value) {
      // When editing, redirectTab is already set correctly based on the action:
      // - Published notification → 'published'
      // - Scheduled notification → 'scheduled' (or 'published' if sent)
      // - Draft notification → 'published' (when publishing)
      // So we use redirectTab directly, which already handles the logic correctly
      finalRedirectTab = redirectTab
    } else {
      // For create mode, use redirectTab directly
      finalRedirectTab = redirectTab
    }

    if (isEditMode.value) {
      setTimeout(() => {
        window.location.href = `/?tab=${finalRedirectTab}`
        // Reset flag after navigation starts (full page reload)
        isSavingOrPublishing.value = false
      }, 500)
    } else {
      // Keep flag true until navigation completes
      router
        .push(`/?tab=${finalRedirectTab}`)
        .then(() => {
          isSavingOrPublishing.value = false
        })
        .catch(() => {
          isSavingOrPublishing.value = false
        })
    }
  } catch (error: any) {
    isSavingOrPublishing.value = false
    console.error('Error creating notification:', error)
    console.error('Error details:', {
      message: error.message,
      response: error.response,
      responseData: error.response?.data,
      status: error.response?.status,
    })

    loadingNotification.close()

    // Extract error message with better fallbacks
    let errorMessage =
      error.response?.data?.responseMessage ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred while creating the notification'

    // If we still don't have a message, provide a status-based message
    if (!errorMessage || errorMessage === 'undefined' || errorMessage === 'null') {
      const status = error.response?.status
      if (status === 500) {
        errorMessage =
          'Internal server error. Please try again or contact support if the problem persists.'
      } else if (status === 400) {
        errorMessage = 'Invalid request. Please check your input and try again.'
      } else if (status === 401) {
        errorMessage = 'Authentication failed. Please log in again.'
      } else if (status === 403) {
        errorMessage = 'You do not have permission to perform this action.'
      } else if (status === 404) {
        errorMessage = 'The requested resource was not found.'
      } else {
        errorMessage = `Request failed with status ${status || 'unknown'}. Please try again.`
      }
    }

    ElNotification({
      title: 'Error',
      message: errorMessage,
      type: 'error',
      duration: 5000, // Increased from 2000ms to 5000ms for better visibility
      showClose: true, // Allow user to manually close
    })
  }
}

const handleFinishLater = () => {
  showConfirmationDialog.value = true
}

const handleSaveDraft = async (forceDraft: boolean = false) => {
  if (isSavingOrPublishing.value) return
  isSavingOrPublishing.value = true

  // Sync current language data before saving
  const currentLang = activeLanguage.value
  if (languageFormData[currentLang]) {
    languageFormData[currentLang].title = currentTitle.value
    languageFormData[currentLang].description = currentDescription.value
    languageFormData[currentLang].linkToSeeMore = currentLinkToSeeMore.value
  }

  // Drafts can be saved with empty title and content - clear any validation errors
  // Validation is only needed for publishing, not for saving drafts
  titleError.value = ''
  descriptionError.value = ''

  // Validate all language translations for length limits
  let hasValidationError = false
  const validationErrors: string[] = []
  
  for (const [langKey, langData] of Object.entries(languageFormData)) {
    const lang = langKey as Language
    const title = (lang === activeLanguage.value ? currentTitle.value : langData.title)?.trim() || ''
    
    if (title && title.length > DB_TITLE_MAX_LENGTH) {
      hasValidationError = true
      validationErrors.push(`${langKey.toUpperCase()}: Title is too long (max ${DB_TITLE_MAX_LENGTH}), current length: ${title.length}.`)
    }
  }
  
  if (hasValidationError) {
    // Set errors for active language if they exist
    const activeTitle = currentTitle.value?.trim() || ''
    if (activeTitle && activeTitle.length > DB_TITLE_MAX_LENGTH) {
      titleError.value = `Title is too long (max ${DB_TITLE_MAX_LENGTH}), current length: ${activeTitle.length}.`
    }
    
    // Show notification with all validation errors
    ElNotification({
      title: 'Validation Error',
      message: validationErrors.join('<br/>'),
      type: 'error',
      duration: 5000,
      dangerouslyUseHTMLString: true,
    })
    isSavingOrPublishing.value = false
    return
  }

  const token = localStorage.getItem('auth_token')
  if (!token || token.trim() === '') {
    ElNotification({
      title: 'Error',
      message: 'Please login first',
      type: 'error',
      duration: 2000,
    })
    isSavingOrPublishing.value = false
    router.push('/login')
    return
  }

  const loadingNotification = ElNotification({
    title: isEditMode.value ? 'Updating draft...' : 'Saving draft...',
    message: isEditMode.value
      ? 'Please wait while we update your notification'
      : 'Please wait while we save your notification',
    type: 'warning',
    duration: 0,
  })

  try {
    const imagesToUpload: { file: File; language: string }[] = []
    const translations: any[] = []

    // 1. Collect all translation data and identify images to upload
    for (const [langKey, langData] of Object.entries(languageFormData)) {
      const lang = langKey as Language
      // Prioritize current reactive state for the active tab, otherwise use stored tab data
      const title = (lang === activeLanguage.value ? currentTitle.value : langData.title)?.trim() || ''
      const content =
        (lang === activeLanguage.value ? currentDescription.value : langData.description)?.trim() ||
        ''
      const linkPreview =
        (lang === activeLanguage.value
          ? currentLinkToSeeMore.value
          : langData.linkToSeeMore
        )?.trim() || ''

      // Handle image: check if there's a new file to upload
      const imageFile = lang === activeLanguage.value ? currentImageFile.value : langData.imageFile

      if (imageFile) {
        try {
          const { file: compressed, dataUrl } = await compressImage(imageFile, {
            maxBytes: 10 * 1024 * 1024,
            maxWidth: 2000,
            targetAspectRatio: 2 / 1,
            correctAspectRatio: true,
          })
          imagesToUpload.push({ file: compressed, language: langKey })
          if (languageFormData[langKey]) {
            languageFormData[langKey].imageUrl = dataUrl
            if (lang === activeLanguage.value) {
              currentImageUrl.value = dataUrl
            }
          }
        } catch (e) {
          console.error('Compression failed for', langKey, e)
          throw new Error(`Failed to prepare image for ${langKey.toUpperCase()}`)
        }
      }

      const translationData: any = {
        language: mapLanguageToEnum(langKey),
        title: title,
        content: content,
        linkPreview: linkPreview || undefined,
        image: existingImageIds[langKey] || '',
      }

      // Preserve existing translation ID if editing
      if (existingTranslationIds[langKey]) {
        translationData.id = existingTranslationIds[langKey]
      }

      translations.push(translationData)
    }

    // 2. Upload images if needed
    let uploadedImages: {
      language?: string
      fileId: string
      mimeType: string
      originalFileName: string
    }[] = []

    if (imagesToUpload.length > 0) {
      try {
        const uploadItems = imagesToUpload.map((item) => ({
          file: item.file,
          language: String(item.language),
        }))
        
        uploadedImages = await notificationApi.uploadImages(uploadItems)
        
        // Update state and translations with new file IDs
        uploadedImages.forEach((u) => {
          if (u.language && u.fileId) {
            const langKey = String(u.language)
            existingImageIds[langKey] = u.fileId
            
            const transIndex = translations.findIndex(t => t.language === mapLanguageToEnum(langKey))
            if (transIndex !== -1) {
              translations[transIndex].image = u.fileId
            }

            if (languageFormData[langKey]) {
              languageFormData[langKey].imageFile = null
              languageFormData[langKey].imageUrl = `/api/v1/image/${u.fileId}`
              if (langKey === activeLanguage.value) {
                currentImageFile.value = null
                currentImageUrl.value = `/api/v1/image/${u.fileId}`
              }
            }
          }
        })
      } catch (error) {
        console.error('Error uploading images during draft save:', error)
        throw new Error('Failed to upload images. Please try again.')
      }
    }

    // 3. Determine sendType and schedule
    // If forceDraft is true, we set sendType to SEND_NOW to make it a draft, 
    // but we still preserve the sendSchedule if the user has it enabled.
    // This satisfies "keep all data" while still being in the Draft tab.
    const useSchedule = formData.scheduleEnabled && formData.scheduleDate && formData.scheduleTime
    const finalSendType = (forceDraft || !useSchedule) ? SendType.SEND_NOW : SendType.SEND_SCHEDULE

    const templateData: CreateTemplateRequest = {
      platforms: [mapPlatformToEnum(formData.pushToPlatforms)],
      bakongPlatform: formData.platform,
      sendType: finalSendType,
      isSent: false,
      translations: translations,
      notificationType: mapTypeToNotificationType(formData.notificationType),
      categoryTypeId: formData.categoryTypeId ?? undefined,
      priority: 1,
    }

    // Always preserve the schedule in the payload if it's enabled in the form
    if (useSchedule) {
      const scheduleDateTime = DateUtils.parseScheduleDateTime(
        String(formData.scheduleDate),
        String(formData.scheduleTime),
      )
      ;(templateData as any).sendSchedule = scheduleDateTime.toISOString()
    } else {
      ;(templateData as any).sendSchedule = null
    }

    // 4. Create or Update Template
    let result
    if (isEditMode.value) {
      result = await notificationApi.updateTemplate(parseInt(notificationId.value), templateData)
    } else {
      result = await notificationApi.createTemplate(templateData)
    }

    loadingNotification.close()

    ElNotification({
      title: 'Success',
      message: `Notification saved as draft successfully!`,
      type: 'success',
      duration: 2000,
    })

    // 5. Clear cache and redirect
    try {
      localStorage.removeItem('notifications_cache')
      localStorage.removeItem('notifications_cache_timestamp')
    } catch (e) {
      console.warn('Failed to clear cache:', e)
    }

    // Determine redirect tab based on our finalized status
    // If it's forced as draft or schedule is disabled, go to draft
    const redirectTab = (forceDraft || !useSchedule) ? 'draft' : 'scheduled'
    
    if (isEditMode.value) {
      setTimeout(() => {
        window.location.href = `/?tab=${redirectTab}`
        isSavingOrPublishing.value = false
      }, 500)
    } else {
      router.push(`/?tab=${redirectTab}`).then(() => {
        isSavingOrPublishing.value = false
      })
    }
  } catch (error: any) {
    isSavingOrPublishing.value = false
    loadingNotification.close()
    console.error('Error saving draft:', error)
    
    ElNotification({
      title: 'Error',
      message: error.message || 'An unexpected error occurred while saving the draft',
      type: 'error',
      duration: 5000,
    })
  }
}

const handleDiscard = () => {
  // Set flag to bypass navigation guard
  isDiscarding.value = true
  // Clear any pending navigation
  pendingNavigation = null
  
  // Determine default tab if fromTab is missing
  const defaultTab = isEditingPublished.value ? 'published' : (wasScheduled.value ? 'scheduled' : 'draft')
  
  // Navigate back to where the user came from, or default to the appropriate tab
  const redirectTab = fromTab.value || (isEditMode.value ? defaultTab : 'published')
  
  router.push(`/?tab=${redirectTab}`).finally(() => {
    // Reset flag after navigation completes
    setTimeout(() => {
      isDiscarding.value = false
    }, 100)
  })
}

const handleConfirmationDialogConfirm = () => {
  showConfirmationDialog.value = false
  handleSaveDraft(true)
}

const handleConfirmationDialogCancel = () => {
  // Close all dialogs before discarding
  showConfirmationDialog.value = false
  showLeaveDialog.value = false
  showUpdateConfirmationDialog.value = false
  pendingNavigation = null
  handleDiscard()
}

// Check if form has unsaved changes
const hasUnsavedChanges = computed(() => {
  // Check if any language has title or description filled (new content)
  // OR if existing data has been modified (edit mode)
  
  // Check global fields first
  const globalFieldsModified = 
    formData.platform !== originalFormData.platform ||
    formData.categoryTypeId !== originalFormData.categoryTypeId ||
    formData.pushToPlatforms !== originalFormData.pushToPlatforms
  
  if (globalFieldsModified) return true

  // Check if any language has title or description filled
  const hasContent = Object.values(languageFormData).some(
    (langData) => langData.title?.trim() || langData.description?.trim(),
  )

  // Check if any image has been uploaded
  const hasImage = Object.values(languageFormData).some(
    (langData) => langData.imageFile || langData.imageUrl,
  )

  // Check if any existing image IDs are set (for edit mode)
  const hasExistingImage = Object.values(existingImageIds).some((id) => id !== null)

  // In edit mode, check for modifications to existing data
  if (isEditMode.value) {
    for (const langKey of Object.keys(languageFormData)) {
      const originalData = originalLanguageFormData[langKey]
      const currentData = languageFormData[langKey]
      
      if (!originalData) continue
      
      const titleChanged = (currentData?.title?.trim() || '') !== (originalData?.title?.trim() || '')
      const descriptionChanged = (currentData?.description?.trim() || '') !== (originalData?.description?.trim() || '')
      const linkChanged = (currentData?.linkToSeeMore?.trim() || '') !== (originalData?.linkToSeeMore?.trim() || '')
      const imageChanged = currentData?.imageFile !== null || 
                           (existingImageIds[langKey] !== originalImageIds[langKey])
      
      if (titleChanged || descriptionChanged || linkChanged || imageChanged) return true
    }
  }

  return hasContent || hasImage || hasExistingImage
})

// Navigation guard - intercept navigation attempts
onBeforeRouteLeave((to, from, next) => {
  // Don't block navigation if currently saving/publishing
  if (isSavingOrPublishing.value) {
    next()
    return
  }

  // Don't block navigation if user explicitly wants to discard
  if (isDiscarding.value) {
    next()
    return
  }

  // Don't block navigation if no unsaved changes
  if (!hasUnsavedChanges.value) {
    next()
    return
  }

  // Show leave dialog and block navigation
  showLeaveDialog.value = true
  pendingNavigation = () => next()

  // Prevent navigation for now
  next(false)
})

const handleLeaveDialogConfirm = async () => {
  // Close dialog immediately to prevent it from showing again
  showLeaveDialog.value = false
  pendingNavigation = null
  
  if (isEditingPublished.value || fromTab.value === 'scheduled' || wasScheduled.value) {
    // For published or scheduled notifications, "Update and leave" should preserve their status
    // handlePublishNowInternal correctly handles the update and redirect logic
    await handlePublishNowInternal()
  } else {
    // For Drafts or new notifications, "Save as draft & leave" saves as draft
    // handleSaveDraft(true) forces the draft status and redirects to Draft tab
    await handleSaveDraft(true)
  }
}

const handleLeaveDialogCancel = () => {
  showLeaveDialog.value = false
  pendingNavigation = null
  // Stay on page - navigation was already blocked by next(false)
}

const handleUpdateConfirmationConfirm = async () => {
  // Close dialog and proceed with update
  showUpdateConfirmationDialog.value = false
  await handlePublishNowInternal()
}

const handleUpdateConfirmationCancel = () => {
  // Close dialog and navigate to home without updating
  showUpdateConfirmationDialog.value = false
  isSavingOrPublishing.value = false
  
  // Determine default tab if fromTab is missing
  const defaultTab = isEditingPublished.value ? 'published' : (wasScheduled.value ? 'scheduled' : 'draft')
  
  // Navigate to home screen based on tab
  const redirectTab = fromTab.value || defaultTab
  if (isEditMode.value) {
    setTimeout(() => {
      window.location.href = `/?tab=${redirectTab}`
    }, 100)
  } else {
    router.push(`/?tab=${redirectTab}`)
  }
}

const formatBakongApp = (app: BakongApp | undefined): string => {
  if (!app) return 'Bakong'
  switch (app) {
    case BakongApp.BAKONG:
      return 'Bakong'
    case BakongApp.BAKONG_TOURIST:
      return 'Bakong Tourist'
    case BakongApp.BAKONG_JUNIOR:
      return 'Bakong Junior'
    default:
      return String(app)
  }
}
</script>

<style>
html,
body {
  overflow: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

html::-webkit-scrollbar,
body::-webkit-scrollbar {
  display: none;
}

.el-date-editor .el-input__suffix,
.el-time-picker .el-input__suffix,
.el-date-editor .el-input__prefix,
.el-time-picker .el-input__prefix {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
}

.el-date-editor .el-input__suffix-inner,
.el-time-picker .el-input__suffix-inner,
.el-date-editor .el-input__prefix-inner,
.el-time-picker .el-input__prefix-inner {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
}

.el-date-editor .el-icon,
.el-time-picker .el-icon,
.el-date-editor svg,
.el-time-picker svg,
.el-date-editor i,
.el-time-picker i {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
}
</style>

<style scoped>
.create-notification-container {
  display: flex;
  height: 100vh;
  gap: 214px;
  padding: 0;
  overflow: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.create-notification-container::-webkit-scrollbar {
  display: none;
}

.main-content {
  flex: 1;
  max-width: 603px;
  padding: 0px;
  left: 231px;
  flex-direction: column;
  height: 100vh;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 17px 0px 0px 0px;
  overflow-y: auto;
  height: calc(100vh - 120px);
  max-height: calc(100vh - 172px);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.form-content::-webkit-scrollbar {
  display: none;
}

.image-preview {
  position: relative;
  display: inline-block;
}

.image-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  object-fit: cover;
}

.remove-image {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-fields {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;
  width: 603px;
  flex: none;
  order: 2;
  align-self: stretch;
  flex-grow: 0;
  gap: 20px;
}

.form-row {
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.required {
  color: #ef4444;
}

.form-input,
.form-input-title,
.form-input-number,
.form-input-link,
.form-select,
.form-textarea {
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;

  background: white;
  transition: border-color 0.2s ease;
  width: 293.5px;
  height: 56px;
}

.form-input:focus,
.form-input-title:focus,
.form-input-number:focus,
.form-input-link:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #001346;
  box-shadow: 0 0 0 3px rgba(0, 19, 70, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  width: 603px;
  height: 161px;
}

.form-input-title {
  width: 603px;
  height: 56px;
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 150%;
  color: #001346;
}

.form-input-link {
  width: 603px;
  height: 56px;
}

.custom-dropdown {
  width: 100%;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  background: white;
  transition: border-color 0.2s ease;
  width: 293.5px;
  height: 56px;
  cursor: pointer;
  box-sizing: border-box;
}

.dropdown-trigger:hover {
  border-color: #001346;
}

.dropdown-trigger:focus {
  outline: none;
  border-color: #001346;
  box-shadow: 0 0 0 3px rgba(0, 19, 70, 0.1);
}

.dropdown-icon {
  font-size: 12px;
  color: #6b7280;
  transition: transform 0.2s ease;
}

.custom-dropdown:hover .dropdown-icon {
  transform: rotate(180deg);
}

.full-width-dropdown {
  width: 100%;
}

.full-width-trigger {
  width: 603px !important;
}

.schedule-options {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  width: 603px;
  min-height: 68px;
  background: rgba(0, 19, 70, 0.03);
  border-radius: 8px;
  flex: none;
  order: 3;
  align-self: stretch;
  flex-grow: 0;
}

.schedule-options-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
}

.splash-options {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  width: 603px;
  min-height: 68px;
  background: rgba(0, 19, 70, 0.03);
  border-radius: 8px;
  flex: none;
  order: 4;
  align-self: stretch;
  flex-grow: 0;
}

.schedule-option-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.schedule-option-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.option-label {
  font-size: 14px;
  color: #001346;
  white-space: nowrap;
}

.option-title {
  font-size: 16px;
  font-weight: 600;
  color: #001346;
}

.option-description {
  font-size: 14px;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.4;
  max-width: 100%;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d5db;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #0f4aea;
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.schedule-options-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schedule-datetime-row {
  display: flex;
  flex-direction: row;
  gap: 16px;
  width: 100%;
}

.schedule-form-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
  width: 277.5px;
  flex: none;
  order: 0;
  flex-grow: 1;
}

.schedule-form-group:last-child {
  order: 1;
}

.schedule-form-label {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-size: 14px;
  font-weight: 400;
  line-height: 150%;
}

.field-hint {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-size: 12px;
  font-weight: 400;
  line-height: 150%;
  color: #10b981;
  margin-top: 4px;
  margin-bottom: 0;
}

.flash-input-group {
  width: 281.5px !important;
  min-width: 281.5px !important;
  max-width: 281.5px !important;
}

.flash-number-input {
  width: 281.5px !important;
  height: 56px !important;
}

.flash-number-input :deep(.el-input__wrapper) {
  width: 281.5px !important;
  height: 56px !important;
  min-width: 281.5px !important;
  max-width: 281.5px !important;
  min-height: 56px !important;
  max-height: 56px !important;
  padding: 16px 52px 16px 12px !important;
  border: 1px solid rgba(0, 19, 70, 0.1) !important;
  border-radius: 8px !important;
  background-color: #f9fafb !important;
  box-shadow: none !important;
  transition: border-color 0.2s ease !important;
}

.flash-number-input :deep(.el-input__wrapper:hover) {
  border-color: rgba(0, 19, 70, 0.2) !important;
}

.flash-number-input :deep(.el-input__wrapper.is-focus) {
  border-color: #001346 !important;
  box-shadow: 0 0 0 3px rgba(0, 19, 70, 0.1) !important;
}

.flash-number-input :deep(.el-input__inner) {
  height: 100% !important;
  line-height: 24px !important;
  font-size: 14px !important;
  font-family: 'IBM Plex Sans' !important;
  color: #6b7280 !important;
  padding: 0 !important;
  text-align: left !important;
}

.flash-number-input :deep(.el-input__inner::placeholder) {
  color: #9ca3af !important;
}

.flash-number-input.is-disabled :deep(.el-input__wrapper) {
  background-color: #f3f4f6 !important;
  border-color: rgba(0, 19, 70, 0.1) !important;
  cursor: not-allowed !important;
}

.flash-number-input.is-disabled :deep(.el-input__inner) {
  color: #9ca3af !important;
  cursor: not-allowed !important;
}

.flash-input-wrapper {
  position: relative;
  width: 281.5px;
  height: 56px;
}

.flash-dropdown-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  pointer-events: none;
  z-index: 10;
  font-size: 16px;
}

.flash-number-input.is-disabled + .flash-dropdown-icon,
.flash-input-wrapper .flash-number-input.is-disabled ~ .flash-dropdown-icon {
  color: #9ca3af;
}

.flash-number-input :deep(.el-input-number__increase),
.flash-number-input :deep(.el-input-number__decrease) {
  display: none !important;
}

.schedule-date-picker,
.schedule-time-picker {
  width: 277.5px !important;
  height: 45px !important;
  min-width: 277.5px !important;
  max-width: 277.5px !important;
  border-radius: 16px;
}

.schedule-date-picker .el-input,
.schedule-time-picker .el-input {
  width: 277.5px !important;
  height: 45px !important;
  min-width: 277.5px !important;
  max-width: 277.5px !important;
  border-radius: 16px;
}

.schedule-date-picker .el-input__wrapper,
.schedule-time-picker .el-input__wrapper {
  width: 277.5px !important;
  height: 45px !important;
  min-width: 277.5px !important;
  max-width: 277.5px !important;
  min-height: 45px !important;
  max-height: 45px !important;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 16px;
  font-size: 14px;
  color: #374151;
  background: white;
  transition: border-color 0.2s ease;
  box-shadow: none;
}

.schedule-date-picker .el-input__wrapper:hover,
.schedule-time-picker .el-input__wrapper:hover {
  border-color: #001346;
}

.schedule-date-picker .el-input__wrapper.is-focus,
.schedule-time-picker .el-input__wrapper.is-focus {
  border-color: #001346;
  box-shadow: 0 0 0 3px rgba(0, 19, 70, 0.1);
}

.schedule-date-picker .el-input__inner,
.schedule-time-picker .el-input__inner {
  height: 32px !important;
  line-height: 32px;
  color: #374151;
}

.schedule-date-picker .el-input__suffix,
.schedule-time-picker .el-input__suffix {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  align-items: center;
  justify-content: center;
  width: 40px !important;
  height: 40px !important;
}

.schedule-date-picker .el-input__prefix,
.schedule-time-picker .el-input__prefix {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
}

.schedule-date-picker .el-input__suffix-inner,
.schedule-time-picker .el-input__suffix-inner {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  align-items: center;
  justify-content: center;
  width: 40px !important;
  height: 40px !important;
}

.schedule-date-picker .el-input__prefix-inner,
.schedule-time-picker .el-input__prefix-inner {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

.schedule-date-picker .el-input__suffix .el-icon,
.schedule-time-picker .el-input__suffix .el-icon,
.schedule-date-picker .el-input__suffix .el-input__icon,
.schedule-time-picker .el-input__suffix .el-input__icon,
.schedule-date-picker .el-input__suffix [class*='icon'],
.schedule-time-picker .el-input__suffix [class*='icon'],
.schedule-date-picker .el-input__suffix svg,
.schedule-time-picker .el-input__suffix svg,
.schedule-date-picker .el-input__suffix i,
.schedule-time-picker .el-input__suffix i {
  display: inline-block !important;
  visibility: visible !important;
  opacity: 1 !important;
  width: 20px !important;
  height: 20px !important;
  font-size: 16px !important;
  color: #6b7280 !important;
}

.schedule-date-picker .el-icon:not(.el-input__suffix .el-icon),
.schedule-time-picker .el-icon:not(.el-input__suffix .el-icon),
.schedule-date-picker .el-input__icon:not(.el-input__suffix .el-input__icon),
.schedule-time-picker .el-input__icon:not(.el-input__suffix .el-input__icon),
.schedule-date-picker [class*='icon']:not(.el-input__suffix [class*='icon']),
.schedule-time-picker [class*='icon']:not(.el-input__suffix [class*='icon']),
.schedule-date-picker svg:not(.el-input__suffix svg),
.schedule-time-picker svg:not(.el-input__suffix svg),
.schedule-date-picker i:not(.el-input__suffix i),
.schedule-time-picker i:not(.el-input__suffix i) {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
  font-size: 0 !important;
}

.schedule-date-picker .el-date-editor__trigger,
.schedule-time-picker .el-time-picker__trigger {
  display: none !important;
}

.schedule-date-picker .el-date-editor__trigger-icon,
.schedule-time-picker .el-time-picker__trigger-icon {
  display: none !important;
}

.schedule-date-picker .el-input__wrapper .el-input__suffix,
.schedule-time-picker .el-input__wrapper .el-input__suffix {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  align-items: center;
  justify-content: center;
  width: 40px !important;
  height: 40px !important;
}

.schedule-date-picker .el-input__wrapper .el-input__prefix,
.schedule-time-picker .el-input__wrapper .el-input__prefix {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
}

.schedule-date-picker.el-date-editor,
.schedule-time-picker.el-time-picker {
  width: 277.5px !important;
  height: 56px !important;
  border-radius: 16px;
}

.schedule-date-picker.el-date-editor .el-input,
.schedule-time-picker.el-time-picker .el-input {
  width: 277.5px !important;
  height: 56px !important;
  border-radius: 16px;
}

.schedule-date-picker.el-date-editor .el-input__wrapper,
.schedule-time-picker.el-time-picker .el-input__wrapper {
  width: 277.5px !important;
  height: 56px !important;
  border-radius: 16px;
}

.action-buttons {
  display: flex;
  flex-direction: row;
  gap: 16px;
  order: 4;
}

.dialog-content {
  gap: 5px !important;
}

@media (max-width: 1024px) {
  .create-notification-container {
    flex-direction: column;
  }
}
</style>
