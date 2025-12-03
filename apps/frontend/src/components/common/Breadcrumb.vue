<template>
  <div v-if="shouldShowBreadcrumb && breadcrumbs.length > 0" class="breadcrumb">
    <template v-for="(item, index) in breadcrumbs" :key="item.path || index">
      <span
        class="breadcrumb-item"
        :class="{ active: index === breadcrumbs.length - 1 }"
        @click="handleClick(item, index)"
      >
        {{ item.label }}
      </span>
      <img
        v-if="index < breadcrumbs.length - 1"
        :src="chevronIcon"
        alt=""
        class="breadcrumb-separator"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import chevronIcon from '@/assets/image/chevron--right_16.svg'

interface BreadcrumbItem {
  label: string
  path?: string
  name?: string
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

interface RouteMeta {
  breadcrumb?: {
    label: string
    parent?: {
      name: string
      label: string
    }
  }
}

const shouldShowBreadcrumb = computed(() => {
  if (!props.autoGenerate && props.items) {
    return props.items.length > 0
  }

  const matched = route.matched
  const currentRoute = matched[matched.length - 1]
  const meta = currentRoute?.meta as RouteMeta | undefined

  return meta?.breadcrumb !== undefined
})

const generateBreadcrumbs = computed(() => {
  const breadcrumbs: BreadcrumbItem[] = []
  const matched = route.matched
  const addedParents = new Set<string>()

  for (let i = 0; i < matched.length; i++) {
    const routeRecord = matched[i]
    const meta = routeRecord.meta as RouteMeta | undefined

    if (!meta?.breadcrumb) {
      continue
    }

    const breadcrumbConfig = meta.breadcrumb

    if (breadcrumbConfig.parent && !addedParents.has(breadcrumbConfig.parent.name)) {
      const parentItem: BreadcrumbItem = {
        label: breadcrumbConfig.parent.label,
        name: breadcrumbConfig.parent.name,
        clickable: true,
      }
      breadcrumbs.push(parentItem)
      addedParents.add(breadcrumbConfig.parent.name)
    }

    const isLast = i === matched.length - 1
    const item: BreadcrumbItem = {
      label: breadcrumbConfig.label,
      name: routeRecord.name as string,
      clickable: !isLast,
    }

    breadcrumbs.push(item)
  }

  return breadcrumbs
})

const breadcrumbs = computed(() => {
  if (props.items) {
    return props.items
  }
  return generateBreadcrumbs.value
})

const handleClick = (item: BreadcrumbItem, index: number) => {
  if (index === breadcrumbs.value.length - 1 || !item.clickable || !item.name) {
    return
  }

  try {
    router.push({ name: item.name })
  } catch (error) {
    console.error('Navigation error:', error)
  }
}
</script>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 4px;
  font-size: 14px;
  color: #666;
}

.breadcrumb-item {
  color: #666;
  cursor: pointer;
  transition: color 0.2s ease;
}

.breadcrumb-item:not(.active):hover {
  color: #001346;
}

.breadcrumb-item.active {
  color: #001346;
  font-weight: 600;
  cursor: default;
}

.breadcrumb-separator {
  width: 16px;
  height: 16px;
  user-select: none;
  display: inline-block;
  vertical-align: middle;
}
</style>
