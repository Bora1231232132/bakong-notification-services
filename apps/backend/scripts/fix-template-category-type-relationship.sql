-- Migration script to fix template table category type relationship
-- This script:
-- 1. Removes any old 'category_type' column if it exists
-- 2. Ensures 'categoryTypeId' column exists (foreign key to category_type.id)
-- 3. Adds foreign key constraint

-- ============================================
-- STEP 1: Remove old 'category_type' column if it exists
-- ============================================
DO $$
BEGIN
    -- Check if old 'category_type' column exists (wrong column name)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'template'
        AND column_name = 'category_type'
    ) THEN
        -- Drop any foreign key constraint that might reference it
        ALTER TABLE template
        DROP CONSTRAINT IF EXISTS fk_template_category_type_old;
        
        -- Remove the old column
        ALTER TABLE template
        DROP COLUMN IF EXISTS category_type;
        
        RAISE NOTICE '✓ Removed old category_type column';
    ELSE
        RAISE NOTICE '✓ No old category_type column found';
    END IF;
END $$;

-- ============================================
-- STEP 2: Ensure categoryTypeId column exists
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'template'
        AND column_name = 'categoryTypeId'
    ) THEN
        ALTER TABLE template
        ADD COLUMN "categoryTypeId" INTEGER NULL;
        
        RAISE NOTICE '✓ Column categoryTypeId added to template table';
    ELSE
        RAISE NOTICE '✓ Column categoryTypeId already exists';
    END IF;
END $$;

-- ============================================
-- STEP 3: Remove old foreign key constraint if exists (to recreate properly)
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_template_category_type'
        AND table_name = 'template'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE template
        DROP CONSTRAINT fk_template_category_type;
        
        RAISE NOTICE '✓ Removed old foreign key constraint (will recreate)';
    END IF;
END $$;

-- ============================================
-- STEP 4: Add foreign key constraint (categoryTypeId → category_type.id)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_template_category_type'
        AND table_name = 'template'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE template
        ADD CONSTRAINT fk_template_category_type
        FOREIGN KEY ("categoryTypeId")
        REFERENCES category_type(id)
        ON DELETE SET NULL;
        
        RAISE NOTICE '✓ Foreign key constraint created: template.categoryTypeId → category_type.id';
    ELSE
        RAISE NOTICE '✓ Foreign key constraint already exists';
    END IF;
END $$;

-- ============================================
-- STEP 5: Verify the migration
-- ============================================
-- Check all columns in template table (to see what exists)
SELECT
    'Template Table Columns' AS check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'template'
    AND column_name IN ('categoryTypeId', 'category_type')
ORDER BY column_name;

-- Verify foreign key constraint
SELECT
    'Foreign Key Relationship' AS check_type,
    tc.constraint_name,
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    rc.delete_rule,
    CASE
        WHEN rc.delete_rule = 'SET NULL' THEN '✓ Correct: Will set NULL when category_type is deleted'
        ELSE '⚠ Warning: Delete rule is ' || rc.delete_rule
    END AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'template'
    AND kcu.column_name = 'categoryTypeId';

-- ============================================
-- STEP 6: Check for orphaned data
-- ============================================
SELECT
    'Orphaned Data Check' AS check_type,
    COUNT(*) AS orphaned_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ No orphaned data'
        ELSE '⚠ Found ' || COUNT(*) || ' templates with invalid categoryTypeId'
    END AS status
FROM template t
WHERE t."categoryTypeId" IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM category_type ct
        WHERE ct.id = t."categoryTypeId"
    );

-- If orphaned_count > 0, fix with:
-- UPDATE template SET "categoryTypeId" = NULL 
-- WHERE "categoryTypeId" NOT IN (SELECT id FROM category_type);

-- ============================================
-- Summary
-- ============================================
SELECT
    'Migration Summary' AS summary,
    '✓ Old category_type column removed (if existed)' AS step1,
    '✓ categoryTypeId column exists' AS step2,
    '✓ Foreign key: template.categoryTypeId → category_type.id' AS step3,
    '✓ ON DELETE SET NULL configured' AS step4;

