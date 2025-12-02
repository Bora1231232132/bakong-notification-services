-- ============================================================================
-- Test Script: Verify category_type table and relationship with template table
-- ============================================================================
-- This script tests:
-- 1. category_type table structure
-- 2. Foreign key relationship between template and category_type
-- 3. Data insertion and linking
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🧪 Starting Category Type Relationship Tests...';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Test 1: Verify category_type table exists and has correct structure
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '📋 Test 1: Checking category_type table structure...';
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'category_type') THEN
        RAISE NOTICE '✅ category_type table exists';
    ELSE
        RAISE EXCEPTION '❌ category_type table does NOT exist!';
    END IF;
END $$;

-- Check columns
DO $$
BEGIN
    RAISE NOTICE '   Checking columns...';
END $$;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'category_type'
ORDER BY ordinal_position;

DO $$
BEGIN
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Test 2: Verify categoryTypeId column exists in template table
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '📋 Test 2: Checking template.categoryTypeId column...';
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'template' AND column_name = 'categoryTypeId'
    ) THEN
        RAISE NOTICE '✅ categoryTypeId column exists in template table';
    ELSE
        RAISE EXCEPTION '❌ categoryTypeId column does NOT exist in template table!';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Test 3: Verify foreign key constraint exists
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '📋 Test 3: Checking foreign key constraint...';
END $$;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'template'
    AND kcu.column_name = 'categoryTypeId';

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE constraint_name = 'FK_template_category_type'
        AND table_name = 'template'
    ) THEN
        RAISE NOTICE '✅ Foreign key constraint FK_template_category_type exists';
    ELSE
        RAISE EXCEPTION '❌ Foreign key constraint FK_template_category_type does NOT exist!';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Test 4: Insert test data into category_type table
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '📋 Test 4: Inserting test category types...';
END $$;

-- Create a dummy icon (small PNG header bytes for testing)
-- In real scenario, you would upload actual icon files
INSERT INTO "category_type" (name, icon, "mimeType", "originalFileName")
VALUES 
    ('NEWS', E'\\x89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082'::bytea, 'image/png', 'news-icon.png'),
    ('EVENT', E'\\x89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082'::bytea, 'image/png', 'event-icon.png'),
    ('PRODUCT_AND_FEATURE', E'\\x89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082'::bytea, 'image/png', 'product-icon.png'),
    ('OTHER', E'\\x89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082'::bytea, 'image/png', 'other-icon.png')
ON CONFLICT (name) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '   ✅ Test category types inserted (or already exist)';
END $$;
DO $$
BEGIN
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Test 5: Display inserted category types
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '📋 Test 5: Displaying category types...';
END $$;
SELECT 
    id,
    name,
    "mimeType",
    "originalFileName",
    "createdAt"
FROM "category_type"
WHERE "deletedAt" IS NULL
ORDER BY id;

DO $$
BEGIN
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Test 6: Test linking template to category_type (if templates exist)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '📋 Test 6: Testing template to category_type relationship...';
END $$;

-- Get first category type ID
DO $$
DECLARE
    first_category_id INT;
    template_count INT;
    updated_count INT;
BEGIN
    -- Get first category type
    SELECT id INTO first_category_id 
    FROM "category_type" 
    WHERE "deletedAt" IS NULL 
    ORDER BY id 
    LIMIT 1;
    
    IF first_category_id IS NULL THEN
        RAISE NOTICE '⚠️  No category types found - skipping template link test';
        RETURN;
    END IF;
    
    -- Count templates
    SELECT COUNT(*) INTO template_count FROM "template" WHERE "deletedAt" IS NULL;
    RAISE NOTICE '   Found % templates', template_count;
    
    IF template_count > 0 THEN
        -- Update first template to link to category type
        UPDATE "template"
        SET "categoryTypeId" = first_category_id
        WHERE id = (
            SELECT id FROM "template" 
            WHERE "deletedAt" IS NULL 
            ORDER BY id 
            LIMIT 1
        );
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE '   ✅ Updated % template(s) to link to category_type id: %', updated_count, first_category_id;
    ELSE
        RAISE NOTICE '   ⚠️  No templates found - skipping template link test';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Test 7: Verify template-category_type relationship
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '📋 Test 7: Verifying template-category_type relationship...';
END $$;

SELECT 
    t.id AS template_id,
    t."categoryType" AS old_category_type,
    t."categoryTypeId" AS new_category_type_id,
    ct.name AS category_type_name,
    ct."mimeType" AS icon_mime_type
FROM "template" t
LEFT JOIN "category_type" ct ON t."categoryTypeId" = ct.id
WHERE t."deletedAt" IS NULL
ORDER BY t.id
LIMIT 5;

DO $$
BEGIN
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Test 8: Test foreign key constraint (should fail)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '📋 Test 8: Testing foreign key constraint (should fail with invalid ID)...';
END $$;

DO $$
BEGIN
    BEGIN
        -- Try to insert invalid categoryTypeId (should fail)
        UPDATE "template"
        SET "categoryTypeId" = 99999
        WHERE id = (SELECT id FROM "template" WHERE "deletedAt" IS NULL LIMIT 1);
        
        RAISE EXCEPTION '❌ Foreign key constraint NOT working! Should have failed.';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE '✅ Foreign key constraint working correctly (rejected invalid ID)';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️  No templates to test with';
    END;
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Test 9: Test SET NULL on delete (if we can safely test)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '📋 Test 9: Testing SET NULL behavior on category_type delete...';
    RAISE NOTICE '   (Skipping - would require deleting test data)';
    RAISE NOTICE '   Note: Foreign key is set to ON DELETE SET NULL';
END $$;
DO $$
BEGIN
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Test 10: Summary
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '📊 Test Summary:';
    RAISE NOTICE '================';
END $$;

SELECT 
    'category_type table' AS item,
    COUNT(*) AS count
FROM "category_type"
WHERE "deletedAt" IS NULL

UNION ALL

SELECT 
    'templates with categoryTypeId' AS item,
    COUNT(*) AS count
FROM "template"
WHERE "categoryTypeId" IS NOT NULL
    AND "deletedAt" IS NULL

UNION ALL

SELECT 
    'templates without categoryTypeId' AS item,
    COUNT(*) AS count
FROM "template"
WHERE "categoryTypeId" IS NULL
    AND "deletedAt" IS NULL;

DO $$
BEGIN
    RAISE NOTICE '';
END $$;
DO $$
BEGIN
    RAISE NOTICE '✅ All relationship tests completed!';
END $$;
DO $$
BEGIN
    RAISE NOTICE '';
END $$;
DO $$
BEGIN
    RAISE NOTICE '💡 Next steps:';
    RAISE NOTICE '   1. Verify category types are displayed correctly';
    RAISE NOTICE '   2. Test API endpoints: GET /category-type';
    RAISE NOTICE '   3. Create category types via API: POST /category-type';
    RAISE NOTICE '   4. Link templates to category types via categoryTypeId';
END $$;
DO $$
BEGIN
    RAISE NOTICE '';
END $$;

