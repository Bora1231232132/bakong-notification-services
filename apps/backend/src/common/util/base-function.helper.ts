import { BakongUser } from 'src/entities/bakong-user.entity'
import { Logger } from '@nestjs/common'
import { ValidationHelper } from './validation.helper'
import { Repository } from 'typeorm'
import { cert, initializeApp, getApps } from 'firebase-admin/app'
import * as fs from 'fs'
import * as path from 'path'
import { BakongApp } from '@bakong/shared'

type SingleUserSyncResult = { isNewUser: boolean; savedUser: BakongUser; dataUpdated?: boolean }
type AllUsersSyncResult = {
  updatedCount: number
  totalCount: number
  platformUpdates: number
  languageUpdates: number
  invalidTokens: number
  updatedIds: string[]
}

export class BaseFunctionHelper {
  bkUserRepo: Repository<BakongUser>
  logger: Logger

  constructor(bkUserRepo: Repository<BakongUser>, logger: Logger) {
    this.bkUserRepo = bkUserRepo
    this.logger = logger
  }

  truncateText(field: 'title' | 'content', text: string): string {
    const length = field === 'title' ? 60 : 90
    if (!text) return ''
    return text.length > length ? text.substring(0, length) + '...' : text
  }

  getBaseUrl(req?: any): string {
    const nodeEnv = process.env.NODE_ENV || 'development'
    const defaultBaseUrl =
      nodeEnv === 'development'
        ? 'http://localhost:4005'
        : nodeEnv === 'staging'
          ? 'http://10.20.6.57:4002'
          : 'https://10.20.6.58:8080'

    let baseUrl = defaultBaseUrl

    if (req) {
      let protocol = req.protocol || (req.secure ? 'https' : 'http')
      const host = req.get('host') || req.headers?.host

      if (host) {
        // Force HTTPS for production/staging domains (even if request came via HTTP proxy)
        const isProductionDomain =
          host.includes('nbc.gov.kh') ||
          host.includes('bakong-notification') ||
          nodeEnv === 'production' ||
          nodeEnv === 'staging'

        if (isProductionDomain && protocol === 'http') {
          // Check if X-Forwarded-Proto header indicates HTTPS (common with reverse proxies)
          const forwardedProto = req.get('x-forwarded-proto') || req.headers?.['x-forwarded-proto']
          if (forwardedProto === 'https' || nodeEnv === 'production') {
            protocol = 'https'
          }
        }

        baseUrl = `${protocol}://${host}`
      }
    }
    if (!baseUrl || baseUrl === defaultBaseUrl) {
      baseUrl = process.env.HOSTING_BASE_URL || process.env.API_BASE_URL || defaultBaseUrl
    }

    // Final check: ensure HTTPS for production domains
    if (baseUrl.includes('nbc.gov.kh') || baseUrl.includes('bakong-notification')) {
      baseUrl = baseUrl.replace(/^http:/, 'https:')
    }

    return baseUrl
  }

  async findUserByAccountId(accountId: string): Promise<BakongUser | null> {
    // Use query builder to ensure fresh data from database (no cache)
    // This ensures we always get the latest data, especially after updates
    return this.bkUserRepo
      .createQueryBuilder('user')
      .where('user.accountId = :accountId', { accountId })
      .getOne()
  }

  async updateUserData(
    updateData?: Partial<BakongUser>,
  ): Promise<SingleUserSyncResult | AllUsersSyncResult> {
    return updateData ? this.syncUser(updateData) : this.syncAllUsers()
  }

