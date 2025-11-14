import { ref, computed } from 'vue'
import { formatStatus } from '../utils/helpers'

export interface StatusConfig {
  type: 'success' | 'error' | 'warning' | 'info' | 'pending'
  label: string
  color?: string
  icon?: string
}

export interface StatusItem {
  id: string
  status: string
  timestamp: Date
  data?: any
}

export function useStatusManager() {
  const statuses = ref<Map<string, StatusItem>>(new Map())
  const statusHistory = ref<StatusItem[]>([])

  const statusConfigs: Record<string, StatusConfig> = {
    SENT: { type: 'success', label: formatStatus('SENT'), color: '#67c23a', icon: 'check' },
    SCHEDULED: { type: 'info', label: formatStatus('SCHEDULED'), color: '#409eff', icon: 'clock' },
    INTERVALED: {
      type: 'warning',
      label: formatStatus('INTERVALED'),
      color: '#e6a23c',
      icon: 'timer',
    },
    ERROR: { type: 'error', label: formatStatus('ERROR'), color: '#f56c6c', icon: 'close' },
    PENDING: { type: 'pending', label: formatStatus('PENDING'), color: '#909399', icon: 'loading' },
    UNKNOWN: { type: 'info', label: formatStatus('UNKNOWN'), color: '#909399', icon: 'question' },
  }

  const getStatusConfig = (status: string): StatusConfig => {
    return statusConfigs[status] || statusConfigs.UNKNOWN
  }

  const updateStatus = (id: string, status: string, data?: any) => {
    const statusItem: StatusItem = {
      id,
      status,
      timestamp: new Date(),
      data,
    }

    statuses.value.set(id, statusItem)
    statusHistory.value.unshift(statusItem)
    if (statusHistory.value.length > 100) {
      statusHistory.value = statusHistory.value.slice(0, 100)
    }
  }

  const getStatus = (id: string): StatusItem | undefined => {
    return statuses.value.get(id)
  }

  const getStatusHistory = (id?: string): StatusItem[] => {
    if (id) {
      return statusHistory.value.filter((item) => item.id === id)
    }
    return statusHistory.value
  }

  const clearStatus = (id: string) => {
    statuses.value.delete(id)
  }

  const clearAllStatuses = () => {
    statuses.value.clear()
    statusHistory.value = []
  }

  const getStatusCounts = () => {
    const counts: Record<string, number> = {}

    statuses.value.forEach((status) => {
      counts[status.status] = (counts[status.status] || 0) + 1
    })

    return counts
  }

  const getRecentStatuses = (limit: number = 10): StatusItem[] => {
    return statusHistory.value.slice(0, limit)
  }

  const getStatusesByType = (type: string): StatusItem[] => {
    return Array.from(statuses.value.values()).filter((item) => item.status === type)
  }

  const isStatusActive = (id: string, status: string): boolean => {
    const currentStatus = statuses.value.get(id)
    return currentStatus?.status === status
  }

  const getStatusAge = (id: string): number | null => {
    const status = statuses.value.get(id)
    if (!status) return null

    return Date.now() - status.timestamp.getTime()
  }

  const getStatusAgeFormatted = (id: string): string | null => {
    const age = getStatusAge(id)
    if (age === null) return null

    const seconds = Math.floor(age / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  const exportStatuses = (format: 'json' | 'csv' = 'json') => {
    const data = Array.from(statuses.value.values())

    if (format === 'json') {
      const jsonContent = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'statuses.json'
      link.click()
      URL.revokeObjectURL(url)
    } else {
      const headers = ['ID', 'Status', 'Timestamp', 'Data']
      const rows = data.map((item) => [
        item.id,
        item.status,
        item.timestamp.toISOString(),
        JSON.stringify(item.data || {}),
      ])

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'statuses.csv'
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  return {
    statuses: computed(() => statuses.value),
    statusHistory: computed(() => statusHistory.value),

    getStatusConfig,
    updateStatus,
    getStatus,
    getStatusHistory,
    clearStatus,
    clearAllStatuses,
    getStatusCounts,
    getRecentStatuses,
    getStatusesByType,
    isStatusActive,
    getStatusAge,
    getStatusAgeFormatted,
    exportStatuses,
  }
}
