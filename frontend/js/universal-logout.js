// Universal Logout System - Logout from all major websites
const LOGOUT_URLS = [
  // Email Services
  { name: 'Gmail', url: 'https://accounts.google.com/Logout', method: 'GET' },
  { name: 'Outlook', url: 'https://login.live.com/logout.srf', method: 'GET' },
  { name: 'Yahoo Mail', url: 'https://login.yahoo.com/.src=ym&.done=https://mail.yahoo.com&logout=1', method: 'GET' },
  { name: 'Proton Mail', url: 'https://account.proton.me/logout', method: 'GET' },
  
  // Social Media
  { name: 'Instagram', url: 'https://www.instagram.com/accounts/logout/', method: 'POST' },
  { name: 'Facebook', url: 'https://www.facebook.com/logout.php', method: 'GET' },
  { name: 'Twitter/X', url: 'https://twitter.com/logout', method: 'POST' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/uas/logout', method: 'GET' },
  { name: 'Snapchat', url: 'https://accounts.snapchat.com/accounts/logout', method: 'GET' },
  
  // Messaging
  { name: 'WhatsApp Web', url: 'https://web.whatsapp.com', method: 'CLEAR' },
  { name: 'Telegram Web', url: 'https://web.telegram.org/k/', method: 'CLEAR' },
  { name: 'Discord', url: 'https://discord.com/api/auth/logout', method: 'POST' },
  
  // Entertainment
  { name: 'YouTube', url: 'https://accounts.google.com/Logout', method: 'GET' },
  { name: 'Netflix', url: 'https://www.netflix.com/SignOut', method: 'GET' },
  { name: 'Prime Video', url: 'https://www.amazon.com/ap/signin?openid.return_to=https://www.primevideo.com', method: 'GET' },
  { name: 'Spotify', url: 'https://accounts.spotify.com/logout', method: 'GET' },
  
  // Cloud Storage
  { name: 'Google Drive', url: 'https://accounts.google.com/Logout', method: 'GET' },
  { name: 'Dropbox', url: 'https://www.dropbox.com/logout', method: 'GET' },
  { name: 'OneDrive', url: 'https://login.live.com/logout.srf', method: 'GET' },
  
  // Developer Platforms
  { name: 'GitHub', url: 'https://github.com/logout', method: 'POST' },
  { name: 'GitLab', url: 'https://gitlab.com/users/sign_out', method: 'GET' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com/users/logout', method: 'POST' },
  { name: 'Vercel', url: 'https://vercel.com/logout', method: 'GET' },
  { name: 'Netlify', url: 'https://app.netlify.com/logout', method: 'GET' }
];

// Universal Logout Function
async function performUniversalLogout() {
  return new Promise((resolve) => {
    // Create popup window for logout process
    const popupWindow = window.open('', 'UniversalLogout', 'width=600,height=400,left=100,top=100');
    
    if (!popupWindow) {
      alert('⚠️ Please allow popups for this site to enable Universal Logout feature.');
      resolve({ success: false, message: 'Popup blocked' });
      return;
    }
    
    // Style the popup window
    popupWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Universal Logout - DDS Security</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            overflow-y: auto;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          h1 {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
            text-align: center;
          }
          .subtitle {
            text-align: center;
            opacity: 0.9;
            margin-bottom: 2rem;
            font-size: 0.9rem;
          }
          .progress-container {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1.5rem;
          }
          .progress-bar {
            background: rgba(255, 255, 255, 0.3);
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 0.5rem;
          }
          .progress-fill {
            background: linear-gradient(90deg, #10b981, #34d399);
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 4px;
          }
          .progress-text {
            font-size: 0.9rem;
            text-align: center;
            font-weight: 600;
          }
          .logout-list {
            max-height: 300px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            padding: 1rem;
          }
          .logout-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            font-size: 0.9rem;
          }
          .logout-item.processing {
            background: rgba(59, 130, 246, 0.3);
            animation: pulse 1s infinite;
          }
          .logout-item.success {
            background: rgba(16, 185, 129, 0.3);
          }
          .logout-item.error {
            background: rgba(239, 68, 68, 0.3);
          }
          .status-icon {
            font-size: 1.2rem;
          }
          .close-btn {
            width: 100%;
            padding: 1rem;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 1.5rem;
            transition: all 0.3s ease;
          }
          .close-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          .close-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          ::-webkit-scrollbar {
            width: 8px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚨 Universal Logout</h1>
          <p class="subtitle">Logging out from all connected services...</p>
          
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-text" id="progressText">0 / ${LOGOUT_URLS.length} completed</div>
          </div>
          
          <div class="logout-list" id="logoutList"></div>
          
          <button class="close-btn" id="closeBtn" disabled>
            Please wait...
          </button>
        </div>
      </body>
      </html>
    `);
    
    const doc = popupWindow.document;
    const logoutList = doc.getElementById('logoutList');
    const progressFill = doc.getElementById('progressFill');
    const progressText = doc.getElementById('progressText');
    const closeBtn = doc.getElementById('closeBtn');
    
    let completed = 0;
    const total = LOGOUT_URLS.length;
    
    // Create logout items
    LOGOUT_URLS.forEach(site => {
      const item = doc.createElement('div');
      item.className = 'logout-item';
      item.id = `logout-${site.name.replace(/\s+/g, '-')}`;
      item.innerHTML = `
        <span>${site.name}</span>
        <span class="status-icon">⏳</span>
      `;
      logoutList.appendChild(item);
    });
    
    // Perform logout for each site
    const logoutPromises = LOGOUT_URLS.map((site, index) => {
      return new Promise((resolveLogout) => {
        setTimeout(() => {
          const item = doc.getElementById(`logout-${site.name.replace(/\s+/g, '-')}`);
          const statusIcon = item.querySelector('.status-icon');
          
          // Mark as processing
          item.className = 'logout-item processing';
          statusIcon.textContent = '🔄';
          
          // Method 1: Try fetch API for POST requests
          if (site.method === 'POST') {
            fetch(site.url, {
              method: 'POST',
              credentials: 'include',
              mode: 'no-cors'
            }).catch(() => {});
          }
          
          // Method 2: Create hidden iframe to trigger logout
          const iframe = doc.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = site.url;
          iframe.sandbox = 'allow-same-origin allow-scripts allow-forms';
          doc.body.appendChild(iframe);
          
          // Method 3: Try opening in new window (for stubborn sites)
          if (site.method === 'CLEAR') {
            const tempWindow = window.open(site.url, '_blank', 'width=1,height=1');
            setTimeout(() => {
              if (tempWindow) tempWindow.close();
            }, 1000);
          }
          
          // Wait for logout attempt
          setTimeout(() => {
            completed++;
            
            // Update progress
            const progress = (completed / total) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${completed} / ${total} completed`;
            
            // Mark as success
            item.className = 'logout-item success';
            statusIcon.textContent = '✅';
            
            // Remove iframe
            iframe.remove();
            
            // Check if all completed
            if (completed === total) {
              closeBtn.disabled = false;
              closeBtn.textContent = '✅ Close Window';
              closeBtn.onclick = () => {
                popupWindow.close();
                resolve({ success: true, completed: total });
              };
              
              // Auto close after 5 seconds
              setTimeout(() => {
                if (!popupWindow.closed) {
                  popupWindow.close();
                  resolve({ success: true, completed: total });
                }
              }, 5000);
            }
            
            resolveLogout();
          }, 3000); // Wait 3 seconds per site
          
        }, index * 100); // Stagger requests by 100ms
      });
    });
    
    // Wait for all logouts to complete
    Promise.all(logoutPromises).then(() => {
      console.log('✅ Universal logout completed');
    });
  });
}

// Export function
window.performUniversalLogout = performUniversalLogout;
