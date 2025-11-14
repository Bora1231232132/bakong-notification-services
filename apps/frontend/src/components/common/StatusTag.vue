<template>
  <div
    v-if="props.status?.toUpperCase() === 'INTERVALED'"
    class="custom-intervaled-tag"
    :class="`custom-intervaled-tag--${size}`"
  >
    {{ displayText }}
  </div>

  <el-tag v-else :type="tagType" :effect="tagEffect" :size="size" :class="customClass">
    <slot>{{ displayText }}</slot>
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatStatus } from '@/utils/helpers'

interface Props {
  status: string
  size?: 'large' | 'default' | 'small'
  customClass?: string
  showIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  customClass: '',
  showIcon: false,
})

const displayText = computed(() => {
  return formatStatus(props.status)
})

const tagType = computed(() => {
  switch (props.status?.toUpperCase()) {
    case 'SENT':
    case 'COMPLETED':
    case 'SUCCESS':
      return 'success'
    case 'SCHEDULED':
    case 'PENDING':
    case 'WAITING':
      return 'warning'
    case 'INTERVALED':
      return ''
    case 'PROCESSING':
    case 'IN_PROGRESS':
      return 'info'
    case 'FAILED':
    case 'ERROR':
    case 'CANCELLED':
      return 'danger'
    case 'DRAFT':
    case 'INACTIVE':
      return ''
    default:
      return 'info'
  }
})

const tagEffect = computed(() => {
  switch (props.status?.toUpperCase()) {
    case 'SENT':
    case 'COMPLETED':
    case 'SUCCESS':
      return 'light'
    case 'SCHEDULED':
    case 'PENDING':
    case 'WAITING':
      return 'light'
    case 'INTERVALED':
      return 'plain'
    case 'PROCESSING':
    case 'IN_PROGRESS':
      return 'plain'
    case 'FAILED':
    case 'ERROR':
    case 'CANCELLED':
      return 'dark'
    case 'DRAFT':
    case 'INACTIVE':
      return 'plain'
    default:
      return 'plain'
  }
})

const customClass = computed(() => {
  if (props.status?.toUpperCase() === 'INTERVALED') {
    return 'intervaled-tag'
  }
  return props.customClass || ''
})
</script>

<style scoped>
:deep(.el-tag) {
  font-weight: 500;
  border-radius: 8px;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  min-width: 60px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}

:deep(.el-tag--success.el-tag--light) {
  background-color: #f0f9ff;
  color: #059669;
  border-color: #10b981;
}

:deep(.el-tag--warning.el-tag--light) {
  background-color: #fffbeb;
  color: #d97706;
  border-color: #f59e0b;
}

:deep(.el-tag--danger.el-tag--dark) {
  background-color: #dc2626;
  color: #ffffff;
  border-color: #dc2626;
}

:deep(.el-tag--info.el-tag--plain) {
  background-color: #f3f4f6;
  color: #6b7280;
  border-color: #d1d5db;
}

:deep(.el-tag.el-tag--plain) {
  background-color: #f9fafb;
  color: #6b7280;
  border-color: #e5e7eb;
}

:deep(.el-tag:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:deep(.el-tag--small) {
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  min-width: 50px;
}

:deep(.el-tag--large) {
  font-size: 0.8rem;
  padding: 0.3rem 0.6rem;
  min-width: 80px;
}

:deep(.el-tag.intervaled-tag) {
  background-color: #f3e8ff !important;
  color: #7c3aed !important;
  border-color: #a855f7 !important;
}

:deep(.el-tag.intervaled-tag.el-tag--plain) {
  background-color: #f3e8ff !important;
  color: #7c3aed !important;
  border-color: #a855f7 !important;
}

:deep(.el-tag.intervaled-tag.el-tag--light) {
  background-color: #f3e8ff !important;
  color: #7c3aed !important;
  border-color: #a855f7 !important;
}

.intervaled-tag {
  background-color: #f3e8ff !important;
  color: #7c3aed !important;
  border-color: #a855f7 !important;
}
</style>
