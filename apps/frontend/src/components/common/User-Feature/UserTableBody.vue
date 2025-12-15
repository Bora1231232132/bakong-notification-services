<template>
  <div class="w-full opacity-100 overflow-hidden" style="max-width: 1280px; max-height: 434px">
    <div class="w-full h-full overflow-y-auto overflow-x-auto">
      <table
        class="w-full text-sm text-left text-[#001346] border-collapse"
        style="width: 1280px; min-width: 1247px"
      >
        <thead
          class="text-[14px] font-semibold text-[#001346B3] uppercase"
          style="background: var(--surface-main-surface-secondary, #0013460d)"
        >
          <tr class="h-[62px]">
            <th class="sticky top-0 z-10 py-3 pl-4 sm:pl-8 pr-2 sm:pr-4 text-left bg-[#0013460D]">
              <div
                class="flex items-center justify-start gap-2"
                style="padding-left: 3px !important"
              >
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="handleSelectAll"
                  class="w-4 h-4 border border-[#001346] rounded bg-white focus:ring-0 focus:ring-offset-0"
                />
                <span>ID</span>
              </div>
            </th>
            <th
              class="sticky top-0 z-10 py-3 !px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#0013460D]"
            >
              <div class="flex items-center justify-start gap-2">
                Name
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </div>
            </th>
            <th
              class="sticky top-0 z-10 py-3 px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#0013460D]"
            >
              <div class="flex items-center justify-start gap-2">
                Email
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </div>
            </th>
            <th
              class="sticky top-0 z-10 py-3 px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#0013460D]"
            >
              <div class="flex items-center justify-start gap-2">
                Phone Number
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </div>
            </th>
            <th
              class="sticky top-0 z-10 py-3 px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#0013460D]"
            >
              <div class="flex items-center justify-start gap-2">
                Role
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </div>
            </th>
            <th
              class="sticky top-0 z-10 py-3 px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#0013460D]"
            >
              <div class="flex items-center justify-start gap-2">
                Status
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </div>
            </th>
            <th
              class="sticky top-0 z-10 py-3 px-2 sm:px-4 text-start whitespace-nowrap bg-[#0013460D] w-[200px]"
            >
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(user, index) in users"
            :key="user.id || index"
            class="transition-all duration-150 h-[63px] bg-white hover:bg-[#F9FAFB] border-b border-[#0013461A]"
          >
            <td class="py-3 pl-4 sm:pl-8 !pr-2 sm:pr-4 align-middle">
              <div
                class="flex items-center justify-start gap-3"
                style="padding-left: 3px !important"
              >
                <input
                  type="checkbox"
                  :checked="selectedItems.has(index)"
                  @change="handleSelectItem(index)"
                  class="w-4 h-4 border border-[#001346] rounded bg-white focus:ring-0 focus:ring-offset-0"
                />
                <span class="text-[16px] font-medium text-[#001346]">{{
                  user.id || `Prolos ${index + 1}`
                }}</span>
              </div>
            </td>
            <td class="py-3 px-2 sm:px-4 text-[16px] font-medium text-[#001346] align-middle">
              {{ user.name || user.displayName || user.username || `Prolos ${index + 2}` }}
            </td>
            <td class="py-3 px-2 sm:px-4 text-[16px] font-medium text-[#001346] align-middle">
              {{ user.email || `Prolos ${index + 3}` }}
            </td>
            <td class="py-3 px-2 sm:px-4 text-[16px] font-medium text-[#001346] align-middle">
              {{ user.phoneNumber || `Prolos ${index + 4}` }}
            </td>
            <td class="py-3 px-2 sm:px-4 text-[16px] font-medium text-[#001346] align-middle">
              {{ formatRole(user.role) }}
            </td>
            <td class="py-3 px-2 sm:px-4 align-middle">
              <button
                :class="[
                  'text-white text-[14px] font-medium transition-all duration-200 flex items-center justify-center',
                  user.status === 'Active' || !user.status
                    ? 'bg-[#0D1C50] hover:bg-[#12236d]'
                    : 'bg-[#F59E0B] hover:bg-[#D97706]',
                ]"
                :style="{
                  width: user.status === 'Deactivate' ? '102px' : '72px',
                  height: '32px',
                  padding: '8px 16px',
                  borderRadius: '32px',
                  opacity: 1,
                }"
                @click="handleStatusToggle(user, index)"
              >
                {{ user.status === 'Deactivate' ? 'Deactivate' : 'Active' }}
              </button>
            </td>
            <td class="py-3 px-2 sm:px-4 align-middle">
              <div class="flex justify-start items-center gap-1 sm:gap-2">
                <button
                  class="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] flex items-center justify-center rounded-full border border-[#0013461A] text-[#001346] hover:bg-[#E9ECF8] transition-all duration-200 flex-shrink-0"
                  title="View"
                  @click="$emit('view', user)"
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
                  @click="$emit('edit', user)"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  class="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] flex items-center justify-center rounded-full bg-[#F24444] text-white hover:bg-[#d82c2c] transition-all duration-200 flex-shrink-0"
                  title="Delete"
                  @click="$emit('delete', user)"
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
          <tr v-if="!users || users.length === 0" class="h-[63px]">
            <td colspan="7" class="px-4 py-8 text-center text-[#001346B3]">No users found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface UserTableItem {
  id?: number | string
  name?: string
  displayName?: string
  username?: string
  email?: string
  phoneNumber?: string
  role?: string
  status?: 'Active' | 'Deactivate'
}

const props = defineProps<{
  users: UserTableItem[]
}>()

const emit = defineEmits<{
  view: [user: UserTableItem]
  edit: [user: UserTableItem]
  delete: [user: UserTableItem]
  statusToggle: [user: UserTableItem, index: number]
}>()

const selectedItems = ref<Set<number>>(new Set())

const isAllSelected = computed(() => {
  return props.users.length > 0 && selectedItems.value.size === props.users.length
})

const isIndeterminate = computed(() => {
  return selectedItems.value.size > 0 && selectedItems.value.size < props.users.length
})

const handleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItems.value.clear()
  } else {
    selectedItems.value.clear()
    props.users.forEach((_, index) => {
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

const formatRole = (role?: string): string => {
  if (!role) return 'Editor'

  const roleMap: Record<string, string> = {
    ADMIN_USER: 'Editor',
    NORMAL_USER: 'View only',
    API_USER: 'Approval',
    Editor: 'Editor',
    'View only': 'View only',
    Approval: 'Approval',
  }

  return roleMap[role] || role
}

const handleStatusToggle = (user: UserTableItem, index: number) => {
  emit('statusToggle', user, index)
}
</script>

<style scoped>
/* Ensure table respects the max dimensions */
table {
  table-layout: fixed;
}

/* Column width distribution */
th:nth-child(1),
td:nth-child(1) {
  width: 120px;
}

th:nth-child(2),
td:nth-child(2) {
  width: 180px;
}

th:nth-child(3),
td:nth-child(3) {
  width: 220px;
}

th:nth-child(4),
td:nth-child(4) {
  width: 180px;
}

th:nth-child(5),
td:nth-child(5) {
  width: 150px;
}

th:nth-child(6),
td:nth-child(6) {
  width: 150px;
}

th:nth-child(7),
td:nth-child(7) {
  width: 247px;
}
</style>
