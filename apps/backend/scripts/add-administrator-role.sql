-- ============================================================================
-- Add ADMINISTRATOR Role to UserRole Enum
-- ============================================================================
-- This script adds the ADMINISTRATOR role to the user_role_enum type.
-- ADMINISTRATOR is a super admin role with full access to all endpoints.
--
-- Usage:
--   Option 1: Via psql command line:
--     psql -U <username> -d <database> -f apps/backend/scripts/add-administrator-role.sql
--
--   Option 2: Via Docker:
--     docker exec -i <container-name> psql -U <username> -d <database> < apps/backend/scripts/add-administrator-role.sql
--
--   Option 3: In GUI tools (pgAdmin, DBeaver, etc.):
--     Copy and paste the entire script into the query editor and execute
--
-- ⚠️  IMPORTANT: Ensure you have a backup before proceeding!
-- ============================================================================

-- ============================================================================
-- Step 1: Add ADMINISTRATOR enum value
-- ============================================================================

DO $$
BEGIN
    -- Check if user_role_enum type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        RAISE EXCEPTION 'user_role_enum type does not exist. Please run the base migration first.';
    END IF;

    -- Add ADMINISTRATOR enum value if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'ADMINISTRATOR'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
    ) THEN
        ALTER TYPE user_role_enum ADD VALUE 'ADMINISTRATOR';
        RAISE NOTICE '✅ Added ADMINISTRATOR to user_role_enum';
    ELSE
        RAISE NOTICE 'ℹ️  ADMINISTRATOR already exists in user_role_enum';
    END IF;
END$$;

-- ============================================================================
-- Step 2: Verification
-- ============================================================================

DO $$
DECLARE
    administrator_exists BOOLEAN;
    enum_values TEXT[];
BEGIN
    -- Check if ADMINISTRATOR exists
    SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'ADMINISTRATOR'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
    ) INTO administrator_exists;

    -- Get all enum values for display
    SELECT array_agg(enumlabel ORDER BY enumsortorder)
    INTO enum_values
    FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum');

    RAISE NOTICE '📊 Verification results:';
    RAISE NOTICE '   ADMINISTRATOR exists: %', administrator_exists;
    RAISE NOTICE '   All user_role_enum values: %', array_to_string(enum_values, ', ');

    IF administrator_exists THEN
        RAISE NOTICE '✅ Migration completed successfully!';
    ELSE
        RAISE WARNING '⚠️  ADMINISTRATOR was not added. Please check for errors above.';
    END IF;
END$$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The ADMINISTRATOR role has been added to the user_role_enum type.
-- You can now assign this role to users who need full administrative access.
-- ============================================================================
