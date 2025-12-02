-- ============================================================================
-- Sample Template Data Insert Script
-- ============================================================================
-- This script inserts sample templates with proper relationships to category_type
-- Make sure to run create-category-type-table.sql first!
-- ============================================================================

DO $$
DECLARE
    news_category_id INT;
    event_category_id INT;
    product_category_id INT;
    other_category_id INT;
BEGIN
    -- Get category type IDs
    SELECT id INTO news_category_id FROM "category_type" WHERE name = 'NEWS' AND "deletedAt" IS NULL LIMIT 1;
    SELECT id INTO event_category_id FROM "category_type" WHERE name = 'EVENT' AND "deletedAt" IS NULL LIMIT 1;
    SELECT id INTO product_category_id FROM "category_type" WHERE name = 'PRODUCT_AND_FEATURE' AND "deletedAt" IS NULL LIMIT 1;
    SELECT id INTO other_category_id FROM "category_type" WHERE name = 'OTHER' AND "deletedAt" IS NULL LIMIT 1;

    IF news_category_id IS NULL THEN
        RAISE EXCEPTION 'Category types not found! Please run create-category-type-table.sql first.';
    END IF;

    RAISE NOTICE '✅ Found category types. Inserting sample templates...';
    RAISE NOTICE '   NEWS category ID: %', news_category_id;
    IF event_category_id IS NULL THEN
        RAISE NOTICE '   EVENT category ID: (not found - will skip EVENT template)';
    ELSE
        RAISE NOTICE '   EVENT category ID: %', event_category_id;
    END IF;
    IF product_category_id IS NULL THEN
        RAISE NOTICE '   PRODUCT category ID: (not found - will skip PRODUCT template)';
    ELSE
        RAISE NOTICE '   PRODUCT category ID: %', product_category_id;
    END IF;
    IF other_category_id IS NULL THEN
        RAISE NOTICE '   OTHER category ID: (not found - will skip OTHER template)';
    ELSE
        RAISE NOTICE '   OTHER category ID: %', other_category_id;
    END IF;
END $$;

