#!/bin/bash
# Test script to verify login functionality

echo "🧪 Testing Login Functionality"
echo ""

CONTAINER="bakong-notification-services-api-sit"
DB_CONTAINER="bakong-notification-services-db-sit"
DB_USER="bkns_sit"
DB_NAME="bakong_notification_services_sit"

echo "1️⃣ Checking database users..."
docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c "
SELECT 
    username, 
    \"displayName\",
    role,
    \"failLoginAttempt\",
    CASE 
        WHEN password = '\$2b\$10\$KXqEgbKH0pKbYTZ9jKFVgOhiUQLOsdcaOpEXjKWdqBh70lua2YIEG' THEN '1234qwer'
        WHEN password = '\$2b\$10\$ko6nN/cHAelEXBGu2lt6guCQt.rP.S6LDSMPlep9yTh/doZjABtn6' THEN 'admin123'
        ELSE 'UNKNOWN'
    END as password_type
FROM public.\"user\" 
WHERE role = 'ADMIN_USER' 
ORDER BY username;
"

echo ""
echo "2️⃣ Testing password verification..."
docker exec ${CONTAINER} node -e "
const bcrypt = require('bcrypt');
const hash1 = '\$2b\$10\$KXqEgbKH0pKbYTZ9jKFVgOhiUQLOsdcaOpEXjKWdqBh70lua2YIEG';
const hash2 = '\$2b\$10\$ko6nN/cHAelEXBGu2lt6guCQt.rP.S6LDSMPlep9yTh/doZjABtn6';
Promise.all([
    bcrypt.compare('1234qwer', hash1),
    bcrypt.compare('admin123', hash2)
]).then(([r1, r2]) => {
    console.log('1234qwer matches hash1:', r1);
    console.log('admin123 matches hash2:', r2);
});
"

echo ""
echo "3️⃣ Testing API login endpoint..."
echo "Testing: So Theany / 1234qwer"
curl -s -X POST http://localhost:4002/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=So Theany&password=1234qwer" | python -m json.tool 2>/dev/null || \
curl -s -X POST http://localhost:4002/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=So Theany&password=1234qwer"

echo ""
echo ""
echo "4️⃣ Testing: admin / admin123"
curl -s -X POST http://localhost:4002/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123" | python -m json.tool 2>/dev/null || \
curl -s -X POST http://localhost:4002/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"

echo ""
echo ""
echo "✅ Test complete!"

