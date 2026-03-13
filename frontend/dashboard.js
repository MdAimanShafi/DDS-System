const API_URL = 'http://localhost:5000';
const socket = io('http://localhost:5000');

let map;
let markers = [];

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
  }
}

checkAuth();

function initMap() {
  map = L.map('map').setView([20, 0], 2);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

function addAttackMarker(attack) {
  if (!attack.location || !attack.location.lat || !attack.location.lon) return;
  
  const marker = L.marker([attack.location.lat, attack.location.lon])
    .addTo(map)
    .bindPopup(`
      <b>${attack.attackType}</b><br>
      IP: ${attack.ipAddress}<br>
      Location: ${attack.location.city}, ${attack.location.country}<br>
      Risk: ${attack.riskLevel}<br>
      Time: ${new Date(attack.timestamp).toLocaleString()}
    `);
  
  markers.push(marker);
}

function addAlert(message, type, data) {
  const alertsContainer = document.getElementById('alertsContainer');
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert-item alert-${type}`;
  alertDiv.innerHTML = `
    <strong>${message}</strong><br>
    <small>${data.email || ''} - ${new Date(data.timestamp).toLocaleString()}</small>
  `;
  alertsContainer.insertBefore(alertDiv, alertsContainer.firstChild);
  
  if (alertsContainer.children.length > 10) {
    alertsContainer.removeChild(alertsContainer.lastChild);
  }
}

function displayLogs(logs) {
  const logsContainer = document.getElementById('logsContainer');
  logsContainer.innerHTML = '';
  
  logs.forEach(log => {
    const logDiv = document.createElement('div');
    logDiv.className = 'log-item';
    logDiv.innerHTML = `
      <div class="log-info">
        <strong>${log.attackType}</strong><br>
        <small>IP: ${log.ipAddress} | Device: ${log.deviceInfo.substring(0, 50)}...</small><br>
        <small>${log.location.city}, ${log.location.country} - ${new Date(log.timestamp).toLocaleString()}</small>
      </div>
      <span class="log-badge badge-${log.riskLevel}">${log.riskLevel.toUpperCase()}</span>
    `;
    logsContainer.appendChild(logDiv);
  });
}

async function loadDashboard() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/security/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      document.getElementById('riskScore').textContent = data.user.riskScore;
      document.getElementById('totalAttacks').textContent = data.totalAttacks;
      document.getElementById('loginAttempts').textContent = data.user.loginAttempts;
      document.getElementById('accountStatus').textContent = data.user.isLocked ? 'LOCKED' : 'Active';
      document.getElementById('accountStatus').style.color = data.user.isLocked ? '#e74c3c' : '#27ae60';
      
      displayLogs(data.attackLogs);
      
      data.attackLogs.forEach(log => addAttackMarker(log));
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

async function activatePanic() {
  if (!confirm('⚠️ Are you sure you want to activate PANIC MODE?\n\nThis will:\n- Lock your account\n- Terminate all sessions\n- Clear all trusted devices\n\nYou will be logged out immediately.')) {
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/security/panic`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    alert('🚨 ' + data.message + '\n\nYou will now be logged out.');
    logout();
  } catch (error) {
    alert('Error activating panic mode');
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

socket.on('connect', () => {
  console.log('🔌 Connected to security server');
});

socket.on('securityAlert', (data) => {
  addAlert(data.message, data.riskLevel, data);
  
  const currentAttempts = parseInt(document.getElementById('loginAttempts').textContent);
  document.getElementById('loginAttempts').textContent = currentAttempts + 1;
});

socket.on('newAttack', (attack) => {
  addAttackMarker(attack);
  
  const currentTotal = parseInt(document.getElementById('totalAttacks').textContent);
  document.getElementById('totalAttacks').textContent = currentTotal + 1;
  
  const logsContainer = document.getElementById('logsContainer');
  const logDiv = document.createElement('div');
  logDiv.className = 'log-item';
  logDiv.innerHTML = `
    <div class="log-info">
      <strong>${attack.attackType}</strong><br>
      <small>IP: ${attack.ipAddress} | Device: ${attack.deviceInfo.substring(0, 50)}...</small><br>
      <small>${attack.location.city}, ${attack.location.country} - ${new Date(attack.timestamp).toLocaleString()}</small>
    </div>
    <span class="log-badge badge-${attack.riskLevel}">${attack.riskLevel.toUpperCase()}</span>
  `;
  logsContainer.insertBefore(logDiv, logsContainer.firstChild);
});

socket.on('panicActivated', (data) => {
  alert('🚨 PANIC MODE ACTIVATED!\n\n' + data.message);
  logout();
});

initMap();
loadDashboard();
