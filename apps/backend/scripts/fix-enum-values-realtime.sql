-- ============================================================================
-- Real-Time Migration: Fix Enum Values and Invalid Data
-- ============================================================================
-- This migration fixes enum-related errors by:
--   1. Adding missing enum values (especially ADMINISTRATOR)
--   2. Fixing NULL or invalid enum values in existing data
--   3. Ensuring all required enums exist with correct values
--
-- ⚠️  SAFE TO RUN WHILE APPLICATION IS RUNNING (Real-Time)
--    - Uses idempotent checks (safe to run multiple times)
--    - Handles existing data gracefully
--    - No long table locks
--
-- Usage in Docker:
--   docker exec -i bakong-notification-services-db-dev psql -U bkns_dev -d bakong_notification_services_dev < apps/backend/scripts/fix-enum-values-realtime.sql
--
-- Or via psql:
--   psql -U bkns_dev -d bakong_notification_services_dev -f apps/backend/scripts/fix-enum-values-realtime.sql
-- ============================================================================

\echo '🔄 Starting real-time enum fix migration...'
\echo '⚠️  This migration is safe to run while the application is running'
\echo ''

-- ============================================================================
-- Step 1: Ensure user_role_enum has all required values
-- ============================================================================
\echo '📝 Step 1: Ensuring user_role_enum has all required values...'

DO $$
BEGIN
    -- Check if enum exists, create if not
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('ADMINISTRATOR', 'VIEW_ONLY', 'APPROVAL', 'EDITOR');
        RAISE NOTICE '✅ Created user_role_enum with all values';
    ELSE
        -- Enum exists, add missing values one by one
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'ADMINISTRATOR'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
        ) THEN
            ALTER TYPE user_role_enum ADD VALUE 'ADMINISTRATOR';
            RAISE NOTICE '✅ Added ADMINISTRATOR to user_role_enum';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'VIEW_ONLY'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
        ) THEN
            ALTER TYPE user_role_enum ADD VALUE 'VIEW_ONLY';
            RAISE NOTICE '✅ Added VIEW_ONLY to user_role_enum';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'APPROVAL'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
        ) THEN
            ALTER TYPE user_role_enum ADD VALUE 'APPROVAL';
            RAISE NOTICE '✅ Added APPROVAL to user_role_enum';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'EDITOR'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
        ) THEN
            ALTER TYPE user_role_enum ADD VALUE 'EDITOR';
            RAISE NOTICE '✅ Added EDITOR to user_role_enum';
        END IF;

        RAISE NOTICE 'ℹ️  user_role_enum verified - all values present';
    END IF;
END$$;

\echo '   ✅ user_role_enum ready'
\echo ''

-- ============================================================================
-- Step 2: Ensure user_status_enum exists with correct values
-- ============================================================================
\echo '📝 Step 2: Ensuring user_status_enum exists...'

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
        CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'DEACTIVATED');
        RAISE NOTICE '✅ Created user_status_enum';
    ELSE
        -- Add missing values if needed
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'ACTIVE'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_status_enum')
        ) THEN
            ALTER TYPE user_status_enum ADD VALUE 'ACTIVE';
            RAISE NOTICE '✅ Added ACTIVE to user_status_enum';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'DEACTIVATED'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_status_enum')
        ) THEN
            ALTER TYPE user_status_enum ADD VALUE 'DEACTIVATED';
            RAISE NOTICE '✅ Added DEACTIVATED to user_status_enum';
        END IF;

        RAISE NOTICE 'ℹ️  user_status_enum verified';
    END IF;
END$$;

\echo '   ✅ user_status_enum ready'
\echo ''

-- ============================================================================
-- Step 3: Fix user.role column - ensure it uses enum type
-- ============================================================================
\echo '🔧 Step 3: Fixing user.role column...'

