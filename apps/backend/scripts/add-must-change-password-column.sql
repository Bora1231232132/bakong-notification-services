-- ============================================================================
-- Migration: Add mustChangePassword column to user table
-- ============================================================================
-- This script adds the mustChangePassword boolean column to track if a user
-- needs to change their default password on first login
-- ============================================================================

\echo ''
\echo '📊 Adding mustChangePassword column to user table...'
\echo ''

-- Step 1: Add mustChangePassword column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'mustChangePassword'
    ) THEN
        -- Add mustChangePassword column with default value true
        ALTER TABLE "user"
        ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

        RAISE NOTICE '✅ Added mustChangePassword column to user table';
    ELSE
        RAISE NOTICE 'ℹ️  mustChangePassword column already exists, skipping';
    END IF;
END $$;

-- Step 2: Update existing users to set mustChangePassword = false
-- (assuming existing users have already changed their passwords)
UPDATE "user"
SET "mustChangePassword" = false
WHERE "mustChangePassword" = true
  AND "deletedAt" IS NULL;

\echo ''
\echo '✅ Migration completed successfully!'
\echo ''
\echo '📋 Migration Summary:'
\echo '   - Added mustChangePassword boolean column to user table'
\echo '   - Set default value to true for new users'
\echo '   - Updated existing users to mustChangePassword = false'
\echo ''
