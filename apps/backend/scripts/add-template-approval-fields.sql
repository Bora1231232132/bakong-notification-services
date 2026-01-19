-- ============================================================================
-- Add Template Approval Fields Migration
-- ============================================================================
-- Adds approvalStatus, approvedBy, and approvedAt fields to template table
-- Sets default approvalStatus to 'APPROVED' for existing templates (backward compatibility)
--
-- Usage:
--   psql -U <username> -d <database> -f apps/backend/scripts/add-template-approval-fields.sql
--
-- Or via Docker:
--   docker exec -i <container-name> psql -U <username> -d <database> < apps/backend/scripts/add-template-approval-fields.sql
-- ============================================================================

\echo '🔄 Adding template approval fields...'
\echo ''

-- ============================================================================
-- Step 1: Create Approval Status Enum Type
-- ============================================================================
\echo '📝 Step 1: Creating approval_status_enum type...'

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_enum') THEN
        CREATE TYPE approval_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        RAISE NOTICE '✅ Created approval_status_enum';
    ELSE
        RAISE NOTICE 'ℹ️  approval_status_enum already exists';
    END IF;
END$$;

\echo '   ✅ Approval status enum ready'
\echo ''

-- ============================================================================
-- Step 2: Add Approval Fields to Template Table
-- ============================================================================
\echo '📊 Step 2: Adding approval fields to template table...'

-- Add approvalStatus column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'approvalStatus'
    ) THEN
        ALTER TABLE template 
        ADD COLUMN "approvalStatus" approval_status_enum NOT NULL DEFAULT 'APPROVED';
        RAISE NOTICE '✅ Added approvalStatus column';
    ELSE
        RAISE NOTICE 'ℹ️  approvalStatus column already exists';
    END IF;
END$$;

-- Add approvedBy column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'approvedBy'
    ) THEN
        ALTER TABLE template 
        ADD COLUMN "approvedBy" VARCHAR(255);
        RAISE NOTICE '✅ Added approvedBy column';
    ELSE
        RAISE NOTICE 'ℹ️  approvedBy column already exists';
    END IF;
END$$;

-- Add approvedAt column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'approvedAt'
    ) THEN
        ALTER TABLE template 
        ADD COLUMN "approvedAt" TIMESTAMPTZ;
        RAISE NOTICE '✅ Added approvedAt column';
    ELSE
        RAISE NOTICE 'ℹ️  approvedAt column already exists';
    END IF;
END$$;

\echo '   ✅ Approval fields added'
\echo ''

-- ============================================================================
-- Step 3: Set Default Approval Status for Existing Templates
-- ============================================================================
\echo '🔄 Step 3: Setting default approval status for existing templates...'

UPDATE template 
SET "approvalStatus" = 'APPROVED' 
WHERE "approvalStatus" IS NULL;

\echo '   ✅ Existing templates set to APPROVED'
\echo ''

\echo '✅ Migration completed successfully!'
\echo ''
