<template>
  <div class="flex w-full h-full justify-start">
    <div class="flex flex-col w-full max-w-[639.5px] h-full py-4 px-4 sm:px-4 overflow-hidden">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="flex flex-col gap-4 w-full h-full px-4 pb-4 overflow-y-auto"
        :validate-on-rule-change="mode !== 'view'"
      >
        <div class="field-select w-full max-w-[603px]">
          <div class="flex items-center gap-1 mb-1!">
            <span class="text-sm leading-snug text-[#001346] label-text">User role</span>
          </div>
          <FormField
            v-model="form.role"
            type="select"
            prop="role"
            label=""
            placeholder="Select role"
            :options="roleOptions"
            :disabled="loading || mode === 'view'"
          />
        </div>

        <!-- User Status field (only visible in edit mode) -->
        <div v-if="mode === 'edit'" class="field-select w-full max-w-[603px]">
          <div class="flex items-center gap-1 mb-1!">
            <span class="text-sm leading-snug text-[#001346] label-text">User Status</span>
            <span class="text-red-500 text-sm">*</span>
          </div>
          <FormField
            v-model="form.status"
            type="select"
            prop="status"
            label=""
            placeholder="Select status"
            :options="statusOptions"
            required
            :disabled="loading"
          />
        </div>

        <div class="field-input w-full max-w-[603px]" key="username-field">
          <div class="flex items-center gap-1 mb-1!">
            <span class="text-sm leading-snug text-[#001346] label-text">Full name</span>
            <span class="text-red-500 text-sm">*</span>
          </div>
          <FormField
            v-model="form.username"
            type="input"
            prop="username"
            label=""
            placeholder="User full name"
            required
            :disabled="loading || mode === 'edit'"
            :readonly="mode === 'view'"
          />
        </div>

        <!-- Default temporary password info (create mode only) -->
        <p v-if="mode === 'create'" class="text-xs text-gray-500 mt-1">
          Default temporary password for this user:
          <span class="font-semibold">{{ form.password }}</span
          >. They will be forced to change it on first login.
        </p>

        <div class="field-input w-full max-w-[603px]" key="email-field">
          <div class="flex items-center gap-1 mb-1!">
            <span class="text-sm leading-snug text-[#001346] label-text">Email</span>
            <span class="text-red-500 text-sm">*</span>
          </div>
          <FormField
            v-model="form.email"
            type="input"
            prop="email"
            label=""
            placeholder="firstname.lastname.nbc.gov.kh"
            required
            :disabled="loading"
            :readonly="mode === 'view'"
          />
        </div>

        <div class="field-input w-full max-w-[603px]">
          <div class="flex items-center gap-1 mb-1!">
            <span class="text-sm leading-snug text-[#001346] label-text">Phone number</span>
            <span class="text-red-500 text-sm">*</span>
          </div>
          <FormField
            v-model="form.phoneNumber"
            prop="phoneNumber"
            label=""
            placeholder="+855 00 000 000"
            required
            :disabled="loading"
            :readonly="mode === 'view'"
            @input="handlePhoneNumberInput"
            @focus="handlePhoneNumberFocus"
          />
        </div>

        <div class="flex items-center gap-3 w-full max-w-[213px] h-14 mt-3! flex-shrink-0">
          <el-button
            v-if="mode !== 'view'"
            type="primary"
            round
            :loading="loading"
            class="w-[118px] h-[56px]! rounded-[32px]! bg-gradient-to-r from-[#3f7bff] to-[#0f5dff] text-white font-semibold border-0 px-4 py-2"
            @click="handleSubmit"
          >
            {{ mode === 'edit' ? 'Save Update' : 'Create user' }}
          </el-button>
          <el-button
            round
            class="cancel-btn w-[118px] h-[56px]! rounded-[32px]! font-semibold border-0 px-4 py-2"
            @click="handleCancel"
            :disabled="loading"
          >
            {{ mode === 'view' ? 'Back' : 'Cancel' }}
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { FormField, type FormFieldOption } from '@/components/common'
import { userApi } from '@/services/userApi'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { UserRole } from '@bakong/shared'

