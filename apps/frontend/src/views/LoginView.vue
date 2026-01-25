<template>
  <div class="login-container">
    <div class="absolute w-full h-full left-0 top-0 z-0 background-image"></div>
    <div class="absolute w-full h-full left-0 top-0 opacity-50 z-[1] background-overlay"></div>
    <div class="absolute w-full h-full left-0 top-0 z-[2] blur-overlay"></div>
    <div class="login-card">
      <div class="card-left">
        <div class="absolute w-full h-full left-0 top-0 z-[1] background-leftside"></div>
      </div>
      <div class="card-right">
        <div class="version-text">Notification Center version 1.3</div>
        <div class="title-section">
          <h1 class="main-title">Sign into Notification Center</h1>
          <p class="main-description">Please enter username and password provided by admin</p>
        </div>
        <form
          ref="loginFormRef"
          class="form-section"
          @submit.prevent="handleSubmitLogin(loginFormRef)"
        >
          <div class="form-field">
            <div class="field-label">
              <span class="label-text">Email</span>
              <span class="required-asterisk">*</span>
            </div>
            <div class="input-container">
              <input
                type="email"
                v-model="loginFormData.Email"
                class="form-input"
                :class="{ error: errors.email }"
                placeholder="admin@bakong.local"
                autocomplete="email"
                autofocus
                @input="validateEmailOnInput"
              />
            </div>
            <div v-if="errors.email" class="error-message">
              {{ errors.email }}
            </div>
          </div>
          <div class="form-field">
            <div class="field-label">
              <span class="label-text">Password</span>
              <span class="required-asterisk">*</span>
            </div>
            <div class="input-container password-container">
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="loginFormData.Password"
                class="form-input"
                :class="{ error: errors.password }"
                placeholder="********"
                autocomplete="current-password"
                @input="clearFieldError('password')"
              />
              <button
                type="button"
                class="password-toggle-btn"
                @click="togglePasswordVisibility"
                aria-label="Toggle password visibility"
              >
                <el-icon v-if="!showPassword" class="password-icon">
                  <View />
                </el-icon>
                <el-icon v-else class="password-icon">
                  <Hide />
                </el-icon>
              </button>
            </div>
            <div v-if="errors.password" class="error-message">
              {{ errors.password }}
            </div>
          </div>
          <button type="submit" class="submit-button" :disabled="isLoading">
            <span class="button-text">Sign into system</span>
            <el-icon class="arrow-icon">
              <ArrowRight />
            </el-icon>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLogin } from '@/composables/useLogin'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { ElNotification } from 'element-plus'
import { View, Hide, ArrowRight } from '@element-plus/icons-vue'
import { ValidationUtils } from '@bakong/shared'

const router = useRouter()
const {
  isLoading,
  loginFormRef,
  loginRules,
  loginFormData,
  submitLogin: originalSubmitLogin,
} = useLogin()
const authStore = useAuthStore()
const appStore = useAppStore()

const showPassword = ref(false)
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const errors = ref({
  email: '',
  password: '',
})

const clearFieldError = (field: string) => {
  if (errors.value[field as keyof typeof errors.value]) {
    errors.value[field as keyof typeof errors.value] = ''
  }
}

const validateEmailOnInput = () => {
  // Clear error first
  errors.value.email = ''

  // Only validate if email is not empty
  if (loginFormData.Email) {
    // Normalize email: convert to lowercase and trim spaces
    const normalizedEmail = loginFormData.Email.toLowerCase().trim()

    // Update the form data with normalized email (auto-correct as user types)
    if (loginFormData.Email !== normalizedEmail) {
      loginFormData.Email = normalizedEmail
    }

    // Validate email format
    const emailValidation = ValidationUtils.validateEmail(normalizedEmail, false)
    if (emailValidation !== true) {
      errors.value.email = emailValidation as string
    }
  }
}

