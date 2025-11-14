import { DataSource } from 'typeorm'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'
import k from './constant'

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
}

const datasource = new DataSource(options)

export { options }
export default datasource
