import { DataSource, Logger } from 'typeorm'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'
import k from './constant'

// Custom logger that truncates binary data in SQL queries
class TruncatedLogger implements Logger {
  private truncateValue(value: any): any {
    if (Buffer.isBuffer(value)) {
      return `<Buffer[${value.length} bytes] (truncated)>`
    }
    if (Array.isArray(value)) {
      if (value.length > 10) {
        return `[${value
          .slice(0, 10)
          .map((v) => this.truncateValue(v))
          .join(',')}... (${value.length} items)]`
      }
      return value.map((v) => this.truncateValue(v))
    }
    if (typeof value === 'string' && value.length > 200) {
      return `${value.substring(0, 200)}... (${value.length} chars)`
    }
    if (value && typeof value === 'object') {
      // Check if object has a 'file' property that's a Buffer
      if ('file' in value && Buffer.isBuffer(value.file)) {
        return { ...value, file: `<Buffer[${value.file.length} bytes] (truncated)>` }
      }
    }
    return value
  }

  logQuery(query: string, parameters?: any[]) {
    // Truncate binary data and long strings in parameters
    const safeParameters = parameters?.map((param) => this.truncateValue(param))

    // Also truncate binary data in query string if present (for INSERT/UPDATE with bytea)
    let safeQuery = query
    if (query.length > 1000) {
      safeQuery = query.substring(0, 1000) + '... (query truncated)'
    }

    console.log(
      `[QUERY] ${safeQuery}`,
      safeParameters?.length ? `[PARAMETERS] ${JSON.stringify(safeParameters)}` : '',
    )
  }

  logQueryError(error: string, query: string, parameters?: any[]) {
    const safeParameters = parameters?.map((param) => this.truncateValue(param))
    let safeQuery = query
    if (query.length > 1000) {
      safeQuery = query.substring(0, 1000) + '... (query truncated)'
    }
    console.error(
      `[QUERY ERROR] ${error}`,
      `[QUERY] ${safeQuery}`,
      safeParameters?.length ? `[PARAMETERS] ${JSON.stringify(safeParameters)}` : '',
    )
  }

  logQuerySlow(time: number, query: string, parameters?: any[]) {
    const safeParameters = parameters?.map((param) => this.truncateValue(param))
    let safeQuery = query
    if (query.length > 1000) {
      safeQuery = query.substring(0, 1000) + '... (query truncated)'
    }
    console.warn(
      `[SLOW QUERY] ${time}ms`,
      `[QUERY] ${safeQuery}`,
      safeParameters?.length ? `[PARAMETERS] ${JSON.stringify(safeParameters)}` : '',
    )
  }

  logSchemaBuild(message: string) {
    console.log(`[SCHEMA] ${message}`)
  }

  logMigration(message: string) {
    console.log(`[MIGRATION] ${message}`)
  }

  log(level: 'log' | 'info' | 'warn', message: any) {
    // Truncate message if it contains binary data
    const safeMessage = this.truncateValue(message)
    if (level === 'log' || level === 'info') {
      console.log(`[TYPEORM]`, safeMessage)
    } else {
      console.warn(`[TYPEORM]`, safeMessage)
    }
  }
}

// Use source files in development, compiled files in production
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
const entityPath = isDevelopment ? ['src/**/*.entity.ts'] : ['dist/**/*.entity.{ts,js}']

// TypeORM synchronize configuration
// Set TYPEORM_SYNCHRONIZE=true in environment to enable automatic schema synchronization
// When enabled, TypeORM will automatically update the database schema to match entity definitions
const shouldSynchronize = process.env.TYPEORM_SYNCHRONIZE === 'true'

// Log synchronize status for debugging
if (shouldSynchronize) {
  console.log(
    '✅ TypeORM synchronize is enabled - schema will be automatically synchronized with entities',
  )
  console.log(`   TYPEORM_SYNCHRONIZE env value: ${process.env.TYPEORM_SYNCHRONIZE}`)
} else {
  console.log('ℹ️  TypeORM synchronize is disabled (using migrations)')
  console.log(`   TYPEORM_SYNCHRONIZE env value: ${process.env.TYPEORM_SYNCHRONIZE || 'not set'}`)
}

const options: PostgresConnectionOptions = {
  type: 'postgres',
  host: k.POSTGRES_HOST,
  port: k.POSTGRES_PORT,
  username: k.POSTGRES_USER,
  password: k.POSTGRES_PASSWORD,
  database: k.POSTGRES_DB,
  synchronize: shouldSynchronize, // Disabled by default - use migrations instead
  useUTC: true,
  entities: entityPath,
  migrations: ['dist/migrations/*.{ts,js}'],
  logging: true,
  logger: new TruncatedLogger(), // Use custom logger to truncate binary data
  // Connection pool settings to handle connection drops and retries
  extra: {
    // Connection pool configuration
    max: 20, // Maximum number of connections in the pool
    min: 5, // Minimum number of connections in the pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 10000, // Timeout for new connections (10 seconds)
  },
  // Connection retry on startup
  connectTimeoutMS: 10000, // 10 seconds timeout for initial connection
}

const datasource = new DataSource(options)

export { options }
export default datasource
