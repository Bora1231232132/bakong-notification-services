import { Injectable, OnModuleInit } from '@nestjs/common'
import { getApp, initializeApp, App } from 'firebase-admin/app'
import { cert } from 'firebase-admin/app'
import { getMessaging, Messaging } from 'firebase-admin/messaging'
import * as fs from 'fs'
import * as path from 'path'
import { BakongApp } from '@bakong/shared'

/**
 * FirebaseManager manages multiple Firebase apps for different Bakong platforms
 * Each platform (BAKONG, BAKONG_JUNIOR, BAKONG_TOURIST) has separate Firebase projects
 * for SIT and Production environments
 */
@Injectable()
export class FirebaseManager implements OnModuleInit {
  private static apps: Map<string, App> = new Map()
  private static messagingInstances: Map<string, Messaging> = new Map()
  private static initialized = false

  async onModuleInit() {
    await FirebaseManager.initializeAll()
  }

  /**
   * Initialize all Firebase apps for all platforms and environments
   */
  static async initializeAll(): Promise<{ success: number; failed: number }> {
    if (FirebaseManager.initialized) {
      console.log('[FirebaseManager] Already initialized, skipping...')
      return { success: FirebaseManager.apps.size, failed: 0 }
    }

    const nodeEnv = process.env.NODE_ENV || 'development'
    const isStaging = nodeEnv === 'staging'
    const isProduction = nodeEnv === 'production'

    console.log('[FirebaseManager] Initializing Firebase apps...', {
      nodeEnv,
      isStaging,
      isProduction,
    })

    const platforms: BakongApp[] = [
      BakongApp.BAKONG,
      BakongApp.BAKONG_JUNIOR,
      BakongApp.BAKONG_TOURIST,
    ]

    let successCount = 0
    let failedCount = 0

    for (const platform of platforms) {
      try {
        const appName = FirebaseManager.getAppName(platform)
        const serviceAccountPath = FirebaseManager.getServiceAccountPath(platform)

        if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
          console.warn(
            `[FirebaseManager] Service account file not found for ${platform}: ${serviceAccountPath}`,
          )
          failedCount++
          continue
        }

        // Check if app already exists
        try {
          const existingApp = getApp(appName)
          console.log(`[FirebaseManager] App ${appName} already exists, skipping...`)
          FirebaseManager.apps.set(appName, existingApp)
          successCount++
          continue
        } catch (e) {
          // App doesn't exist, proceed to initialize
        }

        const fileContent = fs.readFileSync(serviceAccountPath, 'utf8')
        const serviceAccount = JSON.parse(fileContent)

        if (
          !serviceAccount.project_id ||
          !serviceAccount.private_key ||
          !serviceAccount.client_email
        ) {
          console.error(
            `[FirebaseManager] Invalid service account file for ${platform}: missing required fields`,
          )
          failedCount++
          continue
        }

        const app = initializeApp(
          {
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id,
          },
          appName,
        )

        FirebaseManager.apps.set(appName, app)
        const messaging = getMessaging(app)
        FirebaseManager.messagingInstances.set(appName, messaging)

        console.log(
          `[FirebaseManager] ✅ Initialized Firebase app: ${appName} (project: ${serviceAccount.project_id})`,
        )
        console.log(
          `[FirebaseManager] 📄 Service account file: ${serviceAccountPath}`,
        )
        console.log(
          `[FirebaseManager] 📧 Service account email: ${serviceAccount.client_email}`,
        )
        successCount++
      } catch (error: any) {
        console.error(`[FirebaseManager] ❌ Failed to initialize Firebase app for ${platform}:`, {
          error: error?.message || String(error),
          code: error?.code || 'N/A',
        })
        failedCount++
      }
    }

    FirebaseManager.initialized = true
    console.log(
      `[FirebaseManager] Initialization complete: ${successCount} successful, ${failedCount} failed`,
    )

