-- ============================================================================
-- Recreate user_role_enum with Clean Values
-- ============================================================================
-- This script:
--   1. Temporarily converts user.role to TEXT
--   2. Drops the old user_role_enum type
--   3. Creates a new user_role_enum with only: ADMINISTRATOR, EDITOR, APPROVAL, VIEW_ONLY
--   4. Converts user.role back to enum type
--   5. Migrates old values to new ones
--
-- Usage:
--   Option 1: Via psql command line:
--     psql -U <username> -d <database> -f apps/backend/scripts/recreate-user-role-enum.sql
--
--   Option 2: Via Docker:
--     docker exec -i bakong-notification-services-db-dev psql -U bkns_dev -d bakong_notification_services_dev < apps/backend/scripts/recreate-user-role-enum.sql
--
--   Option 3: In GUI tools (pgAdmin, DBeaver, etc.):
--     Copy and paste the entire script into the query editor and execute
--
-- ⚠️  IMPORTANT: Ensure you have a backup before proceeding!
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Convert user.role column to TEXT temporarily
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'role'
        AND udt_name = 'user_role_enum'
    ) THEN
        -- Convert enum to text
        ALTER TABLE "user"
        ALTER COLUMN role TYPE TEXT USING role::text;

        RAISE NOTICE '✅ Converted user.role from enum to TEXT';
    ELSE
        RAISE NOTICE 'ℹ️  user.role is already TEXT or does not exist';
    END IF;
END$$;

