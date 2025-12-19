<template>
  <!-- Default Style (Template/Notification pages) -->
  <div
    v-if="style === 'default'"
    class="flex flex-col sm:flex-row justify-between items-center w-full min-h-[56px] p-4 sm:px-6 text-[#001346] text-[16px] font-medium gap-4 sm:gap-0"
  >
    <div class="flex items-center gap-2">
      <button
        class="w-8 h-8 flex items-center justify-center rounded-full bg-[#0D1C50] text-white hover:bg-[#12236d] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="page <= 1"
        @click="$emit('prev')"
        aria-label="Previous page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        class="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[#001346] border border-[#0013461A] font-semibold"
      >
        {{ page }}
      </button>
      <button
        class="w-8 h-8 flex items-center justify-center rounded-full bg-[#0D1C50] text-white hover:bg-[#12236d] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="page >= totalPages"
        @click="$emit('next')"
        aria-label="Next page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
    <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
      <div class="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
        <span class="text-sm sm:text-base">Per page</span>
        <select
          v-model="localPerPage"
          class="border border-[#0013461A] rounded-[8px] px-3 py-2 w-[80px] h-[40px] text-center focus:outline-none focus:ring-1 focus:ring-[#0D1C50]"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>
      <div class="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
        <span class="text-sm sm:text-base">Go to page</span>
        <select
          v-model="goTo"
          class="border border-[#0013461A] rounded-[8px] px-3 py-2 w-[70px] h-[40px] text-center focus:outline-none focus:ring-1 focus:ring-[#0D1C50]"
        >
          <option v-for="n in totalPages" :key="n" :value="n">{{ n }}</option>
        </select>
        <button
          class="w-[60px] h-[40px] rounded-full flex items-center justify-center bg-[#0D1C50] text-white font-semibold hover:bg-[#12236d] transition-all duration-200"
          @click="$emit('goto', goTo)"
        >
          Go
        </button>
      </div>
    </div>
  </div>

  <!-- User Management Style -->
  <div
    v-else-if="style === 'user-management'"
    class="flex flex-col sm:flex-row justify-between items-center w-full min-h-[56px] p-4 sm:px-6 text-[#0A1D54] text-[16px] font-medium gap-4 sm:gap-6"
  >
    <!-- Left Section: Page Navigation -->
    <div class="flex items-center gap-2">
      <!-- Previous Button -->
      <button
        class="w-10 h-10 flex items-center justify-center rounded-full bg-[#0A1D54] text-white hover:bg-[#0d2568] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0A1D54] focus:ring-offset-2"
        :disabled="page <= 1"
        @click="$emit('prev')"
        aria-label="Previous page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Page Numbers Container (Pill Shape) -->
      <div
        class="flex items-center justify-around bg-[#F5F5F5]"
        style="width: 392px; height: 56px; gap: 8px; border-radius: 40px; padding: 4px"
      >
        <template v-for="(item, index) in pageNumbers" :key="`page-${index}-${item}`">
          <button
            v-if="item !== 'ellipsis'"
            :class="[
              'flex items-center justify-center text-[#0A1D54] font-medium text-base transition-all duration-200 focus:outline-none',
              item === page
                ? 'border-2 border-[#0A1D54] bg-transparent'
                : 'px-2 py-1 hover:text-[#0d2568] cursor-pointer',
            ]"
            :style="item === page ? 'width: 48px; height: 48px; border-radius: 24px;' : undefined"
            @click="item !== page && $emit('goto', item)"
            :aria-label="`Go to page ${item}`"
            :aria-current="item === page ? 'page' : undefined"
          >
            {{ item }}
          </button>
          <span v-else class="px-1 text-[#0A1D54] font-medium text-base select-none">...</span>
        </template>
      </div>

      <!-- Next Button -->
      <button
        class="w-10 h-10 flex items-center justify-center rounded-full bg-[#0A1D54] text-white hover:bg-[#0d2568] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0A1D54] focus:ring-offset-2"
        :disabled="page >= totalPages"
        @click="$emit('next')"
        aria-label="Next page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Right Section: Per Page and Go To Page Controls -->
    <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
      <!-- Per Page Control -->
      <div class="flex items-center gap-2">
        <span class="text-[#0A1D54] text-sm sm:text-base whitespace-nowrap">Per page</span>
        <input
          v-model.number="localPerPageInput"
          type="number"
          min="1"
          max="100"
          class="w-[60px] h-[40px] border border-gray-300 rounded-lg px-2 text-center text-[#0A1D54] focus:outline-none focus:ring-1 focus:ring-[#0A1D54] focus:border-[#0A1D54]"
          @blur="handlePerPageBlur"
          @keyup.enter="handlePerPageBlur"
        />
      </div>

      <!-- Go To Page Control -->
      <div class="flex items-center gap-2">
        <span class="text-[#0A1D54] text-sm sm:text-base whitespace-nowrap">Go to page</span>
        <input
          v-model.number="goToInput"
          type="number"
          min="1"
          :max="totalPages"
          class="w-[60px] h-[40px] border border-gray-300 rounded-lg px-2 text-center text-[#0A1D54] focus:outline-none focus:ring-1 focus:ring-[#0A1D54] focus:border-[#0A1D54]"
          @blur="handleGoToBlur"
          @keyup.enter="handleGoToEnter"
        />
        <button
          class="w-10 h-10 rounded-full flex items-center justify-center bg-[#0A1D54] text-white font-semibold hover:bg-[#0d2568] transition-all duration-200"
          @click="handleGoToClick"
          aria-label="Go to page"
        >
          Go
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

