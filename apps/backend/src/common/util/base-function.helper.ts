import { BakongUser } from 'src/entities/bakong-user.entity'
import { Logger } from '@nestjs/common'
import { ValidationHelper } from './validation.helper'
import { Repository } from 'typeorm'
import { cert, initializeApp, getApps } from 'firebase-admin/app'
import * as fs from 'fs'
import * as path from 'path'

type SingleUserSyncResult = { isNewUser: boolean; savedUser: BakongUser }
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
      const protocol = req.protocol || (req.secure ? 'https' : 'http')
      const host = req.get('host') || req.headers?.host
      if (host) {
        baseUrl = `${protocol}://${host}`
      }
    }
    if (!baseUrl || baseUrl === defaultBaseUrl) {
      baseUrl = process.env.HOSTING_BASE_URL || process.env.API_BASE_URL || defaultBaseUrl
    }

    return baseUrl
  }

  async findUserByAccountId(accountId: string): Promise<BakongUser | null> {
    return this.bkUserRepo.findOne({ where: { accountId } })
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
      // For existing users: only update fields that are provided and not empty
      // Don't overwrite existing fcmToken with empty string
      const updatesToApply: any = {}

      if (updateData.fcmToken !== undefined && updateData.fcmToken !== '') {
        // Only update fcmToken if provided and not empty
        updatesToApply.fcmToken = updateData.fcmToken
      } else if (updateData.fcmToken === '' && !user.fcmToken) {
        // Only set empty fcmToken if user doesn't have one yet
        updatesToApply.fcmToken = ''
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
          `📝 [syncUser] Updating user ${accountId} bakongPlatform: ${user.bakongPlatform || 'NULL'} -> ${updateData.bakongPlatform}`,
        )
      }

      const changed = ValidationHelper.updateUserFields(user, updatesToApply)
      if (changed) {
        user = await this.bkUserRepo.save(user)
        console.log(
          `✅ [syncUser] Updated user ${accountId} bakongPlatform: ${user.bakongPlatform || 'NULL'}`,
        )
      }
      return { isNewUser, savedUser: user }
    }

    // For new users: create with provided data, use empty string for fcmToken if not provided
    const created = this.bkUserRepo.create({
      accountId,
      fcmToken: updateData.fcmToken || '', // Use empty string as placeholder if not provided
      participantCode: updateData.participantCode,
      platform: this.normalizePlatform(updateData.platform),
      language: this.normalizeLanguage(updateData.language),
      bakongPlatform: updateData.bakongPlatform,
    })
    console.log(
      `📝 [syncUser] Creating new user ${accountId} with bakongPlatform: ${updateData.bakongPlatform || 'NULL'}`,
    )
    const savedUser = await this.bkUserRepo.save(created)
    console.log(
      `✅ [syncUser] Created user ${accountId} with bakongPlatform: ${savedUser.bakongPlatform || 'NULL'}`,
    )
    return { isNewUser, savedUser }
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

    for (const user of users) {
      const changed = ValidationHelper.normalizeUserFields(user, stats)

      if (user.fcmToken?.trim() && user.fcmToken.length < 50) {
        stats.invalidTokens++
      }

      if (changed) {
        try {
          await this.bkUserRepo.save(user)
          stats.updatedCount++
          updatedIds.push(user.accountId)
        } catch (e) {
          this.logger.error(`Failed to save user ${user.accountId}`, e as any)
        }
      }
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
          Logger.warn(`⚠️ Skip ${user.accountId}: invalid FCM token`)
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
