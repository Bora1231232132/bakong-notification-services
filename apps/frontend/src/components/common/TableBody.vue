<template>
  <div
    :class="[
      'w-full opacity-100 overflow-hidden',
      mode === 'notification' ? 'relative h-[441px]' : 'max-w-[1280px] max-h-[434px]',
    ]"
  >
    <div
      :class="[
        'w-full h-full overflow-y-auto overflow-x-hidden',
        mode === 'notification' ? 'absolute inset-0' : '',
      ]"
      :style="
        items && items.length > 6
          ? `max-height: ${62 + 63 * 6}px;` // Header (62px) + 6 rows (63px each) = 440px
          : ''
      "
    >
      <table
        :class="[
          'w-full text-sm text-left text-[#001346] border-collapse',
          mode === 'notification' ? 'min-w-[600px]' : 'min-w-[1247px]',
        ]"
        :style="mode === 'user' ? 'width: 1280px' : ''"
      >
        <!-- Table Header -->
        <thead
          :class="['text-[14px] font-semibold text-[#001346B3] uppercase', 'bg-[#f2f2f4]']"
          style="position: sticky; top: 0; z-index: 30"
        >
          <tr class="h-[62px]">
            <!-- First Column: Checkbox + ID/Icon -->
            <th
              :class="['py-3 pl-4 sm:pl-8 pr-2 sm:pr-4 text-left', 'gap-2 bg-[#f2f2f4]']"
              style="background-color: #f2f2f4 !important"
            >
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
                <span>{{ mode === 'notification' ? 'Icon' : 'ID' }}</span>
              </div>
            </th>

            <!-- Notification Mode: Name Column -->
            <th
              v-if="mode === 'notification'"
              class="py-3 px-2 sm:px-4 text-center align-middle cursor-pointer w-full bg-[#f2f2f4]"
              style="background-color: #f2f2f4 !important"
            >
              <div class="flex items-center justify-center gap-2 w-full">
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

            <!-- User Mode: Multiple Columns -->
            <template v-if="mode === 'user'">
              <th
                class="py-3 px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#f2f2f4]"
                style="background-color: #f2f2f4 !important"
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
                class="py-3 px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#f2f2f4]"
                style="background-color: #f2f2f4 !important"
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
                class="py-3 px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#f2f2f4]"
                style="background-color: #f2f2f4 !important"
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
                class="py-3 px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#f2f2f4]"
                style="background-color: #f2f2f4 !important"
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
                class="py-3 px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#f2f2f4]"
                style="background-color: #f2f2f4 !important"
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
            </template>

            <!-- Actions Column -->
            <th
              :class="[
                'py-3 px-2 sm:px-4 whitespace-nowrap w-[200px] bg-[#f2f2f4]',
                mode === 'notification' ? 'text-center' : 'text-start',
              ]"
              style="background-color: #f2f2f4 !important"
            >
              {{ mode === 'notification' ? 'Actions' : 'Action' }}
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody style="position: relative; z-index: 1">
          <!-- Notification Rows -->
          <template v-if="mode === 'notification'">
            <tr
              v-for="(item, i) in items as NotificationItem[]"
              :key="i"
              class="transition-all duration-150 h-[63px]"
              style="position: relative; z-index: 1"
            >
              <td class="py-3 pl-4 sm:pl-8 pr-2 sm:pr-4 align-middle">
                <div
                  class="flex items-center justify-start gap-3"
                  style="padding-left: 3px !important"
                >
                  <input
                    type="checkbox"
                    :checked="selectedItems.has(i)"
                    @change="handleSelectItem(i)"
                    class="w-4 h-4 border border-[#001346] rounded bg-white focus:ring-0 focus:ring-offset-0"
                  />
                  <div class="w-8 h-8 flex items-center justify-center">
                    <img
                      v-if="item.icon && item.icon.startsWith('data:')"
                      :src="item.icon"
                      :alt="item.name"
                      class="w-8 h-8 object-contain"
                      @error="handleIconError($event, item)"
                    />
                  </div>
                </div>
              </td>
              <td class="py-3 px-2 sm:px-4 text-[16px] font-medium text-center align-middle w-full">
                <div class="flex items-center justify-center w-full">
                  {{ item.name }}
                </div>
              </td>
              <td
                class="py-3 px-2 sm:px-4 align-middle text-center sticky right-0 bg-white z-0 w-[200px]"
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
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
            <tr v-if="!items || items.length === 0" class="h-[63px]">
              <td colspan="3" class="px-4 py-8 text-center text-[#001346B3]">
                No notification types found.
              </td>
            </tr>
          </template>

          <!-- User Rows -->
          <template v-else-if="mode === 'user'">
            <tr
              v-for="(user, index) in items as UserItem[]"
              :key="user.id || index"
              class="transition-all duration-150 h-[63px] bg-white hover:bg-[#F9FAFB]"
              style="position: relative; z-index: 1"
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
            <tr v-if="!items || items.length === 0" class="h-[63px]">
              <td colspan="7" class="px-4 py-8 text-center text-[#001346B3]">No users found.</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useTableSelection } from '@/composables/useTableSelection'

// Type Definitions
export interface NotificationItem {
  id?: number
  name: string
  icon?: string
  categoryType?: any
}

export interface UserItem {
  id?: number | string
  name?: string
  displayName?: string
  username?: string
  email?: string
  phoneNumber?: string
  role?: string
  status?: 'Active' | 'Deactivate'
}

export interface ColumnConfig {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (item: TableItem) => string | number
}

export type TableMode = 'user' | 'notification'
export type TableItem = NotificationItem | UserItem

// Props
const props = withDefaults(
  defineProps<{
    mode: TableMode
    items: TableItem[]
    columns?: ColumnConfig[] // Optional column configuration for future extensibility
  }>(),
  {
    mode: 'notification',
    columns: undefined,
  },
)

// Emits
const emit = defineEmits<{
  view: [item: TableItem]
  edit: [item: TableItem]
  delete: [item: TableItem]
  statusToggle: [item: UserItem, index: number]
}>()

// Use composable for selection logic
const itemsRef = toRef(props, 'items')
const { selectedItems, isAllSelected, isIndeterminate, handleSelectAll, handleSelectItem } =
  useTableSelection(itemsRef)

// Notification-specific handlers
const handleIconError = (event: Event, item: NotificationItem) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

// User-specific handlers
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

const handleStatusToggle = (user: UserItem, index: number) => {
  emit('statusToggle', user, index)
}
</script>

<style scoped>
/* User table specific styles */
table {
  table-layout: fixed;
}

/* Column width distribution for user mode */
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