const router = useRouter()
const route = useRoute()

// Detect mode from route
const mode = computed(() => {
  if (route.path.includes('/view/')) return 'view'
  if (route.params.id) return 'edit'
  return 'create'
})
const userId = computed(() => (route.params.id ? Number(route.params.id) : null))

const { handleApiError, showSuccess, showWarning, clearError } = useErrorHandler({
  operation:
    mode.value === 'edit' ? 'updateUser' : mode.value === 'view' ? 'viewUser' : 'createUser',
})

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  role: UserRole.VIEW_ONLY,
  username: '',
  email: '', // Separate email field for backend
  phoneNumber: '',
  status: 'Active', // 'Active' or 'Deactivate' - only used in edit mode
  // hidden default password to satisfy API requirement
  password: 'userP0@bkns',
})

// Role options using enum, excluding ADMINISTRATOR (only ADMINISTRATOR can create other users)
const roleOptions: FormFieldOption[] = [
  { label: 'Editor', value: UserRole.EDITOR },
  { label: 'View Only', value: UserRole.VIEW_ONLY },
  { label: 'Approval', value: UserRole.APPROVAL },
]

const statusOptions: FormFieldOption[] = [
  { label: 'Active', value: 'Active' },
  { label: 'Deactivate', value: 'Deactivate' },
]

// Only apply validation rules in create/edit modes, not in view mode
const rules = computed<FormRules>(() => {
  if (mode.value === 'view') {
    return {}
  }
  return {
    username: [
      { required: true, message: 'Full name is required', trigger: 'blur' },
    ],
    email: [
      { required: true, message: 'Email is required', trigger: 'blur' },
      { type: 'email', message: 'Invalid email', trigger: ['blur', 'change'] },
    ],
    phoneNumber: [
      { required: true, message: 'Phone number is required', trigger: 'blur' },
      {
        pattern: /^\+855\s[0-9\s]+$/,
        message: 'Input your phone number in the format +855 00 000 000',
        trigger: ['blur', 'change'],
      },
    ],
  }
})

const resetForm = () => {
  form.role = UserRole.VIEW_ONLY
  form.username = ''
  form.email = ''
  form.phoneNumber = ''
  formRef.value?.clearValidate()
  clearError()
}

const handleSubmit = () => {
  if (!formRef.value) return

  formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true

    try {
      if (mode.value === 'edit' && userId.value) {
        // Edit mode - update existing user
        // Convert email to lowercase (backend requirement)
        const lowercaseEmail = form.email.trim().toLowerCase()

        // Map form status (Active/Deactivate) to backend status (ACTIVE/DEACTIVATED)
        const backendStatus = form.status === 'Deactivate' ? 'DEACTIVATED' : 'ACTIVE'

        const success = await userApi.updateUser(userId.value, {
          username: form.username.trim(), // Include full name update
          email: lowercaseEmail,
          role: form.role as UserRole,
          phoneNumber: form.phoneNumber.trim(),
          status: backendStatus,
        })

        if (success) {
          showSuccess('User updated successfully')
          router.push({ path: '/user-management' })
        } else {
          showWarning('Failed to update user. Please try again.')
        }
      } else {
        // Create mode - create new user
        // Use username as-is (allow full names/spaces), email to lowercase
        const username = form.username.trim()
        const lowercaseEmail = form.email.trim().toLowerCase()

        let success = false
        // Just call the API. If it throws, the outer catch block handles it.
        success = await userApi.createUser({
          username: username,
          email: lowercaseEmail,
          password: form.password,
          role: form.role as UserRole,
          phoneNumber: form.phoneNumber.trim(),
        })

        if (success) {
          showSuccess('User created successfully')
          resetForm()
          router.push({ path: '/user-management' })
        } else {
          showWarning('Failed to create user. Please try again.')
        }
      }
    } catch (error) {
      handleApiError(error, { operation: mode.value === 'edit' ? 'updateUser' : 'createUser' })
    } finally {
      loading.value = false
    }
  })
}

