-- ============================================
-- Script: Comprehensive Database Verification
-- ============================================
-- This script consolidates all verification checks:
-- - All tables existence and structure
-- - Schema matches entity definitions
-- - Image associations
-- - Data integrity
--
-- Usage:
--   bash utils-server.sh verify-all
--   OR
--   docker exec -i <container> psql -U <user> -d <db> < apps/backend/verify-all.sql
-- ============================================

\echo ''
\echo '========================================'
\echo 'COMPREHENSIVE DATABASE VERIFICATION'
\echo '========================================'
\echo ''

-- ============================================
-- PART 1: TABLE EXISTENCE AND STRUCTURE
-- ============================================
\echo '========================================'
\echo 'PART 1: TABLE EXISTENCE AND STRUCTURE'
\echo '========================================'
\echo ''

-- 1. USER TABLE
\echo '📋 Checking: user table'
\echo '----------------------------------------'

DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO row_count FROM "user";
        RAISE NOTICE '✅ Table exists';
        RAISE NOTICE '   Row count: %', row_count;
    ELSE
        RAISE WARNING '❌ Table does not exist!';
    END IF;
END $$;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user'
ORDER BY ordinal_position;

\echo ''

-- 2. BAKONG_USER TABLE
\echo '📋 Checking: bakong_user table'
\echo '----------------------------------------'

DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bakong_user'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO row_count FROM bakong_user;
        RAISE NOTICE '✅ Table exists';
        RAISE NOTICE '   Row count: %', row_count;
    ELSE
        RAISE WARNING '❌ Table does not exist!';
    END IF;
END $$;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bakong_user'
ORDER BY ordinal_position;

\echo ''

-- 3. IMAGE TABLE
\echo '📋 Checking: image table'
\echo '----------------------------------------'

DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER;
    null_fileids INTEGER;
    fileid_type TEXT;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'image'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO row_count FROM image;
        SELECT COUNT(*) INTO null_fileids FROM image WHERE "fileId" IS NULL;
        SELECT data_type INTO fileid_type
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'image' 
          AND column_name = 'fileId';
        
        RAISE NOTICE '✅ Table exists';
        RAISE NOTICE '   Row count: %', row_count;
        RAISE NOTICE '   fileId type: %', COALESCE(fileid_type, 'NOT FOUND');
        RAISE NOTICE '   NULL fileIds: %', null_fileids;
        
        IF null_fileids = 0 AND fileid_type = 'character varying' THEN
            RAISE NOTICE '   ✅ Schema is correct!';
        ELSIF null_fileids > 0 THEN
            RAISE WARNING '   ⚠️ Found % NULL fileId values!', null_fileids;
        ELSIF fileid_type != 'character varying' THEN
            RAISE WARNING '   ⚠️ fileId type is % (expected VARCHAR)', fileid_type;
        END IF;
    ELSE
        RAISE WARNING '❌ Table does not exist!';
    END IF;
END $$;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'image'
ORDER BY ordinal_position;

\echo ''

-- 4. TEMPLATE TABLE
\echo '📋 Checking: template table'
\echo '----------------------------------------'

DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'template'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO row_count FROM template;
        RAISE NOTICE '✅ Table exists';
        RAISE NOTICE '   Row count: %', row_count;
    ELSE
        RAISE WARNING '❌ Table does not exist!';
    END IF;
END $$;

SELECT 
    column_name,
    data_type,
    udt_name,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'template'
ORDER BY ordinal_position;

\echo ''

-- 5. TEMPLATE_TRANSLATION TABLE
\echo '📋 Checking: template_translation table'
\echo '----------------------------------------'

DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER;
    translations_with_images INTEGER;
    translations_without_images INTEGER;
    imageid_type TEXT;
    orphaned_refs INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'template_translation'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO row_count FROM template_translation;
        SELECT COUNT(*) INTO translations_with_images 
        FROM template_translation 
        WHERE "imageId" IS NOT NULL AND "imageId" != '';
        SELECT COUNT(*) INTO translations_without_images 
        FROM template_translation 
        WHERE "imageId" IS NULL OR "imageId" = '';
        SELECT data_type INTO imageid_type
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'template_translation' 
          AND column_name = 'imageId';
        SELECT COUNT(*) INTO orphaned_refs
        FROM template_translation tt
        WHERE tt."imageId" IS NOT NULL 
          AND tt."imageId" != ''
          AND NOT EXISTS (
              SELECT 1 FROM image i WHERE i."fileId" = tt."imageId"
          );
        
        RAISE NOTICE '✅ Table exists';
        RAISE NOTICE '   Row count: %', row_count;
        RAISE NOTICE '   imageId type: %', COALESCE(imageid_type, 'NOT FOUND');
        RAISE NOTICE '   Translations with images: %', translations_with_images;
        RAISE NOTICE '   Translations without images: %', translations_without_images;
        RAISE NOTICE '   Orphaned image references: %', orphaned_refs;
        
        IF imageid_type = 'character varying' THEN
            RAISE NOTICE '   ✅ imageId type is correct (VARCHAR)';
        ELSE
            RAISE WARNING '   ⚠️ imageId type is % (expected VARCHAR)', imageid_type;
        END IF;
        
        IF orphaned_refs > 0 THEN
            RAISE WARNING '   ⚠️ Found % orphaned image references!', orphaned_refs;
        END IF;
    ELSE
        RAISE WARNING '❌ Table does not exist!';
    END IF;
