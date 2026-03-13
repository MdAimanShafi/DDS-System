const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/panic', authMiddleware, securityController.panic);
router.get('/logs', authMiddleware, securityController.getAttackLogs);
router.get('/user-logs', authMiddleware, securityController.getUserAttackLogs);
router.get('/dashboard', authMiddleware, securityController.getDashboardStats);
router.post('/unlock', authMiddleware, securityController.unlockAccount);
router.get('/status', authMiddleware, securityController.getSecurityStatus);
router.post('/verify-relogin', securityController.verifyReLogin);
router.post('/resend-verification', securityController.resendVerificationCode);
router.get('/events', authMiddleware, securityController.getSecurityEvents);

module.exports = router;
