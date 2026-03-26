// Practical Universal Logout - Opens logout pages in new tabs
// User ko manually logout karna padega but yeh fastest way hai

const LOGOUT_LINKS = [
  // Google Services
  { name: '📧 Gmail', url: 'https://mail.google.com/mail/u/0/?logout&hl=en', instruction: 'Click logout if prompted' },
  { name: '🎥 YouTube', url: 'https://www.youtube.com/logout', instruction: 'Click logout' },
  { name: '📁 Google Drive', url: 'https://accounts.google.com/Logout', instruction: 'Will auto-logout' },
  
  // Microsoft
  { name: '📧 Outlook', url: 'https://outlook.live.com/mail/0/?actSwt=true', instruction: 'Click your profile > Sign out' },
  { name: '📁 OneDrive', url: 'https://onedrive.live.com/', instruction: 'Click profile > Sign out' },
  
  // Yahoo
  { name: '📧 Yahoo Mail', url: 'https://mail.yahoo.com/', instruction: 'Click profile > Sign out' },
  
  // Social Media
  { name: '📷 Instagram', url: 'https://www.instagram.com/accounts/logout/', instruction: 'Will auto-logout' },
  { name: '👥 Facebook', url: 'https://www.facebook.com/logout.php', instruction: 'Will auto-logout' },
  { name: '🐦 Twitter/X', url: 'https://twitter.com/logout', instruction: 'Click logout' },
  { name: '💼 LinkedIn', url: 'https://www.linkedin.com/m/logout/', instruction: 'Will auto-logout' },
  
  // Messaging
  { name: '💬 WhatsApp Web', url: 'https://web.whatsapp.com/', instruction: 'Click menu > Log out' },
  { name: '✈️ Telegram', url: 'https://web.telegram.org/k/', instruction: 'Click menu > Log out' },
  { name: '🎮 Discord', url: 'https://discord.com/channels/@me', instruction: 'Click settings > Log out' },
  
  // Entertainment
  { name: '🎬 Netflix', url: 'https://www.netflix.com/SignOut', instruction: 'Will auto-logout' },
  { name: '📺 Prime Video', url: 'https://www.primevideo.com/', instruction: 'Click account > Sign out' },
  { name: '🎵 Spotify', url: 'https://www.spotify.com/logout/', instruction: 'Will auto-logout' },
  
  // Developer
  { name: '💻 GitHub', url: 'https://github.com/logout', instruction: 'Click logout' },
  { name: '🦊 GitLab', url: 'https://gitlab.com/users/sign_out', instruction: 'Will auto-logout' },
  { name: '📚 Stack Overflow', url: 'https://stackoverflow.com/users/logout', instruction: 'Click logout' }
];

// Open all logout pages
function openAllLogoutPages() {
  return new Promise((resolve) => {
    // Create instruction window
    const instructionWindow = window.open('', 'LogoutInstructions', 'width=500,height=700,left=50,top=50');
    
    if (!instructionWindow) {
      alert('⚠️ Please allow popups to use this feature!');
      resolve({ success: false });
      return;
    }
    
    // Create instruction page
    instructionWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Logout Instructions</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            overflow-y: auto;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 1.5rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          h1 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            text-align: center;
          }
          .subtitle {
            text-align: center;
            opacity: 0.9;
            margin-bottom: 1.5rem;
            font-size: 0.9rem;
          }
          .alert {
            background: rgba(239, 68, 68, 0.3);
            border: 2px solid rgba(239, 68, 68, 0.6);
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            text-align: center;
            font-weight: 600;
          }
          .info {
            background: rgba(59, 130, 246, 0.3);
            border: 2px solid rgba(59, 130, 246, 0.6);
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1rem;
            font-size: 0.85rem;
            line-height: 1.6;
          }
          .list {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            padding: 1rem;
            max-height: 400px;
            overflow-y: auto;
          }
          .item {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            font-size: 0.85rem;
          }
          .item-name {
            font-weight: 700;
            margin-bottom: 0.25rem;
          }
          .item-instruction {
            opacity: 0.9;
            font-size: 0.8rem;
          }
          .status {
            text-align: center;
            margin-top: 1rem;
            font-size: 0.9rem;
            font-weight: 600;
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
            margin-top: 1rem;
            transition: all 0.3s ease;
          }
          .close-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
          ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚨 Universal Logout</h1>
          <p class="subtitle">Opening ${LOGOUT_LINKS.length} logout pages...</p>
          
          <div class="alert">
            ⚠️ ${LOGOUT_LINKS.length} new tabs will open!<br>
            Please logout from each tab manually.
          </div>
          
          <div class="info">
            <strong>📋 Instructions:</strong><br>
            • Each website will open in a new tab<br>
            • Some will auto-logout<br>
            • Others need manual logout<br>
            • Close tabs after logout<br>
            • Keep this window open for reference
          </div>
          
          <div class="list" id="siteList">
            ${LOGOUT_LINKS.map(link => `
              <div class="item">
                <div class="item-name">${link.name}</div>
                <div class="item-instruction">→ ${link.instruction}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="status" id="status">
            Opening tabs... Please wait
          </div>
          
          <button class="close-btn" onclick="window.close()">
            ✅ Done - Close This Window
          </button>
        </div>
      </body>
      </html>
    `);
    
    // Open all logout tabs with delay
    let opened = 0;
    LOGOUT_LINKS.forEach((link, index) => {
      setTimeout(() => {
        window.open(link.url, `_blank_${index}`);
        opened++;
        
        const statusEl = instructionWindow.document.getElementById('status');
        if (statusEl) {
          statusEl.textContent = `Opened ${opened}/${LOGOUT_LINKS.length} tabs`;
        }
        
        if (opened === LOGOUT_LINKS.length) {
          setTimeout(() => {
            if (statusEl) {
              statusEl.textContent = '✅ All tabs opened! Please logout from each tab.';
            }
          }, 500);
        }
      }, index * 300); // 300ms delay between each tab
    });
    
    resolve({ success: true, opened: LOGOUT_LINKS.length });
  });
}

// Export
window.openAllLogoutPages = openAllLogoutPages;
window.performUniversalLogout = openAllLogoutPages; // Alias
