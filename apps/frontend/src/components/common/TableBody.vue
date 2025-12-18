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
              class="py-3 px-2 sm:px-4 text-center align-middle cursor-pointer bg-[#f2f2f4]"
              style="background-color: #f2f2f4 !important"
              @click="handleNameSort"
            >
              <div class="flex items-center justify-center gap-2">
                Name
                <img
                  src="@/assets/image/Vector.svg"
                  alt="Sort"
                  class="w-3 h-3 transition-transform duration-200"
                  :style="{
                    transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)',
                  }"
                />
              </div>
            </th>

            <!-- User Mode: Multiple Columns -->
            <template v-if="mode === 'user'">
              <th
                class="py-3 px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#f2f2f4]"
                style="background-color: #f2f2f4 !important"
                @click="handleNameSort"
              >
                <div class="flex items-center justify-start gap-2">
                  Name
                  <img
                    src="@/assets/image/Vector.svg"
                    alt="Sort"
                    class="w-3 h-3 transition-transform duration-200"
                    :style="{
                      transform:
                        sortColumn === 'name' && sortOrder === 'asc'
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                    }"
                  />
                </div>
              </th>
              <th
                class="py-3 px-2 sm:px-4 text-left align-middle bg-[#f2f2f4]"
                style="background-color: #f2f2f4 !important"
              >
                <div class="flex items-center justify-start gap-2">Email</div>
              </th>
              <th
                class="py-3 px-2 sm:px-4 text-left align-middle bg-[#f2f2f4]"
                style="background-color: #f2f2f4 !important"
              >
                <div class="flex items-center justify-start gap-2">Phone Number</div>
              </th>
              <th
                class="py-3 px-2 sm:px-4 text-left align-middle bg-[#f2f2f4]"
                style="background-color: #f2f2f4 !important"
              >
                <div class="flex items-center justify-start gap-2">Role</div>
              </th>
              <th
                class="py-3 px-2 sm:px-4 text-left align-middle cursor-pointer bg-[#f2f2f4]"
                style="background-color: #f2f2f4 !important"
                @click="handleStatusSort"
              >
                <div class="flex items-center justify-start gap-2">
                  Status
                  <img
                    src="@/assets/image/Vector.svg"
                    alt="Sort"
                    class="w-3 h-3 transition-transform duration-200"
                    :style="{
                      transform:
                        sortColumn === 'status' && sortOrder === 'asc'
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                    }"
                  />
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
              v-for="(item, i) in sortedItems as NotificationItem[]"
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
              <td class="py-3 px-2 sm:px-4 text-center align-middle">
                <div
                  class="flex items-center justify-center"
                  style="
                    font-family: 'IBM Plex Sans', sans-serif;
                    font-weight: 400;
                    font-style: normal;
                    font-size: 14px;
                    line-height: 150%;
                    letter-spacing: 0%;
                  "
                >
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
                    <img
                      src="@/assets/image/view_16.svg"
                      alt="View"
                      class="w-3 h-3 sm:w-4 sm:h-4"
                    />
                  </button>
                  <button
                    class="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] flex items-center justify-center rounded-full bg-[#0D1C50] text-white hover:bg-[#12236d] transition-all duration-200 flex-shrink-0"
                    title="Edit"
                    @click="$emit('edit', item)"
                  >
                    <img src="@/assets/image/edit.svg" alt="Edit" class="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    class="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] flex items-center justify-center rounded-full bg-[#F24444] text-white hover:bg-[#d82c2c] transition-all duration-200 flex-shrink-0"
                    title="Delete"
                    @click="$emit('delete', item)"
                  >
                    <img
                      src="@/assets/image/trash-can.svg"
                      alt="Delete"
                      class="w-3 h-3 sm:w-4 sm:h-4"
                    />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!sortedItems || sortedItems.length === 0" class="h-[63px]">
              <td colspan="3" class="px-4 py-8 text-center text-[#001346B3]">
                No notification types found.
              </td>
            </tr>
          </template>

          <!-- User Rows -->
          <template v-else-if="mode === 'user'">
            <tr
              v-for="(user, index) in sortedItems as UserItem[]"
              :key="`user-${user.id || user.email || user.phoneNumber || index}`"
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
                  <span class="text-[16px] font-medium text-[#001346]">{{ index + 1 }}</span>
                </div>
              </td>
              <td class="py-3 px-2 sm:px-4 text-[#001346] align-middle">
                <span
                  style="
                    font-family: 'IBM Plex Sans', sans-serif;
                    font-weight: 400;
                    font-style: normal;
                    font-size: 14px;
                    line-height: 150%;
                    letter-spacing: 0%;
                  "
                >
                  {{ user.name || user.displayName || user.username || `Prolos ${index + 2}` }}
                </span>
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
                    'text-white text-[14px] font-medium flex items-center justify-center cursor-default',
                    user.status === 'Active' || !user.status ? 'bg-[#0D1C50]' : 'bg-[#F59E0B]',
                  ]"
                  :style="{
                    width: user.status === 'Deactivate' ? '102px' : '72px',
                    height: '32px',
                    padding: '8px 16px',
                    borderRadius: '32px',
                    opacity: 1,
                    pointerEvents: 'none',
                  }"
                  disabled
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
                    <img
                      src="@/assets/image/view_16.svg"
                      alt="View"
                      class="w-3 h-3 sm:w-4 sm:h-4"
                    />
                  </button>
                  <button
                    class="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] flex items-center justify-center rounded-full bg-[#0D1C50] text-white hover:bg-[#12236d] transition-all duration-200 flex-shrink-0"
                    title="Edit"
                    @click="$emit('edit', user)"
                  >
                    <img src="@/assets/image/edit.svg" alt="Edit" class="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    class="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] flex items-center justify-center rounded-full bg-[#F24444] text-white hover:bg-[#d82c2c] transition-all duration-200 flex-shrink-0"
                    title="Delete"
                    @click="$emit('delete', user)"
                  >
                    <img
                      src="@/assets/image/trash-can.svg"
                      alt="Delete"
                      class="w-3 h-3 sm:w-4 sm:h-4"
                    />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!sortedItems || sortedItems.length === 0" class="h-[63px]">
              <td colspan="7" class="px-4 py-8 text-center text-[#001346B3]">No users found.</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, ref, watch } from 'vue'
