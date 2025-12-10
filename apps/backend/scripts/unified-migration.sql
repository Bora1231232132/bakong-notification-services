-- ============================================================================
-- Unified Database Migration Script
-- ============================================================================
-- This script combines initialization and all migrations into one file
-- It's safe to run multiple times (idempotent) - checks before creating/adding
-- 
-- Usage:
--   psql -U <username> -d <database> -f apps/backend/unified-migration.sql
-- 
-- Or via Docker:
--   docker exec -i <container-name> psql -U <username> -d <database> < apps/backend/unified-migration.sql
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
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN
        CREATE TYPE notification_type_enum AS ENUM ('FLASH_NOTIFICATION', 'ANNOUNCEMENT', 'NOTIFICATION');
        RAISE NOTICE '✅ Created notification_type_enum';
    ELSE
        RAISE NOTICE 'ℹ️  notification_type_enum already exists';
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
    "bakongPlatform" bakong_platform_enum,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS image (
    id SERIAL PRIMARY KEY,
    "fileId" VARCHAR(255) NOT NULL UNIQUE,
    file BYTEA,
    "fileHash" VARCHAR(32),
    "mimeType" VARCHAR(100),
    "originalFileName" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "category_type" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    icon BYTEA NOT NULL,
    "mimeType" VARCHAR(255),
    "originalFileName" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS template (
    id SERIAL PRIMARY KEY,
    platforms TEXT[],
    "sendType" send_type_enum DEFAULT 'SEND_NOW',
    "notificationType" notification_type_enum DEFAULT 'FLASH_NOTIFICATION',
    priority INTEGER DEFAULT 1,
    "sendInterval" JSON,
    "isSent" BOOLEAN DEFAULT FALSE,
    "sendSchedule" TIMESTAMPTZ,
    "createdBy" VARCHAR(255),
    "updatedBy" VARCHAR(255),
    "publishedBy" VARCHAR(255),
    "bakongPlatform" bakong_platform_enum,
    "showPerDay" INTEGER DEFAULT 1,
    "maxDayShowing" INTEGER DEFAULT 1,
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
    
    -- Add showPerDay column for flash notification limits
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'showPerDay'
    ) THEN
        ALTER TABLE template ADD COLUMN "showPerDay" INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Added showPerDay to template table';
    ELSE
        RAISE NOTICE 'ℹ️  template.showPerDay already exists';
    END IF;
    
    -- Add maxDayShowing column for flash notification limits
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'maxDayShowing'
    ) THEN
        ALTER TABLE template ADD COLUMN "maxDayShowing" INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Added maxDayShowing to template table';
    ELSE
        RAISE NOTICE 'ℹ️  template.maxDayShowing already exists';
    END IF;
END$$;

-- Add imageId column to user table (for profile picture)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user' 
        AND column_name = 'imageId'
    ) THEN
        ALTER TABLE "user" ADD COLUMN "imageId" VARCHAR(255) NULL;
        RAISE NOTICE '✅ Added imageId to user table';
    ELSE
        RAISE NOTICE 'ℹ️  user.imageId already exists';
    END IF;
END$$;

-- Fix sendInterval column type from INTEGER to JSON (if needed)
DO $$
BEGIN
    -- Check if sendInterval exists and is INTEGER type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'sendInterval'
        AND data_type = 'integer'
    ) THEN
        -- Change column type from INTEGER to JSON
        ALTER TABLE template ALTER COLUMN "sendInterval" TYPE JSON USING NULL;
        RAISE NOTICE '✅ Changed sendInterval from INTEGER to JSON';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'sendInterval'
        AND data_type = 'json'
    ) THEN
        RAISE NOTICE 'ℹ️  template.sendInterval is already JSON type';
    ELSE
        RAISE NOTICE 'ℹ️  template.sendInterval column does not exist (will be created as JSON)';
    END IF;
END$$;

