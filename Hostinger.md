# 🚀 Hostinger Docker Manager Quick Setup

This is a simplified guide specifically for deploying to Hostinger Docker Manager.

## 📋 Quick Steps

### 1. Push to Git Repository
```bash
git init
git add .
git commit -m "Initial commit: Opera Profile Merger v1.0.0"
git remote add origin https://github.com/yourusername/opera-profile-merger.git
git push -u origin main
```

### 2. Hostinger Docker Manager Setup

1. **Login to Hostinger Control Panel**
2. **Go to Docker Manager**
3. **Click "Add Docker Service"**

### 3. Configuration

| Setting | Value |
|---------|-------|
| **Repository URL** | `https://github.com/yourusername/opera-profile-merger.git` |
| **Branch** | `main` |
| **Docker Compose File** | `docker-compose.yml` |
| **Port Mapping** | `3000:3000` |

### 4. Environment Variables (Required)

Copy and paste these into Hostinger:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:5432/database_name
OHIP_BASE_URL=https://your-ohip-instance.oraclecloud.com
OHIP_CLIENT_ID=your_client_id
OHIP_CLIENT_SECRET=your_client_secret
OHIP_HOTEL_ID=YOUR_HOTEL_ID
OHAPP_KEY=your_app_key
JWT_SECRET=your_very_secure_jwt_secret_key_change_this
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com
API_BASE_URL=https://your-domain.com/api
AI_CONFIDENCE_THRESHOLD=0.85
MASTER_PROFILE_KEYWORDS=MASTER_PROFILE,DO_NOT_MERGE,PRIMARY_PROFILE
POLLING_INTERVAL=300000
```

### 5. Deploy

1. **Click "Deploy"**
2. **Wait for build to complete** (2-5 minutes)
3. **Check deployment logs**

### 6. Verify Success

Visit these URLs:
- **Main App**: `https://your-domain.com`
- **API Docs**: `https://your-domain.com/api-docs`
- **Health Check**: `https://your-domain.com/api/system/health`

## 🔧 Important Notes

### Database Options

**Option A: Use Hostinger's Managed Database (Recommended)**
- Get database URL from Hostinger
- Add to DATABASE_URL environment variable
- No need to include postgres service in docker-compose

**Option B: Use Container Database**
- Include postgres service in docker-compose
- Add DB credentials to environment variables
- Requires more resources

### OHIP Configuration

You MUST configure these OHIP variables:
- `OHIP_BASE_URL`: Your OHIP instance URL
- `OHIP_CLIENT_ID`: OHIP client ID
- `OHIP_CLIENT_SECRET`: OHIP client secret  
- `OHIP_HOTEL_ID`: Your hotel ID
- `OHAPP_KEY`: OHIP app key

### Security

- Change `JWT_SECRET` to a unique value
- Set `CORS_ORIGIN` to your actual domain
- Use HTTPS (Hostinger provides free SSL)

## 🚨 Troubleshooting

### If Deployment Fails

1. **Check Environment Variables**
   - All required variables must be set
   - No special characters in values
   - Database URL format is correct

2. **Check OHIP Credentials**
   - Verify OHIP_BASE_URL is accessible
   - Test client ID and secret
   - Check hotel ID format

3. **Check Logs in Hostinger**
   - Look for database connection errors
   - Check for missing environment variables
   - Verify port availability

### Common Errors

**Database Connection Error**
```
Error: getaddrinfo ENOTFOUND database
```
→ Fix: DATABASE_URL format is incorrect

**OHIP Authentication Error**
```
Error: Failed to authenticate with OHIP
```
→ Fix: Check OHIP credentials

**Port Already in Use**
```
Error: Port 3000 already allocated
```
→ Fix: Stop existing service or use different port

## 📊 After Deployment

1. **Test the System**
   - Create test profiles in Opera
   - Check if duplicates are detected
   - Verify merge functionality

2. **Monitor Performance**
   - Check Hostinger resource usage
   - Monitor application logs
   - Set up alerts

3. **Configure Master Profiles**
   - Add MASTER_PROFILE keyword to important profiles
   - Test protection functionality

## 🎯 Success Indicators

✅ Health check returns `{"status": "healthy"}`  
✅ API documentation loads at `/api-docs`  
✅ Web interface loads at domain root  
✅ No errors in deployment logs  
✅ Database migrations completed  

## 📞 Support

- **Hostinger Support**: Available 24/7 in control panel
- **Application Issues**: Check GitHub repository
- **OHIP Issues**: Contact Oracle support

---

**🎉 Your system is now live on Hostinger!**

The AI will start detecting duplicate profiles automatically. Check the dashboard for manual review cases.
