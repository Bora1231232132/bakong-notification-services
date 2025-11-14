<template>
  <button :class="buttonClass" :style="buttonStyle" :disabled="disabled" @click="handleClick">
    <span v-if="icon && iconPosition === 'left'" class="button-icon-left">
      <img :src="icon" :alt="iconAlt" />
    </span>
    <span class="button-text">{{ text }}</span>
    <span v-if="icon && iconPosition === 'right'" class="button-icon-right">
      <img :src="icon" :alt="iconAlt" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  text: string
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  icon?: string
  iconAlt?: string
  iconPosition?: 'left' | 'right'
  width?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  disabled: false,
  iconPosition: 'right',
  iconAlt: 'Button icon',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClass = computed(() => {
  const classes = ['button']
  classes.push(`button-${props.variant}`)
  classes.push(`button-${props.size}`)

  if (props.disabled) {
    classes.push('button-disabled')
  }
  return classes.join(' ')
})

const buttonStyle = computed(() => {
  const style: Record<string, string> = {}

  if (props.width) {
    style.width = props.width
  }

  if (props.height) {
    style.height = props.height
  }

  return style
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>

<style scoped>
.button {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 32px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
  flex: none;
  flex-grow: 0;
}

.button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(15, 74, 234, 0.2);
}

.button-small {
  padding: 6px 12px;
  font-size: 12px;
  height: 40px;
  min-width: 80px;
}

.button-medium {
  padding: 8px 16px;
  font-size: 14px;
  height: 56px;
  min-width: 100px;
}

.button-large {
  padding: 12px 24px;
  font-size: 16px;
  height: 64px;
  min-width: 120px;
}

.button-primary {
  background: #0f4aea;
  color: white;
}

.button-primary:hover:not(.button-disabled) {
  background: #0d3fd1;
}

.button-secondary {
  background: rgba(0, 19, 70, 0.05);
  backdrop-filter: blur(64px);
  color: #001346;
}

.button-secondary:hover:not(.button-disabled) {
  background: rgba(0, 19, 70, 0.1);
}

.button-danger {
  background: #ef4444;
  color: white;
}

.button-danger:hover:not(.button-disabled) {
  background: #dc2626;
}

.button-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-disabled:hover {
  background: inherit !important;
}

.button-icon-left,
.button-icon-right {
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-icon-left img,
.button-icon-right img {
  width: 16px;
  height: 16px;
}

.button-text {
  white-space: nowrap;
}

.button[style*='width'] {
  min-width: unset;
}

.button[style*='height'] {
  height: unset;
}
</style>
