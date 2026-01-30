<template>
  <div class="create-notification-container">
    <div class="main-content">
      <Tabs v-model="activeLanguage" :tabs="languageTabs" @tab-changed="handleLanguageChanged" />
     
      <div class="form-content">
         <!-- Reject Reason Display: Only show for rejected templates in draft tab -->
      <div 
        v-if="(isEditMode || isViewMode) && fromTab === 'draft' && rejectReasonText" 
        class="reject-reason-container"
      >
        <div class="reject-reason-header">
          <el-icon class="reject-reason-icon"><WarningFilled /></el-icon>
          <div class="reject-reason-label ">Reject Reason: <span class="reject-reason-text">{{ rejectReasonText }}</span></div>
        </div>
      </div>
      <!-- Expired Time Display: Only show for expired templates in draft tab -->
      <div 
        v-if="(isEditMode || isViewMode) && fromTab === 'draft' && expiredScheduleTime" 
        class="reject-reason-container expired-time-container"
      >
        <div class="reject-reason-header">
          <el-icon class="reject-reason-icon"><WarningFilled /></el-icon>
          <div class="reject-reason-label">
            Expired Time: 
            <span class="reject-reason-text">
              The scheduled time was set to <strong>{{ expiredScheduleTime }}</strong>, and it has now passed. Please update the schedule time before resubmitting.
            </span>
          </div>
        </div>
      </div>
        <div class="form-group">
          <ImageUpload
            :key="`image-upload-${activeLanguage}-${existingImageIds[activeLanguage] || 'new'}`"
            v-model="currentImageFile"
            accept-types="image/png,image/jpeg"
            :max-size="3 * 1024 * 1024"
            format-text="Supported format: PNG, JPG (2:1 W:H or 880:440)"
            size-text="Maximum size: 3MB"
            :existing-image-url="currentImageUrl || undefined"
            :disabled="isReadOnly"
            @file-selected="handleLanguageImageSelected"
            @file-removed="handleLanguageImageRemoved"
            @error="handleUploadError"
          />
        </div>
        <div class="form-fields">
          <div class="form-group">
            <label class="form-label">Bakong Platform <span class="required">*</span></label>
            <el-dropdown
              @command="(command: BakongApp) => {
                if (!isReadOnly && !isEditingRestrictedFields) {
                  formData.platform = command
                  // Immediately force English tab when selecting Bakong Tourist
                  if (command === BakongApp.BAKONG_TOURIST) {
                    activeLanguage = Language.EN as Language
                  }
                }
              }"
              trigger="click"
              class="custom-dropdown full-width-dropdown"
              :class="{ 'is-disabled': isReadOnly || isEditingRestrictedFields }"
              :disabled="isReadOnly || isEditingRestrictedFields"
            >
              <span 
                class="dropdown-trigger full-width-trigger"
                @click.stop="(e) => {
                  if (isReadOnly || isEditingRestrictedFields) {
                    e.preventDefault()
                    e.stopPropagation()
                  }
                }"
              >
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
            <label class="form-label">Title <span class="required">*</span></label>
            <input
              v-model="currentTitle"
              type="text"
              class="form-input-title"
              :class="{ 'lang-khmer': titleHasKhmer }"
              :data-content-lang="titleHasKhmer ? 'km' : ''"
              placeholder="Attractive title"
              :disabled="isReadOnly"
              :readonly="isReadOnly"
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
              :disabled="isReadOnly"
              :readonly="isReadOnly"
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
              <label class="form-label">Type <span class="required">*</span></label>
              <el-dropdown
                @command="(command: number) => {
                  if (!isReadOnly && !isEditingRestrictedFields && !loadingCategoryTypes) {
                    formData.categoryTypeId = command
                  }
                }"
                trigger="click"
                class="custom-dropdown"
                :class="{ 'is-disabled': loadingCategoryTypes || isReadOnly || isEditingRestrictedFields }"
                :disabled="loadingCategoryTypes || isReadOnly || isEditingRestrictedFields"
              >
                <span 
                  class="dropdown-trigger"
                  @click.stop="(e) => {
                    if (loadingCategoryTypes || isReadOnly || isEditingRestrictedFields) {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }"
                >
                  {{
                    formatCategoryType(
                      categoryTypes.find(
                        (ct: CategoryTypeData) => ct.id === formData.categoryTypeId,
                      )?.name || 'Select Category',
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
                @command="(command: Platform) => {
                  if (!isReadOnly && !isEditingRestrictedFields) {
                    formData.pushToPlatforms = command
                  }
                }"
                trigger="click"
                :disabled="isReadOnly || isEditingRestrictedFields"
                class="custom-dropdown"
                :class="{ 'is-disabled': isReadOnly || isEditingRestrictedFields }"
              >
                <span 
                  class="dropdown-trigger"
                  @click.stop="(e) => {
                    if (isReadOnly || isEditingRestrictedFields) {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }"
                >
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
            <label class="form-label">Link to see more (optional)</label>
            <input
              v-model="currentLinkToSeeMore"
              type="url"
              class="form-input-link"
              placeholder="https://google.com"
              inputmode="url"
              pattern="https?://.+"
              :disabled="isReadOnly"
              :readonly="isReadOnly"
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
                    <input
                      v-model="formData.scheduleEnabled"
                      type="checkbox"
                      :disabled="isReadOnly || isEditingRestrictedFields"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div v-if="formData.scheduleEnabled" class="schedule-datetime-row">
                <div class="schedule-form-group">
                  <label class="schedule-form-label">Date <span class="required">*</span></label>
                  <el-date-picker
                    :key="`date-picker-${notificationId || 'new'}-${formData.scheduleDate || 'empty'}`"
                    v-model="formData.scheduleDate"
                    type="date"
                    :placeholder="datePlaceholder"
                    format="M/D/YYYY"
                    value-format="M/D/YYYY"
                    class="schedule-date-picker"
                    style="width: 277.5px !important; height: 56px !important; border-radius: 16px"
                    :prefix-icon="null"
                    :clear-icon="null"
                    :disabled-date="customDisabledDate"
                    :disabled="isReadOnly || isEditingRestrictedFields"
                    :default-value="scheduleDateDefaultValue"
                    @change="
                      (val: string | null) => {
                        handleDatePickerChange(val)
                      }
                    "
                  />
                </div>
                <div class="schedule-form-group">
                  <label class="schedule-form-label">Time <span class="required">*</span></label>
                  <el-time-picker
                    :key="`time-picker-${notificationId || 'new'}-${isLoadingData ? 'loading' : 'ready'}`"
                    v-model="scheduleTimeModel"
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
                    :disabled="isReadOnly || isEditingRestrictedFields || isLoadingData || (isTemplateExpired && isReadOnly)"
                    @change="
                      (val: string | null) => {
                        const hasLoaded = hasLoadedScheduleTime
                        const isLoading = isLoadingData
                        const loadedTime = loadedScheduleTime
                        console.log('🟢 [Time Picker Change] Event fired:', {
                          newValue: val,
                          currentFormDataTime: formData.scheduleTime,
                          loadedScheduleTime: loadedTime,
                          hasLoadedScheduleTime: hasLoaded,
                          isLoadingData: isLoading,
                          willUpdate: val !== formData.scheduleTime,
                        })
                        
                        // CRITICAL: Block ALL updates during loading if we've loaded schedule time from template
                        // This prevents the time picker from overwriting the loaded time with placeholder
                        if (isLoading && hasLoaded && loadedTime) {
                          if (val !== loadedTime) {
                            console.log('🔒 [Time Picker Change] BLOCKED - Preserving loaded time during load:', {
                              attemptedValue: val,
                              preservedValue: loadedTime,
                              currentFormDataTime: formData.scheduleTime,
                            })
                            // Restore the loaded time immediately and prevent further updates
                            formData.scheduleTime = loadedTime
                            return
                          }
                        }
                        
                        // Note: v-model already handles the binding, but we log here for debugging
                        // Only update if value actually changed to avoid unnecessary updates
                        if (val !== formData.scheduleTime) {
                        formData.scheduleTime = val
                          console.log('🟢 [Time Picker Change] Updated formData.scheduleTime to:', val)
                        }
                      }
                    "
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
                    <input
                      v-model="formData.splashEnabled"
                      type="checkbox"
                      :disabled="isReadOnly"
                    />
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
                      :disabled="isReadOnly"
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
                      :disabled="isReadOnly"
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
            <!-- Hide action buttons for APPROVAL role (read-only) -->
            <template v-if="!isReadOnly">
            <Button
              :text="publishButtonText"
              variant="primary"
              size="medium"
              width="123px"
              height="56px"
              @click="handlePublishNow"
            />
            <!-- Cancel now button: Show when editing from Published, Pending, or Scheduled tabs (not Draft) -->
            <Button
              v-if="isEditMode && (isEditingPublished || isEditingPending || isEditingScheduled) && fromTab !== 'draft'"
              text="Cancel now"
              variant="secondary"
              size="medium"
              width="116px"
              height="56px"
              @click="handleCancel"
              />
            <!-- Update now button: Show when editing from Draft tab (including expired templates) -->
            <Button
              v-if="isEditMode && fromTab === 'draft'"
              text="Update now"
              variant="secondary"
              size="medium"
              width="116px"
              height="56px"
              @click="() => handleSaveDraft(false)"
              />
            <!-- Save draft button: Show only when creating a NEW notification -->
            <Button
              v-if="!isEditMode"
              text="Save draft"
              variant="secondary"
              size="medium"
              width="116px"
              height="56px"
              @click="handleFinishLater"
              />
            </template>
            <!-- Back button for read-only view mode -->
            <Button
              v-if="isReadOnly && !isApprovalViewMode"
              text="Back now"
              variant="secondary"
              size="medium"
              width="116px"
              height="56px"
              @click="handleBack"
            />
            
            <!-- Approval view mode buttons for Approver viewing PENDING notification -->
            <template v-if="isReadOnly && isApprovalViewMode">
              <Button
                :text="approvalButtonText"
                variant="primary"
                size="medium"
                width="180px"
                height="56px"
                @click="handleApprovalFromView"
              />
              <Button
                text="Reject Now"
                variant="danger"
                size="medium"
                width="130px"
                height="56px"
                @click="handleRejectFromView"
              />
              <Button
                text="Back now"
                variant="secondary"
                size="medium"
                width="116px"
                height="56px"
                @click="handleBack"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
    <div class="sticky top-24">
      <MobilePreview
        :title="currentTitle"
        :description="currentDescription"
        :image="currentImageUrl || ''"
        :categoryType="
          categoryTypes.find((ct: CategoryTypeData) => ct.id === formData.categoryTypeId)?.name ||
          ''
        "
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
    :message="getLeaveDialogMessage()"
    :confirm-text="getLeaveDialogConfirmText()"
    cancel-text="Stay on page"
    type="warning"
    confirm-button-type="primary"
    @confirm="handleLeaveDialogConfirm"
    @cancel="handleLeaveDialogCancel"
  />
  <ConfirmationDialog
    v-model="showRejectDialog"
    title="Reject Notification?"
    message="Please provide a reason for rejecting this notification. It will be moved back to Draft tab."
    confirm-text="Reject"
    cancel-text="Cancel now"
    type="warning"
    confirm-button-type="danger"
    :show-reason-input="true"
    @confirm="(reason?: string) => handleRejectFromViewConfirm(reason)"
    @cancel="handleRejectFromViewCancel"
  />
  <ConfirmationDialog
    v-model="showUpdateConfirmationDialog"
    title="You want to update?"
    message="Updating will immediately change the announcement for all users."
    confirm-text="Continue"
    cancel-text="Cancel now"
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
import { ArrowDown, WarningFilled } from '@element-plus/icons-vue'
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
  formatNoUsersFoundMessage,
  formatNoUsersFoundRejectionMessage,
} from '@/utils/helpers'
import { useCategoryTypesStore } from '@/stores/categoryTypes'
import type { CategoryType as CategoryTypeData } from '@/services/categoryTypeApi'
import { DateUtils, UserRole, ErrorCode } from '@bakong/shared'
import { useAuthStore } from '@/stores/auth'
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
const authStore = useAuthStore()

const isEditMode = computed(() => route.name === 'edit-notification')
const isViewMode = computed(() => route.name === 'view-notification')
const notificationId = computed(() => route.params.id as string)
const fromTab = computed(() => (route.query.fromTab as string) || '')
const isEditingPublished = ref(false)
const wasScheduled = ref(false)
const isLoadingData = ref(false)
const isEditingPending = ref(false) // Track if editing a PENDING template
const isEditingScheduled = ref(false) // Track if editing from Scheduled tab (approved template)
const isTemplateExpired = ref(false) // Track if template is expired (should preserve original scheduled time)
const hasLoadedScheduleTime = ref(false) // Track if schedule time was loaded from template
const loadedScheduleTime = ref<string | null>(null) // Store the original loaded schedule time to prevent overwrites
const originalIsSent = ref<boolean | null>(null) // Store the original isSent value to preserve when editing from Scheduled/Published/Pending tabs

// Check if user is APPROVAL role (read-only access)
const isApprovalRole = computed(() => authStore.user?.role === (UserRole.APPROVAL as any))
// Read-only mode: APPROVAL role can only view, not edit
const isReadOnly = computed(() => isViewMode.value || isApprovalRole.value)

// Check if editing Published notifications (restricted fields should be disabled)
// Only published notifications (already sent to users) should have restricted fields
// Scheduled/Pending notifications haven't been sent yet, so all fields can be edited
const isEditingRestrictedFields = computed(() => {
  return isEditMode.value && isEditingPublished.value
})

// Check if template is rejected (for showing reject reason)
// Only show for REJECTED templates, not EXPIRED
const isRejectedTemplate = computed(() => {
  // Check if we're in edit/view mode and have a rejection reason
  if (!isEditMode.value && !isViewMode.value) {
    console.log('🔍 [isRejectedTemplate] Not in edit/view mode')
    return false
  }
  // Only show for rejected templates (not expired) with a reason
  const hasReason = rejectReasonText.value !== '' && rejectReasonText.value !== null && rejectReasonText.value !== undefined
  console.log('🔍 [isRejectedTemplate] Computed:', {
    isEditMode: isEditMode.value,
    isViewMode: isViewMode.value,
    rejectReasonText: rejectReasonText.value,
    hasReason,
    fromTab: fromTab.value,
    willShow: hasReason && fromTab.value === 'draft',
  })
  return hasReason
})

// Check if this is approval view mode (Approver viewing PENDING notification)
const isApprovalViewMode = computed(() => {
  return isReadOnly.value && isApprovalRole.value && isEditingPending.value
})

// Custom disabled date function that allows today for all cases
const customDisabledDate = (time: Date): boolean => {
  // Get current time in Cambodia timezone to determine "today"
  const now = DateUtils.nowInCambodia()
  
  // Get today's date string in Cambodia timezone (M/D/YYYY format)
  const todayStr = DateUtils.getCurrentDateString() // e.g., "1/25/2026"
  const [todayMonth, todayDay, todayYear] = todayStr.split('/').map(Number)
  
  // Element Plus date picker passes dates - we need to get the date in Cambodia timezone
  // Convert the input date to a string in Cambodia timezone to get accurate date components
  const timeInCambodia = time.toLocaleDateString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
  const [selectedMonth, selectedDay, selectedYear] = timeInCambodia.split('/').map(Number)
  
  // Compare date components
  // Disable dates that are before today (allow today and future dates)
  if (selectedYear < todayYear) return true
  if (selectedYear > todayYear) return false
  if (selectedMonth < todayMonth) return true
  if (selectedMonth > todayMonth) return false
  if (selectedDay < todayDay) return true
  
  // Today and future dates are allowed (return false = not disabled)
  return false
}

// Approval button text based on sendType
const approvalButtonText = computed(() => {
  if (!isApprovalViewMode.value) return 'Approve'
  // Check if notification is scheduled
  return formData.scheduleEnabled ? 'Approval Scheduled' : 'Approval Now'
})

// Dynamic button text based on context and user role
const publishButtonText = computed(() => {
  // If editing from Scheduled tab (approved template), show "Update now"
  if (isEditingScheduled.value) {
    return 'Update now'
  }
  // If editing a PENDING template, show "Update now"
  if (isEditingPending.value) {
    return 'Update now'
  }
  if (isEditingPublished.value) {
    return 'Update now'
  }
  if (formData.scheduleEnabled) {
    return 'Submit Now'
  }
  // For EDITOR and ADMIN roles, show "Submit now" instead of "Publish now"
  const userRole = authStore.user?.role as any
  if (userRole === UserRole.EDITOR || userRole === UserRole.ADMINISTRATOR) {
    return 'Submit now'
  }
  return 'Publish now'
})

const languages = [
  { code: Language.KM, name: 'Khmer' },
  { code: Language.EN, name: 'English' },
  { code: Language.JP, name: 'Japan' },
]

// `languageTabs` is defined after `formData` so it can react to platform selection
let activeLanguage = ref<Language>(Language.KM)

const handleLanguageChanged = (tab: { value: string; label: string }) => {
  activeLanguage.value = tab.value as Language
  titleError.value = ''
  descriptionError.value = ''
  linkError.value = ''
}

// Flash notification settings - defaults and disabled for first version

const datePlaceholder = ref(getCurrentDatePlaceholder())
const timePlaceholder = ref(getCurrentTimePlaceholder())

// Computed property to provide default value for date picker (today's date)
// This ensures the date picker always shows today when creating a new notification
const scheduleDateDefaultValue = computed(() => {
  if (!isEditMode.value && !isViewMode.value) {
    // For new notifications, always default to today
    const todayDate = getTodayDateString()
    // Convert M/D/YYYY to a Date object for Element Plus
    const [month, day, year] = todayDate.split('/').map(Number)
    // Create date in local timezone (Element Plus will handle timezone conversion)
    const today = new Date(year, month - 1, day)
    return today
  }
  return undefined // For edit/view mode, don't set default value
})

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
  // Use DateUtils.getCurrentDateString() which correctly handles Cambodia timezone
  // This ensures we get today's date in Cambodia timezone, not browser local timezone
  return DateUtils.getCurrentDateString()
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
  scheduleTime: getCurrentTimePlaceholder() as string | null, // Default to current time
  splashEnabled: false,
})

