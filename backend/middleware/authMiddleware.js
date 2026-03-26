const jwt = require('jsonwebtoken');
const User = require('../models/User');

const securityController = require('../controllers/securityController');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Check if token is invalidated (panic mode)
    if (securityController.isTokenInvalidated(token)) {
      return res.status(401).json({ 
        error: 'Token invalidated due to security lockdown',
        forceLogout: true
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Auto-unlock if lock period expired
    if (user.isLocked && user.lockUntil && user.lockUntil < new Date()) {
      console.log(`🔓 Auto-unlocking account for ${user.email} - lock period expired`);
      user.isLocked = false;
      user.lockUntil = undefined;
      user.panicMode = false;
      user.riskScore = 0;
      user.loginAttempts = 0;
      await user.save();
    }
    
    // Check if account is locked (but allow unlock endpoint)
    if (user.isLocked && req.path !== '/unlock') {
      const remainingTime = user.lockUntil ? Math.ceil((user.lockUntil - new Date()) / 1000) : 0;
      return res.status(403).json({ 
        error: 'Account is locked',
        locked: true,
        remainingSeconds: remainingTime > 0 ? remainingTime : 0,
        message: remainingTime > 0 ? `Account locked for ${remainingTime} more seconds` : 'Account is locked'
      });
    }
    
    req.user = user;
    req.userId = decoded.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        expired: true
      });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
