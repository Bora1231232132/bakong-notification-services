-- Fix platforms column format inconsistency
-- Some records have ["{\"ALL\"}"] (array with JSON string) instead of ["ALL"] (proper array)
-- This script normalizes all platforms to the correct format: ["ALL"]

DO $$
DECLARE
    affected_count INTEGER := 0;
    record_count INTEGER := 0;
BEGIN
    -- Count total records
    SELECT COUNT(*) INTO record_count FROM template WHERE platforms IS NOT NULL;
    RAISE NOTICE '📊 Total templates with platforms: %', record_count;

    -- Fix platforms that contain nested JSON strings like ["{\"ALL\"}"]
    -- Convert them to proper array format: ["ALL"]
    -- PostgreSQL arrays are stored as {value1,value2}, so ["{\"ALL\"}"] becomes {"{\"ALL\"}"}
    UPDATE template
    SET platforms = CASE
        -- Handle array with JSON string: {"{\"ALL\"}"} -> {"ALL"}
        -- Check if first element contains JSON-like structure
        WHEN array_length(platforms, 1) > 0 AND (
            platforms[1]::text LIKE '{%ALL%}%' 
            OR platforms[1]::text LIKE '{%IOS%}%' 
            OR platforms[1]::text LIKE '{%ANDROID%}%'
            OR platforms[1]::text LIKE '%"ALL"%'
            OR platforms[1]::text LIKE '%"IOS"%'
            OR platforms[1]::text LIKE '%"ANDROID"%'
        ) THEN
            -- Extract the platform value from nested JSON string
            ARRAY[
                CASE
                    WHEN platforms[1]::text LIKE '%ALL%' AND platforms[1]::text NOT LIKE '%IOS%' AND platforms[1]::text NOT LIKE '%ANDROID%' THEN 'ALL'
                    WHEN platforms[1]::text LIKE '%IOS%' THEN 'IOS'
                    WHEN platforms[1]::text LIKE '%ANDROID%' THEN 'ANDROID'
                    ELSE 'ALL'
                END
            ]::TEXT[]
        -- Handle empty arrays or NULL -> ["ALL"]
        WHEN platforms IS NULL OR array_length(platforms, 1) IS NULL OR array_length(platforms, 1) = 0 THEN
            ARRAY['ALL']::TEXT[]
        -- Already correct format, keep as is
        ELSE
            platforms
    END
    WHERE 
        -- Only update records that need fixing
        (
            -- Check if array has elements that look like JSON strings
            (array_length(platforms, 1) > 0 AND (
                platforms[1]::text LIKE '{%ALL%}%' 
                OR platforms[1]::text LIKE '{%IOS%}%' 
                OR platforms[1]::text LIKE '{%ANDROID%}%'
                OR platforms[1]::text LIKE '%"ALL"%'
                OR platforms[1]::text LIKE '%"IOS"%'
                OR platforms[1]::text LIKE '%"ANDROID"%'
            ))
            OR platforms IS NULL 
            OR array_length(platforms, 1) IS NULL 
            OR array_length(platforms, 1) = 0
        );

    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RAISE NOTICE '✅ Fixed % template(s) with incorrect platforms format', affected_count;

    -- Verify: Show sample of fixed records
    RAISE NOTICE '📋 Sample of platforms after fix:';
    FOR record_count IN 1..LEAST(5, (SELECT COUNT(*) FROM template WHERE platforms IS NOT NULL))
    LOOP
        DECLARE
            sample_id INTEGER;
            sample_platforms TEXT;
        BEGIN
            SELECT id, platforms::text INTO sample_id, sample_platforms 
            FROM template 
            WHERE platforms IS NOT NULL 
            ORDER BY id 
            LIMIT 1 OFFSET (record_count - 1);
            
            IF sample_id IS NOT NULL THEN
                RAISE NOTICE '   Template ID %: platforms = %', sample_id, sample_platforms;
            END IF;
        END;
    END LOOP;

    RAISE NOTICE '✅ Platforms format normalization complete!';
END $$;
