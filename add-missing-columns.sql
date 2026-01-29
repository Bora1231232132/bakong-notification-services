-- Add missing columns for V1 Template entity compatibility
ALTER TABLE template ADD COLUMN IF NOT EXISTS "categoryType" varchar(50);

-- Verify
SELECT column_name FROM information_schema.columns WHERE table_name='template' ORDER BY ordinal_position;
