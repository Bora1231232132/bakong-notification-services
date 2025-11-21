-- Migration script to add createdBy, updatedBy, publishedBy columns to template table
-- Run this before deploying the new code
-- Usage: psql -U <username> -d <database> -f apps/backend/scripts/add-template-audit-columns.sql

-- Add createdBy column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'createdBy'
    ) THEN
        ALTER TABLE template ADD COLUMN "createdBy" VARCHAR(255);
        RAISE NOTICE 'Added createdBy column to template table';
    ELSE
        RAISE NOTICE 'createdBy column already exists';
    END IF;
END$$;

-- Add updatedBy column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'updatedBy'
    ) THEN
        ALTER TABLE template ADD COLUMN "updatedBy" VARCHAR(255);
        RAISE NOTICE 'Added updatedBy column to template table';
    ELSE
        RAISE NOTICE 'updatedBy column already exists';
    END IF;
END$$;

-- Add publishedBy column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'publishedBy'
    ) THEN
        ALTER TABLE template ADD COLUMN "publishedBy" VARCHAR(255);
        RAISE NOTICE 'Added publishedBy column to template table';
    ELSE
        RAISE NOTICE 'publishedBy column already exists';
    END IF;
END$$;

-- Verify the changes
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Verifying template table columns...';
END$$;

SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'template' 
AND column_name IN ('createdBy', 'updatedBy', 'publishedBy')
ORDER BY column_name;

