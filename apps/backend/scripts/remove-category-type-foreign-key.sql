-- Script to remove the foreign key constraint (if needed)
-- Use this if you need to drop the constraint for any reason

-- Remove the foreign key constraint
ALTER TABLE template
DROP CONSTRAINT IF EXISTS fk_template_category_type;

-- Verify it was removed
SELECT
    tc.constraint_name,
    tc.table_name
FROM information_schema.table_constraints AS tc
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'template'
    AND tc.constraint_name = 'fk_template_category_type';

-- Should return 0 rows if successfully removed

