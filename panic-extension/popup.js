// Popup script for DDS Panic Button Extension

document.getElementById('panicBtn').addEventListener('click', async () => {
  const btn = document.getElementById('panicBtn');
  const status = document.getElementById('status');
  
  // Confirm
  const confirmed = confirm(
    '⚠️ PANIC LOGOUT\n\n' +
    'This will:\n' +
    '• Clear ALL cookies from 28+ websites\n' +
    '• Close all related tabs\n' +
    '• Clear cache and local storage\n\n' +
    'You will be logged out from EVERYTHING!\n\n' +
    'Continue?'
  );
  
  if (!confirmed) return;
  
  // Disable button
  btn.disabled = true;
  btn.textContent = '🔄 Processing...';
  
  // Show processing status
  status.className = 'status processing';
  status.innerHTML = '🔄 Clearing cookies and logging out...<br>Please wait...';
  
  try {
    // Send message to background script
    const result = await chrome.runtime.sendMessage({ action: 'panicLogout' });
    
    if (result && result.success) {
      // Show success
      status.className = 'status success';
      status.innerHTML = `
        ✅ <strong>Logout Complete!</strong>
        <div class="stats">
          🍪 Cookies cleared: ${result.cookiesCleared}<br>
          📑 Tabs closed: ${result.tabsClosed}<br>
          🌐 Domains affected: ${result.domains.length}
        </div>
      `;
      
      btn.textContent = '✅ Done!';
      
      // Reset after 3 seconds
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = '🚨 Activate Panic Logout';
        status.style.display = 'none';
      }, 3000);
      
    } else {
      throw new Error(result?.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('Error:', error);
    
    // Show error
    status.className = 'status error';
    status.innerHTML = `❌ Error: ${error.message}`;
    
    btn.disabled = false;
    btn.textContent = '🚨 Activate Panic Logout';
  }
});