  async syncUser(updateData: Partial<BakongUser>): Promise<SingleUserSyncResult> {
    const { accountId } = updateData
    if (!accountId) throw new Error('accountId is required for single-user sync')

    let user = await this.findUserByAccountId(accountId)
    const isNewUser = !user

    if (user) {
      // For existing users: only update fields that are provided
      // Always update fcmToken if explicitly provided (even if empty string)
      // Empty string means "no token" (app deleted/reinstalled), so we should clear old token
      const updatesToApply: any = {}

      // CRITICAL: Always process fcmToken if provided (even if empty string)
      // Empty string means app was deleted - we MUST clear the old token
      if (updateData.fcmToken !== undefined) {
        const currentToken = user.fcmToken || ''
        const newToken = updateData.fcmToken || ''

        // Check if token format is valid (if not empty)
        if (newToken && newToken.length < 50) {
          console.warn(
            `⚠️ [syncUser] User ${accountId} provided suspiciously short fcmToken: "${newToken}" (length: ${newToken.length}). This might be invalid!`,
          )
        }

        // ALWAYS add to updatesToApply - we will update even if same value
        updatesToApply.fcmToken = updateData.fcmToken
        console.log(`📝 [syncUser] fcmToken WILL BE UPDATED for user ${accountId}:`, {
          current: currentToken
            ? `${currentToken.substring(0, 30)}... (length: ${currentToken.length})`
            : 'EMPTY',
          new: newToken ? `${newToken.substring(0, 30)}... (length: ${newToken.length})` : 'EMPTY',
          tokensMatch: currentToken.trim() === newToken.trim(),
          willUpdate: true, // Always update when provided
        })
      } else {
        console.log(
          `⏭️ [syncUser] Skipping fcmToken update for user ${accountId} (not provided in sync data - undefined)`,
        )
      }

      if (updateData.participantCode !== undefined) {
        updatesToApply.participantCode = updateData.participantCode
      }

      if (updateData.platform !== undefined) {
        updatesToApply.platform = this.normalizePlatform(updateData.platform)
      }

      if (updateData.language !== undefined) {
        updatesToApply.language = this.normalizeLanguage(updateData.language)
      }

      if (updateData.bakongPlatform !== undefined) {
        updatesToApply.bakongPlatform = updateData.bakongPlatform
        console.log(
          `📝 [syncUser] Updating user ${accountId} bakongPlatform: ${
            user.bakongPlatform || 'NULL'
          } -> ${updateData.bakongPlatform}`,
        )
      }

      console.log(`🔍 [syncUser] About to call updateUserFields with updatesToApply:`, {
        accountId,
        updatesToApply: {
          fcmToken: updatesToApply.fcmToken
            ? `${updatesToApply.fcmToken.substring(0, 30)}... (length: ${
                updatesToApply.fcmToken.length
              })`
            : updatesToApply.fcmToken === ''
              ? 'EMPTY STRING'
              : 'NOT IN updatesToApply',
          participantCode: updatesToApply.participantCode || 'NOT IN updatesToApply',
          platform: updatesToApply.platform || 'NOT IN updatesToApply',
          language: updatesToApply.language || 'NOT IN updatesToApply',
          bakongPlatform: updatesToApply.bakongPlatform || 'NOT IN updatesToApply',
        },
        currentUserState: {
          fcmToken: user.fcmToken
            ? `${user.fcmToken.substring(0, 30)}... (length: ${user.fcmToken.length})`
            : 'EMPTY',
          participantCode: user.participantCode || 'NULL',
          platform: user.platform || 'NULL',
          language: user.language || 'NULL',
          bakongPlatform: user.bakongPlatform || 'NULL',
        },
      })

      // Update the user object in memory (for logging)
      ValidationHelper.updateUserFields(user, updatesToApply)

      console.log(`🔍 [syncUser] After updateUserFields (in-memory):`, {
        accountId,
        userStateAfterUpdate: {
          fcmToken: user.fcmToken
            ? `${user.fcmToken.substring(0, 30)}... (length: ${user.fcmToken.length})`
            : 'EMPTY',
          participantCode: user.participantCode || 'NULL',
          platform: user.platform || 'NULL',
          language: user.language || 'NULL',
          bakongPlatform: user.bakongPlatform || 'NULL',
        },
      })

      // Check if data actually changed before updating
      // This helps us know if we need to update the database
      let dataChanged = false
      if (Object.keys(updatesToApply).length > 0) {
        // Check if any field actually changed
        if (updatesToApply.fcmToken !== undefined) {
          const currentToken = (user.fcmToken || '').trim()
          const newToken = (updatesToApply.fcmToken || '').trim()
          if (currentToken !== newToken) {
            dataChanged = true
          }
        }
        if (updatesToApply.platform !== undefined && user.platform !== updatesToApply.platform) {
          dataChanged = true
        }
        if (updatesToApply.language !== undefined && user.language !== updatesToApply.language) {
          dataChanged = true
        }
        if (updatesToApply.bakongPlatform !== undefined && user.bakongPlatform !== updatesToApply.bakongPlatform) {
          dataChanged = true
        }
        if (updatesToApply.participantCode !== undefined && user.participantCode !== updatesToApply.participantCode) {
          dataChanged = true
        }
      }

      // ALWAYS update database when we have updates to apply
      // This ensures we sync all data from mobile app, even if values appear the same
      // FCM tokens can refresh, so we always update to ensure we have the latest token
      if (Object.keys(updatesToApply).length > 0) {
        console.log(
          `💾 [syncUser] Updating user ${accountId} in database with:`,
          Object.keys(updatesToApply),
          `(dataChanged: ${dataChanged})`,
        )
        try {
          // Prepare sync status update
          // If we're updating fields, show which fields were synced
          // Note: We always consider it an "update" when syncing fields from mobile app
          // because mobile app is sending fresh data, even if values appear the same
          const fieldsUpdated = Object.keys(updatesToApply).filter(key => key !== 'syncStatus')
          const hasRealUpdates = fieldsUpdated.length > 0
          
          let syncMessage = ''
          if (hasRealUpdates) {
            if (dataChanged) {
              // Values actually changed
              syncMessage = `Existing user updated: ${fieldsUpdated.join(', ')} changed`
            } else {
              // Values are the same but we synced them (fresh data from mobile app)
              // Still consider it an update since mobile app sent the data
              syncMessage = `Existing user updated: ${fieldsUpdated.join(', ')} synced`
            }
          } else {
            syncMessage = 'Existing user synced: no data changes'
          }
          
          const syncStatusUpdate = {
            status: 'SUCCESS' as const,
            lastSyncAt: new Date().toISOString(),
            lastSyncMessage: syncMessage,
          }
          updatesToApply.syncStatus = syncStatusUpdate
          
          // Mark as changed if we're updating any real fields (mobile app sent fresh data)
          if (hasRealUpdates) {
            dataChanged = true
          }

          // Use direct update() for existing users - more reliable than save()
          const updateResult = await this.bkUserRepo.update({ accountId }, updatesToApply)
          console.log(
            `✅ [syncUser] Direct update() executed for ${accountId}. Rows affected: ${
              updateResult.affected || 0
            }`,
          )

          // Force reload from database to get updated values
          // Use a small delay and query builder to ensure we get fresh data
          await new Promise((resolve) => setTimeout(resolve, 50)) // Small delay to ensure DB commit
          user = await this.bkUserRepo
            .createQueryBuilder('user')
            .where('user.accountId = :accountId', { accountId })
            .getOne()
          if (!user) {
            throw new Error(`User ${accountId} not found after update`)
          }

          console.log(
            `✅ [syncUser] Successfully updated and reloaded user ${accountId}. Current fcmToken: ${
              user.fcmToken
                ? `${user.fcmToken.substring(0, 30)}... (length: ${user.fcmToken.length})`
                : 'EMPTY'
            }, bakongPlatform: ${user.bakongPlatform || 'NULL'}`,
          )

          // Verify the update matches what we tried to save
          const expectedToken = updatesToApply.fcmToken
          if (expectedToken !== undefined) {
            const actualToken = user.fcmToken
            if (actualToken !== expectedToken) {
              console.error(
                `❌ [syncUser] CRITICAL: Token mismatch after update! Expected: ${
                  expectedToken ? `${expectedToken.substring(0, 30)}...` : 'EMPTY'
                }, Got: ${actualToken ? `${actualToken.substring(0, 30)}...` : 'EMPTY'}`,
              )
              // Try one more time with explicit update
              console.log(
                `🔄 [syncUser] Retrying update with explicit fcmToken for ${accountId}...`,
              )
              await this.bkUserRepo.update({ accountId }, { fcmToken: expectedToken })
              await new Promise((resolve) => setTimeout(resolve, 50)) // Small delay
              user = await this.bkUserRepo
                .createQueryBuilder('user')
                .where('user.accountId = :accountId', { accountId })
                .getOne()
              console.log(
                `🔄 [syncUser] Retry update completed. Final fcmToken: ${
                  user?.fcmToken
                    ? `${user.fcmToken.substring(0, 30)}... (length: ${user.fcmToken.length})`
                    : 'EMPTY'
                }`,
              )
            } else {
              console.log(
                `✅ [syncUser] Token verification passed: ${
                  actualToken ? `${actualToken.substring(0, 30)}...` : 'EMPTY'
                }`,
              )
            }
          }
        } catch (updateError: any) {
          console.error(
            `❌ [syncUser] ERROR updating user ${accountId} in database:`,
            updateError.message,
            updateError.stack,
          )
          
          // Update sync status to FAILED
          try {
            await this.bkUserRepo.update(
              { accountId },
              {
                syncStatus: {
                  status: 'FAILED',
                  lastSyncAt: new Date().toISOString(),
                  lastSyncMessage: `Database error: ${updateError.message}`,
                },
              },
            )
          } catch (statusUpdateError) {
            console.error(
              `❌ [syncUser] Failed to update sync status for ${accountId}:`,
              statusUpdateError,
            )
          }
          
          throw updateError
        }
      } else {
        console.log(
          `⏭️ [syncUser] No updates to apply for user ${accountId} (updatesToApply is empty)`,
        )
        dataChanged = false
        
        // Still update sync status even if no data changes
        try {
          await this.bkUserRepo.update(
            { accountId },
            {
              syncStatus: {
                status: 'SUCCESS',
                lastSyncAt: new Date().toISOString(),
                lastSyncMessage: 'Existing user synced: no data changes',
              },
            },
          )
        } catch (statusUpdateError) {
          console.error(
            `❌ [syncUser] Failed to update sync status for ${accountId}:`,
            statusUpdateError,
          )
        }
      }
      return { isNewUser, savedUser: user, dataUpdated: dataChanged }
    }

    // For new users: create with provided data, use empty string for fcmToken if not provided
    // bakongPlatform will be set from template when sending flash notification (see notification.service.ts)
    try {
      const created = this.bkUserRepo.create({
        accountId,
        fcmToken: updateData.fcmToken || '', // Use empty string as placeholder if not provided
        participantCode: updateData.participantCode,
        platform: this.normalizePlatform(updateData.platform),
        language: this.normalizeLanguage(updateData.language),
        bakongPlatform: updateData.bakongPlatform, // Only set if explicitly provided
        syncStatus: {
          status: 'SUCCESS',
          lastSyncAt: new Date().toISOString(),
          lastSyncMessage: `New user created: ${updateData.bakongPlatform || 'no platform'} platform`,
        },
      })
      console.log(
        `📝 [syncUser] Creating new user ${accountId} with bakongPlatform: ${
          updateData.bakongPlatform || 'NULL'
        }`,
      )
      const savedUser = await this.bkUserRepo.save(created)
      console.log(
        `✅ [syncUser] Created user ${accountId} with bakongPlatform: ${
          savedUser.bakongPlatform || 'NULL'
        }`,
      )
      return { isNewUser, savedUser }
    } catch (createError: any) {
      console.error(
        `❌ [syncUser] ERROR creating new user ${accountId}:`,
        createError.message,
        createError.stack,
      )
      
      // Try to update sync status if user was partially created (shouldn't happen, but safety)
      try {
        const existingUser = await this.findUserByAccountId(accountId)
        if (existingUser) {
          await this.bkUserRepo.update(
            { accountId },
            {
              syncStatus: {
                status: 'FAILED',
                lastSyncAt: new Date().toISOString(),
                lastSyncMessage: `Failed to create user: ${createError.message}`,
              },
            },
          )
        }
      } catch (statusUpdateError) {
        // Ignore - user doesn't exist yet
      }
      
      throw createError
    }
  }

