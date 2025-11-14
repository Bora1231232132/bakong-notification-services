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
            :max-size="10 * 1024 * 1024"
            format-text="Supported format: PNG, JPG (2:1 W:H)"
            size-text="Maximum size: 10MB"
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
                @command="(command: NotificationType) => (formData.notificationType = command)"
                trigger="click"
                class="custom-dropdown"
              >
                <span class="dropdown-trigger">
                  {{ formatNotificationType(formData.notificationType) }}
                  <el-icon class="dropdown-icon">
                    <ArrowDown />
                  </el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="type in Object.values(NotificationType)"
                      :key="type"
                      :command="type"
                    >
                      {{ formatNotificationType(type) }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="form-group">
              <label class="form-label">Category Type<span class="required">*</span></label>
              <el-dropdown
                @command="(command: CategoryType) => (formData.categoryType = command)"
                trigger="click"
                class="custom-dropdown"
              >
                <span class="dropdown-trigger">
                  {{ formatCategoryType(formData.categoryType) }}
                  <el-icon class="dropdown-icon">
                    <ArrowDown />
                  </el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="category in Object.values(CategoryType)"
                      :key="category"
                      :command="category"
                    >
                      {{ formatCategoryType(category) }}
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
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">OS Platforms <span class="required">*</span></label>
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
            <div class="form-group">
              <label class="form-label">Bakong Platform <span class="required">*</span></label>
              <el-dropdown
                @command="(command: BakongApp) => (formData.platform = command)"
                trigger="click"
                class="custom-dropdown"
              >
                <span class="dropdown-trigger">
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
                  <span class="option-title">Schedule Options</span>
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
                    style="width: 277.5px !important; height: 45px !important; border-radius: 16px"
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
                    style="width: 277.5px !important; height: 45px !important; border-radius: 16px"
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
                  <span class="option-title">Show as splash</span>
                </div>
                <div class="schedule-option-right">
                  <span class="option-label">Set time and date</span>
                  <label class="toggle-switch">
                    <input v-model="formData.splashEnabled" type="checkbox" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div v-if="formData.splashEnabled" class="schedule-datetime-row">
                <div class="schedule-form-group">
                  <label class="schedule-form-label"
                    >Number showing per day <span class="required">*</span></label
                  >
                  <ElInputNumber
                    v-model="num"
                    :min="1"
                    :max="10"
                    @change="handleShowPerDayChange"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="action-buttons">
            <Button
              text="Publish now"
              variant="primary"
              size="medium"
              width="123px"
              height="56px"
              @click="handlePublishNow"
            />
            <Button
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
        :categoryType="formData.categoryType"
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
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElNotification, ElInputNumber } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { MobilePreview, ImageUpload, Tabs, Button } from '@/components/common'
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue'
import { notificationApi, type CreateTemplateRequest } from '@/services/notificationApi'
import { api } from '@/services/api'
import {
  NotificationType,
  CategoryType,
  Platform,
  Language,
  SendType,
  BakongApp,
  formatNotificationType,
  formatPlatform,
  formatCategoryType,
} from '@/utils/helpers'
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
  mapTypeToCategoryType,
  mapPlatformToEnum,
  mapLanguageToEnum,
  compressImage,
} from '../utils/helpers'

const router = useRouter()
const route = useRoute()

const isEditMode = computed(() => route.name === 'edit-notification')
const notificationId = computed(() => route.params.id as string)

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

const num = ref(1)
const handleShowPerDayChange = (value: number | undefined) => {
  console.log(value)
}

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

