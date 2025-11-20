-- ============================================================================
-- Consolidated Migration Script: Add bakongPlatform Support
-- ============================================================================
-- This script adds the bakongPlatform feature to the database
-- It's safe to run multiple times (idempotent)
-- 
-- Usage:
--   psql -U <username> -d <database> -f apps/backend/scripts/add-bakong-platform-migration.sql
-- 
-- Or via Docker:
--   docker exec -i <container-name> psql -U <username> -d <database> < apps/backend/scripts/add-bakong-platform-migration.sql
-- ============================================================================

\echo '🔄 Starting bakongPlatform migration...'
\echo ''

-- ============================================================================
-- Step 1: Create bakong_platform_enum type
-- ============================================================================
\echo '📝 Step 1: Creating bakong_platform_enum type...'

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bakong_platform_enum') THEN
        CREATE TYPE bakong_platform_enum AS ENUM ('BAKONG', 'BAKONG_TOURIST', 'BAKONG_JUNIOR');
        RAISE NOTICE '✅ Created bakong_platform_enum type';
    ELSE
        RAISE NOTICE 'ℹ️  bakong_platform_enum type already exists';
    END IF;
END$$;

\echo ''

-- ============================================================================
-- Step 2: Add bakongPlatform column to template table
-- ============================================================================
\echo '📝 Step 2: Adding bakongPlatform column to template table...'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'bakongPlatform'
    ) THEN
        ALTER TABLE template ADD COLUMN "bakongPlatform" bakong_platform_enum;
        RAISE NOTICE '✅ Added bakongPlatform column to template table';
    ELSE
        RAISE NOTICE 'ℹ️  bakongPlatform column already exists in template table';
    END IF;
END$$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "IDX_template_bakongPlatform" ON template("bakongPlatform");

\echo ''

-- ============================================================================
-- Step 3: Add bakongPlatform column to bakong_user table
-- ============================================================================
\echo '📝 Step 3: Adding bakongPlatform column to bakong_user table...'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bakong_user' 
        AND column_name = 'bakongPlatform'
    ) THEN
        ALTER TABLE bakong_user ADD COLUMN "bakongPlatform" bakong_platform_enum;
        RAISE NOTICE '✅ Added bakongPlatform column to bakong_user table';
    ELSE
        RAISE NOTICE 'ℹ️  bakongPlatform column already exists in bakong_user table';
    END IF;
END$$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "IDX_bakong_user_bakongPlatform" ON bakong_user("bakongPlatform");

\echo ''

-- ============================================================================
-- Step 4: Verify migration
-- ============================================================================
\echo '📊 Step 4: Verifying migration...'
\echo ''

-- Check enum type
DO $$
DECLARE
    enum_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'bakong_platform_enum'
    ) INTO enum_exists;
    
    IF enum_exists THEN
        RAISE NOTICE '✅ bakong_platform_enum type exists';
    ELSE
        RAISE WARNING '❌ bakong_platform_enum type NOT found!';
    END IF;
END$$;

-- Check template.bakongPlatform column
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'bakongPlatform'
    ) INTO col_exists;
    
    IF col_exists THEN
        RAISE NOTICE '✅ template.bakongPlatform column exists';
    ELSE
        RAISE WARNING '❌ template.bakongPlatform column NOT found!';
    END IF;
END$$;

-- Check bakong_user.bakongPlatform column
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bakong_user' 
        AND column_name = 'bakongPlatform'
    ) INTO col_exists;
    
    IF col_exists THEN
        RAISE NOTICE '✅ bakong_user.bakongPlatform column exists';
    ELSE
        RAISE WARNING '❌ bakong_user.bakongPlatform column NOT found!';
    END IF;
END$$;

\echo ''
\echo '📋 Migration Summary:'
\echo ''

-- Display column details
SELECT 
    'template.bakongPlatform' as table_column,
    column_name, 
    data_type, 
    udt_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'template' 
AND column_name = 'bakongPlatform'

UNION ALL

SELECT 
    'bakong_user.bakongPlatform' as table_column,
    column_name, 
    data_type, 
    udt_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'bakong_user' 
AND column_name = 'bakongPlatform';

\echo ''
\echo '✅ Migration completed successfully!'
\echo ''
\echo '💡 Next steps:'
\echo '   1. Restart your application'
\echo '   2. Test the new bakongPlatform filtering feature'
\echo '   3. Verify notifications are filtered correctly'
\echo ''