import { useTableSelection } from '../../composables/useTableSelection'

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
}>()

// Use composable for selection logic
const itemsRef = toRef(props, 'items')
const { selectedItems, isAllSelected, isIndeterminate, handleSelectAll, handleSelectItem } =
  useTableSelection(itemsRef)

// Sorting state
const sortColumn = ref<'name' | 'status' | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

// Type for items with original index (for user mode)
interface UserItemWithIndex extends UserItem {
  _originalIndex: number
}

// Sorted items computed property
const sortedItems = computed(() => {
  if (props.mode === 'notification') {
    if (sortOrder.value === null || sortColumn.value !== 'name') {
      return props.items
    }

    const items = [...props.items] as NotificationItem[]

    return items.sort((a, b) => {
      const nameA = a.name || ''
      const nameB = b.name || ''

      // Case-insensitive comparison using localeCompare
      const comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })

      return sortOrder.value === 'asc' ? comparison : -comparison
    })
  } else if (props.mode === 'user') {
    // Always map items with their original indices for user mode
    // Use spread operator to preserve ALL properties including phoneNumber
    const itemsWithIndex = (props.items as UserItem[]).map((item, index) => ({
      ...item, // This preserves all properties: id, name, email, phoneNumber, role, status, etc.
      _originalIndex: index,
    })) as UserItemWithIndex[]

    if (sortOrder.value === null || sortColumn.value === null) {
      return itemsWithIndex
    }

    // Sort by the selected column
    return itemsWithIndex.sort((a, b) => {
      let comparison = 0

      if (sortColumn.value === 'name') {
        const nameA = a.name || a.displayName || a.username || ''
        const nameB = b.name || b.displayName || b.username || ''
        comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
      } else if (sortColumn.value === 'status') {
        const statusA = a.status || 'Active'
        const statusB = b.status || 'Active'
        // Active comes before Deactivate
        if (statusA === statusB) {
          comparison = 0
        } else if (statusA === 'Active') {
          comparison = -1
        } else {
          comparison = 1
        }
      }

      return sortOrder.value === 'asc' ? comparison : -comparison
    })
  }

  return props.items
})

// Sort handler for Name column
const handleNameSort = () => {
  if (sortColumn.value !== 'name') {
    sortColumn.value = 'name'
    sortOrder.value = 'asc'
  } else if (sortOrder.value === 'asc') {
    sortOrder.value = 'desc'
  } else {
    sortOrder.value = 'asc'
  }
}

// Sort handler for Status column
const handleStatusSort = () => {
  if (sortColumn.value !== 'status') {
    sortColumn.value = 'status'
    sortOrder.value = 'asc'
  } else if (sortOrder.value === 'asc') {
    sortOrder.value = 'desc'
  } else {
    sortOrder.value = 'asc'
  }
}

// Watch for items changes to reset sort order (e.g., after page refresh)
// This ensures that when data is refreshed, sort state resets and phoneNumber stays with Name
watch(
  () => props.items,
  (newItems, oldItems) => {
    // Reset sort order when items change (e.g., after refresh)
    // This prevents phoneNumber from being misaligned after refresh
    if (props.mode === 'user') {
      // Check if items actually changed by comparing length or first item
      const newUserItems = newItems as UserItem[]
      const oldUserItems = (oldItems as UserItem[]) || undefined

      if (
        !oldUserItems ||
        newUserItems.length !== oldUserItems.length ||
        (newUserItems.length > 0 &&
          oldUserItems.length > 0 &&
          (newUserItems[0]?.id !== oldUserItems[0]?.id ||
            newUserItems[0]?.phoneNumber !== oldUserItems[0]?.phoneNumber))
      ) {
        sortColumn.value = null
        sortOrder.value = null
      }
    }
  },
  { deep: false },
)

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
