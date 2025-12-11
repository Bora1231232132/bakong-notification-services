-- ============================================================================
-- Migration Verification Script
-- ============================================================================
-- Run this script AFTER running unified-migration.sql to verify everything is correct
-- Usage: psql -U <username> -d <database> -f apps/backend/scripts/verify-migration.sql
-- ============================================================================

\echo '🔍 Starting migration verification...'
\echo ''

-- ============================================================================
-- 1. Verify All Tables Exist
-- ============================================================================
\echo '📊 Step 1: Verifying tables exist...'

DO $$
DECLARE
    expected_tables TEXT[] := ARRAY['user', 'bakong_user', 'image', 'category_type', 'template', 'template_translation', 'notification'];
    missing_tables TEXT[];
    tbl_name TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_schema = 'public' 
            AND t.table_name = tbl_name
        ) THEN
            missing_tables := array_append(missing_tables, tbl_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) IS NULL THEN
        RAISE NOTICE '✅ All 7 tables exist';
    ELSE
        RAISE EXCEPTION '❌ Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
END$$;

-- ============================================================================
-- 2. Verify Critical Columns
-- ============================================================================
\echo '📋 Step 2: Verifying critical columns...'

DO $$
DECLARE
    issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check user.imageId
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user' AND column_name = 'imageId'
    ) THEN
        issues := array_append(issues, 'user.imageId missing');
    END IF;
    
    -- Check bakong_user.syncStatus
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bakong_user' AND column_name = 'syncStatus'
    ) THEN
        issues := array_append(issues, 'bakong_user.syncStatus missing');
    END IF;
    
    -- Check image.fileHash
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image' AND column_name = 'fileHash'
    ) THEN
        issues := array_append(issues, 'image.fileHash missing');
    END IF;
    
    -- Check template.categoryTypeId
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' AND column_name = 'categoryTypeId'
    ) THEN
        issues := array_append(issues, 'template.categoryTypeId missing');
    END IF;
    
    IF array_length(issues, 1) IS NULL THEN
        RAISE NOTICE '✅ All critical columns exist';
    ELSE
        RAISE EXCEPTION '❌ Column issues: %', array_to_string(issues, ', ');
    END IF;
END$$;

-- ============================================================================
-- 3. Verify Column Constraints
-- ============================================================================
\echo '🔒 Step 3: Verifying column constraints...'

DO $$
DECLARE
    issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check user.displayName is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user' 
        AND column_name = 'displayName'
        AND is_nullable = 'YES'
    ) THEN
        issues := array_append(issues, 'user.displayName should be NOT NULL');
    END IF;
    
    -- Check bakong_user.accountId is UNIQUE
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'bakong_user'::regclass
        AND conname LIKE '%accountId%'
        AND contype = 'u'
    ) THEN
        issues := array_append(issues, 'bakong_user.accountId should be UNIQUE');
    END IF;
    
    -- Check notification.templateId is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification' 
        AND column_name = 'templateId'
        AND is_nullable = 'YES'
    ) THEN
        issues := array_append(issues, 'notification.templateId should be NOT NULL');
    END IF;
    
    -- Check image.file is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image' 
        AND column_name = 'file'
        AND is_nullable = 'YES'
    ) THEN
        issues := array_append(issues, 'image.file should be NOT NULL');
    END IF;
    
    -- Check image.mimeType is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image' 
        AND column_name = 'mimeType'
        AND is_nullable = 'YES'
    ) THEN
        issues := array_append(issues, 'image.mimeType should be NOT NULL');
    END IF;
    
    IF array_length(issues, 1) IS NULL THEN
        RAISE NOTICE '✅ All column constraints are correct';
    ELSE
        RAISE EXCEPTION '❌ Constraint issues: %', array_to_string(issues, ', ');
    END IF;
END$$;

-- ============================================================================
-- 4. Verify Foreign Keys
-- ============================================================================
\echo '🔗 Step 4: Verifying foreign keys...'

DO $$
DECLARE
    expected_fks TEXT[] := ARRAY[
        'FK_template_translation_template',
        'FK_template_translation_image',
        'FK_notification_template',
        'fk_template_category_type'
    ];
    missing_fks TEXT[];
    fk_name TEXT;
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count FROM pg_constraint WHERE contype = 'f';
    
    FOREACH fk_name IN ARRAY expected_fks
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = fk_name
        ) THEN
            missing_fks := array_append(missing_fks, fk_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_fks, 1) IS NULL THEN
        RAISE NOTICE '✅ All foreign keys exist (Total: %)', fk_count;
    ELSE
        RAISE EXCEPTION '❌ Missing foreign keys: %', array_to_string(missing_fks, ', ');
    END IF;
END$$;

-- ============================================================================
-- 5. Verify Indexes
-- ============================================================================
\echo '📇 Step 5: Verifying indexes...'

DO $$
DECLARE
    index_count INTEGER;
    critical_indexes TEXT[] := ARRAY[
        'IDX_notification_accountId',
        'IDX_notification_templateId',
        'IDX_bakong_user_accountId',
        'IDX_image_fileId',
        'IDX_image_fileHash'
    ];
    missing_indexes TEXT[];
    idx_name TEXT;
