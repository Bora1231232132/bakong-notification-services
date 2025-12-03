-- ============================================================================
-- Migration: Add Flash Notification Limit Fields
-- ============================================================================
-- This script adds showPerDay and maxDayShowing columns to the template table
-- for flash notification limit configuration.
-- 
-- Also fixes sendInterval column type from INTEGER to JSON if needed.
--
-- Safe to run multiple times (idempotent)
-- 
-- Usage:
--   psql -U <username> -d <database> -f apps/backend/scripts/add-flash-notification-limits.sql
-- 
-- Or via Docker:
--   docker exec -i <container-name> psql -U <username> -d <database> < apps/backend/scripts/add-flash-notification-limits.sql
-- ============================================================================

\echo '🔄 Starting flash notification limits migration...'
\echo ''

-- ============================================================================
-- Step 1: Add showPerDay column
-- ============================================================================
\echo '📊 Step 1: Adding showPerDay column to template table...'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'showPerDay'
    ) THEN
        ALTER TABLE template ADD COLUMN "showPerDay" INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Added showPerDay to template table (default: 1)';
    ELSE
        RAISE NOTICE 'ℹ️  template.showPerDay already exists';
    END IF;
END$$;

\echo '   ✅ showPerDay migration completed'
\echo ''

-- ============================================================================
-- Step 2: Add maxDayShowing column
-- ============================================================================
\echo '📊 Step 2: Adding maxDayShowing column to template table...'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'maxDayShowing'
    ) THEN
        ALTER TABLE template ADD COLUMN "maxDayShowing" INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Added maxDayShowing to template table (default: 1)';
    ELSE
        RAISE NOTICE 'ℹ️  template.maxDayShowing already exists';
    END IF;
END$$;

\echo '   ✅ maxDayShowing migration completed'
\echo ''

-- ============================================================================
-- Step 3: Fix sendInterval column type (INTEGER -> JSON)
-- ============================================================================
\echo '📊 Step 3: Fixing sendInterval column type (INTEGER -> JSON)...'

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
        -- First, clear any existing data (since INTEGER can't be converted to JSON)
        UPDATE template SET "sendInterval" = NULL WHERE "sendInterval" IS NOT NULL;
        
        -- Change column type
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
        RAISE NOTICE 'ℹ️  template.sendInterval column does not exist';
    END IF;
END$$;

\echo '   ✅ sendInterval type fix completed'
\echo ''

-- ============================================================================
-- Step 4: Update existing templates with default values
-- ============================================================================
\echo '📊 Step 4: Updating existing templates with default values...'

DO $$
BEGIN
    -- Set default values for existing templates that have NULL values
    UPDATE template 
    SET "showPerDay" = 1 
    WHERE "showPerDay" IS NULL;
    
    UPDATE template 
    SET "maxDayShowing" = 1 
    WHERE "maxDayShowing" IS NULL;
    
    RAISE NOTICE '✅ Updated existing templates with default values (1, 1)';
END$$;

\echo '   ✅ Default values update completed'
\echo ''

-- ============================================================================
-- Step 5: Verification
-- ============================================================================
\echo '✅ Migration completed successfully!'
\echo ''
\echo '📋 Verification:'
\echo ''

-- Check if columns exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'template' AND column_name = 'showPerDay'
        ) THEN '✅ showPerDay column exists'
        ELSE '❌ showPerDay column missing'
    END as showPerDay_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'template' AND column_name = 'maxDayShowing'
        ) THEN '✅ maxDayShowing column exists'
        ELSE '❌ maxDayShowing column missing'
    END as maxDayShowing_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'template' 
            AND column_name = 'sendInterval' 
            AND data_type = 'json'
        ) THEN '✅ sendInterval is JSON type'
        ELSE '⚠️  sendInterval type check failed'
    END as sendInterval_status;

\echo ''
\echo '📊 Summary:'
\echo '   - showPerDay: Number of times to show flash notification per day (default: 1)'
\echo '   - maxDayShowing: Maximum number of days to show flash notification (default: 1)'
\echo '   - sendInterval: Changed from INTEGER to JSON type'
\echo ''
\echo '🚀 Flash notification limits are now configurable!'
\echo ''

