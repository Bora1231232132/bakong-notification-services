# Test Examples for GET /user API

## API Endpoint

```
GET /user
```

## Authentication

This endpoint requires:

- **JWT Token** in Authorization header
- **Role**: EDITOR (replaces ADMIN_USER)

## Base URL

- **Local Development**: `http://localhost:4004`
- **SIT/Staging**: Check your environment configuration
- **Production**: Check your environment configuration

---

## 1. Basic Request (Get All Users - First Page)

### cURL

```bash
curl -X GET "http://localhost:4004/user" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### JavaScript/Fetch

```javascript
const response = await fetch('http://localhost:4004/user', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
})

const data = await response.json()
console.log(data)
```

### Axios

```javascript
import axios from 'axios'

const response = await axios.get('http://localhost:4004/user', {
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
})

console.log(response.data)
```

---

## 2. With Pagination

### Get Page 2 with 20 items per page

```bash
curl -X GET "http://localhost:4004/user?page=2&size=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### JavaScript

```javascript
const response = await fetch('http://localhost:4004/user?page=2&size=20', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
})
```

---

## 3. With Sorting

### Sort by Name (Ascending)

```bash
curl -X GET "http://localhost:4004/user?sortBy=name&sortOrder=ASC" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Sort by Status (Descending)

```bash
curl -X GET "http://localhost:4004/user?sortBy=status&sortOrder=DESC" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Sort by Created Date (Newest First - Default)

```bash
curl -X GET "http://localhost:4004/user?sortBy=createdAt&sortOrder=DESC" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 4. With Search

### Search by Name or Email

```bash
curl -X GET "http://localhost:4004/user?search=john" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### JavaScript

```javascript
const searchTerm = 'john'
const response = await fetch(
  `http://localhost:4004/user?search=${encodeURIComponent(searchTerm)}`,
  {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
  },
)
```

---

## 5. With Filters

### Filter by Status (Active Users Only)

```bash
curl -X GET "http://localhost:4004/user?status=ACTIVE" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Filter by Role (Editor Users Only)

```bash
curl -X GET "http://localhost:4004/user?role=EDITOR" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Filter by Status and Role

```bash
curl -X GET "http://localhost:4004/user?status=ACTIVE&role=EDITOR" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 6. Combined Parameters

### Search + Filter + Sort + Pagination

```bash
curl -X GET "http://localhost:4004/user?search=john&status=ACTIVE&role=EDITOR&sortBy=name&sortOrder=ASC&page=1&size=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### JavaScript Example

```javascript
const params = new URLSearchParams({
  search: 'john',
  status: 'ACTIVE',
  role: 'EDITOR',
  sortBy: 'name',
  sortOrder: 'ASC',
  page: '1',
  size: '10',
})

const response = await fetch(`http://localhost:4004/user?${params}`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
})
```

---

## 7. Expected Response Format

### Success Response (200 OK)

```json
{
  "responseCode": 0,
  "responseMessage": "Users retrieved successfully",
  "errorCode": 0,
  "data": {
    "users": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john.doe@bakong.com",
        "phoneNumber": "+855 83 223 556",
        "role": "EDITOR",
        "status": "ACTIVE",
        "imageId": "uuid-string-or-null",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      },
      {
        "id": 2,
        "name": "Jane Smith",
        "email": "jane.smith@bakong.com",
        "phoneNumber": "+855 66 346 112",
        "role": "VIEW_ONLY",
        "status": "ACTIVE",
        "imageId": null,
        "createdAt": "2024-01-16T09:15:00.000Z",
        "updatedAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "size": 10,
      "itemCount": 2,
      "pageCount": 1,
      "totalCount": 2,
      "hasPreviousPage": false,
      "hasNextPage": false
    }
  }
}
```

### Error Response (401 Unauthorized)

```json
{
  "responseCode": 1,
  "responseMessage": "Unauthorized",
  "errorCode": 401,
  "data": []
}
```

### Error Response (403 Forbidden - Wrong Role)

```json
{
  "responseCode": 1,
  "responseMessage": "Forbidden resource",
  "errorCode": 403,
  "data": []
}
```

---

## 8. Query Parameters Reference

| Parameter   | Type   | Required | Default   | Description          | Valid Values                         |
| ----------- | ------ | -------- | --------- | -------------------- | ------------------------------------ |
| `page`      | number | No       | 1         | Page number          | >= 1                                 |
| `size`      | number | No       | 10        | Items per page       | 1-100                                |
| `sortBy`    | string | No       | createdAt | Sort column          | name, email, status, role, createdAt |
| `sortOrder` | string | No       | DESC      | Sort direction       | ASC, DESC                            |
| `search`    | string | No       | -         | Search in name/email | Any string                           |
| `status`    | enum   | No       | -         | Filter by status     | ACTIVE, DEACTIVATED                  |
| `role`      | enum   | No       | -         | Filter by role       | VIEW_ONLY, APPROVAL, EDITOR          |

---

## 9. How to Get JWT Token

### Login First

```bash
# Login to get JWT token
curl -X POST "http://localhost:4004/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@bakong.com",
    "password": "your-password"
  }'
