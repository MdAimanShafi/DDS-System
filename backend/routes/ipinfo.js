// ============================================
// IP Info Routes - Real IP Detection
// ============================================

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Get client's real IP and location
router.get('/myip', async (req, res) => {
  try {
    let clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    // Clean up IPv6 localhost
    if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
      clientIP = '127.0.0.1';
    }
    
    // Try to get public IP if localhost
    if (clientIP === '127.0.0.1' || clientIP.includes('127.0.0.1')) {
      try {
        const publicIPResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
        clientIP = publicIPResponse.data.ip;
      } catch (error) {
        console.log('Could not fetch public IP');
      }
    }
    
    // Get location data
    let locationData = null;
    try {
      const response = await axios.get(
        `http://ip-api.com/json/${clientIP}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
        { timeout: 5000 }
      );
      
      if (response.data.status === 'success') {
        locationData = response.data;
      }
    } catch (error) {
      console.error('Error fetching location:', error.message);
    }
    
    res.json({
      success: true,
      ip: clientIP,
      location: locationData,
      headers: {
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
        acceptLanguage: req.headers['accept-language']
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get location for any IP
router.get('/lookup/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    
    const response = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      { timeout: 5000 }
    );
    
    if (response.data.status === 'success') {
      res.json({
        success: true,
        ip,
        location: response.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: response.data.message || 'Location not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
