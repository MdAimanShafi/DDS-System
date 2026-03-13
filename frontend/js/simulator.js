const API_URL = 'http://localhost:5000';

function addLog(message, type = 'info') {
  const logContent = document.getElementById('logContent');
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> <span class="log-message">${message}</span>`;
  logContent.insertBefore(entry, logContent.firstChild);

  // Auto-scroll to top
  logContent.scrollTop = 0;
}

async function simulateBruteForce() {
  const email = document.getElementById('bruteEmail').value;
  const password = document.getElementById('brutePassword').value;
  const count = parseInt(document.getElementById('bruteCount').value);

  if (!email || !password) {
    addLog('❌ Please fill in email and password fields', 'error');
    return;
  }

  if (count < 1 || count > 20) {
    addLog('❌ Number of attempts must be between 1 and 20', 'error');
    return;
  }

  addLog(`🚀 Starting brute force attack simulation...`, 'info');
  addLog(`🎯 Target: ${email} | Attempts: ${count}`, 'info');

  // Disable button during simulation
  const button = event.target;
  button.disabled = true;
  button.textContent = '🔄 Running...';

  for (let i = 1; i <= count; i++) {
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: password + i
        })
      });

      const data = await response.json();

      if (response.ok) {
        addLog(`✅ Attempt ${i}: Login successful (unexpected!)`, 'success');
      } else {
        addLog(`❌ Attempt ${i}: ${data.error}`, 'error');
      }

      // Delay between attempts
      await new Promise(resolve => setTimeout(resolve, 800));

    } catch (error) {
      addLog(`⚠️ Attempt ${i}: Connection error - ${error.message}`, 'warning');
    }
  }

  addLog(`🏁 Brute force simulation completed!`, 'success');
  addLog(`📊 Check the dashboard for security alerts and attack logs.`, 'info');

  // Re-enable button
  button.disabled = false;
  button.textContent = 'Start Brute Force';
}

async function simulateSQLInjection() {
  const payload = document.getElementById('sqlInput').value;

  if (!payload) {
    addLog('❌ Please enter an SQL payload', 'error');
    return;
  }

  addLog(`💉 Executing SQL injection simulation...`, 'info');
  addLog(`📝 Payload: ${payload}`, 'info');

  try {
    // This would normally be a vulnerable endpoint, but we'll simulate the detection
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload,
        password: 'test'
      })
    });

    const data = await response.json();

    if (response.status === 400 || data.error.includes('suspicious')) {
      addLog(`🛡️ SQL injection detected and blocked!`, 'success');
    } else {
      addLog(`⚠️ SQL injection attempt processed`, 'warning');
    }

  } catch (error) {
    addLog(`⚠️ Connection error during SQL injection test`, 'warning');
  }
}

async function simulateXSS() {
  const payload = document.getElementById('xssInput').value;

  if (!payload) {
    addLog('❌ Please enter an XSS payload', 'error');
    return;
  }

  addLog(`⚡ Executing XSS attack simulation...`, 'info');
  addLog(`📝 Payload: ${payload}`, 'info');

  // Simulate XSS detection (in a real app, this would be sanitized)
  if (payload.includes('<script>') || payload.includes('javascript:') || payload.includes('onload=')) {
    addLog(`🛡️ XSS attack detected and sanitized!`, 'success');
  } else {
    addLog(`⚠️ Potential XSS payload submitted`, 'warning');
  }

  // Simulate posting to a vulnerable endpoint
  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: payload
      })
    });

    addLog(`📤 XSS payload submitted to login endpoint`, 'info');

  } catch (error) {
    addLog(`⚠️ Connection error during XSS test`, 'warning');
  }
}

async function simulateDDoS() {
  const requests = parseInt(document.getElementById('ddosRequests').value);

  if (requests < 1 || requests > 50) {
    addLog('❌ Number of requests must be between 1 and 50', 'error');
    return;
  }

  addLog(`🌊 Starting DDoS simulation...`, 'info');
  addLog(`📊 Requests: ${requests}`, 'info');

  const button = event.target;
  button.disabled = true;
  button.textContent = '🔄 Running...';

  let successCount = 0;
  let failCount = 0;

  for (let i = 1; i <= requests; i++) {
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `bot${i}@attack.com`,
          password: 'password123'
        })
      });

      if (response.ok) {
        successCount++;
      } else {
        failCount++;
      }

      // Small delay to simulate distributed attack
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      failCount++;
    }
  }

  addLog(`🏁 DDoS simulation completed!`, 'success');
  addLog(`📈 Results: ${successCount} successful, ${failCount} blocked`, 'info');

  // Re-enable button
  button.disabled = false;
  button.textContent = 'Start DDoS';
}

function clearLog() {
  document.getElementById('logContent').innerHTML = '';
  addLog('🗑️ Log cleared', 'info');
}

function exportLog() {
  const logContent = document.getElementById('logContent');
  const entries = logContent.querySelectorAll('.log-entry');
  let logText = 'DDS Attack Simulator Log\n';
  logText += '=' .repeat(50) + '\n';
  logText += `Exported on: ${new Date().toLocaleString()}\n\n`;

  entries.forEach(entry => {
    const time = entry.querySelector('.log-time').textContent;
    const message = entry.querySelector('.log-message').textContent;
    logText += `${time} ${message}\n`;
  });

  const blob = new Blob([logText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dds-simulator-log-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  addLog('📄 Log exported successfully', 'success');
}

// Add CSS for log entries
const style = document.createElement('style');
style.textContent = `
  .log-entry {
    margin: 8px 0;
    padding: 8px 12px;
    border-radius: 6px;
    border-left: 3px solid;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .log-time {
    color: #6b7280;
    font-size: 12px;
    font-family: monospace;
    white-space: nowrap;
  }

  .log-message {
    flex: 1;
    line-height: 1.4;
  }

  .log-info {
    background: #f3f4f6;
    border-color: #6b7280;
  }

  .log-success {
    background: #d1fae5;
    border-color: #10b981;
  }

  .log-error {
    background: #fee2e2;
    border-color: #ef4444;
  }

  .log-warning {
    background: #fef3c7;
    border-color: #f59e0b;
  }

  .simulator-card button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .simulator-card button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;
document.head.appendChild(style);

// Initialize
addLog('🛡️ DDS Attack Simulator Ready', 'success');
addLog('⚠️ This tool is for DEMO and TESTING purposes only!', 'warning');
addLog('🔒 All simulations are logged for security monitoring', 'info');