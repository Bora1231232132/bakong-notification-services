import { Injectable } from '@nestjs/common'
import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

const nodeEnv = process.env.NODE_ENV || 'development'

const possiblePaths = [
  resolve(process.cwd(), `env.${nodeEnv}`),
  resolve(process.cwd(), `apps/backend/env.${nodeEnv}`),
  resolve(__dirname, `../../../env.${nodeEnv}`),
  resolve(__dirname, `../../env.${nodeEnv}`),
]

let envPath = null
for (const path of possiblePaths) {
  if (existsSync(path)) {
    envPath = path
    break
  }
}

if (envPath) {
  config({ path: envPath, override: false })
}

export interface AppConfig {
  nodeEnv: string
  isDevelopment: boolean
  isStaging: boolean
  isProduction: boolean

  api: {
    port: number
    baseUrl: string
    hostingBaseUrl: string
    version: string
    jwtKey: string
    jwtExpire: string
    adminUsername: string
    adminPassword: string
    mobileApiKey: string
  }

  database: {
    host: string
    port: number
    database: string
    username: string
    password: string
  }

  firebase: {
    credentialsPath: string
  }

  app: {
    logLevel: string
    corsOrigin: string
  }
}

@Injectable()
export class ConfigService {
  private config: AppConfig

  constructor() {
    this.config = this.loadConfiguration()
  }

  private loadConfiguration(): AppConfig {
    const nodeEnv = process.env.NODE_ENV || 'development'
    const isDev = nodeEnv === 'development'
    const isStaging = nodeEnv === 'staging'
    const isProd = nodeEnv === 'production'
    const defaultApiPort = isDev ? 4005 : isStaging ? 8080 : 8080
    const defaultApiBaseUrl = isDev
      ? 'http://localhost:4005'
      : isStaging
      ? 'http://10.20.6.57:4002'
      : 'https://10.20.6.58:8080'
    const defaultDbPort = isDev ? 5437 : isStaging ? 5434 : 5433
    const defaultDbName = isDev
      ? 'bakong_notification_services_dev'
      : isStaging
      ? 'bakong_notification_services_sit'
      : 'bakong_notification_services'
    const defaultDbUser = isDev ? 'bkns_dev' : isStaging ? 'bkns_sit' : 'bkns'
    const defaultDbPassword = isDev ? 'dev' : isStaging ? '0101bkns_sit' : '010110bkns'

    return {
      nodeEnv,
      isDevelopment: isDev,
      isStaging: isStaging,
      isProduction: isProd,

      api: {
        port: parseInt(process.env.API_PORT, 10) || defaultApiPort,
        baseUrl: process.env.API_BASE_URL || defaultApiBaseUrl,
        hostingBaseUrl:
          process.env.HOSTING_BASE_URL || process.env.API_BASE_URL || defaultApiBaseUrl,
        version: process.env.npm_package_version || '1.0.0',
        jwtKey: process.env.API_JWT_KEY || 'your-super-secret-jwt-key-change-this-in-production',
        jwtExpire: process.env.API_JWT_EXPIRE || '24h',
        adminUsername: process.env.API_ADMIN_USERNAME || 'admin',
        adminPassword: process.env.API_ADMIN_PASSWORD || 'admin123',
        mobileApiKey: process.env.API_MOBILE_KEY || 'BAKONG',
      },

      database: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT, 10) || defaultDbPort,
        database: process.env.POSTGRES_DB || defaultDbName,
        username: process.env.POSTGRES_USER || defaultDbUser,
        password: process.env.POSTGRES_PASSWORD || defaultDbPassword,
      },

      firebase: {
        credentialsPath:
          process.env.GOOGLE_APPLICATION_CREDENTIALS || './firebase-service-account.json',
      },

      app: {
        logLevel: process.env.LOG_LEVEL || 'info',
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost',
      },
    }
  }

  get nodeEnv(): string {
    return this.config.nodeEnv
  }

  get isDevelopment(): boolean {
    return this.config.isDevelopment
  }

  get isStaging(): boolean {
    return this.config.isStaging
  }

  get isProduction(): boolean {
    return this.config.isProduction
  }

  get apiPort(): number {
    return this.config.api.port
  }

  get apiBaseUrl(): string {
    return this.config.api.baseUrl
  }

  get hostingBaseUrl(): string {
    return this.config.api.hostingBaseUrl
  }

  get apiVersion(): string {
    return this.config.api.version
  }

  get jwtKey(): string {
    return this.config.api.jwtKey
  }

  get jwtExpire(): string {
    return this.config.api.jwtExpire
  }

  get adminUsername(): string {
    return this.config.api.adminUsername
  }

  get adminPassword(): string {
    return this.config.api.adminPassword
  }

  get mobileApiKey(): string {
    return this.config.api.mobileApiKey
  }

  get databaseHost(): string {
    return this.config.database.host
  }

  get databasePort(): number {
    return this.config.database.port
  }

  get databaseName(): string {
    return this.config.database.database
  }

  get databaseUsername(): string {
    return this.config.database.username
  }

  get databasePassword(): string {
    return this.config.database.password
  }

  get firebaseCredentialsPath(): string {
    return this.config.firebase.credentialsPath
  }

  get logLevel(): string {
    return this.config.app.logLevel
  }

  get corsOrigin(): string {
    return this.config.app.corsOrigin
  }

  get databaseConfig() {
    return this.config.database
  }

  get apiConfig() {
    return this.config.api
  }

  get firebaseConfig() {
    return this.config.firebase
  }

  get appConfig() {
    return this.config.app
  }

  get fullConfig(): AppConfig {
    return this.config
  }
}

export const configService = new ConfigService()
