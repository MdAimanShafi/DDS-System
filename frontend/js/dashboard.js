// Enhanced Dashboard with Real-time Features
let socket;
let attackMap;
let alertsManager;
let currentUserId;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Initialize Dashboard
async function initializeDashboard() {
  if (!checkAuth()) {
    window.location.href = 'login.html';
    return;
  }
  
  try {
    initializeUserInfo();
    initializeSocket();
    initializeMap();
    initializeAlerts();
    await loadDashboardData();
    setupEventListeners();
    setupGlobalLogoutListener();
    
    console.log('✅ Dashboard initialized successfully');
  } catch (error) {
    console.error('❌ Dashboard initialization error:', error);
    showError('Failed to initialize dashboard. Please refresh the page.');
  }
}

// Initialize User Info
function initializeUserInfo() {
  const user = getUserInfo();
  if (!user) return;
  
  currentUserId = user.id;
  
  const avatar = document.getElementById('userAvatar');
  if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();
  
  const userName = document.getElementById('userName');
  if (userName) userName.textContent = user.name;
  
  const userEmail = document.getElementById('userEmail');
  if (userEmail) userEmail.textContent = user.email;
}

// Initialize Socket.IO with reconnection logic
function initializeSocket() {
  const API_URL = 'http://localhost:5000';
  
  socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS
  });
  
  socket.on('connect', () => {
    console.log('🔌 Connected to security server');
    showConnectionStatus(true);
    reconnectAttempts = 0;
    
    const token = getAuthToken();
    if (token) {
      socket.emit('register_user', { token });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from security server');
    showConnectionStatus(false);
  });
  
  socket.on('reconnect_attempt', (attempt) => {
    reconnectAttempts = attempt;
    console.log(`🔄 Reconnection attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}`);
  });
  
  socket.on('reconnect_failed', () => {
    console.error('❌ Failed to reconnect to server');
    showError('Lost connection to security server. Please refresh the page.');
  });
  
  // Real-time event handlers
  socket.on('newLoginAlert', (data) => {
    console.log('🔔 NEW LOGIN ALERT:', data);
    handleNewLoginAlert(data);
  });
  
  socket.on('securityAlert', (data) => {
    console.log('🚨 Security Alert:', data);
    handleSecurityAlert(data);
  });
  
  socket.on('newAttack', (attack) => {
    console.log('⚠️ New Attack:', attack);
    handleNewAttack(attack);
  });
  
  socket.on('accountLocked', (data) => {
    console.log('🔒 Account Locked:', data);
    handleAccountLocked(data);
  });
  
  socket.on('force_logout', (data) => {
    console.log('🚨 FORCE LOGOUT RECEIVED:', data);
    handleForceLogout(data);
  });
  
  socket.on('panicActivated', (data) => {
    console.log('🚨 PANIC MODE ACTIVATED:', data);
  });
  
  socket.on('error', (error) => {
    console.error('⚠️ Socket error:', error);
  });
}

// Handle New Login Alert (Cross-Device Notification)
function handleNewLoginAlert(alert) {
  console.log('🔔 NEW LOGIN FROM ANOTHER DEVICE:', alert);
  
  const user = getUserInfo();
  if (user && alert.userId === user.id) {
    showCrossDeviceNotification(alert);
    
    if (alertsManager) {
      alertsManager.addAlert({
        message: alert.message,
        email: alert.email,
        ip: alert.ipAddress,
        location: alert.location,
        riskLevel: alert.riskLevel,
        timestamp: alert.timestamp
      });
    }
    
    showBrowserNotification({
      message: `🚨 ${alert.message}`,
      location: alert.location,
      riskLevel: alert.riskLevel
    });
    
    playAlertSound();
    
    // Update risk score if provided
    if (alert.riskScore !== undefined) {
      updateRiskScore(alert.riskScore);
    }
  }
}

