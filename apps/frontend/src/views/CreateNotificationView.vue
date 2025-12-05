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
                      categoryTypes.find((ct) => ct.id === formData.categoryTypeId)?.name ||
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
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="schedule-options-container">
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
        :categoryType="categoryTypes.find((ct) => ct.id === formData.categoryTypeId)?.name || ''"
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
    message="If you leave now, your progress will be saved as a draft. You can resume and complete it anytime."
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
import { ElNotification, ElInputNumber } from 'element-plus'
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
        (ct) => ct.name === 'News' || ct.name === 'NEWS',
      )
      formData.categoryTypeId = newsCategory?.id || categoryTypes.value[0].id
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
    if (titleError.value) {
      validateTitle()
    }
  },
})

const currentDescription = computed({
  get: () => languageFormData[activeLanguage.value]?.description || '',
  set: (value: string) => {
    if (languageFormData[activeLanguage.value]) {
      languageFormData[activeLanguage.value].description = value
    }
    if (descriptionError.value) {
      validateDescription()
    }
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

const loadNotificationData = async () => {
  if (!isEditMode.value || !notificationId.value) return

  try {
    const res = await api.get(`/api/v1/template/${notificationId.value}`)
    const template = res.data?.data

    if (!template) return

    // Check if editing a published notification (either from fromTab query or isSent status)
    isEditingPublished.value = fromTab.value === 'published' || template.isSent === true

    formData.notificationType =
      mapNotificationTypeToFormType(template.notificationType) || NotificationType.NOTIFICATION
    formData.categoryTypeId = template.categoryTypeId || null
    formData.platform = (template.bakongPlatform as BakongApp) || BakongApp.BAKONG

    if (template.sendSchedule) {
      formData.scheduleEnabled = true
      try {
        const scheduleDate = new Date(template.sendSchedule)
        if (!isNaN(scheduleDate.getTime())) {
          const cambodiaStr = scheduleDate.toLocaleString('en-US', {
            timeZone: 'Asia/Phnom_Penh',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
          const [datePart, timePart] = cambodiaStr.split(', ')
          if (datePart && timePart) {
            const [month, day, year] = datePart.split('/').map(Number)
            formData.scheduleDate = `${month}/${day}/${year}`
            formData.scheduleTime = timePart
          }
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
        languageFormData[lang].title = t.title || ''
        languageFormData[lang].description = t.content || ''
        languageFormData[lang].linkToSeeMore = t.linkPreview || ''
        const fileId = t.image?.fileId || t.image?.fileID || t.imageId || t.image?.id
        languageFormData[lang].imageUrl = fileId ? `/api/v1/image/${fileId}` : null
        languageFormData[lang].imageFile = null
        existingImageIds[lang] = fileId || null
      }
    }
  } catch (error) {
    console.error('Error loading notification data:', error)
    ElNotification({
      title: 'Error',
      message: 'Failed to load notification data',
      type: 'error',
      duration: 2000,
    })
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

const titleError = ref('')
const descriptionError = ref('')
const linkError = ref('')

const validateTitle = () => {
  const val = currentTitle.value?.trim()
  if (!val) {
    titleError.value = 'Please enter a title'
  } else {
    titleError.value = ''
  }
}

const validateDescription = () => {
  const val = currentDescription.value?.trim()
  if (!val) {
    descriptionError.value = 'Please enter a description'
  } else {
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

const handlePublishNow = async () => {
  validateTitle()
  validateDescription()

  if (
    !currentTitle.value ||
    !currentDescription.value ||
    titleError.value ||
    descriptionError.value
  ) {
    if (!titleError.value) validateTitle()
    if (!descriptionError.value) validateDescription()
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
    router.push('/login')
    return
  }

  // If editing a published notification, show confirmation dialog first
  if (isEditMode.value && isEditingPublished.value) {
    showUpdateConfirmationDialog.value = true
    return
  }

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

  try {
    let sendType = SendType.SEND_NOW
    let isSent = true
    let redirectTab = 'published'

    // When editing a published notification, always keep it published
    // Don't allow changing to scheduled or draft - ignore schedule settings
    if (isEditMode.value && isEditingPublished.value) {
      sendType = SendType.SEND_NOW
      isSent = true
      redirectTab = 'published'
      // Clear schedule fields to prevent any scheduling
      formData.scheduleEnabled = false
      formData.scheduleDate = ''
      formData.scheduleTime = ''
    } else {
      const hasValidDate = !!(formData.scheduleDate && String(formData.scheduleDate).trim() !== '')
      const hasValidTime = !!(formData.scheduleTime && String(formData.scheduleTime).trim() !== '')

      if (formData.scheduleEnabled) {
        if (!hasValidDate || !hasValidTime) {
          ElNotification({
            title: 'Error',
            message: 'Please select both Date and Time for scheduling',
            type: 'error',
            duration: 2000,
          })
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
            const { file: compressed, dataUrl } = await compressImage(langData.imageFile, {
              maxBytes: 10 * 1024 * 1024,
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

        translations.push({
          language: mapLanguageToEnum(langKey),
          title: langData.title,
          content: langData.description,
          linkPreview: langData.linkToSeeMore || undefined,
          image: imageId || '',
        })
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

        uploadedImages = await notificationApi.uploadImages(items)
        console.log('Batch uploaded images:', uploadedImages)
      } catch (error) {
        console.error('Error uploading images:', error)
        ElNotification({
          title: 'Error',
          message: 'Failed to upload images. Please ensure each is <= 10MB and try again.',
          type: 'error',
          duration: 2000,
        })
        loadingNotification.close()
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
      translations.push({
        language: mapLanguageToEnum(activeLanguage.value),
        title: currentTitle.value,
        content: currentDescription.value,
        linkPreview: currentLinkToSeeMore.value || undefined,
        image: fallbackImageId,
      })
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

    // Check if saved as draft due to no users
    if (result?.data?.savedAsDraftNoUsers) {
      // Format platform name using helper function
      const platformName = formatBakongApp(formData.platform)

      ElNotification({
        title: 'Info',
        message: getNoUsersAvailableMessage(platformName),
        type: 'info',
        duration: 3000,
        dangerouslyUseHTMLString: true,
      })
      redirectTab = 'draft'
    } else if (
      result?.data?.successfulCount !== undefined &&
      result?.data?.successfulCount === 0 &&
      result?.data?.failedCount !== undefined &&
      result?.data?.failedCount > 0
    ) {
      // All sends failed - show warning message
      ElNotification({
        title: 'Warning',
        message: `Failed to send notification to ${result.data.failedCount} user(s). The notification has been saved as a draft.`,
        type: 'warning',
        duration: 5000,
      })
      redirectTab = 'draft'
    } else if (redirectTab === 'scheduled') {
      ElNotification({
        title: 'Success',
        message: isEditMode.value
          ? 'Notification updated and scheduled successfully!'
          : 'Notification created and scheduled successfully!',
        type: 'success',
        duration: 2000,
      })
    } else {
      // Get successful count from response if available
      // Debug: log the full result to see the structure
      console.log('📊 [CreateNotificationView] Full result:', result)
      console.log('📊 [CreateNotificationView] result.data:', result?.data)

      const successfulCount = result?.data?.successfulCount
      const failedCount = result?.data?.failedCount
      const failedUsers = result?.data?.failedUsers || []

      console.log('📊 [CreateNotificationView] Send result:', {
        successfulCount,
        failedCount,
        failedUsers,
      })

      // Check if this is a flash notification
      const isFlashNotification = formData.notificationType === NotificationType.FLASH_NOTIFICATION

      let message = isFlashNotification
        ? isEditMode.value
          ? 'Flash notification updated and published successfully, and when user open bakongPlatform it will saw it!'
          : 'Flash notification created and published successfully, and when user open bakongPlatform it will saw it!'
        : isEditMode.value
          ? 'Notification updated and published successfully!'
          : 'Notification created and published successfully!'

      // Add user count if available (only for non-flash notifications)
      if (
        !isFlashNotification &&
        successfulCount !== undefined &&
        successfulCount !== null &&
        successfulCount > 0
      ) {
        const userText = successfulCount === 1 ? 'user' : 'users'
        message = isEditMode.value
          ? `Notification updated and published to ${successfulCount} ${userText} successfully!`
          : `Notification created and published to ${successfulCount} ${userText} successfully!`
      }

      // For flash notifications, replace bakongPlatform with bold platform name
      if (isFlashNotification) {
        const platformName = formatBakongApp(formData.platform)
        message = message.replace('bakongPlatform', `<strong>${platformName}</strong>`)
      }

      ElNotification({
        title: 'Success',
        message: message,
        type: 'success',
        duration: 2000,
        dangerouslyUseHTMLString: isFlashNotification,
      })

      // Log failed users to console if any
      if (failedCount > 0 && failedUsers.length > 0) {
        console.warn(`⚠️ Failed to send notification to ${failedCount} user(s):`, failedUsers)
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

    if (isEditMode.value) {
      setTimeout(() => {
        window.location.href = `/?tab=${redirectTab}`
        // Reset flag after navigation starts (full page reload)
        isSavingOrPublishing.value = false
      }, 500)
    } else {
      // Keep flag true until navigation completes
      router
        .push(`/?tab=${redirectTab}`)
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

const handleSaveDraft = async () => {
  isSavingOrPublishing.value = true

  titleError.value = ''
  descriptionError.value = ''

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
    const translations = []

    for (const [langKey, langData] of Object.entries(languageFormData)) {
      const title =
        langData.title?.trim() ||
        (langKey === activeLanguage.value ? currentTitle.value?.trim() : null) ||
        ''
      const content =
        langData.description?.trim() ||
        (langKey === activeLanguage.value ? currentDescription.value?.trim() : null) ||
        ''

      let imageId: string | undefined = undefined
      if (langData.imageFile) {
        try {
          const { file: compressed, dataUrl } = await compressImage(langData.imageFile, {
            maxBytes: 10 * 1024 * 1024,
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

      // For drafts: include translation if it has title OR content OR image
      // This allows saving drafts with just an image, or just title/content, or any combination
      const hasTitle = title && title.trim() !== ''
      const hasContent = content && content.trim() !== ''
      const hasImage = !!imageId || !!langData.imageFile

      if (!hasTitle && !hasContent && !hasImage) {
        continue
      }

      translations.push({
        language: mapLanguageToEnum(langKey),
        title: title || '',
        content: content || '',
        linkPreview: langData.linkToSeeMore || undefined,
        image: imageId || '',
      })
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

        uploadedImages = await notificationApi.uploadImages(items)
        console.log('Batch uploaded images:', uploadedImages)
      } catch (error) {
        console.error('Error uploading images:', error)
        ElNotification({
          title: 'Error',
          message: 'Failed to upload images. Please try again.',
          type: 'error',
          duration: 2000,
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
          return
        }
      }

      const draftTitle = currentTitle.value?.trim() || ''
      const draftDescription = currentDescription.value?.trim() || ''

      translations.push({
        language: mapLanguageToEnum(activeLanguage.value),
        title: draftTitle || '',
        content: draftDescription || '',
        linkPreview: currentLinkToSeeMore.value || undefined,
        image: fallbackImageId || '',
      })
    }
    const templateData: CreateTemplateRequest = {
      platforms: [mapPlatformToEnum(formData.pushToPlatforms)],
      bakongPlatform: formData.platform,
      sendType: SendType.SEND_NOW,
      isSent: false,
      translations: translations,
      notificationType: mapTypeToNotificationType(formData.notificationType),
      categoryTypeId: formData.categoryTypeId ?? undefined,
      priority: 1,
    }
    if (formData.scheduleEnabled && formData.scheduleDate && formData.scheduleTime) {
      const scheduleDateTime = DateUtils.parseScheduleDateTime(
        String(formData.scheduleDate),
        String(formData.scheduleTime),
      )
      ;(templateData as any).sendSchedule = scheduleDateTime.toISOString()
    }

    let result
    if (isEditMode.value) {
      result = await notificationApi.updateTemplate(parseInt(notificationId.value), templateData)
    } else {
      result = await notificationApi.createTemplate(templateData)
    }

    loadingNotification.close()

    ElNotification({
      title: 'Success',
      message: isEditMode.value
        ? 'Notification updated as draft successfully!'
        : 'Notification saved as draft successfully!',
      type: 'success',
      duration: 2000,
    })
    const draftRedirectTab = 'draft'
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

    // Keep isSavingOrPublishing true until navigation completes
    // This prevents the navigation guard from blocking the navigation
    if (isEditMode.value) {
      setTimeout(() => {
        window.location.href = `/?tab=${draftRedirectTab}`
        // Reset flag after navigation starts (full page reload)
        isSavingOrPublishing.value = false
      }, 500)
    } else {
      // For router.push, reset flag after navigation
      router
        .push(`/?tab=${draftRedirectTab}`)
        .then(() => {
          isSavingOrPublishing.value = false
        })
        .catch(() => {
          isSavingOrPublishing.value = false
        })
    }
  } catch (error: any) {
    isSavingOrPublishing.value = false
    console.error('Error saving draft:', error)
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
      'An unexpected error occurred while saving the draft'

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

const handleDiscard = () => {
  router.push('/')
}

const handleConfirmationDialogConfirm = () => {
  showConfirmationDialog.value = false
  handleSaveDraft()
}

const handleConfirmationDialogCancel = () => {
  showConfirmationDialog.value = false
  handleDiscard()
}

// Check if form has unsaved changes
const hasUnsavedChanges = computed(() => {
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

  return hasContent || hasImage || hasExistingImage
})

// Navigation guard - intercept navigation attempts
onBeforeRouteLeave((to, from, next) => {
  // Don't block navigation if currently saving/publishing
  if (isSavingOrPublishing.value) {
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
  
  // Save as draft and then navigate
  try {
    await handleSaveDraft()
    // Navigation will happen in handleSaveDraft
    // Reset flag will happen in handleSaveDraft after navigation
  } catch (error) {
    // If save fails, show error but don't reopen dialog
    console.error('Failed to save draft:', error)
    // Reset flag on error
    isSavingOrPublishing.value = false
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
  
  // Navigate to home screen based on tab
  const redirectTab = fromTab.value || 'published'
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
