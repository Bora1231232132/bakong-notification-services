<template>
  <div
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps({
  page: {
    type: Number,
    required: true,
  },
  perPage: {
    type: Number,
    default: 10,
  },
  totalPages: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits<{
  'update:perPage': [value: number]
  next: []
  prev: []
  goto: [page: number]
}>()

const localPerPage = ref(props.perPage)
const goTo = ref(1)

watch(
  () => props.page,
  (newPage) => {
    goTo.value = newPage
  },
  { immediate: true },
)

watch(
  () => props.perPage,
  (newPerPage) => {
    localPerPage.value = newPerPage
  },
  { immediate: true },
)

watch(localPerPage, (newValue) => {
  emit('update:perPage', Number(newValue))
})

watch(
  () => props.totalPages,
  (newTotalPages) => {
    // If current page exceeds total pages, update goTo to last page
    if (goTo.value > newTotalPages) {
      goTo.value = newTotalPages
    }
  },
)
</script>