// Show Cross-Device Notification
function showCrossDeviceNotification(alert) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 30px;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    padding: 1.5rem 2rem;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6), 0 0 60px rgba(239, 68, 68, 0.4);
    z-index: 10000;
    min-width: 400px;
    max-width: 500px;
    animation: slideInRight 0.5s cubic-bezier(0.4, 0, 0.2, 1), shake 0.5s ease 0.5s;
    border: 2px solid rgba(255, 255, 255, 0.3);
  `;
  
  const reasons = alert.reasons && alert.reasons.length > 0 
    ? `<div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.2);">
         <div style="font-weight: 700; margin-bottom: 0.5rem;">⚠️ Risk Factors:</div>
         ${alert.reasons.map(r => `<div style="font-size: 0.85rem; margin-bottom: 0.25rem;">• ${r}</div>`).join('')}
       </div>`
    : '';
  
  notification.innerHTML = `
    <div style="display: flex; align-items: start; gap: 1rem;">
      <div style="font-size: 2.5rem; animation: pulse 1s infinite;">🚨</div>
      <div style="flex: 1;">
        <div style="font-weight: 900; font-size: 1.2rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">
          ⚠️ NEW LOGIN DETECTED!
        </div>
        <div style="font-size: 0.95rem; margin-bottom: 0.75rem; opacity: 0.95;">
          ${alert.message}
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem; opacity: 0.9;">
          <div>📍 <strong>Location:</strong> ${alert.location}</div>
          <div>🌐 <strong>IP:</strong> ${alert.ipAddress}</div>
          <div>💻 <strong>Device:</strong> ${alert.deviceInfo.substring(0, 50)}...</div>
          <div>⚠️ <strong>Risk:</strong> ${alert.riskLevel.toUpperCase()}</div>
          ${alert.riskScore !== undefined ? `<div>📊 <strong>Risk Score:</strong> ${alert.riskScore}/100</div>` : ''}
        </div>
        ${reasons}
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.3);">
          <button onclick="activatePanicMode()" style="
            background: white;
            color: #dc2626;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 800;
            cursor: pointer;
            width: 100%;
            font-size: 1rem;
            transition: all 0.3s ease;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            🚨 ACTIVATE PANIC MODE
          </button>
        </div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
        ×
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = 'slideOutRight 0.5s ease';
      setTimeout(() => notification.remove(), 500);
    }
  }, 15000);
}

// Handle Account Locked
function handleAccountLocked(data) {
  const user = getUserInfo();
  if (user && data.userId === user.id) {
    updateAccountStatus(true);
    
    if (data.riskScore !== undefined) {
      updateRiskScore(data.riskScore);
    }
    
    showError('Your account has been locked due to suspicious activity. Please contact support.');
  }
}

// Play Alert Sound
function playAlertSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log('Audio not supported');
  }
}

// Handle Force Logout (Global Panic System - EMAIL BASED)
function handleForceLogout(data) {
  console.log('🚨 FORCE LOGOUT RECEIVED:', data);
  
  const user = getUserInfo();
  
  // Check if this logout is for current user's EMAIL
  if (user && (data.email === user.email || data.userId === user.id)) {
    console.log(`✅ Email match: ${data.email} === ${user.email} - Logging out...`);
    
    showSecurityLockdownMessage(data);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    if (socket) socket.disconnect();
    
    setTimeout(() => {
      window.location.href = 'login.html?reason=security_lockdown';
    }, 2000);
  } else {
    console.log(`❌ Email mismatch: ${data.email} !== ${user?.email} - Ignoring logout`);
  }
}

// Show Security Lockdown Message
function showSecurityLockdownMessage(data) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.95); z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.3s ease;
  `;
  
  overlay.innerHTML = `
    <div style="background: white; padding: 3rem; border-radius: 20px; max-width: 500px; text-align: center; animation: scaleIn 0.5s ease;">
      <div style="font-size: 4rem; margin-bottom: 1rem;">🚨</div>
      <h2 style="color: #ef4444; font-size: 2rem; margin-bottom: 1rem;">SECURITY LOCKDOWN ACTIVATED</h2>
      <p style="color: #6b7280; font-size: 1.1rem; margin-bottom: 1.5rem;">
        ${data.message || 'Your session has been terminated for security reasons.'}
      </p>
      <div style="background: #fef2f2; padding: 1rem; border-radius: 10px; border-left: 4px solid #ef4444; margin-bottom: 1.5rem;">
        <p style="color: #991b1b; font-weight: 600; margin: 0;">All active sessions have been terminated.</p>
      </div>
      <p style="color: #9ca3af; font-size: 0.9rem;">Redirecting to login page...</p>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

