<template>
  <div class="app-layout">
    <div class="header" :class="{ expanded: isSidebarCollapsed }">
      <div class="header-content">
        <div class="page-title">
          <h1>{{ pageTitle }}</h1>
          <Breadcrumb />
        </div>
        <div class="header-actions">
          <el-button
            type="primary"
            class="create-notification-btn"
            @click="handleCreateNotification"
          >
            Create Notification
            <div class="plus-icon">
              <el-icon>
                <CirclePlus />
              </el-icon>
            </div>
          </el-button>
          <div class="user-avatar">
            <img
              :src="avatarUrl"
              alt="User Avatar"
              class="user-image"
              @click="handleGoToSettings"
              @error="handleImageError"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <div class="sidebar-content" :class="{ collapsed: isSidebarCollapsed }">
        <div class="sidebar-header">
          <div class="logo">
            <img :src="nbcLogo" alt="NBC Logo" class="logo-image" />
          </div>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section">
            <div class="nav-section-title">Notification</div>
            <div
              class="nav-item"
              :class="{ active: $route.name === 'home' }"
              @click="$router.push('/')"
            >
              <img :src="homeIcon" alt="Home" class="nav-icon" />
              <span>Home</span>
            </div>
          </div>

          <div class="nav-section">
            <div
              class="nav-item"
              :class="{ active: $route.name === 'schedule' }"
              @click="$router.push('/schedule')"
            >
              <img :src="calendarIcon" alt="Schedule" class="nav-icon" />
              <span>Schedule</span>
            </div>
          </div>

          <div class="nav-section">
            <div
              class="nav-item"
              :class="{ active: $route.name === 'templates' }"
              @click="$router.push('/templates')"
            >
              <img :src="typeIcon" alt="Type" class="nav-icon" />
              <span>Type</span>
            </div>
          </div>

          <div class="nav-section">
            <div class="nav-section-title">Tools</div>
            <div
              class="nav-item"
              :class="{ active: $route.name === 'insight' }"
              @click="handleInsightClick"
            >
              <img :src="chartIcon" alt="Insight" class="nav-icon" />
              <span>Insight</span>
            </div>
            <!-- Test page - only visible in development environment -->
            <div
              v-if="isDevelopment"
              class="nav-item"
              :class="{ active: $route.name === 'test' }"
              @click="$router.push('/test')"
            >
              <el-icon class="nav-icon"><Tools /></el-icon>
              <span>Test</span>
            </div>
            <div
              class="nav-item"
              :class="{ active: $route.name === 'settings' }"
              @click="$router.push('/settings')"
            >
              <img :src="settingsIcon" alt="Setting" class="nav-icon" />
              <span>Setting</span>
            </div>
          </div>
        </nav>
      </div>
      <div class="sidebar-footer" @click="toggleSidebar">
        <div class="collapse-btn">
          <el-icon class="collapse-icon">
            <ArrowRight v-if="isSidebarCollapsed" />
            <ArrowLeft v-else />
          </el-icon>
        </div>
      </div>
    </div>

    <div class="main-content" :class="{ expanded: isSidebarCollapsed }">
      <router-view />
    </div>

    <ElDialog
      v-model="logoutDialogVisible"
      title="Logout Confirmation"
      width="400px"
      :modal-append-to-body="false"
      :close-on-click-modal="false"
      class="custom-logout-dialog"
    >
      <div class="dialog-content">
        <el-icon style="font-size: 20px; margin-right: 8px">
          <Warning class="red" />
        </el-icon>
        <span style="font-size: 14px">Are you sure you want to logout?</span>
      </div>

      <template #footer>
        <div class="dialog-footer" style="padding: 0">
          <ElButton @click="logoutDialogVisible = false">Cancel</ElButton>
          <ElButton type="primary" @click="confirmLogout"> Logout </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import { ElNotification, ElDialog } from 'element-plus'
import { Plus, ArrowLeft, ArrowRight, Warning, CirclePlus, Tools } from '@element-plus/icons-vue'
import Breadcrumb from '@/components/common/Breadcrumb.vue'

// Import images properly for production builds
// Use fallback to public folder if LogoNBC.svg is missing (handled at build time)
import nbcLogoImg from '@/assets/image/LogoNBC.svg'
import homeIconImg from '@/assets/image/Home.svg'
import calendarIconImg from '@/assets/image/Schedule.svg'
import typeIconImg from '@/assets/image/type-pattern.svg'
import chartIconImg from '@/assets/image/chart--bar-target.svg'
import settingsIconImg from '@/assets/image/settings_16.svg'
import avatarImageImg from '@/assets/image/avatar.svg'

// Explicitly declare const variables for TypeScript
const nbcLogo = nbcLogoImg
const homeIcon = homeIconImg
const calendarIcon = calendarIconImg
const typeIcon = typeIconImg
const chartIcon = chartIconImg
const settingsIcon = settingsIconImg
const avatarImage = avatarImageImg

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const { user } = authStore
const logoutDialogVisible = ref(false)
const isSidebarCollapsed = ref(false)
const avatarLoadError = ref(false)

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const avatarUrl = computed(() => {
  // If there was an error loading the avatar, use default
  if (avatarLoadError.value) {
    return avatarImage
  }
  return authStore.userAvatar || avatarImage
})

const handleImageError = (event: Event) => {
  try {
    const img = event.target as HTMLImageElement | null
    if (!img) return

    console.warn('Avatar image failed to load:', img.src)
    // Set error flag to trigger computed property update
    avatarLoadError.value = true
    // Clear the invalid URL from store
    const currentAvatar = authStore.userAvatar
    if (currentAvatar) {
      authStore.updateUserAvatar(null)
    }
  } catch (error) {
    console.error('Error in handleImageError:', error)
  }
}

