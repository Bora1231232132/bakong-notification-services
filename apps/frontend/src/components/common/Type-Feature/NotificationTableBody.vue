<template>
  <div class="relative w-full min-h-[191px] opacity-100">
    <div class="absolute inset-0 overflow-auto">
      <table class="w-full text-sm text-left text-[#001346] border-collapse min-w-[600px]">
        <thead class="text-[14px] font-semibold text-[#001346B3] uppercase bg-[#f2f2f4] bg-cover">
          <tr class="h-[63px]">
            <th class="py-3 pl-4 sm:pl-8 pr-2 sm:pr-4 text-left w-[60px]">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @change="handleSelectAll"
                class="w-4 h-4 border border-[#001346] rounded bg-white focus:ring-0 focus:ring-offset-0"
              />
            </th>
            <th class="py-3 px-2 sm:px-4 text-center align-middle w-[100px]">Icon</th>
            <th class="py-3 px-2 sm:px-4 text-center align-middle flex-1">Name</th>
            <th
              class="py-3 px-2 sm:px-4 text-center whitespace-nowrap w-[200px] sticky right-0 bg-[#f2f2f4] z-10"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, i) in notifications"
            :key="i"
            class="transition-all duration-150 h-[63px]"
          >
            <td class="py-3 pl-4 sm:pl-8 pr-2 sm:pr-4 w-[60px] align-middle">
              <input
                type="checkbox"
                :checked="selectedItems.has(i)"
                @change="handleSelectItem(i)"
                class="w-4 h-4 border border-[#001346] rounded bg-white focus:ring-0 focus:ring-offset-0"
              />
            </td>
            <td class="py-3 px-2 sm:px-4 align-middle text-center w-[100px]">
              <div class="flex items-center justify-center text-xl">
                {{ item.icon }}
              </div>
            </td>
            <td class="py-3 px-2 sm:px-4 text-[16px] font-medium text-center align-middle flex-1">
              <div class="flex items-center justify-center">
                {{ item.name }}
              </div>
            </td>
            <td
              class="py-3 px-2 sm:px-4 align-middle text-center sticky right-0 bg-white z-10 w-[200px]"
            >
              <div class="flex justify-center items-center gap-1 sm:gap-2">
                <button
                  class="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] flex items-center justify-center rounded-full border border-[#0013461A] text-[#001346] hover:bg-[#E9ECF8] transition-all duration-200 flex-shrink-0"
                  title="View"
                  @click="$emit('view', item)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-3 h-3 sm:w-4 sm:h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#001346"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
                <button
                  class="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] flex items-center justify-center rounded-full bg-[#0D1C50] text-white hover:bg-[#12236d] transition-all duration-200 flex-shrink-0"
                  title="Edit"
                  @click="$emit('edit', item)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-3 h-3 sm:w-4 sm:h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="white"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M11 4h9m-9 4h9M5 12h15M5 16h15M5 20h15"
                    />
                  </svg>
                </button>
                <button
                  class="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] flex items-center justify-center rounded-full bg-[#F24444] text-white hover:bg-[#d82c2c] transition-all duration-200 flex-shrink-0"
                  title="Delete"
                  @click="$emit('delete', item)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-3 h-3 sm:w-4 sm:h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="white"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 4h8l1 3H7l1-3z"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!notifications || notifications.length === 0" class="h-[63px]">
            <td colspan="4" class="px-4 py-8 text-center text-[#001346B3]">
              No notification types found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  notifications: Array<{
    icon: string
    name: string
  }>
}>()

const selectedItems = ref<Set<number>>(new Set())

const isAllSelected = computed(() => {
  return props.notifications.length > 0 && selectedItems.value.size === props.notifications.length
})

const isIndeterminate = computed(() => {
  return selectedItems.value.size > 0 && selectedItems.value.size < props.notifications.length
})

const handleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItems.value.clear()
  } else {
    selectedItems.value.clear()
    props.notifications.forEach((_, index) => {
      selectedItems.value.add(index)
    })
  }
}

const handleSelectItem = (index: number) => {
  if (selectedItems.value.has(index)) {
    selectedItems.value.delete(index)
  } else {
    selectedItems.value.add(index)
  }
}
</script>
