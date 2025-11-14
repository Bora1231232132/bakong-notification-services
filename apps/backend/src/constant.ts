import { configService } from './common/services/config.service'

const k = {
  NODE_ENV: configService.nodeEnv,

  API_BASE_URL: configService.apiBaseUrl,
  HOSTING_BASE_URL: configService.hostingBaseUrl,
  API_VERSION: configService.apiVersion,
  API_PORT: configService.apiPort,
  API_JWT_KEY: configService.jwtKey,
  API_JWT_EXPIRE: configService.jwtExpire,
  API_ADMIN_USERNAME: configService.adminUsername,
  API_ADMIN_PASSWORD: configService.adminPassword,
  API_MOBILE_KEY: configService.mobileApiKey,

  POSTGRES_HOST: configService.databaseHost,
  POSTGRES_PORT: configService.databasePort,
  POSTGRES_DB: configService.databaseName,
  POSTGRES_USER: configService.databaseUsername,
  POSTGRES_PASSWORD: configService.databasePassword,
}

export default k

export const API_BASE_URL = configService.apiBaseUrl
export const HOSTING_BASE_URL = configService.hostingBaseUrl
export const API_PORT = configService.apiPort