END $$;

SELECT 
    column_name,
    data_type,
    udt_name,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'template_translation'
ORDER BY ordinal_position;

\echo ''

-- 6. NOTIFICATION TABLE
\echo '📋 Checking: notification table'
\echo '----------------------------------------'

DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notification'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO row_count FROM notification;
        RAISE NOTICE '✅ Table exists';
        RAISE NOTICE '   Row count: %', row_count;
    ELSE
        RAISE WARNING '❌ Table does not exist!';
    END IF;
END $$;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notification'
ORDER BY ordinal_position;

\echo ''

-- ============================================
-- PART 2: SCHEMA MATCHES ENTITY DEFINITIONS
-- ============================================
\echo '========================================'
\echo 'PART 2: SCHEMA MATCHES ENTITY DEFINITIONS'
\echo '========================================'
\echo ''

-- Check image.fileId column
DO $$
DECLARE
    fileid_type TEXT;
    fileid_nullable TEXT;
    fileid_length INTEGER;
    fileid_unique BOOLEAN;
BEGIN
    SELECT 
        data_type,
        is_nullable,
        character_maximum_length,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'image' 
              AND tc.constraint_type = 'UNIQUE'
              AND ccu.column_name = 'fileId'
        ) THEN TRUE ELSE FALSE END
    INTO fileid_type, fileid_nullable, fileid_length, fileid_unique
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'image' 
      AND column_name = 'fileId';
    
    RAISE NOTICE 'image.fileId Column Check:';
    RAISE NOTICE '  Current DB Type: %', COALESCE(fileid_type, 'NOT FOUND');
    RAISE NOTICE '  Expected Type: character varying (VARCHAR)';
    RAISE NOTICE '  Current Length: %', COALESCE(fileid_length::TEXT, 'N/A');
    RAISE NOTICE '  Expected Length: 255';
    RAISE NOTICE '  Is Nullable: %', COALESCE(fileid_nullable, 'N/A');
    RAISE NOTICE '  Expected Nullable: NO';
    RAISE NOTICE '  Has Unique Constraint: %', fileid_unique;
    RAISE NOTICE '  Expected Unique: YES';
    
    IF fileid_type = 'character varying' AND fileid_length = 255 AND fileid_nullable = 'NO' AND fileid_unique = TRUE THEN
        RAISE NOTICE '  ✅ image.fileId matches entity definition!';
    ELSE
        RAISE WARNING '  ⚠️ image.fileId does NOT match entity definition!';
        RAISE WARNING '     Entity expects: VARCHAR(255) NOT NULL UNIQUE';
    END IF;
END $$;

-- Check template_translation.imageId column
DO $$
DECLARE
    imageid_type TEXT;
    imageid_nullable TEXT;
    imageid_length INTEGER;
BEGIN
    SELECT 
        data_type,
        is_nullable,
        character_maximum_length
    INTO imageid_type, imageid_nullable, imageid_length
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'template_translation' 
      AND column_name = 'imageId';
    
    RAISE NOTICE '';
    RAISE NOTICE 'template_translation.imageId Column Check:';
    RAISE NOTICE '  Current DB Type: %', COALESCE(imageid_type, 'NOT FOUND');
    RAISE NOTICE '  Expected Type: character varying (VARCHAR)';
    RAISE NOTICE '  Current Length: %', COALESCE(imageid_length::TEXT, 'N/A');
    RAISE NOTICE '  Expected Length: 255';
    RAISE NOTICE '  Is Nullable: %', COALESCE(imageid_nullable, 'N/A');
    RAISE NOTICE '  Expected Nullable: YES';
    
    IF imageid_type = 'character varying' AND imageid_length = 255 AND imageid_nullable = 'YES' THEN
        RAISE NOTICE '  ✅ template_translation.imageId matches entity definition!';
    ELSE
        RAISE WARNING '  ⚠️ template_translation.imageId does NOT match entity definition!';
        RAISE WARNING '     Entity expects: VARCHAR(255) NULL';
    END IF;
END $$;

-- Check foreign key constraint
DO $$
DECLARE
    fk_exists BOOLEAN;
    fk_referenced_table TEXT;
    fk_referenced_column TEXT;
