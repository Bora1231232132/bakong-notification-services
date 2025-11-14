import { ref, computed } from 'vue'
import { ElNotification, ElMessageBox } from 'element-plus'

export interface TableColumn {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  showOverflowTooltip?: boolean
  slot?: string
  fixed?: boolean | 'left' | 'right'
  sortable?: boolean
  formatter?: (row: any, column: any, cellValue: any) => string
}

export interface TableConfig {
  columns: TableColumn[]
  data: any[]
  loading?: boolean
  selection?: boolean
  pagination?: boolean
  pageSize?: number
  pageSizes?: number[]
  onEdit?: (row: any) => void
  onDelete?: (row: any) => Promise<boolean>
  onView?: (row: any) => void
  onSelectionChange?: (selection: any[]) => void
  onRowClick?: (row: any) => void
  onSortChange?: (sort: { prop: string; order: string }) => void
}

export function useDataTable(config: TableConfig) {
  const {
    columns,
    data,
    loading = false,
    selection = false,
    pagination = true,
    pageSize = 10,
    pageSizes = [10, 20, 50, 100],
    onEdit,
    onDelete,
    onView,
    onSelectionChange,
    onRowClick,
    onSortChange,
  } = config

  const selectedRows = ref<any[]>([])
  const currentPage = ref(1)
  const currentPageSize = ref(pageSize)
  const sortConfig = ref<{ prop: string; order: string } | null>(null)

  const hasSelection = computed(() => selectedRows.value.length > 0)
  const selectedCount = computed(() => selectedRows.value.length)

  const sortedData = computed(() => {
    if (!sortConfig.value) return data

    const { prop, order } = sortConfig.value
    return [...data].sort((a, b) => {
      const aVal = a[prop]
      const bVal = b[prop]

      if (order === 'ascending') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })
  })

  const paginatedData = computed(() => {
    if (!pagination) return sortedData.value

    const start = (currentPage.value - 1) * currentPageSize.value
    const end = start + currentPageSize.value
    return sortedData.value.slice(start, end)
  })

  const tableColumns = computed(() => {
    const cols = [...columns]

    if (selection) {
      cols.unshift({
        prop: 'selection',
        label: '',
        width: 50,
        slot: 'selection',
      })
    }

    if (onEdit || onDelete || onView) {
      cols.push({
        prop: 'actions',
        label: 'Actions',
        width: 200,
        slot: 'actions',
        fixed: 'right',
      })
    }

    return cols
  })

  const handleSelectionChange = (selection: any[]) => {
    selectedRows.value = selection
    onSelectionChange?.(selection)
  }

  const clearSelection = () => {
    selectedRows.value = []
  }

  const selectAll = () => {
    selectedRows.value = [...data]
  }

  const isRowSelected = (row: any) => {
    return selectedRows.value.includes(row)
  }

  const toggleRowSelection = (row: any) => {
    const index = selectedRows.value.indexOf(row)
    if (index > -1) {
      selectedRows.value.splice(index, 1)
    } else {
      selectedRows.value.push(row)
    }
  }

  const handleEdit = (row: any) => {
    onEdit?.(row)
  }

  const handleView = (row: any) => {
    onView?.(row)
  }

  const handleDelete = async (row: any) => {
    if (!onDelete) return

    try {
      await ElMessageBox.confirm(`Are you sure you want to delete this item?`, 'Confirm Delete', {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      })

      const success = await onDelete(row)
      if (success) {
        ElNotification({
          title: 'Success',
          message: 'Item deleted successfully',
          type: 'success',
          duration: 2000,
        })
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElNotification({
          title: 'Error',
          message: 'Failed to delete item',
          type: 'error',
          duration: 2000,
        })
      }
    }
  }

  const handleBatchDelete = async () => {
    if (!onDelete || selectedRows.value.length === 0) return

    try {
      await ElMessageBox.confirm(
        `Are you sure you want to delete ${selectedRows.value.length} selected items?`,
        'Confirm Batch Delete',
        {
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          type: 'warning',
        },
      )

      let successCount = 0
      for (const row of selectedRows.value) {
        const success = await onDelete(row)
        if (success) successCount++
      }

      ElNotification({
        title: 'Success',
        message: `${successCount} items deleted successfully`,
        type: 'success',
        duration: 2000,
      })
      clearSelection()
    } catch (error) {
      if (error !== 'cancel') {
        ElNotification({
          title: 'Error',
          message: 'Failed to delete selected items',
          type: 'error',
          duration: 2000,
        })
      }
    }
  }

  const handlePageChange = (page: number) => {
    currentPage.value = page
  }

  const handleSizeChange = (size: number) => {
    currentPageSize.value = size
    currentPage.value = 1
  }

  const handleSortChange = (sort: { prop: string; order: string }) => {
    sortConfig.value = sort
    onSortChange?.(sort)
  }

  const handleRowClick = (row: any) => {
    onRowClick?.(row)
  }

  const getRowIndex = (row: any) => {
    return data.findIndex((item) => item === row)
  }

  const refresh = () => {
    currentPage.value = 1
    clearSelection()
    sortConfig.value = null
  }

  const exportData = (format: 'csv' | 'json' = 'json') => {
    const dataToExport = selectedRows.value.length > 0 ? selectedRows.value : data

    if (format === 'csv') {
      const headers = columns.map((col) => col.label).join(',')
      const rows = dataToExport.map((row) =>
        columns.map((col) => `"${row[col.prop] || ''}"`).join(','),
      )
      const csvContent = [headers, ...rows].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'table-data.csv'
      link.click()
      URL.revokeObjectURL(url)
    } else {
      const jsonContent = JSON.stringify(dataToExport, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'table-data.json'
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  return {
    selectedRows: computed(() => selectedRows.value),
    currentPage: computed(() => currentPage.value),
    currentPageSize: computed(() => currentPageSize.value),
    sortConfig: computed(() => sortConfig.value),

    hasSelection,
    selectedCount,
    tableColumns,
    paginatedData,
    sortedData,

    handleSelectionChange,
    clearSelection,
    selectAll,
    isRowSelected,
    toggleRowSelection,

    handleEdit,
    handleView,
    handleDelete,
    handleBatchDelete,

    handlePageChange,
    handleSizeChange,

    handleSortChange,

    handleRowClick,
    getRowIndex,

    refresh,
    exportData,
  }
}