const handleSubmitLogin = async (formRef: any) => {
  errors.value.email = ''
  errors.value.password = ''

  let hasErrors = false

  if (!loginFormData.Email) {
    errors.value.email = 'Please enter your email'
    hasErrors = true
  } else {
    // Normalize email: convert to lowercase and trim
    const normalizedEmail = loginFormData.Email.toLowerCase().trim()

    // Validate email format
    const emailValidation = ValidationUtils.validateEmail(normalizedEmail, true)
    if (emailValidation !== true) {
      errors.value.email = emailValidation as string
      hasErrors = true
    } else {
      // Update the form data with normalized email (for display feedback)
      if (loginFormData.Email !== normalizedEmail) {
        loginFormData.Email = normalizedEmail
      }
    }
  }

  if (!loginFormData.Password) {
    errors.value.password = 'Please enter your password'
    hasErrors = true
  }

  if (hasErrors) {
    return
  }

  try {
  isLoading.value = true

  const result = await appStore.proceedLogin(loginFormData)

  console.log('LOGIN RESULT:', result)

  if (result?.success) {
  const mustChange = Boolean((result as any)?.mustChangePassword)

  if (mustChange) {
    ElNotification({
      title: 'Password Change Required',
      message: 'You must change your temporary password first before accessing the system.',
      type: 'warning',
      duration: 5000,
    })

    // ✅ go to mandatory change password screen
    await router.replace('/change-password')
    return
  }

  // ✅ login success → go home immediately (no refresh needed)
    ElNotification({
      title: 'Login Successfully',
      message: `Welcome <strong>${authStore.user?.displayName || authStore.user?.username || ''}</strong> to the system!`,
      type: 'success',
      duration: 2000,
      dangerouslyUseHTMLString: true,
    })
    await router.replace('/')
    return
  }

  // ❌ Login failed → always prefer backend responseMessage
  const apiResponseMessage =
    typeof (result as any)?.responseMessage === 'string'
      ? (result as any).responseMessage.trim()
      : ''

  const fallbackError =
    typeof (result as any)?.error === 'string' ? (result as any).error : ''

  const messageToShow = apiResponseMessage || fallbackError || 'Login failed. Please try again.'

  const lowerMsg = messageToShow.toLowerCase()
  const isAccountSuspended =
    lowerMsg.includes('suspended') ||
    lowerMsg.includes('too many login attempt') ||
    lowerMsg.includes('account timeout') ||
    lowerMsg.includes('temporarily locked') ||
    lowerMsg.includes('deactivated')

  ElNotification({
    title: isAccountSuspended ? 'Account Issue' : 'Error',
    message: messageToShow,
    type: 'error',
    duration: isAccountSuspended ? 5000 : 2000,
  })
} catch (err: any) {
  const apiMsg =
    typeof err?.response?.data?.responseMessage === 'string'
      ? err.response.data.responseMessage.trim()
      : ''

  ElNotification({
    title: 'Error',
    message: apiMsg || err?.message || 'An unexpected error occurred. Please try again.',
    type: 'error',
    duration: 2000,
  })
} finally {
  isLoading.value = false
}

}

const goToRegister = () => {
  router.push('/register')
}

const clearErrorOnInput = () => {
  authStore.clearError()
}

const resetForm = () => {
  authStore.resetAuthState()
  if (loginFormRef.value) {
    loginFormRef.value.resetFields()
  }
}

onMounted(() => {
  authStore.clearError()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,600;1,400&display=swap');

.login-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #ffffff;
  font-family: 'IBM Plex Sans', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.background-image {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background: url('@/assets/image/blur-background.png') center/cover;
  z-index: 0;
}

.background-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background: transparent;
  opacity: 0.5;
  z-index: 1;
}

.blur-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background: rgba(0, 19, 70, 0.03);
  backdrop-filter: blur(4px);
  z-index: 2;
}

.login-card {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 0px;
  width: 881px;
  height: 597px;
  background: #ffffff;
  border-radius: 32px;
  box-shadow: 0 20px 60px rgba(0, 19, 70, 0.15);
  z-index: 3;
}

.card-left {
  width: 440px;
  height: 597px;
  background: #fff5e6;
  position: relative;
  overflow: hidden;
  flex: none;
  order: 0;
  border-top-left-radius: 32px;
  border-bottom-left-radius: 32px;
  flex-grow: 0;
}

