-- ============================================================================
-- Migration: Add reasonForRejection column to template table
-- ============================================================================
-- This script adds the reasonForRejection column to store rejection reasons
-- when an approver rejects a notification template
-- ============================================================================

\echo ''
\echo '📊 Adding reasonForRejection column to template table...'
\echo ''

-- Add reasonForRejection column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'template'
        AND column_name = 'reasonForRejection'
    ) THEN
        ALTER TABLE template
        ADD COLUMN "reasonForRejection" TEXT;

        RAISE NOTICE '✅ Added reasonForRejection column to template table';
    ELSE
        RAISE NOTICE 'ℹ️  reasonForRejection column already exists, skipping';
    END IF;
END $$;

\echo '   ✅ Migration completed'
\echo ''
