-- ============================================
-- Quick Verification Script: Check Image Associations
-- ============================================
-- Run this to quickly check if images are properly associated with templates
-- ============================================

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

-- Show sample of templates with images
SELECT 
    t.id as template_id,
    t."notificationType",
    tt.language,
    tt."imageId",
    i."originalFileName",
    LEFT(tt.title, 40) as title
FROM template t
INNER JOIN template_translation tt ON tt."templateId" = t.id
INNER JOIN image i ON i."fileId" = tt."imageId"
WHERE tt."imageId" IS NOT NULL AND tt."imageId" != ''
ORDER BY t.id, tt.language
LIMIT 10;