const handleCancel = () => {
  router.back()
}

const handlePhoneNumberFocus = () => {
  // Auto-add +855 prefix if field is empty or doesn't start with +855
  if (!form.phoneNumber || !form.phoneNumber.startsWith('+855 ')) {
    // Extract only numbers from current value
    const numbersOnly = form.phoneNumber.replace(/[^0-9]/g, '')
    // Remove leading 855 if user typed it
    const cleanedNumbers = numbersOnly.startsWith('855') ? numbersOnly.substring(3) : numbersOnly
    form.phoneNumber = '+855 ' + cleanedNumbers
  }
}

const handlePhoneNumberInput = (value: string) => {
  // If value is empty, allow it (will be handled on focus)
  if (!value || value.trim() === '') {
    form.phoneNumber = ''
    return
  }

  // Remove everything except numbers and spaces
  const cleaned = value.replace(/[^0-9\s]/g, '')

  // If user tries to delete the prefix, ensure it stays
  if (value.startsWith('+855 ')) {
    // Extract only numbers and spaces after the prefix
    const afterPrefix = value.substring(5).replace(/[^0-9\s]/g, '')
    form.phoneNumber = '+855 ' + afterPrefix
  } else if (cleaned.trim().startsWith('855')) {
    // If user typed 855 without +, treat it as country code
    const numbersAfter855 = cleaned
      .substring(3)
      .trim()
      .replace(/[^0-9\s]/g, '')
    form.phoneNumber = '+855 ' + numbersAfter855
  } else {
    // Otherwise, ensure +855 prefix is added with cleaned numbers/spaces
    const numbersAndSpaces = cleaned.trim().replace(/[^0-9\s]/g, '')
    form.phoneNumber = '+855 ' + numbersAndSpaces
  }
}

// Fetch user data for edit and view modes
onMounted(async () => {
  if ((mode.value === 'edit' || mode.value === 'view') && userId.value) {
    loading.value = true
    try {
      // Fetch user from API
      const user = await userApi.getUserById(userId.value)

      if (user) {
        // Map API response to form fields
        // Backend returns: { id, username, name, email, phoneNumber, role, status, ... }
        form.role = user.role as UserRole
        form.username = user.name || user.username || ''
        form.email = user.email || ''
        form.phoneNumber = user.phoneNumber || ''

        // Map backend status (ACTIVE/DEACTIVATED) to form status (Active/Deactivate)
        if (mode.value === 'edit') {
          if (user.status === 'DEACTIVATED' || user.status === 'Deactivate') {
            form.status = 'Deactivate'
          } else {
            form.status = 'Active'
          }
        }

        // Clear validation after data is loaded to prevent false errors
        await nextTick()
        formRef.value?.clearValidate()
      } else {
        // If no user found, show error
        handleApiError(new Error('User not found'), { operation: 'fetchUser' })
        // Redirect back to user management after a delay
        setTimeout(() => {
          router.push({ path: '/user-management' })
        }, 2000)
      }
    } catch (error) {
      handleApiError(error, { operation: 'fetchUser' })
      // Redirect back to user management on error
      setTimeout(() => {
        router.push({ path: '/user-management' })
      }, 2000)
    } finally {
      loading.value = false
    }
  } else {
    // Clear validation on create mode as well to prevent initial false errors
    await nextTick()
    formRef.value?.clearValidate()
  }
})
</script>

