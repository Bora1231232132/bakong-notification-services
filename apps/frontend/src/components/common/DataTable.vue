<template>
  <div class="data-table-wrapper">
    <div
      class="data-table-container"
      :class="{ 'sticky-header': stickyHeader }"
      :style="{ maxHeight: maxHeight }"
    >
      <el-table
        :data="paginatedData"
        style="width: 100%"
        :border="border"
        :stripe="stripe"
        :highlight-current-row="highlightCurrentRow"
        :height="tableHeight"
        :max-height="maxHeight"
        empty-text="No data available yet"
      >
        <el-table-column
          v-for="column in columns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :show-overflow-tooltip="column.showOverflowTooltip"
          :fixed="column.fixed"
        >
          <template #header>
            <span class="table-header-bold">{{ column.label }}</span>
          </template>
          <template v-if="column.slot" #default="scope">
            <slot :name="column.slot" :row="scope.row" :index="scope.$index">
              {{ scope.row[column.prop] }}
            </slot>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface TableColumn {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  showOverflowTooltip?: boolean
  slot?: string
  fixed?: boolean | 'left' | 'right'
}

interface PaginationInfo {
  currentPage: number
  pageSize: number
  total: number
}

interface Props {
  data: any[]
  columns: TableColumn[]
  border?: boolean
  stripe?: boolean
  highlightCurrentRow?: boolean
  showPagination?: boolean
  total?: number
  pageSize?: number
  pageSizes?: number[]
  paginationLayout?: string
  paginationBackground?: boolean
  maxHeight?: string
  tableHeight?: string | number
  useApiPagination?: boolean
  paginationInfo?: PaginationInfo
  stickyHeader?: boolean
  scrollable?: boolean
  scrollHeight?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  border: true,
  stripe: false,
  highlightCurrentRow: false,
  showPagination: true,
  pageSize: 10,
  pageSizes: () => [10, 20, 50, 100],
  paginationLayout: 'total, sizes, prev, pager, next, jumper',
  paginationBackground: true,
  maxHeight: '400px',
  useApiPagination: false,
  paginationInfo: () => ({ currentPage: 1, pageSize: 10, total: 0 }),
  stickyHeader: true,
  scrollable: true,
  scrollHeight: '400px',
})

const emit = defineEmits<{
  'page-change': [page: number, pageSize: number]
  'size-change': [pageSize: number]
}>()

const currentPage = ref(1)
const pageSize = ref(props.pageSize)

const total = computed(() => {
  if (props.useApiPagination && props.paginationInfo) {
    return props.paginationInfo.total
  }
  return props.total || props.data.length
})

const paginatedData = computed(() => {
  if (props.useApiPagination) {
    return props.data
  }

  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return props.data.slice(start, end)
})

watch(
  () => props.paginationInfo,
  (newInfo) => {
    if (newInfo && props.useApiPagination) {
      currentPage.value = newInfo.currentPage
      pageSize.value = newInfo.pageSize
    }
  },
  { deep: true },
)

watch(
  () => props.data,
  () => {
    if (!props.useApiPagination) {
      currentPage.value = 1
    }
  },
)
</script>

<style scoped>
.data-table-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.data-table-container {
  position: relative;
  height: 100%;

  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  border-radius: 2px;
}

.data-table-container :deep(.el-table) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.data-table-container :deep(.el-table__header-wrapper) {
  flex-shrink: 0;
}

.data-table-container :deep(.el-table__body-wrapper) {
  flex: 1;
  overflow-y: auto !important;
  overflow-x: hidden;
  max-height: calc(100% - 40px);
}

.data-table-container :deep(.el-table__body) {
  overflow-y: auto;
}

.data-table-container :deep(.el-table__row) {
  margin-bottom: 4px;
}

.data-table-container :deep(.el-table__body tr:last-child) {
  margin-bottom: 20px;
}

.table-header-bold {
  font-weight: bold;
  color: #606266;
  font-size: 14px;
  padding: 12px 0px;
  display: block;
}

.data-table-container :deep(.el-table__header-wrapper) {
  background: #fafbff;
}

.data-table-container :deep(.el-table__header th) {
  background: #fafbff !important;
  padding: 0;
}

.data-table-container :deep(.el-table__header th:last-child) {
  border-right: none;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 20px 0 0 0;
  background: #fff;
  border-top: 1px solid #ebeef5;
  flex-shrink: 0;
  margin-top: auto;
}

.pagination-container :deep(.el-pagination) {
  justify-content: center;
}

.pagination-container :deep(.el-pagination__total) {
  color: #606266;
  font-weight: 500;
}

.pagination-container :deep(.el-pagination__sizes) {
  margin: 0 20px;
}

.pagination-container :deep(.el-pagination__jump) {
  margin-left: 20px;
}

@media (max-width: 768px) {
  .pagination-container :deep(.el-pagination) {
    flex-wrap: wrap;
    gap: 10px;
  }

  .pagination-container :deep(.el-pagination__sizes) {
    margin: 0 10px;
  }

  .pagination-container :deep(.el-pagination__jump) {
    margin-left: 10px;
  }
}

.data-table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.data-table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.data-table-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.data-table-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
