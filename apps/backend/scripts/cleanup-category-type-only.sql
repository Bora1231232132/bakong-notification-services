-- ============================================
-- Cleanup Script: Delete all data from category_type table only
-- ============================================
-- This script deletes only category_type records
-- Templates will have their categoryTypeId set to NULL (if FK has ON DELETE SET NULL)
-- ============================================

-- ============================================
-- STEP 1: Show what will be deleted (for verification)
-- ============================================
DO $$
DECLARE
    category_type_count INTEGER;
    templates_using_category INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_type_count FROM category_type;
    SELECT COUNT(*) INTO templates_using_category 
    FROM template 
    WHERE "categoryTypeId" IS NOT NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Data to be deleted:';
    RAISE NOTICE '  - Category Types: % records', category_type_count;
    RAISE NOTICE '  - Templates using category types: % records', templates_using_category;
    RAISE NOTICE '  (Templates will have categoryTypeId set to NULL)';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 2: Delete all data from category_type table
-- ============================================
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Hard delete: Permanently remove all records
    DELETE FROM category_type;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE '✓ Deleted % records from category_type table', deleted_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✗ Error deleting from category_type: %', SQLERRM;
        RAISE;
END $$;

-- ============================================
-- STEP 3: Verify deletion and check templates
-- ============================================
DO $$
DECLARE
    remaining_category_types INTEGER;
    templates_with_null_category INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_category_types FROM category_type;
    SELECT COUNT(*) INTO templates_with_null_category 
    FROM template 
    WHERE "categoryTypeId" IS NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification:';
    RAISE NOTICE '  - Remaining Category Types: %', remaining_category_types;
    RAISE NOTICE '  - Templates with NULL categoryTypeId: %', templates_with_null_category;
    
    IF remaining_category_types = 0 THEN
        RAISE NOTICE '✓ All category_type data deleted successfully!';
    ELSE
        RAISE WARNING '⚠ Some data still remains. Check for errors above.';
    END IF;
    RAISE NOTICE '========================================';
END $$;

