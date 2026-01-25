-- ============================================================================
-- Add EXPIRED to approval_status_enum Migration
-- ============================================================================
-- Adds 'EXPIRED' value to the approval_status_enum enum type
-- This allows templates to be marked as expired when their scheduled time has passed
--
-- Usage:
--   psql -U <username> -d <database> -f apps/backend/scripts/add-expired-to-approval-status-enum.sql
--
-- Or via Docker:
--   docker exec -i <container-name> psql -U <username> -d <database> < apps/backend/scripts/add-expired-to-approval-status-enum.sql
--
-- ⚠️  SAFE TO RUN WHILE APPLICATION IS RUNNING (Real-Time)
--    - Uses idempotent checks (safe to run multiple times)
--    - No table locks
-- ============================================================================

\echo '🔄 Adding EXPIRED to approval_status_enum...'
\echo '⚠️  This migration is safe to run while the application is running'
\echo ''

-- ============================================================================
-- Step 1: Add EXPIRED to approval_status_enum
-- ============================================================================
\echo '📝 Step 1: Adding EXPIRED to approval_status_enum...'

DO $$
BEGIN
    -- Check if enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_enum') THEN
        -- Check if EXPIRED already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'EXPIRED'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status_enum')
        ) THEN
            ALTER TYPE approval_status_enum ADD VALUE 'EXPIRED';
            RAISE NOTICE '✅ Added EXPIRED to approval_status_enum';
        ELSE
            RAISE NOTICE 'ℹ️  EXPIRED already exists in approval_status_enum';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  approval_status_enum does not exist. Please run add-template-approval-fields.sql first.';
    END IF;
END$$;

\echo '   ✅ Migration completed successfully!'
\echo ''
