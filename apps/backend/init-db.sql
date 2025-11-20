CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('ADMIN_USER', 'NORMAL_USER', 'API_USER');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'send_type_enum') THEN
        CREATE TYPE send_type_enum AS ENUM ('SEND_NOW', 'SEND_SCHEDULE', 'SEND_INTERVAL');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_enum') THEN
        CREATE TYPE platform_enum AS ENUM ('ALL', 'IOS', 'ANDROID');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language_enum') THEN
        CREATE TYPE language_enum AS ENUM ('EN', 'KM', 'JP');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bakong_platform_enum') THEN
        CREATE TYPE bakong_platform_enum AS ENUM ('BAKONG', 'BAKONG_TOURIST', 'BAKONG_JUNIOR');
    END IF;
END$$;

-- Grant privileges to bkns_dev user (created by Docker via POSTGRES_USER)
-- Note: Docker automatically creates the user specified in POSTGRES_USER
GRANT ALL PRIVILEGES ON DATABASE bakong_notification_services_dev TO "bkns_dev";
GRANT ALL PRIVILEGES ON SCHEMA public TO "bkns_dev";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "bkns_dev";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "bkns_dev";

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "bkns_dev";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "bkns_dev";

CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(255),
    role VARCHAR(50) DEFAULT 'USER',
    "failLoginAttempt" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS bakong_user (
    id SERIAL PRIMARY KEY,
    "accountId" VARCHAR(32) NOT NULL,
    "fcmToken" VARCHAR(255) NOT NULL,
    "participantCode" VARCHAR(50),
    platform VARCHAR(50),
    language VARCHAR(10) DEFAULT 'EN',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS image (
    id SERIAL PRIMARY KEY,
    "fileId" VARCHAR(255) NOT NULL UNIQUE,
    file BYTEA,
    "mimeType" VARCHAR(100),
    "originalFileName" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template (
    id SERIAL PRIMARY KEY,
    platforms VARCHAR(255),
    "bakongPlatform" bakong_platform_enum,
    "sendType" send_type_enum DEFAULT 'SEND_NOW',
    "notificationType" VARCHAR(50),
    "categoryType" VARCHAR(50),
    priority INTEGER DEFAULT 1,
    "sendInterval" INTEGER,
    "isSent" BOOLEAN DEFAULT FALSE,
    "sendSchedule" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS template_translation (
    id SERIAL PRIMARY KEY,
    "templateId" INTEGER NOT NULL,
    language language_enum DEFAULT 'EN',
    title VARCHAR(1024) NOT NULL,
    content TEXT NOT NULL,
    "imageId" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "linkPreview" TEXT
);

CREATE TABLE IF NOT EXISTS notification (
    id BIGSERIAL PRIMARY KEY,
    "accountId" VARCHAR(32) NOT NULL,
    "fcmToken" VARCHAR(255) NOT NULL,
    "templateId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "firebaseMessageId" BIGINT,
    "sendCount" INTEGER DEFAULT 1
);

ALTER TABLE template_translation 
ADD CONSTRAINT "FK_template_translation_template" 
FOREIGN KEY ("templateId") REFERENCES template(id) ON DELETE CASCADE;

ALTER TABLE template_translation 
ADD CONSTRAINT "FK_template_translation_image" 
FOREIGN KEY ("imageId") REFERENCES image("fileId") ON DELETE SET NULL;

ALTER TABLE notification 
ADD CONSTRAINT "FK_notification_template" 
FOREIGN KEY ("templateId") REFERENCES template(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "IDX_notification_accountId" ON notification("accountId");
CREATE INDEX IF NOT EXISTS "IDX_notification_templateId" ON notification("templateId");
CREATE INDEX IF NOT EXISTS "IDX_notification_createdAt" ON notification("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_bakong_user_accountId" ON bakong_user("accountId");
CREATE INDEX IF NOT EXISTS "IDX_bakong_user_platform" ON bakong_user(platform);
CREATE INDEX IF NOT EXISTS "IDX_template_sendType" ON template("sendType");
CREATE INDEX IF NOT EXISTS "IDX_template_isSent" ON template("isSent");
CREATE INDEX IF NOT EXISTS "IDX_template_bakongPlatform" ON template("bakongPlatform");
CREATE INDEX IF NOT EXISTS "IDX_template_translation_templateId" ON template_translation("templateId");
CREATE INDEX IF NOT EXISTS "IDX_template_translation_language" ON template_translation(language);
CREATE INDEX IF NOT EXISTS "IDX_user_username" ON "user"(username);
CREATE INDEX IF NOT EXISTS "IDX_user_role" ON "user"(role);
CREATE INDEX IF NOT EXISTS "IDX_image_fileId" ON image("fileId");

COMMENT ON COLUMN notification."sendCount" IS 'Number of times notification has been sent';

DO $$
BEGIN
    RAISE NOTICE 'Bakong Notification Service Database initialized successfully!';
    RAISE NOTICE 'Database: bakong_notification_services';
    RAISE NOTICE 'User: bkns';
    RAISE NOTICE 'Port: 5436 (external), 5436 (internal)';
    RAISE NOTICE 'Container: bakong-notification-services-db';
    RAISE NOTICE 'Notification table created with viewCount column';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Run init-db-data-*.sql to populate with data';
    RAISE NOTICE 'Example: psql -U bkns_dev -d bakong_notification_services_dev -f init-db-data-development.sql';
END$$;
