import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useTableSelection } from '../useTableSelection'

describe('useTableSelection', () => {
  it('initializes with no items selected', () => {
    const items = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const { selectedItems, isAllSelected, isIndeterminate } = useTableSelection(items)

    expect(selectedItems.value.size).toBe(0)
    expect(isAllSelected.value).toBe(false)
    expect(isIndeterminate.value).toBe(false)
  })

  it('selects a single item', () => {
    const items = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const { handleSelectItem, isSelected } = useTableSelection(items)

    handleSelectItem(0)
    expect(isSelected(0)).toBe(true)
    expect(isSelected(1)).toBe(false)
    expect(isSelected(2)).toBe(false)
  })

  it('deselects an item when clicked again', () => {
    const items = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const { handleSelectItem, isSelected } = useTableSelection(items)

    handleSelectItem(0)
    expect(isSelected(0)).toBe(true)

    handleSelectItem(0)
    expect(isSelected(0)).toBe(false)
  })

  it('selects all items when handleSelectAll is called', () => {
    const items = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const { handleSelectAll, isAllSelected, getSelectedIndices } = useTableSelection(items)

    handleSelectAll()
    expect(isAllSelected.value).toBe(true)
    expect(getSelectedIndices()).toEqual([0, 1, 2])
  })

  it('deselects all items when handleSelectAll is called again', () => {
    const items = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const { handleSelectAll, isAllSelected, getSelectedIndices } = useTableSelection(items)

    handleSelectAll()
    expect(isAllSelected.value).toBe(true)

    handleSelectAll()
    expect(isAllSelected.value).toBe(false)
    expect(getSelectedIndices()).toEqual([])
  })

  it('shows indeterminate state when some items are selected', () => {
    const items = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const { handleSelectItem, isIndeterminate } = useTableSelection(items)

    handleSelectItem(0)
    handleSelectItem(1)

    expect(isIndeterminate.value).toBe(true)
  })

  it('returns correct selected items', () => {
    const items = ref([
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
    ])
    const { handleSelectItem, getSelectedItems } = useTableSelection(items)

    handleSelectItem(0)
    handleSelectItem(2)

    const selected = getSelectedItems()
    expect(selected).toHaveLength(2)
    expect(selected[0]).toEqual({ id: 1, name: 'Item 1' })
    expect(selected[1]).toEqual({ id: 3, name: 'Item 3' })
  })

  it('clears selection when clearSelection is called', () => {
    const items = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const { handleSelectItem, clearSelection, getSelectedIndices } = useTableSelection(items)

    handleSelectItem(0)
    handleSelectItem(1)
    expect(getSelectedIndices()).toHaveLength(2)

    clearSelection()
    expect(getSelectedIndices()).toHaveLength(0)
  })

  it('selects all when selectAll is called', () => {
    const items = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const { selectAll, getSelectedIndices } = useTableSelection(items)

    selectAll()
    expect(getSelectedIndices()).toEqual([0, 1, 2])
  })

  it('handles empty items array', () => {
    const items = ref([])
    const { isAllSelected, isIndeterminate, handleSelectAll } = useTableSelection(items)

    expect(isAllSelected.value).toBe(false)
    expect(isIndeterminate.value).toBe(false)

    handleSelectAll()
    expect(isAllSelected.value).toBe(false)
  })

  it('reacts to items array changes', () => {
    const items = ref([{ id: 1 }, { id: 2 }])
    const { handleSelectAll, isAllSelected } = useTableSelection(items)

    handleSelectAll()
    expect(isAllSelected.value).toBe(true)

    // Add new item
    items.value.push({ id: 3 })
    expect(isAllSelected.value).toBe(false) // Should be false because new item is not selected
  })
})
