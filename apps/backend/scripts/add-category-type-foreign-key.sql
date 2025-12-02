-- Migration script to add foreign key constraint for categoryTypeId in template table
-- This ensures categoryTypeId references category_type.id

-- First, check if the foreign key constraint already exists
-- If it exists, drop it first (optional - comment out if you want to keep existing)
-- ALTER TABLE template DROP CONSTRAINT IF EXISTS fk_template_category_type;

-- Add foreign key constraint
-- ON DELETE SET NULL: When a category_type is deleted, set categoryTypeId to NULL in template table
ALTER TABLE template
ADD CONSTRAINT fk_template_category_type
FOREIGN KEY (categoryTypeId)
REFERENCES category_type(id)
ON DELETE SET NULL;

-- Verify the constraint was created
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
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

-- Expected result should show:
-- constraint_name: fk_template_category_type
-- table_name: template
-- column_name: categoryTypeId
-- foreign_table_name: category_type
-- foreign_column_name: id
-- delete_rule: SET NULL