.background-leftside {
  position: absolute;
  width: 100%;
  height: 100%;
  left: -3px;
  top: 0;
  background: url('@/assets/image/background-leftside.png') center/cover;
  z-index: 1;
}

.card-right {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 32px 48px;
  gap: 16px;
  width: 441px;
  height: 514px;
  background: #ffffff;
  flex: none;
  order: 1;
  flex-grow: 0;
  border-top-right-radius: 32px;
  border-bottom-right-radius: 32px;
}

.version-text {
  width: 345px;
  height: 16px;
  font-family: 'IBM Plex Sans';
  font-style: italic;
  font-weight: 400;
  font-size: 11px;
  line-height: 150%;
  color: rgba(0, 19, 70, 0.6);
}

.title-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;
  gap: 16px;
  width: 345px;
  height: 98px;
}

.main-title {
  width: 345px;
  height: 34px;
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 600;
  font-size: 26px;
  line-height: 34px;
  color: #001346;
  margin: 0;
}

.main-description {
  width: 345px;
  height: 48px;
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 150%;
  color: rgba(0, 19, 70, 0.6);
  margin: 0;
}

.form-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;
  width: 345px;
  height: 296px;
}

.form-field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px 0px;
  width: 345px;
  height: 116px;
}

.field-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0px;
  gap: 4px;
  width: 345px;
  height: 21px;
}

.input-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 16px;
  gap: 8px;
  width: 345px;
  height: 56px;
  border: 1px solid rgba(0, 19, 70, 0.1);
  border-radius: 8px;
  background: #ffffff;
  position: relative;
}

.password-container {
  padding: 16px 12px;
  position: relative;
}

.form-input {
  width: 313px;
  height: 24px;
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 150%;
  color: rgba(0, 19, 70, 0.4);
  background: transparent;
  border: none;
  outline: none;
}

.password-container .form-input {
  width: 273px;
}

.form-input::placeholder {
  color: rgba(0, 19, 70, 0.4);
}

.form-input:focus {
  color: #001346;
}

.label-text {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 150%;
  color: #001346;
}

.required-asterisk {
  width: 7px;
  height: 21px;
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 150%;
  color: #f24444;
}

.password-toggle-btn {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 12px;
  gap: 8px;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(0, 19, 70, 0.05);
  border-radius: 32px;
  background: transparent;
  cursor: pointer;
  color: #001346;
}

.password-toggle-btn:hover {
  background: rgba(0, 19, 70, 0.03);
}

.password-icon {
  width: 24px;
  height: 24px;
  color: #001346;
}

.submit-button {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;
  width: 186px;
  height: 56px;
  background: #0f4aea;
  border: none;
  border-radius: 32px;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 16px;
}

.submit-button:hover:not(:disabled) {
  background: #0d3ec7;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(15, 74, 234, 0.3);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-text {
  width: 122px;
  height: 24px;
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
  line-height: 150%;
  color: #ffffff;
}

.arrow-icon {
  width: 24px;
  height: 24px;
  color: #ffffff;
}

.change-password-link {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 24px;
  width: 345px;
}

.link-text {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 150%;
  color: #0f4aea;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.3s;
}

.link-text:hover {
  color: #0d3ec7;
  text-decoration: underline;
}

.form-input.error {
  border-color: #f24444 !important;
}

.error-message {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-size: 11px;
  line-height: 150%;
  color: #f24444;
  margin-top: 2px;
  margin-left: 4px;
}

@media (max-width: 1600px) {
  .login-container {
    width: 100vw;
    height: 100vh;
  }

  .background-image,
  .background-overlay,
  .blur-overlay {
    width: 100vw;
    height: 100vh;
  }
}

@media (max-width: 900px) {
  .login-card {
    flex-direction: column;
    width: 90%;
    max-width: 441px;
    height: auto;
    position: relative;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .card-left {
    width: 100%;
    height: 250px;
  }

  .card-right {
    width: 100%;
    padding: 32px 24px;
    height: auto;
  }

  .form-section {
    width: 100%;
    max-width: 345px;
  }
}
</style>
