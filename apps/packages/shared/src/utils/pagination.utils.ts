export interface PaginationParams {
  page?: number
  size?: number
  isAscending?: boolean
}

export interface PaginationMeta {
  page: number
  size: number
  itemCount: number
  pageCount: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export class PaginationUtils {
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

  static isNoDataInPage(page: number, totalCount: number, size: number): boolean {
    const totalPages = Math.ceil(totalCount / size)
    return page > totalPages && totalCount > 0
  }

  static generateResponseMessage(
    items: any[],
    totalCount: number,
    page: number,
    size: number,
    totalPages: number,
    isNewUser?: boolean,
  ): string {
    if (items.length === 0) {
      return 'No notifications found'
    }
    if (isNewUser) {
      return `Welcome! You have ${totalCount} notification${totalCount !== 1 ? 's' : ''}`
    }
    return `Found ${items.length} notification${items.length !== 1 ? 's' : ''} on page ${page} of ${totalPages}`
  }
}