// Recompute languageTabs to hide non-English options when BAKONG_TOURIST is selected
const languageTabs = computed(() => {
  try {
    if (formData.platform === BakongApp.BAKONG_TOURIST) {
      return languages
        .filter((l) => l.code === Language.EN)
        .map((lang) => ({ value: lang.code, label: lang.name }))
    }
  } catch (e) {
    console.error('Error computing languageTabs:', e)
  }
  return languages.map((lang) => ({ value: lang.code, label: lang.name }))
})

// When platform changes to BAKONG_TOURIST, force active language to English
watch(
  () => formData.platform,
  (newPlatform) => {
    if (newPlatform === BakongApp.BAKONG_TOURIST) {
      activeLanguage.value = Language.EN
    }
  },
)

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

// Computed property for schedule time that prevents overwrites during loading
const scheduleTimeModel = computed({
  get: () => {
    // For expired/rejected templates in VIEW mode, preserve original time (read-only)
    // For expired/rejected templates in EDIT mode, allow editing
    if (isTemplateExpired.value && hasLoadedScheduleTime.value && loadedScheduleTime.value && isReadOnly.value) {
      // If formData time doesn't match loaded time, restore it (only in view mode)
      if (formData.scheduleTime !== loadedScheduleTime.value) {
        console.log('🔒 [ScheduleTimeModel] Expired template (view mode) - restoring original time:', {
          formDataTime: formData.scheduleTime,
          originalTime: loadedScheduleTime.value,
        })
        nextTick(() => {
          formData.scheduleTime = loadedScheduleTime.value
        })
        return loadedScheduleTime.value
      }
      return loadedScheduleTime.value
    }
    // During loading, if we have a loaded schedule time, always return it
    if (isLoadingData.value && hasLoadedScheduleTime.value && loadedScheduleTime.value) {
      return loadedScheduleTime.value
    }
    // After loading, if formData doesn't match loaded time and we still have loaded time,
    // it means something changed it incorrectly - restore it once
    // For expired/rejected templates in VIEW mode, restore if it doesn't match
    if (!isLoadingData.value && hasLoadedScheduleTime.value && loadedScheduleTime.value) {
      if (formData.scheduleTime !== loadedScheduleTime.value) {
        // For expired/rejected templates in view mode, restore (but allow editing in edit mode)
        if (isTemplateExpired.value && isReadOnly.value) {
          console.log('🔒 [ScheduleTimeModel] Expired template (view mode) - restoring original time:', {
            formDataTime: formData.scheduleTime,
            originalTime: loadedScheduleTime.value,
          })
          nextTick(() => {
            formData.scheduleTime = loadedScheduleTime.value
          })
          return loadedScheduleTime.value
        }
        // For non-expired templates, only restore if it's the placeholder (current time)
        if (formData.scheduleTime === timePlaceholder.value) {
          // Time was changed to placeholder (current time) - restore loaded time
          console.log('🔒 [ScheduleTimeModel] Detected placeholder time, restoring loaded time:', {
            formDataTime: formData.scheduleTime,
            loadedTime: loadedScheduleTime.value,
            placeholder: timePlaceholder.value,
          })
          // Use nextTick to avoid infinite loop
          nextTick(() => {
            formData.scheduleTime = loadedScheduleTime.value
          })
          return loadedScheduleTime.value
        }
      }
    }
    // Otherwise return the form data value
    return formData.scheduleTime
  },
  set: (value: string | null) => {
    // CRITICAL: For expired/rejected templates in VIEW mode, preserve original time (read-only)
    // But in EDIT mode, allow changes so user can update the schedule
    if (isTemplateExpired.value && hasLoadedScheduleTime.value && loadedScheduleTime.value && isReadOnly.value) {
      if (value !== loadedScheduleTime.value) {
        console.log('🔒 [ScheduleTimeModel] BLOCKED write for expired template (view mode) - preserving original time:', {
          attemptedValue: value,
          preservedValue: loadedScheduleTime.value,
        })
        // Don't update - keep the original time (only in view mode)
        return
      }
    }
    // CRITICAL: Block writes during loading if we have a loaded schedule time
    if (isLoadingData.value && hasLoadedScheduleTime.value && loadedScheduleTime.value) {
      if (value !== loadedScheduleTime.value) {
        console.log('🔒 [ScheduleTimeModel] BLOCKED write during loading:', {
          attemptedValue: value,
          preservedValue: loadedScheduleTime.value,
        })
        // Don't update - keep the loaded time
        return
      }
    }
    // After loading, allow updates but clear hasLoadedScheduleTime if user manually changes it
    // EXCEPT for expired/rejected templates in VIEW mode - preserve original time in view mode only
    if (!isLoadingData.value && hasLoadedScheduleTime.value && loadedScheduleTime.value) {
      if (value !== loadedScheduleTime.value) {
        // For expired/rejected templates in view mode, preserve original time (but allow editing in edit mode)
        if (isTemplateExpired.value && isReadOnly.value) {
          console.log('🔒 [ScheduleTimeModel] BLOCKED change for expired template (view mode) - preserving original time:', {
            attemptedValue: value,
            preservedValue: loadedScheduleTime.value,
          })
          // Don't update - keep the original time (only in view mode)
          return
        }
        // User is manually changing the time - allow it and clear the loaded time flag
        console.log('✅ [ScheduleTimeModel] User manually changed time, clearing loaded time flag', {
          isTemplateExpired: isTemplateExpired.value,
          isReadOnly: isReadOnly.value,
          isEditMode: isEditMode.value,
        })
        hasLoadedScheduleTime.value = false
        loadedScheduleTime.value = null
      }
    }
    // Allow normal updates
    formData.scheduleTime = value
  },
})

// Store template creation date to check if notification is old
const templateCreatedAt = ref<Date | null>(null)
// Store rejection reason for rejected templates
const rejectReasonText = ref<string>('')
// Store expired schedule time for expired templates
const expiredScheduleTime = ref<string | null>(null)
// Store original sendSchedule from template for validation
const originalSendSchedule = ref<string | null>(null)

