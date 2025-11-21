import { FirebaseManager } from './firebase-manager.service'
import { BakongApp } from '@bakong/shared'
import * as fs from 'fs'
import * as path from 'path'

// Mock firebase-admin
const mockApp = { name: 'test-app' }
const mockMessaging = {}

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => mockApp),
  getApp: jest.fn(() => {
    throw new Error('App does not exist')
  }),
  getApps: jest.fn(() => []),
  cert: jest.fn((serviceAccount) => serviceAccount),
}))

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(() => mockMessaging),
}))

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}))

describe('FirebaseManager', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset static state
    ;(FirebaseManager as any).apps = new Map()
    ;(FirebaseManager as any).messagingInstances = new Map()
    ;(FirebaseManager as any).initialized = false
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  describe('getAppName', () => {
    it('should return correct app name for BAKONG in staging', () => {
      process.env.NODE_ENV = 'staging'
      const appName = FirebaseManager.getAppName(BakongApp.BAKONG)
      expect(appName).toBe('bakong-sit')
    })

    it('should return correct app name for BAKONG_JUNIOR in production', () => {
      process.env.NODE_ENV = 'production'
      const appName = FirebaseManager.getAppName(BakongApp.BAKONG_JUNIOR)
      expect(appName).toBe('bakong-junior-uat')
    })

    it('should return correct app name for BAKONG_TOURIST in staging', () => {
      process.env.NODE_ENV = 'staging'
      const appName = FirebaseManager.getAppName(BakongApp.BAKONG_TOURIST)
      expect(appName).toBe('bakong-tourist-sit')
    })

    it('should return correct app name for development', () => {
      process.env.NODE_ENV = 'development'
      const appName = FirebaseManager.getAppName(BakongApp.BAKONG)
      expect(appName).toBe('bakong-dev')
    })
  })

  describe('getServiceAccountPath', () => {
    beforeEach(() => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)
    })

    it('should return correct path for BAKONG in staging', () => {
      process.env.NODE_ENV = 'staging'
      ;(fs.existsSync as jest.Mock).mockImplementation((p: string) => {
        return p.includes('bakong-sit-firebase-service-account.json')
      })

      const path = FirebaseManager.getServiceAccountPath(BakongApp.BAKONG)
      expect(path).toContain('bakong-sit-firebase-service-account.json')
    })

    it('should return correct path for BAKONG_JUNIOR in production', () => {
      process.env.NODE_ENV = 'production'
      ;(fs.existsSync as jest.Mock).mockImplementation((p: string) => {
        return p.includes('bakong-junior-uat-firebase-service-account.json')
      })

      const path = FirebaseManager.getServiceAccountPath(BakongApp.BAKONG_JUNIOR)
      expect(path).toContain('bakong-junior-uat-firebase-service-account.json')
    })

    it('should return correct path for BAKONG_TOURIST in staging', () => {
      process.env.NODE_ENV = 'staging'
      ;(fs.existsSync as jest.Mock).mockImplementation((p: string) => {
        return p.includes('bakong-tourists-sit-firebase-service-account.json')
      })

      const path = FirebaseManager.getServiceAccountPath(BakongApp.BAKONG_TOURIST)
      expect(path).toContain('bakong-tourists-sit-firebase-service-account.json')
    })

    it('should return null if file not found', () => {
      process.env.NODE_ENV = 'staging'
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)

      const path = FirebaseManager.getServiceAccountPath(BakongApp.BAKONG)
      expect(path).toBeNull()
    })
  })

  describe('getMessaging', () => {
    it('should return null if platform is not initialized', () => {
      const { getMessaging } = require('firebase-admin/messaging')
      ;(getMessaging as jest.Mock).mockImplementation(() => {
        throw new Error('No default app')
      })
      const messaging = FirebaseManager.getMessaging(BakongApp.BAKONG)
      // Should fallback to default, which will throw error and return null
      expect(messaging).toBeNull()
    })

    it('should return null if platform is null', () => {
      const { getMessaging } = require('firebase-admin/messaging')
      ;(getMessaging as jest.Mock).mockImplementation(() => {
        throw new Error('No default app')
      })
      const messaging = FirebaseManager.getMessaging(null)
      expect(messaging).toBeNull()
    })
  })

  describe('isPlatformInitialized', () => {
    it('should return false if platform is not initialized', () => {
      const isInitialized = FirebaseManager.isPlatformInitialized(BakongApp.BAKONG)
      expect(isInitialized).toBe(false)
    })
  })

  describe('getInitializedApps', () => {
    it('should return empty array if no apps initialized', () => {
      const apps = FirebaseManager.getInitializedApps()
      expect(apps).toEqual([])
    })
  })

  describe('initializeAll', () => {
    const mockServiceAccount = {
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: 'test-key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
      client_email: 'test@test.iam.gserviceaccount.com',
      client_id: '123456789',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url:
        'https://www.googleapis.com/robot/v1/metadata/x509/test%40test.iam.gserviceaccount.com',
    }

    beforeEach(() => {
      process.env.NODE_ENV = 'staging'
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockServiceAccount))
    })

    it('should initialize all Firebase apps successfully', async () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)

      const { initializeApp } = require('firebase-admin/app')
      const { getMessaging } = require('firebase-admin/messaging')

      ;(initializeApp as jest.Mock).mockReturnValue(mockApp)
      ;(getMessaging as jest.Mock).mockReturnValue(mockMessaging)

      const result = await FirebaseManager.initializeAll()

      expect(result.success).toBe(3) // All 3 platforms should succeed
      expect(initializeApp).toHaveBeenCalled()
    })

    it('should handle missing service account files gracefully', async () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)

      const result = await FirebaseManager.initializeAll()

      expect(result.failed).toBeGreaterThan(0)
      expect(result.success).toBe(0)
    })

    it('should handle invalid service account JSON gracefully', async () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue('invalid json')

      const result = await FirebaseManager.initializeAll()

      expect(result.failed).toBeGreaterThan(0)
    })

    it('should not re-initialize if already initialized', async () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)

      const { initializeApp } = require('firebase-admin/app')
      const mockApp = { name: 'test-app' }
      ;(initializeApp as jest.Mock).mockReturnValue(mockApp)

      await FirebaseManager.initializeAll()
      const firstCallCount = (initializeApp as jest.Mock).mock.calls.length

      await FirebaseManager.initializeAll()
      const secondCallCount = (initializeApp as jest.Mock).mock.calls.length

      expect(secondCallCount).toBe(firstCallCount)
    })
  })
})
