# 🔧 PANIC MODE TROUBLESHOOTING GUIDE

## ❌ PROBLEM: Logout nahi ho raha hai multiple devices se

---

## ✅ STEP-BY-STEP FIX & TEST

### STEP 1: Backend Restart Karo
```bash
cd backend
npm start
```

**Expected Output:**
```
🚀 DDS Server running on port 5000
📡 Socket.IO ready for real-time communication
🛡️ Security monitoring active
🔐 Global panic system enabled
```

---

### STEP 2: Browser 1 - Login Karo
```
1. Open Chrome
2. Go to: http://localhost:5000/login.html
3. Login with: user@example.com
4. Dashboard khulega
```

**Backend Console mein dikhega:**
```
✅ User user@example.com (507f...) registered with socket abc123
📧 Email user@example.com has 1 active sessions
```

---

### STEP 3: Browser 2 - Same Email Se Login
```
1. Open Firefox (ya Chrome Incognito)
2. Go to: http://localhost:5000/login.html
3. Login with: user@example.com (SAME EMAIL)
4. Dashboard khulega
```

**Backend Console mein dikhega:**
```
✅ User user@example.com (507f...) registered with socket def456
📧 Email user@example.com has 2 active sessions  <-- IMPORTANT!
```

---

### STEP 4: Debug Console Kholo (BOTH Browsers)
```
Browser 1 (Chrome):
  - Press F12
  - Go to Console tab
  - Type: socket
  - Should show: Socket {connected: true, ...}

Browser 2 (Firefox):
  - Press F12
  - Go to Console tab
  - Type: socket
  - Should show: Socket {connected: true, ...}
```

**Expected Console Output (Both):**
```
🔌 Connected to security server
✅ User user@example.com (507f...) registered with socket xyz
```

---

### STEP 5: Open DEBUG Page (Browser 3)
```
1. Open Edge (ya another browser)
2. Go to: http://localhost:5000/DEBUG_PANIC.html
3. Check status:
   - Socket Status: Connected ✅
   - User Email: user@example.com
   - Token Status: VALID
```

---

### STEP 6: Trigger Panic Mode
```
Option A: From Dashboard (Browser 1)
  - Click "🚨 PANIC BUTTON"
  - Confirm

Option B: From DEBUG Page (Browser 3)
  - Click "🚨 TRIGGER PANIC MODE"
  - Confirm
```

---

### STEP 7: Watch ALL Browsers
```
Browser 1 (Chrome):
  - Console: "🚨 FORCE LOGOUT RECEIVED"
  - Console: "✅ Email match: user@example.com === user@example.com"
  - Should redirect to login.html

Browser 2 (Firefox):
  - Console: "🚨 FORCE LOGOUT RECEIVED"
  - Console: "✅ Email match: user@example.com === user@example.com"
  - Should redirect to login.html

Browser 3 (DEBUG):
  - Event Log: "🚨🚨🚨 FORCE_LOGOUT EVENT RECEIVED!"
  - Should show email match
```

---

## 🔍 DEBUGGING CHECKLIST

### ✅ Check 1: Backend Console
```bash
# When panic button pressed, should show:
🚨 PANIC MODE ACTIVATED for user: user@example.com
📧 Emitting force_logout to ALL devices with email: user@example.com
✅ Panic mode completed for user@example.com
```

### ✅ Check 2: Frontend Console (Browser 1)
```javascript
// Should show:
🔌 Connected to security server
🚨 FORCE LOGOUT RECEIVED: {email: "user@example.com", ...}
✅ Email match: user@example.com === user@example.com - Logging out...
```

### ✅ Check 3: Frontend Console (Browser 2)
```javascript
// Should show:
🔌 Connected to security server
🚨 FORCE LOGOUT RECEIVED: {email: "user@example.com", ...}
✅ Email match: user@example.com === user@example.com - Logging out...
```

### ✅ Check 4: Network Tab
```
1. Open DevTools → Network tab
2. Filter: WS (WebSocket)
3. Should see: localhost:5000/socket.io/?EIO=4&transport=websocket
4. Status: 101 Switching Protocols (Green)
```

---

## ❌ COMMON ISSUES & FIXES

### Issue 1: "Socket is undefined"
**Problem:** Socket.IO not loaded
**Fix:**
```html
<!-- Add to dashboard.html before dashboard.js -->
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
```

### Issue 2: "CORS Error"
**Problem:** CORS not configured
**Fix:** Already fixed in server.js
```javascript
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})
```

### Issue 3: "Email has 0 active sessions"
**Problem:** Socket not registering
**Fix:** Check if token is valid
```javascript
// In browser console:
localStorage.getItem('token')  // Should return JWT token
```

### Issue 4: "Force logout not received"
**Problem:** Socket not in email room
**Fix:** Check backend logs for:
```
✅ User user@example.com registered with socket abc123
📧 Email user@example.com has X active sessions
```

### Issue 5: "Email mismatch"
**Problem:** Different emails logged in
**Fix:** Make sure SAME email on all browsers
```javascript
// Check in console:
JSON.parse(localStorage.getItem('user')).email
```

