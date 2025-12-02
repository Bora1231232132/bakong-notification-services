-- Migration script to add categoryTypeId column to template table
-- This column is required for the foreign key relationship with category_type table

-- Step 1: Check if column already exists
DO $$
BEGIN
    -- Check if the categoryTypeId column already exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'template'
        AND column_name = 'categoryTypeId'
    ) THEN
        -- Add the categoryTypeId column
        ALTER TABLE template
        ADD COLUMN "categoryTypeId" INTEGER NULL;
        
        RAISE NOTICE 'Column categoryTypeId added successfully to template table';
    ELSE
        RAISE NOTICE 'Column categoryTypeId already exists in template table';
    END IF;
END $$;

-- Step 2: Verify the column was created
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'template'
    AND column_name = 'categoryTypeId';

-- Expected result:
-- column_name: categoryTypeId
-- data_type: integer
-- is_nullable: YES
-- column_default: NULL

-- Step 3: Check current template records (optional - for reference)
SELECT
    id,
    "notificationType",
    "categoryTypeId",
    "createdAt"
FROM template
ORDER BY id
LIMIT 10;