-- Fix platforms column type from VARCHAR to TEXT[] array
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'platforms'
        AND data_type = 'character varying'
    ) THEN
        -- Convert VARCHAR to TEXT[] array
        -- Handle existing data: convert comma-separated string to array or empty array
        ALTER TABLE template 
        ALTER COLUMN platforms TYPE TEXT[] 
        USING CASE 
            WHEN platforms IS NULL OR platforms = '' THEN ARRAY[]::TEXT[]
            ELSE string_to_array(platforms, ',')
        END;
        RAISE NOTICE '✅ Changed platforms from VARCHAR to TEXT[] array';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'platforms'
        AND udt_name = '_text'
    ) THEN
        RAISE NOTICE 'ℹ️  template.platforms is already TEXT[] array';
    ELSE
        RAISE NOTICE 'ℹ️  template.platforms column does not exist';
    END IF;
END$$;

-- Fix notificationType column type from VARCHAR to enum
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'notificationType'
        AND data_type = 'character varying'
    ) THEN
        -- Convert VARCHAR to notification_type_enum
        ALTER TABLE template 
        ALTER COLUMN "notificationType" TYPE notification_type_enum 
        USING CASE 
            WHEN "notificationType" IN ('FLASH_NOTIFICATION', 'ANNOUNCEMENT', 'NOTIFICATION') 
            THEN "notificationType"::notification_type_enum
            ELSE 'FLASH_NOTIFICATION'::notification_type_enum
        END;
        RAISE NOTICE '✅ Changed notificationType from VARCHAR to notification_type_enum';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'notificationType'
        AND udt_name = 'notification_type_enum'
    ) THEN
        RAISE NOTICE 'ℹ️  template.notificationType is already notification_type_enum';
    ELSE
        RAISE NOTICE 'ℹ️  template.notificationType column does not exist';
    END IF;
END$$;

-- Add categoryTypeId column to template table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'categoryTypeId'
    ) THEN
        ALTER TABLE template ADD COLUMN "categoryTypeId" INTEGER NULL;
        RAISE NOTICE '✅ Added categoryTypeId column to template table';
    ELSE
        RAISE NOTICE 'ℹ️  template.categoryTypeId already exists';
    END IF;
END$$;

-- Remove old categoryType VARCHAR column (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'categoryType'
    ) THEN
        ALTER TABLE template DROP COLUMN "categoryType";
        RAISE NOTICE '✅ Removed old categoryType column from template table';
    ELSE
        RAISE NOTICE 'ℹ️  template.categoryType column does not exist (already removed)';
    END IF;
END$$;

-- ============================================================================
-- Add fileHash column to image table for fast duplicate detection
-- ============================================================================
-- This adds a fileHash column with index to optimize image upload
-- performance by checking duplicates BEFORE compression
-- ============================================================================
\echo '🔄 Adding fileHash column to image table...'

-- Add fileHash column (nullable first, will populate then make unique)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image' 
        AND column_name = 'fileHash'
    ) THEN
        ALTER TABLE image ADD COLUMN "fileHash" VARCHAR(32);
        RAISE NOTICE '✅ Added fileHash column to image table';
    ELSE
        RAISE NOTICE 'ℹ️  image.fileHash already exists';
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

