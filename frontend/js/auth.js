// ============================================
// DDS Authentication - Complete Clean Version
// All Errors Fixed, Network Error Handling
// ============================================

const API_URL = 'http://localhost:5000';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showMessage(message, type = 'error') {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

function showLoading(buttonId, show = true) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  
  const btnText = button.querySelector('.btn-text');
  const btnLoader = button.querySelector('.btn-loader');
  
  if (show) {
    if (btnText) btnText.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'inline-block';
    button.disabled = true;
  } else {
    if (btnText) btnText.style.display = 'inline';
    if (btnLoader) btnLoader.style.display = 'none';
    button.disabled = false;
  }
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// ============================================
// REGISTRATION HANDLER
// ============================================

async function handleRegister() {
  const name = document.getElementById('name')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;
  const terms = document.getElementById('terms')?.checked;
  
  // Validation
  if (!name || !email || !password || !confirmPassword) {
    showMessage('❌ Please fill in all fields', 'error');
    return;
  }
  
  if (!validateEmail(email)) {
    showMessage('❌ Please enter a valid email address', 'error');
    return;
  }
  
  if (password.length < 6) {
    showMessage('❌ Password must be at least 6 characters long', 'error');
    return;
  }
  
  if (password !== confirmPassword) {
    showMessage('❌ Passwords do not match', 'error');
    return;
  }
  
  if (!terms) {
    showMessage('❌ Please accept the terms and conditions', 'error');
    return;
  }
  
  showLoading('registerBtn', true);
  
  try {
    const response = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      showMessage('✅ Registration successful! Redirecting...', 'success');
      
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    } else {
      showMessage('❌ ' + (data.error || 'Registration failed'), 'error');
      showLoading('registerBtn', false);
    }
  } catch (error) {
    console.error('Registration error:', error);
    showMessage('❌ Connection error. Please check if backend is running.', 'error');
    showLoading('registerBtn', false);
  }
}

// ============================================
// LOGIN HANDLER
// ============================================

async function handleLogin() {
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  const verificationCode = document.getElementById('verificationCode')?.value?.trim();
  
  // Validation
  if (!email || !password) {
    showMessage('❌ Please enter email and password', 'error');
    return;
  }
  
  if (!validateEmail(email)) {
    showMessage('❌ Please enter a valid email address', 'error');
    return;
  }
  
  showLoading('loginBtn', true);
  
  try {
    const requestBody = { email, password };
    if (verificationCode) {
      requestBody.verificationCode = verificationCode;
    }
    
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      if (data.wasVerified) {
        showMessage('✅ Verification successful! Redirecting...', 'success');
      } else {
        showMessage('✅ Login successful! Redirecting...', 'success');
      }
      
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    } else {
      // Handle different error scenarios
      if (data.requiresPasswordChange) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showMessage('⚠️ Password change required. Redirecting...', 'warning');
        setTimeout(() => {
          window.location.href = 'forgot-password.html';
        }, 1500);
        return;
      }
      
      if (data.requiresVerification || data.panicMode) {
        showVerificationForm(data.message || 'Verification required');
        showMessage('🔑 ' + (data.error || 'Please enter verification code'), 'warning');
      } else if (data.locked) {
        showMessage('🔒 Account locked due to suspicious activity. Please contact support.', 'error');
      } else if (data.blocked) {
        showMessage('🚫 ' + data.error, 'error');
      } else if (data.attempts !== undefined) {
        const remaining = data.remaining || 0;
        showMessage(`⚠️ Invalid credentials. ${remaining} attempts remaining before lockout.`, 'warning');
      } else {
        showMessage('❌ ' + (data.error || 'Login failed'), 'error');
      }
      showLoading('loginBtn', false);
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('❌ Connection error. Please check if backend is running.', 'error');
    showLoading('loginBtn', false);
  }
}

// ============================================
// VERIFICATION FORM
// ============================================

function showVerificationForm(message) {
  const form = document.getElementById('loginForm');
  if (!form) return;
  
  // Check if verification field already exists
  if (document.getElementById('verificationCode')) return;
  
  // Create verification field
  const verificationGroup = document.createElement('div');
  verificationGroup.className = 'form-group';
  verificationGroup.innerHTML = `
    <label for="verificationCode">🔑 Verification Code</label>
    <input 
      type="text" 
      id="verificationCode" 
      placeholder="Enter 6-digit code" 
      required
      autocomplete="off"
      maxlength="6"
      style="text-transform: uppercase; letter-spacing: 3px; font-weight: bold;"
    >
    <small class="form-hint" style="color: #ef4444;">
      ${message}<br>
      Check console for verification code (in production, sent via email).
    </small>
  `;
  
  // Insert after password field
  const passwordGroup = form.querySelector('input[type="password"]').parentElement;
  passwordGroup.parentElement.insertBefore(verificationGroup, passwordGroup.nextSibling);
  
  // Add resend button
  const resendBtn = document.createElement('button');
  resendBtn.type = 'button';
  resendBtn.className = 'btn-secondary';
  resendBtn.style.cssText = 'margin-top: 10px; width: 100%; padding: 0.75rem;';
  resendBtn.textContent = '🔄 Resend Verification Code';
  resendBtn.onclick = () => resendVerificationCode(document.getElementById('email').value);
  verificationGroup.appendChild(resendBtn);
}

async function resendVerificationCode(email) {
  if (!email) {
    showMessage('❌ Please enter your email address', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/security/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showMessage(`✅ Verification code sent! Code: ${data.verificationCode}`, 'success');
    } else {
      showMessage('❌ ' + (data.error || 'Failed to resend code'), 'error');
    }
  } catch (error) {
    console.error('Resend error:', error);
    showMessage('❌ Connection error. Please try again.', 'error');
  }
}

// ============================================
// FORGOT PASSWORD HANDLER
// ============================================

async function handleForgotPassword() {
  const email = document.getElementById('email')?.value.trim();
  
  if (!email) {
    showMessage('❌ Please enter your email address', 'error');
    return;
  }
  
  if (!validateEmail(email)) {
    showMessage('❌ Please enter a valid email address', 'error');
    return;
  }
  
  showLoading('resetBtn', true);
  
  try {
    const response = await fetch(`${API_URL}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      showMessage('✅ Password reset link sent to your email!', 'success');
      
      // In production, this would be sent via email
      if (data.resetToken) {
        console.log('Reset Token (for demo):', data.resetToken);
      }
    } else {
      showMessage('❌ ' + (data.error || 'Failed to send reset link'), 'error');
    }
    
    showLoading('resetBtn', false);
  } catch (error) {
    console.error('Forgot password error:', error);
    showMessage('❌ Connection error. Please check if backend is running.', 'error');
    showLoading('resetBtn', false);
  }
}

// ============================================
// AUTHENTICATION UTILITIES
// ============================================

function checkAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    if (window.location.pathname.includes('dashboard.html')) {
      window.location.href = 'login.html';
    }
    return false;
  }
  
  return true;
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.clear();
  window.location.href = 'index.html';
}

function getUserInfo() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user info:', error);
    return null;
  }
}

function getAuthToken() {
  return localStorage.getItem('token');
}

async function authenticatedRequest(url, options = {}) {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      throw new Error('Unauthorized');
    }
    
    return response;
  } catch (error) {
    console.error('Request error:', error);
    throw error;
  }
}

// ============================================
// EXPORT FOR OTHER SCRIPTS
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleRegister,
    handleLogin,
    handleForgotPassword,
    handleLogout,
    checkAuth,
    getUserInfo,
    getAuthToken,
    authenticatedRequest,
    API_URL
  };
}