const loadNotificationData = async () => {
  // Load data for both edit mode and view mode
  if ((!isEditMode.value && !isViewMode.value) || !notificationId.value) return

  isLoadingData.value = true
  hasLoadedScheduleTime.value = false // Reset flag before loading
  loadedScheduleTime.value = null // Reset loaded time before loading
  isTemplateExpired.value = false // Reset expired flag before loading
  originalIsSent.value = null // Reset original isSent before loading
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

    // Store original sendSchedule for validation
    originalSendSchedule.value = template.sendSchedule || null

    // Check if editing a published notification
    // Only restrict fields if explicitly from Published tab (already sent to users)
    // Pending/Scheduled notifications haven't been sent yet, so allow full editing
    isEditingPublished.value = fromTab.value === 'published' && template.isSent === true
    
    // Check if editing from Scheduled tab (approved template with sendSchedule)
    isEditingScheduled.value = fromTab.value === 'scheduled' && template.approvalStatus === 'APPROVED' && template.sendSchedule !== null
    
    // Check if editing a PENDING template
    isEditingPending.value = template.approvalStatus === 'PENDING'
    
    // Check if template is EXPIRED or REJECTED
    // For expired/rejected templates in EDIT mode, allow editing all fields including schedule time
    // For expired/rejected templates in VIEW mode, preserve original scheduled time (read-only)
    isTemplateExpired.value = template.approvalStatus === 'EXPIRED' || template.approvalStatus === 'REJECTED'
    
    // Store rejection reason if template is rejected
    console.log('🔍 [Load Data] Checking rejection reason:', {
      approvalStatus: template.approvalStatus,
      reasonForRejection: template.reasonForRejection,
      hasReason: !!template.reasonForRejection,
      fromTab: fromTab.value,
    })
    if (template.approvalStatus === 'REJECTED') {
      rejectReasonText.value = template.reasonForRejection || ''
      expiredScheduleTime.value = null // Clear expired time for rejected templates
      console.log('✅ [Load Data] Rejection reason loaded:', {
        approvalStatus: template.approvalStatus,
        reasonForRejection: template.reasonForRejection,
        rejectReasonText: rejectReasonText.value,
        fromTab: fromTab.value,
      })
    } else if (template.approvalStatus === 'EXPIRED') {
      // Store expired schedule time for expired templates
      rejectReasonText.value = '' // Clear reject reason for expired templates
      if (template.sendSchedule) {
        try {
          const { date, time } = DateUtils.formatUTCToCambodiaDateTime(template.sendSchedule)
          if (date && time) {
            // Format: "M/D/YYYY at HH:mm"
            expiredScheduleTime.value = `${date} at ${time}`
            console.log('✅ [Load Data] Expired schedule time loaded:', {
              approvalStatus: template.approvalStatus,
              sendSchedule: template.sendSchedule,
              formattedDate: date,
              formattedTime: time,
              expiredScheduleTime: expiredScheduleTime.value,
        fromTab: fromTab.value,
      })
          } else {
            expiredScheduleTime.value = null
          }
        } catch (error) {
          console.error('❌ [Load Data] Error formatting expired schedule time:', error)
          expiredScheduleTime.value = null
        }
      } else {
        expiredScheduleTime.value = null
      }
    } else {
      rejectReasonText.value = ''
      expiredScheduleTime.value = null
      console.log('⚠️ [Load Data] No rejection reason or expired time found:', {
        approvalStatus: template.approvalStatus,
      })
    }
    
    // Store original isSent value to preserve when editing from Scheduled/Published/Pending tabs
    originalIsSent.value = template.isSent ?? null
    
    // For expired/rejected templates, log the behavior
    if (isTemplateExpired.value && template.sendSchedule) {
      if (isReadOnly.value) {
        console.log('🔒 [Load Data] Template is EXPIRED/REJECTED (view mode) - will preserve original scheduled time')
      } else {
        console.log('✅ [Load Data] Template is EXPIRED/REJECTED (edit mode) - allowing all field edits including schedule time')
      }
    }

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

    // Load schedule data - always set scheduleEnabled based on sendSchedule existence
    // This ensures view mode shows the correct toggle state
    if (template.sendSchedule) {
      wasScheduled.value = true
      try {
        const { date, time } = DateUtils.formatUTCToCambodiaDateTime(template.sendSchedule)
        if (date && time) {
          console.log('🔵 [Load Data] BEFORE setting schedule:', {
            originalUTC: template.sendSchedule,
            parsedDate: date,
            parsedTime: time,
            currentFormDataScheduleTime: formData.scheduleTime,
            hasLoadedScheduleTime: hasLoadedScheduleTime.value,
            isLoadingData: isLoadingData.value,
          })
          
          // CRITICAL: Store the loaded time first, then set it
          // This allows us to restore it if something tries to change it during loading
          loadedScheduleTime.value = time
          hasLoadedScheduleTime.value = true
          
          // CRITICAL: Set schedule time BEFORE enabling the toggle
          // This prevents the time picker from initializing with placeholder value
          formData.scheduleDate = date
          formData.scheduleTime = time
          
          console.log('✅ [Load Data] AFTER setting schedule time:', {
            originalUTC: template.sendSchedule,
            parsedDate: date,
            parsedTime: time,
            formDataScheduleDate: formData.scheduleDate,
            formDataScheduleTime: formData.scheduleTime,
            loadedScheduleTime: loadedScheduleTime.value,
            hasLoadedScheduleTime: hasLoadedScheduleTime.value,
            isLoadingData: isLoadingData.value,
          })
          
          // Wait a tick to ensure time is set before enabling toggle
          await nextTick()
          
          // Verify time hasn't changed before enabling toggle
          if (formData.scheduleTime !== loadedScheduleTime.value) {
            console.warn('⚠️ [Load Data] Time changed before enabling toggle, restoring:', {
              current: formData.scheduleTime,
              expected: loadedScheduleTime.value,
            })
            formData.scheduleTime = loadedScheduleTime.value
          }
          
          // NOW enable the toggle - time picker will already have the correct value
          formData.scheduleEnabled = true
          
          console.log('✅ [Load Data] AFTER enabling toggle:', {
            formDataScheduleTime: formData.scheduleTime,
            expectedTime: time,
            loadedScheduleTime: loadedScheduleTime.value,
            timeMatches: formData.scheduleTime === time,
            hasLoadedScheduleTime: hasLoadedScheduleTime.value,
            scheduleEnabled: formData.scheduleEnabled,
          })
          
          // Wait another tick and verify time is still preserved
          await nextTick()
          
          // If time changed, restore it
          if (formData.scheduleTime !== loadedScheduleTime.value && loadedScheduleTime.value) {
            console.warn('⚠️ [Load Data] Time changed after enabling toggle, restoring:', {
              current: formData.scheduleTime,
              expected: loadedScheduleTime.value,
            })
            formData.scheduleTime = loadedScheduleTime.value
          }
          
          console.log('🔍 [Load Data] Final check after toggle enabled:', {
            formDataScheduleTime: formData.scheduleTime,
            expectedTime: time,
            loadedScheduleTime: loadedScheduleTime.value,
            timeMatches: formData.scheduleTime === time,
            hasLoadedScheduleTime: hasLoadedScheduleTime.value,
          })
        }
      } catch (error) {
        console.error('❌ [Load Data] Error parsing schedule date/time:', error)
        hasLoadedScheduleTime.value = false
        loadedScheduleTime.value = null
      }
    } else {
      // Explicitly set to false if no schedule exists
      // This ensures view mode shows correct state (toggle OFF)
      hasLoadedScheduleTime.value = false
      loadedScheduleTime.value = null
      formData.scheduleEnabled = false
      wasScheduled.value = false
      formData.scheduleDate = getTodayDateString()
      formData.scheduleTime = null
      console.log('✅ [Load Data] No schedule - disabled toggle')
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

        // CRITICAL: Store existing image ID FIRST before setting imageUrl
        // This ensures existingImageIds is always set even if imageUrl becomes null later
        existingImageIds[lang] = fileId || null
        originalImageIds[lang] = fileId || null

        // Set current values
        languageFormData[lang].title = title
        languageFormData[lang].description = description
        languageFormData[lang].linkToSeeMore = linkPreview
        languageFormData[lang].imageUrl = fileId ? `/api/v1/image/${fileId}` : null
        languageFormData[lang].imageFile = null

        // Store original values for change detection
        originalLanguageFormData[lang].title = title
        originalLanguageFormData[lang].description = description
        originalLanguageFormData[lang].linkToSeeMore = linkPreview
        originalLanguageFormData[lang].imageUrl = fileId ? `/api/v1/image/${fileId}` : null
        originalLanguageFormData[lang].imageFile = null
        
        console.log('🖼️ [Load Data] Set existing image ID for', lang, ':', existingImageIds[lang])

        // Store translation ID to preserve it during updates
        existingTranslationIds[lang] = t.id || null
      }
    }

    // Wait for Vue to process all reactive changes (like the scheduleEnabled watcher)
    // while isLoadingData is still true, to prevent overwriting with defaults
    await nextTick()
    
    // CRITICAL: Final verification - ensure schedule time is correct before finishing load
    // This catches any last-minute changes from the time picker
    if (hasLoadedScheduleTime.value && loadedScheduleTime.value && formData.scheduleTime !== loadedScheduleTime.value) {
      console.log('🔒 [Load Data] Final restoration - Time incorrect before finishing load:', {
        current: formData.scheduleTime,
        expected: loadedScheduleTime.value,
      })
      formData.scheduleTime = loadedScheduleTime.value
      // Wait one more tick to ensure it's set
      await nextTick()
    }
  } catch (error) {
    console.error('Error loading notification data:', error)
    ElNotification({
      title: 'Error',
      message: 'Failed to load notification data',
      type: 'error',
      duration: 2000,
    })
  } finally {
    // CRITICAL: For expired/rejected templates in VIEW mode, ensure time is preserved one final time after loading
    // In EDIT mode, allow user to change the time
    if (isTemplateExpired.value && hasLoadedScheduleTime.value && loadedScheduleTime.value && isReadOnly.value) {
      if (formData.scheduleTime !== loadedScheduleTime.value) {
        console.log('🔒 [Load Data] Final preservation for expired template (view mode):', {
          current: formData.scheduleTime,
          original: loadedScheduleTime.value,
        })
        formData.scheduleTime = loadedScheduleTime.value
        await nextTick()
      }
      // For expired/rejected templates in view mode, keep hasLoadedScheduleTime to preserve original time
      console.log('🔒 [Load Data] Expired template (view mode) - keeping hasLoadedScheduleTime=true to preserve original time')
    } else if (isTemplateExpired.value && hasLoadedScheduleTime.value && loadedScheduleTime.value && !isReadOnly.value) {
      // In edit mode, allow user to change the time - clear the preservation flag after loading completes
      // This allows the initial load to show the correct time, but then allows free editing
      console.log('✅ [Load Data] Expired template (edit mode) - will allow time editing after load completes')
      // Use nextTick to clear after Vue has processed all reactive updates
      nextTick(() => {
        setTimeout(() => {
          console.log('✅ [Load Data] Expired template (edit mode) - clearing preservation flag to allow editing')
          hasLoadedScheduleTime.value = false
          loadedScheduleTime.value = null
        }, 200) // Small delay to ensure time picker has initialized with correct value
      })
    }
    
    // Only set isLoadingData to false after we're absolutely sure the time is correct
    isLoadingData.value = false
    console.log('✅ [Load Data] Loading complete, isLoadingData set to false', {
      isTemplateExpired: isTemplateExpired.value,
      hasLoadedScheduleTime: hasLoadedScheduleTime.value,
      loadedScheduleTime: loadedScheduleTime.value,
      formDataScheduleTime: formData.scheduleTime,
      isReadOnly: isReadOnly.value,
      isEditMode: isEditMode.value,
    })
  }
}

onMounted(async () => {
  datePlaceholder.value = getCurrentDatePlaceholder()
  timePlaceholder.value = getCurrentTimePlaceholder()

  // For new notifications (not editing), always set default date and time to today/current time
  if (!isEditMode.value && !isViewMode.value) {
    // Force set to today's date and current time
    const todayDate = getTodayDateString()
    const currentTime = getCurrentTimePlaceholder()
    // Always ensure date is today for new notifications
    // Use nextTick to ensure it's set after the component has fully rendered
    await nextTick()
    formData.scheduleDate = todayDate
    formData.scheduleTime = currentTime
    console.log('✅ [Mount] Set default date and time for new notification:', {
      date: todayDate,
      time: currentTime,
      scheduleEnabled: formData.scheduleEnabled,
      scheduleDate: formData.scheduleDate,
    })
    
    // Double-check after nextTick to ensure date is still today
    await nextTick()
    if (formData.scheduleDate !== todayDate) {
      console.log('⚠️ [Mount] Date was changed, correcting back to today:', {
        expected: todayDate,
        actual: formData.scheduleDate,
      })
      formData.scheduleDate = todayDate
    }
    
    // If schedule is already enabled, ensure date is still today (in case it was changed)
    if (formData.scheduleEnabled) {
      await nextTick()
      if (formData.scheduleDate !== todayDate) {
        formData.scheduleDate = todayDate
        console.log('✅ [Mount] Corrected schedule date to today:', todayDate)
      }
    }
  }

  // Load notification data for both edit mode and view mode
  if (isEditMode.value || isViewMode.value) {
    await loadNotificationData()
  }
})

const showConfirmationDialog = ref(false)
const showLeaveDialog = ref(false)
const showUpdateConfirmationDialog = ref(false)
const showRejectDialog = ref(false)
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

// Watch scheduleTime to track when it changes and restore if needed during loading
watch(
  () => formData.scheduleTime,
  (newTime, oldTime) => {
    console.log('🟡 [ScheduleTime Watcher] Time changed:', {
      oldTime,
      newTime,
      hasLoadedScheduleTime: hasLoadedScheduleTime.value,
      isLoadingData: isLoadingData.value,
      scheduleEnabled: formData.scheduleEnabled,
      loadedScheduleTime: loadedScheduleTime.value,
      isTemplateExpired: isTemplateExpired.value,
      isReadOnly: isReadOnly.value,
    })
    
    // CRITICAL: For expired/rejected templates in VIEW mode, restore original time if it changes
    // But in EDIT mode, allow changes so user can update the schedule
    if (isTemplateExpired.value && hasLoadedScheduleTime.value && loadedScheduleTime.value && isReadOnly.value) {
      if (newTime !== loadedScheduleTime.value) {
        console.log('🔒 [ScheduleTime Watcher] RESTORING - Expired template (view mode) time changed, restoring to original:', {
          attemptedTime: newTime,
          restoredTime: loadedScheduleTime.value,
        })
        // Use nextTick to avoid infinite loop
        nextTick(() => {
          formData.scheduleTime = loadedScheduleTime.value
        })
        return
      }
    }
    
    // CRITICAL: If we're loading and have a loaded schedule time, restore it immediately if it changed
    if (isLoadingData.value && hasLoadedScheduleTime.value && loadedScheduleTime.value) {
      if (newTime !== loadedScheduleTime.value) {
        console.log('🔒 [ScheduleTime Watcher] RESTORING - Time changed during load, restoring to loaded time:', {
          attemptedTime: newTime,
          restoredTime: loadedScheduleTime.value,
        })
        // Use nextTick to avoid infinite loop
        nextTick(() => {
          formData.scheduleTime = loadedScheduleTime.value
        })
      }
    }
  },
)

