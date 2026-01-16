-- ============================================================================
-- Create Verification Token Table Migration
-- ============================================================================
-- This script creates the verification_token table and related enum type
-- It's safe to run multiple times (idempotent) - checks before creating
--
-- Usage (via psql):
--   psql -U <username> -d <database> -f apps/backend/scripts/create-verification-token-table.sql
--
-- Usage (via Docker):
--   docker exec -i <container-name> psql -U <username> -d <database> < apps/backend/scripts/create-verification-token-table.sql
--
-- Usage (via any SQL client):
--   Copy and paste the SQL below (without \echo commands)
-- ============================================================================

-- ============================================================================
-- Step 1: Create Enum Type
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_token_type_enum') THEN
        CREATE TYPE verification_token_type_enum AS ENUM (
            'EMAIL_VERIFICATION',
            'PASSWORD_RESET',
            'ACCOUNT_ACTIVATION'
        );
        RAISE NOTICE '✅ Created verification_token_type_enum';
    ELSE
        RAISE NOTICE 'ℹ️  verification_token_type_enum already exists';
    END IF;
END$$;

-- ============================================================================
-- Step 2: Create Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS verification_token (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    "userId" INTEGER NOT NULL,
    type verification_token_type_enum NOT NULL DEFAULT 'EMAIL_VERIFICATION',
    "expiresAt" TIMESTAMP NOT NULL,
    "usedAt" TIMESTAMP NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Step 3: Create Index on Token Column
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_verification_token_token ON verification_token(token);

-- ============================================================================
-- Step 4: Create Foreign Key Constraint
-- ============================================================================
DO $$
BEGIN
    -- Check if foreign key already exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'FK_verification_token_userId'
        AND table_name = 'verification_token'
    ) THEN
        -- Check if user table exists first
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user') THEN
            ALTER TABLE verification_token
            ADD CONSTRAINT FK_verification_token_userId
            FOREIGN KEY ("userId")
            REFERENCES "user"(id)
            ON DELETE CASCADE;

            RAISE NOTICE '✅ Created foreign key constraint FK_verification_token_userId';
        ELSE
            RAISE WARNING '⚠️  user table does not exist - skipping foreign key creation';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  Foreign key constraint FK_verification_token_userId already exists';
    END IF;
END$$;

-- ============================================================================
-- Step 5: Grant Privileges
-- ============================================================================
DO $$
BEGIN
    -- Grant to bkns_dev (development)
    IF EXISTS (SELECT 1 FROM pg_user WHERE usename = 'bkns_dev') THEN
        GRANT ALL PRIVILEGES ON TABLE verification_token TO "bkns_dev";
        GRANT USAGE, SELECT ON SEQUENCE verification_token_id_seq TO "bkns_dev";
        RAISE NOTICE '✅ Granted privileges to bkns_dev';
    END IF;

    -- Grant to bkns_sit (staging)
    IF EXISTS (SELECT 1 FROM pg_user WHERE usename = 'bkns_sit') THEN
        GRANT ALL PRIVILEGES ON TABLE verification_token TO "bkns_sit";
        GRANT USAGE, SELECT ON SEQUENCE verification_token_id_seq TO "bkns_sit";
        RAISE NOTICE '✅ Granted privileges to bkns_sit';
    END IF;

    -- Grant to bkns (production)
    IF EXISTS (SELECT 1 FROM pg_user WHERE usename = 'bkns') THEN
        GRANT ALL PRIVILEGES ON TABLE verification_token TO "bkns";
        GRANT USAGE, SELECT ON SEQUENCE verification_token_id_seq TO "bkns";
        RAISE NOTICE '✅ Granted privileges to bkns';
    END IF;
END$$;