-- ============================================================================
-- Sample Template 1: News Notification (SEND_NOW)
-- ============================================================================
INSERT INTO "template" (
    platforms,
    "sendType",
    "notificationType",
    "categoryType",
    "categoryTypeId",
    priority,
    "isSent",
    "createdBy",
    "updatedBy",
    "createdAt",
    "updatedAt"
) VALUES (
    ARRAY['ALL']::text[],  -- platforms: ALL, IOS, ANDROID
    'SEND_NOW',            -- sendType: SEND_NOW, SEND_SCHEDULE, SEND_INTERVAL
    'FLASH_NOTIFICATION',  -- notificationType: FLASH_NOTIFICATION, INBOX_NOTIFICATION
    'NEWS',                -- categoryType (old enum, kept for backward compatibility)
    (SELECT id FROM "category_type" WHERE name = 'NEWS' AND "deletedAt" IS NULL LIMIT 1),  -- categoryTypeId (new foreign key)
    1,                     -- priority
    false,                 -- isSent
    'admin',               -- createdBy
    'admin',               -- updatedBy
    NOW(),                 -- createdAt
    NOW()                  -- updatedAt
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Sample Template 2: Event Notification (SEND_SCHEDULE)
-- ============================================================================
DO $$
DECLARE
    event_category_id INT;
BEGIN
    SELECT id INTO event_category_id FROM "category_type" WHERE name = 'EVENT' AND "deletedAt" IS NULL LIMIT 1;
    
    IF event_category_id IS NOT NULL THEN
        INSERT INTO "template" (
            platforms,
            "bakongPlatform",
            "sendType",
            "notificationType",
            "categoryType",
            "categoryTypeId",
            priority,
            "isSent",
            "sendSchedule",
            "createdBy",
            "updatedBy",
            "createdAt",
            "updatedAt"
        ) VALUES (
            ARRAY['IOS', 'ANDROID']::text[],
            'BAKONG',
            'SEND_SCHEDULE',
            'INBOX_NOTIFICATION',
            'EVENT',
            event_category_id,
            2,
            false,
            NOW() + INTERVAL '1 day',
            'admin',
            'admin',
            NOW(),
            NOW()
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Inserted EVENT template';
    ELSE
        RAISE NOTICE '⚠️  Skipping EVENT template - category type not found';
    END IF;
END $$;

-- ============================================================================
-- Sample Template 3: Product Feature (SEND_INTERVAL)
-- ============================================================================
DO $$
DECLARE
    product_category_id INT;
BEGIN
    SELECT id INTO product_category_id FROM "category_type" WHERE name = 'PRODUCT_AND_FEATURE' AND "deletedAt" IS NULL LIMIT 1;
    
    IF product_category_id IS NOT NULL THEN
        INSERT INTO "template" (
            platforms,
            "sendType",
            "notificationType",
            "categoryType",
            "categoryTypeId",
            priority,
            "isSent",
            "sendInterval",
            "createdBy",
            "updatedBy",
            "createdAt",
            "updatedAt"
        ) VALUES (
            ARRAY['ALL']::text[],
            'SEND_INTERVAL',
            'FLASH_NOTIFICATION',
            'PRODUCT_AND_FEATURE',
            product_category_id,
            3,
            false,
            '{"cron": "0 9 * * *", "startAt": "2025-01-20T09:00:00Z", "endAt": "2025-01-20T18:00:00Z"}'::json,
            'admin',
            'admin',
            NOW(),
            NOW()
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Inserted PRODUCT_AND_FEATURE template';
    ELSE
        RAISE NOTICE '⚠️  Skipping PRODUCT_AND_FEATURE template - category type not found';
    END IF;
END $$;

-- ============================================================================
-- Sample Template 4: Other Notification (Already Sent)
-- ============================================================================
DO $$
DECLARE
    other_category_id INT;
BEGIN
    SELECT id INTO other_category_id FROM "category_type" WHERE name = 'OTHER' AND "deletedAt" IS NULL LIMIT 1;
    
    IF other_category_id IS NOT NULL THEN
        INSERT INTO "template" (
            platforms,
            "sendType",
            "notificationType",
            "categoryType",
            "categoryTypeId",
            priority,
            "isSent",
            "createdBy",
            "updatedBy",
            "publishedBy",
            "createdAt",
            "updatedAt"
        ) VALUES (
            ARRAY['ANDROID']::text[],
            'SEND_NOW',
            'INBOX_NOTIFICATION',
            'OTHER',
            other_category_id,
            0,
            true,
            'admin',
            'admin',
            'admin',
            NOW() - INTERVAL '2 days',
            NOW() - INTERVAL '1 day'
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Inserted OTHER template';
    ELSE
        RAISE NOTICE '⚠️  Skipping OTHER template - category type not found';
    END IF;
END $$;

-- ============================================================================
-- Sample Template 5: News with Bakong Platform
-- ============================================================================
INSERT INTO "template" (
    platforms,
    "bakongPlatform",
    "sendType",
    "notificationType",
    "categoryType",
    "categoryTypeId",
    priority,
    "isSent",
    "createdBy",
    "updatedBy",
    "createdAt",
    "updatedAt"
) VALUES (
    ARRAY['IOS']::text[],
    'BAKONG_TOURIST',
    'SEND_SCHEDULE',
    'FLASH_NOTIFICATION',
    'NEWS',
    (SELECT id FROM "category_type" WHERE name = 'NEWS' AND "deletedAt" IS NULL LIMIT 1),
    5,
    false,
    'admin',
    'admin',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Display inserted templates with their category type relationships
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Sample Templates Inserted:';
    RAISE NOTICE '============================';
END $$;

SELECT 
    t.id,
    t.platforms,
    t."sendType",
    t."notificationType",
    t."categoryType" AS old_category_type,
    t."categoryTypeId" AS new_category_type_id,
    ct.name AS category_type_name,
    t.priority,
    t."isSent",
    t."createdAt"
FROM "template" t
LEFT JOIN "category_type" ct ON t."categoryTypeId" = ct.id
WHERE t."deletedAt" IS NULL
ORDER BY t.id DESC
LIMIT 10;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Sample template data inserted successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Note: Templates are linked to category_type via categoryTypeId';
    RAISE NOTICE '   The old categoryType enum column is kept for backward compatibility.';
END $$;

