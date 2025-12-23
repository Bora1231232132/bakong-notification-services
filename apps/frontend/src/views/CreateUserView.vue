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

        <div class="field-input w-full max-w-[603px]">
          <div class="flex items-center gap-1 mb-1!">
            <span class="text-sm leading-snug text-[#001346] label-text">Name</span>
            <span class="text-red-500 text-sm">*</span>
          </div>
          <FormField
            v-model="form.displayName"
            prop="displayName"
            label=""
            placeholder="Full name"
            required
            :disabled="loading"
            :readonly="mode === 'view'"
          />
        </div>

        <div class="field-input w-full max-w-[603px]">
          <div class="flex items-center gap-1 mb-1!">
            <span class="text-sm leading-snug text-[#001346] label-text">Email</span>
            <span class="text-red-500 text-sm">*</span>
          </div>
          <FormField
            v-model="form.username"
            prop="username"
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
import { mockUsers } from '../../Data/mockUsers'
import type { UserItem } from '@/components/common'

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
  role: 'NORMAL_USER',
  displayName: '',
  username: '',
  phoneNumber: '',
  status: 'Active', // 'Active' or 'Deactivate' - only used in edit mode
  // hidden default password to satisfy API requirement
  password: 'Temp@12345',
})

const roleOptions: FormFieldOption[] = [
  { label: 'Normal User', value: 'NORMAL_USER' },
  { label: 'Admin User', value: 'ADMIN_USER' },
  { label: 'API User', value: 'API_USER' },
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
    displayName: [{ required: true, message: 'Name is required', trigger: 'blur' }],
    username: [
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
  form.role = 'NORMAL_USER'
  form.username = ''
  form.displayName = ''
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
        const success = await userApi.updateUser(userId.value, {
          username: form.username.trim(),
          displayName: form.displayName.trim(),
          role: form.role as 'ADMIN_USER' | 'NORMAL_USER' | 'API_USER',
          // Note: Status will be included in payload for future backend integration
          // Backend should handle status by setting/clearing deletedAt field
        })

        if (success) {
          showSuccess('User updated successfully')
          router.push({ path: '/users' })
        } else {
          showWarning('Failed to update user. Please try again.')
        }
      } else {
        // Create mode - create new user
        const success = await userApi.createUser({
          username: form.username.trim(),
          displayName: form.displayName.trim(),
          password: form.password,
          role: form.role as 'ADMIN_USER' | 'NORMAL_USER' | 'API_USER',
        })

        if (success) {
          showSuccess('User created successfully')
          resetForm()
          router.push({ path: '/users' })
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

// Helper function to convert mock user to API user format
const convertMockUserToApiUser = (mockUser: UserItem) => {
  // Map role from display format to API format
  let role: 'ADMIN_USER' | 'NORMAL_USER' | 'API_USER' = 'NORMAL_USER'
  if (mockUser.role === 'Editor' || mockUser.role === 'ADMIN_USER') {
    role = 'ADMIN_USER'
  } else if (mockUser.role === 'View only' || mockUser.role === 'NORMAL_USER') {
    role = 'NORMAL_USER'
  } else if (mockUser.role === 'Approval' || mockUser.role === 'API_USER') {
    role = 'API_USER'
  }

  return {
    id: typeof mockUser.id === 'string' ? parseInt(mockUser.id) : mockUser.id,
    username: mockUser.email || mockUser.username || '',
    displayName: mockUser.name || mockUser.displayName || '',
    phoneNumber: mockUser.phoneNumber || '',
    role,
    deletedAt: mockUser.status === 'Deactivate' ? new Date().toISOString() : undefined,
    failLoginAttempt: 0,
    createdAt: new Date().toISOString(),
  }
}

// Fetch user data for edit and view modes
onMounted(async () => {
  if ((mode.value === 'edit' || mode.value === 'view') && userId.value) {
    loading.value = true
    try {
      // Try to fetch from API first
      let user: any = null
      try {
        user = await userApi.getUserById(userId.value)
        // If API returns null, fall back to mock data
        if (!user) {
          throw new Error('User not found in API')
        }
      } catch (apiError) {
        // If API fails, use mock data for testing
        console.log('API call failed or returned null, using mock data for testing')
        const mockUser = mockUsers.find((u) => {
          const mockId = typeof u.id === 'string' ? parseInt(u.id) : u.id
          const targetId = typeof userId.value === 'string' ? parseInt(userId.value) : userId.value
          return mockId === targetId
        }) as UserItem | undefined

        if (mockUser) {
          user = convertMockUserToApiUser(mockUser)
        }
      }

      if (user) {
        form.role = user.role
        form.displayName = user.displayName
        form.username = user.username
        form.phoneNumber = user.phoneNumber || ''
        // Compute status from deletedAt field (only used in edit mode)
        form.status = user.deletedAt ? 'Deactivate' : 'Active'

        // Clear validation after data is loaded to prevent false errors
        await nextTick()
        formRef.value?.clearValidate()
      } else {
        // If no user found in API or mock data, show error
        handleApiError(new Error('User not found'), { operation: 'fetchUser' })
      }
    } catch (error) {
      handleApiError(error, { operation: 'fetchUser' })
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
