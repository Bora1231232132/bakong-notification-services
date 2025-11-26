-- ============================================================================
-- Migration: Add fileHash column to image table for fast duplicate detection
-- ============================================================================
-- This migration adds a fileHash column with index to optimize image upload
-- performance by checking duplicates BEFORE compression
-- 
-- Usage:
--   psql -U <username> -d <database> -f apps/backend/scripts/add-image-filehash-migration.sql
-- 
-- Or via Docker:
--   docker exec -i <container-name> psql -U <username> -d <database> < apps/backend/scripts/add-image-filehash-migration.sql
-- ============================================================================

\echo '🔄 Starting image fileHash migration...'
\echo ''

-- Step 1: Add fileHash column (nullable first, will populate then make unique)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image' 
        AND column_name = 'fileHash'
    ) THEN
        ALTER TABLE image ADD COLUMN "fileHash" VARCHAR(32);
        RAISE NOTICE '✅ Added fileHash column to image table';
    ELSE
        RAISE NOTICE 'ℹ️  image.fileHash already exists';
    END IF;
END$$;

-- Step 2: Create index on fileHash for fast lookups
CREATE INDEX IF NOT EXISTS "IDX_image_fileHash" ON image("fileHash");

\echo '   ✅ Index created on fileHash'
\echo ''

-- Step 3: Populate fileHash for existing images (this may take time for large tables)
\echo '📊 Populating fileHash for existing images...'
\echo '   This may take a few minutes if you have many images...'

DO $$
DECLARE
    image_record RECORD;
    hash_value TEXT;
    processed_count INTEGER := 0;
BEGIN
    FOR image_record IN 
        SELECT id, file FROM image WHERE "fileHash" IS NULL
    LOOP
        -- Compute MD5 hash of the file
        SELECT md5(image_record.file) INTO hash_value;
        
        -- Update the record with the hash
        UPDATE image SET "fileHash" = hash_value WHERE id = image_record.id;
        
        processed_count := processed_count + 1;
        
        -- Log progress every 100 records
        IF processed_count % 100 = 0 THEN
            RAISE NOTICE '   Processed % images...', processed_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Populated fileHash for % existing images', processed_count;
END$$;

\echo '   ✅ Existing images processed'
\echo ''

-- Step 4: Add unique constraint on fileHash (after population)
DO $$
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'UQ_image_fileHash'
    ) THEN
        -- First, handle any duplicate hashes (shouldn't happen, but just in case)
        -- Keep the oldest record for each hash
        DELETE FROM image a
        USING image b
        WHERE a.id > b.id 
        AND a."fileHash" = b."fileHash"
        AND a."fileHash" IS NOT NULL;
        
        -- Now add unique constraint
        ALTER TABLE image ADD CONSTRAINT "UQ_image_fileHash" UNIQUE ("fileHash");
        RAISE NOTICE '✅ Added unique constraint on fileHash';
    ELSE
        RAISE NOTICE 'ℹ️  Unique constraint on fileHash already exists';
    END IF;
END$$;

\echo '   ✅ Unique constraint added'
\echo ''

-- Step 5: Make fileHash NOT NULL (after population and constraint)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image' 
        AND column_name = 'fileHash'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE image ALTER COLUMN "fileHash" SET NOT NULL;
        RAISE NOTICE '✅ Made fileHash NOT NULL';
    ELSE
        RAISE NOTICE 'ℹ️  fileHash is already NOT NULL';
    END IF;
END$$;

\echo ''
\echo '✅ Migration completed successfully!'
\echo ''
\echo '📋 Summary:'
\echo '   - Added fileHash column to image table'
\echo '   - Created index on fileHash for fast lookups'
\echo '   - Populated fileHash for existing images'
\echo '   - Added unique constraint on fileHash'
\echo '   - Made fileHash NOT NULL'
\echo ''
\echo '🚀 Image upload performance should now be significantly faster!'
\echo ''