// Watch scheduleEnabled to auto-set date and time when enabled
watch(
  () => formData.scheduleEnabled,
  (isEnabled, wasEnabled) => {
    console.log('🔵 [Schedule Toggle Watcher] FIRED:', {
      isEnabled,
      wasEnabled,
      currentScheduleTime: formData.scheduleTime,
      currentScheduleDate: formData.scheduleDate,
      hasLoadedScheduleTime: hasLoadedScheduleTime.value,
      isLoadingData: isLoadingData.value,
      isEditMode: isEditMode.value,
    })
    
    // CRITICAL: NEVER overwrite schedule time that was loaded from template
    // If hasLoadedScheduleTime is true, always preserve the existing time
    if (hasLoadedScheduleTime.value && formData.scheduleTime) {
      console.log('🔒 [Schedule Toggle] BLOCKED - Preserving loaded schedule time:', {
        scheduleDate: formData.scheduleDate,
        scheduleTime: formData.scheduleTime,
        wasEnabled,
        isLoadingData: isLoadingData.value,
        hasLoadedScheduleTime: hasLoadedScheduleTime.value,
      })
      return // Always preserve loaded schedule time, never overwrite
    }
    
    // For new notifications (not editing), always ensure date is set to today when schedule is enabled
    if (isEnabled && !isLoadingData.value && !hasLoadedScheduleTime.value && !isEditMode.value) {
      // Always set to today's date for new notifications when schedule is enabled
      const todayDate = getTodayDateString()
      const currentTime = getCurrentTimePlaceholder()
      
      // Force set to today, even if date was already set (to ensure it's always today for new notifications)
      // Use nextTick to ensure it's set after the component has rendered
      nextTick(() => {
        if (formData.scheduleDate !== todayDate) {
          formData.scheduleDate = todayDate
          console.log('✅ [Schedule Toggle] Corrected date to today for new notification:', {
            oldDate: formData.scheduleDate,
            newDate: todayDate,
          })
        } else {
          // Even if it's already today, ensure it's explicitly set to refresh the date picker
          formData.scheduleDate = todayDate
        }
        if (!formData.scheduleTime || formData.scheduleTime === '') {
          formData.scheduleTime = currentTime
        }
        console.log('✅ [Schedule Toggle] New notification - Set date to today:', {
          date: formData.scheduleDate,
          time: formData.scheduleTime,
          wasEnabled,
        })
      })
    } else if (isEnabled && !isLoadingData.value && wasEnabled === false && !hasLoadedScheduleTime.value && isEditMode.value) {
      // For editing mode, only set date/time if they're not already set
      if (!formData.scheduleDate || formData.scheduleDate === '') {
      formData.scheduleDate = getTodayDateString()
      }
      if (!formData.scheduleTime || formData.scheduleTime === '') {
      formData.scheduleTime = getCurrentTimePlaceholder()
      }
    } else if (!isEnabled) {
      // When schedule is turned OFF, clear time but keep date for next time
      // Reset the flag when disabling
      if (hasLoadedScheduleTime.value) {
        hasLoadedScheduleTime.value = false
      }
      formData.scheduleTime = null
      console.log('✅ [Schedule Toggle] Disabled - Cleared time')
    } else if (isEnabled && formData.scheduleTime) {
      // Schedule is enabled and already has a time - preserve it
      console.log('✅ [Schedule Toggle] Preserving existing schedule time:', {
        scheduleDate: formData.scheduleDate,
        scheduleTime: formData.scheduleTime,
        wasEnabled,
        isLoadingData: isLoadingData.value,
        hasLoadedScheduleTime: hasLoadedScheduleTime.value,
      })
    } else {
      console.log('⚠️ [Schedule Toggle] No action taken:', {
        isEnabled,
        wasEnabled,
        hasScheduleTime: !!formData.scheduleTime,
        hasLoadedScheduleTime: hasLoadedScheduleTime.value,
        isLoadingData: isLoadingData.value,
      })
    }
  },
)

// Watch scheduleDate to ensure it's always today for new notifications when schedule is enabled
watch(
  () => formData.scheduleDate,
  (newDate, oldDate) => {
    // Only enforce for new notifications (not editing) when schedule is enabled
    if (!isEditMode.value && !isViewMode.value && formData.scheduleEnabled && !hasLoadedScheduleTime.value && !isLoadingData.value) {
      const todayDate = getTodayDateString()
      // If the date is not today, correct it to today
      if (newDate && newDate !== todayDate) {
        console.log('⚠️ [Schedule Date Watcher] Date changed from today, correcting:', {
          oldDate,
          newDate,
          todayDate,
          isEditMode: isEditMode.value,
          isViewMode: isViewMode.value,
          scheduleEnabled: formData.scheduleEnabled,
          hasLoadedScheduleTime: hasLoadedScheduleTime.value,
          isLoadingData: isLoadingData.value,
        })
        // Use nextTick to avoid infinite loop
        nextTick(() => {
          formData.scheduleDate = todayDate
          console.log('✅ [Schedule Date Watcher] Corrected date to today:', todayDate)
        })
      }
    }
  },
  { immediate: false },
)