    return { success: successCount, failed: failedCount }
  }

  /**
   * Get Firebase Messaging instance for a specific Bakong platform
   * Falls back to default app if platform-specific app is not available
   */
  static getMessaging(bakongPlatform?: string | null): Messaging | null {
    if (!bakongPlatform) {
      // Fallback to default app
      try {
        return getMessaging()
      } catch (e) {
        console.warn('[FirebaseManager] Default Firebase app not available')
        return null
      }
    }

    const appName = FirebaseManager.getAppName(bakongPlatform)
    const messaging = FirebaseManager.messagingInstances.get(appName)

    if (messaging) {
      return messaging
    }

    // Fallback: try to get from app if it exists but messaging not cached
    const app = FirebaseManager.apps.get(appName)
    if (app) {
      try {
        const messagingInstance = getMessaging(app)
        FirebaseManager.messagingInstances.set(appName, messagingInstance)
        return messagingInstance
      } catch (e) {
        console.warn(`[FirebaseManager] Failed to get messaging for ${appName}`)
      }
    }

    // Final fallback: default app
    console.warn(
      `[FirebaseManager] Firebase app ${appName} not found for platform ${bakongPlatform}, using default app`,
    )
    try {
      return getMessaging()
    } catch (e) {
      console.error('[FirebaseManager] Default Firebase app also not available')
      return null
    }
  }

  /**
   * Get Firebase app name for a Bakong platform
   */
  static getAppName(bakongPlatform: string): string {
    const nodeEnv = process.env.NODE_ENV || 'development'
    const isStaging = nodeEnv === 'staging'
    const isProduction = nodeEnv === 'production'

    let envSuffix = 'dev'
    if (isStaging) envSuffix = 'sit'
    if (isProduction) envSuffix = 'uat'

    const platformKey = bakongPlatform.toLowerCase().replace('_', '-')
    return `${platformKey}-${envSuffix}`
  }

  /**
   * Get service account file path for a Bakong platform
   */
  static getServiceAccountPath(bakongPlatform: string): string | null {
    const nodeEnv = process.env.NODE_ENV || 'development'
    const isStaging = nodeEnv === 'staging'
    const isProduction = nodeEnv === 'production'

    let fileName: string

    if (isStaging) {
      // SIT environment
      switch (bakongPlatform) {
        case BakongApp.BAKONG:
          fileName = 'bakong-sit-firebase-service-account.json'
          break
        case BakongApp.BAKONG_JUNIOR:
          fileName = 'bakong-junior-sit-firebase-service-account.json'
          break
        case BakongApp.BAKONG_TOURIST:
          fileName = 'bakong-tourists-sit-firebase-service-account.json'
          break
        default:
          fileName = 'bakong-sit-firebase-service-account.json'
      }
    } else if (isProduction) {
      // Production environment
      switch (bakongPlatform) {
        case BakongApp.BAKONG:
          fileName = 'bakong-uat-firebase-service-account.json'
          break
        case BakongApp.BAKONG_JUNIOR:
          fileName = 'bakong-junior-uat-firebase-service-account.json'
          break
        case BakongApp.BAKONG_TOURIST:
          fileName = 'bakong-tourist-uat-firebase-service-account.json'
          break
        default:
          fileName = 'bakong-uat-firebase-service-account.json'
      }
    } else {
      // Development environment - use generic file
      fileName = 'firebase-service-account.json'
    }

    // Search for file in multiple locations
    const cwd = process.cwd()
    const possiblePaths = [
      `/opt/bk_notification_service/${fileName}`,
      path.join(cwd, `../../${fileName}`),
      path.join(cwd, `../${fileName}`),
      path.join(cwd, fileName),
      path.join(__dirname, `../${fileName}`),
      path.join(__dirname, `../../${fileName}`),
      path.join(__dirname, `../../../${fileName}`),
      path.join(__dirname, `../../../../${fileName}`),
    ]

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath
      }
    }

    return null
  }

  /**
   * Get all initialized Firebase apps
   */
  static getInitializedApps(): string[] {
    return Array.from(FirebaseManager.apps.keys())
  }

  /**
   * Check if a specific platform's Firebase app is initialized
   */
  static isPlatformInitialized(bakongPlatform: string): boolean {
    const appName = FirebaseManager.getAppName(bakongPlatform)
    return FirebaseManager.apps.has(appName)
  }
}
