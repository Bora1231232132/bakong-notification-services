<template>
  <div
    class="flex flex-col sm:flex-row justify-between items-center w-full min-h-[56px] border border-[#0013461A] rounded-[8px] p-4 sm:px-6 text-[#001346] text-[16px] font-medium bg-[#FAFBFF] gap-4 sm:gap-0"
  >
    <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
      <div class="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
        <span class="text-sm sm:text-base">Per page</span>
        <select
          v-model="perPage"
          class="border border-[#0013461A] rounded-[8px] px-3 py-2 w-[80px] h-[40px] text-center focus:outline-none focus:ring-1 focus:ring-[#0D1C50]"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>
      <div class="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
        <span class="text-sm sm:text-base">Go to page</span>
        <input
          v-model="goTo"
          type="number"
          min="1"
          class="border border-[#0013461A] rounded-[8px] px-3 py-2 w-[70px] h-[40px] text-center focus:outline-none focus:ring-1 focus:ring-[#0D1C50]"
        />
        <button
          class="w-[60px] h-[40px] rounded-[8px] bg-[#0D1C50] text-white font-semibold hover:bg-[#12236d] transition-all duration-200"
          @click="$emit('goto', goTo)"
        >
          Go
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps({
  page: Number,
})
const perPage = ref(10)
const goTo = ref(1)
</script>
