import { ref, computed, type Ref } from 'vue'

/**
 * Composable for managing table row selection state
 * Provides checkbox selection logic that can be reused across table components
 *
 * @param items - Reactive array of items to track selection for
 * @returns Selection state and handlers
 */
export function useTableSelection<T>(items: Ref<T[]>) {
  const selectedItems = ref<Set<number>>(new Set())

  const isAllSelected = computed(() => {
    return items.value.length > 0 && selectedItems.value.size === items.value.length
  })

  const isIndeterminate = computed(() => {
    return selectedItems.value.size > 0 && selectedItems.value.size < items.value.length
  })

  const handleSelectAll = () => {
    if (isAllSelected.value) {
      selectedItems.value.clear()
    } else {
      selectedItems.value.clear()
      items.value.forEach((_, index) => {
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

  const clearSelection = () => {
    selectedItems.value.clear()
  }

  const selectAll = () => {
    selectedItems.value.clear()
    items.value.forEach((_, index) => {
      selectedItems.value.add(index)
    })
  }

  const getSelectedIndices = () => {
    return Array.from(selectedItems.value)
  }

  const getSelectedItems = () => {
    return getSelectedIndices().map((index) => items.value[index])
  }

  const isSelected = (index: number) => {
    return selectedItems.value.has(index)
  }

  return {
    selectedItems,
    isAllSelected,
    isIndeterminate,
    handleSelectAll,
    handleSelectItem,
    clearSelection,
    selectAll,
    getSelectedIndices,
    getSelectedItems,
    isSelected,
  }
}
