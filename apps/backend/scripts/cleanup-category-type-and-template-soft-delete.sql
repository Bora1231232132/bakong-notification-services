-- ============================================
-- Cleanup Script: Soft Delete all data from category_type and template tables
-- ============================================
-- This script performs SOFT DELETE (sets deletedAt timestamp)
-- Data is not permanently removed and can be recovered
-- ============================================

-- ============================================
-- STEP 1: Show what will be soft deleted (for verification)
-- ============================================
DO $$
DECLARE
    template_count INTEGER;
    category_type_count INTEGER;
    active_templates INTEGER;
    active_category_types INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count FROM template;
    SELECT COUNT(*) INTO category_type_count FROM category_type;
    SELECT COUNT(*) INTO active_templates FROM template WHERE "deletedAt" IS NULL;
    SELECT COUNT(*) INTO active_category_types FROM category_type WHERE "deletedAt" IS NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Data to be soft deleted:';
    RAISE NOTICE '  - Active Templates: % records', active_templates;
    RAISE NOTICE '  - Total Templates: % records', template_count;
    RAISE NOTICE '  - Active Category Types: % records', active_category_types;
    RAISE NOTICE '  - Total Category Types: % records', category_type_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 2: Soft delete all templates first
-- (Set deletedAt timestamp for all active records)
-- ============================================
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Soft delete: Set deletedAt timestamp for all active records
    UPDATE template
    SET "deletedAt" = NOW()
    WHERE "deletedAt" IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✓ Soft deleted % records from template table', updated_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✗ Error soft deleting from template: %', SQLERRM;
        RAISE;
END $$;

-- ============================================
-- STEP 3: Soft delete all category types
-- ============================================
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Soft delete: Set deletedAt timestamp for all active records
    UPDATE category_type
    SET "deletedAt" = NOW()
    WHERE "deletedAt" IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✓ Soft deleted % records from category_type table', updated_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✗ Error soft deleting from category_type: %', SQLERRM;
        RAISE;
END $$;

-- ============================================
-- STEP 4: Verify soft deletion
-- ============================================
DO $$
DECLARE
    active_templates INTEGER;
    active_category_types INTEGER;
    total_templates INTEGER;
    total_category_types INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_templates FROM template WHERE "deletedAt" IS NULL;
    SELECT COUNT(*) INTO active_category_types FROM category_type WHERE "deletedAt" IS NULL;
    SELECT COUNT(*) INTO total_templates FROM template;
    SELECT COUNT(*) INTO total_category_types FROM category_type;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification:';
    RAISE NOTICE '  - Active Templates: % (Total: %)', active_templates, total_templates;
    RAISE NOTICE '  - Active Category Types: % (Total: %)', active_category_types, total_category_types;
    
    IF active_templates = 0 AND active_category_types = 0 THEN
        RAISE NOTICE '✓ All active data soft deleted successfully!';
        RAISE NOTICE '  Note: Data can be recovered by setting deletedAt = NULL';
    ELSE
        RAISE WARNING '⚠ Some active data still remains. Check for errors above.';
    END IF;
    RAISE NOTICE '========================================';
END $$;

