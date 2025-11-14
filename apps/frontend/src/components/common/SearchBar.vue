<template>
  <div class="search-bar" :class="searchBarClass">
    <div class="search-input-container">
      <el-input
        v-model="searchValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :clearable="clearable"
        :size="size"
        :prefix-icon="prefixIcon"
        :suffix-icon="suffixIcon"
        :maxlength="maxlength"
        :show-word-limit="showWordLimit"
        class="search-input"
        @input="handleInput"
        @change="handleChange"
        @clear="handleClear"
        @focus="handleFocus"
        @blur="handleBlur"
      >
        <template v-if="$slots.prefix" #prefix>
          <slot name="prefix" />
        </template>
        <template v-if="$slots.suffix" #suffix>
          <slot name="suffix" />
        </template>
      </el-input>

      <el-button
        v-if="showSearchButton"
        type="primary"
        :size="size"
        :loading="loading"
        :disabled="disabled"
        class="search-button"
        @click="handleSearch"
      >
        <el-icon v-if="!loading"><Search /></el-icon>
        {{ searchButtonText }}
      </el-button>
    </div>

    <div v-if="showFilters && filters.length > 0" class="search-filters">
      <el-select
        v-for="filter in filters"
        :key="filter.key"
        v-model="filterValues[filter.key]"
        :placeholder="filter.placeholder"
        :size="size"
        :clearable="filter.clearable"
        :multiple="filter.multiple"
        :filterable="filter.filterable"
        class="filter-select"
        @change="handleFilterChange(filter.key, $event)"
      >
        <el-option
          v-for="option in filter.options"
          :key="option.value"
          :label="option.label"
          :value="option.value"
          :disabled="option.disabled"
        />
      </el-select>
    </div>

    <div v-if="$slots.actions" class="search-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'

export interface SearchFilter {
  key: string
  placeholder: string
  options: Array<{ label: string; value: any; disabled?: boolean }>
  clearable?: boolean
  multiple?: boolean
  filterable?: boolean
}

interface Props {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  size?: 'large' | 'default' | 'small'
  prefixIcon?: string
  suffixIcon?: string
  maxlength?: number
  showWordLimit?: boolean
  showSearchButton?: boolean
  searchButtonText?: string
  loading?: boolean
  debounce?: number
  showFilters?: boolean
  filters?: SearchFilter[]
  fullWidth?: boolean
  variant?: 'default' | 'compact' | 'expanded'
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search...',
  disabled: false,
  clearable: true,
  size: 'default',
  showSearchButton: false,
  searchButtonText: 'Search',
  loading: false,
  debounce: 300,
  showFilters: false,
  filters: () => [],
  fullWidth: false,
  variant: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string, filters: Record<string, any>]
  input: [value: string]
  change: [value: string]
  clear: []
  focus: [event: Event]
  blur: [event: Event]
  'filter-change': [key: string, value: any]
}>()

const searchValue = ref(props.modelValue || '')
const filterValues = reactive<Record<string, any>>({})

props.filters.forEach((filter) => {
  filterValues[filter.key] = filter.multiple ? [] : null
})

const searchBarClass = computed(() => {
  const classes = ['search-bar']
  if (props.fullWidth) classes.push('full-width')
  if (props.variant !== 'default') classes.push(`variant-${props.variant}`)
  return classes.join(' ')
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const debouncedSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    emit('search', searchValue.value, { ...filterValues })
  }, props.debounce)
}

const handleInput = (value: string) => {
  searchValue.value = value
  emit('update:modelValue', value)
  emit('input', value)

  if (props.debounce > 0) {
    debouncedSearch()
  }
}

const handleChange = (value: string) => {
  emit('change', value)
}

const handleClear = () => {
  searchValue.value = ''
  emit('update:modelValue', '')
  emit('clear')

  if (props.debounce > 0) {
    debouncedSearch()
  }
}

const handleSearch = () => {
  emit('search', searchValue.value, { ...filterValues })
}

const handleFocus = (event: Event) => {
  emit('focus', event)
}

const handleBlur = (event: Event) => {
  emit('blur', event)
}

const handleFilterChange = (key: string, value: any) => {
  filterValues[key] = value
  emit('filter-change', key, value)

  if (props.debounce > 0) {
    debouncedSearch()
  }
}

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== searchValue.value) {
      searchValue.value = newValue || ''
    }
  },
)

watch(
  () => props.filters,
  (newFilters) => {
    newFilters.forEach((filter) => {
      if (!(filter.key in filterValues)) {
        filterValues[filter.key] = filter.multiple ? [] : null
      }
    })
  },
  { deep: true },
)
</script>

<style scoped>
.search-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-bar.full-width {
  width: 100%;
}

.search-input-container {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  flex: 1;
}

.search-button {
  flex-shrink: 0;
}

.search-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  min-width: 150px;
}

.search-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.variant-compact {
  padding: 12px;
  gap: 8px;
}

.variant-compact .search-input-container {
  gap: 8px;
}

.variant-compact .search-filters {
  gap: 8px;
}

.variant-expanded {
  padding: 20px;
  gap: 16px;
}

.variant-expanded .search-input-container {
  gap: 16px;
}

.variant-expanded .search-filters {
  gap: 16px;
}

@media (max-width: 768px) {
  .search-input-container {
    flex-direction: column;
    align-items: stretch;
  }

  .search-button {
    width: 100%;
  }

  .search-filters {
    flex-direction: column;
  }

  .filter-select {
    min-width: auto;
  }
}
</style>