// Setup Global Logout Listener
function setupGlobalLogoutListener() {
  window.addEventListener('storage', (e) => {
    if (e.key === 'token' && !e.newValue) {
      console.log('🔐 Token removed in another tab - logging out');
      window.location.href = 'login.html?reason=logged_out';
    }
  });
  
  setInterval(async () => {
    const token = getAuthToken();
    if (!token) {
      console.log('⚠️ Token expired - redirecting to login');
      window.location.href = 'login.html?reason=token_expired';
    }
  }, 10000); // Check every 10 seconds
}

// Initialize Map
function initializeMap() {
  try {
    attackMap = new AttackMapManager('map');
    attackMap.initialize();
  } catch (error) {
    console.error('Error initializing map:', error);
  }
}

// Initialize Alerts
function initializeAlerts() {
  alertsManager = new AlertsManager('alertsContainer');
}

// Load Dashboard Data
async function loadDashboardData() {
  showLoading(true);
  
  try {
    const API_URL = 'http://localhost:5000';
    const response = await authenticatedRequest(`${API_URL}/security/dashboard`);
    const data = await response.json();
    
    if (data.success) {
      updateDashboardStats(data);
      displayAttackLogs(data.attackLogs);
      displayRecentActivity(data.recentActivity);
      
      if (data.attackLogs && attackMap) {
        data.attackLogs.forEach(attack => attackMap.addAttackMarker(attack));
      }
    } else {
      showError('Failed to load dashboard data');
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showError('Connection error. Please check if backend is running.');
  } finally {
    showLoading(false);
  }
}

// Update Dashboard Stats
function updateDashboardStats(data) {
  const { user, stats } = data;
  
  updateRiskScore(user.riskScore);
  updateAccountStatus(user.isLocked);
  
  const totalAttacksEl = document.getElementById('totalAttacks');
  if (totalAttacksEl) animateValue(totalAttacksEl, 0, stats.totalAttacks, 1000);
  
  const loginAttemptsEl = document.getElementById('loginAttempts');
  if (loginAttemptsEl) animateValue(loginAttemptsEl, 0, user.loginAttempts, 1000);
  
  const criticalAttacksEl = document.getElementById('criticalAttacks');
  if (criticalAttacksEl) animateValue(criticalAttacksEl, 0, stats.criticalAttacks, 1000);
  
  const trustedDevicesEl = document.getElementById('trustedDevices');
  if (trustedDevicesEl) animateValue(trustedDevicesEl, 0, user.knownDevices, 1000);
}

// Update Risk Score
function updateRiskScore(score) {
  const riskScoreEl = document.getElementById('riskScore');
  if (riskScoreEl) animateValue(riskScoreEl, 0, score, 1500);
  
  const riskFill = document.getElementById('riskFill');
  const riskLabel = document.getElementById('riskLabel');
  
  if (riskFill && riskLabel) {
    riskFill.style.width = `${score}%`;
    
    let level = 'low', label = 'LOW RISK';
    if (score >= 80) { level = 'critical'; label = 'CRITICAL'; }
    else if (score >= 60) { level = 'high'; label = 'HIGH RISK'; }
    else if (score >= 40) { level = 'medium'; label = 'MEDIUM RISK'; }
    
    riskFill.className = `risk-fill ${level}`;
    riskLabel.textContent = label;
    riskLabel.style.color = getComputedStyle(riskFill).backgroundColor;
  }
}

// Update Account Status
function updateAccountStatus(isLocked) {
  const statusEl = document.getElementById('accountStatus');
  if (!statusEl) return;
  
  if (isLocked) {
    statusEl.innerHTML = '<span class="status-dot locked"></span>LOCKED';
    statusEl.className = 'status-badge locked';
  } else {
    statusEl.innerHTML = '<span class="status-dot active"></span>ACTIVE';
    statusEl.className = 'status-badge active';
  }
}

// Display Attack Logs
function displayAttackLogs(logs) {
  const container = document.getElementById('logsContainer');
  if (!container) return;
  
  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No Attack Logs</div>
        <div class="empty-state-text">No suspicious activities detected yet.</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  logs.forEach(log => container.appendChild(createLogElement(log)));
}

// Create Log Element
function createLogElement(log) {
  const div = document.createElement('div');
  div.className = 'log-item';
  
  const timestamp = new Date(log.timestamp).toLocaleString();
  const location = log.location ? `${log.location.city}, ${log.location.country}` : 'Unknown';
  
  div.innerHTML = `
    <div class="log-info">
      <div class="log-title">${log.attackType}</div>
      <div class="log-details">
        <div class="log-meta">
          <span>📧 ${log.email}</span>
          <span>🌐 ${log.ipAddress}</span>
          <span>📍 ${location}</span>
        </div>
        <div>🕒 ${timestamp}</div>
      </div>
    </div>
    <div class="log-badge ${log.riskLevel}">${log.riskLevel.toUpperCase()}</div>
  `;
  
  return div;
}

// Display Recent Activity
function displayRecentActivity(activities) {
  console.log('Recent Activity:', activities);
}

// Handle Security Alert
function handleSecurityAlert(alert) {
  if (alertsManager) alertsManager.addAlert(alert);
  showBrowserNotification(alert);
  incrementStat('loginAttempts');
}

// Handle New Attack
function handleNewAttack(attack) {
  if (attackMap) attackMap.addAttackMarker(attack);
  
  const container = document.getElementById('logsContainer');
  if (container) {
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) container.innerHTML = '';
    
    const logElement = createLogElement(attack);
    container.insertBefore(logElement, container.firstChild);
  }
  
  incrementStat('totalAttacks');
}