```

### Response

```json
{
  "responseCode": 0,
  "responseMessage": "Login successful",
  "errorCode": 0,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin@bakong.com",
      "role": "EDITOR"
    }
  }
}
```

### Use the token

```bash
# Extract token from login response and use it
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET "http://localhost:4004/user" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## 10. Postman Collection Example

### Collection JSON

```json
{
  "info": {
    "name": "Bakong Notification API - Users",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get All Users",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/user?page=1&size=10",
          "host": ["{{base_url}}"],
          "path": ["user"],
          "query": [
            { "key": "page", "value": "1" },
            { "key": "size", "value": "10" }
          ]
        }
      }
    },
    {
      "name": "Get Users - Search",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/user?search=john",
          "host": ["{{base_url}}"],
          "path": ["user"],
          "query": [{ "key": "search", "value": "john" }]
        }
      }
    },
    {
      "name": "Get Users - Filter by Status",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/user?status=ACTIVE",
          "host": ["{{base_url}}"],
          "path": ["user"],
          "query": [{ "key": "status", "value": "ACTIVE" }]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:4004"
    },
    {
      "key": "jwt_token",
      "value": "your-jwt-token-here"
    }
  ]
}
```

---

## 11. Test Scenarios

### Scenario 1: Get First Page

```bash
GET /user?page=1&size=10
```

### Scenario 2: Search for Specific User

```bash
GET /user?search=john.doe
```

### Scenario 3: Get Active Editors Only

```bash
GET /user?status=ACTIVE&role=EDITOR
```

### Scenario 4: Sort by Name Ascending

```bash
GET /user?sortBy=name&sortOrder=ASC
```

### Scenario 5: Get Second Page with Custom Size

```bash
GET /user?page=2&size=20
```

### Scenario 6: Complex Query

```bash
GET /user?search=admin&status=ACTIVE&role=EDITOR&sortBy=createdAt&sortOrder=DESC&page=1&size=15
```

---

## 12. Testing with PowerShell

```powershell
# Set variables
$baseUrl = "http://localhost:4004"
$jwtToken = "YOUR_JWT_TOKEN"

# Basic request
$headers = @{
    "Authorization" = "Bearer $jwtToken"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "$baseUrl/user" -Method Get -Headers $headers
$response | ConvertTo-Json -Depth 10

# With query parameters
$params = @{
    page = 1
    size = 10
    sortBy = "name"
    sortOrder = "ASC"
}

$queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
$response = Invoke-RestMethod -Uri "$baseUrl/user?$queryString" -Method Get -Headers $headers
$response | ConvertTo-Json -Depth 10
```

---

## 13. Testing with Python

```python
import requests

base_url = "http://localhost:4004"
jwt_token = "YOUR_JWT_TOKEN"

headers = {
    "Authorization": f"Bearer {jwt_token}",
    "Content-Type": "application/json"
}

# Basic request
response = requests.get(f"{base_url}/user", headers=headers)
print(response.json())

# With parameters
params = {
    "page": 1,
    "size": 10,
    "search": "john",
    "status": "ACTIVE",
    "sortBy": "name",
    "sortOrder": "ASC"
}

response = requests.get(f"{base_url}/user", headers=headers, params=params)
print(response.json())
```

---

## Notes

1. **Authentication Required**: All requests must include a valid JWT token
2. **Role Required**: User must have `EDITOR` role (replaces old `ADMIN_USER`)
3. **Default Sorting**: If not specified, sorts by `createdAt DESC` (newest first)
4. **Search**: Case-insensitive, searches in both `name` (displayName) and `email` (username)
5. **Pagination**: Maximum `size` is 100 items per page
6. **Enum Values**:
   - **Status**: `ACTIVE`, `DEACTIVATED`
   - **Role**: `VIEW_ONLY`, `APPROVAL`, `EDITOR`
