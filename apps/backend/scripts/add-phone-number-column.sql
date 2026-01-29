-- ============================================================================
-- Migration: Add phoneNumber column to user table
-- ============================================================================
-- This script adds the phoneNumber column to the user table, positioned
-- after the role column. It's safe to run multiple times (idempotent).
--
-- Usage (Windows PowerShell):
--   Get-Content apps\backend\scripts\add-phone-number-column.sql | docker exec -i bakong-notification-services-db-dev psql -U bkns_dev -d bakong_notification_services_dev
--
-- Or via direct psql:
--   psql -h localhost -p 5437 -U bkns_dev -d bakong_notification_services_dev -f apps\backend\scripts\add-phone-number-column.sql
-- ============================================================================

\echo '🔄 Adding phoneNumber column to user table...'
\echo ''

-- Add phoneNumber column to user table (after role column)
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'phoneNumber'
    ) THEN
        -- Add column as nullable first
        ALTER TABLE "user" ADD COLUMN "phoneNumber" VARCHAR(20) NULL;
        RAISE NOTICE '✅ Added phoneNumber column to user table';

        -- Check for existing users without phone numbers
        SELECT COUNT(*) INTO null_count FROM "user" WHERE "phoneNumber" IS NULL;

        IF null_count > 0 THEN
            RAISE NOTICE '⚠️  Found % existing users without phoneNumber', null_count;
            RAISE NOTICE '   Setting placeholder value for existing records...';
            -- Set a placeholder value for existing records
            UPDATE "user" SET "phoneNumber" = '0000000000' WHERE "phoneNumber" IS NULL;
            RAISE NOTICE '   ✅ Updated existing users with placeholder phone number';
        END IF;

        -- Make it NOT NULL to match entity definition
        ALTER TABLE "user" ALTER COLUMN "phoneNumber" SET NOT NULL;
        RAISE NOTICE '✅ Made phoneNumber NOT NULL';
    ELSE
        -- Column exists, check if it needs to be made NOT NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user'
            AND column_name = 'phoneNumber'
            AND is_nullable = 'YES'
        ) THEN
            -- Handle existing NULL values
            SELECT COUNT(*) INTO null_count FROM "user" WHERE "phoneNumber" IS NULL;
            IF null_count > 0 THEN
                UPDATE "user" SET "phoneNumber" = '0000000000' WHERE "phoneNumber" IS NULL;
                RAISE NOTICE '✅ Updated % existing users with placeholder phone number', null_count;
            END IF;

            ALTER TABLE "user" ALTER COLUMN "phoneNumber" SET NOT NULL;
            RAISE NOTICE '✅ Made phoneNumber NOT NULL';
        ELSE
            RAISE NOTICE 'ℹ️  user.phoneNumber already exists and is NOT NULL';
        END IF;
    END IF;
END$$;

\echo ''
\echo '✅ Migration completed successfully!'
\echo ''
\echo '📋 Verification:'
\echo '   Run this query to verify:'
\echo '   SELECT column_name, data_type, character_maximum_length, is_nullable'
\echo '   FROM information_schema.columns'
\echo '   WHERE table_name = ''user'' AND column_name = ''phoneNumber'';'
\echo ''