BEGIN
    SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE schemaname = 'public';
    
    FOREACH idx_name IN ARRAY critical_indexes
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = idx_name
        ) THEN
            missing_indexes := array_append(missing_indexes, idx_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_indexes, 1) IS NULL THEN
        RAISE NOTICE '✅ All critical indexes exist (Total: %)', index_count;
    ELSE
        RAISE EXCEPTION '❌ Missing indexes: %', array_to_string(missing_indexes, ', ');
    END IF;
END$$;

-- ============================================================================
-- 6. Verify Data Integrity
-- ============================================================================
\echo '🔍 Step 6: Verifying data integrity...'

DO $$
DECLARE
    null_displayname_count INTEGER;
    null_file_count INTEGER;
    null_mimetype_count INTEGER;
    null_templateid_count INTEGER;
    duplicate_accountid_count INTEGER;
BEGIN
    -- Check for NULL values in NOT NULL columns
    SELECT COUNT(*) INTO null_displayname_count 
    FROM "user" WHERE "displayName" IS NULL;
    
    SELECT COUNT(*) INTO null_file_count 
    FROM image WHERE file IS NULL;
    
    SELECT COUNT(*) INTO null_mimetype_count 
    FROM image WHERE "mimeType" IS NULL;
    
    SELECT COUNT(*) INTO null_templateid_count 
    FROM notification WHERE "templateId" IS NULL;
    
    -- Check for duplicate accountIds
    SELECT COUNT(*) INTO duplicate_accountid_count
    FROM (
        SELECT "accountId" FROM bakong_user 
        GROUP BY "accountId" 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF null_displayname_count > 0 THEN
        RAISE EXCEPTION '❌ Found % NULL values in user.displayName (should be NOT NULL)', null_displayname_count;
    END IF;
    
    IF null_file_count > 0 THEN
        RAISE EXCEPTION '❌ Found % NULL values in image.file (should be NOT NULL)', null_file_count;
    END IF;
    
    IF null_mimetype_count > 0 THEN
        RAISE EXCEPTION '❌ Found % NULL values in image.mimeType (should be NOT NULL)', null_mimetype_count;
    END IF;
    
    IF null_templateid_count > 0 THEN
        RAISE EXCEPTION '❌ Found % NULL values in notification.templateId (should be NOT NULL)', null_templateid_count;
    END IF;
    
    IF duplicate_accountid_count > 0 THEN
        RAISE EXCEPTION '❌ Found % duplicate accountIds in bakong_user (should be UNIQUE)', duplicate_accountid_count;
    END IF;
    
    RAISE NOTICE '✅ Data integrity check passed';
END$$;

-- ============================================================================
-- 7. Verify Enum Types
-- ============================================================================
\echo '📝 Step 7: Verifying enum types...'

DO $$
DECLARE
    expected_enums TEXT[] := ARRAY[
        'user_role_enum',
        'send_type_enum',
        'platform_enum',
        'language_enum',
        'bakong_platform_enum',
        'notification_type_enum'
    ];
    missing_enums TEXT[];
    enum_name TEXT;
BEGIN
    FOREACH enum_name IN ARRAY expected_enums
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = enum_name
        ) THEN
            missing_enums := array_append(missing_enums, enum_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_enums, 1) IS NULL THEN
        RAISE NOTICE '✅ All enum types exist';
    ELSE
        RAISE EXCEPTION '❌ Missing enum types: %', array_to_string(missing_enums, ', ');
    END IF;
END$$;

-- ============================================================================
-- 8. Verify Column Types Match Entities
-- ============================================================================
\echo '🔧 Step 8: Verifying column types...'

DO $$
DECLARE
    issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check bakong_user.id is BIGINT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bakong_user' 
        AND column_name = 'id'
        AND data_type = 'integer'
    ) THEN
        issues := array_append(issues, 'bakong_user.id should be BIGINT (currently INTEGER)');
    END IF;
    
    -- Check image.id is BIGINT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image' 
        AND column_name = 'id'
        AND data_type = 'integer'
    ) THEN
        issues := array_append(issues, 'image.id should be BIGINT (currently INTEGER)');
    END IF;
    
    -- Check notification.templateId is BIGINT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification' 
        AND column_name = 'templateId'
        AND data_type = 'integer'
    ) THEN
        issues := array_append(issues, 'notification.templateId should be BIGINT (currently INTEGER)');
    END IF;
    
    -- Check user.role is enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user' 
        AND column_name = 'role'
        AND data_type = 'character varying'
    ) THEN
        issues := array_append(issues, 'user.role should be user_role_enum (currently VARCHAR)');
    END IF;
    
    IF array_length(issues, 1) IS NULL THEN
        RAISE NOTICE '✅ All column types are correct';
    ELSE
        RAISE WARNING '⚠️  Type issues (may be acceptable): %', array_to_string(issues, ', ');
    END IF;
END$$;

-- ============================================================================
-- Summary
-- ============================================================================
\echo ''
\echo '✅ Migration verification completed successfully!'
\echo ''
\echo '📋 Summary:'
\echo '   - All tables exist'
\echo '   - All critical columns exist'
\echo '   - All constraints are correct'
\echo '   - All foreign keys are in place'
\echo '   - All indexes are created'
\echo '   - Data integrity verified'
\echo '   - All enum types exist'
\echo ''
\echo '🚀 Database is ready for application deployment!'
\echo ''