-- Add FK: notification -> template (with CASCADE delete)
-- First, drop existing constraint if it exists and recreate with CASCADE
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the existing foreign key constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'notification'::regclass
      AND contype = 'f'
      AND confrelid = 'template'::regclass;
    
    -- Drop the constraint if it exists (to update it to CASCADE)
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE notification DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE '✅ Dropped existing FK_notification_template to update to CASCADE';
    END IF;
    
    -- Clean up orphaned notification records (those with NULL templateId or invalid templateId)
    DELETE FROM notification
    WHERE "templateId" IS NULL 
       OR "templateId" NOT IN (SELECT id FROM template);
    
    IF (SELECT COUNT(*) FROM notification WHERE "templateId" IS NULL OR "templateId" NOT IN (SELECT id FROM template)) > 0 THEN
        RAISE NOTICE '✅ Cleaned up orphaned notification records';
    ELSE
        RAISE NOTICE 'ℹ️  No orphaned notification records found';
    END IF;
    
    -- Recreate the constraint with CASCADE delete
    ALTER TABLE notification 
    ADD CONSTRAINT "FK_notification_template" 
    FOREIGN KEY ("templateId") REFERENCES template(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added FK_notification_template with CASCADE delete';
END$$;

-- Add FK: template -> category_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_template_category_type'
        AND table_name = 'template'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE template
        ADD CONSTRAINT fk_template_category_type
        FOREIGN KEY ("categoryTypeId")
        REFERENCES category_type(id)
        ON DELETE SET NULL;
        RAISE NOTICE '✅ Added fk_template_category_type';
    ELSE
        RAISE NOTICE 'ℹ️  fk_template_category_type already exists';
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
CREATE INDEX IF NOT EXISTS "IDX_template_categoryTypeId" ON template("categoryTypeId");
CREATE INDEX IF NOT EXISTS "IDX_template_translation_templateId" ON template_translation("templateId");
CREATE INDEX IF NOT EXISTS "IDX_template_translation_language" ON template_translation(language);
CREATE INDEX IF NOT EXISTS "IDX_user_username" ON "user"(username);
CREATE INDEX IF NOT EXISTS "IDX_user_role" ON "user"(role);
CREATE INDEX IF NOT EXISTS "IDX_image_fileId" ON image("fileId");
CREATE INDEX IF NOT EXISTS "IDX_image_fileHash" ON image("fileHash");
CREATE INDEX IF NOT EXISTS "IDX_category_type_name" ON "category_type"(name);
CREATE INDEX IF NOT EXISTS "IDX_category_type_deletedAt" ON "category_type"("deletedAt") WHERE "deletedAt" IS NULL;

\echo '   ✅ Indexes created'
\echo ''

-- ============================================================================
-- Step 7.5: Populate fileHash for existing images and add unique constraint
-- ============================================================================
-- This step populates fileHash for existing images (may take time for large tables)
-- Then adds unique constraint and makes it NOT NULL
-- ============================================================================
\echo '📊 Step 7.5: Populating fileHash for existing images...'
\echo '   This may take a few minutes if you have many images...'

DO $$
DECLARE
    image_record RECORD;
    hash_value TEXT;
    processed_count INTEGER := 0;
BEGIN
    -- Populate fileHash for existing images that don't have it
    FOR image_record IN 
        SELECT id, file FROM image WHERE "fileHash" IS NULL AND file IS NOT NULL
    LOOP
        -- Compute MD5 hash of the file
        SELECT md5(image_record.file) INTO hash_value;
        
        -- Update the record with the hash
        UPDATE image SET "fileHash" = hash_value WHERE id = image_record.id;
        
        processed_count := processed_count + 1;
        
        -- Log progress every 100 records
        IF processed_count % 100 = 0 THEN
            RAISE NOTICE '   Processed % images...', processed_count;
        END IF;
    END LOOP;
    
    IF processed_count > 0 THEN
        RAISE NOTICE '✅ Populated fileHash for % existing images', processed_count;
    ELSE
        RAISE NOTICE 'ℹ️  No existing images need fileHash population';
    END IF;
END$$;

\echo '   ✅ Existing images processed'
\echo ''

-- Add unique constraint on fileHash (after population)
\echo '   Adding unique constraint on fileHash...'
DO $$
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'UQ_image_fileHash'
    ) THEN
        -- First, handle any duplicate hashes (shouldn't happen, but just in case)
        -- Keep the oldest record for each hash
        DELETE FROM image a
        USING image b
        WHERE a.id > b.id 
        AND a."fileHash" = b."fileHash"
        AND a."fileHash" IS NOT NULL;
        
        -- Now add unique constraint
        ALTER TABLE image ADD CONSTRAINT "UQ_image_fileHash" UNIQUE ("fileHash");
        RAISE NOTICE '✅ Added unique constraint on fileHash';
    ELSE
        RAISE NOTICE 'ℹ️  Unique constraint on fileHash already exists';
    END IF;
END$$;

\echo '   ✅ Unique constraint added'
\echo ''

-- Make fileHash NOT NULL (after population and constraint)
\echo '   Making fileHash NOT NULL...'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image' 
        AND column_name = 'fileHash'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE image ALTER COLUMN "fileHash" SET NOT NULL;
        RAISE NOTICE '✅ Made fileHash NOT NULL';
    ELSE
        RAISE NOTICE 'ℹ️  fileHash is already NOT NULL';
    END IF;
END$$;

\echo ''
\echo '✅ fileHash migration completed successfully!'
\echo ''
\echo '📋 fileHash Migration Summary:'
\echo '   - Added fileHash column to image table'
\echo '   - Created index on fileHash for fast lookups'
\echo '   - Populated fileHash for existing images'
\echo '   - Added unique constraint on fileHash'
\echo '   - Made fileHash NOT NULL'
\echo ''
\echo '🚀 Image upload performance should now be significantly faster!'
\echo ''

-- ============================================================================
-- Step 7.6: Add syncStatus column to bakong_user table
-- ============================================================================
\echo '📊 Step 7.6: Adding syncStatus column to bakong_user table...'

-- Check if column already exists (safety check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bakong_user' 
        AND column_name = 'syncStatus'
    ) THEN
        -- Add syncStatus column
        ALTER TABLE bakong_user 
        ADD COLUMN "syncStatus" JSONB DEFAULT '{
          "status": "SUCCESS",
          "lastSyncAt": null,
          "lastSyncMessage": null
        }'::jsonb;
        
        RAISE NOTICE '✅ Added syncStatus column to bakong_user table';
    ELSE
        RAISE NOTICE 'ℹ️  syncStatus column already exists, skipping';
    END IF;
