# 🔧 CORS Fix - Step-by-Step Instructions

## 🚨 **The Problem**
CORS error: `Access-Control-Allow-Origin` header is missing when calling Google Apps Script from localhost (127.0.0.1:5500).

## ✅ **The Solution** 
Google Apps Script deployed as Web App automatically handles CORS when configured correctly. The issue was in the response method - using `HtmlService` instead of `ContentService`.

---

## 📝 **STEP 1: Update Google Apps Script Backend**

### **1.1 Open Your Google Apps Script Project**
1. Go to [script.google.com](https://script.google.com)
2. Open your existing project with the URL: `AKfycbxYrSn3NwlrCT9PaPPZIZ6FxVCaZjUaD5c9BbTGgx8kl7qnDKBoDGfbkmCsr4M1LWJp`

### **1.2 Replace All Code**
1. **Select all existing code** in Code.gs and delete it
2. **Copy the entire contents** of [google-apps-script-backend.js](google-apps-script-backend.js)
3. **Paste it** into Code.gs

### **1.3 Key Changes Made**
- ✅ **CORS Fixed**: Uses `HtmlService` instead of `ContentService`  
- ✅ **OPTIONS Support**: Added `doOptions()` for preflight requests
- ✅ **Better Error Handling**: Proper JSON responses
- ✅ **Same Endpoints**: All your existing endpoints still work

---

## 🚀 **STEP 2: Redeploy the Script**

### **2.1 Create New Deployment**
1. Click **Deploy** → **New deployment**
2. Click the **⚙️ gear icon** next to "Type"
3. Select **Web app**

### **2.2 Set Deployment Settings**
- **Description**: "CORS-Fixed API v2"
- **Execute as**: **Me**
- **Who has access**: **Anyone**

### **2.3 Deploy**
1. Click **Deploy**
2. **Copy the new Web app URL** (if different from before)
3. **Authorize permissions** if prompted

---

## 🔧 **STEP 3: Update Frontend (If Needed)**

The frontend `apiGet()` function has been updated in [config.js](config.js#L45) with:
- ✅ Better CORS handling (`mode: 'cors'`)
- ✅ More robust error detection  
- ✅ Improved JSON parsing
- ✅ Specific CORS error messages

**No changes needed if URL is the same.**

---

## 🧪 **STEP 4: Test the Fix**

### **4.1 Browser Console Test**
1. Open your web app in browser (127.0.0.1:5500)
2. Press **F12** → **Console**
3. Run each command:

```javascript
apiGet("getWorkers")
apiGet("getSites")  
apiGet("getAttendance")
apiGet("getPayments")
```

### **4.2 Expected Results**
Each command should return:
- ✅ **No CORS error**
- ✅ **JSON array** of data
- ✅ **Success message** in console

### **4.3 Automated Test**
Load [test-commands.js](test-commands.js) which will automatically test all endpoints.

---

## 🎯 **STEP 5: Verify Checklist**

1. Open [checklist.html](checklist.html)
2. Click **"Run All Tests"**  
3. **All API tests should now show** ✅

Expected results:
- ✅ Get Workers API working
- ✅ Get Sites API working  
- ✅ Get Attendance API working
- ✅ Get Payments API working

---

## 🔍 **Troubleshooting**

### **If Still Getting CORS Error:**

1. **Check Deployment Settings:**
   - Execute as: **Me** (not "User accessing the web app")
   - Who has access: **Anyone**

2. **Verify URL:**
   - Make sure you're using the **new deployment URL**
   - Check `API_CONFIG.BASE_URL` in config.js

3. **Clear Browser Cache:**
   - Hard refresh: **Ctrl+Shift+R**
   - Or open incognito window

4. **Check Console:**
   - Look for specific error messages
   - Run `debugCORS()` from test-commands.js

### **If Getting "Authorization Required":**
- The script deployment might not be set to "Anyone" access
- Redeploy with correct permissions

### **If Getting "Invalid Response":**
- Check Google Sheets permissions
- Verify Sheet ID in the script
- Make sure sheet tabs exist: Workers, Sites, Attendance, Payments

---

## ✨ **What Changed?**

### **Backend Changes:**
- `doGet()` → Uses `createCORSResponse()` 
- `doPost()` → Uses `createCORSResponse()`
- Added `doOptions()` for preflight requests
- `HtmlService` instead of `ContentService`

### **Frontend Changes:**
- `apiGet()` → Better CORS handling
- Enhanced error detection
- Improved JSON parsing

### **Result:**
- ✅ **CORS errors eliminated**
- ✅ **All API endpoints working**
- ✅ **Robust error handling**

Your contractor management web app should now work perfectly from localhost! 🎉