-- ============================================
-- Migration Script: Convert fileId from UUID to VARCHAR
-- ============================================
-- This script converts the fileId column from UUID type to VARCHAR(255)
-- Run this BEFORE TypeORM synchronize to prevent migration errors
--
-- Usage:
--   docker exec -i bakong-notification-services-db-sit psql -U bkns_sit -d bakong_notification_services_sit < apps/backend/scripts/convert-fileid-to-varchar.sql
-- ============================================

-- Enable uuid-ossp extension if needed (for generating UUIDs if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check current column type
DO $$
DECLARE
    col_type TEXT;
    null_count INTEGER;
BEGIN
    -- Get column data type
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'image' 
      AND column_name = 'fileId';
    
    -- Check for NULL values
    SELECT COUNT(*) INTO null_count 
    FROM image 
    WHERE "fileId" IS NULL;
    
    RAISE NOTICE 'Current fileId column type: %', COALESCE(col_type, 'NOT FOUND');
    RAISE NOTICE 'Rows with NULL fileId: %', null_count;
    
    -- If column doesn't exist or is already VARCHAR, skip
    IF col_type IS NULL THEN
        RAISE NOTICE 'Column fileId does not exist. TypeORM will create it.';
        RETURN;
    END IF;
    
    IF col_type = 'character varying' OR col_type = 'varchar' OR col_type = 'text' THEN
        RAISE NOTICE 'Column is already VARCHAR type. No conversion needed.';
        RETURN;
    END IF;
    
    -- If column is UUID type, convert it
    IF col_type = 'uuid' THEN
        RAISE NOTICE 'Converting fileId from UUID to VARCHAR(255)...';
        
        -- Step 1: Add a temporary column with VARCHAR type
        ALTER TABLE image ADD COLUMN "fileId_temp" VARCHAR(255);
        
        -- Step 2: Copy UUID values converted to text
        UPDATE image 
        SET "fileId_temp" = "fileId"::text
        WHERE "fileId" IS NOT NULL;
        
        -- Step 3: Handle any NULL values (shouldn't exist, but just in case)
        UPDATE image 
        SET "fileId_temp" = uuid_generate_v4()::text
        WHERE "fileId_temp" IS NULL;
        
        -- Step 4: Drop the old column and constraint
        ALTER TABLE image DROP CONSTRAINT IF EXISTS "UQ_dc68de0aaebfd1036f21e679aec";
        ALTER TABLE image DROP COLUMN "fileId";
        
        -- Step 5: Rename temp column to fileId
        ALTER TABLE image RENAME COLUMN "fileId_temp" TO "fileId";
        
        -- Step 6: Add NOT NULL constraint and unique constraint
        ALTER TABLE image ALTER COLUMN "fileId" SET NOT NULL;
        ALTER TABLE image ADD CONSTRAINT "UQ_dc68de0aaebfd1036f21e679aec" UNIQUE ("fileId");
        
        RAISE NOTICE '✅ Successfully converted fileId from UUID to VARCHAR(255)';
    ELSE
        RAISE WARNING 'Unknown column type: %. Manual intervention may be required.', col_type;
    END IF;
END $$;

-- Verify the conversion
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'image' 
  AND column_name = 'fileId';

-- Show summary
SELECT 
    COUNT(*) as total_rows,
    COUNT(CASE WHEN "fileId" IS NULL THEN 1 END) as null_fileid_count,
    COUNT(CASE WHEN "fileId" IS NOT NULL THEN 1 END) as valid_fileid_count
FROM image;