// All domains to clear cookies from
const PANIC_DOMAINS = [
  'google.com','gmail.com','youtube.com','accounts.google.com',
  'live.com','outlook.com','microsoft.com','office.com',
  'yahoo.com','proton.me','protonmail.com',
  'facebook.com','instagram.com','twitter.com','x.com',
  'linkedin.com','snapchat.com','whatsapp.com','telegram.org',
  'discord.com','netflix.com','amazon.com','primevideo.com',
  'spotify.com','dropbox.com','github.com','gitlab.com',
  'stackoverflow.com','vercel.com','netlify.com'
];

// Clear cookies using extension
async function clearAllCookiesViaExtension() {
  return new Promise((resolve) => {
    // Check if DDS extension is installed
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Try to communicate with extension
      const extensionId = localStorage.getItem('dds_extension_id');
      if (extensionId) {
        chrome.runtime.sendMessage(extensionId, { action: 'panicLogout' }, (result) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, reason: 'extension_not_found' });
          } else {
            resolve({ success: true, ...result });
          }
        });
        return;
      }
    }
    resolve({ success: false, reason: 'no_extension' });
  });
}

// Activate Panic Mode
async function activatePanicMode() {
  // Show custom confirm modal instead of browser confirm
  const confirmed = await showPanicConfirmModal();
  if (!confirmed) return;

  const panicBtn = document.getElementById('panicBtn');
  if (panicBtn) { panicBtn.disabled = true; panicBtn.innerHTML = '🔄 Activating...'; }

  // Show fullscreen overlay
  const overlay = document.createElement('div');
  overlay.id = 'panicOverlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.92);z-index:99999;
    display:flex;align-items:center;justify-content:center;
    flex-direction:column;gap:1rem;
  `;
  overlay.innerHTML = `
    <div style="font-size:4rem">🚨</div>
    <div style="color:white;font-size:1.8rem;font-weight:900">PANIC MODE ACTIVATED</div>
    <div id="panicStatus" style="color:#a5b4fc;font-size:1.1rem;font-weight:600">Clearing sessions...</div>
    <div style="width:400px;background:rgba(255,255,255,0.1);border-radius:10px;height:10px;overflow:hidden;margin-top:1rem">
      <div id="panicBar" style="height:100%;width:0%;background:linear-gradient(90deg,#ef4444,#dc2626);transition:width 0.3s ease;border-radius:10px"></div>
    </div>
    <div id="panicSiteList" style="color:rgba(255,255,255,0.7);font-size:0.9rem;margin-top:0.5rem"></div>
  `;
  document.body.appendChild(overlay);

  const setStatus = (msg, pct) => {
    const s = document.getElementById('panicStatus');
    const b = document.getElementById('panicBar');
    if (s) s.textContent = msg;
    if (b) b.style.width = pct + '%';
  };

  try {
    // Step 1: Try extension first
    setStatus('Checking DDS Extension...', 10);
    const extResult = await clearAllCookiesViaExtension();

    if (extResult.success) {
      setStatus(`✅ Extension cleared ${extResult.cookiesCleared} cookies from ${extResult.tabsClosed} tabs`, 50);
    } else {
      // Step 2: No extension - clear what we can from JS
      setStatus('Clearing browser storage...', 20);

      // Clear localStorage and sessionStorage for current site
      const keysToKeep = [];
      localStorage.clear();
      sessionStorage.clear();

      // Clear all cookies accessible from JS
      document.cookie.split(';').forEach(c => {
        const key = c.split('=')[0].trim();
        document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${location.hostname}`;
      });

      setStatus('Opening logout pages...', 30);

      // Open logout URLs in background tabs
      const logoutUrls = [
        'https://accounts.google.com/Logout',
        'https://login.live.com/logout.srf',
        'https://login.yahoo.com/?.src=ym&logout=1',
        'https://account.proton.me/logout',
        'https://www.facebook.com/logout.php',
        'https://www.instagram.com/accounts/logout/',
        'https://twitter.com/logout',
        'https://www.linkedin.com/m/logout/',
        'https://www.netflix.com/SignOut',
        'https://accounts.spotify.com/logout',
        'https://www.dropbox.com/logout',
        'https://github.com/logout',
        'https://gitlab.com/users/sign_out',
        'https://discord.com/api/auth/logout'
      ];

      const siteList = document.getElementById('panicSiteList');
      let opened = 0;
      for (const url of logoutUrls) {
        const domain = new URL(url).hostname.replace('www.', '').replace('accounts.', '').replace('login.', '').replace('account.', '');
        if (siteList) siteList.textContent = `Logging out: ${domain}`;
        const tab = window.open(url, '_blank');
        opened++;
        setStatus(`Opening logout pages... (${opened}/${logoutUrls.length})`, 30 + (opened / logoutUrls.length) * 20);
        await new Promise(r => setTimeout(r, 800));
        if (tab) { try { tab.close(); } catch(e) {} }
      }
      if (siteList) siteList.textContent = '';
    }

    // Step 3: DDS server lockdown
    setStatus('Activating DDS lockdown...', 70);
    const API_URL = 'http://localhost:5000';
    const panicToken = getAuthToken(); // save token before clearing
    const response = await fetch(`${API_URL}/security/panic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${panicToken}` }
    });
    const data = await response.json();
    setStatus('Terminating all sessions...', 90);

    if (data.success) {
      setStatus('✅ LOCKDOWN COMPLETE!', 100);
      await new Promise(r => setTimeout(r, 1200));
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      overlay.remove();
      showPanicRecoveryHub();
    } else {
      throw new Error(data.error || 'Server error');
    }

  } catch (error) {
    console.error('Panic mode error:', error);
    overlay.remove();
    alert('Error: ' + error.message);
    if (panicBtn) { panicBtn.disabled = false; panicBtn.innerHTML = '🚨 PANIC BUTTON'; }
  }
}

