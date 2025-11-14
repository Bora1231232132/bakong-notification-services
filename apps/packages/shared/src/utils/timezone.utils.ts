export class TimezoneUtils {
  private static readonly CAMBODIA_OFFSET_MS = 7 * 60 * 60 * 1000
  private static readonly CAMBODIA_OFFSET_HOURS = 7

  static toCambodiaTime(utcDate: Date | string): Date {
    const date = new Date(utcDate)
    return new Date(date.getTime() + this.CAMBODIA_OFFSET_MS)
  }

  static toUTC(cambodiaDate: Date | string): Date {
    const date = new Date(cambodiaDate)
    return new Date(date.getTime() - this.CAMBODIA_OFFSET_MS)
  }

  static nowInCambodia(): Date {
    return this.toCambodiaTime(new Date())
  }

  static nowInUTC(): Date {
    return new Date()
  }

  static createCambodiaDate(
    year: number,
    month: number,
    day: number,
    hours: number = 0,
    minutes: number = 0,
    seconds: number = 0,
  ): Date {
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))

    return new Date(utcDate.getTime() - this.CAMBODIA_OFFSET_MS)
  }

  static parseScheduleDateTime(dateStr: string, timeStr: string): Date {
    const [month, day, year] = dateStr.split('/').map(Number)
    const [hours, minutes] = timeStr.split(':').map(Number)

    return this.createCambodiaDate(year, month, day, hours, minutes)
  }

  static formatCambodiaDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const cambodiaDate = this.toCambodiaTime(date)
    return cambodiaDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...options,
    })
  }

  static formatCambodiaDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const cambodiaDate = this.toCambodiaTime(date)
    const dateStr = cambodiaDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const timeStr = cambodiaDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `${dateStr} | ${timeStr}`
  }

  static formatCambodiaTime(date: Date | string): string {
    const cambodiaDate = this.toCambodiaTime(date)
    return cambodiaDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  static getRelativeTime(date: Date | string): string {
    const cambodiaDate = this.toCambodiaTime(date)
    const now = this.nowInCambodia()

    const diffInMs = now.getTime() - cambodiaDate.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) {
      return 'Just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    } else {
      return this.formatCambodiaDate(date)
    }
  }

  static isPast(date: Date | string): boolean {
    const cambodiaDate = this.toCambodiaTime(date)
    const now = this.nowInCambodia()
    return cambodiaDate < now
  }

  static isFuture(date: Date | string): boolean {
    const cambodiaDate = this.toCambodiaTime(date)
    const now = this.nowInCambodia()
    return cambodiaDate > now
  }

  static isToday(date: Date | string): boolean {
    const cambodiaDate = this.toCambodiaTime(date)
    const today = this.nowInCambodia()
    return cambodiaDate.toDateString() === today.toDateString()
  }

  static getCurrentDateString(): string {
    const now = this.nowInCambodia()
    const month = now.getUTCMonth() + 1
    const day = now.getUTCDate()
    const year = now.getUTCFullYear()
    return `${month}/${day}/${year}`
  }

  static getCurrentTimeString(): string {
    const now = this.nowInCambodia()
    const hours = now.getUTCHours().toString().padStart(2, '0')
    const minutes = now.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  static validateScheduleDate(dateStr: string): { isValid: boolean; error?: string } {
    if (!dateStr) {
      return { isValid: false, error: 'Date is required' }
    }

    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/
    if (!dateRegex.test(dateStr)) {
      return { isValid: false, error: 'Date must be in format M/d/yyyy' }
    }

    const [month, day, year] = dateStr.split('/').map(Number)
    const scheduleDate = this.createCambodiaDate(year, month, day)

    if (this.isPast(scheduleDate)) {
      return { isValid: false, error: 'Cannot schedule in the past' }
    }

    return { isValid: true }
  }

  static validateScheduleTime(timeStr: string): { isValid: boolean; error?: string } {
    if (!timeStr) {
      return { isValid: false, error: 'Time is required' }
    }

    const timeRegex = /^\d{1,2}:\d{2}$/
    if (!timeRegex.test(timeStr)) {
      return { isValid: false, error: 'Time must be in format HH:mm' }
    }

    const [hours, minutes] = timeStr.split(':').map(Number)

    if (hours < 0 || hours > 23) {
      return { isValid: false, error: 'Hours must be between 0 and 23' }
    }

    if (minutes < 0 || minutes > 59) {
      return { isValid: false, error: 'Minutes must be between 0 and 59' }
    }

    return { isValid: true }
  }

  static getTimezoneOffsetString(): string {
    return 'UTC+7 (Cambodia Time)'
  }
}