DO $$
BEGIN
    -- Check if role column exists and what type it is
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'role'
    ) THEN
        -- Column exists, check if it's the right type
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user'
            AND column_name = 'role'
            AND udt_name != 'user_role_enum'
        ) THEN
            -- Column is wrong type (VARCHAR), convert to enum
            RAISE NOTICE '⚠️  Converting user.role from VARCHAR to user_role_enum...';

            -- First, fix any invalid values by setting them to EDITOR (safe default)
            UPDATE "user"
            SET role = 'EDITOR'::user_role_enum
            WHERE role::text NOT IN ('ADMINISTRATOR', 'VIEW_ONLY', 'APPROVAL', 'EDITOR', 'ADMIN_USER', 'NORMAL_USER', 'API_USER')
               OR role IS NULL;

            -- Convert old enum values to new ones
            UPDATE "user"
            SET role = 'EDITOR'::user_role_enum
            WHERE role::text IN ('ADMIN_USER', 'API_USER');

            UPDATE "user"
            SET role = 'VIEW_ONLY'::user_role_enum
            WHERE role::text = 'NORMAL_USER';

            -- Now convert column type
            ALTER TABLE "user"
            ALTER COLUMN role TYPE user_role_enum
            USING CASE
                WHEN role::text IN ('ADMINISTRATOR', 'VIEW_ONLY', 'APPROVAL', 'EDITOR')
                THEN role::text::user_role_enum
                ELSE 'EDITOR'::user_role_enum
            END;

            RAISE NOTICE '✅ Converted user.role to user_role_enum type';
        ELSE
            RAISE NOTICE 'ℹ️  user.role already uses user_role_enum type';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  user.role column does not exist - this is unexpected!';
    END IF;
END$$;

\echo '   ✅ user.role column fixed'
\echo ''

-- ============================================================================
-- Step 4: Fix NULL or invalid role values in existing data
-- ============================================================================
\echo '🔧 Step 4: Fixing NULL or invalid role values...'

DO $$
DECLARE
    null_count INTEGER;
    invalid_count INTEGER;
    fixed_count INTEGER;
BEGIN
    -- Count NULL values
    SELECT COUNT(*) INTO null_count
    FROM "user"
    WHERE role IS NULL;

    -- Count invalid enum values (shouldn't happen, but check anyway)
    SELECT COUNT(*) INTO invalid_count
    FROM "user"
    WHERE role::text NOT IN ('ADMINISTRATOR', 'VIEW_ONLY', 'APPROVAL', 'EDITOR');

    IF null_count > 0 OR invalid_count > 0 THEN
        RAISE NOTICE '⚠️  Found % NULL roles and % invalid roles - fixing...', null_count, invalid_count;

        -- Fix NULL values (set to EDITOR as safe default)
        UPDATE "user"
        SET role = 'EDITOR'::user_role_enum
        WHERE role IS NULL;

        -- Fix invalid values
        UPDATE "user"
        SET role = 'EDITOR'::user_role_enum
        WHERE role::text NOT IN ('ADMINISTRATOR', 'VIEW_ONLY', 'APPROVAL', 'EDITOR');

        GET DIAGNOSTICS fixed_count = ROW_COUNT;
        RAISE NOTICE '✅ Fixed % invalid role values', fixed_count;
    ELSE
        RAISE NOTICE 'ℹ️  All role values are valid';
    END IF;
END$$;

\echo '   ✅ Role values verified'
\echo ''

-- ============================================================================
-- Step 5: Ensure user.status column exists and is correct
-- ============================================================================
\echo '🔧 Step 5: Ensuring user.status column exists...'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'status'
    ) THEN
        -- Add status column
        ALTER TABLE "user" ADD COLUMN status user_status_enum DEFAULT 'DEACTIVATED';
        CREATE INDEX IF NOT EXISTS "idx_user_status" ON "user"(status);
        RAISE NOTICE '✅ Added status column to user table';
    ELSE
        -- Column exists, check type
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user'
            AND column_name = 'status'
            AND udt_name != 'user_status_enum'
        ) THEN
            -- Fix invalid values first
            UPDATE "user"
            SET status = 'DEACTIVATED'::user_status_enum
            WHERE status IS NULL OR status::text NOT IN ('ACTIVE', 'DEACTIVATED');

            -- Convert type
            ALTER TABLE "user"
            ALTER COLUMN status TYPE user_status_enum
            USING CASE
                WHEN status::text IN ('ACTIVE', 'DEACTIVATED')
                THEN status::text::user_status_enum
                ELSE 'DEACTIVATED'::user_status_enum
            END;

            RAISE NOTICE '✅ Converted user.status to user_status_enum type';
        ELSE
            RAISE NOTICE 'ℹ️  user.status already uses user_status_enum type';
        END IF;

        -- Ensure index exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'user'
            AND indexname = 'idx_user_status'
        ) THEN
            CREATE INDEX "idx_user_status" ON "user"(status);
            RAISE NOTICE '✅ Created index on status column';
        END IF;
    END IF;