  async syncAllUsers(): Promise<AllUsersSyncResult> {
    const users = await this.bkUserRepo.find()
    const stats: Omit<AllUsersSyncResult, 'updatedIds'> = {
      updatedCount: 0,
      totalCount: users.length,
      platformUpdates: 0,
      languageUpdates: 0,
      invalidTokens: 0,
    }
    const updatedIds: string[] = []
    const cleanedTokens: string[] = []

    for (const user of users) {
      let userChanged = false
      
      // Normalize user fields (platform, language, etc.)
      const changed = ValidationHelper.normalizeUserFields(user, stats)
      if (changed) {
        userChanged = true
      }

      // Handle invalid tokens intelligently:
      // - Keep tokens that fail FCM sends (for tracking, mobile app can update)
      // - Only clear obviously invalid ones (too short, wrong format) - these are definitely wrong
      // - Users with empty/invalid tokens are already filtered out before sending
      if (user.fcmToken?.trim()) {
        const isTooShort = user.fcmToken.length < 50
        const hasInvalidFormat = !ValidationHelper.isValidFCMTokenFormat(user.fcmToken)
        
        if (isTooShort || hasInvalidFormat) {
          stats.invalidTokens++
          const reason = isTooShort 
            ? `too short (${user.fcmToken.length} chars)` 
            : 'invalid format'
          console.log(
            `🧹 [syncAllUsers] Clearing obviously invalid token for user ${user.accountId} (${reason})`,
          )
          // Clear obviously invalid tokens - these are definitely wrong and waste resources
          user.fcmToken = ''
          userChanged = true
          cleanedTokens.push(user.accountId)
        } else {
          // Token format is valid - keep it even if it fails FCM sends
          // Mobile app can update it when they call API
          // This preserves historical data and allows tracking
        }
      }

      if (userChanged) {
        try {
          await this.bkUserRepo.save(user)
          stats.updatedCount++
          updatedIds.push(user.accountId)
        } catch (e) {
          this.logger.error(`Failed to save user ${user.accountId}`, e as any)
        }
      }
    }

    if (cleanedTokens.length > 0) {
      console.log(
        `✅ [syncAllUsers] Cleaned up ${cleanedTokens.length} invalid token(s):`,
        cleanedTokens,
      )
    }

    return { ...stats, updatedIds }
  }

