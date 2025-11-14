# Bakong Notification Service

A comprehensive notification service built with NestJS backend and Vue 3 frontend, designed for the Bakong payment system.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Git

### Local Development

#### Option 1: Run without Docker (Development Mode)

```bash
# Clone the repository
git clone <repository-url>
cd bakong-notification-service

# Install dependencies
npm run install:all

# Start development environment
npm run dev:all
```

#### Option 2: Run with Docker (Local Testing)

```bash
# Start development environment with Docker
docker-compose up -d --build
# OR use npm script:
npm run docker:up

# View logs
npm run docker:logs

# Stop containers
npm run docker:down

# Access:
# - Frontend: http://localhost:3000
# - API: http://localhost:4001
# - Database: localhost:5437
```

### Docker Compose Files Usage

**Docker Compose doesn't automatically select files based on git branches.** You need to explicitly specify which file to use:

| Environment     | File                            | Command                                                                          | Usage                                    |
| --------------- | ------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------- |
| **Local/Dev**   | `docker-compose.yml`            | `docker-compose up` or `npm run docker:up`                                       | Local testing on your machine            |
| **SIT/Staging** | `docker-compose.sit.yml`        | `docker-compose -f docker-compose.sit.yml up` or `npm run docker:up:sit`         | Deploy to SIT server (10.20.6.57)        |
| **Production**  | `docker-compose.production.yml` | `docker-compose -f docker-compose.production.yml up` or `npm run docker:up:prod` | Deploy to Production server (10.20.6.58) |

**When to use each:**

- **`docker-compose.yml`**: Local testing on your development machine
- **`docker-compose.sit.yml`**: When deploying to SIT/staging environment (typically triggered from `develop` branch)
- **`docker-compose.production.yml`**: When deploying to production (typically triggered from `main`/`master` branch)

### Deployment Flow

#### How NODE_ENV Works

**NODE_ENV is automatically set by Docker Compose** when you deploy:

1. **Local/Dev**: When you run `docker-compose up`, it sets `NODE_ENV=development`
2. **Staging/SIT**: When you run `docker-compose -f docker-compose.sit.yml up`, it sets `NODE_ENV=staging`
3. **Production**: When you run `docker-compose -f docker-compose.production.yml up`, it sets `NODE_ENV=production`

The backend then automatically loads:

- `env.development` when `NODE_ENV=development`
- `env.staging` when `NODE_ENV=staging`
- `env.production` when `NODE_ENV=production`

#### Deployment Steps

**Deploy to SIT/Staging:**

```bash
# SSH to SIT server
ssh deploy@10.20.6.57
# OR use hostname: ssh deploy@sit-bk-notifi-service

# Navigate to project directory and deploy
cd /path/to/project
docker-compose -f docker-compose.sit.yml up -d --build
# OR: npm run docker:up:sit

# Access URLs:
# - Frontend Dashboard: http://10.20.6.57:8090 (or http://sit-bk-notifi-service:8090)
# - API: http://10.20.6.57:4002 (or http://sit-bk-notifi-service:4002)
# - NODE_ENV will be: staging
```

**Deploy to Production:**

```bash
# SSH to Production server
ssh deploy@10.20.6.58
# OR use hostname: ssh deploy@prod-bk-notifi-service

# Navigate to project directory and deploy
cd /path/to/project
docker-compose -f docker-compose.production.yml up -d --build
# OR: npm run docker:up:prod

# Access URLs:
# - Frontend Dashboard: https://10.20.6.58 (or https://prod-bk-notifi-service)
# - API: https://10.20.6.58:8080 (or https://prod-bk-notifi-service:8080)
# - NODE_ENV will be: production
```

#### Dashboard Access & Functionality

**Yes, you can do everything in the dashboard!** When you deploy to staging or production:

✅ **Full Dashboard Features Available:**

- Create and manage notification templates
- Send notifications (scheduled or immediate)
- View notification history and status
- Manage users and permissions
- Upload and manage images
- All features work the same as development

✅ **Environment-Specific URLs:**

| Environment     | Server                              | Frontend URL           | API URL                 | Dashboard Access |
| --------------- | ----------------------------------- | ---------------------- | ----------------------- | ---------------- |
| **Local/Dev**   | localhost                           | http://localhost:3000  | http://localhost:4001   | Full access      |
| **SIT/Staging** | sit-bk-notifi-service (10.20.6.57)  | http://10.20.6.57:8090 | http://10.20.6.57:4002  | Full access      |
| **Production**  | prod-bk-notifi-service (10.20.6.58) | https://10.20.6.58     | https://10.20.6.58:8080 | Full access      |

**Note:**

- Make sure you're on the correct network/VPN to access staging and production servers
- You can use either IP address or hostname (e.g., `10.20.6.57` or `sit-bk-notifi-service`)

## 📁 Project Structure

```
bakong-notification-service/
├── apps/
│   ├── backend/           # NestJS API
│   ├── frontend/          # Vue 3 Frontend
│   └── packages/shared/   # Shared utilities
├── deployment/            # Deployment configurations
│   ├── nginx/            # Nginx configurations
│   └── scripts/          # Deployment scripts
├── scripts/              # Utility scripts
├── docs/                 # Documentation
└── README.md
```

## 🛠️ Technology Stack

### Backend