---

## 🧪 MANUAL TEST SCRIPT

### Test 1: Single Browser
```bash
# Browser 1:
1. Login: user@example.com
2. Open Console (F12)
3. Type: socket.emit('force_logout', {email: 'user@example.com', userId: 'test', message: 'Test', reason: 'test'})
4. Should logout immediately
```

### Test 2: Multiple Browsers
```bash
# Browser 1 (Chrome):
1. Login: user@example.com
2. Keep open

# Browser 2 (Firefox):
1. Login: user@example.com (SAME)
2. Keep open

# Browser 1:
3. Click Panic Button

# Result:
✅ Browser 1: Logout
✅ Browser 2: Logout
```

### Test 3: Different Emails
```bash
# Browser 1:
1. Login: user1@example.com

# Browser 2:
1. Login: user2@example.com (DIFFERENT)

# Browser 1:
2. Click Panic Button

# Result:
✅ Browser 1: Logout
❌ Browser 2: Stay logged in (different email)
```

---

## 📱 PHONE TESTING

### Method 1: Same WiFi
```bash
# Find your PC's IP:
ipconfig  # Windows
ifconfig  # Mac/Linux

# Example: 192.168.1.100

# On Phone:
1. Open browser
2. Go to: http://192.168.1.100:5000/login.html
3. Login: user@example.com (SAME as desktop)

# On Desktop:
4. Click Panic Button

# Result:
✅ Desktop: Logout
✅ Phone: Logout
```

### Method 2: ngrok (Internet)
```bash
# Terminal:
npm install -g ngrok
ngrok http 5000

# Output:
Forwarding: https://abc123.ngrok.io -> http://localhost:5000

# On Phone:
1. Open: https://abc123.ngrok.io/login.html
2. Login: user@example.com

# On Desktop:
3. Click Panic Button

# Result:
✅ Desktop: Logout
✅ Phone: Logout
```

---

## 🔥 QUICK FIX COMMANDS

### Restart Everything:
```bash
# Terminal 1: Stop backend (Ctrl+C)
cd backend
npm start

# Browser: Clear cache
Ctrl+Shift+Delete → Clear all

# Browser: Hard refresh
Ctrl+Shift+R
```

### Check Socket.IO Connection:
```javascript
// Browser Console:
socket.connected  // Should be: true
socket.id         // Should be: "abc123..."
socket.io.opts.transports  // Should be: ["websocket", "polling"]
```

### Force Emit Test:
```javascript
// Browser Console (any browser):
socket.emit('register_user', { token: localStorage.getItem('token') })

// Backend should show:
✅ User user@example.com registered with socket xyz
```

---

## ✅ SUCCESS CRITERIA

### All these should be TRUE:
- [x] Backend shows: "📧 Email user@example.com has 2 active sessions"
- [x] Browser 1 console: "🔌 Connected to security server"
- [x] Browser 2 console: "🔌 Connected to security server"
- [x] Panic button click → Backend logs: "📧 Emitting force_logout"
- [x] Browser 1 receives: "🚨 FORCE LOGOUT RECEIVED"
- [x] Browser 2 receives: "🚨 FORCE LOGOUT RECEIVED"
- [x] Both browsers redirect to login.html
- [x] localStorage cleared on both

---

## 📞 STILL NOT WORKING?

### Use DEBUG_PANIC.html:
```
1. Open: http://localhost:5000/DEBUG_PANIC.html
2. Check all status indicators
3. Click "🔌 Test Connection"
4. Click "📝 Register Socket"
5. Click "🚨 TRIGGER PANIC MODE"
6. Watch Event Log for errors
```

### Check Backend Logs:
```bash
# Should see:
🔌 Client connected: abc123 | Total: 1
✅ User user@example.com (507f...) registered with socket abc123
📧 Email user@example.com has 1 active sessions

🔌 Client connected: def456 | Total: 2
✅ User user@example.com (507f...) registered with socket def456
📧 Email user@example.com has 2 active sessions

🚨 PANIC MODE ACTIVATED for user: user@example.com
📧 Emitting force_logout to ALL devices with email: user@example.com
```

### Check Frontend Console:
```javascript
// Should see:
🔌 Connected to security server
🚨 FORCE LOGOUT RECEIVED: {email: "user@example.com", userId: "...", ...}
✅ Email match: user@example.com === user@example.com - Logging out...
```

---

## 🎯 FINAL TEST

```bash
# 1. Backend running? ✅
cd backend && npm start

# 2. Browser 1 login? ✅
http://localhost:5000/login.html

# 3. Browser 2 login (same email)? ✅
http://localhost:5000/login.html

# 4. Backend shows 2 sessions? ✅
📧 Email user@example.com has 2 active sessions

# 5. Panic button click? ✅
Dashboard → 🚨 PANIC BUTTON

# 6. Both browsers logout? ✅
Browser 1: Redirect to login
Browser 2: Redirect to login

# SUCCESS! 🎉
```

---

**Agar phir bhi nahi ho raha, to DEBUG_PANIC.html use karo aur console logs share karo!** 🔧
