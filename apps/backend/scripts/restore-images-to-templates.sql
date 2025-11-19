-- ============================================
-- Script: Restore/Fix Image Associations to Templates
-- ============================================
-- This script checks and fixes image associations in template_translation table
-- It will:
-- 1. Find orphaned imageIds (imageIds that don't exist in image table)
-- 2. Report broken associations
-- 3. Show which templates have images
-- 4. Optionally clean up orphaned references
--
-- Usage:
--   docker exec -i bakong-notification-services-db-sit psql -U bkns_sit -d bakong_notification_services_sit < apps/backend/scripts/restore-images-to-templates.sql
-- ============================================

-- Step 1: Check current state and report
DO $$
DECLARE
    total_translations INTEGER;
    translations_with_images INTEGER;
    orphaned_references INTEGER;
    valid_references INTEGER;
    total_images INTEGER;
BEGIN
    -- Count total translations
    SELECT COUNT(*) INTO total_translations FROM template_translation;
    
    -- Count translations with imageId
    SELECT COUNT(*) INTO translations_with_images 
    FROM template_translation 
    WHERE "imageId" IS NOT NULL AND "imageId" != '';
    
    -- Count orphaned references (imageIds that don't exist in image table)
    SELECT COUNT(*) INTO orphaned_references
    FROM template_translation tt
    WHERE tt."imageId" IS NOT NULL 
      AND tt."imageId" != ''
      AND NOT EXISTS (
          SELECT 1 FROM image i WHERE i."fileId" = tt."imageId"
      );
    
    -- Count valid references
    SELECT COUNT(*) INTO valid_references
    FROM template_translation tt
    WHERE tt."imageId" IS NOT NULL 
      AND tt."imageId" != ''
      AND EXISTS (
          SELECT 1 FROM image i WHERE i."fileId" = tt."imageId"
      );
    
    -- Count total images
    SELECT COUNT(*) INTO total_images FROM image;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Image Association Report:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total template translations: %', total_translations;
    RAISE NOTICE 'Translations with imageId: %', translations_with_images;
    RAISE NOTICE 'Valid image associations: %', valid_references;
    RAISE NOTICE 'Orphaned image references: %', orphaned_references;
    RAISE NOTICE 'Total images in database: %', total_images;
    RAISE NOTICE '========================================';
    
    IF orphaned_references > 0 THEN
        RAISE WARNING '⚠️ Found % orphaned image references that need to be cleaned up', orphaned_references;
    ELSE
        RAISE NOTICE '✅ All image associations are valid!';
    END IF;
END $$;

-- Step 2: Show orphaned references (if any) - these need to be fixed
SELECT 
    'ORPHANED' as status,
    tt.id as translation_id,
    tt."templateId",
    t."notificationType" as template_type,
    tt.language,
    tt."imageId" as orphaned_imageId,
    LEFT(tt.title, 50) as title_preview
FROM template_translation tt
LEFT JOIN template t ON t.id = tt."templateId"
WHERE tt."imageId" IS NOT NULL 
  AND tt."imageId" != ''
  AND NOT EXISTS (
      SELECT 1 FROM image i WHERE i."fileId" = tt."imageId"
  )
ORDER BY tt."templateId", tt.language;

-- Step 3: Show valid image associations - these are working correctly
SELECT 
    'VALID' as status,
    tt.id as translation_id,
    tt."templateId",
    t."notificationType" as template_type,
    tt.language,
    tt."imageId",
    i."originalFileName",
    i."mimeType",
    LEFT(tt.title, 50) as title_preview
FROM template_translation tt
INNER JOIN image i ON i."fileId" = tt."imageId"
LEFT JOIN template t ON t.id = tt."templateId"
WHERE tt."imageId" IS NOT NULL 
  AND tt."imageId" != ''
ORDER BY tt."templateId", tt.language
LIMIT 20;

-- Step 4: Show templates without images
SELECT 
    'NO_IMAGE' as status,
    tt.id as translation_id,
    tt."templateId",
    t."notificationType" as template_type,
    tt.language,
    LEFT(tt.title, 50) as title_preview
FROM template_translation tt
LEFT JOIN template t ON t.id = tt."templateId"
WHERE tt."imageId" IS NULL OR tt."imageId" = ''
ORDER BY tt."templateId", tt.language
LIMIT 20;

-- Step 5: Clean up orphaned references (uncomment to enable)
-- This will set imageId to NULL for translations that reference non-existent images
DO $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    UPDATE template_translation
    SET "imageId" = NULL,
        "updatedAt" = NOW()
    WHERE "imageId" IS NOT NULL 
      AND "imageId" != ''
      AND NOT EXISTS (
          SELECT 1 FROM image i WHERE i."fileId" = template_translation."imageId"
      );
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    IF cleaned_count > 0 THEN
        RAISE NOTICE '✅ Cleaned up % orphaned image references', cleaned_count;
    ELSE
        RAISE NOTICE '✅ No orphaned references to clean up';
    END IF;
END $$;

-- Step 6: Verify foreign key constraint
DO $$
DECLARE
    fk_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_d871aa842216b0708829b76233b'
        AND table_schema = 'public'
        AND table_name = 'template_translation'
    ) INTO fk_exists;
    
    IF fk_exists THEN
        RAISE NOTICE '✅ Foreign key constraint exists and is active';
    ELSE
        RAISE WARNING '⚠️ Foreign key constraint is missing!';
    END IF;
END $$;

-- Step 7: Final summary
SELECT 
    'SUMMARY' as report_type,
    COUNT(DISTINCT tt."templateId") as templates_with_images,
    COUNT(*) as total_valid_associations
FROM template_translation tt
INNER JOIN image i ON i."fileId" = tt."imageId"
WHERE tt."imageId" IS NOT NULL AND tt."imageId" != '';
