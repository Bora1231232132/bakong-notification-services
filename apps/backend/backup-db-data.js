const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const envArg = process.argv.find((arg) => arg.startsWith('--env='))
const nodeEnv = envArg ? envArg.split('=')[1] : process.env.NODE_ENV || 'development'

const dbConfig = {
  development: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || '5437',
    database: process.env.POSTGRES_DB || 'bakong_notification_services_dev',
    user: process.env.POSTGRES_USER || 'bkns_dev',
    password: process.env.POSTGRES_PASSWORD || 'dev',
  },
  staging: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || '5434',
    database: process.env.POSTGRES_DB || 'bakong_notification_services_sit',
    user: process.env.POSTGRES_USER || 'bkns_sit',
    password: process.env.POSTGRES_PASSWORD || '0101bkns_sit',
  },
  production: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || '5433',
    database: process.env.POSTGRES_DB || 'bakong_notification_services',
    user: process.env.POSTGRES_USER || 'bkns',
    password: process.env.POSTGRES_PASSWORD || '010110bkns',
  },
}

const config = dbConfig[nodeEnv] || dbConfig.development

const outputFile = path.join(__dirname, `init-db-data-${nodeEnv}.sql`)
const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19)

console.log('🔄 Starting database data backup...')
console.log(`📊 Environment: ${nodeEnv}`)
console.log(`🗄️  Database: ${config.database}`)
console.log(`📝 Output file: ${outputFile}\n`)

try {
  const containerName =
    nodeEnv === 'development'
      ? 'bakong-notification-services-db-dev'
      : nodeEnv === 'staging'
        ? 'bakong-notification-services-db-sit'
        : 'bakong-notification-services-db-prod'

  let useDocker = false
  try {
    const dockerCheck = execSync(
      `docker ps --filter "name=${containerName}" --format "{{.Names}}"`,
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ).trim()
    if (dockerCheck === containerName) {
      useDocker = true
      console.log('🐳 Using Docker container for backup...')
    }
  } catch (error) {
    console.log('📡 Attempting direct database connection...')
  }

  let sqlOutput

  if (useDocker) {
    const tempFile = path.join(__dirname, `.backup-temp-${Date.now()}.sql`)

    const dockerCmd = [
      'docker exec',
      containerName,
      'pg_dump',
      `-U ${config.user}`,
      `-d ${config.database}`,
      '--data-only',
      '--inserts',
      '--column-inserts',
      '--no-owner',
      '--no-privileges',
      '--no-tablespaces',
      '--disable-triggers',
    ].join(' ')

    console.log('📤 Exporting data from database via Docker...')

    try {
      const output = execSync(dockerCmd, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 50 * 1024 * 1024,
      })
      fs.writeFileSync(tempFile, output, 'utf8')
      sqlOutput = output
    } catch (error) {
      console.log('   Using file redirect method for large database...')
      const dockerCmdWithRedirect = `docker exec ${containerName} sh -c "pg_dump -U ${config.user} -d ${config.database} --data-only --inserts --column-inserts --no-owner --no-privileges --no-tablespaces --disable-triggers" > "${tempFile}"`
      execSync(dockerCmdWithRedirect, { shell: true, stdio: 'inherit' })
      sqlOutput = fs.readFileSync(tempFile, 'utf8')
    }

    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile)
    }
  } else {
    try {
      execSync('pg_dump --version', { stdio: 'ignore' })
    } catch (error) {
      console.error('❌ Error: pg_dump not found and Docker container not available!')
      console.error('   Options:')
      console.error('   1. Start Docker container: docker-compose up -d db')
      console.error('   2. Install PostgreSQL client tools')
      console.error('      Windows: https://www.postgresql.org/download/windows/')
      console.error('      Mac: brew install postgresql')
      console.error('      Linux: sudo apt-get install postgresql-client')
      process.exit(1)
    }

    process.env.PGPASSWORD = config.password

    const pgDumpCmd = [
      'pg_dump',
      `--host=${config.host}`,
      `--port=${config.port}`,
      `--username=${config.user}`,
      `--dbname=${config.database}`,
      '--data-only',
      '--inserts',
      '--column-inserts',
      '--no-owner',
      '--no-privileges',
      '--no-tablespaces',
      '--disable-triggers',
    ].join(' ')

    console.log('📤 Exporting data from database...')

    sqlOutput = execSync(pgDumpCmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  }

  const header = `-- ============================================
-- Database Data Backup
-- Environment: ${nodeEnv}
-- Database: ${config.database}
-- Generated: ${timestamp}
-- ============================================
-- 
-- This file contains INSERT statements for all data in the database.
-- Run this file AFTER running init-db.sql to populate the database
-- with existing data.
--
-- Usage:
--   1. Run init-db.sql first (creates schema)
--   2. Then run this file: psql -U ${config.user} -d ${config.database} -f ${path.basename(outputFile)}
--
-- ============================================

-- Disable foreign key checks temporarily for faster inserts
SET session_replication_role = 'replica';

-- Begin transaction
BEGIN;

`

  const footer = `
-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Commit transaction
COMMIT;

-- ============================================
-- Backup completed successfully!
-- ============================================
`

  const fullContent = header + sqlOutput + footer
  fs.writeFileSync(outputFile, fullContent, 'utf8')

  console.log('✅ Backup completed successfully!')
  console.log(`📄 Data exported to: ${outputFile}`)
  console.log(`\n💡 To restore this data:`)
  if (useDocker) {
    console.log(
      `   docker exec -i ${containerName} psql -U ${config.user} -d ${config.database} < ${path.basename(outputFile)}`,
    )
  } else {
    console.log(`   psql -U ${config.user} -d ${config.database} -f ${path.basename(outputFile)}`)
    console.log(`\n   Or in Docker:`)
    console.log(
      `   docker exec -i ${containerName} psql -U ${config.user} -d ${config.database} < ${path.basename(outputFile)}`,
    )
  }
} catch (error) {
  console.error('❌ Error during backup:', error.message)
  if (error.stderr) {
    console.error('   Details:', error.stderr.toString())
  }
  process.exit(1)
} finally {
  if (process.env.PGPASSWORD) {
    delete process.env.PGPASSWORD
  }
}
