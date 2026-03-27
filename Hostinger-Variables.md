# 📋 Hostinger Environment Variables Guide

## 🔐 **Token Management - Automatic**

✅ **The app handles OHIP tokens automatically** - you DON'T need to provide tokens as environment variables.

**How it works:**
1. App uses `OHIP_CLIENT_ID` + `OHIP_CLIENT_SECRET` to authenticate
2. Automatically obtains access token from OHIP
3. Refreshes token when expired (1 minute before expiry)
4. Handles token failures with automatic retry

**No manual token management required!**

---

## 🚨 **Required Variables (Hostinger Will Prompt)**

These **must be provided** for the system to work:

### **OHIP Configuration (Critical)**
```bash
OHIP_BASE_URL=https://your-ohip-instance.oraclecloud.com
OHIP_CLIENT_ID=your_ohip_client_id
OHIP_CLIENT_SECRET=your_ohip_client_secret
OHIP_HOTEL_ID=YOUR_HOTEL_ID
OHAPP_KEY=your_ohip_app_key

# Optional: Custom OAuth scopes (comma-separated)
# OHIP_SCOPES=profiles.read,profiles.write,merges.execute,search.read

# Optional: System identification
# OHIP_EXTERNAL_SYSTEM=OperaProfileMerger
# OHIP_ORIGINATING_APP=Opera Profile Merger v1.0.0
```

### **Security Configuration (Critical)**
```bash
JWT_SECRET=your_unique_jwt_secret_key_minimum_32_characters
CORS_ORIGIN=https://your-domain.com
```

### **Database Configuration (Hostinger Provides)**
```bash
DATABASE_URL=postgresql://username:password@host:5432/database_name
```

### **Domain Configuration (Required)**
```bash
FRONTEND_URL=https://your-domain.com
API_BASE_URL=https://your-domain.com/api
```

---

## 🎛️ **Optional Variables (Have Defaults)**

These have sensible defaults but can be customized:

### **AI Configuration**
```bash
AI_CONFIDENCE_THRESHOLD=0.85          # Default: 0.85
AI_NAME_SIMILARITY_THRESHOLD=0.8      # Default: 0.8
AI_EMAIL_SIMILARITY_THRESHOLD=0.9     # Default: 0.9
AI_PHONE_SIMILARITY_THRESHOLD=0.85    # Default: 0.85
AI_ADDRESS_SIMILARITY_THRESHOLD=0.8    # Default: 0.8
```

### **Business Rules**
```bash
MASTER_PROFILE_KEYWORDS=MASTER_PROFILE,DO_NOT_MERGE,PRIMARY_PROFILE
POLLING_INTERVAL=300000               # Default: 5 minutes
MERGE_BATCH_SIZE=50                   # Default: 50
MAX_MERGE_ATTEMPTS=3                  # Default: 3
```

### **Optional Features**
```bash
REDIS_URL=redis://host:6379          # Optional caching
LOG_LEVEL=info                        # Default: info
API_RATE_LIMIT=100                    # Default: 100
```

### **Email Notifications (Optional)**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=Opera Profile Merger <noreply@yourdomain.com>
```

---

## 📝 **Hostinger Setup Process**

### **Step 1: Add Docker Service**
1. Repository URL: `https://github.com/yourusername/opera-profile-merger.git`
2. Branch: `main`
3. Docker Compose File: `docker-compose.hostinger.yml`

### **Step 2: Environment Variables**
Hostinger will **prompt for variables** that use `${VARIABLE_NAME}` syntax.

**Required variables will be prompted automatically:**
- ✅ OHIP_BASE_URL
- ✅ OHIP_CLIENT_ID  
- ✅ OHIP_CLIENT_SECRET
- ✅ OHIP_HOTEL_ID
- ✅ OHAPP_KEY
- ✅ JWT_SECRET
- ✅ CORS_ORIGIN
- ✅ DATABASE_URL (provided by Hostinger)
- ✅ FRONTEND_URL
- ✅ API_BASE_URL

### **Step 3: Configure Values**

#### **OHIP Settings Example:**
```bash
OHIP_BASE_URL=https://yourhotel.ohip.oraclecloud.com
OHIP_CLIENT_ID=your_client_id_here
OHIP_CLIENT_SECRET=your_client_secret_here
OHIP_HOTEL_ID=HOTEL123
OHAPP_KEY=your_app_key_here

# Optional: Custom scopes if needed
# OHIP_SCOPES=profiles.read,profiles.write,merges.execute,search.read

# Optional: System identification
# OHIP_EXTERNAL_SYSTEM=MyHotelSystem
# OHIP_ORIGINATING_APP=My Hotel Merger v2.0.0
```

#### **Security Settings Example:**
```bash
JWT_SECRET=super_secret_key_change_this_to_something_random_and_long_12345
CORS_ORIGIN=https://yourhotel.com
```

#### **Domain Settings Example:**
```bash
FRONTEND_URL=https://yourhotel.com
API_BASE_URL=https://yourhotel.com/api
```

---

## 🔍 **Validation on Startup**

The app will validate configuration on startup and fail fast if required variables are missing:

```
❌ Missing required OHIP configuration: baseUrl, clientId, clientSecret
✅ OHIP configuration validated successfully
```

---

## 🚀 **Quick Start Template**

Copy this template for your Hostinger environment variables:

```bash
# === REQUIRED VARIABLES ===
OHIP_BASE_URL=https://your-ohip.oraclecloud.com
OHIP_CLIENT_ID=your_client_id
OHIP_CLIENT_SECRET=your_client_secret
OHIP_HOTEL_ID=YOUR_HOTEL_ID
OHAPP_KEY=your_app_key
JWT_SECRET=your_unique_jwt_secret_minimum_32_characters
CORS_ORIGIN=https://your-domain.com
DATABASE_URL=postgresql://user:pass@host:5432/dbname
FRONTEND_URL=https://your-domain.com
API_BASE_URL=https://your-domain.com/api

# === OPTIONAL VARIABLES (uncomment to customize) ===
# OHIP_SCOPES=profiles.read,profiles.write,merges.execute,search.read
# OHIP_EXTERNAL_SYSTEM=OperaProfileMerger
# OHIP_ORIGINATING_APP=Opera Profile Merger v1.0.0
# AI_CONFIDENCE_THRESHOLD=0.85
# MASTER_PROFILE_KEYWORDS=MASTER_PROFILE,DO_NOT_MERGE,PRIMARY_PROFILE
# POLLING_INTERVAL=300000
# LOG_LEVEL=info
```

---

## 🎯 **Key Points**

✅ **Tokens are automatic** - no manual token management needed  
✅ **Required variables are prompted** by Hostinger automatically  
✅ **Optional variables have defaults** - system works out of the box  
✅ **Validation on startup** - fails fast if configuration is wrong  
✅ **Secure defaults** - production-ready security settings  

---

## 📞 **Troubleshooting**

### **Variable Not Prompted?**
- Check if variable is used in `docker-compose.hostinger.yml`
- Ensure syntax is `${VARIABLE_NAME}` (not `$VARIABLE_NAME`)
- Restart the deployment process

### **Missing Required Variable?**
- App will fail to start with clear error message
- Check Hostinger deployment logs
- Add missing variable and redeploy

### **OHIP Authentication Issues?**
- Verify OHIP_BASE_URL is accessible
- Check client ID and secret are correct
- Ensure hotel ID matches your OHIP setup

---

**🎉 That's it! The app handles tokens automatically and Hostinger will prompt for required variables.**
