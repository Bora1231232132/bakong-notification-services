-- Safe migration script to add foreign key constraint for categoryTypeId
-- This version checks if the constraint exists before creating it

-- Step 1: Check if constraint already exists
DO $$
BEGIN
    -- Check if the foreign key constraint already exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_template_category_type'
        AND table_name = 'template'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Add foreign key constraint
        ALTER TABLE template
        ADD CONSTRAINT fk_template_category_type
        FOREIGN KEY (categoryTypeId)
        REFERENCES category_type(id)
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key constraint fk_template_category_type created successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_template_category_type already exists';
    END IF;
END $$;

-- Step 2: Verify the constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    CASE
        WHEN rc.delete_rule = 'SET NULL' THEN '✓ Correct: Will set NULL when category_type is deleted'
        ELSE '⚠ Warning: Delete rule is ' || rc.delete_rule
    END AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'template'
    AND kcu.column_name = 'categoryTypeId';

-- Step 3: Check for any orphaned categoryTypeId values (IDs that don't exist in category_type)
SELECT
    t.id AS template_id,
    t.categoryTypeId,
    t.createdAt,
    'Orphaned: categoryTypeId does not exist in category_type table' AS issue
FROM template t
WHERE t.categoryTypeId IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM category_type ct
        WHERE ct.id = t.categoryTypeId
    );

-- If the above query returns rows, you have orphaned data.
-- You can either:
-- 1. Set them to NULL: UPDATE template SET categoryTypeId = NULL WHERE id IN (...);
-- 2. Or create the missing category_type records first

