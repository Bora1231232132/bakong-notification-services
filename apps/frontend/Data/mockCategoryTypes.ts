/**
 * Mock category type data for frontend development and testing
 * This data matches the CategoryType interface with all required fields
 */

import type { CategoryType } from '@/services/categoryTypeApi'

/**
 * Base64 placeholder icon (1x1 transparent PNG)
 * In real scenarios, this would be actual icon data
 */
const PLACEHOLDER_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/**
 * Category type names pool for generating mock data
 */
const categoryTypeNames = [
  'Event',
  'News',
  'Other',
  'Product & Feature',
  'Announcement',
  'Update',
  'Promotion',
  'Alert',
  'Reminder',
  'Notification',
  'System',
  'User',
  'Transaction',
  'Payment',
  'Security',
  'Maintenance',
  'Feature',
  'Service',
  'Campaign',
  'Marketing',
  'Support',
  'Technical',
  'Business',
  'Finance',
  'Legal',
  'HR',
  'Operations',
  'Development',
  'Testing',
  'Deployment',
]

/**
 * Generate a random date within the last year
 */
const generateRandomDate = (): string => {
  const now = new Date()
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  const randomTime = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime())
  return new Date(randomTime).toISOString()
}

/**
 * Generate 50 mock category types for testing
 */
const generateMockCategoryTypes = (): CategoryType[] => {
  const categoryTypes: CategoryType[] = []
  const usedNames = new Set<string>()

  for (let i = 1; i <= 50; i++) {
    // Ensure unique names by appending number if needed
    let baseName = categoryTypeNames[(i - 1) % categoryTypeNames.length]
    let name = baseName
    let counter = 1

    while (usedNames.has(name)) {
      name = `${baseName} ${counter}`
      counter++
    }
    usedNames.add(name)

    const createdAt = generateRandomDate()
    const updatedAt = Math.random() > 0.3 ? generateRandomDate() : undefined

    categoryTypes.push({
      id: i,
      name,
      icon: PLACEHOLDER_ICON,
      mimeType: 'image/png',
      originalFileName: `icon-${i}.png`,
      createdAt,
      updatedAt,
    })
  }

  return categoryTypes
}

export const mockCategoryTypes: CategoryType[] = generateMockCategoryTypes()

/**
 * Realistic mock category types (optional - for better testing)
 * Includes the common category types mentioned in the UI
 */
export const realisticMockCategoryTypes: CategoryType[] = [
  {
    id: 1,
    name: 'Event',
    icon: PLACEHOLDER_ICON,
    mimeType: 'image/png',
    originalFileName: 'event-icon.png',
    createdAt: new Date('2024-01-15T10:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-20T14:30:00Z').toISOString(),
  },
  {
    id: 2,
    name: 'News',
    icon: PLACEHOLDER_ICON,
    mimeType: 'image/png',
    originalFileName: 'news-icon.png',
    createdAt: new Date('2024-01-16T09:00:00Z').toISOString(),
    updatedAt: new Date('2024-02-01T11:00:00Z').toISOString(),
  },
  {
    id: 3,
    name: 'Other',
    icon: PLACEHOLDER_ICON,
    mimeType: 'image/png',
    originalFileName: 'other-icon.png',
    createdAt: new Date('2024-01-17T08:00:00Z').toISOString(),
    updatedAt: undefined,
  },
  {
    id: 4,
    name: 'Product & Feature',
    icon: PLACEHOLDER_ICON,
    mimeType: 'image/png',
    originalFileName: 'product-feature-icon.png',
    createdAt: new Date('2024-01-18T12:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-25T16:00:00Z').toISOString(),
  },
  {
    id: 5,
    name: 'Announcement',
    icon: PLACEHOLDER_ICON,
    mimeType: 'image/png',
    originalFileName: 'announcement-icon.png',
    createdAt: new Date('2024-01-19T10:30:00Z').toISOString(),
    updatedAt: new Date('2024-01-22T15:00:00Z').toISOString(),
  },
]