  filterValidFCMUsers(validUsers: BakongUser[], mode: 'individual' | 'shared'): BakongUser[] {
    if (mode === 'shared') {
      return validUsers.filter((user) => {
        const isValidToken =
          user.fcmToken &&
          user.fcmToken.length > 50 &&
          !user.fcmToken.startsWith('Bearer') &&
          !user.fcmToken.startsWith('eyJ')

        if (!isValidToken) {
          this.logger.warn(`⚠️ Skip ${user.accountId}: invalid FCM token`)
        }

        return isValidToken
      })
    }
    return validUsers
  }

  normalizeUserFields(
    user: any,
    result?: { platformUpdates: number; languageUpdates: number },
  ): boolean {
    return ValidationHelper.normalizeUserFields(user, result)
  }

  updateUserFields(user: any, updates: any): boolean {
    return ValidationHelper.updateUserFields(user, updates)
  }

  private normalizePlatform(platform?: any) {
    const res = ValidationHelper.validatePlatform(platform)
    return res.isValid ? res.normalizedValue : platform
  }

  private normalizeLanguage(language?: any) {
    const res = ValidationHelper.validateLanguage(language)
    return res.isValid ? res.normalizedValue : language
  }

  static getFirebaseServiceAccountPaths(): string[] {
    const cwd = process.cwd()
    const nodeEnv = process.env.NODE_ENV || 'development'
    const isStaging = nodeEnv === 'staging'
    const isProduction = nodeEnv === 'production'

    // Determine environment-specific file name
    let envSpecificFileName = 'firebase-service-account.json' // default for development
    if (isStaging) {
      envSpecificFileName = 'bakong-sit-firebase-service-account.json'
    } else if (isProduction) {
      envSpecificFileName = 'bakong-uat-firebase-service-account.json'
    }

    const paths = [
      // Environment-specific paths (highest priority)
      `/opt/bk_notification_service/${envSpecificFileName}`,
      path.join(cwd, `../../${envSpecificFileName}`),
      path.join(cwd, `../${envSpecificFileName}`),
      path.join(cwd, envSpecificFileName),
      path.join(__dirname, `../${envSpecificFileName}`),
      path.join(__dirname, `../../${envSpecificFileName}`),
      path.join(__dirname, `../../../${envSpecificFileName}`),
      path.join(__dirname, `../../../../${envSpecificFileName}`),
      path.join(__dirname, envSpecificFileName),
      // Generic paths (fallback for backward compatibility)
      '/opt/bk_notification_service/firebase-service-account.json',
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      path.join(cwd, '../../firebase-service-account.json'),
      path.join(cwd, '../firebase-service-account.json'),
      path.join(cwd, 'firebase-service-account.json'),
      path.join(__dirname, '../firebase-service-account.json'),
      path.join(__dirname, '../../firebase-service-account.json'),
      path.join(__dirname, '../../../firebase-service-account.json'),
      path.join(__dirname, '../../../../firebase-service-account.json'),
      path.join(__dirname, 'firebase-service-account.json'),
    ]
    return paths.filter((p) => p != null) as string[]
  }

