const API_URL = 'http://localhost:5000';

function toggleForm() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (loginForm.style.display === 'none') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
  
  document.getElementById('message').innerHTML = '';
}

function showMessage(text, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = text;
  messageDiv.className = type;
}

async function register() {
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  
  if (!name || !email || !password) {
    showMessage('Please fill all fields', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      showMessage('Registration successful! Redirecting...', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
    } else {
      showMessage(data.error || 'Registration failed', 'error');
    }
  } catch (error) {
    showMessage('Connection error', 'error');
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    showMessage('Please fill all fields', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      showMessage('Login successful! Redirecting...', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
    } else {
      showMessage(data.error || 'Login failed', 'error');
    }
  } catch (error) {
    showMessage('Connection error', 'error');
  }
}
