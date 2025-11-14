<template>
  <div class="loading-spinner" :class="spinnerClass">
    <div v-if="type === 'spinner'" class="spinner" :style="spinnerStyle">
      <div class="spinner-inner"></div>
    </div>
    <div v-else-if="type === 'dots'" class="dots-loader">
      <div class="dot" :style="{ animationDelay: '0s' }"></div>
      <div class="dot" :style="{ animationDelay: '0.1s' }"></div>
      <div class="dot" :style="{ animationDelay: '0.2s' }"></div>
    </div>
    <div v-else-if="type === 'pulse'" class="pulse-loader">
      <div class="pulse"></div>
    </div>
    <div v-else-if="type === 'wave'" class="wave-loader">
      <div class="wave" :style="{ animationDelay: '0s' }"></div>
      <div class="wave" :style="{ animationDelay: '0.1s' }"></div>
      <div class="wave" :style="{ animationDelay: '0.2s' }"></div>
      <div class="wave" :style="{ animationDelay: '0.3s' }"></div>
      <div class="wave" :style="{ animationDelay: '0.4s' }"></div>
    </div>
    <div v-else-if="type === 'element'" class="element-loader">
      <el-icon class="is-loading" :size="size">
        <Loading />
      </el-icon>
    </div>
    <div v-if="text" class="loading-text" :style="textStyle">
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Loading } from '@element-plus/icons-vue'

interface Props {
  type?: 'spinner' | 'dots' | 'pulse' | 'wave' | 'element'
  size?: 'small' | 'medium' | 'large' | number
  color?: string
  text?: string
  overlay?: boolean
  center?: boolean
  fullscreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'spinner',
  size: 'medium',
  color: '#409eff',
  overlay: false,
  center: false,
  fullscreen: false,
})

const spinnerClass = computed(() => {
  const classes = ['loading-spinner']

  if (props.overlay) classes.push('overlay')
  if (props.center) classes.push('center')
  if (props.fullscreen) classes.push('fullscreen')

  return classes.join(' ')
})

const spinnerStyle = computed(() => {
  const sizeMap = {
    small: 20,
    medium: 40,
    large: 60,
  }

  const sizeValue = typeof props.size === 'number' ? props.size : sizeMap[props.size]

  return {
    width: `${sizeValue}px`,
    height: `${sizeValue}px`,
    borderColor: props.color,
  }
})

const textStyle = computed(() => {
  const sizeMap = {
    small: 12,
    medium: 14,
    large: 16,
  }

  const fontSize = typeof props.size === 'number' ? props.size * 0.4 : sizeMap[props.size]
  return {
    fontSize: `${fontSize}px`,
    color: props.color,
  }
})
</script>

<style scoped>
.loading-spinner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.loading-spinner.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  z-index: 1000;
}

.loading-spinner.center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.loading-spinner.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 9999;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.dots-loader {
  display: flex;
  gap: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #409eff;
  animation: bounce 1.4s ease-in-out infinite both;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }

  40% {
    transform: scale(1);
  }
}

.pulse-loader {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #409eff;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0);
    opacity: 1;
  }

  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.wave-loader {
  display: flex;
  gap: 2px;
  align-items: end;
}

.wave {
  width: 4px;
  height: 20px;
  background-color: #409eff;
  border-radius: 2px;
  animation: wave 1.2s ease-in-out infinite;
}

@keyframes wave {
  0%,
  40%,
  100% {
    transform: scaleY(0.4);
  }

  20% {
    transform: scaleY(1);
  }
}

.element-loader {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

@media (max-width: 768px) {
  .loading-spinner.fullscreen {
    padding: 20px;
  }

  .loading-text {
    font-size: 12px;
  }
}
</style>
