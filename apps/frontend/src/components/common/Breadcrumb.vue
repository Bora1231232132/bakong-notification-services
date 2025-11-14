<template>
  <div v-if="shouldShowBreadcrumb" class="breadcrumb">
    <template v-for="(item, index) in breadcrumbs" :key="item.path">
      <span
        class="breadcrumb-item"
        :class="{ active: index === breadcrumbs.length - 1 }"
        @click="handleClick(item, index)"
      >
        {{ item.label }}
      </span>
      <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator"> / </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

interface BreadcrumbItem {
  label: string
  path: string
  clickable?: boolean
}

interface Props {
  items?: BreadcrumbItem[]
  autoGenerate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoGenerate: true,
})

const router = useRouter()
const route = useRoute()

const mainSidebarPages = ['/', '/notifications', '/templates', '/users', '/schedule']

const shouldShowBreadcrumb = computed(() => {
  const currentPath = route.path
  return !mainSidebarPages.includes(currentPath)
})

const autoBreadcrumbs = computed(() => {
  const pathSegments = route.path.split('/').filter((segment) => segment)
  const breadcrumbs: BreadcrumbItem[] = []
  let currentPath = ''

  for (let i = 0; i < pathSegments.length; i++) {
    currentPath += `/${pathSegments[i]}`
    let label = pathSegments[i]
    let clickable = true

    switch (pathSegments[i]) {
      case 'templates':
        label = 'Templates'
        break
      case 'notifications':
        label = 'Notifications'
        break
      case 'users':
        label = 'Users'
        break
      case 'create':
        label = 'Create New'
        clickable = false
        break
      default:
        if (/^\d+$/.test(pathSegments[i])) {
          label = 'Detail'
          clickable = false
        } else {
          label = pathSegments[i].charAt(0).toUpperCase() + pathSegments[i].slice(1)
        }
    }
    breadcrumbs.push({
      label,
      path: currentPath,
      clickable,
    })
  }

  return breadcrumbs
})

const breadcrumbs = computed(() => {
  return props.items || autoBreadcrumbs.value
})

const handleClick = (item: BreadcrumbItem, index: number) => {
  if (index === breadcrumbs.value.length - 1 || !item.clickable) {
    return
  }
  router.push(item.path)
}
</script>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 14px;
}

.breadcrumb-item {
  color: #666;
  cursor: pointer;
  transition: color 0.2s ease;
}

.breadcrumb-item:not(.active):hover {
  color: #409eff;
}

.breadcrumb-item.active {
  color: #333;
  font-weight: 500;
  cursor: default;
}

.breadcrumb-separator {
  color: #ccc;
  user-select: none;
}
</style>
