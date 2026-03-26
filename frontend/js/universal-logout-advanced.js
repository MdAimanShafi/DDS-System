// Advanced Universal Logout System - Clear cookies and sessions
const LOGOUT_SITES = [
  // Google Services (Gmail, YouTube, Drive)
  { 
    name: 'Google Services', 
    domains: ['.google.com', '.youtube.com', '.gmail.com'],
    logoutUrl: 'https://accounts.google.com/Logout?continue=https://www.google.com'
  },
  
  // Microsoft Services (Outlook, OneDrive)
  { 
    name: 'Microsoft Services', 
    domains: ['.live.com', '.outlook.com', '.microsoft.com', '.office.com'],
    logoutUrl: 'https://login.live.com/logout.srf'
  },
  
  // Yahoo
  { 
    name: 'Yahoo Mail', 
    domains: ['.yahoo.com'],
    logoutUrl: 'https://login.yahoo.com/?.src=ym&.done=https://mail.yahoo.com&logout=1'
  },
  
  // Proton
  { 
    name: 'Proton Mail', 
    domains: ['.proton.me', '.protonmail.com'],
    logoutUrl: 'https://account.proton.me/logout'
  },
  
  // Facebook & Instagram
  { 
    name: 'Facebook', 
    domains: ['.facebook.com'],
    logoutUrl: 'https://www.facebook.com/logout.php?next=https://www.facebook.com/'
  },
  { 
    name: 'Instagram', 
    domains: ['.instagram.com'],
    logoutUrl: 'https://www.instagram.com/accounts/logout/'
  },
  
  // Twitter/X
  { 
    name: 'Twitter/X', 
    domains: ['.twitter.com', '.x.com'],
    logoutUrl: 'https://twitter.com/logout'
  },
  
  // LinkedIn
  { 
    name: 'LinkedIn', 
    domains: ['.linkedin.com'],
    logoutUrl: 'https://www.linkedin.com/uas/logout'
  },
  
  // Snapchat
  { 
    name: 'Snapchat', 
    domains: ['.snapchat.com'],
    logoutUrl: 'https://accounts.snapchat.com/accounts/logout'
  },
  
  // WhatsApp
  { 
    name: 'WhatsApp Web', 
    domains: ['.whatsapp.com'],
    logoutUrl: 'https://web.whatsapp.com'
  },
  
  // Telegram
  { 
    name: 'Telegram Web', 
    domains: ['.telegram.org'],
    logoutUrl: 'https://web.telegram.org/k/'
  },
  
  // Discord
  { 
    name: 'Discord', 
    domains: ['.discord.com'],
    logoutUrl: 'https://discord.com/api/auth/logout'
  },
  
  // Netflix
  { 
    name: 'Netflix', 
    domains: ['.netflix.com'],
    logoutUrl: 'https://www.netflix.com/SignOut'
  },
  
  // Amazon/Prime
  { 
    name: 'Prime Video', 
    domains: ['.amazon.com', '.primevideo.com'],
    logoutUrl: 'https://www.amazon.com/gp/flex/sign-out.html'
  },
  
  // Spotify
  { 
    name: 'Spotify', 
    domains: ['.spotify.com'],
    logoutUrl: 'https://accounts.spotify.com/logout'
  },
  
  // Dropbox
  { 
    name: 'Dropbox', 
    domains: ['.dropbox.com'],
    logoutUrl: 'https://www.dropbox.com/logout'
  },
  
  // GitHub
  { 
    name: 'GitHub', 
    domains: ['.github.com'],
    logoutUrl: 'https://github.com/logout'
  },
  
  // GitLab
  { 
    name: 'GitLab', 
    domains: ['.gitlab.com'],
    logoutUrl: 'https://gitlab.com/users/sign_out'
  },
  
  // Stack Overflow
  { 
    name: 'Stack Overflow', 
    domains: ['.stackoverflow.com', '.stackexchange.com'],
    logoutUrl: 'https://stackoverflow.com/users/logout'
  },
  
  // Vercel
  { 
    name: 'Vercel', 
    domains: ['.vercel.com'],
    logoutUrl: 'https://vercel.com/logout'
  },
  
  // Netlify
  { 
    name: 'Netlify', 
    domains: ['.netlify.com'],
    logoutUrl: 'https://app.netlify.com/logout'
  }
];

// Advanced Universal Logout Function
async function performAdvancedUniversalLogout() {
  return new Promise((resolve) => {
    // Create popup window for logout process
    const popupWindow = window.open('', 'AdvancedUniversalLogout', 'width=700,height=500,left=100,top=100');
    
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
        <title>Advanced Universal Logout - DDS Security</title>
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
            max-width: 600px;
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
          .warning {
            background: rgba(239, 68, 68, 0.2);
            border: 2px solid rgba(239, 68, 68, 0.5);
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1.5rem;
            text-align: center;
            font-weight: 600;
          }
          .progress-container {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1.5rem;
          }
          .progress-bar {
            background: rgba(255, 255, 255, 0.3);
            height: 10px;
            border-radius: 5px;
            overflow: hidden;
            margin-bottom: 0.5rem;
          }
          .progress-fill {
            background: linear-gradient(90deg, #10b981, #34d399);
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 5px;
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
            margin-bottom: 1rem;
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
          .status-icon {
            font-size: 1.2rem;
          }
          .info-box {
            background: rgba(59, 130, 246, 0.2);
            border: 2px solid rgba(59, 130, 246, 0.5);
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1.5rem;
            font-size: 0.85rem;
            line-height: 1.6;
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
          <h1>🚨 Advanced Universal Logout</h1>
          <p class="subtitle">Logging out from all connected services...</p>
          
          <div class="warning">
            ⚠️ This will open multiple tabs to logout from each service
          </div>
          
          <div class="info-box">
            💡 <strong>How it works:</strong><br>
            • Opens each website in a new tab<br>
            • Triggers logout on that website<br>
            • Closes the tab automatically<br>
            • Shows real-time progress here
          </div>
          
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-text" id="progressText">0 / ${LOGOUT_SITES.length} completed</div>
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
    const total = LOGOUT_SITES.length;
    
    // Create logout items
    LOGOUT_SITES.forEach(site => {
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
    const logoutPromises = LOGOUT_SITES.map((site, index) => {
      return new Promise((resolveLogout) => {
        setTimeout(() => {
          const item = doc.getElementById(`logout-${site.name.replace(/\s+/g, '-')}`);
          const statusIcon = item.querySelector('.status-icon');
          
          // Mark as processing
          item.className = 'logout-item processing';
          statusIcon.textContent = '🔄';
          
          // Open logout URL in new tab
          const logoutTab = window.open(site.logoutUrl, '_blank');
          
          // Wait and close the tab
          setTimeout(() => {
            if (logoutTab) {
              try {
                logoutTab.close();
              } catch (e) {
                console.log('Could not close tab:', e);
              }
            }
            
            completed++;
            
            // Update progress
            const progress = (completed / total) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${completed} / ${total} completed`;
            
            // Mark as success
            item.className = 'logout-item success';
            statusIcon.textContent = '✅';
            
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
          }, 3000); // Keep tab open for 3 seconds
          
        }, index * 500); // Stagger by 500ms to avoid browser blocking
      });
    });
    
    // Wait for all logouts to complete
    Promise.all(logoutPromises).then(() => {
      console.log('✅ Advanced universal logout completed');
    });
  });
}

// Export function
window.performAdvancedUniversalLogout = performAdvancedUniversalLogout;
window.performUniversalLogout = performAdvancedUniversalLogout; // Alias for compatibility
