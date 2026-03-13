# 🚀 QUICK START GUIDE

## Get DDS Running in 5 Minutes

### Step 1: Install Dependencies (2 minutes)
```bash
cd backend
npm install
```

### Step 2: Start MongoDB (30 seconds)
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### Step 3: Start Backend (30 seconds)
```bash
cd backend
npm run dev
```

Wait for:
```
✅ MongoDB Connected Successfully
🚀 DDS Server running on port 5000
```

### Step 4: Open Frontend (30 seconds)
Open `frontend/index.html` in your browser

OR use Live Server in VS Code

### Step 5: Create Account (1 minute)
1. Click "Get Started"
2. Fill registration form
3. Access your dashboard!

---

## 🎯 Quick Demo (3 Minutes)

### Minute 1: Setup
- Register new account
- View clean dashboard

### Minute 2: Simulate Attack
- Open incognito window
- Try wrong password 6+ times
- Watch alerts appear in real-time!

### Minute 3: Panic Mode
- Click red PANIC BUTTON
- See instant lockdown
- Account secured!

---

## 🔥 Key URLs

- **Home**: http://localhost:8080/index.html
- **Login**: http://localhost:8080/login.html
- **Register**: http://localhost:8080/register.html
- **Dashboard**: http://localhost:8080/dashboard.html
- **Simulator**: http://localhost:8080/simulator.html

---

## ⚡ Quick Commands

```bash
# Install
cd backend && npm install

# Start Server
npm run dev

# Check MongoDB
mongo --eval "db.version()"

# Kill Port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 🎬 Hackathon Presentation Flow

1. **Open landing page** - Show modern UI
2. **Register account** - Demonstrate auth
3. **Show dashboard** - Display features
4. **Run attack simulator** - Real-time alerts
5. **Show attack map** - Visual impact
6. **Hit panic button** - Dramatic finale!

**Opening Line:**
"Imagine detecting a cyber attack in real-time and locking down your account with one click. That's DDS."

**Closing Line:**
"DDS brings enterprise-grade security to everyone, with AI-powered threat detection and instant response."

---

## 🏆 Judging Criteria Highlights

✅ **Innovation**: Panic button + AI risk scoring
✅ **Technical**: Full-stack with real-time features
✅ **UX**: Modern, animated, responsive
✅ **Completeness**: Production-ready system
✅ **Impact**: Solves real security problems

---

## 🐛 Common Issues

**MongoDB not starting?**
```bash
mongod --dbpath "C:\data\db"
```

**Port 5000 busy?**
Change PORT in `.env` to 5001

**Frontend not loading?**
Use Live Server or http-server

---

**Ready to impress? Let's go! 🛡️**
