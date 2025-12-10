import { DateUtils } from '@bakong/shared'

export enum NotificationType {
  NOTIFICATION = 'NOTIFICATION',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  FLASH_NOTIFICATION = 'FLASH_NOTIFICATION',
}

// CategoryType enum removed - use categoryTypeId from API instead

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

export const formatCategoryType = (category: string | number | undefined): string => {
  if (!category) return 'Other'

  // If it's a number (categoryTypeId), we'll need the name from API
  // For now, just return the string value or formatted version
  const categoryStr = String(category).toUpperCase()

  switch (categoryStr) {
    case 'EVENT':
      return 'Event'
    case 'PRODUCT_AND_FEATURE':
      return 'Product & features'
    case 'NEWS':
      return 'News'
    case 'OTHER':
      return 'Other'
    default:
      // Try to format common patterns
      return (
        categoryStr
          .split('_')
          .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
          .join(' ') || 'Other'
      )
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

export const formatBakongApp = (app: string | undefined | null): string => {
  if (!app) return 'Bakong'
  switch (app.toUpperCase()) {
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

/**
 * Extracts and formats the Bakong platform name from various sources
 * @param sources - Object containing possible sources for platform name
 * @returns Formatted platform name or 'this platform' as fallback
 */
export const getFormattedPlatformName = (sources: {
  platformName?: string
  bakongPlatform?: string
  notification?: { bakongPlatform?: string }
}): string => {
  if (sources.platformName) {
    return sources.platformName
  }
  if (sources.bakongPlatform) {
    return formatBakongApp(sources.bakongPlatform)
  }
  if (sources.notification?.bakongPlatform) {
    return formatBakongApp(sources.notification.bakongPlatform)
  }
  return 'this platform'
}

/**
 * Creates a formatted message for "no users available" notification
 * @param platformName - The formatted platform name (e.g., "Bakong Tourist")
 * @returns HTML-formatted message string
 */
export const getNoUsersAvailableMessage = (platformName: string): string => {
  return `No users are available yet for <strong>${platformName}</strong>, so it will be saved as a draft and sent once users are available.`
}

/**
 * Notification message result interface
 */
export interface NotificationMessageResult {
  title: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  duration: number
  dangerouslyUseHTMLString?: boolean
}

/**
 * Determines the appropriate notification message based on send result
 * @param result - The API response result data
 * @param platformName - The formatted platform name (optional)
 * @param bakongPlatform - The raw bakongPlatform value (optional, e.g., "BAKONG", "BAKONG_TOURIST")
 * @returns Notification message configuration
 */
export const getNotificationMessage = (
  result: any,
  platformName?: string,
  bakongPlatform?: string,
): NotificationMessageResult => {
  const failedDueToInvalidTokens = result?.failedDueToInvalidTokens === true
  const failedCount = result?.failedCount || 0
  const successfulCount = result?.successfulCount || 0
  const savedAsDraftNoUsers = result?.savedAsDraftNoUsers === true

  // Get formatted platform name with bakongPlatform info
  const formattedPlatform =
    platformName || (bakongPlatform ? formatBakongApp(bakongPlatform) : 'this platform')
  const platformInfo = bakongPlatform ? ` for <strong>${formattedPlatform}</strong>` : ''

  // Case 1: Invalid tokens (highest priority)
  if (failedDueToInvalidTokens && failedCount > 0) {
    return {
      title: 'Invalid User Data',
      message: `Failed to send notification${platformInfo} to ${failedCount} user(s) due to invalid user data (wrong FCM tokens). The notification has been saved as a draft. Please sync user data or wait for mobile apps to update their tokens.`,
      type: 'error',
      duration: 6000,
      dangerouslyUseHTMLString: !!bakongPlatform,
    }
  }

  // Case 2: No users available (only if no failures and savedAsDraftNoUsers is true)
  if (savedAsDraftNoUsers && failedCount === 0 && successfulCount === 0) {
    return {
      title: 'Info',
      message: getNoUsersAvailableMessage(formattedPlatform),
      type: 'info',
      duration: 3000,
      dangerouslyUseHTMLString: true,
    }
  }

  // Case 3: All sends failed (generic failure)
  if (successfulCount === 0 && failedCount > 0) {
    return {
      title: 'Warning',
      message: `Failed to send notification${platformInfo} to ${failedCount} user(s). The notification has been saved as a draft.`,
      type: 'warning',
      duration: 5000,
      dangerouslyUseHTMLString: !!bakongPlatform,
    }
  }

  // Case 4: Partial success (some succeeded, some failed)
  if (successfulCount > 0 && failedCount > 0) {
    return {
      title: 'Partial Success',
      message: `Notification${platformInfo} sent to ${successfulCount} user(s) successfully. Failed to send to ${failedCount} user(s).`,
      type: 'success',
      duration: 5000,
      dangerouslyUseHTMLString: !!bakongPlatform,
    }
  }

  // Case 5: Full success (default - should be handled by caller, but included for completeness)
  if (successfulCount > 0 && failedCount === 0) {
    return {
      title: 'Success',
      message: `Notification${platformInfo} sent successfully to ${successfulCount} user(s).`,
      type: 'success',
      duration: 3000,
      dangerouslyUseHTMLString: !!bakongPlatform,
    }
  }

  // Default fallback
  return {
    title: 'Info',
    message: `Notification${platformInfo} has been saved as a draft.`,
    type: 'info',
    duration: 3000,
    dangerouslyUseHTMLString: !!bakongPlatform,
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
    // If both IOS and ANDROID are present, treat as ALL
    const hasIOS = platforms.includes(Platform.IOS) || platforms.includes('IOS')
    const hasAndroid = platforms.includes(Platform.ANDROID) || platforms.includes('ANDROID')
    if (hasIOS && hasAndroid) return Platform.ALL
    // Return the first platform if only one is present
    return (platforms[0] as Platform) || Platform.ALL
  }
  return (platforms as Platform) || Platform.ALL
}

export const mapTypeToNotificationType = (type: string): string => {
  return type || NotificationType.ANNOUNCEMENT
}

export const mapTypeToCategoryType = (type: string | number | undefined): number | string => {
  // Return the type as-is (could be categoryTypeId number or name string)
  return type || 'OTHER'
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

export const processFile = async (
  file: File,
  onSuccess: (file: File, previewUrl: string, wasConverted?: boolean) => void,
  onError: (error: string) => void,
  validateAspectRatio: boolean = true,
  acceptTypes: string = 'image/*',
  maxSize: number = 2 * 1024 * 1024, // 2MB default (safer for batch uploads)
  autoConvert: boolean = true, // New parameter: automatically convert instead of rejecting
  targetAspectRatio: number = 2 / 1, // Default to 2:1 as shown in UI
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

  // If auto-convert is enabled, process the image automatically
  if (autoConvert && file.type.startsWith('image/')) {
    try {
      // Check if conversion is needed
      const needsSizeConversion = file.size > maxSize
      let needsAspectRatioConversion = false

      if (validateAspectRatio) {
        const imageCheck = await new Promise<{ needsConversion: boolean; aspectRatio: number }>(
          (resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const img = new Image()
              img.onload = () => {
                const aspectRatio = img.width / img.height
                // Only accept 2:1 aspect ratio (or 880:440 which is also 2:1)
                const targetRatio = 2 / 1
                const tolerance = 0.05 // 5% tolerance for rounding
                const isAcceptable = Math.abs(aspectRatio - targetRatio) <= tolerance
                resolve({ needsConversion: !isAcceptable, aspectRatio })
              }
              img.onerror = () => resolve({ needsConversion: false, aspectRatio: 1 })
              img.src = e.target?.result as string
            }
            reader.readAsDataURL(file)
          },
        )
        needsAspectRatioConversion = imageCheck.needsConversion
      }

      // If conversion is needed, process the image
      if (needsSizeConversion || needsAspectRatioConversion) {
        const {
          file: convertedFile,
          dataUrl,
          wasConverted,
        } = await compressImage(file, {
          maxBytes: maxSize,
          maxWidth: 2000,
          targetAspectRatio,
          correctAspectRatio: validateAspectRatio && needsAspectRatioConversion,
        })

        onSuccess(convertedFile, dataUrl, wasConverted)
        return
      } else {
        // No conversion needed, just return the original file
        const reader = new FileReader()
        reader.onload = (e) => {
          onSuccess(file, e.target?.result as string, false)
        }
        reader.readAsDataURL(file)
        return
      }
    } catch (error) {
      console.error('Error processing image:', error)
      onError('Failed to process image. Please try again.')
      return
    }
  }

  // If no conversion needed or auto-convert is disabled, validate normally
  if (file.size > maxSize && !autoConvert) {
    onError(
      `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds the maximum limit of ${(maxSize / 1024 / 1024).toFixed(2)}MB.`,
    )
    return
  }

  if (validateAspectRatio && file.type.startsWith('image/') && !autoConvert) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const aspectRatio = img.width / img.height
        // Only accept 2:1 aspect ratio (or 880:440 which is also 2:1)
        const targetRatio = 2 / 1
        const tolerance = 0.05 // 5% tolerance for rounding
        const isAcceptable = Math.abs(aspectRatio - targetRatio) <= tolerance
        if (!isAcceptable) {
          const errorMsg = `Image aspect ratio ${aspectRatio.toFixed(2)}:1 is not supported. Please use images with 2:1 aspect ratio (e.g., 880:440).`
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

/**
 * Corrects image aspect ratio to target ratio (default 2:1)
 * Uses padding (letterboxing/pillarboxing) to show full image without cropping
 * Returns canvas dimensions and where to draw the original image
 */
export const correctAspectRatio = async (
  img: HTMLImageElement,
  targetRatio: number = 2 / 1,
): Promise<{
  canvasWidth: number
  canvasHeight: number
  imageDrawX: number
  imageDrawY: number
  imageDrawWidth: number
  imageDrawHeight: number
  usePadding: boolean
}> => {
  const currentRatio = img.width / img.height
  const tolerance = 0.05 // 5% tolerance

  // If aspect ratio is already close to target, no correction needed
  if (Math.abs(currentRatio - targetRatio) <= tolerance) {
    return {
      canvasWidth: img.width,
      canvasHeight: img.height,
      imageDrawX: 0,
      imageDrawY: 0,
      imageDrawWidth: img.width,
      imageDrawHeight: img.height,
      usePadding: false,
    }
  }

  let canvasWidth: number
  let canvasHeight: number
  let imageDrawX: number
  let imageDrawY: number
  let imageDrawWidth: number
  let imageDrawHeight: number

  if (currentRatio > targetRatio) {
    // Image is wider than target - add vertical padding (letterboxing)
    // Canvas width = image width, canvas height = width / targetRatio
    // Image is drawn at full size, centered vertically
    canvasWidth = img.width
    canvasHeight = Math.floor(img.width / targetRatio)
    imageDrawX = 0
    imageDrawY = Math.floor((canvasHeight - img.height) / 2) // Center vertically
    imageDrawWidth = img.width
    imageDrawHeight = img.height
  } else {
    // Image is taller than target - add horizontal padding (pillarboxing)
    // Canvas height = image height, canvas width = height * targetRatio
    // Image is drawn at full size, centered horizontally
    canvasWidth = Math.floor(img.height * targetRatio)
    canvasHeight = img.height
    imageDrawX = Math.floor((canvasWidth - img.width) / 2) // Center horizontally
    imageDrawY = 0
    imageDrawWidth = img.width
    imageDrawHeight = img.height
  }

  return {
    canvasWidth,
    canvasHeight,
    imageDrawX,
    imageDrawY,
    imageDrawWidth,
    imageDrawHeight,
    usePadding: true,
  }
}

export const compressImage = async (
  file: File,
  options?: {
    maxBytes?: number
    maxWidth?: number
    qualityStep?: number
    targetAspectRatio?: number
    correctAspectRatio?: boolean
  },
): Promise<{ file: File; dataUrl: string; wasConverted?: boolean }> => {
  const maxBytes = options?.maxBytes ?? 5 * 1024 * 1024
  const maxWidth = options?.maxWidth ?? 2000
  const qualityStep = options?.qualityStep ?? 0.08
  const targetAspectRatio = options?.targetAspectRatio ?? 2 / 1
  const shouldCorrectAspectRatio = options?.correctAspectRatio ?? false

  const originalDataUrl = await new Promise<string>((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = originalDataUrl
  })

  let wasConverted = false
  let canvasWidth = img.width
  let canvasHeight = img.height
  let imageDrawX = 0
  let imageDrawY = 0
  let imageDrawWidth = img.width
  let imageDrawHeight = img.height
  let usePadding = false

  // Correct aspect ratio if needed
  if (shouldCorrectAspectRatio) {
    const corrected = await correctAspectRatio(img, targetAspectRatio)
    canvasWidth = corrected.canvasWidth
    canvasHeight = corrected.canvasHeight
    imageDrawX = corrected.imageDrawX
    imageDrawY = corrected.imageDrawY
    imageDrawWidth = corrected.imageDrawWidth
    imageDrawHeight = corrected.imageDrawHeight
    usePadding = corrected.usePadding

    // Check if aspect ratio was actually corrected
    const currentRatio = img.width / img.height
    if (Math.abs(currentRatio - targetAspectRatio) > 0.05) {
      wasConverted = true
    }
  }

  // Scale down if canvas is too wide
  const scale = Math.min(1, maxWidth / (canvasWidth || maxWidth))
  if (scale < 1) {
    // Scale canvas dimensions
    const originalCanvasWidth = canvasWidth
    const originalCanvasHeight = canvasHeight
    canvasWidth = Math.max(1, Math.floor(canvasWidth * scale))
    canvasHeight = Math.max(1, Math.floor(canvasHeight * scale))

    // Scale image draw dimensions proportionally
    if (usePadding) {
      const scaleX = canvasWidth / originalCanvasWidth
      const scaleY = canvasHeight / originalCanvasHeight
      imageDrawX = Math.floor(imageDrawX * scaleX)
      imageDrawY = Math.floor(imageDrawY * scaleY)
      imageDrawWidth = Math.floor(imageDrawWidth * scaleX)
      imageDrawHeight = Math.floor(imageDrawHeight * scaleY)
    } else {
      imageDrawWidth = canvasWidth
      imageDrawHeight = canvasHeight
    }

    wasConverted = true
  }

  // Check if size compression is needed
  const needsSizeCompression = file.size > maxBytes

  // If no conversion needed at all, return original
  if (!wasConverted && !needsSizeCompression) {
    return { file, dataUrl: originalDataUrl, wasConverted: false }
  }

  // Mark as converted if size compression is needed
  if (needsSizeCompression) {
    wasConverted = true
  }

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return { file, dataUrl: originalDataUrl, wasConverted: false }

  // Fill canvas with white background (for padding areas)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Draw the full image (with padding if aspect ratio was corrected)
  if (usePadding) {
    // Draw full image centered with padding (letterboxing/pillarboxing)
    ctx.drawImage(img, imageDrawX, imageDrawY, imageDrawWidth, imageDrawHeight)
  } else {
    // Draw image normally (scaled if needed)
    ctx.drawImage(img, 0, 0, imageDrawWidth, imageDrawHeight)
  }

  let quality = 0.92
  let dataUrl = canvas.toDataURL(file.type.includes('png') ? 'image/png' : 'image/jpeg', quality)
  let blob = await (await fetch(dataUrl)).blob()

  // Compress if still too large
  while (blob.size > maxBytes && quality > 0.2) {
    quality = Math.max(0.2, quality - qualityStep)
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    blob = await (await fetch(dataUrl)).blob()
    wasConverted = true
  }

  // Further reduce size if still too large
  if (blob.size > maxBytes) {
    let targetW = canvasWidth
    let targetH = canvasHeight
    const altCanvas = document.createElement('canvas')
    altCanvas.width = Math.max(1, Math.floor(targetW * 0.8))
    altCanvas.height = Math.max(1, Math.floor(targetH * 0.8))
    const altCtx = altCanvas.getContext('2d')
    if (altCtx) {
      altCtx.imageSmoothingEnabled = true
      altCtx.imageSmoothingQuality = 'high'
      altCtx.drawImage(canvas, 0, 0, altCanvas.width, altCanvas.height)
      dataUrl = altCanvas.toDataURL('image/jpeg', 0.82)
      blob = await (await fetch(dataUrl)).blob()
      targetW = altCanvas.width
      targetH = altCanvas.height
      wasConverted = true
    }
  }

  const outFile = new File([blob], file.name.replace(/\.(png|jpg|jpeg)$/i, '.jpg'), {
    type: 'image/jpeg',
  })
  return { file: outFile, dataUrl, wasConverted }
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