const formData = reactive({
  notificationType: NotificationType.NOTIFICATION,
  categoryType: CategoryType.OTHER,
  pushToPlatforms: Platform.ALL,
  showPerDay: 1,
  platform: BakongApp.BAKONG,
  scheduleEnabled: false,
  scheduleDate: getTodayDateString(),
  scheduleTime: null as string | null,
  splashEnabled: false,
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

    formData.notificationType =
      mapNotificationTypeToFormType(template.notificationType) || NotificationType.NOTIFICATION
    formData.categoryType = mapTypeToCategoryType(template.categoryType) || CategoryType.OTHER
    formData.platform = BakongApp.BAKONG

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

  const loadingNotification = ElNotification({
    title: isEditMode.value ? 'Updating notification...' : 'Creating notification...',
    message: isEditMode.value
      ? 'Please wait while we update your notification'
      : 'Please wait while we create your notification',
    type: 'info',
    duration: 0,
  })

  try {
    let sendType = SendType.SEND_NOW
    let isSent = true
    let redirectTab = 'published'

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
        return
      }
      sendType = SendType.SEND_SCHEDULE
      isSent = false
      redirectTab = 'scheduled'
    } else {
      redirectTab = 'published'
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
          return
        }
        let imageId: string | undefined = undefined
        if (langData.imageFile) {
          try {
            const { file: compressed, dataUrl } = await compressImage(langData.imageFile, {
              maxBytes: 5 * 1024 * 1024,
              maxWidth: 2000,
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
            return
          }
        } else if (isEditMode.value && existingImageIds[langKey] && langData.imageUrl !== null) {
          imageId = existingImageIds[langKey]
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
          message: 'Failed to upload images. Please ensure each is <= 5MB and try again.',
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
      sendType: sendType,
      isSent: isSent,
      translations: translations,
      notificationType: mapTypeToNotificationType(formData.notificationType),
      categoryType: mapTypeToCategoryType(formData.categoryType),
      priority: 1,
    }

    if (formData.scheduleEnabled) {
      const scheduleDateTime = DateUtils.parseScheduleDateTime(
        String(formData.scheduleDate),
        String(formData.scheduleTime),
      )
      templateData.sendSchedule = scheduleDateTime.toISOString()
    }

    let result
    if (isEditMode.value) {
      result = await notificationApi.updateTemplate(parseInt(notificationId.value), templateData)
    } else {
      result = await notificationApi.createTemplate(templateData)
    }

    loadingNotification.close()

    if (redirectTab === 'scheduled') {
      ElNotification({
        title: 'Success',
        message: isEditMode.value
          ? 'Notification updated and scheduled successfully!'
          : 'Notification created and scheduled successfully!',
        type: 'success',
        duration: 2000,
      })
    } else {
      ElNotification({
        title: 'Success',
        message: isEditMode.value
          ? 'Notification updated and published successfully!'
          : 'Notification created and published successfully!',
        type: 'success',
        duration: 2000,
      })
    }
    try {
      localStorage.removeItem('notifications_cache')
      localStorage.removeItem('notifications_cache_timestamp')
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }

    if (isEditMode.value) {
      setTimeout(() => {
        window.location.href = `/?tab=${redirectTab}`
      }, 500)
    } else {
      router.push(`/?tab=${redirectTab}`)
    }
  } catch (error: any) {
    console.error('Error creating notification:', error)

    loadingNotification.close()
    const errorMessage =
      error.response?.data?.responseMessage || error.response?.data?.message || error.message
    ElNotification({
      title: 'Error',
      message: `${errorMessage}`,
      type: 'error',
      duration: 2000,
    })
  }
}

const handleFinishLater = () => {
  showConfirmationDialog.value = true
}

const handleSaveDraft = async () => {
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
    router.push('/login')
    return
  }

  const loadingNotification = ElNotification({
    title: isEditMode.value ? 'Updating draft...' : 'Saving draft...',
    message: isEditMode.value
      ? 'Please wait while we update your notification'
      : 'Please wait while we save your notification',
    type: 'info',
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
            maxBytes: 5 * 1024 * 1024,
            maxWidth: 2000,
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
          return
        }
      } else if (isEditMode.value && existingImageIds[langKey] && langData.imageUrl !== null) {
        imageId = existingImageIds[langKey]
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
      sendType: SendType.SEND_NOW,
      isSent: false,
      translations: translations,
      notificationType: mapTypeToNotificationType(formData.notificationType),
      categoryType: mapTypeToCategoryType(formData.categoryType),
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

    if (isEditMode.value) {
      setTimeout(() => {
        window.location.href = `/?tab=${draftRedirectTab}`
      }, 500)
    } else {
      router.push(`/?tab=${draftRedirectTab}`)
    }
  } catch (error: any) {
    console.error('Error saving draft:', error)

    loadingNotification.close()
    const errorMessage =
      error.response?.data?.responseMessage || error.response?.data?.message || error.message
    ElNotification({
      title: 'Error',
      message: `${errorMessage}`,
      type: 'error',
      duration: 2000,
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
}

.el-date-editor .el-input__suffix-inner,
.el-time-picker .el-input__suffix-inner,
.el-date-editor .el-input__prefix-inner,
.el-time-picker .el-input__prefix-inner {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
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
  align-items: center;
  gap: 218px;
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
  align-items: center;
}

.schedule-option-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-label {
  font-size: 14px;
  color: #001346;
}

.option-title {
  font-size: 16px;
  font-weight: 600;
  color: #001346;
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
  color: #374151;
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
.schedule-time-picker .el-input__suffix,
.schedule-date-picker .el-input__prefix,
.schedule-time-picker .el-input__prefix {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
}

.schedule-date-picker .el-input__suffix-inner,
.schedule-time-picker .el-input__suffix-inner,
.schedule-date-picker .el-input__prefix-inner,
.schedule-time-picker .el-input__prefix-inner {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

.schedule-date-picker .el-icon,
.schedule-time-picker .el-icon,
.schedule-date-picker .el-input__icon,
.schedule-time-picker .el-input__icon,
.schedule-date-picker [class*='icon'],
.schedule-time-picker [class*='icon'],
.schedule-date-picker svg,
.schedule-time-picker svg,
.schedule-date-picker i,
.schedule-time-picker i {
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
.schedule-time-picker .el-input__wrapper .el-input__suffix,
.schedule-date-picker .el-input__wrapper .el-input__prefix,
.schedule-time-picker .el-input__wrapper .el-input__prefix {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

.schedule-date-picker.el-date-editor,
.schedule-time-picker.el-time-picker {
  width: 277.5px !important;
  height: 45px !important;
  border-radius: 16px;
}

.schedule-date-picker.el-date-editor .el-input,
.schedule-time-picker.el-time-picker .el-input {
  width: 277.5px !important;
  height: 45px !important;
  border-radius: 16px;
}

.schedule-date-picker.el-date-editor .el-input__wrapper,
.schedule-time-picker.el-time-picker .el-input__wrapper {
  width: 277.5px !important;
  height: 45px !important;
  border-radius: 16px;
}

.action-buttons {
  display: flex;
  flex-direction: row;
  gap: 16px;
  order: 4;
}

@media (max-width: 1024px) {
  .create-notification-container {
    flex-direction: column;
  }
}
</style>
