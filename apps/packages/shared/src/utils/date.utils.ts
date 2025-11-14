import { Language } from '../enums/language.enum'

export class DateUtils {
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
    let utcHours = hours - this.CAMBODIA_OFFSET_HOURS
    let utcDay = day
    let utcMonth = month
    let utcYear = year

    if (utcHours < 0) {
      utcHours += 24
      utcDay -= 1

      if (utcDay < 1) {
        utcMonth -= 1
        if (utcMonth < 1) {
          utcMonth = 12
          utcYear -= 1
        }
        const daysInPrevMonth = new Date(utcYear, utcMonth, 0).getDate()
        utcDay = daysInPrevMonth
      }
    }

    return new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, utcHours, minutes, seconds))
  }

  static getTimezoneOffsetString(): string {
    return 'UTC+7 (Cambodia Time)'
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
      ...options,
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

  static formatDateByLanguage(date: Date, language: Language): string {
    switch (language) {
      case Language.KM:
        return this.formatKhmerDate(date)
      case Language.JP:
        return this.formatJapaneseDate(date)
      case Language.EN:
      default:
        return this.formatEnglishDate(date)
    }
  }

  private static formatKhmerDate(date: Date): string {
    const khmerMonths = [
      'មករា',
      'កុម្ភៈ',
      'មីនា',
      'មេសា',
      'ឧសភា',
      'មិថុនា',
      'កក្កដា',
      'សីហា',
      'កញ្ញា',
      'តុលា',
      'វិច្ឆិកា',
      'ធ្នូ',
    ]

    const month = khmerMonths[date.getMonth()]
    const day = this.convertToKhmerNumbers(date.getDate().toString())
    const year = this.convertToKhmerNumbers(date.getFullYear().toString())

    return `${month} ${day}, ${year}`
  }

  private static formatEnglishDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  private static formatJapaneseDate(date: Date): string {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}年${month}月${day}日`
  }

  private static convertToKhmerNumbers(arabicNumber: string): string {
    const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩']
    return arabicNumber.replace(/\d/g, (digit) => khmerNumbers[parseInt(digit)])
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  static addHours(date: Date, hours: number): Date {
    const result = new Date(date)
    result.setHours(result.getHours() + hours)
    return result
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
    const now = new Date()
    const cambodiaDateStr = now.toLocaleDateString('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
    const [month, day, year] = cambodiaDateStr.split('/').map(Number)
    return `${month}/${day}/${year}`
  }

  static getCurrentTimeString(): string {
    const now = new Date()
    return now.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Phnom_Penh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  static formatUTCToCambodiaDateTime(utcDate: Date | string): { date: string; time: string } {
    const date = new Date(utcDate)
    const cambodiaDateStr = date.toLocaleString('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const [datePart, timePart] = cambodiaDateStr.split(', ')
    return {
      date: datePart || '',
      time: timePart || '',
    }
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

  static parseScheduleDateTime(dateStr: string, timeStr: string): Date {
    const [month, day, year] = dateStr.split('/').map(Number)
    const [hours, minutes] = timeStr.split(':').map(Number)
    return this.createCambodiaDate(year, month, day, hours, minutes)
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
}
export const TimezoneUtils = DateUtils
export class DateFormatter extends DateUtils {}