// Handler for date picker change event
const handleDatePickerChange = (val: string | null) => {
  // For new notifications, ensure date is always today
  if (!isEditMode.value && !isViewMode.value && formData.scheduleEnabled) {
    const todayDate = getTodayDateString()
    if (val && val !== todayDate) {
      console.log('⚠️ [Date Picker Change] Date changed from today, correcting:', {
        selected: val,
        today: todayDate,
      })
      // Use nextTick to avoid infinite loop
      nextTick(() => {
        formData.scheduleDate = todayDate
        console.log('✅ [Date Picker Change] Corrected date to today:', todayDate)
      })
      return
    }
  }
  formData.scheduleDate = val ?? ''
  console.log('Date changed:', val)
}

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
  // CRITICAL: Set saving flag IMMEDIATELY to prevent navigation guard from showing dialog
  // This must be set before any validation or API calls
  isSavingOrPublishing.value = true
  
  // ========== EXPIRED TEMPLATE VALIDATION - MUST RUN FIRST ==========
  // Check if template is expired or if current schedule time is in the past
  // This prevents submission of expired templates
  // Run this check for ALL submissions BEFORE any other logic
  console.log('🔍 [Expired Check] Validating schedule time before submission:', {
    scheduleEnabled: formData.scheduleEnabled,
    scheduleDate: formData.scheduleDate,
    scheduleTime: formData.scheduleTime,
    isEditMode: isEditMode.value,
    notificationId: notificationId.value,
    expiredScheduleTime: expiredScheduleTime.value,
    isTemplateExpired: isTemplateExpired.value,
    originalSendSchedule: originalSendSchedule.value,
  })

  // CRITICAL: Check if schedule time is actually in the past (not just if template is rejected)
  // Only block if the schedule time is actually in the past, not just because template is rejected
  if (isEditMode.value && formData.scheduleEnabled && formData.scheduleDate && formData.scheduleTime) {
    const dateStr = String(formData.scheduleDate).trim()
    const timeStr = String(formData.scheduleTime).trim()
    const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/
    const timePattern = /^\d{2}:\d{2}$/
    
    if (datePattern.test(dateStr) && timePattern.test(timeStr)) {
      try {
        const currentScheduleDateTime = DateUtils.parseScheduleDateTime(dateStr, timeStr)
        const nowUTC = new Date()
        // Check if current schedule time is in the past
        if (currentScheduleDateTime.getTime() <= nowUTC.getTime()) {
          const scheduleTimeDisplay = expiredScheduleTime.value || `${dateStr} at ${timeStr}`
          console.error('❌ [Expired Check] BLOCKED - Schedule time is in the past:', {
            currentScheduleDateTime: currentScheduleDateTime.toISOString(),
            nowUTC: nowUTC.toISOString(),
            scheduleTimeDisplay,
          })
          ElNotification({
            title: 'Warning',
            message: `The scheduled time was set to <strong>${scheduleTimeDisplay}</strong>, and it has now passed. Please go to update the schedule time and resubmitting again.`,
            type: 'warning',
            duration: 5000,
            dangerouslyUseHTMLString: true,
          })
          isSavingOrPublishing.value = false
          return
        }
      } catch (error) {
        console.error('❌ [Expired Check] Error parsing schedule time:', error)
      }
    }
  }

  // Check if we have an original sendSchedule that's in the past (works even if scheduleEnabled is false)
  if (isEditMode.value && originalSendSchedule.value) {
    try {
      const originalScheduleDate = new Date(originalSendSchedule.value)
      const nowUTC = new Date()
      if (originalScheduleDate.getTime() <= nowUTC.getTime()) {
        // Original schedule is in the past - check if user has updated it
        // If schedule is enabled, check if formData date/time is still in the past
        if (formData.scheduleEnabled && formData.scheduleDate && formData.scheduleTime) {
          const dateStr = String(formData.scheduleDate).trim()
          const timeStr = String(formData.scheduleTime).trim()
          const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/
          const timePattern = /^\d{2}:\d{2}$/
          
          if (datePattern.test(dateStr) && timePattern.test(timeStr)) {
            try {
              const currentScheduleDateTime = DateUtils.parseScheduleDateTime(dateStr, timeStr)
              // Check if current schedule time is still in the past
              if (currentScheduleDateTime.getTime() <= nowUTC.getTime()) {
                const scheduleTimeDisplay = expiredScheduleTime.value || `${dateStr} at ${timeStr}`
                console.error('❌ [Expired Check] BLOCKED - Schedule time is still in the past (fallback check):', {
                  originalSendSchedule: originalSendSchedule.value,
                  currentScheduleDateTime: currentScheduleDateTime.toISOString(),
                  nowUTC: nowUTC.toISOString(),
                  scheduleTimeDisplay,
                })
                ElNotification({
                  title: 'Warning',
                  message: `The scheduled time was set to <strong>${scheduleTimeDisplay}</strong>, and it has now passed. Please go to update the schedule time and resubmitting again.`,
                  type: 'warning',
                  duration: 5000,
                  dangerouslyUseHTMLString: true,
                })
                isSavingOrPublishing.value = false
                return
              }
            } catch (error) {
              // If parsing fails, continue with normal validation
              console.warn('⚠️ [Expired Check] Could not parse current schedule, continuing with normal validation:', error)
            }
          }
        } else if (!formData.scheduleEnabled) {
          // Schedule is disabled BUT original sendSchedule is in the past - block submission
          // User must update the schedule time before resubmitting
          const scheduleTimeDisplay = expiredScheduleTime.value || DateUtils.formatUTCToCambodiaDateTime(originalSendSchedule.value).time
          console.error('❌ [Expired Check] BLOCKED - Original schedule is expired and schedule is disabled:', {
            originalSendSchedule: originalSendSchedule.value,
            scheduleEnabled: formData.scheduleEnabled,
            scheduleTimeDisplay,
          })
          ElNotification({
            title: 'Warning',
            message: `The scheduled time was set to <strong>${scheduleTimeDisplay}</strong>, and it has now passed. Please go to update the schedule time and resubmitting again.`,
            type: 'warning',
            duration: 5000,
            dangerouslyUseHTMLString: true,
          })
          isSavingOrPublishing.value = false
          return
        }
      }
    } catch (error) {
      console.warn('⚠️ [Expired Check] Could not parse original sendSchedule, continuing with normal validation:', error)
    }
  }

  // Primary validation: Check if schedule is enabled and time is in the past
  if (formData.scheduleEnabled) {
    // Schedule is enabled - must check if time is in the past
    if (formData.scheduleDate && formData.scheduleTime) {
      const dateStr = String(formData.scheduleDate).trim()
      const timeStr = String(formData.scheduleTime).trim()
      const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/
      const timePattern = /^\d{2}:\d{2}$/

      console.log('🔍 [Expired Check] Validating date/time format:', {
        dateStr,
        timeStr,
        dateMatches: datePattern.test(dateStr),
        timeMatches: timePattern.test(timeStr),
      })

      if (datePattern.test(dateStr) && timePattern.test(timeStr)) {
        try {
          const scheduleDateTime = DateUtils.parseScheduleDateTime(dateStr, timeStr)
          const nowUTC = new Date()
          const diffMs = scheduleDateTime.getTime() - nowUTC.getTime()

          console.log('🔍 [Expired Check] Schedule time comparison:', {
            scheduleDateTime: scheduleDateTime.toISOString(),
            nowUTC: nowUTC.toISOString(),
            diffMs,
            isPast: diffMs <= 0,
          })

          if (diffMs <= 0) {
            // Schedule time is in the past - show error message and prevent submission
            const scheduleTimeDisplay = expiredScheduleTime.value || `${dateStr} at ${timeStr}`
            console.error('❌ [Expired Check] BLOCKED - Schedule time is in the past:', {
              scheduleTimeDisplay,
              scheduleDateTime: scheduleDateTime.toISOString(),
              nowUTC: nowUTC.toISOString(),
            })
            ElNotification({
              title: 'Warning',
              message: `The scheduled time was set to <strong>${scheduleTimeDisplay}</strong>, and it has now passed. Please go to update the schedule time and resubmitting again.`,
              type: 'warning',
              duration: 5000,
              dangerouslyUseHTMLString: true,
            })
            isSavingOrPublishing.value = false // Reset flag on expired check failure
            return
          }
          // Schedule time is in the future - allow submission to proceed
          console.log('✅ [Expired Check] Schedule time is valid (in the future)')
        } catch (error) {
          console.error('❌ [Expired Template Check] Error parsing schedule:', error)
          isSavingOrPublishing.value = false // Reset flag on parsing error
          ElNotification({
            title: 'Error',
            message: 'Invalid date or time format. Please check your schedule time.',
            type: 'error',
            duration: 3000,
            dangerouslyUseHTMLString: true,
          })
          return
        }
      } else {
        // Schedule is enabled but date/time format is invalid
        console.error('❌ [Expired Check] Invalid date/time format:', { dateStr, timeStr })
        ElNotification({
          title: 'Error',
          message: 'Please select both Date and Time for scheduling',
          type: 'error',
          duration: 3000,
          dangerouslyUseHTMLString: true,
        })
        return
      }
    } else {
      // Schedule is enabled but date or time is missing
      console.error('❌ [Expired Check] Schedule enabled but date/time missing:', {
        scheduleDate: formData.scheduleDate,
        scheduleTime: formData.scheduleTime,
      })
      ElNotification({
        title: 'Error',
        message: 'Please select both Date and Time for scheduling',
        type: 'error',
        duration: 3000,
        dangerouslyUseHTMLString: true,
      })
      isSavingOrPublishing.value = false
      return
    }
  } else {
    // Schedule is disabled (SEND_NOW) - but we already checked for expired status above
    // If we reach here, it means:
    // 1. Template is not expired (isTemplateExpired is false)
    // 2. Original sendSchedule is either null or in the future
    // 3. Schedule is disabled (SEND_NOW) - this is valid
    console.log('✅ [Expired Check] Schedule is disabled (SEND_NOW) - allowing submission (template is not expired)')
  }
  // ========== END EXPIRED TEMPLATE VALIDATION ==========

  // Check if current language tab has existing data
  const currentLangHasExistingData =
    isEditMode.value && existingTranslationIds[activeLanguage.value] !== null

  // Check if user has entered any data for current language
  const currentLangHasUserInput = !!(
    currentTitle.value?.trim() ||
    currentDescription.value?.trim() ||
    currentImageFile.value
  )

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
        const titleChanged =
          (currentData?.title?.trim() || '') !== (originalData?.title?.trim() || '')
        const descriptionChanged =
          (currentData?.description?.trim() || '') !== (originalData?.description?.trim() || '')
        const linkChanged =
          (currentData?.linkToSeeMore?.trim() || '') !== (originalData?.linkToSeeMore?.trim() || '')
        const imageChanged =
          currentData?.imageFile !== null || existingImageIds[langKey] !== originalImageIds[langKey]

        if (titleChanged || descriptionChanged || linkChanged || imageChanged) {
          hasAnyChanges = true
          break // Found at least one change, no need to check further
        }
      }
    }

    if (!hasAnyChanges) {
      // No changes at all - just navigate to home without updating or showing notification
      const redirectTab = fromTab.value || 'published'
      isSavingOrPublishing.value = false // Reset flag before navigation
      setTimeout(() => {
        window.location.href = `/?tab=${redirectTab}`
      }, 100)
      return
    }

    // There are changes in other languages - proceed with update
    const token = localStorage.getItem('auth_token')
    if (!token || token.trim() === '') {
      isSavingOrPublishing.value = false // Reset flag before navigation
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
    const descriptionChanged =
      (currentDescription.value?.trim() || '') !== (originalData?.description?.trim() || '')
    const linkChanged =
      (currentLinkToSeeMore.value?.trim() || '') !== (originalData?.linkToSeeMore?.trim() || '')
    const imageChanged =
      currentImageFile.value !== null ||
      existingImageIds[currentLang] !== originalImageIds[currentLang]

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
      isSavingOrPublishing.value = false // Reset flag on validation error
      return
    }
  } else {
    // Has changes (including deletions or global fields) - clear validation errors and proceed
    titleError.value = ''
    descriptionError.value = ''
  }

  const token = localStorage.getItem('auth_token')
  if (!token || token.trim() === '') {
    isSavingOrPublishing.value = false // Reset flag before navigation
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
        const titleChanged =
          (currentData?.title?.trim() || '') !== (originalData?.title?.trim() || '')
        const descriptionChanged =
          (currentData?.description?.trim() || '') !== (originalData?.description?.trim() || '')
        const linkChanged =
          (currentData?.linkToSeeMore?.trim() || '') !== (originalData?.linkToSeeMore?.trim() || '')
        const imageChanged =
          currentData?.imageFile !== null || existingImageIds[langKey] !== originalImageIds[langKey]

        if (titleChanged || descriptionChanged || linkChanged || imageChanged) {
          hasAnyChanges = true
          break // Found at least one change, no need to check further
        }
      }
    }

    // Only show confirmation if there are actual changes
    if (hasAnyChanges) {
      // Note: Don't reset flag here - we want to prevent navigation guard while showing dialog
      // The flag will be reset when user confirms or cancels the dialog
      showUpdateConfirmationDialog.value = true
      return
    } else {
      // No changes at all - just navigate to home without updating or showing notification
      const redirectTab = fromTab.value || 'published'
      isSavingOrPublishing.value = false // Reset flag before navigation
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
    title: isEditMode.value ? 'Sending Notification' : 'Sending Notification',
    message: isEditMode.value
      ? 'Please wait while we send the notification to <strong>all users</strong>. This may take a moment to complete.'
      : 'Please wait while we send the notification to <strong>all users</strong>. This may take a moment to complete.',
    type: 'info',
    duration: 0,
    dangerouslyUseHTMLString: true,
  })

  // Wait for Vue to update reactive values (especially from Element Plus pickers)
  await nextTick()

  // Declare redirectTab outside try block so it's accessible in catch and after try-catch
  let redirectTab = 'published'

  try {
    // For EDITOR and ADMIN roles, submissions need approval first (not sent immediately)
    const isEditor = authStore.user?.role === (UserRole.EDITOR as any)
    const isAdmin = authStore.user?.role === (UserRole.ADMINISTRATOR as any)
    const needsApproval = isEditor || isAdmin // Both Editor and Admin need approval
    let sendType = SendType.SEND_NOW
    // When clicking "Submit now", it's a submission that needs approval
    // So isSent should be true to trigger backend to set approvalStatus = PENDING
    // Use undefined to preserve existing value when editing from Scheduled/Published/Pending tabs
    let isSent: boolean | undefined = true

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
      // Check if editing from Scheduled/Published/Pending tabs - preserve status and stay in same tab
      const isEditingFromScheduled = fromTab.value === 'scheduled'
      const isEditingFromPublished = fromTab.value === 'published'
      const isEditingFromPending = fromTab.value === 'pending'
      
      // If editing from Scheduled/Published/Pending tabs, preserve status and redirect to same tab
      if (isEditingFromScheduled || isEditingFromPublished || isEditingFromPending) {
        console.log(`🔄 [Submit] Editing from ${fromTab.value} tab - preserving status and staying in same tab`)
        
        if (isEditingFromScheduled) {
          // Editing from Scheduled tab - preserve scheduled status
          if (formData.scheduleEnabled) {
            const isValid = await validateSchedule()
            if (!isValid) {
              loadingNotification.close()
              isSavingOrPublishing.value = false
              return
            }
            sendType = SendType.SEND_SCHEDULE
            // Preserve existing isSent value from original template
            isSent = originalIsSent.value ?? false
            redirectTab = 'scheduled'
          } else {
            // User disabled schedule - convert to SEND_NOW but stay in scheduled tab
        sendType = SendType.SEND_NOW
        isSent = true
            redirectTab = 'scheduled'
          }
        } else if (isEditingFromPublished) {
          // Editing from Published tab - preserve published status
          sendType = SendType.SEND_NOW
          isSent = true // Keep as sent
        redirectTab = 'published'
        // Clear schedule fields to prevent any scheduling
        formData.scheduleEnabled = false
        formData.scheduleDate = ''
        formData.scheduleTime = ''
        } else if (isEditingFromPending) {
          // Editing from Pending Approval tab - preserve pending status
          if (formData.scheduleEnabled) {
            const isValid = await validateSchedule()
            if (!isValid) {
              loadingNotification.close()
              isSavingOrPublishing.value = false
              return
            }
            sendType = SendType.SEND_SCHEDULE
            // Preserve PENDING status - keep isSent as it was (likely true for pending)
            isSent = originalIsSent.value ?? true
            redirectTab = 'pending'
      } else {
            sendType = SendType.SEND_NOW
            // Preserve PENDING status - keep isSent as it was (likely true for pending)
            isSent = originalIsSent.value ?? true
            redirectTab = 'pending'
          }
        }
      }
      // For expired/rejected templates from Draft tab, treat them like normal draft templates
      // They should follow the same submission flow as creating new notifications
      else if (isTemplateExpired.value) {
        console.log('🔄 [Submit] Template is expired/rejected from Draft - following normal submission flow')
        // For expired templates, follow normal flow (same as creating new notification)
        if (formData.scheduleEnabled) {
          // Perform schedule validation
          const isValid = await validateSchedule()
          if (!isValid) {
            loadingNotification.close()
            isSavingOrPublishing.value = false
            return
          }
          sendType = SendType.SEND_SCHEDULE
          // For Editor and Admin, scheduled submissions need approval first
          const needsApprovalForEdit = isEditor || isAdmin
          isSent = needsApprovalForEdit ? true : false
          redirectTab = needsApprovalForEdit ? 'pending' : 'scheduled'
        } else {
          // User disabled schedule or no schedule - Submit Now
          sendType = SendType.SEND_NOW
          // EDITOR and ADMIN submissions need approval first (not sent immediately)
          isSent = true
          redirectTab = needsApproval ? 'pending' : 'published'
        }
      } else {
        // Editing draft notification (not expired/rejected)
        if (formData.scheduleEnabled) {
          // Perform schedule validation even in edit mode!
          const isValid = await validateSchedule()
          if (!isValid) {
            loadingNotification.close()
            isSavingOrPublishing.value = false
            return
          }

          sendType = SendType.SEND_SCHEDULE
          // For Editor and Admin, scheduled submissions need approval first
          // Set isSent = true so backend sets approvalStatus = PENDING (goes to Pending Approval tab)
          // After approval, scheduler will handle sending at scheduled time
          const needsApprovalForEdit = isEditor || isAdmin
          isSent = needsApprovalForEdit ? true : false
          redirectTab = needsApprovalForEdit ? 'pending' : 'scheduled'
        } else {
          // User disabled schedule or no schedule
          sendType = SendType.SEND_NOW
          // EDITOR and ADMIN submissions need approval first (not sent immediately)
            // When submitting (not saving as draft), isSent should be true
            isSent = true
          redirectTab = needsApproval ? 'pending' : 'published'
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
        // For Editor and Admin, scheduled submissions need approval first
        // Set isSent = true so backend sets approvalStatus = PENDING (goes to Pending Approval tab)
        // After approval, scheduler will handle sending at scheduled time
        isSent = needsApproval ? true : false
        redirectTab = needsApproval ? 'pending' : 'scheduled'
      } else {
        // For non-scheduled new notifications, EDITOR and ADMIN go to pending (needs approval)
        // When clicking "Submit now", it's a submission that needs approval
        isSent = true
        redirectTab = needsApproval ? 'pending' : 'published'
      }
    }
    const imagesToUpload: { file: File; language: string }[] = []
    const translations = []

    for (const [langKey, langData] of Object.entries(languageFormData)) {
      // If Bakong Tourist platform is selected, only include English translations
      try {
        if (formData.platform === BakongApp.BAKONG_TOURIST && langKey !== Language.EN) {
          continue
        }
      } catch (e) {
        // ignore and proceed normally
      }
      // For edit mode, include ALL translations (even if title/description are empty) to preserve data
      // For create mode, only include translations with both title and description
      const shouldInclude = isEditMode.value
        ? (langData.title || langData.description || existingTranslationIds[langKey]) // Include if has content OR existing translation
        : (langData.title && langData.description) // Create mode: require both

      if (shouldInclude) {
        if (langData.linkToSeeMore && !isValidUrl(langData.linkToSeeMore)) {
          ElNotification({
            title: 'Error',
            message: `Please enter a valid URL for <strong>Link to see more</strong> in ${langKey} with correct format <strong>(e.g., https://example.com)</strong>`,
            type: 'error',
            duration: 2000,
            dangerouslyUseHTMLString: true,
          })
          loadingNotification.close()
          isSavingOrPublishing.value = false
          return
        }
        let imageId: string | undefined = undefined
        
        // Priority 1: New image file to upload
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
        } 
        // Priority 2: Preserve existing image (CRITICAL for edit mode)
        // Always preserve if existingImageIds exists, regardless of imageUrl state
        else if (isEditMode.value && existingImageIds[langKey]) {
          imageId = existingImageIds[langKey] || undefined
          console.log('🖼️ [Update] Preserving existing image for', langKey, ':', imageId)
        }

        const translationData: any = {
          language: mapLanguageToEnum(langKey),
          title: langData.title || '', // Always include title (empty string if missing)
          content: langData.description || '', // Always include content (empty string if missing)
          linkPreview: langData.linkToSeeMore || undefined,
          image: imageId || '', // Include imageId if exists, otherwise empty string
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
    // Update translations with newly uploaded image IDs
    for (const [index, trans] of translations.entries()) {
      const fid = langToFileId.get(String(trans.language))
      if (fid) {
        translations[index].image = fid
        // Also update existingImageIds to preserve it for future updates
        const langKey = Object.keys(languageFormData).find(
          (key) => mapLanguageToEnum(key) === trans.language
        )
        if (langKey) {
          existingImageIds[langKey] = fid
        }
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
      isSent: isSent, // Always include isSent (use original value when preserving status)
      translations: translations,
      notificationType: mapTypeToNotificationType(formData.notificationType),
      categoryTypeId: formData.categoryTypeId ?? undefined,
      priority: 1,
    }

    // Handle schedule: explicitly set or clear based on scheduleEnabled
    // This ensures updates work correctly when toggling schedule on/off
    if (formData.scheduleEnabled && !(isEditMode.value && isEditingPublished.value)) {
      // Schedule is enabled - set the new schedule time
      const dateStr = String(formData.scheduleDate)
      const timeStr = String(formData.scheduleTime)
      
      console.log('🔍 [Submit] BEFORE UPDATE - Schedule Data:', {
        scheduleEnabled: formData.scheduleEnabled,
        formDataScheduleDate: formData.scheduleDate,
        formDataScheduleTime: formData.scheduleTime,
        dateStr,
        timeStr,
        isEditMode: isEditMode.value,
        templateId: notificationId.value,
        hasLoadedScheduleTime: hasLoadedScheduleTime.value,
        isLoadingData: isLoadingData.value,
      })
      
      const scheduleDateTime = DateUtils.parseScheduleDateTime(dateStr, timeStr)
      const utcISOString = scheduleDateTime.toISOString()
      templateData.sendSchedule = utcISOString
      
      const { date: cambodiaDate, time: cambodiaTime } = DateUtils.formatUTCToCambodiaDateTime(utcISOString)
      
      console.log('✅ [Submit] AFTER PARSING - Schedule Conversion:', {
        inputDate: dateStr,
        inputTime: timeStr,
        parsedDateTime: scheduleDateTime,
        utcISOString: utcISOString,
        cambodiaDate,
        cambodiaTime,
        willSendToBackend: templateData.sendSchedule,
        originalFormDataTime: formData.scheduleTime,
        timeMatches: timeStr === formData.scheduleTime,
      })
    } else {
      // Schedule is disabled OR editing published notification - explicitly clear it
      // This ensures old schedule times are removed when user turns schedule OFF
      // Send null explicitly so backend processes it (undefined is ignored by backend)
      ;(templateData as any).sendSchedule = null
      console.log('✅ [Submit] Clearing schedule (disabled or published):', {
        scheduleEnabled: formData.scheduleEnabled,
        isEditMode: isEditMode.value,
        isEditingPublished: isEditingPublished.value,
        willSendNull: true,
      })
    }

    console.log('📤 [Submit] Sending to backend:', {
      isEditMode: isEditMode.value,
      templateId: isEditMode.value ? notificationId.value : 'NEW',
      templateData: {
        ...templateData,
        sendSchedule: templateData.sendSchedule,
        sendType: templateData.sendType,
        isSent: templateData.isSent,
      },
    })

    let result
    try {
      // Final frontend-only validation: ensure any provided linkPreview values are valid URLs
      for (const t of (templateData.translations || [])) {
        if (t.linkPreview && !isValidUrl(String(t.linkPreview))) {
          ElNotification({
            title: 'Error',
            message: 'Please enter a valid URL starting with http:// or https://',
            type: 'error',
            duration: 2000,
          })
          if (loadingNotification) loadingNotification.close()
          isSavingOrPublishing.value = false
          return
        }
      }

    if (isEditMode.value) {
      result = await notificationApi.updateTemplate(parseInt(notificationId.value), templateData)
    } else {
      result = await notificationApi.createTemplate(templateData)
    }

    console.log('📥 [Submit] Backend Response:', {
      responseCode: result?.data?.responseCode,
      responseMessage: result?.data?.responseMessage,
      returnedSendSchedule: result?.data?.data?.sendSchedule,
      returnedSendType: result?.data?.data?.sendType,
      returnedIsSent: result?.data?.data?.isSent,
      fullResponse: result?.data?.data,
    })
    } catch (error: any) {
    loadingNotification.close()
      console.log('❌ [Submit] Error caught:', {
        error: error,
        response: error.response,
        responseData: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      })

      const isNoUsersError =
        error.response?.data?.errorCode === ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM ||
        error.response?.data?.responseMessage?.includes('No users found for') ||
        error.response?.data?.responseMessage?.includes('No users match')

      if (isNoUsersError) {
        console.warn('⚠️ [Submit] Blocking submission due to no matching users for platform. Automatically saving as draft...')
        const errorMessage = error.response?.data?.responseMessage || 'No users found matching the platform requirements (OS platform or Bakong platform). Please ensure there are registered users for the specified platforms before submitting.'
        
        // Show warning message (no dialog)
        ElNotification({
          title: 'Warning',
          message: formatNoUsersFoundMessage(errorMessage),
          type: 'warning',
          duration: 8000,
          dangerouslyUseHTMLString: true,
          showClose: true,
        })

        // Automatically save as draft instead of showing dialog
        // Keep flag true throughout to prevent navigation guard dialog
        // Use forceRun=true to bypass handleSaveDraft's isSavingOrPublishing check
        // Use skipRedirect=true to prevent handleSaveDraft from redirecting (we'll handle it)
        try {
          // Save as draft - suppress notifications since we already showed the warning
          // forceRun=true allows handleSaveDraft to run even when isSavingOrPublishing is true
          // skipRedirect=true prevents handleSaveDraft from redirecting and resetting the flag
          await handleSaveDraft(true, true, true, true) // forceDraft=true, suppressNotifications=true, forceRun=true, skipRedirect=true
          // Flag remains true to prevent navigation guard dialog during redirect
          
          // Redirect to draft tab and refresh
          localStorage.setItem('notification_active_tab', 'draft')
          localStorage.removeItem('notifications_cache')
          localStorage.removeItem('notifications_cache_timestamp')
          
          const cacheBuster = Date.now()
          setTimeout(() => {
            router.push(`/?tab=draft&_refresh=${cacheBuster}`)
            // Reset flag after navigation starts
            setTimeout(() => {
              isSavingOrPublishing.value = false
            }, 1000)
          }, 500) // Small delay to ensure notification is seen
        } catch (saveError) {
          console.error('❌ [Submit] Failed to save as draft:', saveError)
          // Even if save fails, redirect to draft tab
          const cacheBuster = Date.now()
          setTimeout(() => {
            router.push(`/?tab=draft&_refresh=${cacheBuster}`)
            // Reset flag after navigation starts
            setTimeout(() => {
              isSavingOrPublishing.value = false
            }, 1000)
          }, 500)
        }
        return
      }

      // Re-throw other errors
      throw error
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
      // Editing a scheduled notification - show update success message
      const platformNameForScheduled = formatBakongApp(formData.platform)
      ElNotification({
        title: 'Success',
        message: `Notification for <strong>${platformNameForScheduled}</strong> has been updated successfully!`,
        type: 'success',
        duration: 3000,
        dangerouslyUseHTMLString: true,
      })
      // Stay in scheduled tab
        redirectTab = 'scheduled'
    } else {
      // Use unified message handler for draft/failure cases
      const platformName = formatBakongApp(formData.platform)
      const bakongPlatform = formData.platform || result?.data?.bakongPlatform
      const successfulCount = result?.data?.successfulCount ?? 0
      const failedCount = result?.data?.failedCount ?? 0
      const successfulCountFromResult = result?.data?.successfulCount
      const failedCountFromResult = result?.data?.failedCount
      const wasActuallySent =
        successfulCountFromResult !== undefined &&
        successfulCountFromResult !== null &&
        successfulCountFromResult > 0
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
          const isEditor = authStore.user?.role === (UserRole.EDITOR as any)
          const needsApproval =
            result?.data?.approvalStatus === 'PENDING' || (!isEditMode.value && isEditor)

          let message = isEditMode.value
            ? `Notification for <strong>${platformNameForScheduled}</strong> updated and scheduled successfully!`
            : `Notification for <strong>${platformNameForScheduled}</strong> created and scheduled successfully!`

          if (needsApproval && !isEditMode.value) {
            message = `Notification for <strong>${platformNameForScheduled}</strong> has been submitted for approval and scheduled. It will appear in the Pending tab.`
            redirectTab = 'pending'
          } else if (!needsApproval && !isEditMode.value) {
            // Admin auto-approved scheduled notifications go to scheduled tab
            redirectTab = 'scheduled'
          }

          ElNotification({
            title: 'Success',
            message: message,
            type: 'success',
            duration: 2000,
            dangerouslyUseHTMLString: true,
          })
          // Redirect to pending tab if needs approval, otherwise keep in scheduled tab
        }
      } else {
        // Handle non-scheduled notifications (published, draft, etc.)
        // Check if user is EDITOR or ADMIN and notification needs approval FIRST
        const isEditor = authStore.user?.role === (UserRole.EDITOR as any)
        const isAdmin = authStore.user?.role === (UserRole.ADMINISTRATOR as any)
        const needsApproval =
          result?.data?.approvalStatus === 'PENDING' || (!isEditMode.value && (isEditor || isAdmin))

        // If editing a PENDING template, keep it in Pending tab
        if (isEditingPending.value && isEditMode.value) {
          const platformNameForUpdate = formatBakongApp(formData.platform)
          ElNotification({
            title: 'Success',
            message: `Notification for <strong>${platformNameForUpdate}</strong> has been updated. It remains in the Pending tab.`,
            type: 'success',
            duration: 3000,
            dangerouslyUseHTMLString: true,
          })
          redirectTab = 'pending'
          // Skip the rest of the success/error handling - continue to navigation logic below
        }
        // For expired/rejected templates resubmitting from Draft tab, show submission message
        else if (isTemplateExpired.value && isEditMode.value && redirectTab === 'pending') {
          const platformNameForSubmit = formatBakongApp(formData.platform)
          ElNotification({
            title: 'Success',
            message: `Notification for <strong>${platformNameForSubmit}</strong> has been submitted for approval. It will appear in the Pending tab.`,
            type: 'success',
            duration: 3000,
            dangerouslyUseHTMLString: true,
          })
          redirectTab = 'pending'
          // Skip the rest of the success/error handling - continue to navigation logic below
        }
        // For EDITOR submitting for approval (CREATE mode), show special message and skip message handling
        else if (needsApproval && !isEditMode.value) {
          const platformNameForSubmit = formatBakongApp(formData.platform)
          ElNotification({
            title: 'Success',
            message: `Notification for <strong>${platformNameForSubmit}</strong> has been submitted for approval. It will appear in the Pending tab.`,
            type: 'success',
            duration: 3000,
            dangerouslyUseHTMLString: true,
          })
          redirectTab = 'pending'
          // Skip the rest of the success/error handling - continue to navigation logic below
        }
        // For EDITOR submitting draft for approval (EDIT mode), show special message
        // Check both redirectTab and backend response approvalStatus to ensure it's actually PENDING
        else if (
          needsApproval && 
          isEditMode.value && 
          (redirectTab === 'pending' || result?.data?.approvalStatus === 'PENDING')
        ) {
          const platformNameForSubmit = formatBakongApp(formData.platform)
          ElNotification({
            title: 'Success',
            message: `Notification for <strong>${platformNameForSubmit}</strong> has been submitted for approval. It will appear in the Pending tab.`,
            type: 'success',
            duration: 3000,
            dangerouslyUseHTMLString: true,
          })
          // Ensure redirectTab is set to 'pending' if not already set
          redirectTab = 'pending'
          // Skip the rest of the success/error handling - continue to navigation logic below
        } else {
        // Get device platform for message (Android, iOS, or ALL)
        const devicePlatform = formatPlatform(String(formData.pushToPlatforms))

          const messageConfig = getNotificationMessage(
            result?.data,
            platformName,
            bakongPlatform,
            devicePlatform,
          )

        // Check if all sends failed due to invalid tokens (old notification issue)
        const failedDueToInvalidTokens = result?.data?.failedDueToInvalidTokens === true
        const allFailed = successfulCount === 0 && failedCount > 0

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
                const failedUsersList =
                  failedUsers.length <= 5
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
                  devicePlatform,
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
                devicePlatform,
        )
        message = messageConfig.message
      }

      // For flash notifications, replace bakongPlatform with bold platform name
      if (isFlashNotification) {
            const platformNameForFlash = formatBakongApp(formData.platform)
              message = message.replace(
                'bakongPlatform',
                `<strong>${platformNameForFlash}</strong>`,
              )
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
    }
    // Clear cache to ensure fresh data is fetched after update
    try {
      console.log('🗑️ [Submit] Clearing cache before redirect...')
      localStorage.removeItem('notifications_cache')
      localStorage.removeItem('notifications_cache_timestamp')
      console.log('✅ [Submit] Cache cleared successfully')
    } catch (error) {
      console.warn('⚠️ [Submit] Failed to clear cache:', error)
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
      // - Expired/rejected templates → 'pending' (if needs approval) or 'published'/'scheduled' (if no approval needed)
      // So we use redirectTab directly, which already handles the logic correctly
      finalRedirectTab = redirectTab
    } else {
      // For create mode, use redirectTab directly
      finalRedirectTab = redirectTab
    }

    console.log('🔄 [Submit] Redirect configuration:', {
      isEditMode: isEditMode.value,
      isTemplateExpired: isTemplateExpired.value,
      fromTab: fromTab.value,
      redirectTab,
      finalRedirectTab,
      templateId: notificationId.value,
    })

    // Set localStorage immediately to ensure tab switches instantly
    try {
      localStorage.setItem('notification_active_tab', finalRedirectTab)
      // Clear cache to force immediate refresh
      localStorage.removeItem('notifications_cache')
      localStorage.removeItem('notifications_cache_timestamp')
    } catch (error) {
      console.warn('Failed to update localStorage:', error)
    }

    if (isEditMode.value) {
      // Add cache-busting query parameter to force fresh data fetch
      const cacheBuster = Date.now()
      setTimeout(() => {
        console.log('🔄 [Submit] Redirecting to:', `/?tab=${finalRedirectTab}&_refresh=${cacheBuster}`)
        window.location.href = `/?tab=${finalRedirectTab}&_refresh=${cacheBuster}`
        // Reset flag after navigation starts (full page reload)
        isSavingOrPublishing.value = false
      }, 1000) // Increased delay to ensure backend has committed
    } else {
      // Keep flag true until navigation completes
      const cacheBuster = Date.now()
      router
        .push(`/?tab=${finalRedirectTab}&_refresh=${cacheBuster}`)
        .then(() => {
          isSavingOrPublishing.value = false
        })
        .catch(() => {
          isSavingOrPublishing.value = false
        })
    }
  } catch (error: any) {
    isSavingOrPublishing.value = false
    console.error('Error creating/updating notification:', error)
    console.error('Error details:', {
      message: error.message,
      response: error.response,
      responseData: error.response?.data,
      status: error.response?.status,
    })

    loadingNotification.close()

    // CRITICAL: On error, preserve existing image IDs to prevent data loss on retry
    // Don't clear existingImageIds - they should remain for the next attempt
    console.log('🔄 [Error] Preserving existing image IDs for retry:', existingImageIds)

    // Extract error message with better fallbacks
    let errorMessage =
      error.response?.data?.responseMessage ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred while creating the notification'

    // Check if this is a "no users found" error - automatically save as draft
    const isNoUsersError =
      error.response?.data?.errorCode === ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM ||
      errorMessage.includes('No users found for') ||
      errorMessage.includes('No users match') ||
      errorMessage.includes('no users found')

    if (isNoUsersError) {
      console.warn('⚠️ [Submit] No users found error. Automatically saving as draft...')
      
      // Show warning message (no dialog)
      ElNotification({
        title: 'Warning',
        message: formatNoUsersFoundMessage(errorMessage),
        type: 'warning',
        duration: 8000,
        dangerouslyUseHTMLString: true,
        showClose: true,
      })

      // Automatically save as draft instead of showing dialog
      // Keep flag true throughout to prevent navigation guard dialog
      // Use forceRun=true to bypass handleSaveDraft's isSavingOrPublishing check
      // Use skipRedirect=true to prevent handleSaveDraft from redirecting (we'll handle it)
      try {
        // Save as draft - suppress notifications since we already showed the warning
        // forceRun=true allows handleSaveDraft to run even when isSavingOrPublishing is true
        // skipRedirect=true prevents handleSaveDraft from redirecting and resetting the flag
        await handleSaveDraft(true, true, true, true) // forceDraft=true, suppressNotifications=true, forceRun=true, skipRedirect=true
        // Flag remains true to prevent navigation guard dialog during redirect
        
        // Redirect to draft tab and refresh
        localStorage.setItem('notification_active_tab', 'draft')
        localStorage.removeItem('notifications_cache')
        localStorage.removeItem('notifications_cache_timestamp')
        
        const cacheBuster = Date.now()
        setTimeout(() => {
          router.push(`/?tab=draft&_refresh=${cacheBuster}`)
          // Reset flag after navigation starts
          setTimeout(() => {
            isSavingOrPublishing.value = false
          }, 1000)
        }, 500) // Small delay to ensure notification is seen
      } catch (saveError) {
        console.error('❌ [Submit] Failed to save as draft:', saveError)
        // Even if save fails, redirect to draft tab
        const cacheBuster = Date.now()
        setTimeout(() => {
          router.push(`/?tab=draft&_refresh=${cacheBuster}`)
          // Reset flag after navigation starts
          setTimeout(() => {
            isSavingOrPublishing.value = false
          }, 1000)
        }, 500)
      } finally {
        // Reset flag after navigation starts
        setTimeout(() => {
          isSavingOrPublishing.value = false
        }, 1000)
      }
      return
    }

    // Check if this is an expired template error - show as warning instead of error
    const isExpiredTemplateError = 
      errorMessage.includes('scheduled time was set') ||
      errorMessage.includes('has now passed') ||
      errorMessage.includes('expired') ||
      error.response?.data?.data?.scheduleTimeDisplay

    // If expired template error, extract schedule time from data if available
    let scheduleTimeDisplay = error.response?.data?.data?.scheduleTimeDisplay
    if (isExpiredTemplateError && scheduleTimeDisplay) {
      // Use the schedule time from backend response
      errorMessage = `The scheduled time was set to <strong>${scheduleTimeDisplay}</strong>, and it has now passed. Please go to update the schedule time and resubmitting again.`
    }

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
      title: isExpiredTemplateError ? 'Warning' : 'Error',
      message: errorMessage,
      type: isExpiredTemplateError ? 'warning' : 'error',
      duration: 5000, // Increased from 2000ms to 5000ms for better visibility
      showClose: true, // Allow user to manually close
      dangerouslyUseHTMLString: isExpiredTemplateError && errorMessage.includes('<strong>'),
    })
  }
}

