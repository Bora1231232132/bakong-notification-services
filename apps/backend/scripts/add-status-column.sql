-- ============================================================================
-- Migration: Add user_status_enum and status column to user table
-- ============================================================================
-- This script safely creates the enum and adds the status column
-- Handles cases where enum or column already exists
-- ============================================================================

-- Step 1: Check and create/update the enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
        -- Enum doesn't exist, create it
        CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'DEACTIVATED');
        RAISE NOTICE '✅ Created user_status_enum';
    ELSE
        -- Enum exists, check if it has the correct values
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'DEACTIVATED'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_status_enum')
        ) THEN
            -- Add missing enum value
            ALTER TYPE user_status_enum ADD VALUE 'DEACTIVATED';
            RAISE NOTICE '✅ Added DEACTIVATED to existing user_status_enum';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'ACTIVE'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_status_enum')
        ) THEN
            ALTER TYPE user_status_enum ADD VALUE 'ACTIVE';
            RAISE NOTICE '✅ Added ACTIVE to existing user_status_enum';
        END IF;

        RAISE NOTICE 'ℹ️  user_status_enum already exists with correct values';
    END IF;
END$$;

-- Step 2: Add status column to user table (handle existing column)
DO $$
BEGIN
    -- Check if column exists and what type it is
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'status'
    ) THEN
        -- Column doesn't exist, add it
        ALTER TABLE "user" ADD COLUMN status user_status_enum DEFAULT 'DEACTIVATED';
        CREATE INDEX IF NOT EXISTS "idx_user_status" ON "user"(status);
        RAISE NOTICE '✅ Added status column to user table';
    ELSE
        -- Column exists, check if it's the right type
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user'
            AND column_name = 'status'
            AND udt_name != 'user_status_enum'
        ) THEN
            -- Column exists but wrong type - need to convert
            RAISE NOTICE '⚠️  Column exists but with different type. Converting...';
            -- First, set default for existing rows if needed
            UPDATE "user" SET status = 'DEACTIVATED'::user_status_enum
            WHERE status IS NULL OR status::text NOT IN ('ACTIVE', 'DEACTIVATED');

            -- Convert column type
            ALTER TABLE "user"
            ALTER COLUMN status TYPE user_status_enum
            USING status::text::user_status_enum;

            RAISE NOTICE '✅ Converted status column to user_status_enum type';
        ELSE
            RAISE NOTICE 'ℹ️  user.status already exists with correct type';
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
