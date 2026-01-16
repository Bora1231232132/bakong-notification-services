-- ============================================================================
-- Migration: Migrate failLoginAttempt to syncStatus JSONB column
-- ============================================================================
-- This script safely migrates failLoginAttempt column to syncStatus JSONB
-- Handles cases where column already exists or doesn't exist
-- ============================================================================

\echo ''
\echo '📊 Migrating failLoginAttempt to syncStatus JSONB column...'
\echo ''

-- Step 1: Add syncStatus column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'syncStatus'
    ) THEN
        -- Add syncStatus column with default value
        ALTER TABLE "user"
        ADD COLUMN "syncStatus" JSONB DEFAULT '{
          "failLoginAttempt": 0,
          "login_at": null,
          "changePassword_count": 0
        }'::jsonb;

        RAISE NOTICE '✅ Added syncStatus column to user table';
    ELSE
        RAISE NOTICE 'ℹ️  syncStatus column already exists, skipping';
    END IF;
END $$;

-- Step 2: Migrate existing failLoginAttempt values to syncStatus
DO $$
BEGIN
    -- Check if failLoginAttempt column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'failLoginAttempt'
    ) THEN
        -- Migrate existing failLoginAttempt values to syncStatus
        UPDATE "user"
        SET "syncStatus" = jsonb_build_object(
            'failLoginAttempt', COALESCE("failLoginAttempt", 0),
            'login_at', COALESCE("syncStatus"->>'login_at', NULL),
            'changePassword_count', COALESCE(("syncStatus"->>'changePassword_count')::int, 0)
        )
        WHERE "syncStatus" IS NULL
           OR "syncStatus"->>'failLoginAttempt' IS NULL
           OR ("syncStatus"->>'failLoginAttempt')::int != COALESCE("failLoginAttempt", 0);

        -- Get count of updated rows
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE '✅ Migrated % user(s) failLoginAttempt values to syncStatus', updated_count;

        -- For users that already have syncStatus, update failLoginAttempt if it differs
        UPDATE "user"
        SET "syncStatus" = jsonb_set(
            "syncStatus",
            '{failLoginAttempt}',
            to_jsonb(COALESCE("failLoginAttempt", 0))
        )
        WHERE "failLoginAttempt" IS NOT NULL
          AND ("syncStatus"->>'failLoginAttempt')::int != "failLoginAttempt";

        GET DIAGNOSTICS updated_count = ROW_COUNT;
        IF updated_count > 0 THEN
            RAISE NOTICE '✅ Updated % user(s) syncStatus.failLoginAttempt from existing column', updated_count;
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  failLoginAttempt column does not exist, skipping migration';
    END IF;
END $$;

-- Step 3: Ensure all users have syncStatus with all required fields
UPDATE "user"
SET "syncStatus" = jsonb_build_object(
    'failLoginAttempt', COALESCE(("syncStatus"->>'failLoginAttempt')::int, 0),
    'login_at', COALESCE("syncStatus"->>'login_at', NULL),
    'changePassword_count', COALESCE(("syncStatus"->>'changePassword_count')::int, 0)
)
WHERE "syncStatus" IS NULL
   OR "syncStatus"->>'failLoginAttempt' IS NULL
   OR "syncStatus"->>'changePassword_count' IS NULL;

-- Step 4: Create GIN index on syncStatus for JSON queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'user'
        AND indexname = 'idx_user_sync_status_gin'
    ) THEN
        CREATE INDEX idx_user_sync_status_gin
        ON "user" USING GIN ("syncStatus");

        RAISE NOTICE '✅ Created GIN index on syncStatus';
    ELSE
        RAISE NOTICE 'ℹ️  GIN index already exists, skipping';
    END IF;
END $$;

-- Step 5: Create BTREE index on syncStatus->>'failLoginAttempt' for lockout checks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'user'
        AND indexname = 'idx_user_sync_status_fail_login_attempt'
    ) THEN
        CREATE INDEX idx_user_sync_status_fail_login_attempt
        ON "user" USING BTREE (("syncStatus"->>'failLoginAttempt'));

        RAISE NOTICE '✅ Created BTREE index on syncStatus failLoginAttempt';
    ELSE
        RAISE NOTICE 'ℹ️  BTREE failLoginAttempt index already exists, skipping';
    END IF;
END $$;

-- Step 6: Drop failLoginAttempt column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'failLoginAttempt'
    ) THEN
        ALTER TABLE "user" DROP COLUMN "failLoginAttempt";
        RAISE NOTICE '✅ Dropped failLoginAttempt column';
    ELSE
        RAISE NOTICE 'ℹ️  failLoginAttempt column does not exist, skipping drop';
    END IF;
END $$;

\echo ''
\echo '✅ Migration completed successfully!'
\echo ''
\echo '📋 Migration Summary:'
\echo '   - Added syncStatus JSONB column to user table'
\echo '   - Migrated existing failLoginAttempt values to syncStatus'
\echo '   - Created GIN index on syncStatus for JSON queries'
\echo '   - Created BTREE index on syncStatus failLoginAttempt'
\echo '   - Dropped failLoginAttempt column'
\echo ''