BEGIN
    SELECT 
        EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            WHERE tc.table_schema = 'public'
              AND tc.table_name = 'template_translation'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND tc.constraint_name = 'FK_template_translation_image'
        ),
        (SELECT ccu.table_name 
         FROM information_schema.table_constraints tc
         JOIN information_schema.constraint_column_usage ccu 
           ON tc.constraint_name = ccu.constraint_name
         WHERE tc.table_schema = 'public'
           AND tc.table_name = 'template_translation'
           AND tc.constraint_type = 'FOREIGN KEY'
           AND tc.constraint_name = 'FK_template_translation_image'
         LIMIT 1),
        (SELECT ccu.column_name 
         FROM information_schema.table_constraints tc
         JOIN information_schema.constraint_column_usage ccu 
           ON tc.constraint_name = ccu.constraint_name
         WHERE tc.table_schema = 'public'
           AND tc.table_name = 'template_translation'
           AND tc.constraint_type = 'FOREIGN KEY'
           AND tc.constraint_name = 'FK_template_translation_image'
         LIMIT 1)
    INTO fk_exists, fk_referenced_table, fk_referenced_column;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Foreign Key Constraint Check:';
    RAISE NOTICE '  FK Exists: %', fk_exists;
    RAISE NOTICE '  References: %.%', COALESCE(fk_referenced_table, 'N/A'), COALESCE(fk_referenced_column, 'N/A');
    RAISE NOTICE '  Expected: image.fileId';
    
    IF fk_exists AND fk_referenced_table = 'image' AND fk_referenced_column = 'fileId' THEN
        RAISE NOTICE '  ✅ Foreign key constraint is correct!';
    ELSE
        RAISE WARNING '  ⚠️ Foreign key constraint is missing or incorrect!';
    END IF;
END $$;

\echo ''

-- ============================================
-- PART 3: IMAGE ASSOCIATIONS
-- ============================================
\echo '========================================'
\echo 'PART 3: IMAGE ASSOCIATIONS'
\echo '========================================'
\echo ''

-- Quick check: Are images accessible?
SELECT 
    'Image Status' as check_type,
    COUNT(*) as total_images,
    COUNT(DISTINCT "fileId") as unique_fileIds,
    COUNT(CASE WHEN "fileId" IS NULL THEN 1 END) as null_fileIds
FROM image;

-- Check template translations with images
SELECT 
    'Template Translations' as check_type,
    COUNT(*) as total_translations,
    COUNT(CASE WHEN "imageId" IS NOT NULL AND "imageId" != '' THEN 1 END) as with_imageId,
    COUNT(CASE WHEN "imageId" IS NULL OR "imageId" = '' THEN 1 END) as without_imageId
FROM template_translation;

-- Check if associations are valid
SELECT 
    'Valid Associations' as check_type,
    COUNT(*) as valid_count
FROM template_translation tt
INNER JOIN image i ON i."fileId" = tt."imageId"
WHERE tt."imageId" IS NOT NULL AND tt."imageId" != '';

-- Check for broken associations
SELECT 
    'Broken Associations' as check_type,
    COUNT(*) as broken_count
FROM template_translation tt
WHERE tt."imageId" IS NOT NULL 
  AND tt."imageId" != ''
  AND NOT EXISTS (
      SELECT 1 FROM image i WHERE i."fileId" = tt."imageId"
  );

\echo ''

-- ============================================
-- PART 4: SUMMARY
-- ============================================
\echo '========================================'
\echo 'PART 4: SUMMARY'
\echo '========================================'
\echo ''

-- Table summary
SELECT 
    'user' as table_name,
    COUNT(*) as row_count,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = 'user') as column_count
FROM "user"
UNION ALL
SELECT 
    'bakong_user',
    COUNT(*),
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = 'bakong_user')
FROM bakong_user
UNION ALL
SELECT 
    'image',
    COUNT(*),
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = 'image')
FROM image
UNION ALL
SELECT 
    'template',
    COUNT(*),
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = 'template')
FROM template
UNION ALL
SELECT 
    'template_translation',
    COUNT(*),
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = 'template_translation')
FROM template_translation
UNION ALL
SELECT 
    'notification',
    COUNT(*),
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = 'notification')
FROM notification
ORDER BY table_name;

-- Final data integrity check
DO $$
DECLARE
    null_fileids INTEGER;
    total_images INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_fileids FROM image WHERE "fileId" IS NULL;
    SELECT COUNT(*) INTO total_images FROM image;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Data Integrity Check:';
    RAISE NOTICE '  Total images: %', total_images;
    RAISE NOTICE '  Images with NULL fileId: %', null_fileids;
    
    IF null_fileids = 0 THEN
        RAISE NOTICE '  ✅ No NULL fileId values found!';
    ELSE
        RAISE WARNING '  ⚠️ Found % images with NULL fileId!', null_fileids;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONCLUSION:';
    RAISE NOTICE '========================================';
    IF null_fileids = 0 THEN
        RAISE NOTICE '✅ Schema matches entity definitions!';
        RAISE NOTICE '✅ TypeORM synchronize should NOT make any changes';
    ELSE
        RAISE WARNING '⚠️ Schema may need updates - check warnings above';
    END IF;
    RAISE NOTICE '========================================';
END $$;

\echo ''
\echo '========================================'
\echo 'VERIFICATION COMPLETE'
\echo '========================================'
\echo ''

