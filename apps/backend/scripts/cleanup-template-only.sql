-- ============================================
-- Cleanup Script: Delete all data from template table only
-- ============================================
-- This script deletes only template records
-- Category types remain unchanged
-- ============================================

-- ============================================
-- STEP 1: Show what will be deleted (for verification)
-- ============================================
DO $$
DECLARE
    template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count FROM template;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Data to be deleted:';
    RAISE NOTICE '  - Templates: % records', template_count;
    RAISE NOTICE '  (Category types will remain unchanged)';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 2: Delete all data from template table
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
-- STEP 3: Verify deletion
-- ============================================
DO $$
DECLARE
    remaining_templates INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_templates FROM template;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification:';
    RAISE NOTICE '  - Remaining Templates: %', remaining_templates;
    
    IF remaining_templates = 0 THEN
        RAISE NOTICE '✓ All template data deleted successfully!';
    ELSE
        RAISE WARNING '⚠ Some data still remains. Check for errors above.';
    END IF;
    RAISE NOTICE '========================================';
END $$;

