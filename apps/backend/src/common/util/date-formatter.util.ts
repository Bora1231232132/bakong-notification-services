import { Language } from '@bakong/shared'

export class DateFormatter {
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
}
