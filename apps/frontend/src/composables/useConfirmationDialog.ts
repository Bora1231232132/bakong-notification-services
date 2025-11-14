import { ref } from 'vue'

export interface ConfirmationDialogOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info' | 'success'
  confirmButtonType?: 'primary' | 'danger' | 'warning' | 'info' | 'success'
}

export function useConfirmationDialog() {
  const isVisible = ref(false)
  const options = ref<ConfirmationDialogOptions>({
    title: '',
    message: '',
    confirmText: 'Continue',
    cancelText: 'Cancel',
    type: 'info',
    confirmButtonType: 'primary',
  })

  const showDialog = (dialogOptions: ConfirmationDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      options.value = { ...options.value, ...dialogOptions }
      isVisible.value = true
      ;(window as any).__dialogResolve = resolve
    })
  }

  const handleConfirm = () => {
    isVisible.value = false
    if ((window as any).__dialogResolve) {
      ;(window as any).__dialogResolve(true)
      ;(window as any).__dialogResolve = null
    }
  }

  const handleCancel = () => {
    isVisible.value = false
    if ((window as any).__dialogResolve) {
      ;(window as any).__dialogResolve(false)
      ;(window as any).__dialogResolve = null
    }
  }

  const showLogoutDialog = () => {
    return showDialog({
      title: 'Logout of this system?',
      message:
        'Once logout, you can login back with username and password. If you forgot, you can check with admin.',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      type: 'danger',
      confirmButtonType: 'danger',
    })
  }

  const showDeleteDialog = (itemName: string = 'item') => {
    return showDialog({
      title: 'You want to delete?',
      message: `This action cannot be undone. This will permanently delete ${itemName} and remove data from our servers.`,
      confirmText: 'Continue',
      cancelText: 'Cancel',
      type: 'danger',
      confirmButtonType: 'primary',
    })
  }

  const showPublishDialog = (itemName: string = 'content') => {
    return showDialog({
      title: 'Publish this content?',
      message: `Are you sure you want to publish this ${itemName}? It will be visible to all users.`,
      confirmText: 'Publish',
      cancelText: 'Cancel',
      type: 'warning',
      confirmButtonType: 'warning',
    })
  }

  const showSaveDialog = () => {
    return showDialog({
      title: 'Save changes?',
      message: 'You have unsaved changes. Do you want to save them before continuing?',
      confirmText: 'Save',
      cancelText: 'Discard',
      type: 'info',
      confirmButtonType: 'info',
    })
  }

  return {
    isVisible,
    options,
    showDialog,
    handleConfirm,
    handleCancel,
    showLogoutDialog,
    showDeleteDialog,
    showPublishDialog,
    showSaveDialog,
  }
}
