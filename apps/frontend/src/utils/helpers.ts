import { DateUtils } from '@bakong/shared'

export enum NotificationType {
  NOTIFICATION = 'NOTIFICATION',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  FLASH_NOTIFICATION = 'FLASH_NOTIFICATION',
}

export enum CategoryType {
  PRODUCT_AND_FEATURE = 'PRODUCT_AND_FEATURE',
  NEWS = 'NEWS',
  OTHER = 'OTHER',
  EVENT = 'EVENT',
}

export enum Platform {
  ALL = 'ALL',
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

export enum Language {
  KM = 'KM',
  EN = 'EN',
  JP = 'JP',
}

export enum SendType {
  SEND_NOW = 'SEND_NOW',
  SEND_SCHEDULE = 'SEND_SCHEDULE',
  SEND_INTERVAL = 'SEND_INTERVAL',
}

export enum BakongApp {
  BAKONG = 'BAKONG',
  BAKONG_TOURIST = 'BAKONG_TOURIST',
  BAKONG_JUNIOR = 'BAKONG_JUNIOR',
}

export const formatNotificationType = (type: string): string => {
  switch (type?.toUpperCase()) {
    case NotificationType.NOTIFICATION:
      return 'Notification'
    case NotificationType.ANNOUNCEMENT:
      return 'Announcement'
    case NotificationType.FLASH_NOTIFICATION:
      return 'Flash Notification'
    default:
      return type || 'Notification'
  }
}

export const formatCategoryType = (category: string): string => {
  switch (category?.toUpperCase()) {
    case CategoryType.EVENT:
      return 'Event'
    case CategoryType.PRODUCT_AND_FEATURE:
      return 'Product & features'
    case CategoryType.NEWS:
      return 'News'
    case CategoryType.OTHER:
      return 'Other'
    default:
      return category || 'Other'
  }
}

export const formatPlatform = (platform: string): string => {
  switch (platform?.toUpperCase()) {
    case Platform.IOS:
      return 'iOS'
    case Platform.ANDROID:
      return 'Android'
    case Platform.ALL:
      return 'ALL'
    default:
      return platform || 'ALL'
  }
}

export const formatBakongApp = (app: string): string => {
  switch (app?.toUpperCase()) {
    case BakongApp.BAKONG:
      return 'Bakong'
    case BakongApp.BAKONG_TOURIST:
      return 'Bakong Tourist'
    case BakongApp.BAKONG_JUNIOR:
      return 'Bakong Junior'
    default:
      return app || 'Bakong'
  }
}

export const formatFileSize = (size: number) => {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

export const passwordFormat = (password: string, strict?: boolean) => password
export const emailFormat = (email: string) => email
export const usernameFormat = (username: string) => username
export const formatStatus = (status: string) => status
export const formatDate = (date: Date) => date.toLocaleDateString()
export const getErrorMessage = (error: any) => error?.message || 'An error occurred'
export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Validation error',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  INTERNAL_SERVER_ERROR: 'Internal server error',
}

export const getRules = (rules: any) => {
  return Object.keys(rules).reduce((acc, key) => {
    acc[key] = [
      { required: rules[key].required, message: `${key} is required` },
      { validator: rules[key].customRule, trigger: 'blur' },
    ]
    return acc
  }, {} as any)
}

export const getCurrentDateTimeInCambodia = () => {
  return {
    date: DateUtils.getCurrentDateString(),
    time: DateUtils.getCurrentTimeString(),
  }
}

export const getCurrentTimePlaceholder = () => {
  return DateUtils.getCurrentTimeString()
}

export const getCurrentDatePlaceholder = () => {
  return DateUtils.getCurrentDateString()
}

export const disabledDate = (time: Date): boolean => {
  const now = DateUtils.nowInCambodia()
  const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return time.getTime() < today.getTime()
}

export const disabledHours = (scheduleDate: string | null): number[] => {
  if (!scheduleDate) return []

  try {
    const now = DateUtils.nowInCambodia()
    const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

    // Parse M/D/YYYY format properly
    const [month, day, year] = scheduleDate.split('/').map(Number)
    if (isNaN(month) || isNaN(day) || isNaN(year)) return []

    const selectedDateOnly = new Date(year, month - 1, day)

    // Compare dates (only date, not time)
    if (
      selectedDateOnly.getFullYear() === today.getFullYear() &&
      selectedDateOnly.getMonth() === today.getMonth() &&
      selectedDateOnly.getDate() === today.getDate()
    ) {
      const currentHour = now.getUTCHours()
      return Array.from({ length: currentHour }, (_, i) => i)
    }
    return []
  } catch (error) {
    // If parsing fails, don't disable any hours (safer for future dates)
    return []
  }
}

export const disabledMinutes = (selectedHour: number, scheduleDate: string | null): number[] => {
  if (!scheduleDate) return []

  try {
    const now = DateUtils.nowInCambodia()
    const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

    // Parse M/D/YYYY format properly
    const [month, day, year] = scheduleDate.split('/').map(Number)
    if (isNaN(month) || isNaN(day) || isNaN(year)) return []

    const selectedDateOnly = new Date(year, month - 1, day)

    // Compare dates (only date, not time) and check if it's today and same hour
    const isToday =
      selectedDateOnly.getFullYear() === today.getFullYear() &&
      selectedDateOnly.getMonth() === today.getMonth() &&
      selectedDateOnly.getDate() === today.getDate()

    if (isToday && selectedHour === now.getUTCHours()) {
      const currentMinute = now.getUTCMinutes()
      return Array.from({ length: currentMinute }, (_, i) => i)
    }
    return []
  } catch (error) {
    // If parsing fails, don't disable any minutes (safer for future dates)
    return []
  }
}

export const mapBackendStatusToFrontend = (
  backendStatus: string,
): 'published' | 'scheduled' | 'draft' => {
  switch (backendStatus.toUpperCase()) {
    case 'SENT':
    case 'PUBLISHED':
      return 'published'
    case 'SCHEDULED':
    case 'PENDING':
      return 'scheduled'
    case 'DRAFT':
    case 'UNSENT':
      return 'draft'
    default:
      return 'draft'
  }
}

export const mapNotificationTypeToFormType = (type: string): NotificationType => {
  const typeMap: Record<string, NotificationType> = {
    [NotificationType.NOTIFICATION]: NotificationType.NOTIFICATION,
    [NotificationType.ANNOUNCEMENT]: NotificationType.ANNOUNCEMENT,
    [NotificationType.FLASH_NOTIFICATION]: NotificationType.FLASH_NOTIFICATION,
  }
  return typeMap[type] || NotificationType.NOTIFICATION
}

export const mapPlatformToFormPlatform = (platforms: string | string[]): Platform => {
  if (Array.isArray(platforms)) {
    if (platforms.includes(Platform.ALL)) return Platform.ALL
    if (platforms.includes('BAKONG')) return Platform.ALL
    return (platforms[0] as Platform) || Platform.ALL
  }
  return (platforms as Platform) || Platform.ALL
}

export const mapTypeToNotificationType = (type: string): string => {
  return type || NotificationType.ANNOUNCEMENT
}

export const mapTypeToCategoryType = (type: string): CategoryType => {
  return (type as CategoryType) || CategoryType.OTHER
}

export const mapPlatformToEnum = (platform: string): string => {
  return platform || Platform.ALL
}

export const mapLanguageToEnum = (language: string): Language => {
  const langUpper = language.toUpperCase()

  if (langUpper === 'KM' || langUpper === 'EN' || langUpper === 'JP') {
    return langUpper as Language
  }

  switch (language.toLowerCase()) {
    case 'khmer':
      return Language.KM
    case 'english':
      return Language.EN
    case 'japan':
      return Language.JP
    default:
      return Language.EN
  }
}

export const processFile = (
  file: File,
  onSuccess: (file: File, previewUrl: string) => void,
  onError: (error: string) => void,
  validateAspectRatio: boolean = true,
  acceptTypes: string = 'image/*',
  maxSize: number = 5 * 1024 * 1024,
) => {
  const acceptedTypes = acceptTypes.split(',').map((type) => type.trim())
  const isValidType = acceptedTypes.some((type) => {
    if (type === 'image/*') return file.type.startsWith('image/')
    const baseType = type.split('/')[0]
    return file.type.startsWith(baseType + '/')
  })
  if (!isValidType) {
    onError(`File type ${file.type} is not supported. Please select a valid file.`)
    return
  }
  if (file.size > maxSize) {
    onError(
      `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds the maximum limit of ${(maxSize / 1024 / 1024).toFixed(2)}MB.`,
    )
    return
  }
  if (validateAspectRatio && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const aspectRatio = img.width / img.height
        const acceptableRatios = [4 / 3, 3 / 2, 16 / 9, 2 / 1, 21 / 9]
        const tolerance = 0.1
        const isAcceptable = acceptableRatios.some(
          (ratio) => Math.abs(aspectRatio - ratio) <= tolerance,
        )
        if (!isAcceptable) {
          const errorMsg = `Image aspect ratio ${aspectRatio.toFixed(2)}:1 is not supported. Please use images with common ratios like 16:9, 3:2, or 2:1.`
          onError(errorMsg)
          return
        }
        onSuccess(file, e.target?.result as string)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  } else {
    const reader = new FileReader()
    reader.onload = (e) => {
      onSuccess(file, e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }
}

export const compressImage = async (
  file: File,
  options?: { maxBytes?: number; maxWidth?: number; qualityStep?: number },
): Promise<{ file: File; dataUrl: string }> => {
  const maxBytes = options?.maxBytes ?? 5 * 1024 * 1024
  const maxWidth = options?.maxWidth ?? 2000
  const qualityStep = options?.qualityStep ?? 0.08

  const originalDataUrl = await new Promise<string>((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.readAsDataURL(file)
  })

  if (file.size <= maxBytes) {
    return { file, dataUrl: originalDataUrl }
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = originalDataUrl
  })

  const scale = Math.min(1, maxWidth / (img.width || maxWidth))
  const targetW = Math.max(1, Math.floor(img.width * scale))
  const targetH = Math.max(1, Math.floor(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) return { file, dataUrl: originalDataUrl }
  ctx.drawImage(img, 0, 0, targetW, targetH)

  let quality = 0.92
  let dataUrl = canvas.toDataURL(file.type.includes('png') ? 'image/png' : 'image/jpeg', quality)
  let blob = await (await fetch(dataUrl)).blob()

  while (blob.size > maxBytes && quality > 0.2) {
    quality = Math.max(0.2, quality - qualityStep)
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    blob = await (await fetch(dataUrl)).blob()
  }

  if (blob.size > maxBytes) {
    const altCanvas = document.createElement('canvas')
    altCanvas.width = Math.max(1, Math.floor(targetW * 0.8))
    altCanvas.height = Math.max(1, Math.floor(targetH * 0.8))
    const altCtx = altCanvas.getContext('2d')
    if (altCtx) {
      altCtx.drawImage(canvas, 0, 0, altCanvas.width, altCanvas.height)
      dataUrl = altCanvas.toDataURL('image/jpeg', 0.82)
      blob = await (await fetch(dataUrl)).blob()
    }
  }

  const outFile = new File([blob], file.name.replace(/\.(png|jpg|jpeg)$/i, '.jpg'), {
    type: 'image/jpeg',
  })
  return { file: outFile, dataUrl }
}

export const handleFileSelect = (event: Event, onFileSelect: (file: File) => void) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    onFileSelect(file)
  }
}

export const handleFileDrop = (event: DragEvent, onFileDrop: (file: File) => void) => {
  event.preventDefault()
  const file = event.dataTransfer?.files[0]
  if (file) {
    onFileDrop(file)
  }
}

export const triggerFileUpload = (fileInput: HTMLInputElement | undefined) => {
  fileInput?.click()
}
