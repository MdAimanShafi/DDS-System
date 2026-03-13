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
    
    // Check if account is locked (but allow unlock endpoint)
    if (user.isLocked && req.path !== '/unlock') {
      return res.status(403).json({ 
        error: 'Account is locked',
        locked: true
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
