import { ResponseMessage } from '@bakong/shared'
import { IsNumber, Min, IsOptional, IsBoolean } from 'class-validator'
import { Transform, Type } from 'class-transformer'

export interface PaginationMeta {
  page: number
  size: number
  itemCount: number
  pageCount: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export class PaginationParams {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  size?: number

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true
    if (value === 'false' || value === false) return false
    return false
  })
  @IsBoolean()
  isAscending?: boolean
}

export class PaginationHelper {
  static normalizePagination(page: number, size: number): { skip: number; take: number } {
    const normalizedPage = Math.max(1, Math.floor(page) || 1)
    const normalizedSize = Math.max(1, Math.min(100, Math.floor(size) || 10))

    return {
      skip: (normalizedPage - 1) * normalizedSize,
      take: normalizedSize,
    }
  }

  static calculatePaginationMeta(
    page: number,
    size: number,
    totalCount: number,
    itemCount: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(totalCount / size)
    const currentPage = page

    return {
      page: currentPage,
      size,
      itemCount,
      pageCount: totalPages,
      totalCount,
      hasPreviousPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
    }
  }

  static generatePaginationMessage(
    itemCount: number,
    page: number,
    totalCount: number,
    totalPages: number,
    isNewUser = false,
    isNoDataInPage = false,
  ): string {
    if (isNewUser) {
      return itemCount > 0
        ? `Welcome! Found ${itemCount} notification(s) for you.`
        : 'Welcome! No notifications available yet.'
    }

    if (isNoDataInPage) {
      return `No notifications found on page ${page}. Total ${totalCount} notifications available across ${totalPages} page(s). Please try page 1.`
    }

    if (itemCount === 0) {
      return 'No notifications available.'
    }

    return `Get notification center success with ${itemCount} notification(s) from page ${page} of ${totalPages}`
  }

  static generateResponseMessage(
    notifications: any[],
    totalCount: number,
    page: number,
    size: number,
    pageCount: number,
    isNewUser = false,
  ): string {
    if (isNewUser) {
      return ResponseMessage.USER_REGISTERED_SUCCESSFULLY
    }

    if (notifications.length > 0) {
      return PaginationHelper.generatePaginationMessage(
        notifications.length,
        page,
        totalCount,
        pageCount,
        false,
      )
    }

    const isNoDataInPage = PaginationHelper.isNoDataInPage(page, totalCount, size)
    if (isNoDataInPage) {
      return PaginationHelper.generatePaginationMessage(0, page, totalCount, pageCount, false, true)
    }

    return totalCount === 0
      ? ResponseMessage.NOTIFICATION_CENTER_EMPTY
      : ResponseMessage.NOTIFICATION_CENTER_EMPTY
  }

  static isNoDataInPage(page: number, totalCount: number, size: number): boolean {
    const totalPages = Math.ceil(totalCount / size)
    return page > totalPages && totalCount > 0
  }
}