  static findFirebaseServiceAccountPath(): string | null {
    const possiblePaths = this.getFirebaseServiceAccountPaths()

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath
      }
    }

    return null
  }

  /**
   * Safely serialize an object for logging by truncating buffers and large arrays
   * @param obj The object to serialize
   * @param maxArrayLength Maximum length for arrays before truncation (default: 10)
   * @param maxBufferPreview Maximum bytes to show from buffers (default: 50)
   * @returns A safe object for logging
   */
  static safeLogObject(obj: any, maxArrayLength = 10, maxBufferPreview = 50): any {
    if (obj === null || obj === undefined) {
      return obj
    }

    // Handle Buffer objects
    if (Buffer.isBuffer(obj)) {
      const preview = obj.slice(0, maxBufferPreview)
      return `<Buffer[${obj.length} bytes]: ${Array.from(preview).join(',')}${
        obj.length > maxBufferPreview ? '...' : ''
      }>`
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      if (obj.length > maxArrayLength) {
        return [
          ...obj
            .slice(0, maxArrayLength)
            .map((item) => this.safeLogObject(item, maxArrayLength, maxBufferPreview)),
          `... (${obj.length - maxArrayLength} more items)`,
        ]
      }
      return obj.map((item) => this.safeLogObject(item, maxArrayLength, maxBufferPreview))
    }

    // Handle objects
    if (typeof obj === 'object' && obj.constructor === Object) {
      const safeObj: any = {}
      for (const [key, value] of Object.entries(obj)) {
        // Skip file buffers and large binary data
        if (key === 'file' && Buffer.isBuffer(value)) {
          safeObj[key] = `<Buffer[${value.length} bytes] (truncated)>`
        } else if (Array.isArray(value) && value.length > 100) {
          safeObj[key] = `<Array[${value.length} items] (truncated)>`
        } else {
          safeObj[key] = this.safeLogObject(value, maxArrayLength, maxBufferPreview)
        }
      }
      return safeObj
    }

    // Handle other types (strings, numbers, booleans, etc.)
    return obj
  }

  static async initializeFirebase(): Promise<boolean> {
    try {
      const possiblePaths = this.getFirebaseServiceAccountPaths()
      console.log('[Firebase Init] Checking service account paths:', possiblePaths)
      const serviceAccountPath = this.findFirebaseServiceAccountPath()
      if (!serviceAccountPath) {
        console.error('[Firebase Init] No service account JSON found at any candidate paths.')
        console.error('[Firebase Init] Current working directory:', process.cwd())
        console.error('[Firebase Init] __dirname:', __dirname)
        return false
      }
      console.log('[Firebase Init] Using credential file:', serviceAccountPath)
      try {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf8')
        let serviceAccount
        try {
          serviceAccount = JSON.parse(fileContent)
        } catch (parseErr) {
          console.error('[Firebase Init] Failed to parse JSON:', parseErr)
          console.error(
            '[Firebase Init] JSON parse error details:',
            parseErr instanceof Error ? parseErr.message : String(parseErr),
          )
          return false
        }
        if (!serviceAccount.project_id) {
          console.error('[Firebase Init] Service account file missing project_id field')
          return false
        }
        if (!serviceAccount.private_key) {
          console.error('[Firebase Init] Service account file missing private_key field')
          return false
        }
        if (!serviceAccount.client_email) {
          console.error('[Firebase Init] Service account file missing client_email field')
          return false
        }

        try {
          const apps = getApps()
          if (apps.length === 0) {
            initializeApp({
              credential: cert(serviceAccount),
              projectId: serviceAccount.project_id,
            })
            console.log(
              '[Firebase Init] Firebase app initialized successfully for project:',
              serviceAccount.project_id,
            )
          } else {
            console.log('[Firebase Init] Firebase already initialized.')
          }
          return true
        } catch (initError: any) {
          console.error('[Firebase Init] Failed to initialize Firebase app')
          console.error('[Firebase Init] Error message:', initError?.message || String(initError))
          console.error('[Firebase Init] Error code:', initError?.code || 'N/A')
          if (initError?.stack) {
            console.error('[Firebase Init] Stack trace:', initError.stack)
          }
          return false
        }
      } catch (readFileError: any) {
        console.error('[Firebase Init] Could not read service account file')
        console.error('[Firebase Init] Error:', readFileError?.message || String(readFileError))
        console.error('[Firebase Init] File path:', serviceAccountPath)
        return false
      }
    } catch (error: any) {
      console.error('[Firebase Init] Unexpected error:', error?.message || String(error))
      if (error?.stack) {
        console.error('[Firebase Init] Stack trace:', error.stack)
      }
      return false
    }
  }
}
