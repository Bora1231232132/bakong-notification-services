import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { categoryTypeApi, type CategoryType } from '@/services/categoryTypeApi'

// Cache TTL: 14 minutes (same as notification cache for consistency)
const CACHE_TTL = 14 * 60 * 1000
const CACHE_STORAGE_KEY = 'category_types_cache'
const CACHE_TIMESTAMP_KEY = 'category_types_cache_timestamp'

interface CacheEntry {
  data: CategoryType[]
  timestamp: number
}

export const useCategoryTypesStore = defineStore('categoryTypes', () => {
  const categoryTypes = ref<CategoryType[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const cache = ref<CacheEntry | null>(null)

  /**
   * Load cache from localStorage
   */
  const loadCacheFromStorage = (): { categoryTypes: CategoryType[] | null; timestamp: number } => {
    try {
      const cachedData = localStorage.getItem(CACHE_STORAGE_KEY)
      const cachedTime = localStorage.getItem(CACHE_TIMESTAMP_KEY)

      if (cachedData && cachedTime) {
        const timestamp = parseInt(cachedTime, 10)
        const now = Date.now()
        if (now - timestamp < CACHE_TTL) {
          return {
            categoryTypes: JSON.parse(cachedData) as CategoryType[],
            timestamp,
          }
        } else {
          // Cache expired, remove it
          localStorage.removeItem(CACHE_STORAGE_KEY)
          localStorage.removeItem(CACHE_TIMESTAMP_KEY)
        }
      }
    } catch (error) {
      console.warn('Failed to load category types cache from localStorage:', error)
      localStorage.removeItem(CACHE_STORAGE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
    }
    return { categoryTypes: null, timestamp: 0 }
  }

  /**
   * Save cache to localStorage
   */
  const saveCacheToStorage = (types: CategoryType[], timestamp: number): void => {
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(types))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString())
    } catch (error) {
      console.warn('Failed to save category types cache to localStorage:', error)
      try {
        // Try clearing and saving again
        localStorage.removeItem(CACHE_STORAGE_KEY)
        localStorage.removeItem(CACHE_TIMESTAMP_KEY)
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(types))
        localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString())
      } catch (e) {
        console.error('Could not save category types cache even after clearing:', e)
      }
    }
  }

  /**
   * Clear cache from localStorage
   */
  const clearCacheFromStorage = (): void => {
    try {
      localStorage.removeItem(CACHE_STORAGE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
    } catch (error) {
      console.warn('Failed to clear category types cache from localStorage:', error)
    }
  }

  /**
   * Check if cache is still valid (checks both in-memory and localStorage)
   */
  const isCacheValid = (): boolean => {
    // First check in-memory cache
    if (cache.value) {
      const now = Date.now()
      if (now - cache.value.timestamp < CACHE_TTL) {
        return true
      }
    }

    // Check localStorage cache
    const storageCache = loadCacheFromStorage()
    if (storageCache.categoryTypes && storageCache.categoryTypes.length > 0) {
      // Load from localStorage into in-memory cache
      cache.value = {
        data: storageCache.categoryTypes,
        timestamp: storageCache.timestamp,
      }
      categoryTypes.value = storageCache.categoryTypes
      return true
    }

    return false
  }

  // Initialize from localStorage on store creation
  const initialCache = loadCacheFromStorage()
  if (initialCache.categoryTypes && initialCache.categoryTypes.length > 0) {
    categoryTypes.value = initialCache.categoryTypes
    cache.value = {
      data: initialCache.categoryTypes,
      timestamp: initialCache.timestamp,
    }
  }

  /**
   * Load category types from cache if valid, otherwise fetch from API
   */
  const fetchCategoryTypes = async (forceRefresh = false): Promise<CategoryType[]> => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid() && cache.value) {
      // Data already loaded from localStorage in isCacheValid()
      return cache.value.data
    }

    loading.value = true
    error.value = null

    try {
      const types = await categoryTypeApi.getAll()
      const timestamp = Date.now()

      categoryTypes.value = types

      // Update in-memory cache
      cache.value = {
        data: types,
        timestamp,
      }

      // Save to localStorage
      saveCacheToStorage(types, timestamp)

      return types
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch category types'
      console.error('Error fetching category types:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get category type by ID
   */
  const getCategoryTypeById = (id: number): CategoryType | undefined => {
    return categoryTypes.value.find((ct) => ct.id === id)
  }

  /**
   * Get category type by name
   */
  const getCategoryTypeByName = (name: string): CategoryType | undefined => {
    return categoryTypes.value.find((ct) => ct.name === name)
  }

  /**
   * Clear cache - called after create/update/delete operations
   */
  const clearCache = (): void => {
    cache.value = null
    clearCacheFromStorage()
  }

  /**
   * Add a category type to the store (after creation)
   */
  const addCategoryType = (categoryType: CategoryType): void => {
    const exists = categoryTypes.value.find((ct) => ct.id === categoryType.id)
    if (!exists) {
      categoryTypes.value.push(categoryType)
      // Sort by name to maintain order
      categoryTypes.value.sort((a, b) => a.name.localeCompare(b.name))

      // Update cache
      const timestamp = Date.now()
      cache.value = {
        data: categoryTypes.value,
        timestamp,
      }
      saveCacheToStorage(categoryTypes.value, timestamp)
    }
  }

  /**
   * Update a category type in the store (after update)
   */
  const updateCategoryType = (categoryType: CategoryType): void => {
    const index = categoryTypes.value.findIndex((ct) => ct.id === categoryType.id)
    if (index !== -1) {
      categoryTypes.value[index] = categoryType
      // Sort by name to maintain order
      categoryTypes.value.sort((a, b) => a.name.localeCompare(b.name))

      // Update cache
      const timestamp = Date.now()
      cache.value = {
        data: categoryTypes.value,
        timestamp,
      }
      saveCacheToStorage(categoryTypes.value, timestamp)
    }
  }

  /**
   * Remove a category type from the store (after deletion)
   */
  const removeCategoryType = (id: number): void => {
    const index = categoryTypes.value.findIndex((ct) => ct.id === id)
    if (index !== -1) {
      categoryTypes.value.splice(index, 1)

      // Update cache
      const timestamp = Date.now()
      cache.value = {
        data: categoryTypes.value,
        timestamp,
      }
      saveCacheToStorage(categoryTypes.value, timestamp)
    }
  }

  /**
   * Initialize store - fetch category types if not cached
   */
  const initialize = async (): Promise<void> => {
    if (categoryTypes.value.length === 0 || !isCacheValid()) {
      await fetchCategoryTypes()
    }
  }

  return {
    // State
    categoryTypes,
    loading,
    error,
    // Getters
    getCategoryTypeById,
    getCategoryTypeByName,
    // Actions
    fetchCategoryTypes,
    clearCache,
    addCategoryType,
    updateCategoryType,
    removeCategoryType,
    initialize,
  }
})
