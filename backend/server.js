require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const securityController = require('./controllers/securityController');

const authRoutes = require('./routes/auth');
const securityRoutes = require('./routes/security');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { 
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('io', io);

connectDB();

app.get('/', (req, res) => {
  res.json({ 
    message: 'DDS - Digital Defence System API',
    version: '1.0.0',
    status: 'active'
  });
});

app.use('/api', authRoutes);
app.use('/security', securityRoutes);

let connectedClients = 0;
const userSocketMap = new Map(); // userId -> Set of socketIds

io.on('connection', (socket) => {
  connectedClients++;
  console.log(`🔌 Client connected: ${socket.id} | Total: ${connectedClients}`);
  
  socket.emit('connected', { 
    message: 'Connected to DDS Security Server',
    timestamp: new Date()
  });
  
  // Register user session
  socket.on('register_user', (data) => {
    try {
      const { token } = data;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        
        if (!userSocketMap.has(userId)) {
          userSocketMap.set(userId, new Set());
        }
        userSocketMap.get(userId).add(socket.id);
        
        socket.userId = userId;
        socket.join(`user_${userId}`);
        
        console.log(`✅ User ${userId} registered with socket ${socket.id}`);
        
        securityController.addUserSession(userId, socket.id);
      }
    } catch (error) {
      console.error('Error registering user:', error.message);
    }
  });
  
  socket.on('disconnect', () => {
    connectedClients--;
    
    if (socket.userId) {
      const sockets = userSocketMap.get(socket.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSocketMap.delete(socket.userId);
        }
      }
      securityController.removeUserSession(socket.userId, socket.id);
      console.log(`🔌 User ${socket.userId} disconnected: ${socket.id}`);
    }
    
    console.log(`🔌 Client disconnected: ${socket.id} | Total: ${connectedClients}`);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 DDS Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for real-time communication`);
  console.log(`🛡️ Security monitoring active`);
  console.log(`🔐 Global panic system enabled`);
});