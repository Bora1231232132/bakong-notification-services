#!/bin/bash
# Script to insert admin users on the server database
# Run this on the server: 10.20.6.57

echo "🔧 Inserting admin users into server database..."
echo ""

# Database connection details (from docker-compose.sit.yml)
DB_CONTAINER="bakong-notification-services-db-sit"
DB_USER="bkns_sit"
DB_NAME="bakong_notification_services_sit"

# Check if container exists
if ! docker ps -a --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
    echo "❌ Database container '${DB_CONTAINER}' not found!"
    echo "   Make sure the database is running: docker compose -f docker-compose.sit.yml up -d db"
    exit 1
fi

# Check if container is running
if ! docker ps --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
    echo "❌ Database container '${DB_CONTAINER}' is not running!"
    echo "   Start it with: docker compose -f docker-compose.sit.yml up -d db"
    exit 1
fi

echo "✅ Database container found and running"
echo ""

# Insert users
echo "📝 Inserting users..."
docker exec -i ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} <<EOF
-- Insert ADMIN_USER role users for SIT environment
-- Users: Nguon Rithy, Lun Sim, Meng Horng, Vandoeurn, Seth Sambo, So Theany
-- Password hash for password "1234qwer"
-- Usernames with spaces preserved

-- Insert Nguon Rithy
INSERT INTO public."user" (username, password, "displayName", role, "failLoginAttempt", "createdAt", "updatedAt", "deletedAt") 
VALUES (
    'Nguon Rithy',
    '\$2b\$10\$KXqEgbKH0pKbYTZ9jKFVgOhiUQLOsdcaOpEXjKWdqBh70lua2YIEG',
    'Nguon Rithy',
    'ADMIN_USER',
    0,
    NOW(),
    NOW(),
    NULL
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    "displayName" = EXCLUDED."displayName",
    role = EXCLUDED.role,
    "failLoginAttempt" = 0,
    "updatedAt" = EXCLUDED."updatedAt",
    "deletedAt" = NULL;

-- Insert Lun Sim
INSERT INTO public."user" (username, password, "displayName", role, "failLoginAttempt", "createdAt", "updatedAt", "deletedAt") 
VALUES (
    'Lun Sim',
    '\$2b\$10\$KXqEgbKH0pKbYTZ9jKFVgOhiUQLOsdcaOpEXjKWdqBh70lua2YIEG',
    'Lun Sim',
    'ADMIN_USER',
    0,
    NOW(),
    NOW(),
    NULL
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    "displayName" = EXCLUDED."displayName",
    role = EXCLUDED.role,
    "failLoginAttempt" = 0,
    "updatedAt" = EXCLUDED."updatedAt",
    "deletedAt" = NULL;

-- Insert Meng Horng
INSERT INTO public."user" (username, password, "displayName", role, "failLoginAttempt", "createdAt", "updatedAt", "deletedAt") 
VALUES (
    'Meng Horng',
    '\$2b\$10\$KXqEgbKH0pKbYTZ9jKFVgOhiUQLOsdcaOpEXjKWdqBh70lua2YIEG',
    'Meng Horng',
    'ADMIN_USER',
    0,
    NOW(),
    NOW(),
    NULL
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    "displayName" = EXCLUDED."displayName",
    role = EXCLUDED.role,
    "failLoginAttempt" = 0,
    "updatedAt" = EXCLUDED."updatedAt",
    "deletedAt" = NULL;

-- Insert Vandoeurn
INSERT INTO public."user" (username, password, "displayName", role, "failLoginAttempt", "createdAt", "updatedAt", "deletedAt") 
VALUES (
    'Vandoeurn',
    '\$2b\$10\$KXqEgbKH0pKbYTZ9jKFVgOhiUQLOsdcaOpEXjKWdqBh70lua2YIEG',
    'Vandoeurn',
    'ADMIN_USER',
    0,
    NOW(),
    NOW(),
    NULL
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    "displayName" = EXCLUDED."displayName",
    role = EXCLUDED.role,
    "failLoginAttempt" = 0,
    "updatedAt" = EXCLUDED."updatedAt",
    "deletedAt" = NULL;

-- Insert Seth Sambo
INSERT INTO public."user" (username, password, "displayName", role, "failLoginAttempt", "createdAt", "updatedAt", "deletedAt") 
VALUES (
    'Seth Sambo',
    '\$2b\$10\$KXqEgbKH0pKbYTZ9jKFVgOhiUQLOsdcaOpEXjKWdqBh70lua2YIEG',
    'Seth Sambo',
    'ADMIN_USER',
    0,
    NOW(),
    NOW(),
    NULL
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    "displayName" = EXCLUDED."displayName",
    role = EXCLUDED.role,
    "failLoginAttempt" = 0,
    "updatedAt" = EXCLUDED."updatedAt",
    "deletedAt" = NULL;

-- Insert So Theany
INSERT INTO public."user" (username, password, "displayName", role, "failLoginAttempt", "createdAt", "updatedAt", "deletedAt") 
VALUES (
    'So Theany',
    '\$2b\$10\$KXqEgbKH0pKbYTZ9jKFVgOhiUQLOsdcaOpEXjKWdqBh70lua2YIEG',
    'So Theany',
    'ADMIN_USER',
    0,
    NOW(),
    NOW(),
    NULL
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    "displayName" = EXCLUDED."displayName",
    role = EXCLUDED.role,
    "failLoginAttempt" = 0,
    "updatedAt" = EXCLUDED."updatedAt",
    "deletedAt" = NULL;

-- Update admin password to admin123
UPDATE public."user" 
SET password = '\$2b\$10\$ko6nN/cHAelEXBGu2lt6guCQt.rP.S6LDSMPlep9yTh/doZjABtn6',
    "updatedAt" = NOW()
WHERE username = 'admin';

-- Verify users
SELECT username, "displayName", role, 
    CASE 
        WHEN password = '\$2b\$10\$KXqEgbKH0pKbYTZ9jKFVgOhiUQLOsdcaOpEXjKWdqBh70lua2YIEG' THEN '1234qwer'
        WHEN password = '\$2b\$10\$ko6nN/cHAelEXBGu2lt6guCQt.rP.S6LDSMPlep9yTh/doZjABtn6' THEN 'admin123'
        ELSE 'UNKNOWN'
    END as password_type
FROM public."user" 
WHERE role = 'ADMIN_USER' 
ORDER BY username;
EOF

echo ""
echo "✅ Users inserted successfully!"
echo ""
echo "📋 Login credentials:"
echo "   - Admin: admin / admin123"
echo "   - Others: [Username with spaces] / 1234qwer"
echo "   Example: 'So Theany' / 1234qwer"