// Reset error flag when avatar changes
watch(
  () => authStore.userAvatar,
  () => {
    avatarLoadError.value = false
  },
)

const pageTitle = computed(() => {
  switch (route.name) {
    case 'home':
      return 'Notification'
    case 'notifications':
      return 'Notifications'
    case 'schedule':
      return 'Schedule'
    case 'templates':
      return 'Templates'
    case 'users':
      return 'Users'
    default:
      return 'Home'
  }
})

// Check if we're in development environment (not production/SIT)
const isDevelopment = computed(() => {
  // In Vite, import.meta.env.DEV is true in development mode
  // import.meta.env.PROD is true in production/SIT builds
  return import.meta.env.DEV || import.meta.env.MODE === 'development'
})

const handleCreateNotification = () => {
  router.push('/notifications/create')
}

const handleGoToSettings = () => {
  router.push('/settings')
}

const handleInsightClick = () => {
  ElNotification({
    title: 'Info',
    type: 'info',
    message: 'This feature is coming soon!',
  })
}

const confirmLogout = () => {
  logoutDialogVisible.value = false
  authStore.logout()
  ElNotification({
    title: 'Success',
    type: 'success',
    message: 'Logged out successfully',
  })
  router.push('/login')
}
</script>

<style scoped>
.app-layout {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

.header {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0px 32px;
  position: fixed;
  width: calc(100vw - 200px);
  height: 90px;
  left: 200px;
  top: 0;
  border-bottom: 1px solid rgba(0, 19, 70, 0.05);
  background: #fff;
  z-index: 1000;
  transition:
    left 0.3s ease,
    width 0.3s ease;
}

.header.expanded {
  left: 64px;
  width: calc(100vw - 64px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title h1 {
  font-size: 24px;
  font-weight: 700;
  color: #001346;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.create-notification-btn {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 4px;
  width: 234px;
  height: 56px;
  background: rgba(0, 19, 70, 0.05);
  backdrop-filter: blur(64px);
  border-radius: 32px;
  flex: none;
  flex-grow: 0;
  color: #001346;
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 150%;
  letter-spacing: 0;
  border: none;
  transition: all 0.3s ease;
}

.create-notification-btn:hover {
  background: rgba(0, 19, 70, 0.1);
}

.plus-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: 8px;
}

.plus-icon .el-icon {
  font-size: 24px;
  color: #001346;
}

.plus-circle {
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: #001346;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus-symbol {
  color: white;
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
}

.user-avatar {
  cursor: pointer;
}

.user-image {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.sidebar {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0px;
  position: fixed;
  width: 200px;
  height: 100vh;
  left: 0px;
  top: 0px;
  border-right: 1px solid rgba(0, 19, 70, 0.1);
  background: #fff;
  z-index: 999;
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: 48px;
}

.sidebar-content {
  flex: 1;
  width: 100%;
  overflow: hidden;
  transition:
    opacity 0.3s ease,
    visibility 0.3s ease;
}

.sidebar-content.collapsed {
  opacity: 0;
  visibility: hidden;
}

.sidebar-header {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0px;
  gap: 8px;
  width: 200px;
  height: 90px;
  border-bottom: 1px solid rgba(0, 19, 70, 0.1);
  flex: none;
  order: 0;
  align-self: stretch;
  flex-grow: 0;
}

.logo {
  position: relative;
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  order: 0;
  flex-grow: 0;
}

.logo-image {
  position: absolute;
  width: 48.63px;
  height: 52.33px;
  left: calc(50% - 48.63px / 2 - 0.31px);
  top: calc(50% - 52.33px / 2 + 0.11px);
  object-fit: contain;
}

.sidebar-nav {
  flex: 1;
  padding: 0;
  width: 100%;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #001346;
  padding: 8px 16px;
  margin-bottom: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #666;
  font-weight: 500;
  font-size: 14px;
  position: relative;
  margin: 4px 0;
}

.nav-item:hover {
  background: rgba(102, 153, 255, 0.05);
  color: #001346;
}

.nav-item.active {
  background: var(--opacity-secondary-opacity-5, #0013460d);
  color: #001346;
  font-weight: 600;
}

.nav-item.active::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  opacity: 70%;
  background: #001346;
  border-radius: 2px 0 0 2px;
}

.nav-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.sidebar-footer {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  cursor: pointer;
  width: 100%;
  min-height: 64px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.sidebar.collapsed .sidebar-footer {
  justify-content: center;
  padding: 16px;
}

.collapse-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.collapse-btn:hover {
  background: rgba(0, 19, 70, 0.1);
}

.collapse-icon {
  font-size: 16px;
  color: #001346;
}

.main-content {
  position: fixed;
  left: 200px;
  top: 89px;
  width: calc(100vw - 200px);
  height: calc(100vh - 90px);
  padding: 25px 25px 0px 32px;
  overflow: hidden;
  background: #fff;
  transition:
    left 0.3s ease,
    width 0.3s ease;
}

.main-content.expanded {
  left: 64px;
  width: calc(100vw - 64px);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.custom-logout-dialog .el-dialog__body {
  padding: 0;
}

.dialog-content {
  display: flex;
  align-items: center;
  font-size: 14px;
  padding: 0;
}

@media (max-width: 768px) {
  .header {
    left: 0;
    width: 100vw;
    padding: 0 16px;
  }

  .sidebar {
    position: fixed;
    left: -200px;
    transition: left 0.3s ease;
  }

  .sidebar.open {
    left: 0;
  }

  .main-content {
    left: 0;
    width: 100vw;
    padding: 16px;
  }
}
</style>