- **NestJS** - Progressive Node.js framework
- **PostgreSQL** - Database
- **TypeORM** - Object-relational mapping
- **JWT** - Authentication
- **Firebase** - Push notifications

### Frontend

- **Vue 3** - Progressive JavaScript framework
- **Element Plus** - UI component library
- **Pinia** - State management
- **Vite** - Build tool

### Infrastructure

- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **GitLab CI/CD** - Continuous integration

## 🌍 Environments

### Development

- **Docker**:
  - **Frontend URL**: http://localhost:3000 (port 3000)
  - **API**: http://localhost:4001 (port 4001)
  - **Database**: PostgreSQL on port 5437
- **Local Development**:
  - **Frontend URL**: http://localhost:3000
  - **API**: http://localhost:4001
  - **Database**: PostgreSQL on port 5436

### SIT (Staging)

- **Server**: sit-bk-notifi-service (10.20.6.57)
- **URL**: http://10.20.6.57:8090 (port 8090) or http://sit-bk-notifi-service:8090
- **API**: http://10.20.6.57:4002 (port 4002) or http://sit-bk-notifi-service:4002
- **Database**: PostgreSQL on port 5434

### Production

- **Server**: prod-bk-notifi-service (10.20.6.58)
- **URL**: https://10.20.6.58 or https://prod-bk-notifi-service
- **API**: https://10.20.6.58:8080 or https://prod-bk-notifi-service:8080

## 📋 Features

- **User Management** - Authentication and authorization
- **Notification Templates** - Create and manage notification templates
- **Push Notifications** - Firebase integration for mobile notifications
- **Scheduling** - Schedule notifications for future delivery
- **Multi-language Support** - Template translations
- **Image Management** - Upload and manage images
- **Real-time Updates** - Live notification status updates

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start backend in development mode
npm run dev:frontend     # Start frontend in development mode
npm run dev:all          # Start both backend and frontend

# Building
npm run build            # Build backend
npm run build:frontend   # Build frontend
npm run build:all        # Build all applications

# Testing
npm run test             # Run backend tests
npm run test:frontend    # Run frontend tests

# Linting
npm run lint             # Lint all code
npm run format           # Format all code
```

### Environment Configuration

The project uses environment-specific configuration files (NOT `.env` files):

- **Development**: `apps/backend/env.development` - Used when `NODE_ENV=development`
- **Staging/SIT**: `apps/backend/env.staging` - Used when `NODE_ENV=staging`
- **Production**: `apps/backend/env.production` - Used when `NODE_ENV=production`
- **Template**: `apps/backend/env.example` - Example template (copy to create new env files)

**⚠️ Important:** You don't need `.env` files. The system uses `env.${NODE_ENV}` files directly.

**To set up a new environment:**

```bash
# For development
cp apps/backend/env.example apps/backend/env.development
# Edit env.development with your values

# For staging
cp apps/backend/env.example apps/backend/env.staging
# Edit env.staging with your values

# For production
cp apps/backend/env.example apps/backend/env.production
# Edit env.production with your values
```

The backend automatically loads the correct env file based on `NODE_ENV` environment variable.

**Priority (highest to lowest):**

1. Environment variables set in `docker-compose.yml` (override everything)
2. Environment variables from `env.${NODE_ENV}` file (e.g., `env.development`, `env.staging`, `env.production`)
3. Default values in `config.service.ts`

**For Docker deployments:**

- Docker Compose sets `NODE_ENV` which triggers the correct env file
- Docker Compose also sets environment variables that override the env file values
- This ensures Docker-specific configs (like `POSTGRES_HOST=db`) take precedence

## 🚀 Deployment

### Server Setup (One-time)

```bash
# Setup SIT server
ssh deploy@10.20.6.57
# OR: ssh deploy@sit-bk-notifi-service
./deployment/scripts/setup-server.sh

# Setup Production server
ssh deploy@10.20.6.58
# OR: ssh deploy@prod-bk-notifi-service
./deployment/scripts/setup-server.sh
```

### Deploy Application

```bash
# Deploy to SIT (on sit-bk-notifi-service - 10.20.6.57)
ssh deploy@10.20.6.57
cd /path/to/project
docker-compose -f docker-compose.sit.yml up -d --build
# OR: ./deployment/scripts/deploy.sh sit

# Deploy to Production (on prod-bk-notifi-service - 10.20.6.58)
ssh deploy@10.20.6.58
cd /path/to/project
docker-compose -f docker-compose.production.yml up -d --build
# OR: ./deployment/scripts/deploy.sh production
```

### Health Checks

```bash
# Check SIT environment
./scripts/health-check.sh sit

# Check Production environment
./scripts/health-check.sh production
```

## 📊 Monitoring

### Health Endpoints

- **Frontend**: `http://server/health`
- **Backend**: `http://server:4002/health`

### Logs

- **Application Logs**: `/opt/bakong-notification-service/logs/`
- **Nginx Logs**: `/var/log/nginx/`

### Backup

```bash
# Backup database
./scripts/backup.sh sit
./scripts/backup.sh production
```

## 🔒 Security

- JWT-based authentication
- Role-based access control
- HTTPS in production
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](docs/api.md)
- [Frontend Guide](docs/frontend.md)
- [Database Schema](docs/database.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Check the [documentation](docs/)
- Review [troubleshooting guide](DEPLOYMENT.md#troubleshooting)
- Contact the development team

---

**Version**: 1.0.0  
**Last Updated**: $(date)