export type PaginationStyle = 'default' | 'user-management'

const props = withDefaults(
  defineProps<{
    page: number
    perPage?: number
    totalPages: number
    style?: PaginationStyle
  }>(),
  {
    perPage: 10,
    style: 'default',
  },
)

const emit = defineEmits<{
  'update:perPage': [value: number]
  next: []
  prev: []
  goto: [page: number]
}>()

// Shared state
const localPerPage = ref(props.perPage)
const goTo = ref(1)

// User-management style specific state
const localPerPageInput = ref(props.perPage)
const goToInput = ref(1)

// Calculate page numbers to display for user-management style
const pageNumbers = computed<(number | 'ellipsis')[]>(() => {
  if (props.style !== 'user-management') {
    return []
  }

  const current = props.page
  const total = props.totalPages
  const pages: (number | 'ellipsis')[] = []

  if (total <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
    return pages
  }

  if (current <= 3) {
    // Near the beginning: 1, 2, 3, ..., last-2, last-1, last
    // Example: 1, 2, 3, ..., 20, 21, 22
    for (let i = 1; i <= 3; i++) {
      pages.push(i)
    }
    pages.push('ellipsis')
    for (let i = total - 2; i <= total; i++) {
      pages.push(i)
    }
  } else if (current >= total - 2) {
    // Near the end: 1, 2, 3, ..., last-2, last-1, last
    for (let i = 1; i <= 3; i++) {
      pages.push(i)
    }
    pages.push('ellipsis')
    for (let i = total - 2; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Middle: 1, 2, 3, ..., current-1, current, current+1, ..., last-2, last-1, last
    // Or simpler: 1, ..., current-1, current, current+1, ..., total
    pages.push(1)
    pages.push('ellipsis')
    pages.push(current - 1)
    pages.push(current)
    pages.push(current + 1)
    pages.push('ellipsis')
    pages.push(total)
  }

  return pages
})

// Watch props.page to update goTo
watch(
  () => props.page,
  (newPage) => {
    goTo.value = newPage
    goToInput.value = newPage
  },
  { immediate: true },
)

// Watch props.perPage to update localPerPage
watch(
  () => props.perPage,
  (newPerPage) => {
    localPerPage.value = newPerPage
    localPerPageInput.value = newPerPage
  },
  { immediate: true },
)

// Watch localPerPage (for default style select)
watch(localPerPage, (newValue) => {
  emit('update:perPage', Number(newValue))
})

// Watch localPerPageInput (for user-management style input)
watch(localPerPageInput, (newValue) => {
  if (newValue && newValue >= 1 && newValue <= 100) {
    emit('update:perPage', Number(newValue))
  }
})

// Watch totalPages to validate goTo
watch(
  () => props.totalPages,
  (newTotalPages) => {
    if (goTo.value > newTotalPages) {
      goTo.value = newTotalPages
    }
    if (goToInput.value > newTotalPages) {
      goToInput.value = newTotalPages
    }
  },
)

// Handle per page input blur (user-management style)
const handlePerPageBlur = () => {
  const value = Number(localPerPageInput.value)
  if (value < 1) {
    localPerPageInput.value = 1
    emit('update:perPage', 1)
  } else if (value > 100) {
    localPerPageInput.value = 100
    emit('update:perPage', 100)
  } else {
    emit('update:perPage', value)
  }
}

// Handle go to page input blur (user-management style)
const handleGoToBlur = () => {
  const value = Number(goToInput.value)
  if (value < 1) {
    goToInput.value = 1
  } else if (value > props.totalPages) {
    goToInput.value = props.totalPages
  }
}

// Handle go to page enter key (user-management style)
const handleGoToEnter = () => {
  handleGoToClick()
}

// Handle go to page click (user-management style)
const handleGoToClick = () => {
  const value = Number(goToInput.value)
  if (value >= 1 && value <= props.totalPages) {
    emit('goto', value)
  } else if (value < 1) {
    goToInput.value = 1
    emit('goto', 1)
  } else if (value > props.totalPages) {
    goToInput.value = props.totalPages
    emit('goto', props.totalPages)
  }
}
</script>
