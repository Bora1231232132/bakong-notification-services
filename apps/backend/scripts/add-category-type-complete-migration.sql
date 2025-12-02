-- Complete migration script: Add categoryTypeId column + Foreign Key constraint
-- Run this script to set up the complete category type relationship

-- ============================================
-- STEP 1: Add categoryTypeId column to template table
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
-- STEP 2: Add foreign key constraint
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
        
        RAISE NOTICE '✓ Foreign key constraint fk_template_category_type created';
    ELSE
        RAISE NOTICE '✓ Foreign key constraint fk_template_category_type already exists';
    END IF;
END $$;

-- ============================================
-- STEP 3: Verify the migration
-- ============================================
-- Verify column exists
SELECT
    'Column Check' AS check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'template'
    AND column_name = 'categoryTypeId';

-- Verify foreign key constraint
SELECT
    'Foreign Key Check' AS check_type,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
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
-- STEP 4: Check for orphaned data (optional)
-- ============================================
SELECT
    'Orphaned Data Check' AS check_type,
    COUNT(*) AS orphaned_count
FROM template t
WHERE t."categoryTypeId" IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM category_type ct
        WHERE ct.id = t."categoryTypeId"
    );

-- If orphaned_count > 0, you have templates with invalid categoryTypeId values
-- You can fix them with: UPDATE template SET "categoryTypeId" = NULL WHERE ...

-- Migration completed! Check the results above.

