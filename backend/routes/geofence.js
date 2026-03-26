const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const gc = require('../controllers/geoFenceController');

router.get('/locations', auth, gc.getTrustedLocations);
router.post('/locations', auth, gc.addTrustedLocation);
router.delete('/locations/:id', auth, gc.deleteTrustedLocation);
router.post('/toggle', auth, gc.toggleGeoFencing);
router.post('/check-password', gc.checkPassword);
router.get('/weekly-report', auth, gc.getWeeklyReport);

module.exports = router;
