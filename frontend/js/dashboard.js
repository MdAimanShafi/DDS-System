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

// Handle Force Logout (Global Panic System)
function handleForceLogout(data) {
  console.log('🚨 FORCE LOGOUT - Clearing session...');
  
  const user = getUserInfo();
  if (user && data.userId === user.id) {
    showSecurityLockdownMessage(data);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    if (socket) socket.disconnect();
    
    setTimeout(() => {
      window.location.href = 'login.html?reason=security_lockdown';
    }, 2000);
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
      console.log('⚠️ No token found - redirecting to login');
      window.location.href = 'login.html';
    }
  }, 5000);
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

// Activate Panic Mode
async function activatePanicMode() {
  const confirmed = confirm(
    '⚠️ PANIC MODE ACTIVATION\n\n' +
    'This will immediately:\n' +
    '• Lock your account\n' +
    '• Terminate ALL active sessions across ALL devices\n' +
    '• Invalidate all access tokens\n' +
    '• Block suspicious IPs for 24 hours\n' +
    '• Clear all trusted devices\n' +
    '• Require verification for re-login\n\n' +
    'You will be logged out IMMEDIATELY from ALL devices.\n\n' +
    'Are you absolutely sure?'
  );
  
  if (!confirmed) return;
  
  const panicBtn = document.getElementById('panicBtn');
  if (panicBtn) {
    panicBtn.disabled = true;
    panicBtn.innerHTML = '🔄 Activating...';
  }
  
  try {
    const API_URL = 'http://localhost:5000';
    const response = await authenticatedRequest(`${API_URL}/security/panic`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      const message = `🚨 SECURITY LOCKDOWN ACTIVATED\n\n` +
        `Actions Taken:\n${data.actions.join('\n')}\n\n` +
        `🔑 Verification Code: ${data.verificationCode}\n\n` +
        `Save this code! You'll need it to log back in.\n\n` +
        `You will now be logged out from ALL devices.`;
      
      alert(message);
      
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html?reason=panic_mode';
      }, 1000);
    } else {
      alert('Failed to activate panic mode: ' + (data.error || 'Unknown error'));
      if (panicBtn) {
        panicBtn.disabled = false;
        panicBtn.innerHTML = '🚨 PANIC BUTTON';
      }
    }
  } catch (error) {
    console.error('Panic mode error:', error);
    alert('Error activating panic mode. Please try again.');
    if (panicBtn) {
      panicBtn.disabled = false;
      panicBtn.innerHTML = '🚨 PANIC BUTTON';
    }
  }
}

// Setup Event Listeners
function setupEventListeners() {
  const panicBtn = document.getElementById('panicBtn');
  if (panicBtn) panicBtn.addEventListener('click', activatePanicMode);
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
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
