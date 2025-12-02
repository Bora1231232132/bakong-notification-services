-- ============================================
-- Cleanup Script: Delete all data from category_type and template tables
-- ============================================
-- WARNING: This script will PERMANENTLY DELETE all data from these tables!
-- Make sure you have a backup before running this script.
-- ============================================

-- ============================================
-- STEP 1: Show what will be deleted (for verification)
-- ============================================
DO $$
DECLARE
    template_count INTEGER;
    category_type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count FROM template;
    SELECT COUNT(*) INTO category_type_count FROM category_type;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Data to be deleted:';
    RAISE NOTICE '  - Templates: % records', template_count;
    RAISE NOTICE '  - Category Types: % records', category_type_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 2: Delete all data from template table first
-- (Must delete templates first due to foreign key constraint)
-- ============================================
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Hard delete: Permanently remove all records
    DELETE FROM template;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE '✓ Deleted % records from template table', deleted_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✗ Error deleting from template: %', SQLERRM;
        RAISE;
END $$;

-- ============================================
-- STEP 3: Delete all data from category_type table
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
-- STEP 4: Verify deletion
-- ============================================
DO $$
DECLARE
    remaining_templates INTEGER;
    remaining_category_types INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_templates FROM template;
    SELECT COUNT(*) INTO remaining_category_types FROM category_type;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification:';
    RAISE NOTICE '  - Remaining Templates: %', remaining_templates;
    RAISE NOTICE '  - Remaining Category Types: %', remaining_category_types;
    
    IF remaining_templates = 0 AND remaining_category_types = 0 THEN
        RAISE NOTICE '✓ All data deleted successfully!';
    ELSE
        RAISE WARNING '⚠ Some data still remains. Check for errors above.';
    END IF;
    RAISE NOTICE '========================================';
END $$;