END $$;

-- Create GIN index on entire syncStatus JSONB column for faster JSON queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_bakong_user_sync_status_gin'
    ) THEN
        CREATE INDEX idx_bakong_user_sync_status_gin 
        ON bakong_user USING GIN ("syncStatus");
        
        RAISE NOTICE '✅ Created GIN index on syncStatus';
    ELSE
        RAISE NOTICE 'ℹ️  GIN index already exists, skipping';
    END IF;
END $$;

-- Create BTREE index on syncStatus->>'status' for status filtering
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_bakong_user_sync_status'
    ) THEN
        CREATE INDEX idx_bakong_user_sync_status 
        ON bakong_user USING BTREE (("syncStatus"->>'status'));
        
        RAISE NOTICE '✅ Created BTREE index on syncStatus status';
    ELSE
        RAISE NOTICE 'ℹ️  BTREE status index already exists, skipping';
    END IF;
END $$;

-- Create BTREE index on syncStatus->>'lastSyncAt' for date-based queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_bakong_user_sync_last_sync_at'
    ) THEN
        -- Create partial index for non-NULL values
        CREATE INDEX idx_bakong_user_sync_last_sync_at 
        ON bakong_user USING BTREE (((syncStatus->>'lastSyncAt')::timestamp))
        WHERE syncStatus->>'lastSyncAt' IS NOT NULL;
        
        RAISE NOTICE '✅ Created BTREE index on syncStatus lastSyncAt';
    ELSE
        RAISE NOTICE 'ℹ️  BTREE lastSyncAt index already exists, skipping';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Could not create lastSyncAt index (may have NULL values): %', SQLERRM;
END $$;

-- Update existing users with default sync status if they don't have one
UPDATE bakong_user 
SET "syncStatus" = '{
  "status": "SUCCESS",
  "lastSyncAt": null,
  "lastSyncMessage": "Migration: existing user"
}'::jsonb
WHERE "syncStatus" IS NULL;

-- Log how many users were updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Updated % users with default syncStatus', updated_count;
END $$;

\echo '   ✅ syncStatus migration completed'
\echo ''

-- ============================================================================
-- Step 8: Add Comments
-- ============================================================================
\echo '📝 Step 8: Adding column comments...'

COMMENT ON TABLE "category_type" IS 'Stores category types for notification templates';
COMMENT ON COLUMN "category_type".name IS 'Unique name of the category type';
COMMENT ON COLUMN "category_type".icon IS 'Binary icon data for the category type';
COMMENT ON COLUMN "category_type"."mimeType" IS 'MIME type of the icon (e.g., image/png, image/svg+xml)';
COMMENT ON COLUMN "category_type"."originalFileName" IS 'Original filename of the uploaded icon';
COMMENT ON COLUMN "template"."categoryTypeId" IS 'Foreign key reference to category_type table';
COMMENT ON COLUMN notification."sendCount" IS 'Number of times notification has been sent';
COMMENT ON COLUMN bakong_user."syncStatus" IS 'JSONB column tracking sync status. Structure: {"status": "SUCCESS"|"FAILED", "lastSyncAt": "ISO8601 timestamp", "lastSyncMessage": "message string"}';

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
\echo '   3. Check syncStatus column: SELECT "accountId", "syncStatus" FROM bakong_user LIMIT 5;'
\echo '   4. Restart your application'
\echo ''

