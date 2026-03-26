// DDS Panic Button - Background Service Worker
// Yeh ACTUALLY kaam karta hai - cookies clear karke logout karta hai

const ALL_DOMAINS = [
  // Google (Gmail, YouTube, Drive)
  'google.com', 'gmail.com', 'youtube.com', 'accounts.google.com',
  // Microsoft (Outlook, OneDrive)
  'live.com', 'outlook.com', 'microsoft.com', 'office.com', 'microsoftonline.com',
  // Yahoo
  'yahoo.com', 'mail.yahoo.com',
  // Proton
  'proton.me', 'protonmail.com',
  // Facebook & Instagram (Meta)
  'facebook.com', 'instagram.com', 'meta.com',
  // Twitter/X
  'twitter.com', 'x.com',
  // LinkedIn
  'linkedin.com',
  // Snapchat
  'snapchat.com',
  // WhatsApp
  'whatsapp.com', 'web.whatsapp.com',
  // Telegram
  'telegram.org', 'web.telegram.org',
  // Discord
  'discord.com',
  // Netflix
  'netflix.com',
  // Amazon / Prime
  'amazon.com', 'primevideo.com',
  // Spotify
  'spotify.com', 'accounts.spotify.com',
  // Dropbox
  'dropbox.com',
  // GitHub
  'github.com',
  // GitLab
  'gitlab.com',
  // Stack Overflow
  'stackoverflow.com', 'stackexchange.com',
  // Vercel
  'vercel.com',
  // Netlify
  'netlify.com'
];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'panicLogout') {
    doPanicLogout().then(sendResponse);
    return true;
  }
});

// Also listen from external websites (DDS Dashboard)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === 'panicLogout') {
    doPanicLogout().then(sendResponse);
    return true;
  }
  // Respond to ping so dashboard can find extension ID
  if (request.action === 'ping') {
    sendResponse({ success: true, name: 'DDS Panic Button' });
  }
});

async function doPanicLogout() {
  let cookiesCleared = 0;
  let tabsClosed = 0;

  // Step 1: Clear ALL cookies for every domain
  for (const domain of ALL_DOMAINS) {
    // Try both with and without dot prefix
    const variants = [domain, '.' + domain, 'www.' + domain];
    
    for (const d of variants) {
      try {
        const cookies = await chrome.cookies.getAll({ domain: d });
        for (const cookie of cookies) {
          const protocol = cookie.secure ? 'https' : 'http';
          const cookieDomain = cookie.domain.startsWith('.') 
            ? cookie.domain.substring(1) 
            : cookie.domain;
          const url = `${protocol}://${cookieDomain}${cookie.path}`;
          
          try {
            await chrome.cookies.remove({ url, name: cookie.name });
            cookiesCleared++;
          } catch (e) {}
        }
      } catch (e) {}
    }
  }

  // Step 2: Close all tabs that belong to these domains
  try {
    const allTabs = await chrome.tabs.query({});
    for (const tab of allTabs) {
      if (!tab.url) continue;
      const isTarget = ALL_DOMAINS.some(d => tab.url.includes(d));
      if (isTarget) {
        try {
          await chrome.tabs.remove(tab.id);
          tabsClosed++;
        } catch (e) {}
      }
    }
  } catch (e) {}

  // Step 3: Clear browsing data (cache, localStorage, sessionStorage)
  try {
    await chrome.browsingData.remove(
      { since: 0 },
      {
        cookies: true,
        cache: true,
        localStorage: true,
        sessionStorage: true,
        indexedDB: true,
        serviceWorkers: true
      }
    );
  } catch (e) {}

  return { success: true, cookiesCleared, tabsClosed };
}
