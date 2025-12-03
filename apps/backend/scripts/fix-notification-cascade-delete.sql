-- Migration: Fix notification cascade delete when template is deleted
-- This script:
-- 1. Updates the foreign key constraint to CASCADE delete notifications when templates are deleted
-- 2. Cleans up orphaned notification records (those with templateId = NULL or invalid templateId)

-- Step 1: Drop the existing foreign key constraint (if it exists)
-- Note: The constraint name might vary, check your database first
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the foreign key constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'notification'::regclass
      AND contype = 'f'
      AND confrelid = 'template'::regclass;
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE notification DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found between notification and template';
    END IF;
END $$;

-- Step 2: Delete orphaned notification records (those with NULL templateId or invalid templateId)
-- This cleans up the existing bad data
DELETE FROM notification
WHERE templateId IS NULL 
   OR templateId NOT IN (SELECT id FROM template);

-- Step 3: Recreate the foreign key constraint with CASCADE delete
ALTER TABLE notification
ADD CONSTRAINT fk_notification_template
FOREIGN KEY ("templateId")
REFERENCES template(id)
ON DELETE CASCADE;

-- Step 4: Verify the constraint was created correctly
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'notification'::regclass
  AND conname = 'fk_notification_template';

-- Expected output should show: ON DELETE CASCADE

