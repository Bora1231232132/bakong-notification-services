<template>
  <div class="flex w-full h-full justify-start">
    <div class="flex flex-col w-full max-w-[639.5px] h-full py-4 px-4 sm:px-4">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="flex flex-col gap-4 w-full h-full px-4 pb-4"
      >
        <div class="field-select w-full max-w-[603px]">
          <div class="flex items-center gap-1 mb-1!">
            <span class="text-sm leading-snug text-[#001346] label-text">User role</span>
            <span class="text-red-500 text-sm">*</span>
          </div>
          <FormField
            v-model="form.role"
            type="select"
            prop="role"
            label=""
            placeholder="Select role"
            :options="roleOptions"
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
            placeholder="Attractive title"
            required
            :disabled="loading"
          />
        </div>

        <div class="flex items-center gap-3 w-full max-w-[213px] h-14 mt-3!">
          <el-button
            type="primary"
            round
            :loading="loading"
            class="w-[118px] h-[56px]! rounded-[32px]! bg-gradient-to-r from-[#3f7bff] to-[#0f5dff] text-white font-semibold border-0 px-4 py-2"
            @click="handleSubmit"
          >
            Create user
          </el-button>
          <el-button
            round
            class="w-[118px] h-[56px]! rounded-[32px]! bg-[#f3f4f6] text-[#111827] font-semibold border-0 px-4 py-2"
            @click="handleCancel"
            :disabled="loading"
          >
            Cancel
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { FormField, type FormFieldOption } from '@/components/common'
import { userApi } from '@/services/userApi'
import { useErrorHandler } from '@/composables/useErrorHandler'

const router = useRouter()

const { handleApiError, showSuccess, showWarning, clearError } = useErrorHandler({
  operation: 'createUser',
})

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  role: 'NORMAL_USER',
  displayName: '',
  username: '',
  phoneNumber: '',
  // hidden default password to satisfy API requirement
  password: 'Temp@12345',
})

const roleOptions: FormFieldOption[] = [
  { label: 'Normal User', value: 'NORMAL_USER' },
  { label: 'Admin User', value: 'ADMIN_USER' },
  { label: 'API User', value: 'API_USER' },
]

const rules = reactive<FormRules>({
  role: [{ required: true, message: 'User role is required', trigger: 'change' }],
  displayName: [{ required: true, message: 'Name is required', trigger: 'blur' }],
  username: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Invalid email', trigger: ['blur', 'change'] },
  ],
  phoneNumber: [{ required: true, message: 'Phone number is required', trigger: 'blur' }],
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
    } catch (error) {
      handleApiError(error, { operation: 'createUser' })
    } finally {
      loading.value = false
    }
  })
}

const handleCancel = () => {
  router.back()
}
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
</style>
