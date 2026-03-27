# 🚀 Hostinger Docker Deployment Guide

This guide will help you deploy the Opera Profile Merger system to Hostinger using Docker Manager.

## 📋 Prerequisites

- Hostinger account with Docker Manager access
- Git repository (GitHub, GitLab, or Bitbucket)
- OHIP API credentials
- Domain name (optional, for HTTPS)

## 🛠️ Step 1: Prepare Your Git Repository

### 1.1 Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit: Opera Profile Merger v1.0.0"
```

### 1.2 Create Remote Repository
- Go to GitHub/GitLab/Bitbucket
- Create a new repository (e.g., `opera-profile-merger`)
- Copy the repository URL

### 1.3 Push to Remote
```bash
git remote add origin <your-repository-url>
git branch -M main
git push -u origin main
```

## 🔧 Step 2: Configure for Hostinger

### 2.1 Update Environment for Production
Create a production environment file:

```bash
# Hostinger-specific configuration
cp .env.example .env.production
```

Edit `.env.production` with Hostinger-specific settings:

```bash
# Application Configuration
NODE_ENV=production
PORT=3000

# Database Configuration (Hostinger provides)
DATABASE_URL=postgresql://username:password@host:5432/database_name

# Redis Configuration (if available)
REDIS_URL=redis://host:6379

# OHIP API Configuration
OHIP_BASE_URL=https://your-ohip-instance.oraclecloud.com
OHIP_CLIENT_ID=your_client_id
OHIP_CLIENT_SECRET=your_client_secret
OHIP_HOTEL_ID=YOUR_HOTEL_ID
OHAPP_KEY=your_app_key

# AI Configuration (tuned for production)
AI_CONFIDENCE_THRESHOLD=0.85
AI_NAME_SIMILARITY_THRESHOLD=0.8
AI_EMAIL_SIMILARITY_THRESHOLD=0.9
AI_PHONE_SIMILARITY_THRESHOLD=0.85
AI_ADDRESS_SIMILARITY_THRESHOLD=0.8

# Business Rules
MASTER_PROFILE_KEYWORDS=MASTER_PROFILE,DO_NOT_MERGE,PRIMARY_PROFILE
POLLING_INTERVAL=300000
MERGE_BATCH_SIZE=50
MAX_MERGE_ATTEMPTS=3

# Security Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here
API_RATE_LIMIT=100
CORS_ORIGIN=https://your-domain.com

# Frontend Configuration
FRONTEND_URL=https://your-domain.com
API_BASE_URL=https://your-domain.com/api
```

### 2.2 Add Production Docker Compose
Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: opera-profile-merger
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - OHIP_BASE_URL=${OHIP_BASE_URL}
      - OHIP_CLIENT_ID=${OHIP_CLIENT_ID}
      - OHIP_CLIENT_SECRET=${OHIP_CLIENT_SECRET}
      - OHIP_HOTEL_ID=${OHIP_HOTEL_ID}
      - OHAPP_KEY=${OHAPP_KEY}
      - AI_CONFIDENCE_THRESHOLD=${AI_CONFIDENCE_THRESHOLD}
      - MASTER_PROFILE_KEYWORDS=${MASTER_PROFILE_KEYWORDS}
      - POLLING_INTERVAL=${POLLING_INTERVAL}
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - FRONTEND_URL=${FRONTEND_URL}
      - API_BASE_URL=${API_BASE_URL}
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    healthcheck:
      test: ["CMD", "node", "src/healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Add PostgreSQL if not using Hostinger's managed database
  # postgres:
  #   image: postgres:15-alpine
  #   container_name: opera-postgres
  #   restart: unless-stopped
  #   environment:
  #     - POSTGRES_DB=${DB_NAME}
  #     - POSTGRES_USER=${DB_USER}
  #     - POSTGRES_PASSWORD=${DB_PASSWORD}
  #   volumes:
  #     - postgres_data:/var/lib/postgresql/data
  #   ports:
  #     - "5432:5432"

# volumes:
#   postgres_data:
```

### 2.3 Update Dockerfile for Production
Ensure your Dockerfile is optimized for production:

```dockerfile
# Use Node.js 18 LTS
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

# Copy node modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY src/ ./src/
COPY database/ ./database/

# Create app directories
RUN mkdir -p logs uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node src/healthcheck.js

# Start the application
CMD ["npm", "start"]
```

## 🌐 Step 3: Deploy to Hostinger

### 3.1 Access Hostinger Docker Manager
1. Log in to Hostinger control panel
2. Navigate to "Docker Manager"
3. Click "Add Docker Service"