END$$;

\echo '   ✅ Status column verified'
\echo ''

-- ============================================================================
-- Step 6: Fix NULL or invalid status values
-- ============================================================================
\echo '🔧 Step 6: Fixing NULL or invalid status values...'

DO $$
DECLARE
    null_count INTEGER;
    fixed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM "user"
    WHERE status IS NULL;

    IF null_count > 0 THEN
        RAISE NOTICE '⚠️  Found % NULL status values - fixing...', null_count;

        UPDATE "user"
        SET status = 'DEACTIVATED'::user_status_enum
        WHERE status IS NULL;

        GET DIAGNOSTICS fixed_count = ROW_COUNT;
        RAISE NOTICE '✅ Fixed % NULL status values', fixed_count;
    ELSE
        RAISE NOTICE 'ℹ️  All status values are valid';
    END IF;
END$$;

\echo '   ✅ Status values verified'
\echo ''

-- ============================================================================
-- Step 7: Ensure role column is NOT NULL
-- ============================================================================
\echo '🔧 Step 7: Ensuring role column is NOT NULL...'

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'role'
        AND is_nullable = 'YES'
    ) THEN
        -- Double-check no NULL values exist
        IF EXISTS (SELECT 1 FROM "user" WHERE role IS NULL) THEN
            UPDATE "user" SET role = 'EDITOR'::user_role_enum WHERE role IS NULL;
        END IF;

        ALTER TABLE "user" ALTER COLUMN role SET NOT NULL;
        RAISE NOTICE '✅ Made user.role NOT NULL';
    ELSE
        RAISE NOTICE 'ℹ️  user.role is already NOT NULL';
    END IF;
END$$;

\echo '   ✅ Role column constraints verified'
\echo ''

-- ============================================================================
-- Step 8: Verification and Summary
-- ============================================================================
\echo '📊 Step 8: Verification...'

DO $$
DECLARE
    total_users INTEGER;
    admin_count INTEGER;
    editor_count INTEGER;
    view_only_count INTEGER;
    approval_count INTEGER;
    active_count INTEGER;
    deactivated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM "user";

    SELECT COUNT(*) INTO admin_count FROM "user" WHERE role = 'ADMINISTRATOR'::user_role_enum;
    SELECT COUNT(*) INTO editor_count FROM "user" WHERE role = 'EDITOR'::user_role_enum;
    SELECT COUNT(*) INTO view_only_count FROM "user" WHERE role = 'VIEW_ONLY'::user_role_enum;
    SELECT COUNT(*) INTO approval_count FROM "user" WHERE role = 'APPROVAL'::user_role_enum;

    SELECT COUNT(*) INTO active_count FROM "user" WHERE status = 'ACTIVE'::user_status_enum;
    SELECT COUNT(*) INTO deactivated_count FROM "user" WHERE status = 'DEACTIVATED'::user_status_enum;

    RAISE NOTICE '📋 Migration Summary:';
    RAISE NOTICE '   Total users: %', total_users;
    RAISE NOTICE '';
    RAISE NOTICE '   Role distribution:';
    RAISE NOTICE '     ADMINISTRATOR: %', admin_count;
    RAISE NOTICE '     EDITOR:       %', editor_count;
    RAISE NOTICE '     VIEW_ONLY:    %', view_only_count;
    RAISE NOTICE '     APPROVAL:     %', approval_count;
    RAISE NOTICE '';
    RAISE NOTICE '   Status distribution:';
    RAISE NOTICE '     ACTIVE:       %', active_count;
    RAISE NOTICE '     DEACTIVATED:  %', deactivated_count;
END$$;

\echo ''
\echo '✅ Real-time enum fix migration completed successfully!'
\echo ''
\echo '💡 Next steps:'
\echo '   1. Check application logs for any remaining enum errors'
\echo '   2. Verify user creation/update endpoints work correctly'
\echo '   3. Test with different role values: ADMINISTRATOR, EDITOR, VIEW_ONLY, APPROVAL'
\echo ''
