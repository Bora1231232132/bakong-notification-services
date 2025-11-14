<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-card">
        <div class="logo-section">
          <div class="logo-icon">
            <el-image :src="logoUrl" alt="logo" />
          </div>
        </div>
        <div class="title-section">
          <p class="portal-title">Bakong Notification Portal</p>
          <p class="register-title">Register</p>
        </div>
        <el-form
          :model="registerFormData"
          :rules="registerRules"
          ref="registerFormRef"
          class="form"
        >
          <el-form-item prop="username">
            <el-input
              v-model="registerFormData.username"
              placeholder="Username"
              :disabled="loading"
              class="flat-input"
            >
              <template #prefix>
                <el-icon>
                  <User />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="displayName">
            <el-input
              v-model="registerFormData.displayName"
              placeholder="Email"
              :disabled="loading"
              class="flat-input"
            >
              <template #prefix>
                <el-icon>
                  <Message />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="role">
            <el-select
              v-model="registerFormData.role"
              placeholder="Select role"
              :disabled="loading"
              class="flat-input role-input"
            >
              <template #prefix>
                <el-icon>
                  <UserFilled />
                </el-icon>
              </template>
              <el-option
                v-for="role in roleOptions"
                :key="role.value"
                :label="role.label"
                :value="role.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="registerFormData.password"
              type="password"
              placeholder="Password"
              show-password
              :disabled="loading"
              class="flat-input"
            >
              <template #prefix>
                <el-icon>
                  <Lock />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerFormData.confirmPassword"
              type="password"
              placeholder="Confirm Password"
              show-password
              :disabled="loading"
              class="flat-input"
            >
              <template #prefix>
                <el-icon>
                  <Lock />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <div class="form-actions">
            <el-button
              type="primary"
              class="register-button"
              :loading="loading"
              @click="handleSubmitRegister(registerFormRef)"
            >
              {{ loading ? 'Registering...' : 'Register' }}
            </el-button>
            <el-button type="text" class="register-link" @click="goToLogin">
              Already have an account? Please login!
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useRegister } from '@/composables/useRegister'
import { useAuthStore, UserRole } from '@/stores/auth'
import { User, Message, Lock, UserFilled } from '@element-plus/icons-vue'
import logoUrl from '@/assets/image/bakonglogo.png'

const router = useRouter()
const { loading, registerFormRef, registerRules, registerFormData, submitRegister } = useRegister()
const authStore = useAuthStore()

const roleOptions = [
  { label: 'Normal User', value: UserRole.NORMAL_USER },
  { label: 'Admin User', value: UserRole.ADMIN_USER },
  { label: 'API User', value: UserRole.API_USER },
]

const handleSubmitRegister = async (formRef: any) => {
  const result = await submitRegister(formRef)
  if (result?.success) {
    router.push('/')
  }
}

const goToLogin = () => {
  authStore.clearError()
  router.push('/login')
}
</script>

<style scoped>
.register-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #fff;
}

.register-card {
  width: 360px;
  padding: 24px;
  border: 1px solid #e3e3e3;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.logo-section {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.logo-icon {
  width: 100px;
}

.title-section {
  margin-bottom: 20px;
}

.portal-title {
  font-size: 14px;
  color: #888;
}

.register-title {
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.flat-input :deep(.el-input__wrapper),
.flat-input :deep(.el-select__wrapper) {
  background: #fafbff;
  border: none;
  border-radius: 4px;
  box-shadow: none;
  padding: 10px 12px;
}

.flat-input :deep(.el-input__inner) {
  font-size: 14px;
  color: #333;
}

.flat-input :deep(.el-input__prefix) {
  margin-right: 8px;
  color: #aaa;
}

.form-actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.register-button {
  width: 73px;
  height: 34px;
  background: linear-gradient(135deg, #6699ff 0%, #5a8cff 100%);
  border: none;
  border-radius: 1px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  margin-top: 10px;
}

.register-button:hover {
  background: linear-gradient(135deg, #5a8cff 0%, #4d7aff 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 153, 255, 0.3);
}

.register-button:active {
  transform: translateY(0);
}

.register-link {
  font-size: 12px;
  color: #5788ff;
  align-items: left;
  justify-content: left;
  text-align: left;
  margin-left: 0;
}

.role-input :deep(.el-select__prefix) {
  margin-right: 8px;
  color: #aaa;
}

@media (max-width: 768px) {
  .register-page {
    padding: 1rem;
  }

  .register-card {
    width: 100%;
    max-width: 400px;
    padding: 20px;
  }

  .flat-input :deep(.el-input__wrapper),
  .flat-input :deep(.el-select__wrapper) {
    width: 100%;
  }
}
</style>
