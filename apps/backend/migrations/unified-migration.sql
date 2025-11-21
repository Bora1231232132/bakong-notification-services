-- ============================================================================
-- Unified Database Migration Script
-- ============================================================================
-- This script combines initialization and all migrations into one file
-- It's safe to run multiple times (idempotent) - checks before creating/adding
-- 
-- Usage:
--   psql -U <username> -d <database> -f apps/backend/migrations/unified-migration.sql
-- 
-- Or via Docker:
--   docker exec -i <container-name> psql -U <username> -d <database> < apps/backend/migrations/unified-migration.sql
-- ============================================================================

\echo '🔄 Starting unified database migration...'
\echo ''

-- ============================================================================
-- Step 1: Create Extensions
-- ============================================================================
\echo '📦 Step 1: Creating PostgreSQL extensions...'

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\echo '   ✅ Extensions created'
\echo ''

-- ============================================================================
-- Step 2: Create Enum Types
-- ============================================================================
\echo '📝 Step 2: Creating enum types...'

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('ADMIN_USER', 'NORMAL_USER', 'API_USER');
        RAISE NOTICE '✅ Created user_role_enum';
    ELSE
        RAISE NOTICE 'ℹ️  user_role_enum already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'send_type_enum') THEN
        CREATE TYPE send_type_enum AS ENUM ('SEND_NOW', 'SEND_SCHEDULE', 'SEND_INTERVAL');
        RAISE NOTICE '✅ Created send_type_enum';
    ELSE
        RAISE NOTICE 'ℹ️  send_type_enum already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_enum') THEN
        CREATE TYPE platform_enum AS ENUM ('ALL', 'IOS', 'ANDROID');
        RAISE NOTICE '✅ Created platform_enum';
    ELSE
        RAISE NOTICE 'ℹ️  platform_enum already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language_enum') THEN
        CREATE TYPE language_enum AS ENUM ('EN', 'KM', 'JP');
        RAISE NOTICE '✅ Created language_enum';
    ELSE
        RAISE NOTICE 'ℹ️  language_enum already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bakong_platform_enum') THEN
        CREATE TYPE bakong_platform_enum AS ENUM ('BAKONG', 'BAKONG_TOURIST', 'BAKONG_JUNIOR');
        RAISE NOTICE '✅ Created bakong_platform_enum';
    ELSE
        RAISE NOTICE 'ℹ️  bakong_platform_enum already exists';
    END IF;
END$$;

\echo '   ✅ Enum types ready'
\echo ''

-- ============================================================================
-- Step 3: Grant Privileges (for development/testing)
-- ============================================================================
\echo '🔐 Step 3: Granting privileges...'

-- Grant privileges to bkns_dev user (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_user WHERE usename = 'bkns_dev') THEN
        GRANT ALL PRIVILEGES ON DATABASE bakong_notification_services_dev TO "bkns_dev";
        GRANT ALL PRIVILEGES ON SCHEMA public TO "bkns_dev";
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "bkns_dev";
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "bkns_dev";
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "bkns_dev";
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "bkns_dev";
        RAISE NOTICE '✅ Granted privileges to bkns_dev';
    END IF;
END$$;

\echo '   ✅ Privileges granted'
\echo ''

-- ============================================================================
-- Step 4: Create Tables
-- ============================================================================
\echo '📊 Step 4: Creating tables...'

CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(255),
    role VARCHAR(50) DEFAULT 'USER',
    "failLoginAttempt" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS bakong_user (
    id SERIAL PRIMARY KEY,
    "accountId" VARCHAR(32) NOT NULL,
    "fcmToken" VARCHAR(255) NOT NULL,
    "participantCode" VARCHAR(50),
    platform VARCHAR(50),
    language VARCHAR(10) DEFAULT 'EN',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS image (
    id SERIAL PRIMARY KEY,
    "fileId" VARCHAR(255) NOT NULL UNIQUE,
    file BYTEA,
    "mimeType" VARCHAR(100),
    "originalFileName" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template (
    id SERIAL PRIMARY KEY,
    platforms VARCHAR(255),
    "sendType" send_type_enum DEFAULT 'SEND_NOW',
    "notificationType" VARCHAR(50),
    "categoryType" VARCHAR(50),
    priority INTEGER DEFAULT 1,
    "sendInterval" INTEGER,
    "isSent" BOOLEAN DEFAULT FALSE,
    "sendSchedule" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS template_translation (
    id SERIAL PRIMARY KEY,
    "templateId" INTEGER NOT NULL,
    language language_enum DEFAULT 'EN',
    title VARCHAR(1024) NOT NULL,
    content TEXT NOT NULL,
    "imageId" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "linkPreview" TEXT
);

CREATE TABLE IF NOT EXISTS notification (
    id BIGSERIAL PRIMARY KEY,
    "accountId" VARCHAR(32) NOT NULL,
    "fcmToken" VARCHAR(255) NOT NULL,
    "templateId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "firebaseMessageId" BIGINT,
    "sendCount" INTEGER DEFAULT 1
);

\echo '   ✅ Tables created'
\echo ''

-- ============================================================================
-- Step 5: Add Missing Columns (Migrations)
-- ============================================================================
\echo '🔧 Step 5: Adding missing columns (migrations)...'

-- Add bakongPlatform to template table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'bakongPlatform'
    ) THEN
        ALTER TABLE template ADD COLUMN "bakongPlatform" bakong_platform_enum;
        RAISE NOTICE '✅ Added bakongPlatform to template table';
    ELSE
        RAISE NOTICE 'ℹ️  template.bakongPlatform already exists';
    END IF;
END$$;

-- Add bakongPlatform to bakong_user table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bakong_user' 
        AND column_name = 'bakongPlatform'
    ) THEN
        ALTER TABLE bakong_user ADD COLUMN "bakongPlatform" bakong_platform_enum;
        RAISE NOTICE '✅ Added bakongPlatform to bakong_user table';
    ELSE
        RAISE NOTICE 'ℹ️  bakong_user.bakongPlatform already exists';
    END IF;
END$$;

-- Add audit columns to template table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'createdBy'
    ) THEN
        ALTER TABLE template ADD COLUMN "createdBy" VARCHAR(255);
        RAISE NOTICE '✅ Added createdBy to template table';
    ELSE
        RAISE NOTICE 'ℹ️  template.createdBy already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'updatedBy'
    ) THEN
        ALTER TABLE template ADD COLUMN "updatedBy" VARCHAR(255);
        RAISE NOTICE '✅ Added updatedBy to template table';
    ELSE
        RAISE NOTICE 'ℹ️  template.updatedBy already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'publishedBy'
    ) THEN
        ALTER TABLE template ADD COLUMN "publishedBy" VARCHAR(255);
        RAISE NOTICE '✅ Added publishedBy to template table';
    ELSE
        RAISE NOTICE 'ℹ️  template.publishedBy already exists';
    END IF;
