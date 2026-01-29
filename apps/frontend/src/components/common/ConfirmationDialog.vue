<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay">
      <div class="dialog-container" @click.stop>
        <div class="dialog-content" :class="{ 'has-input': showReasonInput }">
          <div class="dialog-text-container">
            <h3 class="dialog-title">{{ title }}</h3>
            <p class="dialog-message">{{ message }}</p>
          </div>

          <!-- Reason input for reject action -->
          <div v-if="showReasonInput" class="reason-input-container">
            <label class="reason-label">Reason for rejection <span class="required">*</span></label>
            <textarea
              v-model="reasonText"
              class="reason-textarea"
              placeholder="Please provide a reason for rejection..."
              rows="4"
              maxlength="1000"
            ></textarea>
            <p class="reason-hint">{{ reasonText.length }}/1000 characters</p>
          </div>

          <div class="dialog-actions">
            <button class="cancel-btn" @click="handleCancel">
              {{ cancelText }}
            </button>
            <button 
              :class="confirmButtonClass" 
              @click="handleConfirm"
              :disabled="showReasonInput && !reasonText.trim()"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info' | 'success'
  confirmButtonType?: 'primary' | 'danger' | 'warning' | 'info' | 'success'
  showReasonInput?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', reason?: string): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Continue',
  cancelText: 'Cancel',
  type: 'info',
  confirmButtonType: 'primary',
  showReasonInput: false,
})

const emit = defineEmits<Emits>()

const reasonText = ref('')

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Reset reason text when dialog closes
watch(visible, (newValue) => {
  if (!newValue) {
    reasonText.value = ''
  }
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
  if (props.showReasonInput) {
    emit('confirm', reasonText.value.trim())
  } else {
  emit('confirm')
  }
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
  min-height: 198px;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-end;
  padding: 24px;
  gap: 24px;
  width: 386px;
  min-height: 198px;
  background: #ffffff;
  border-radius: 16px;
  box-sizing: border-box;
}

.dialog-content.has-input {
  min-height: 350px;
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

.reason-input-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 0;
  order: 1;
}

.reason-label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-style: normal;
  font-weight: 600;
  font-size: 14px;
  line-height: 150%;
  color: #001346;
  margin: 0;
}

.required {
  color: #ef4444;
}

.reason-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 150%;
  color: #001346;
  resize: vertical;
  box-sizing: border-box;
}

.reason-textarea:focus {
  outline: none;
  border-color: #001346;
  box-shadow: 0 0 0 3px rgba(0, 19, 70, 0.1);
}

.reason-hint {
  font-family: 'IBM Plex Sans', sans-serif;
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 150%;
  color: rgba(0, 19, 70, 0.4);
  margin: 0;
  align-self: flex-end;
}

.confirm-btn-primary:disabled,
.confirm-btn-danger:disabled,
.confirm-btn-warning:disabled,
.confirm-btn-success:disabled,
.confirm-btn-info:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