-- ============================================================================
-- Step 2: Drop the old enum type (if it exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        DROP TYPE user_role_enum CASCADE;
        RAISE NOTICE '✅ Dropped old user_role_enum type';
    ELSE
        RAISE NOTICE 'ℹ️  user_role_enum type does not exist';
    END IF;
END$$;

-- ============================================================================
-- Step 3: Create new enum type with clean values
-- ============================================================================

CREATE TYPE user_role_enum AS ENUM (
    'ADMINISTRATOR',
    'EDITOR',
    'APPROVAL',
    'VIEW_ONLY'
);

DO $$
BEGIN
    RAISE NOTICE '✅ Created new user_role_enum with values: ADMINISTRATOR, EDITOR, APPROVAL, VIEW_ONLY';
END$$;

-- ============================================================================
-- Step 4: Migrate old role values to new ones
-- ============================================================================

DO $$
DECLARE
    admin_count INTEGER;
    normal_count INTEGER;
    api_count INTEGER;
    editor_count INTEGER;
    view_only_count INTEGER;
    approval_count INTEGER;
    administrator_count INTEGER;
    invalid_count INTEGER;
BEGIN
    -- Count old values
    SELECT COUNT(*) INTO admin_count FROM "user" WHERE role = 'ADMIN_USER';
    SELECT COUNT(*) INTO normal_count FROM "user" WHERE role = 'NORMAL_USER';
    SELECT COUNT(*) INTO api_count FROM "user" WHERE role = 'API_USER';

    -- Count new values (if any already exist)
    SELECT COUNT(*) INTO editor_count FROM "user" WHERE role = 'EDITOR';
    SELECT COUNT(*) INTO view_only_count FROM "user" WHERE role = 'VIEW_ONLY';
    SELECT COUNT(*) INTO approval_count FROM "user" WHERE role = 'APPROVAL';
    SELECT COUNT(*) INTO administrator_count FROM "user" WHERE role = 'ADMINISTRATOR';

    -- Count invalid values
    SELECT COUNT(*) INTO invalid_count
    FROM "user"
    WHERE role IS NULL
       OR role NOT IN ('ADMIN_USER', 'NORMAL_USER', 'API_USER', 'ADMINISTRATOR', 'EDITOR', 'APPROVAL', 'VIEW_ONLY');

    RAISE NOTICE '📊 Migration statistics:';
    RAISE NOTICE '   ADMIN_USER: % → will become EDITOR', admin_count;
    RAISE NOTICE '   NORMAL_USER: % → will become VIEW_ONLY', normal_count;
    RAISE NOTICE '   API_USER: % → will become EDITOR', api_count;
    RAISE NOTICE '   Invalid/NULL: % → will become EDITOR', invalid_count;
    RAISE NOTICE '   Already correct: ADMINISTRATOR=%, EDITOR=%, APPROVAL=%, VIEW_ONLY=%',
        administrator_count, editor_count, approval_count, view_only_count;

    -- Migrate old values to new ones
    UPDATE "user"
    SET role = 'EDITOR'
    WHERE role IN ('ADMIN_USER', 'API_USER');

    UPDATE "user"
    SET role = 'VIEW_ONLY'
    WHERE role = 'NORMAL_USER';

    -- Fix NULL or invalid values
    UPDATE "user"
    SET role = 'EDITOR'
    WHERE role IS NULL
       OR role NOT IN ('ADMINISTRATOR', 'EDITOR', 'APPROVAL', 'VIEW_ONLY');

    RAISE NOTICE '✅ Migrated all role values';
END$$;

-- ============================================================================
-- Step 5: Convert user.role column back to enum type
-- ============================================================================

DO $$
BEGIN
    ALTER TABLE "user"
    ALTER COLUMN role TYPE user_role_enum
    USING CASE
        WHEN role = 'ADMINISTRATOR' THEN 'ADMINISTRATOR'::user_role_enum
        WHEN role = 'EDITOR' THEN 'EDITOR'::user_role_enum
        WHEN role = 'APPROVAL' THEN 'APPROVAL'::user_role_enum
        WHEN role = 'VIEW_ONLY' THEN 'VIEW_ONLY'::user_role_enum
        ELSE 'EDITOR'::user_role_enum  -- Fallback to EDITOR for any unexpected values
    END;

    RAISE NOTICE '✅ Converted user.role back to user_role_enum type';
END$$;

-- ============================================================================
-- Step 6: Set default value
-- ============================================================================

ALTER TABLE "user"
ALTER COLUMN role SET DEFAULT 'EDITOR'::user_role_enum;

DO $$
BEGIN
    RAISE NOTICE '✅ Set default role to EDITOR';
END$$;

-- ============================================================================
-- Step 7: Make role column NOT NULL (if it isn't already)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'role'
        AND is_nullable = 'YES'
    ) THEN
        -- First, ensure no NULL values exist
        UPDATE "user" SET role = 'EDITOR'::user_role_enum WHERE role IS NULL;

        ALTER TABLE "user"
        ALTER COLUMN role SET NOT NULL;

        RAISE NOTICE '✅ Set role column to NOT NULL';
    ELSE
        RAISE NOTICE 'ℹ️  role column is already NOT NULL';
    END IF;
END$$;

-- ============================================================================
-- Step 8: Verification
-- ============================================================================

DO $$
DECLARE
    enum_values TEXT[];
    admin_count INTEGER;
    editor_count INTEGER;
    approval_count INTEGER;
    view_only_count INTEGER;
    total_users INTEGER;
BEGIN
    -- Get all enum values
    SELECT array_agg(enumlabel ORDER BY enumsortorder)
    INTO enum_values
    FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum');

    -- Count users by role
    SELECT COUNT(*) INTO total_users FROM "user";
    SELECT COUNT(*) INTO admin_count FROM "user" WHERE role = 'ADMINISTRATOR'::user_role_enum;
    SELECT COUNT(*) INTO editor_count FROM "user" WHERE role = 'EDITOR'::user_role_enum;
    SELECT COUNT(*) INTO approval_count FROM "user" WHERE role = 'APPROVAL'::user_role_enum;
    SELECT COUNT(*) INTO view_only_count FROM "user" WHERE role = 'VIEW_ONLY'::user_role_enum;

    RAISE NOTICE '';
    RAISE NOTICE '📊 Verification Results:';
    RAISE NOTICE '   ✅ Enum values: %', array_to_string(enum_values, ', ');
    RAISE NOTICE '   ✅ Total users: %', total_users;
    RAISE NOTICE '   ✅ ADMINISTRATOR: %', admin_count;
    RAISE NOTICE '   ✅ EDITOR: %', editor_count;
    RAISE NOTICE '   ✅ APPROVAL: %', approval_count;
    RAISE NOTICE '   ✅ VIEW_ONLY: %', view_only_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration completed successfully!';
END$$;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The user_role_enum has been recreated with only these values:
--   - ADMINISTRATOR
--   - EDITOR
--   - APPROVAL
--   - VIEW_ONLY
--
-- All old role values have been migrated:
--   - ADMIN_USER → EDITOR
--   - NORMAL_USER → VIEW_ONLY
--   - API_USER → EDITOR
-- ============================================================================
