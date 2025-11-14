<template>
  <div
    class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 pt-2 pb-0 min-h-14 w-full"
  >
    <button
      class="flex items-center justify-center gap-2 text-[#0D1C50] text-[16px] font-semibold transition-all duration-200 w-full sm:w-[104px] h-14 bg-[#0013460D] rounded-[32px] px-4 py-2 shadow-[0_0_128px_rgba(0,19,70,0.08)]"
      @click="$emit('filter')"
      aria-label="Open filter"
    >
      Filter
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-[27px] h-[27px]"
        fill="none"
        viewBox="0 0 23 23"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1"
          d="M3 4h18v2l-7 8v4l-4-2v-2L3 6z"
        />
      </svg>
    </button>
  </div>
</template>
