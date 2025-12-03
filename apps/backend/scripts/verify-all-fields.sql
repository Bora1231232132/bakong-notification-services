-- ============================================================================
-- Verification Script: Check All Template Table Fields
-- ============================================================================
-- This script verifies that all required fields exist in the template table
-- Compares database schema with entity definition
-- Updated to match unified migration schema (categoryTypeId, category_type table, etc.)
-- 
-- Usage:
--   psql -U <username> -d <database> -f apps/backend/scripts/verify-all-fields.sql
-- ============================================================================

\echo '🔍 Verifying template table fields...'
\echo ''

-- List all columns in template table
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('id', 'platforms', 'sendType', 'notificationType', 'categoryTypeId', 
                             'priority', 'sendInterval', 'isSent', 'sendSchedule', 
                             'createdBy', 'updatedBy', 'publishedBy', 'bakongPlatform',
                             'showPerDay', 'maxDayShowing', 'createdAt', 'updatedAt', 'deletedAt') 
        THEN '✅ Required'
        WHEN column_name = 'categoryType' THEN '❌ OLD (should be removed)'
        ELSE '⚠️  Extra'
    END as status
FROM information_schema.columns 
WHERE table_name = 'template' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

\echo ''
\echo '📋 Required Fields Checklist:'
\echo ''

-- Check each required field
DO $$
DECLARE
    missing_fields TEXT[] := ARRAY[]::TEXT[];
    old_fields TEXT[] := ARRAY[]::TEXT[];
    field TEXT;
    required_fields TEXT[] := ARRAY[
        'id', 'platforms', 'sendType', 'notificationType', 'categoryTypeId',
        'priority', 'sendInterval', 'isSent', 'sendSchedule',
        'createdBy', 'updatedBy', 'publishedBy', 'bakongPlatform',
        'showPerDay', 'maxDayShowing', 'createdAt', 'updatedAt', 'deletedAt'
    ];
BEGIN
    FOREACH field IN ARRAY required_fields
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'template' 
            AND column_name = field
        ) THEN
            missing_fields := array_append(missing_fields, field);
        END IF;
    END LOOP;
    
    -- Check for old categoryType column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'template' 
        AND column_name = 'categoryType'
    ) THEN
        old_fields := array_append(old_fields, 'categoryType');
    END IF;
    
    IF array_length(missing_fields, 1) IS NULL THEN
        RAISE NOTICE '✅ All required fields are present';
    ELSE
        RAISE NOTICE '❌ Missing fields: %', array_to_string(missing_fields, ', ');
    END IF;
    
    IF array_length(old_fields, 1) IS NOT NULL THEN
        RAISE WARNING '⚠️  Old fields found (should be removed): %', array_to_string(old_fields, ', ');
    END IF;
END$$;

\echo ''
\echo '📊 Field Type Verification:'
\echo ''

-- Check specific field types
SELECT 
    'platforms' as field_name,
    CASE 
        WHEN udt_name = '_text' THEN '✅ Correct (TEXT[] array)'
        WHEN data_type = 'character varying' THEN '⚠️  Wrong type (VARCHAR, should be TEXT[] array)'
        ELSE '❌ Unknown type: ' || COALESCE(udt_name, data_type)
    END as status
FROM information_schema.columns 
WHERE table_name = 'template' AND column_name = 'platforms'

UNION ALL

SELECT 
    'notificationType' as field_name,
    CASE 
        WHEN udt_name = 'notification_type_enum' THEN '✅ Correct (notification_type_enum)'
        WHEN data_type = 'character varying' THEN '⚠️  Wrong type (VARCHAR, should be notification_type_enum)'
        ELSE '❌ Unknown type: ' || COALESCE(udt_name, data_type)
    END as status
FROM information_schema.columns 
WHERE table_name = 'template' AND column_name = 'notificationType'

UNION ALL

SELECT 
    'categoryTypeId' as field_name,
    CASE 
        WHEN data_type = 'integer' THEN '✅ Correct (INTEGER)'
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'categoryTypeId') THEN '⚠️  Wrong type: ' || data_type
        ELSE '❌ Column not found'
    END as status
FROM information_schema.columns 
WHERE table_name = 'template' AND column_name = 'categoryTypeId'

UNION ALL

SELECT 
    'sendInterval' as field_name,
    CASE 
        WHEN data_type = 'json' THEN '✅ Correct (JSON)'
        WHEN data_type = 'integer' THEN '⚠️  Wrong type (INTEGER, should be JSON)'
        ELSE '❌ Unknown type: ' || data_type
    END as status
FROM information_schema.columns 
WHERE table_name = 'template' AND column_name = 'sendInterval'

UNION ALL

SELECT 
    'showPerDay' as field_name,
    CASE 
        WHEN data_type = 'integer' THEN '✅ Correct (INTEGER)'
        ELSE '❌ Wrong type: ' || data_type
    END as status
FROM information_schema.columns 
WHERE table_name = 'template' AND column_name = 'showPerDay'

UNION ALL

SELECT 
    'maxDayShowing' as field_name,
    CASE 
        WHEN data_type = 'integer' THEN '✅ Correct (INTEGER)'
        ELSE '❌ Wrong type: ' || data_type
    END as status
FROM information_schema.columns 
WHERE table_name = 'template' AND column_name = 'maxDayShowing';

\echo ''
\echo '📋 Related Schema Verification:'
\echo ''

-- Check category_type table exists
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'category_type'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '✅ category_type table exists';
    ELSE
        RAISE WARNING '❌ category_type table does not exist!';
    END IF;
END$$;

-- Check notification_type_enum exists
DO $$
DECLARE
    enum_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM pg_type 
        WHERE typname = 'notification_type_enum'
    ) INTO enum_exists;
    
    IF enum_exists THEN
        RAISE NOTICE '✅ notification_type_enum exists';
    ELSE
        RAISE WARNING '❌ notification_type_enum does not exist!';
    END IF;
END$$;

-- Check foreign key constraint
DO $$
DECLARE
    fk_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_template_category_type'
        AND table_name = 'template'
        AND constraint_type = 'FOREIGN KEY'
    ) INTO fk_exists;
    
    IF fk_exists THEN
        RAISE NOTICE '✅ Foreign key fk_template_category_type exists';
    ELSE
        RAISE WARNING '❌ Foreign key fk_template_category_type does not exist!';
    END IF;
END$$;

\echo ''
\echo '✅ Verification complete!'
\echo ''