const handleFinishLater = () => {
  showConfirmationDialog.value = true
}

const handleSaveDraft = async (forceDraft: boolean = false, suppressNotifications: boolean = false, forceRun: boolean = false, skipRedirect: boolean = false) => {
  // Allow forceRun to bypass the isSavingOrPublishing check (used when called from error handlers)
  if (!forceRun && isSavingOrPublishing.value) return
  // Only set flag if not already set (to prevent resetting during error handling)
  const wasFlagSet = isSavingOrPublishing.value
  if (!wasFlagSet) {
  isSavingOrPublishing.value = true
  }

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
    const title =
      (lang === activeLanguage.value ? currentTitle.value : langData.title)?.trim() || ''

    if (title && title.length > DB_TITLE_MAX_LENGTH) {
      hasValidationError = true
      validationErrors.push(
        `${langKey.toUpperCase()}: Title is too long (max ${DB_TITLE_MAX_LENGTH}), current length: ${title.length}.`,
      )
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

  const loadingNotification = suppressNotifications
    ? null
    : ElNotification({
    title: isEditMode.value ? 'Updating draft...' : 'Saving draft...',
    message: isEditMode.value
      ? 'Please wait while we update your notification'
      : 'Please wait while we save your notification',
    type: 'warning',
    duration: 0,
  })

  // Final pre-check: if any language has an invalid link, block and show frontend error
  for (const [langKey, langData] of Object.entries(languageFormData)) {
    if (langData.linkToSeeMore && !isValidUrl(String(langData.linkToSeeMore))) {
      ElNotification({
        title: 'Error',
        message: `Please enter a valid URL for <strong>Link to see more</strong> in ${langKey} with correct format <strong>(e.g., https://example.com)</strong>`,
        type: 'error',
        duration: 2000,
        dangerouslyUseHTMLString: true,
      })
      if (loadingNotification) loadingNotification.close()
      isSavingOrPublishing.value = false
      return
    }
  }

  try {
    const imagesToUpload: { file: File; language: string }[] = []
    const translations: any[] = []

    // 1. Collect all translation data and identify images to upload
    for (const [langKey, langData] of Object.entries(languageFormData)) {
      const lang = langKey as Language
      // Prioritize current reactive state for the active tab, otherwise use stored tab data
      const title =
        (lang === activeLanguage.value ? currentTitle.value : langData.title)?.trim() || ''
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

      // Check if this translation should be included
      // Only include translations that have:
      // 1. Title OR content (not both empty), OR
      // 2. Existing image, OR
      // 3. New image file to upload
      const hasTitle = title && title.trim() !== ''
      const hasContent = content && content.trim() !== ''
      const hasExistingImage = existingImageIds[langKey] && existingImageIds[langKey].trim() !== ''
      const hasNewImage = imageFile !== null

      const shouldIncludeTranslation = hasTitle || hasContent || hasExistingImage || hasNewImage

      if (!shouldIncludeTranslation) {
        // Skip empty translations to prevent backend from creating empty records
        // or applying fallback logic that copies data from other languages
        console.log(`⏭️ [Save Draft] Skipping empty translation for ${langKey}`)
        continue
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

            const transIndex = translations.findIndex(
              (t) => t.language === mapLanguageToEnum(langKey),
            )
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
    // If schedule is enabled, always set sendType to SEND_SCHEDULE to preserve the schedule
    // This ensures that when the user submits it later, it will follow the scheduled flow
    const useSchedule = formData.scheduleEnabled && formData.scheduleDate && formData.scheduleTime
    // Always use SEND_SCHEDULE if schedule is enabled, regardless of draft status
    // The backend will handle the draft status via isSent=false
    const finalSendType = useSchedule ? SendType.SEND_SCHEDULE : SendType.SEND_NOW

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
    // Final frontend-only validation: ensure any provided linkPreview values are valid URLs
    for (const t of (templateData.translations || [])) {
      if (t.linkPreview && !isValidUrl(String(t.linkPreview))) {
        ElNotification({
          title: 'Error',
          message: 'Please enter a valid URL starting with http:// or https://',
          type: 'error',
          duration: 2000,
        })
        isSavingOrPublishing.value = false
        return
      }
    }

    if (isEditMode.value) {
      result = await notificationApi.updateTemplate(parseInt(notificationId.value), templateData)
    } else {
      result = await notificationApi.createTemplate(templateData)
    }

    if (loadingNotification) {
    loadingNotification.close()
    }

    // Show success notification only if not suppressed
    if (!suppressNotifications) {
    ElNotification({
      title: 'Success',
      message: `Notification updated successfully!`,
      type: 'success',
        duration: 3000,
    })
    }

    // 5. Clear cache and redirect
    try {
      localStorage.removeItem('notifications_cache')
      localStorage.removeItem('notifications_cache_timestamp')
    } catch (e) {
      console.warn('Failed to clear cache:', e)
    }

    // Determine redirect tab based on our finalized status
    // When saving as draft (forceDraft=true), ALWAYS redirect to Draft tab
    // This ensures that even if schedule is enabled, it appears in Draft tab until submitted
    // The schedule is preserved (sendType: SEND_SCHEDULE, sendSchedule: <date>), but it stays in Draft tab
    let redirectTab: string
    if (forceDraft) {
      // When explicitly saving as draft, always go to Draft tab regardless of schedule
      redirectTab = 'draft'
    } else {
      // This shouldn't happen in saveAsDraft, but handle it just in case
      redirectTab = !useSchedule ? 'draft' : 'scheduled'
    }
    
    // Add a small delay to ensure the success notification is visible before redirecting (only if showing notifications)
    if (!suppressNotifications) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    
    // If editing, preserve the original tab (fromTab) if it's draft, otherwise use calculated tab
    if (isEditMode.value && fromTab.value === 'draft') {
      redirectTab = 'draft'
    }

    // Skip redirect if skipRedirect is true (caller will handle redirect)
    if (skipRedirect) {
      // Don't reset flag - caller will handle it
      return
    }

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
    if (loadingNotification) {
    loadingNotification.close()
    }
    console.error('Error saving draft:', error)

    // Show error notification only if not suppressed
    if (!suppressNotifications) {
    ElNotification({
      title: 'Error',
        message: error.message || 'An unexpected error occurred while saving the draft',
      type: 'error',
      duration: 5000,
    })
    }
  }
}

const handleBack = () => {
  // Navigate back to the previous tab
  const redirectTab = fromTab.value || 'published'
  router.push(`/?tab=${redirectTab}`)
}

const handleCancel = () => {
  console.log('🚫 [CANCEL] User clicked Cancel button')
  // Set flag to bypass navigation guard (don't show leave dialog)
  isDiscarding.value = true
  // Navigate back to the previous tab (same as handleBack)
  const redirectTab = fromTab.value || 'published'
  console.log('🚫 [CANCEL] Redirecting to tab:', redirectTab)
  router.push(`/?tab=${redirectTab}`).finally(() => {
    // Reset flag after navigation completes
    setTimeout(() => {
      isDiscarding.value = false
    }, 100)
  })
}

// Get leave dialog message based on context
const getLeaveDialogMessage = () => {
  if (isReadOnly.value) {
    return 'If you leave now, you will return to the previous page.'
  }
  if (isEditMode.value) {
    return 'If you leave now, any changes you made will be updated. If there are no changes, nothing will be updated.'
  }
  // Create mode with data
  if (hasUnsavedChanges.value) {
    return 'If you leave now, your progress will be saved as a draft. You can resume and complete it anytime.'
  }
  return 'If you leave now, you will return to the previous page.'
}

// Get leave dialog confirm text based on context
const getLeaveDialogConfirmText = () => {
  if (isReadOnly.value) {
    return 'Leave now'
  }
  if (isEditMode.value) {
    return 'Update and leave'
  }
  // Create mode with data
  if (hasUnsavedChanges.value) {
    return 'Leave and save draft'
  }
  return 'Leave now'
}

// Handle approval from view page
const handleApprovalFromView = async () => {
  if (!notificationId.value) return
  
  try {
    const templateId = parseInt(notificationId.value)
    
    // Fetch full template to check sendType and schedule
    const fullTemplate = await api.get(`/api/v1/template/${templateId}`)
    const template = fullTemplate.data?.data || fullTemplate.data
    
    // Check if this is a scheduled notification and if the scheduled time has passed
    if (template?.sendSchedule && template?.sendType === 'SEND_SCHEDULE') {
      const scheduledTime = new Date(template.sendSchedule)
      const now = new Date()
      
      // Check if scheduled time has passed (with 1 minute grace period)
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
      
      if (scheduledTime < oneMinuteAgo) {
        // Scheduled time has passed - show warning and let backend handle auto-expiration
        console.warn('⏰ [APPROVE] Scheduled time has passed:', {
          scheduledTime: scheduledTime.toISOString(),
          currentTime: now.toISOString(),
          scheduledTimeLocal: scheduledTime.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
          currentTimeLocal: now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
        })
      }
    }
    
    console.log('📤 [APPROVE] Calling approve API with template:', {
      templateId,
      sendSchedule: template?.sendSchedule,
      sendType: template?.sendType,
      approvalStatus: template?.approvalStatus,
    })
    
    // Approve the template (backend will auto-expire if scheduled time has passed)
    await notificationApi.approveTemplate(templateId)
    
    // Fetch updated template after approval to get the latest status
    const updatedTemplateResponse = await api.get(`/api/v1/template/${templateId}`)
    const updatedTemplate = updatedTemplateResponse.data?.data || updatedTemplateResponse.data
    
    // Determine redirect tab based on sendType and isSent status
    // If scheduled and not yet sent, it should stay in Scheduled tab
    // Check both sendType and sendSchedule to ensure we correctly identify scheduled notifications
    const isScheduled = 
      updatedTemplate?.sendType === 'SEND_SCHEDULE' &&
      updatedTemplate?.sendSchedule !== null &&
      updatedTemplate?.sendSchedule !== undefined &&
      updatedTemplate?.isSent === false
    
    console.log('🔍 [APPROVE] Determining redirect tab:', {
      sendType: updatedTemplate?.sendType,
      sendSchedule: updatedTemplate?.sendSchedule,
      isSent: updatedTemplate?.isSent,
      isScheduled,
      redirectTab: isScheduled ? 'scheduled' : 'published',
    })
    
    const redirectTab = isScheduled ? 'scheduled' : 'published'
    
    const message = isScheduled 
      ? '<strong>Notification approved successfully</strong>, It will be sent at the scheduled time and moved to Published tab automatically.'
      : '<strong>Notification approved and published successfully</strong>, Users will receive it shortly.'
    
    ElNotification({
      title: 'Success',
      message: message,
      type: 'success',
      duration: 3000,
      dangerouslyUseHTMLString: true,
    })
    
    // Set localStorage immediately to ensure tab switches instantly
    try {
      localStorage.setItem('notification_active_tab', redirectTab)
      // Clear cache to force immediate refresh
      localStorage.removeItem('notifications_cache')
      localStorage.removeItem('notifications_cache_timestamp')
    } catch (error) {
      console.warn('Failed to update localStorage:', error)
    }
    
    // Redirect to appropriate tab with cache-busting parameter for immediate refresh
    const cacheBuster = Date.now()
    router.push(`/?tab=${redirectTab}&_refresh=${cacheBuster}`)
  } catch (error: any) {
    console.log('❌ [APPROVE] Error caught in handleApprovalFromView:', {
      error: error,
      response: error.response,
      responseData: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    })
    
    // Check if this is a "no users found" error (platform mismatch)
    const errorMessage = error.response?.data?.responseMessage || error.message || ''
    const isNoUsersError = 
      error.response?.data?.errorCode === 31 || // ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM
      errorMessage.includes('No users found') ||
      errorMessage.includes('no users found') ||
      errorMessage.includes('No users match') ||
      errorMessage.includes('registered users for this platform')
    
    if (isNoUsersError) {
      // Template was rejected due to no users matching platform requirements
      // Show warning message and redirect to draft tab (where rejected templates are shown)
      ElNotification({
        title: 'Warning',
        message: formatNoUsersFoundRejectionMessage(errorMessage),
        type: 'warning',
        duration: 8000,
        dangerouslyUseHTMLString: true,
      })
      // Redirect to Draft tab (where rejected templates are shown) and refresh
      try {
        localStorage.setItem('notification_active_tab', 'draft')
        localStorage.removeItem('notifications_cache')
        localStorage.removeItem('notifications_cache_timestamp')
      } catch (error) {
        console.warn('Failed to update localStorage:', error)
      }
      const cacheBuster = Date.now()
      setTimeout(() => {
        router.push(`/?tab=draft&_refresh=${cacheBuster}`)
      }, 500) // Small delay to ensure notification is seen
      return
    }
    
    // Check if this is an auto-expiration or auto-rejection due to passed scheduled time
    const isAutoExpired = error.response?.data?.data?.autoExpired === true
    const isAutoRejected = error.response?.data?.data?.autoRejected === true
    const expiredReason = error.response?.data?.responseMessage || error.response?.data?.data?.expiredReason || 'Scheduled time has passed. Please contact team member to update the schedule first.'
    const rejectionReason = error.response?.data?.responseMessage || error.response?.data?.data?.rejectionReason || 'Failed to approve template'
    
    console.log('🔍 [APPROVE] Error analysis:', {
      isAutoExpired,
      isAutoRejected,
      expiredReason,
      rejectionReason,
      errorResponseData: error.response?.data,
    })
    
    if (isAutoExpired) {
      // Auto-expired due to passed scheduled time - redirect to Draft tab
      console.log('⏰ [APPROVE] Template auto-expired - redirecting to Draft tab')
      ElNotification({
        title: 'Notification Expired',
        message: `<strong>Scheduled time has expired</strong>. Please contact <strong>team member</strong> to update the schedule first.`,
        type: 'warning',
        duration: 5000,
        dangerouslyUseHTMLString: true,
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
      
      // Redirect to Draft tab with cache-busting parameter for immediate refresh
      const cacheBuster = Date.now()
      setTimeout(() => {
        console.log('🔄 [APPROVE] Redirecting to Draft tab and refreshing notifications')
        router.push(`/?tab=draft&_refresh=${cacheBuster}`).then(() => {
          // Force refresh the notifications list to show the expired template
          window.dispatchEvent(new CustomEvent('refresh-notifications', { detail: { forceRefresh: true } }))
        })
      }, 100) // Reduced delay for faster redirect
    } else if (isAutoRejected) {
      // Auto-rejected due to passed scheduled time - redirect to Draft tab
      ElNotification({
        title: 'Notification Rejected',
        message: rejectionReason,
        type: 'warning',
        duration: 5000,
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
      
      // Redirect to Draft tab with cache-busting parameter for immediate refresh
      const cacheBuster = Date.now()
      router.push(`/?tab=draft&_refresh=${cacheBuster}`)
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

// Handle reject from view page
const handleRejectFromView = () => {
  showRejectDialog.value = true
}

const handleRejectFromViewConfirm = async (reason?: string) => {
  if (!notificationId.value || !reason) return
  
  try {
    const templateId = parseInt(notificationId.value)
    await notificationApi.rejectTemplate(templateId, reason)
    
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
    
    // Redirect to draft tab with cache-busting parameter for immediate refresh
    const cacheBuster = Date.now()
    router.push(`/?tab=draft&_refresh=${cacheBuster}`)
  } catch (error: any) {
    ElNotification({
      title: 'Error',
      message: error.response?.data?.responseMessage || 'Failed to reject template',
      type: 'error',
      duration: 3000,
    })
  }
  
  showRejectDialog.value = false
}

const handleRejectFromViewCancel = () => {
  showRejectDialog.value = false
}

const handleDiscard = () => {
  // Set flag to bypass navigation guard
  isDiscarding.value = true
  // Clear any pending navigation
  pendingNavigation = null

  // Determine default tab if fromTab is missing
  const defaultTab = isEditingPublished.value
    ? 'published'
    : wasScheduled.value
      ? 'scheduled'
      : 'draft'

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

      const titleChanged =
        (currentData?.title?.trim() || '') !== (originalData?.title?.trim() || '')
      const descriptionChanged =
        (currentData?.description?.trim() || '') !== (originalData?.description?.trim() || '')
      const linkChanged =
        (currentData?.linkToSeeMore?.trim() || '') !== (originalData?.linkToSeeMore?.trim() || '')
      const imageChanged =
        currentData?.imageFile !== null || existingImageIds[langKey] !== originalImageIds[langKey]

      if (titleChanged || descriptionChanged || linkChanged || imageChanged) return true
    }
  }

  return hasContent || hasImage || hasExistingImage
})

// Navigation guard - intercept navigation attempts
onBeforeRouteLeave((to, from, next) => {
  // Don't block navigation if in read-only mode (APPROVAL role viewing notification)
  if (isReadOnly.value) {
    next()
    return
  }

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
    // For draft notifications or new notifications, "Update and leave" / "Save as draft & leave"
    // should just update/save the data and leave, not submit for approval
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
  const defaultTab = isEditingPublished.value
    ? 'published'
    : wasScheduled.value
      ? 'scheduled'
      : 'draft'

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
  padding: 16px 12px;
  border: 1px solid var(--surface-main-surface-secondary-bold, #0013461a);
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
  box-shadow: none;
}

/* Disabled field styles - gray appearance */
.form-input:disabled,
.form-input-title:disabled,
.form-input-number:disabled,
.form-input-link:disabled,
.form-select:disabled,
.form-textarea:disabled {
  background-color: #f3f4f6 !important;
  color: #6b7280 !important;
  cursor: not-allowed !important;
  opacity: 0.6;
}

.form-input[readonly],
.form-input-title[readonly],
.form-input-link[readonly],
.form-textarea[readonly] {
  background-color: #f3f4f6 !important;
  color: #6b7280 !important;
  cursor: not-allowed !important;
  opacity: 0.6;
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

/* Disabled dropdown styles */
.custom-dropdown.is-disabled .dropdown-trigger,
.custom-dropdown:disabled .dropdown-trigger {
  background-color: #f3f4f6 !important;
  color: #6b7280 !important;
  cursor: not-allowed !important;
  opacity: 0.6;
  border-color: #d1d5db !important;
}

.custom-dropdown.is-disabled .dropdown-trigger:hover,
.custom-dropdown:disabled .dropdown-trigger:hover {
  border-color: #d1d5db !important;
}

.custom-dropdown.is-disabled .dropdown-icon,
.custom-dropdown:disabled .dropdown-icon {
  color: #9ca3af !important;
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

/* Disabled toggle switch styles */
.toggle-switch input:disabled + .toggle-slider {
  background-color: #d1d5db !important;
  cursor: not-allowed !important;
  opacity: 0.6;
}

.toggle-switch input:disabled + .toggle-slider:before {
  background-color: #f3f4f6 !important;
}

.toggle-switch input:disabled:checked + .toggle-slider {
  background-color: #9ca3af !important;
  opacity: 0.6;
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

/* Disabled styles for Element Plus date/time pickers */
.schedule-date-picker.is-disabled :deep(.el-input__wrapper),
.schedule-time-picker.is-disabled :deep(.el-input__wrapper) {
  background-color: #f3f4f6 !important;
  border-color: #d1d5db !important;
  cursor: not-allowed !important;
  opacity: 0.6;
}

.schedule-date-picker.is-disabled :deep(.el-input__inner),
.schedule-time-picker.is-disabled :deep(.el-input__inner) {
  color: #6b7280 !important;
  cursor: not-allowed !important;
}

/* Element Plus disabled state */
.el-date-editor.is-disabled,
.el-time-picker.is-disabled {
  opacity: 0.6;
}

.el-date-editor.is-disabled :deep(.el-input__wrapper),
.el-time-picker.is-disabled :deep(.el-input__wrapper) {
  background-color: #f3f4f6 !important;
  border-color: #d1d5db !important;
  cursor: not-allowed !important;
}

.el-date-editor.is-disabled :deep(.el-input__inner),
.el-time-picker.is-disabled :deep(.el-input__inner) {
  color: #6b7280 !important;
  cursor: not-allowed !important;
}

.flash-input-wrapper {
  position: relative;
  width: 281.5px;
  height: 56px;
}

/* Disabled field styles for restricted fields */
.custom-dropdown:has(.el-dropdown.is-disabled),
.custom-dropdown .el-dropdown.is-disabled,
.custom-dropdown.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none !important;
}

.custom-dropdown .dropdown-trigger:has([disabled]),
.custom-dropdown.is-disabled .dropdown-trigger,
.custom-dropdown[disabled] .dropdown-trigger {
  background-color: #f3f4f6 !important;
  color: #9ca3af !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
}

/* Prevent dropdown menu from showing when disabled */
.el-dropdown.is-disabled,
.el-dropdown.is-disabled .el-dropdown__caret-button,
.el-dropdown.is-disabled .dropdown-trigger,
.custom-dropdown.is-disabled .el-dropdown,
.custom-dropdown[disabled] .el-dropdown {
  pointer-events: none !important;
  cursor: not-allowed !important;
}

/* Additional protection - prevent click events on disabled dropdowns */
.custom-dropdown.is-disabled *,
.custom-dropdown[disabled] * {
  pointer-events: none !important;
}

.schedule-date-picker.is-disabled,
.schedule-time-picker.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-switch input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
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

/* .schedule-date-picker .el-input__wrapper,
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
} */

.schedule-date-picker .el-input__wrapper,
.schedule-time-picker .el-input__wrapper {
  height: 56px !important;
  padding: 16px 12px !important;
  border-radius: 8px !important;
  border: 1px solid var(--surface-main-surface-secondary-bold, #0013461a) !important;
  box-shadow: none !important;
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

.reject-reason-container {
  flex-shrink: 0;
  max-height: 200px;
  overflow-y: auto;
}

.reject-reason-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reject-reason-icon {
  color: #e42323;
  font-size: 18px;
}

.reject-reason-label {
  font-size: 14px;
  font-weight: 600;
  color: #e42323;
}

.reject-reason-text {
  font-weight: 600;
  /* color: #333; */
  color: #e42323;
  word-wrap: break-word;
  display: inline;
}

.reject-reason-textarea {
  min-height: 50px;
}

.reject-reason-textarea :deep(.el-textarea__inner) {
  min-height: 50px;
  resize: vertical;
  cursor: ns-resize;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  padding: 8px 12px;
}

.reject-reason-textarea :deep(.el-textarea__inner):hover {
  border-color: #fca5a5;
}

.reject-reason-textarea :deep(.el-textarea__inner):focus {
  border-color: #e42323;
  outline: none;
}

.expired-time-container .reject-reason-header {
  gap: 10px;
}

.expired-time-container .reject-reason-icon {
  color: #e0ab0e;
  font-size: 18px;
}

.expired-time-container .reject-reason-label {
  color: #e0ab0e;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.expired-time-container .reject-reason-text {
  font-weight: 600;
  color: #e0ab0e;
  word-wrap: break-word;
  display: inline;
}

.expired-time-container .reject-reason-text strong {
  font-weight: 800;
  color: #e0ab0e;
}

</style>
