-- Migration script to add bakongPlatform column to bakong_user table
-- Run this before deploying the new code
-- Usage: psql -U <username> -d <database> -f apps/backend/scripts/add-bakong-platform-to-bakong-user.sql

-- Create enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bakong_platform_enum') THEN
        CREATE TYPE bakong_platform_enum AS ENUM ('BAKONG', 'BAKONG_TOURIST', 'BAKONG_JUNIOR');
        RAISE NOTICE 'Created bakong_platform_enum type';
    ELSE
        RAISE NOTICE 'bakong_platform_enum type already exists';
    END IF;
END$$;

-- Add column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bakong_user' 
        AND column_name = 'bakongPlatform'
    ) THEN
        ALTER TABLE bakong_user ADD COLUMN "bakongPlatform" bakong_platform_enum;
        RAISE NOTICE 'Added bakongPlatform column to bakong_user table';
    ELSE
        RAISE NOTICE 'bakongPlatform column already exists';
    END IF;
END$$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS "IDX_bakong_user_bakongPlatform" ON bakong_user("bakongPlatform");

-- Verify the changes
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Verifying bakongPlatform column...';
END$$;

SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'bakong_user' 
AND column_name = 'bakongPlatform';

