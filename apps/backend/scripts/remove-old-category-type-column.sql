-- Script to remove old 'category_type' column from template table
-- Use this if you only want to remove the old column without adding the new one

-- Step 1: Check if old column exists
SELECT
    'Checking for old category_type column' AS action,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'template'
    AND column_name = 'category_type';

-- Step 2: Remove foreign key constraint if it references the old column
DO $$
BEGIN
    -- Drop any foreign key constraints that might reference category_type
    ALTER TABLE template
    DROP CONSTRAINT IF EXISTS fk_template_category_type_old;
    
    RAISE NOTICE 'Dropped old foreign key constraints (if any)';
END $$;

-- Step 3: Remove the old column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'template'
        AND column_name = 'category_type'
    ) THEN
        ALTER TABLE template
        DROP COLUMN category_type;
        
        RAISE NOTICE '✓ Removed old category_type column';
    ELSE
        RAISE NOTICE '✓ No category_type column found (nothing to remove)';
    END IF;
END $$;

-- Step 4: Verify removal
SELECT
    'Verification' AS action,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'template'
            AND column_name = 'category_type'
        ) THEN '❌ Column still exists'
        ELSE '✓ Column removed successfully'
    END AS status;

