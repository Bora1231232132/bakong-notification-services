-- Migration script to add email column to user table
-- Run this script to add the email column to existing databases

-- Add email column (nullable first to allow migration of existing data)
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);

-- Create index on email column
CREATE INDEX IF NOT EXISTS "IDX_user_email" ON "user" ("email");

-- For existing users, copy username to email if email is null
UPDATE "user"
SET "email" = LOWER("username")
WHERE "email" IS NULL OR "email" = '';

-- Make email column NOT NULL and UNIQUE after data migration
ALTER TABLE "user"
ALTER COLUMN "email" SET NOT NULL;

-- Add unique constraint on email
ALTER TABLE "user"
ADD CONSTRAINT "UQ_user_email" UNIQUE ("email");
