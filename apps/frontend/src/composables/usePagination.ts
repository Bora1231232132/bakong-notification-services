import { reactive, computed } from 'vue'

export interface PaginationState {
  currentPage: number
  pageSize: number
  total: number
  loading: boolean
}

export interface PaginationConfig {
  initialPageSize?: number
  pageSizes?: number[]
  onPageChange?: (page: number, pageSize: number) => Promise<void>
  onSizeChange?: (pageSize: number) => Promise<void>
}

export function usePagination(config: PaginationConfig = {}) {
  const { initialPageSize = 10, pageSizes = [10, 20, 50, 100], onPageChange, onSizeChange } = config

  const paginationState = reactive<PaginationState>({
    currentPage: 1,
    pageSize: initialPageSize,
    total: 0,
    loading: false,
  })

  const paginationInfo = computed(() => ({
    currentPage: paginationState.currentPage,
    pageSize: paginationState.pageSize,
    total: paginationState.total,
  }))

  const setTotal = (total: number) => {
    paginationState.total = total
  }

  const setLoading = (loading: boolean) => {
    paginationState.loading = loading
  }

  const resetPagination = () => {
    paginationState.currentPage = 1
    paginationState.total = 0
  }

  const handlePageChange = async (page: number, pageSize: number) => {
    if (paginationState.loading) return

    paginationState.currentPage = page
    paginationState.pageSize = pageSize

    if (onPageChange) {
      paginationState.loading = true
      try {
        await onPageChange(page, pageSize)
      } finally {
        paginationState.loading = false
      }
    }
  }

  const handleSizeChange = async (pageSize: number) => {
    if (paginationState.loading) return

    paginationState.pageSize = pageSize
    paginationState.currentPage = 1

    if (onSizeChange) {
      paginationState.loading = true
      try {
        await onSizeChange(pageSize)
      } finally {
        paginationState.loading = false
      }
    }
  }

  const updatePaginationInfo = (info: Partial<PaginationState>) => {
    if (info.currentPage !== undefined) paginationState.currentPage = info.currentPage
    if (info.pageSize !== undefined) paginationState.pageSize = info.pageSize
    if (info.total !== undefined) paginationState.total = info.total
    if (info.loading !== undefined) paginationState.loading = info.loading
  }

  return {
    paginationState,
    paginationInfo,
    pageSizes,
    setTotal,
    setLoading,
    resetPagination,
    updatePaginationInfo,
    handlePageChange,
    handleSizeChange,
  }
}
