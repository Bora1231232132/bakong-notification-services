-- ============================================================================
-- Comprehensive Database Verification Script (verify-all.sql)
-- ============================================================================
-- Combines schema verification and data integrity checks
-- Usage: psql -U <username> -d <database> -f apps/backend/scripts/verify-all.sql
-- ============================================================================

\echo '🔍 Starting comprehensive database verification...'
\echo ''

-- 1. Import Schema Verification Logic
-- (We use the logic from verify-migration.sql)
\i apps/backend/scripts/verify-migration.sql

-- 2. Data Record Count Verification
\echo '📊 Step 11: Verifying data record counts...'

SELECT 
    'Users' as table_name,
    COUNT(*) as record_count
FROM "user"
WHERE "deletedAt" IS NULL
UNION ALL
SELECT 'Templates', COUNT(*) FROM template WHERE "deletedAt" IS NULL
UNION ALL
SELECT 'Template Translations', COUNT(*) FROM template_translation
UNION ALL
SELECT 'Images', COUNT(*) FROM image
UNION ALL
SELECT 'Images with Data', COUNT(*) FROM image WHERE file IS NOT NULL AND LENGTH(file) > 0
UNION ALL
SELECT 'Template Translations with Images', COUNT(*) FROM template_translation WHERE "imageId" IS NOT NULL AND "imageId" != ''
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notification
UNION ALL
SELECT 'Bakong Users', COUNT(*) FROM bakong_user;

\echo ''
\echo '✅ Comprehensive verification completed!'
\echo ''