<style scoped>
:deep(.field-select .el-select__wrapper) {
  width: 603px;
  height: 56px;
  padding: 16px 12px;
  border-radius: 8px;
  outline: none !important;
  border-width: 1px !important;
  column-gap: 8px !important;
  border: 1px solid var(--surface-main-surface-secondary-bold, #0013461a) !important;
}

/* Normal cursor for disabled select in view mode */
:deep(.field-select .el-select.is-disabled .el-select__wrapper),
:deep(.field-select .el-select__wrapper.is-disabled) {
  cursor: default !important;
}

:deep(.field-input .el-input__wrapper) {
  width: 100% !important;
  height: 56px !important;
  padding: 16px 12px !important;
  border-radius: 8px !important;
  outline: none !important;
  border-width: 1px !important;
  column-gap: 8px !important;
  border: 1px solid var(--surface-main-surface-secondary-bold, #0013461a) !important;
}

/* Normal cursor for readonly/disabled inputs in view mode */
:deep(.field-input .el-input.is-disabled .el-input__wrapper),
:deep(.field-input .el-input__wrapper.is-disabled),
:deep(.field-input input[readonly]),
:deep(.field-input .el-input.is-disabled),
:deep(.field-input .el-input.is-disabled .el-input__wrapper:hover),
:deep(.field-input .el-input__wrapper.is-disabled:hover),
:deep(.field-input .el-input.is-disabled .el-input__wrapper:active),
:deep(.field-input .el-input__wrapper.is-disabled:active),
:deep(.field-input .el-input.is-disabled .el-input__wrapper:focus),
:deep(.field-input .el-input__wrapper.is-disabled:focus) {
  cursor: default !important;
  pointer-events: auto !important;
}

:deep(.field-input .el-input.is-disabled .el-input__inner),
:deep(.field-input input[readonly]),
:deep(.field-input input[readonly]:hover),
:deep(.field-input input[readonly]:active),
:deep(.field-input input[readonly]:focus),
:deep(.field-input .el-input__inner[readonly]) {
  cursor: default !important;
}

/* Prevent text selection in readonly inputs */
:deep(.field-input input[readonly]),
:deep(.field-input .el-input.is-disabled .el-input__inner) {
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
}

/* Position error message inside field-input container */
.field-input {
  position: relative;
}

:deep(.field-input .el-form-item) {
  margin-bottom: 0 !important;
  width: 100%;
}

:deep(.field-input .el-form-item__content) {
  position: relative;
}

:deep(.field-input .el-form-item__error) {
  position: relative !important;
  margin-top: 4px !important;
  margin-left: 0 !important;
  margin-bottom: 0 !important;
  padding: 0 !important;
  line-height: 1.2 !important;
  font-size: 12px;
  color: #f56c6c;
  display: block;
  min-height: 16px;
}

/* Same for field-select */
.field-select {
  position: relative;
}

:deep(.field-select .el-form-item) {
  margin-bottom: 0 !important;
  width: 100%;
}

:deep(.field-select .el-form-item__content) {
  position: relative;
}

:deep(.field-select .el-form-item__error) {
  position: relative !important;
  margin-top: 4px !important;
  margin-left: 0 !important;
  margin-bottom: 0 !important;
  padding: 0 !important;
  line-height: 1.2 !important;
  font-size: 12px;
  color: #f56c6c;
  display: block;
  min-height: 16px;
}

:deep(.el-form-item__label) {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-style: normal;
  font-size: 14px;
  line-height: 150%;
  letter-spacing: 0%;
  color: var(--on-surface-main-on-surface-primary, #001346);
}

.label-text {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-style: normal;
  font-size: 14px;
  line-height: 150%;
  letter-spacing: 0%;
}

/* Ensure form is scrollable and buttons stay accessible */
:deep(.el-form) {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

:deep(.el-form)::-webkit-scrollbar {
  width: 6px;
}

:deep(.el-form)::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.el-form)::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.cancel-btn {
  background: rgba(0, 19, 70, 0.05) !important;
  color: #001346 !important;
  backdrop-filter: blur(64px);
  transition: all 0.3s ease;
  outline: none !important;
  border: none !important;
}

.cancel-btn:hover {
  background: rgba(0, 19, 70, 0.1) !important;
  color: #001346 !important;
  outline: none !important;
  border: none !important;
}

.cancel-btn:focus {
  outline: none !important;
  border: none !important;
}
</style>
