<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay">
      <div class="dialog-container" @click.stop>
        <div class="dialog-content">
          <div class="dialog-text-container">
            <h3 class="dialog-title">{{ title }}</h3>
            <p class="dialog-message">{{ message }}</p>
          </div>

          <div class="dialog-actions">
            <button class="cancel-btn" @click="handleCancel">
              {{ cancelText }}
            </button>
            <button :class="confirmButtonClass" @click="handleConfirm">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info' | 'success'
  confirmButtonType?: 'primary' | 'danger' | 'warning' | 'info' | 'success'
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Continue',
  cancelText: 'Cancel',
  type: 'info',
  confirmButtonType: 'primary',
})

const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const confirmButtonClass = computed(() => {
  switch (props.confirmButtonType) {
    case 'danger':
      return 'confirm-btn-danger'
    case 'warning':
      return 'confirm-btn-warning'
    case 'success':
      return 'confirm-btn-success'
    case 'info':
      return 'confirm-btn-info'
    case 'primary':
      return 'confirm-btn-primary'
    default:
      return 'confirm-btn-primary'
  }
})

const handleConfirm = () => {
  emit('confirm')
  visible.value = false
}

const handleCancel = () => {
  emit('cancel')
  visible.value = false
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 19, 70, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.dialog-container {
  position: relative;
  width: 386px;
  height: 198px;
  /* height: 217px; */
}

.dialog-content {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-end;
  padding: 24px;
  gap: 24px;
  width: 386px;
  /* min-height: 217px; */
  background: #ffffff;
  border-radius: 16px;
  box-sizing: border-box;
}

.dialog-text-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;
  gap: 5px;
  width: 338px;
  flex: none;
  order: 0;
  align-self: stretch;
  flex-grow: 0;
}

.dialog-title {
  width: 338px;
  height: 27px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-style: normal;
  font-weight: 600;
  font-size: 18px;
  line-height: 150%;
  color: #001346;
  margin: 0;
  flex: none;
  order: 0;
  align-self: stretch;
  flex-grow: 0;
}

.dialog-message {
  width: 338px;
  /* height: 57px; */
  font-family: 'IBM Plex Sans', sans-serif;
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 19px;
  color: rgba(0, 19, 70, 0.4);
  margin: 0;
  flex: none;
  order: 1;
  align-self: stretch;
  flex-grow: 0;
  letter-spacing: 0.5px;
}

.dialog-actions {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 0px;
  gap: 16px;
  width: 100%;
  height: 56px;
  flex: none;
  order: 1;
  flex-grow: 0;
  justify-content: flex-end;
}

.cancel-btn {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;
  min-width: 99px;
  height: 56px;
  background: rgba(0, 19, 70, 0.05);
  backdrop-filter: blur(64px);
  border-radius: 32px;
  border: none;
  cursor: pointer;
  flex: none;
  order: 0;
  flex-grow: 0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
  line-height: 150%;
  color: #001346;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.cancel-btn:hover {
  background: rgba(0, 19, 70, 0.1);
}

.confirm-btn-danger {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;
  min-width: 99px;
  height: 56px;
  background: #f24444;
  border-radius: 32px;
  border: none;
  cursor: pointer;
  flex: none;
  order: 1;
  flex-grow: 0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
  line-height: 150%;
  color: #ffffff;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.confirm-btn-danger:hover {
  background: #e53935;
}

.confirm-btn-warning {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;
  min-width: 99px;
  height: 56px;
  background: #ff9800;
  border-radius: 32px;
  border: none;
  cursor: pointer;
  flex: none;
  order: 1;
  flex-grow: 0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
  line-height: 150%;
  color: #ffffff;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.confirm-btn-warning:hover {
  background: #f57c00;
}

.confirm-btn-success {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;
  min-width: 99px;
  height: 56px;
  background: #4caf50;
  border-radius: 32px;
  border: none;
  cursor: pointer;
  flex: none;
  order: 1;
  flex-grow: 0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
  line-height: 150%;
  color: #ffffff;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.confirm-btn-success:hover {
  background: #45a049;
}

.confirm-btn-info {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;
  min-width: 99px;
  height: 56px;
  background: #2196f3;
  border-radius: 32px;
  border: none;
  cursor: pointer;
  flex: none;
  order: 1;
  flex-grow: 0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
  line-height: 150%;
  color: #ffffff;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.confirm-btn-info:hover {
  background: #1976d2;
}

.confirm-btn-primary {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;
  min-width: 109px;
  height: 56px;
  background: #001346;
  border-radius: 32px;
  border: none;
  cursor: pointer;
  flex: none;
  order: 1;
  flex-grow: 0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
  line-height: 150%;
  color: #ffffff;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.confirm-btn-primary:hover {
  background: #000a2e;
}
</style>