### 3.2 Configure Docker Service
1. **Repository URL**: Enter your Git repository URL
2. **Branch**: `main` (or your production branch)
3. **Docker Compose File**: `docker-compose.prod.yml`
4. **Environment Variables**: Add all your production environment variables

### 3.3 Environment Variables Setup
Add these key environment variables in Hostinger:

```bash
NODE_ENV=production
DATABASE_URL=your_hostinger_database_url
OHIP_BASE_URL=your_ohip_base_url
OHIP_CLIENT_ID=your_ohip_client_id
OHIP_CLIENT_SECRET=your_ohip_client_secret
OHIP_HOTEL_ID=your_hotel_id
OHAPP_KEY=your_app_key
JWT_SECRET=your_secure_jwt_secret
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com
API_BASE_URL=https://your-domain.com/api
```

### 3.4 Deploy Settings
- **Port Mapping**: 3000:3000
- **Restart Policy**: Always
- **Health Check**: Enable (uses built-in health check)
- **Resource Limits**: Set appropriate limits based on your plan

### 3.5 Start Deployment
1. Click "Deploy" or "Start Service"
2. Wait for the build to complete
3. Check the deployment logs for any errors

## 🔍 Step 4: Verify Deployment

### 4.1 Check Application Status
```bash
# Health check
curl https://your-domain.com/api/system/health

# Should return:
{
  "status": "healthy",
  "timestamp": "...",
  "version": "1.0.0",
  "environment": "production"
}
```

### 4.2 Access Services
- **Web Interface**: https://your-domain.com
- **API Documentation**: https://your-domain.com/api-docs
- **System Health**: https://your-domain.com/api/system/health

### 4.3 Database Migration
The application will automatically run migrations on startup. Verify:

```bash
# Check migration status
curl https://your-domain.com/api/system/health
# Look for "database": "connected" in response
```

## 🔧 Step 5: Post-Deployment Configuration

### 5.1 Domain Configuration (Optional)
If you have a custom domain:
1. Add DNS A record pointing to Hostinger's IP
2. Configure SSL certificate in Hostinger
3. Update CORS_ORIGIN and FRONTEND_URL

### 5.2 Monitoring Setup
1. Enable Hostinger monitoring
2. Set up alerts for downtime
3. Monitor resource usage

### 5.3 Backup Configuration
1. Configure automatic database backups
2. Set up log rotation
3. Monitor storage usage

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check Hostinger deployment logs
# Look for:
# - Database connection errors
# - Missing environment variables
# - Port conflicts
```

#### Database Connection Issues
```bash
# Verify DATABASE_URL format
# Test connection manually
# Check Hostinger database credentials
```

#### OHIP API Errors
```bash
# Verify OHIP credentials
# Check OHIP_BASE_URL accessibility
# Review API rate limits
```

#### High Memory Usage
```bash
# Increase Hostinger resource limits
# Optimize polling intervals
# Reduce batch sizes
```

### Debug Commands
```bash
# Check container logs in Hostinger
# Test API endpoints manually
# Verify environment variables
# Check database connectivity
```

## 📊 Performance Optimization

### Hostinger-Specific Optimizations

1. **Resource Allocation**
   - Start with minimum required resources
   - Monitor and scale based on usage
   - Consider CPU-optimized plans for AI processing

2. **Database Optimization**
   - Use Hostinger's managed PostgreSQL if available
   - Configure connection pooling
   - Monitor query performance

3. **Caching Strategy**
   - Enable Redis if available
   - Cache frequently accessed profiles
   - Optimize AI similarity calculations

4. **Network Optimization**
   - Use CDN for static assets
   - Enable Gzip compression
   - Optimize API response sizes

## 🔄 Updates and Maintenance

### Updating the Application
1. Push changes to Git repository
2. Trigger redeployment in Hostinger
3. Monitor for any issues
4. Verify functionality

### Database Maintenance
1. Regular backups
2. Log cleanup
3. Performance monitoring
4. Security updates

## 📞 Support

### Hostinger Support
- Docker Manager documentation
- 24/7 customer support
- Community forums

### Application Support
- GitHub issues for bug reports
- Documentation in README.md
- API documentation at `/api-docs`

---

## 🎉 Success!

Your Opera Profile Merger system is now running on Hostinger! 

**Next Steps:**
1. Configure your OHIP credentials
2. Test with sample profiles
3. Monitor the dashboard
4. Set up alerts and monitoring
5. Train your team on the manual review process

**Important URLs:**
- 🏨 Main Application: https://your-domain.com
- 📖 API Documentation: https://your-domain.com/api-docs
- ❤️ Health Check: https://your-domain.com/api/system/health

The system will automatically start detecting and merging duplicate profiles while maintaining complete audit trails and providing manual oversight when needed.
