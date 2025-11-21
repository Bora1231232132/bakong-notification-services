# Database Migration Guide

## Overview

The unified migration file (`unified-migration.sql`) combines all database initialization and migrations into one idempotent script. It's safe to run multiple times - it checks if tables, columns, constraints, and indexes exist before creating them.

## Files

- **`unified-migration.sql`** - Main migration file (combines init + all migrations)
- **`../scripts/run-migration.sh`** - Script to run migration on any environment
- **`../../RUN_MIGRATION_ON_DEPLOY.sh`** - Auto-run migration on deployment

## Usage

### Manual Migration

Run migration manually on any environment:

```bash
# Production
bash utils-server.sh db-migrate

# SIT
bash utils-server.sh db-migrate

# Development
bash utils-server.sh db-migrate

# Or use the unified command (auto-detects environment)
bash RUN_MIGRATION_ON_DEPLOY.sh
```

### Automatic Migration on Deployment

After pulling code or deploying:

```bash
bash RUN_MIGRATION_ON_DEPLOY.sh
```

This script:

1. Detects the environment automatically
2. Runs the unified migration
3. Ensures database schema is up to date

### Direct SQL Execution

You can also run the SQL file directly:

```bash
# Via Docker
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services < apps/backend/migrations/unified-migration.sql

# Or via psql (if you have direct access)
psql -U bkns -d bakong_notification_services -f apps/backend/migrations/unified-migration.sql
```

## What It Does

The unified migration:

1. ✅ Creates PostgreSQL extensions (uuid-ossp, pgcrypto)
2. ✅ Creates enum types (user_role_enum, send_type_enum, platform_enum, language_enum, bakong_platform_enum)
3. ✅ Grants privileges to database users
4. ✅ Creates all tables (user, bakong_user, image, template, template_translation, notification)
5. ✅ Adds migration columns:
   - `template.bakongPlatform`
   - `bakong_user.bakongPlatform`
   - `template.createdBy`
   - `template.updatedBy`
   - `template.publishedBy`
6. ✅ Creates foreign key constraints
7. ✅ Creates indexes for performance
8. ✅ Adds column comments

## Idempotency

The script is **idempotent** - safe to run multiple times:

- ✅ Checks if extensions exist before creating
- ✅ Checks if enum types exist before creating
- ✅ Uses `CREATE TABLE IF NOT EXISTS` for tables
- ✅ Checks if columns exist before adding
- ✅ Checks if constraints exist before adding
- ✅ Uses `CREATE INDEX IF NOT EXISTS` for indexes

## Adding New Migrations

When you need to add new tables or columns:

1. **Edit `unified-migration.sql`**:
   - Add new table creation with `CREATE TABLE IF NOT EXISTS`
   - Add new column with `DO $$ BEGIN IF NOT EXISTS ... THEN ALTER TABLE ... END IF; END$$;`
   - Add new indexes with `CREATE INDEX IF NOT EXISTS`
   - Add new constraints with existence checks

2. **Test the migration**:

   ```bash
   # Test on dev first
   bash utils-server.sh db-migrate
   ```

3. **Commit and deploy**:
   - The migration will run automatically on deployment via `RUN_MIGRATION_ON_DEPLOY.sh`
   - Or run manually: `bash RUN_MIGRATION_ON_DEPLOY.sh`

## Example: Adding a New Column

```sql
-- Add newColumn to template table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'template'
        AND column_name = 'newColumn'
    ) THEN
        ALTER TABLE template ADD COLUMN "newColumn" VARCHAR(255);
        RAISE NOTICE '✅ Added newColumn to template table';
    ELSE
        RAISE NOTICE 'ℹ️  template.newColumn already exists';
    END IF;
END$$;
```

## Troubleshooting

### Migration Fails

1. Check database container is running:

   ```bash
   docker ps | grep bakong-notification-services-db
   ```

2. Check database logs:

   ```bash
   docker logs bakong-notification-services-db
   ```

3. Verify database connection:
   ```bash
   docker exec -it bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "SELECT version();"
   ```

### Column Already Exists Error

This shouldn't happen with the unified migration (it checks first), but if it does:

1. The migration is idempotent, so you can safely re-run it
2. Check the actual database state:
   ```bash
   docker exec -it bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "\d template"
   ```

## Best Practices

1. ✅ **Always test migrations on dev first**
2. ✅ **Run `RUN_MIGRATION_ON_DEPLOY.sh` after every deployment**
3. ✅ **Keep the unified migration file as the single source of truth**
4. ✅ **Add new changes to `unified-migration.sql`, not separate files**
5. ✅ **Use existence checks for all operations**

## Integration with CI/CD

You can add migration to your deployment pipeline:

```yaml
# Example GitHub Actions step
- name: Run Database Migration
  run: |
    ssh user@server "cd ~/bakong-notification-services && bash RUN_MIGRATION_ON_DEPLOY.sh"
```

Or add to your deployment script:

```bash
#!/bin/bash
# deploy.sh
git pull
bash RUN_MIGRATION_ON_DEPLOY.sh
docker-compose -f docker-compose.production.yml up -d --build
```