END$$;

\echo '   ✅ Columns migration completed'
\echo ''

-- ============================================================================
-- Step 6: Add Foreign Key Constraints (Idempotent)
-- ============================================================================
\echo '🔗 Step 6: Adding foreign key constraints...'

-- Add FK: template_translation -> template
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_template_translation_template'
        AND table_name = 'template_translation'
    ) THEN
        ALTER TABLE template_translation 
        ADD CONSTRAINT "FK_template_translation_template" 
        FOREIGN KEY ("templateId") REFERENCES template(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added FK_template_translation_template';
    ELSE
        RAISE NOTICE 'ℹ️  FK_template_translation_template already exists';
    END IF;
END$$;

-- Add FK: template_translation -> image
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_template_translation_image'
        AND table_name = 'template_translation'
    ) THEN
        ALTER TABLE template_translation 
        ADD CONSTRAINT "FK_template_translation_image" 
        FOREIGN KEY ("imageId") REFERENCES image("fileId") ON DELETE SET NULL;
        RAISE NOTICE '✅ Added FK_template_translation_image';
    ELSE
        RAISE NOTICE 'ℹ️  FK_template_translation_image already exists';
    END IF;
END$$;

-- Add FK: notification -> template
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_notification_template'
        AND table_name = 'notification'
    ) THEN
        ALTER TABLE notification 
        ADD CONSTRAINT "FK_notification_template" 
        FOREIGN KEY ("templateId") REFERENCES template(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added FK_notification_template';
    ELSE
        RAISE NOTICE 'ℹ️  FK_notification_template already exists';
    END IF;
END$$;

\echo '   ✅ Foreign keys added'
\echo ''

-- ============================================================================
-- Step 7: Create Indexes
-- ============================================================================
\echo '📇 Step 7: Creating indexes...'

CREATE INDEX IF NOT EXISTS "IDX_notification_accountId" ON notification("accountId");
CREATE INDEX IF NOT EXISTS "IDX_notification_templateId" ON notification("templateId");
CREATE INDEX IF NOT EXISTS "IDX_notification_createdAt" ON notification("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_bakong_user_accountId" ON bakong_user("accountId");
CREATE INDEX IF NOT EXISTS "IDX_bakong_user_platform" ON bakong_user(platform);
CREATE INDEX IF NOT EXISTS "IDX_bakong_user_bakongPlatform" ON bakong_user("bakongPlatform");
CREATE INDEX IF NOT EXISTS "IDX_template_sendType" ON template("sendType");
CREATE INDEX IF NOT EXISTS "IDX_template_isSent" ON template("isSent");
CREATE INDEX IF NOT EXISTS "IDX_template_bakongPlatform" ON template("bakongPlatform");
CREATE INDEX IF NOT EXISTS "IDX_template_translation_templateId" ON template_translation("templateId");
CREATE INDEX IF NOT EXISTS "IDX_template_translation_language" ON template_translation(language);
CREATE INDEX IF NOT EXISTS "IDX_user_username" ON "user"(username);
CREATE INDEX IF NOT EXISTS "IDX_user_role" ON "user"(role);
CREATE INDEX IF NOT EXISTS "IDX_image_fileId" ON image("fileId");

\echo '   ✅ Indexes created'
\echo ''

-- ============================================================================
-- Step 8: Add Comments
-- ============================================================================
\echo '📝 Step 8: Adding column comments...'

COMMENT ON COLUMN notification."sendCount" IS 'Number of times notification has been sent';

\echo '   ✅ Comments added'
\echo ''

-- ============================================================================
-- Step 9: Verification
-- ============================================================================
\echo '✅ Migration completed successfully!'
\echo ''
\echo '📋 Database Schema Summary:'
\echo ''

-- List all tables
SELECT 
    'Tables' as category,
    COUNT(*)::text as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'

UNION ALL

-- List all columns in template table
SELECT 
    'template.columns' as category,
    COUNT(*)::text as count
FROM information_schema.columns 
WHERE table_name = 'template'

UNION ALL

-- List all indexes
SELECT 
    'Indexes' as category,
    COUNT(*)::text as count
FROM pg_indexes 
WHERE schemaname = 'public';

\echo ''
\echo '💡 Next steps:'
\echo '   1. Verify tables: \dt'
\echo '   2. Check template columns: \d template'
\echo '   3. Restart your application'
\echo ''

