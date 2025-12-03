# Category Type Migration Guide

## 📋 Overview

This guide will help you migrate your database to support the new **Category Type** feature. The migration script creates the `category_type` table and establishes the relationship with the `template` table.

## ✅ What the Migration Does

The migration script (`migrate-category-type-complete.sql`) performs the following steps:

1. **Creates `category_type` table** - Stores category types with icon support
2. **Adds `categoryTypeId` column** - Adds foreign key column to `template` table
3. **Creates indexes** - For better query performance
4. **Adds foreign key constraint** - Ensures data integrity
5. **Adds comments** - Documents the schema
6. **Verifies migration** - Checks that everything was created correctly

## 🚀 How to Run the Migration

### Prerequisites

- PostgreSQL database running
- Access to the database (username and password)
- The migration script file: `apps/backend/scripts/migrate-category-type-complete.sql`

### Method 1: Using psql Command Line (Recommended)

```bash
# Connect to your database and run the script
psql -U <username> -d <database_name> -f apps/backend/scripts/migrate-category-type-complete.sql
```

**Example for Development:**
```bash
psql -U bkns_dev -d bakong_notification_services_dev -f apps/backend/scripts/migrate-category-type-complete.sql
```

**Example for SIT/Staging:**
```bash
psql -U bkns_sit -d bakong_notification_services_sit -f apps/backend/scripts/migrate-category-type-complete.sql
```

### Method 2: Using Docker

If you're using Docker Compose:

```bash
# For development
docker exec -i bakong-notification-services-db-dev psql -U bkns_dev -d bakong_notification_services_dev < apps/backend/scripts/migrate-category-type-complete.sql

# For SIT
docker exec -i bakong-notification-services-db-sit psql -U bkns_sit -d bakong_notification_services_sit < apps/backend/scripts/migrate-category-type-complete.sql
```

### Method 3: Using Database GUI Tool (pgAdmin, DBeaver, etc.)

1. Open your database tool
2. Connect to your database
3. Open the file: `apps/backend/scripts/migrate-category-type-complete.sql`
4. Copy and paste the entire SQL script
5. Execute the script

### Method 4: Using psql Interactive Mode

```bash
# Connect to database
psql -U <username> -d <database_name>

# Inside psql, run:
\i apps/backend/scripts/migrate-category-type-complete.sql
```

## 📊 What to Expect

When you run the migration, you'll see output like this:

```
🔄 Starting category type migration...

📦 Step 1: Creating category_type table...
   ✅ category_type table created

📊 Step 2: Creating indexes on category_type...
   ✅ Indexes created

🔗 Step 3: Adding categoryTypeId column to template table...
   ✅ Column categoryTypeId added to template table

📊 Step 4: Creating index on template.categoryTypeId...
   ✅ Index created

🔗 Step 5: Adding foreign key constraint...
   ✅ Foreign key constraint fk_template_category_type created

📝 Step 6: Adding comments...
   ✅ Comments added

✅ Step 7: Verifying migration...

[Verification results will be shown here]

✅ Category type migration completed!
```

## 🔒 Safety Features

The migration script is **idempotent** - this means:

- ✅ **Safe to run multiple times** - It checks if things already exist before creating them
- ✅ **No data loss** - Existing data in `template` table is preserved
- ✅ **Rollback friendly** - The `categoryTypeId` column is nullable, so existing templates won't break

## ⚠️ Troubleshooting

### Error: "relation category_type does not exist"

**Cause:** The script tried to create a foreign key before the table was created.

**Solution:** Make sure you're running the complete script (`migrate-category-type-complete.sql`), not individual step scripts.

### Error: "constraint already exists"

**Cause:** You've already run the migration before.

**Solution:** This is normal! The script checks for existing constraints and skips them. You can safely ignore this message.

### Error: "column already exists"

**Cause:** The `categoryTypeId` column was already added.

**Solution:** This is also normal! The script checks for existing columns and skips them. The migration is safe to run multiple times.

### Error: "violates foreign key constraint"

**Cause:** You have templates with `categoryTypeId` values that don't exist in the `category_type` table (orphaned data).

**Solution:** 
1. Check for orphaned data:
   ```sql
   SELECT t.id, t."categoryTypeId"
   FROM template t
   WHERE t."categoryTypeId" IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM category_type ct WHERE ct.id = t."categoryTypeId"
     );
   ```

2. Fix orphaned data by setting to NULL:
   ```sql
   UPDATE template 
   SET "categoryTypeId" = NULL 
   WHERE "categoryTypeId" IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM category_type ct WHERE ct.id = template."categoryTypeId"
     );
   ```

3. Then run the migration again.

### Error: "permission denied"

**Cause:** Your database user doesn't have permission to create tables/constraints.

**Solution:** Make sure you're using a user with sufficient privileges (usually the database owner or a superuser).

## ✅ Verification

After running the migration, verify everything worked:

### Check if table exists:
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'category_type';
```

### Check if column exists:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'template' AND column_name = 'categoryTypeId';
```

### Check if foreign key exists:
```sql
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_name = 'fk_template_category_type';
```

## 🎯 Next Steps After Migration

1. **Pull the latest code** from the `feature/setting` branch:
   ```bash
   git pull origin feature/setting
   ```

2. **Install dependencies** (if needed):
   ```bash
   npm install
   ```

3. **Start the backend** - The Category Type API endpoints are now available

4. **Create category types** using the API:
   - `POST /api/v1/category-type` - Create a new category type
   - See `CATEGORY_TYPE_API_TEST.md` for API documentation

5. **Update existing templates** (optional):
   - You can update existing templates to use the new `categoryTypeId` field
   - Templates will work fine with `categoryTypeId = NULL` until you assign them

## 📚 Additional Resources

- **API Testing Guide**: See `CATEGORY_TYPE_API_TEST.md` for API endpoint documentation
- **Database Schema**: Check the `category_type` entity in `apps/backend/src/entities/category-type.entity.ts`

## 🆘 Need Help?

If you encounter any issues:

1. Check the error message carefully
2. Review the troubleshooting section above
3. Check that you're using the correct database credentials
4. Verify the script file path is correct
5. Ask your teammate for assistance

## 📝 Notes

- The migration script includes verification queries at the end
- All steps are logged with clear messages
- The script is designed to be run in any environment (dev, sit, production)
- Always backup your database before running migrations in production

---

**Last Updated:** 2025-01-XX  
**Migration Script:** `migrate-category-type-complete.sql`  
**Author:** Your Team

