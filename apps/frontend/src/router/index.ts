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
      meta: { requiresAuth: true, breadcrumb: { label: 'Notification' } },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../views/HomeView.vue'),
          meta: { breadcrumb: { label: 'Home' } },
        },
        {
          path: 'schedule',
          name: 'schedule',
          component: () => import('../views/ScheduleView.vue'),
          meta: { breadcrumb: { label: 'Schedule' } },
        },
        {
          path: 'schedule/:id',
          name: 'schedule-detail',
          component: () => import('../views/ScheduleDetailView.vue'),
          meta: {
            breadcrumb: {
              label: 'Schedule Detail',
              parent: { name: 'schedule', label: 'Schedule' },
            },
          },
        },
        {
          path: 'templates',
          name: 'templates',
          component: () => import('../views/TypeView.vue'),
          meta: { breadcrumb: { label: 'Templates' } },
        },
        {
          path: 'templates/create',
          name: 'create-template',
          component: () => import('../views/AddNewNotificationTypeView.vue'),
          meta: {
            breadcrumb: {
              label: 'Create Template',
              parent: { name: 'templates', label: 'Templates' },
            },
          },
        },
        {
          path: 'templates/view/:id',
          name: 'view-template',
          component: () => import('../views/AddNewNotificationTypeView.vue'),
          meta: {
            breadcrumb: {
              label: 'View Template',
              parent: { name: 'templates', label: 'Templates' },
            },
          },
        },
        {
          path: 'templates/edit/:id',
          name: 'edit-template',
          component: () => import('../views/AddNewNotificationTypeView.vue'),
          meta: {
            breadcrumb: {
              label: 'Edit Template',
              parent: { name: 'templates', label: 'Templates' },
            },
          },
        },
        {
          path: 'notifications/create',
          name: 'create-notification',
          component: () => import('../views/CreateNotificationView.vue'),
          meta: {
            breadcrumb: {
              label: 'Create Notification',
              parent: { name: 'home', label: 'Home' },
            },
          },
        },
        {
          path: 'notifications/edit/:id',
          name: 'edit-notification',
          component: () => import('../views/CreateNotificationView.vue'),
          meta: {
            breadcrumb: {
              label: 'Edit Notification',
              parent: { name: 'home', label: 'Home' },
            },
          },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('../views/UsersView.vue'),
          meta: {
            requiredRole: UserRole.ADMIN_USER,
            breadcrumb: { label: 'Users' },
          },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../views/SettingView.vue'),
          meta: { breadcrumb: { label: 'Settings' } },
        },
        {
          path: 'settings/change-password',
          name: 'settings-change-password',
          component: () => import('../views/SettingChangePasswordView.vue'),
          meta: {
            breadcrumb: {
              label: 'Change Password',
              parent: { name: 'settings', label: 'Settings' },
            },
          },
        },
        {
          path: 'settings/change-profile',
          name: 'settings-change-profile',
          component: () => import('../views/SettingChangeProfileView.vue'),
          meta: {
            breadcrumb: {
              label: 'Change Profile',
              parent: { name: 'settings', label: 'Settings' },
            },
          },
        },
        {
          path: 'profile-notification-setup',
          name: 'profile-notification-setup',
          component: () => import('../views/ProfileNotificationSetup.vue'),
          meta: {
            breadcrumb: {
              label: 'Profile Notification Setup',
              parent: { name: 'settings', label: 'Settings' },
            },
          },
        },
        {
          path: 'test',
          name: 'test',
          component: () => import('../views/TestView.vue'),
          meta: {
            breadcrumb: { label: 'Testing Tools' },
            devOnly: true, // Only available in development environment
          },
        },
      ],
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Always initialize auth state if there's a token in localStorage
  // This ensures token validation happens before any route navigation
  const storedToken = localStorage.getItem('auth_token')
  if (storedToken && (!authStore.token || !authStore.user)) {
    try {
      await authStore.initializeAuth()
    } catch (error) {
      console.error('Auth initialization failed:', error)
      // If initialization fails, clear invalid token
      authStore.logout()
    }
  } else if (!storedToken) {
    // If no token exists, ensure auth state is cleared
    if (authStore.token || authStore.user) {
      authStore.logout()
    }
  }

  const isAuthenticated = authStore.isAuthenticated

  // Check if route requires auth (check current route and all matched parent routes)
  const requiresAuth =
    to.meta.requiresAuth || to.matched.some((route) => route.meta.requiresAuth === true)

  if (requiresAuth && !isAuthenticated) {
    // Clear any stale auth state
    if (authStore.token || authStore.user) {
      authStore.logout()
    }
    // Redirect to login, but avoid infinite redirect loop
    if (to.name !== 'login' && to.name !== 'register') {
      next('/login')
      return
    }
  }

  // Check if route is dev-only and redirect if not in development
  const isDevOnly = to.meta.devOnly || to.matched.find((route) => route.meta.devOnly)?.meta.devOnly
  if (isDevOnly && import.meta.env.PROD) {
    // In production/SIT, redirect dev-only routes to home
    console.log('Router guard - dev-only route accessed in production, redirecting to home')
    next('/')
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
