<template>
  <div
    class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 pt-2 pb-0 min-h-14 w-full"
  >
    <div class="flex items-center gap-2 w-full sm:w-auto">
      <label class="text-[#001346] text-[16px] font-medium whitespace-nowrap underline">{{
        labelText
      }}</label>
      <input
        v-model="searchValue"
        type="text"
        placeholder="Search by name..."
        class="flex-1 sm:flex-initial sm:w-[313px] h-[56px] px-4 border border-[#0013461A] focus:border-[#0013460D] outline-blue-500/50 rounded-[8px] text-[#001346] text-[14px]"
        style="padding-left: 16px !important"
        @input="handleSearch"
      />
      <button
        class="flex items-center justify-center gap-2 text-[#001346] text-[16px] font-semibold transition-all duration-200 h-14 w-[140px] px-4 bg-[#0013460D] rounded-[32px] shadow-[0_0_128px_rgba(0,19,70,0.08)] whitespace-nowrap"
        @click="$emit('addNew')"
        aria-label="Add new"
      >
        <span>Add new</span>
        <img src="@/assets/image/add--alt.svg" alt="Add" class="w-5 h-5" />
      </button>
      <button
        v-if="showRefresh"
        class="flex items-center justify-center text-[#001346] transition-all duration-200 shadow-[0_0_128px_rgba(0,19,70,0.08)] whitespace-nowrap"
        style="
          width: 40px;
          height: 40px;
          gap: 5.71px;
          border-radius: 22.86px;
          padding: 8.57px;
          opacity: 1;
        "
        @click="$emit('refresh')"
        aria-label="Refresh table"
      >
        <img src="@/assets/image/rotate--360.svg" alt="Refresh" class="w-full h-full" />
      </button>
    </div>
    <div class="flex items-center gap-4 w-full sm:w-auto justify-end">
      <button
        class="flex items-center justify-center gap-2 text-[#001346] text-[16px] font-semibold transition-all duration-200 h-[56px] w-[110px] px-4 bg-[#0013460D] rounded-[32px] shadow-[0_0_128px_rgba(0,19,70,0.08)]"
        @click="$emit('filter')"
        aria-label="Open filter"
      >
        Filter
        <img src="@/assets/image/filter.svg" alt="Filter" class="w-5 h-5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    showRefresh?: boolean
    labelText?: string
  }>(),
  {
    showRefresh: true,
    labelText: 'Category type',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  addNew: []
  filter: []
  refresh: []
}>()

const searchValue = ref(props.modelValue || '')

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const handleSearch = () => {
  emit('update:modelValue', searchValue.value)

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    emit('search', searchValue.value)
  }, 300)
}

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== searchValue.value) {
      searchValue.value = newValue || ''
    }
  },
)
</script>
