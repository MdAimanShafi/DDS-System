# 🛡️ DDS - Digital Defence System

## 🚀 Quick Start (2 Steps)

### Step 1: Start Backend Server
**Double-click:** `START_SERVER.bat`

Yeh automatically:
- Port 5000 ko free karega
- Backend server start karega
- MongoDB se connect karega

### Step 2: Open Frontend
**Double-click:** `LAUNCHER.html`

Yeh automatically:
- Backend check karega
- Frontend pages ka link dega
- System ready hai ya nahi batayega

---

## 📁 Project Structure

```
DDS System/
├── backend/              # Node.js Backend (Port 5000)
│   ├── server.js        # Main server file
│   ├── routes/          # API routes
│   ├── controllers/     # Business logic
│   ├── models/          # MongoDB models
│   └── .env             # Environment variables
│
├── frontend/            # HTML/CSS/JS Frontend
│   ├── index.html       # Landing page
│   ├── login.html       # Login page
│   ├── register.html    # Registration page
│   ├── dashboard.html   # Main dashboard
│   ├── css/             # Stylesheets
│   └── js/              # JavaScript files
│
├── START_SERVER.bat     # Backend starter script
└── LAUNCHER.html        # Frontend launcher
```

---

## 🔧 Manual Setup (Agar batch file kaam nahi kare)

### Backend Start Karna:

```bash
cd backend
node server.js
```

### Frontend Open Karna:

Option 1: Direct file open karo
```
frontend/index.html
```

Option 2: VS Code Live Server use karo
- Right-click on `frontend` folder
- Select "Open with Live Server"

---

## 🌐 URLs

- **Backend API:** http://localhost:5000
- **Frontend:** file:///path/to/frontend/index.html
- **Dashboard:** file:///path/to/frontend/dashboard.html

---

## ✅ Features

- ✅ Real-time attack monitoring
- ✅ Cross-device login notifications
- ✅ Panic mode (locks all devices)
- ✅ Live attack map
- ✅ Risk score calculation
- ✅ Socket.IO real-time updates
- ✅ JWT authentication
- ✅ MongoDB database

---

## 🐛 Troubleshooting

### Problem: "Port 5000 already in use"
**Solution:** `START_SERVER.bat` automatically fix kar dega

### Problem: "Cannot connect to backend"
**Solution:** 
1. Check if `START_SERVER.bat` chal raha hai
2. Console mein "Server running on port 5000" dikhe

### Problem: "MongoDB connection error"
**Solution:** 
1. MongoDB install karo
2. MongoDB service start karo
3. Ya `.env` file mein MongoDB URI change karo

---

## 📝 Default Test Credentials

Agar database empty hai toh pehle register karo:
- Email: test@example.com
- Password: password123

---

## 🎯 Attack Simulator

Dashboard mein "Attack Simulator" button hai jo test attacks generate karta hai.

---

## 📞 Support

Agar koi problem ho toh:
1. Backend console check karo (errors dikhengi)
2. Browser console check karo (F12)
3. Network tab check karo (API calls fail ho rahe hain?)

---

Made with ❤️ for Security
