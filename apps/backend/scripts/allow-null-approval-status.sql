-- ============================================================================
-- Migration: Allow NULL values for approvalStatus column
-- ============================================================================
-- This script changes the approvalStatus column to allow NULL values
-- to support DRAFT state (null = DRAFT)
-- ============================================================================

\echo ''
\echo '📊 Updating approvalStatus column to allow NULL values...'
\echo ''

-- Change approvalStatus column to allow NULL
DO $$
BEGIN
    -- Check current constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'template'
        AND column_name = 'approvalStatus'
        AND is_nullable = 'NO'
    ) THEN
        -- Remove NOT NULL constraint and default
        ALTER TABLE template
        ALTER COLUMN "approvalStatus" DROP NOT NULL,
        ALTER COLUMN "approvalStatus" DROP DEFAULT;

        RAISE NOTICE '✅ Updated approvalStatus column to allow NULL values';
    ELSE
        RAISE NOTICE 'ℹ️  approvalStatus column already allows NULL values';
    END IF;
END $$;

\echo '   ✅ Migration completed'
\echo ''
