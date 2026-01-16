-- ============================================================================
-- UserRole Enum Migration Script
-- ============================================================================
-- This script migrates the UserRole enum from old values to new values:
--   ADMIN_USER  → EDITOR
--   NORMAL_USER → VIEW_ONLY
--   API_USER    → EDITOR
--
-- Usage:
--   Option 1: Via psql command line:
--     psql -U <username> -d <database> -f apps/backend/scripts/migrate-user-role-enum.sql
--
--   Option 2: Via Docker:
--     docker exec -i <container-name> psql -U <username> -d <database> < apps/backend/scripts/migrate-user-role-enum.sql
--
--   Option 3: In GUI tools (pgAdmin, DBeaver, etc.):
--     Copy and paste the entire script into the query editor and execute
--
-- ⚠️  IMPORTANT: Ensure you have a backup before proceeding!
-- ============================================================================

-- ============================================================================
-- Step 1: Add new enum values
-- ============================================================================

DO $$
BEGIN
    -- Add new enum values if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'VIEW_ONLY'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
    ) THEN
        ALTER TYPE user_role_enum ADD VALUE 'VIEW_ONLY';
        RAISE NOTICE '✅ Added VIEW_ONLY to user_role_enum';
    ELSE
        RAISE NOTICE 'ℹ️  VIEW_ONLY already exists in user_role_enum';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'APPROVAL'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
    ) THEN
        ALTER TYPE user_role_enum ADD VALUE 'APPROVAL';
        RAISE NOTICE '✅ Added APPROVAL to user_role_enum';
    ELSE
        RAISE NOTICE 'ℹ️  APPROVAL already exists in user_role_enum';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'EDITOR'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
    ) THEN
        ALTER TYPE user_role_enum ADD VALUE 'EDITOR';
        RAISE NOTICE '✅ Added EDITOR to user_role_enum';
    ELSE
        RAISE NOTICE 'ℹ️  EDITOR already exists in user_role_enum';
    END IF;
END$$;

-- ============================================================================
-- Step 2: Migrate existing user data
-- ============================================================================

DO $$
DECLARE
    admin_count INTEGER;
    normal_count INTEGER;
    api_count INTEGER;
    total_updated INTEGER;
BEGIN
    -- Count users with old roles
    SELECT COUNT(*) INTO admin_count FROM "user" WHERE role = 'ADMIN_USER'::user_role_enum;
    SELECT COUNT(*) INTO normal_count FROM "user" WHERE role = 'NORMAL_USER'::user_role_enum;
    SELECT COUNT(*) INTO api_count FROM "user" WHERE role = 'API_USER'::user_role_enum;

    RAISE NOTICE '📊 Current user role distribution:';
    RAISE NOTICE '   ADMIN_USER:  % users', admin_count;
    RAISE NOTICE '   NORMAL_USER: % users', normal_count;
    RAISE NOTICE '   API_USER:    % users', api_count;

    -- Migrate ADMIN_USER → EDITOR
    IF admin_count > 0 THEN
        UPDATE "user"
        SET role = 'EDITOR'::user_role_enum
        WHERE role = 'ADMIN_USER'::user_role_enum;
        RAISE NOTICE '✅ Migrated % ADMIN_USER → EDITOR', admin_count;
    END IF;

    -- Migrate NORMAL_USER → VIEW_ONLY
    IF normal_count > 0 THEN
        UPDATE "user"
        SET role = 'VIEW_ONLY'::user_role_enum
        WHERE role = 'NORMAL_USER'::user_role_enum;
        RAISE NOTICE '✅ Migrated % NORMAL_USER → VIEW_ONLY', normal_count;
    END IF;

    -- Migrate API_USER → EDITOR
    IF api_count > 0 THEN
        UPDATE "user"
        SET role = 'EDITOR'::user_role_enum
        WHERE role = 'API_USER'::user_role_enum;
        RAISE NOTICE '✅ Migrated % API_USER → EDITOR', api_count;
    END IF;

    total_updated := admin_count + normal_count + api_count;
    RAISE NOTICE '✅ Total users migrated: %', total_updated;
END$$;

-- ============================================================================
-- Step 3: Update default value for user.role column
-- ============================================================================

DO $$
BEGIN
    -- Check current default
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user'
        AND column_name = 'role'
        AND column_default = '''NORMAL_USER''::user_role_enum'
    ) THEN
        ALTER TABLE "user" ALTER COLUMN role SET DEFAULT 'EDITOR'::user_role_enum;
        RAISE NOTICE '✅ Updated default value from NORMAL_USER to EDITOR';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user'
        AND column_name = 'role'
        AND column_default = '''VIEW_ONLY''::user_role_enum'
    ) THEN
        ALTER TABLE "user" ALTER COLUMN role SET DEFAULT 'EDITOR'::user_role_enum;
        RAISE NOTICE '✅ Updated default value from VIEW_ONLY to EDITOR';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user'
        AND column_name = 'role'
        AND column_default = '''EDITOR''::user_role_enum'
    ) THEN
        RAISE NOTICE 'ℹ️  Default value is already EDITOR';
    ELSE
        -- Set default if it doesn't exist
        ALTER TABLE "user" ALTER COLUMN role SET DEFAULT 'EDITOR'::user_role_enum;
        RAISE NOTICE '✅ Set default value to EDITOR';
    END IF;
END$$;

-- ============================================================================
-- Step 4: Verification
-- ============================================================================

DO $$
DECLARE
    editor_count INTEGER;
    view_only_count INTEGER;
    approval_count INTEGER;
    old_admin_count INTEGER;
    old_normal_count INTEGER;
    old_api_count INTEGER;
BEGIN
    -- Count new roles
    SELECT COUNT(*) INTO editor_count FROM "user" WHERE role = 'EDITOR'::user_role_enum;
    SELECT COUNT(*) INTO view_only_count FROM "user" WHERE role = 'VIEW_ONLY'::user_role_enum;
    SELECT COUNT(*) INTO approval_count FROM "user" WHERE role = 'APPROVAL'::user_role_enum;

    -- Count old roles (should be 0)
    SELECT COUNT(*) INTO old_admin_count FROM "user" WHERE role = 'ADMIN_USER'::user_role_enum;
    SELECT COUNT(*) INTO old_normal_count FROM "user" WHERE role = 'NORMAL_USER'::user_role_enum;
    SELECT COUNT(*) INTO old_api_count FROM "user" WHERE role = 'API_USER'::user_role_enum;

    RAISE NOTICE '📊 Migration verification:';
    RAISE NOTICE '   EDITOR:    % users', editor_count;
    RAISE NOTICE '   VIEW_ONLY: % users', view_only_count;
    RAISE NOTICE '   APPROVAL:  % users', approval_count;
    RAISE NOTICE '';
    RAISE NOTICE '   Old roles (should be 0):';
    RAISE NOTICE '   ADMIN_USER:  % users', old_admin_count;
    RAISE NOTICE '   NORMAL_USER: % users', old_normal_count;
    RAISE NOTICE '   API_USER:    % users', old_api_count;

    IF old_admin_count > 0 OR old_normal_count > 0 OR old_api_count > 0 THEN
        RAISE WARNING '⚠️  Some users still have old role values!';
    ELSE
        RAISE NOTICE '✅ All users migrated successfully!';
    END IF;
END$$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Note: Old enum values (ADMIN_USER, NORMAL_USER, API_USER) are still
-- present in the enum type but are no longer used. PostgreSQL does
-- not allow removing enum values, but they can be safely ignored.
-- ============================================================================