// ─── Panic Confirm Modal ──────────────────────────────────────────────────
function showPanicConfirmModal() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);`;
    modal.innerHTML = `
      <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:2px solid rgba(239,68,68,0.5);border-radius:24px;padding:2.5rem;max-width:480px;width:90%;box-shadow:0 0 60px rgba(239,68,68,0.3);animation:scaleIn 0.3s ease;">
        <div style="text-align:center;margin-bottom:1.5rem;">
          <div style="font-size:3.5rem;animation:pulse 1s infinite;">🚨</div>
          <h2 style="color:#ef4444;font-size:1.6rem;font-weight:900;margin:0.5rem 0;">PANIC MODE</h2>
          <p style="color:rgba(255,255,255,0.7);font-size:0.95rem;">Yeh action turant in sab cheezein karega:</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.6rem;margin-bottom:1.5rem;">
          ${['🔒 Account 1 minute ke liye lock hoga','💀 Sabhi active sessions terminate honge','🌐 Gmail, Facebook, sab jagah se logout','🍪 Sabhi cookies & sessions clear honge','📱 Sabhi trusted devices remove honge'].map(t=>`<div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 1rem;background:rgba(239,68,68,0.1);border-radius:10px;border-left:3px solid #ef4444;color:white;font-size:0.9rem;">${t}</div>`).join('')}
        </div>
        <div style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:12px;padding:1rem;margin-bottom:1.5rem;">
          <p style="color:#fbbf24;font-weight:700;margin:0;font-size:0.9rem;">⚠️ Panic ke baad ek page khulega jahan aap apne sabhi accounts ke passwords change kar sakte hain.</p>
        </div>
        <div style="display:flex;gap:1rem;">
          <button id="panicCancelBtn" style="flex:1;padding:0.9rem;border-radius:12px;border:2px solid rgba(255,255,255,0.2);background:transparent;color:white;font-weight:700;cursor:pointer;font-size:1rem;">Cancel</button>
          <button id="panicConfirmBtn" style="flex:1;padding:0.9rem;border-radius:12px;border:none;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;font-weight:900;cursor:pointer;font-size:1rem;box-shadow:0 0 20px rgba(239,68,68,0.5);">🚨 HAAN, ACTIVATE KARO</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('panicCancelBtn').onclick = () => { modal.remove(); resolve(false); };
    document.getElementById('panicConfirmBtn').onclick = () => { modal.remove(); resolve(true); };
  });
}

