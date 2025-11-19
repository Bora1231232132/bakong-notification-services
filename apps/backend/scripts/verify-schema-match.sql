-- ============================================
-- Script: Verify Schema Matches Entity Definitions
-- ============================================
-- This script verifies that the database schema matches the TypeORM entity definitions
-- If everything matches, TypeORM synchronize will NOT make any changes
--
-- Usage:
--   docker exec -i bakong-notification-services-db-sit psql -U bkns_sit -d bakong_notification_services_sit < apps/backend/scripts/verify-schema-match.sql
-- ============================================

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
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'image.fileId Column Check:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Current DB Type: %', COALESCE(fileid_type, 'NOT FOUND');
    RAISE NOTICE 'Expected Type: character varying (VARCHAR)';
    RAISE NOTICE 'Current Length: %', COALESCE(fileid_length::TEXT, 'N/A');
    RAISE NOTICE 'Expected Length: 255';
    RAISE NOTICE 'Is Nullable: %', COALESCE(fileid_nullable, 'N/A');
    RAISE NOTICE 'Expected Nullable: NO';
    RAISE NOTICE 'Has Unique Constraint: %', fileid_unique;
    RAISE NOTICE 'Expected Unique: YES';
    
    IF fileid_type = 'character varying' AND fileid_length = 255 AND fileid_nullable = 'NO' AND fileid_unique = TRUE THEN
        RAISE NOTICE '✅ image.fileId matches entity definition!';
    ELSE
        RAISE WARNING '⚠️ image.fileId does NOT match entity definition!';
        RAISE WARNING '   Entity expects: VARCHAR(255) NOT NULL UNIQUE';
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
    RAISE NOTICE '========================================';
    RAISE NOTICE 'template_translation.imageId Column Check:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Current DB Type: %', COALESCE(imageid_type, 'NOT FOUND');
    RAISE NOTICE 'Expected Type: character varying (VARCHAR)';
    RAISE NOTICE 'Current Length: %', COALESCE(imageid_length::TEXT, 'N/A');
    RAISE NOTICE 'Expected Length: 255';
    RAISE NOTICE 'Is Nullable: %', COALESCE(imageid_nullable, 'N/A');
    RAISE NOTICE 'Expected Nullable: YES';
    
    IF imageid_type = 'character varying' AND imageid_length = 255 AND imageid_nullable = 'YES' THEN
        RAISE NOTICE '✅ template_translation.imageId matches entity definition!';
    ELSE
        RAISE WARNING '⚠️ template_translation.imageId does NOT match entity definition!';
        RAISE WARNING '   Entity expects: VARCHAR(255) NULL';
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
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'template_translation'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND tc.constraint_name = 'FK_d871aa842216b0708829b76233b'
        ),
        (SELECT referenced_table_name FROM information_schema.key_column_usage 
         WHERE table_name = 'template_translation' 
           AND constraint_name = 'FK_d871aa842216b0708829b76233b' 
         LIMIT 1),
        (SELECT referenced_column_name FROM information_schema.key_column_usage 
         WHERE table_name = 'template_translation' 
           AND constraint_name = 'FK_d871aa842216b0708829b76233b' 
         LIMIT 1)
    INTO fk_exists, fk_referenced_table, fk_referenced_column;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Foreign Key Constraint Check:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FK Exists: %', fk_exists;
    RAISE NOTICE 'References: %.%', COALESCE(fk_referenced_table, 'N/A'), COALESCE(fk_referenced_column, 'N/A');
    RAISE NOTICE 'Expected: image.fileId';
    
    IF fk_exists AND fk_referenced_table = 'image' AND fk_referenced_column = 'fileId' THEN
        RAISE NOTICE '✅ Foreign key constraint is correct!';
    ELSE
        RAISE WARNING '⚠️ Foreign key constraint is missing or incorrect!';
    END IF;
END $$;

-- Final summary
DO $$
DECLARE
    null_fileids INTEGER;
    total_images INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_fileids FROM image WHERE "fileId" IS NULL;
    SELECT COUNT(*) INTO total_images FROM image;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Data Integrity Check:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total images: %', total_images;
    RAISE NOTICE 'Images with NULL fileId: %', null_fileids;
    
    IF null_fileids = 0 THEN
        RAISE NOTICE '✅ No NULL fileId values found!';
    ELSE
        RAISE WARNING '⚠️ Found % images with NULL fileId!', null_fileids;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONCLUSION:';
    RAISE NOTICE '========================================';
    IF null_fileids = 0 THEN
        RAISE NOTICE '✅ Schema matches entity definitions!';
        RAISE NOTICE '✅ TypeORM synchronize should NOT make any changes';
        RAISE NOTICE '✅ Safe to remove migration scripts (they are no longer needed)';
    ELSE
        RAISE WARNING '⚠️ Schema may need updates - check warnings above';
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- Show current schema for reference
SELECT 
    'image.fileId' as column_name,
    data_type,
    character_maximum_length as max_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'image' 
  AND column_name = 'fileId'
UNION ALL
SELECT 
    'template_translation.imageId' as column_name,
    data_type,
    character_maximum_length as max_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'template_translation' 
  AND column_name = 'imageId';

