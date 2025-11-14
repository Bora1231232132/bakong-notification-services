import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore, UserRole } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL || '/'),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('../views/ChangePasswordView.vue'),
      meta: { requiresAuth: true },
    },

    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../views/HomeView.vue'),
        },
        {
          path: 'schedule',
          name: 'schedule',
          component: () => import('../views/ScheduleView.vue'),
        },
        {
          path: 'schedule/:id',
          name: 'schedule-detail',
          component: () => import('../views/ScheduleDetailView.vue'),
        },
        {
          path: 'templates',
          name: 'templates',
          component: () => import('../views/TypeView.vue'),
        },
        {
          path: 'notifications/create',
          name: 'create-notification',
          component: () => import('../views/CreateNotificationView.vue'),
        },
        {
          path: 'notifications/edit/:id',
          name: 'edit-notification',
          component: () => import('../views/CreateNotificationView.vue'),
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('../views/UsersView.vue'),
          meta: { requiredRole: UserRole.ADMIN_USER },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../views/SettingView.vue'),
        },
        {
          path: 'settings/change-password',
          name: 'settings-change-password',
          component: () => import('../views/SettingChangePasswordView.vue'),
        },
        {
          path: 'settings/change-profile',
          name: 'settings-change-profile',
          component: () => import('../views/SettingChangeProfileView.vue'),
        },
        {
          path: 'profile-notification-setup',
          name: 'profile-notification-setup',
          component: () => import('../views/ProfileNotificationSetup.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    const storedToken = localStorage.getItem('auth_token')
    if (!storedToken) {
      // No token found
    }

    if (!authStore.token || !authStore.user) {
      try {
        await authStore.initializeAuth()
      } catch (error) {
        // Auth initialization failed
      }
    }
  }

  const isAuthenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    if (authStore.token && !authStore.user) {
      authStore.logout()
    }
    next('/login')
    return
  }

  const requiredRole =
    to.meta.requiredRole || to.matched.find((route) => route.meta.requiredRole)?.meta.requiredRole
  if (requiredRole && isAuthenticated) {
    const userRole = authStore.user?.role
    if (!userRole || userRole !== requiredRole) {
      console.log('Router guard - insufficient permissions, redirecting to dashboard')
      next('/')
      return
    }
  }

  if ((to.name === 'login' || to.name === 'register') && isAuthenticated) {
    next('/')
    return
  }

  if (
    to.meta.requiresAuth === false &&
    !isAuthenticated &&
    to.name !== 'login' &&
    to.name !== 'register'
  ) {
    next()
    return
  }
  next()
})

export default router