// ─── Panic Recovery Hub (Password Change Page) ────────────────────────────
function showPanicRecoveryHub() {
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const userEmail = user.email || '';

  const services = [
    { name: 'Gmail / Google', icon: '📧', color: '#ea4335', pwUrl: 'https://myaccount.google.com/signinoptions/password', loginUrl: 'https://accounts.google.com', warning: 'Google account hack hone se Gmail, YouTube, Drive sab access ho sakta hai!' },
    { name: 'Facebook', icon: '👤', color: '#1877f2', pwUrl: 'https://www.facebook.com/settings?tab=security', loginUrl: 'https://facebook.com', warning: 'Facebook hack se personal photos, messages, friends sab expose ho sakte hain!' },
    { name: 'Instagram', icon: '📸', color: '#e1306c', pwUrl: 'https://www.instagram.com/accounts/password/change/', loginUrl: 'https://instagram.com', warning: 'Instagram account se personal DMs aur photos leak ho sakte hain!' },
    { name: 'Microsoft / Outlook', icon: '💼', color: '#0078d4', pwUrl: 'https://account.live.com/password/Change', loginUrl: 'https://outlook.com', warning: 'Microsoft account se Office, OneDrive, Xbox sab compromise ho sakta hai!' },
    { name: 'Twitter / X', icon: '🐦', color: '#1da1f2', pwUrl: 'https://twitter.com/settings/password', loginUrl: 'https://twitter.com', warning: 'Twitter hack se aapke naam pe fake tweets post ho sakte hain!' },
    { name: 'GitHub', icon: '💻', color: '#333', pwUrl: 'https://github.com/settings/security', loginUrl: 'https://github.com', warning: 'GitHub hack se aapka code aur repositories delete/steal ho sakte hain!' },
    { name: 'LinkedIn', icon: '🤝', color: '#0a66c2', pwUrl: 'https://www.linkedin.com/psettings/change-password', loginUrl: 'https://linkedin.com', warning: 'LinkedIn hack se professional identity aur connections expose ho sakte hain!' },
    { name: 'Yahoo Mail', icon: '📮', color: '#6001d2', pwUrl: 'https://login.yahoo.com/account/security', loginUrl: 'https://mail.yahoo.com', warning: 'Yahoo hack se purane emails aur linked accounts compromise ho sakte hain!' },
    { name: 'Discord', icon: '🎮', color: '#5865f2', pwUrl: 'https://discord.com/settings/account', loginUrl: 'https://discord.com', warning: 'Discord hack se aapke servers aur DMs access ho sakte hain!' },
    { name: 'Netflix', icon: '🎬', color: '#e50914', pwUrl: 'https://www.netflix.com/YourAccount', loginUrl: 'https://netflix.com', warning: 'Netflix hack se payment info aur subscription misuse ho sakti hai!' },
    { name: 'Amazon', icon: '🛒', color: '#ff9900', pwUrl: 'https://www.amazon.in/gp/css/account/info/view.html', loginUrl: 'https://amazon.in', warning: 'Amazon hack se saved cards aur orders access ho sakte hain!' },
    { name: 'Spotify', icon: '🎵', color: '#1db954', pwUrl: 'https://www.spotify.com/account/change-password/', loginUrl: 'https://spotify.com', warning: 'Spotify hack se payment info aur listening history expose ho sakti hai!' },
  ];

  const hub = document.createElement('div');
  hub.id = 'panicRecoveryHub';
  hub.style.cssText = `position:fixed;inset:0;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);z-index:99999;overflow-y:auto;`;

  hub.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:2rem;">
      <!-- Header -->
      <div style="text-align:center;padding:2rem 0 1.5rem;">
        <div style="font-size:3rem;margin-bottom:0.5rem;">🔐</div>
        <h1 style="color:white;font-size:2rem;font-weight:900;margin:0;">Password Change Hub</h1>
        <p style="color:rgba(255,255,255,0.6);margin:0.5rem 0 0;">Panic mode activate ho gaya. Ab neeche diye gaye sabhi accounts ke passwords turant change karo.</p>
      </div>

      <!-- Warning Banner -->
      <div style="background:rgba(239,68,68,0.15);border:2px solid rgba(239,68,68,0.4);border-radius:16px;padding:1.25rem 1.5rem;margin-bottom:2rem;display:flex;align-items:center;gap:1rem;">
        <div style="font-size:2rem;">🚨</div>
        <div>
          <div style="color:#ef4444;font-weight:800;font-size:1rem;">SECURITY ALERT: Sabhi sessions terminate kar diye gaye hain!</div>
          <div style="color:rgba(255,255,255,0.7);font-size:0.9rem;margin-top:0.25rem;">Neeche har service ka password change karo. Strong password use karo — hacker easily guess nahi kar sake.</div>
        </div>
      </div>

      <!-- Password Strength Guide -->
      <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:16px;padding:1.25rem 1.5rem;margin-bottom:2rem;">
        <div style="color:white;font-weight:800;margin-bottom:0.75rem;">💡 Strong Password Kaise Banayein?</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.75rem;">
          ${[
            ['✅','Minimum 12 characters'],
            ['✅','Uppercase + lowercase letters'],
            ['✅','Numbers (0-9) zaroor daalo'],
            ['✅','Special chars (!@#$%^&*)'],
            ['❌','Apna naam mat use karo'],
            ['❌','123456 ya password mat rakho'],
            ['❌','Birthday ya phone number nahi'],
            ['❌','Ek hi password kahin aur mat use karo']
          ].map(([icon,text])=>`<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;color:rgba(255,255,255,0.8);"><span>${icon}</span><span>${text}</span></div>`).join('')}
        </div>
        <div style="margin-top:1rem;padding:0.75rem 1rem;background:rgba(16,185,129,0.15);border-radius:10px;border-left:3px solid #10b981;">
          <span style="color:#10b981;font-weight:700;">Example strong password: </span>
          <span style="color:white;font-family:monospace;font-size:0.95rem;">MyD0g@Home#2024!</span>
        </div>
      </div>

      <!-- Services Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:1.25rem;margin-bottom:2rem;">
        ${services.map((s, i) => `
          <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:1.25rem;transition:all 0.2s;" id="svc-${i}">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <div style="font-size:1.8rem;">${s.icon}</div>
              <div style="flex:1;">
                <div style="color:white;font-weight:800;font-size:1rem;">${s.name}</div>
              </div>
              <div id="svc-done-${i}" style="display:none;background:rgba(16,185,129,0.2);border:1px solid #10b981;border-radius:8px;padding:0.3rem 0.7rem;color:#10b981;font-size:0.8rem;font-weight:700;">✅ Done</div>
            </div>
            <div style="background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;border-radius:0 8px 8px 0;padding:0.6rem 0.75rem;margin-bottom:0.75rem;">
              <p style="color:rgba(255,255,255,0.7);font-size:0.82rem;margin:0;">⚠️ ${s.warning}</p>
            </div>
            <div style="display:flex;gap:0.6rem;">
              <a href="${s.pwUrl}" target="_blank" onclick="markDone(${i})" style="flex:1;padding:0.65rem;border-radius:10px;background:linear-gradient(135deg,${s.color},${s.color}cc);color:white;font-weight:700;font-size:0.85rem;text-decoration:none;text-align:center;display:block;">🔑 Password Change Karo</a>
              <a href="${s.loginUrl}" target="_blank" style="padding:0.65rem 0.85rem;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:white;font-size:0.85rem;text-decoration:none;display:flex;align-items:center;">🔗</a>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Bottom Actions -->
      <div style="display:flex;gap:1rem;justify-content:center;padding-bottom:3rem;flex-wrap:wrap;">
        <button onclick="document.getElementById('panicRecoveryHub').remove();window.location.href='login.html?reason=panic_mode';" style="padding:1rem 2rem;border-radius:50px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;font-weight:800;border:none;cursor:pointer;font-size:1rem;box-shadow:0 4px 20px rgba(99,102,241,0.4);">✅ Passwords Change Ho Gaye — Login Karo</button>
        <button onclick="document.getElementById('panicRecoveryHub').remove();window.location.href='login.html?reason=panic_mode';" style="padding:1rem 2rem;border-radius:50px;background:rgba(255,255,255,0.07);color:white;font-weight:700;border:2px solid rgba(255,255,255,0.2);cursor:pointer;font-size:1rem;">Baad Mein Karunga — Login Page</button>
      </div>
    </div>
  `;

  document.body.appendChild(hub);
}

function markDone(index) {
  setTimeout(() => {
    const el = document.getElementById(`svc-done-${index}`);
    if (el) el.style.display = 'block';
  }, 1500);
}

// Setup Event Listeners
function setupEventListeners() {
  const panicBtn = document.getElementById('panicBtn');
  if (panicBtn) panicBtn.addEventListener('click', activatePanicMode);
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Auto-detect DDS extension on load
  detectDDSExtension();
}

// Detect DDS Extension
function detectDDSExtension() {
  const saved = localStorage.getItem('dds_extension_id');
  if (saved) return; // Already saved

  // Known extension IDs to try (will be set after first install)
  // User can also set it manually via console: localStorage.setItem('dds_extension_id', 'YOUR_ID')
  const extId = localStorage.getItem('dds_extension_id');
  if (extId) {
    chrome.runtime.sendMessage(extId, { action: 'ping' }, (res) => {
      if (!chrome.runtime.lastError && res && res.success) {
        console.log('✅ DDS Extension connected:', extId);
      }
    });
  }
}

// Utility Functions
function showLoading(show) {
  const loader = document.getElementById('dashboardLoader');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

function showError(message) {
  console.error(message);
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => errorDiv.remove(), 300);
  }, 5000);
}

function showConnectionStatus(connected) {
  const statusEl = document.getElementById('connectionStatus');
  if (statusEl) {
    statusEl.textContent = connected ? '🟢 Connected' : '🔴 Disconnected';
    statusEl.style.color = connected ? '#10b981' : '#ef4444';
  }
}

function showBrowserNotification(alert) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('DDS Security Alert', {
      body: alert.message,
      icon: '/assets/logo.png',
      badge: '/assets/logo.png'
    });
  }
}

function incrementStat(statId) {
  const el = document.getElementById(statId);
  if (el) {
    const current = parseInt(el.textContent) || 0;
    animateValue(el, current, current + 1, 500);
  }
}

function animateValue(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.round(current);
  }, 16);
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
  requestNotificationPermission();
});

window.addEventListener('beforeunload', () => {
  if (socket) socket.disconnect();
});
