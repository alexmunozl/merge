# 🔐 OHIP Configuration Guide

## 📋 OAuth Scopes Configuration

### **Required vs Optional Scopes**

OHIP uses OAuth 2.0 with specific scopes for different operations. The system will work with default scopes, but you can customize them for your specific needs.

### **Default Scopes (Built-in)**
If you don't specify `OHIP_SCOPES`, the system uses these defaults:
```bash
profiles.read      # Read profile information
profiles.write     # Create/update profiles  
profiles.delete    # Delete profiles
merges.execute     # Execute merge operations
merges.read        # Read merge information
search.read        # Search and query operations
```

### **Custom Scopes (Optional)**
You can specify custom scopes via environment variable:
```bash
OHIP_SCOPES=profiles.read,profiles.write,merges.execute,search.read
```

### **Available Scopes**
```bash
# Profile Management
profiles.read      # Read profile data
profiles.write     # Create/update profiles
profiles.delete    # Delete profiles

# Merge Operations  
merges.execute     # Execute profile merges
merges.read        # Get merge snapshots/history

# Search Operations
search.read        # Search profiles and query data

# Full Access (if available)
full_access        # All operations (use with caution)
```

---

## 🌐 Dynamic Headers Configuration

### **How Headers Work**

The system automatically manages OHIP headers based on the API endpoint being called. Different endpoints require different headers.

### **Standard Headers (Always Included)**
```bash
Authorization: Bearer <access_token>    # OAuth token (auto-managed)
x-app-key: <your_app_key>              # Your OHIP app key
x-hotelid: <hotel_code>                # Hotel identifier
Content-Type: application/json        # Request format
Accept: application/json             # Response format
```

### **Dynamic Headers (Endpoint-Specific)**

#### **Merge Operations** - Always include tracking
```bash
x-request-id: ~<uuid>                 # Required for audit trail
x-externalsystem: OperaProfileMerger   # System identifier
x-originating-application: Opera Profile Merger v1.0.0
```

#### **Profile Operations** - Optional tracking
```bash
x-request-id: ~<uuid>                 # Request tracking
x-externalsystem: OperaProfileMerger   # System identifier
Accept-Language: en-US                 # Language preference
```

#### **Search Operations** - Optional tracking
```bash
x-request-id: ~<uuid>                 # Request tracking
x-externalsystem: OperaProfileMerger   # System identifier
```

---

## 🔧 Environment Variables

### **Required OHIP Variables**
```bash
# Core OHIP Configuration
OHIP_BASE_URL=https://your-instance.oraclecloud.com
OHIP_CLIENT_ID=your_client_id
OHIP_CLIENT_SECRET=your_client_secret
OHIP_HOTEL_ID=YOUR_HOTEL_ID
OHAPP_KEY=your_app_key
```

### **Optional OHIP Variables**
```bash
# OAuth Scopes (comma-separated)
OHIP_SCOPES=profiles.read,profiles.write,merges.execute

# System Identification
OHIP_EXTERNAL_SYSTEM=OperaProfileMerger
OHIP_ORIGINATING_APP=Opera Profile Merger v1.0.0

# API Behavior
OHIP_TIMEOUT=30000                      # Request timeout in ms
OHIP_RETRY_ATTEMPTS=3                   # Retry attempts
```

---

## ✅ Header Validation

The system validates headers according to OHIP specifications:

### **Header Patterns**
```bash
x-app-key:        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}$/
x-request-id:     /^~*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
x-hotelid:        /^[A-Z0-9_]{1,20}$/
x-externalsystem: /^.{1,40}$/
Accept-Language: /^[a-z]{2}-[A-Z]{2}$/
```

### **Validation Examples**
✅ **Valid**: `x-app-key: 12345678-1234-4123-9123-123456789abc`  
❌ **Invalid**: `x-app-key: invalid-key`  
✅ **Valid**: `x-request-id: ~12345678-1234-4123-9123-123456789abc`  
❌ **Invalid**: `x-request-id: invalid-id`

---

## 🔄 Token Management

### **Automatic Token Handling**
✅ **No manual token management required**  
✅ **Automatic token refresh** (1 minute before expiry)  
✅ **Scope-based authentication**  
✅ **Error handling with retry**  

### **Token Flow**
1. **Authentication**: System uses `client_id` + `client_secret` + `scopes`
2. **Token Request**: `POST /oauth/token` with specified scopes
3. **Token Storage**: Kept in memory, never in environment variables
4. **Auto Refresh**: Refreshes when expired
5. **Error Recovery**: Automatic retry on token failures

---

## 🎯 Configuration Examples

### **Minimal Configuration (Recommended)**
```bash
# Required only
OHIP_BASE_URL=https://yourhotel.ohip.oraclecloud.com
OHIP_CLIENT_ID=your_client_id
OHIP_CLIENT_SECRET=your_client_secret
OHIP_HOTEL_ID=HOTEL123
OHAPP_KEY=your_app_key

# System will use default scopes and headers
```

### **Advanced Configuration**
```bash
# Required
OHIP_BASE_URL=https://yourhotel.ohip.oraclecloud.com
OHIP_CLIENT_ID=your_client_id
OHIP_CLIENT_SECRET=your_client_secret
OHIP_HOTEL_ID=HOTEL123
OHAPP_KEY=your_app_key

# Custom scopes
OHIP_SCOPES=profiles.read,profiles.write,merges.execute,search.read

# Custom system identification
OHIP_EXTERNAL_SYSTEM=MyHotelSystem
OHIP_ORIGINATING_APP=My Hotel Merger v2.0.0

# Custom timeouts
OHIP_TIMEOUT=60000
OHIP_RETRY_ATTEMPTS=5
```

---

## 🔍 Troubleshooting

### **Scope Issues**
```
Error: insufficient_scope for endpoint /profiles/{id}/merges
```
→ **Solution**: Add `merges.execute` to `OHIP_SCOPES`

### **Header Validation Issues**
```
Warning: Header x-app-key validation failed
```
→ **Solution**: Verify `OHAPP_KEY` matches OHIP app key format

### **Authentication Issues**
```
Error: Failed to authenticate with OHIP
```
→ **Solution**: Check `OHIP_CLIENT_ID` and `OHIP_CLIENT_SECRET`

### **Timeout Issues**
```
Error: Request timeout
```
→ **Solution**: Increase `OHIP_TIMEOUT` value

---

## 📊 Endpoint-Specific Requirements

### **Merge Operations**
- **Required Scopes**: `merges.execute`
- **Required Headers**: `x-app-key`, `x-hotelid`, `Authorization`
- **Always Included**: `x-request-id` (for audit trail)

### **Profile Search**
- **Required Scopes**: `search.read`, `profiles.read`
- **Required Headers**: `x-app-key`, `x-hotelid`, `Authorization`
- **Optional**: `x-request-id`, `x-externalsystem`

### **Profile Updates**
- **Required Scopes**: `profiles.write`
- **Required Headers**: `x-app-key`, `x-hotelid`, `Authorization`
- **Optional**: `x-request-id`, `x-externalsystem`

---

## 🎉 Best Practices

### **Scopes**
✅ **Use minimum required scopes** for security  
✅ **Default scopes work for most use cases**  
✅ **Custom scopes only when needed**  

### **Headers**
✅ **System handles headers automatically**  
✅ **No manual header management needed**  
✅ **Validation ensures OHIP compliance**  

### **Tokens**
✅ **Never store tokens in environment variables**  
✅ **System refreshes tokens automatically**  
✅ **Tokens kept secure in memory only**  

---

**🚀 Your OHIP integration is now fully configured with proper scopes and dynamic header management!**
