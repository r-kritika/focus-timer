// Background service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Focus Timer v2 installed');
  
  // Initialize storage with user name
  chrome.storage.local.get(['userName', 'sessions'], (result) => {
    if (!result.userName) {
      chrome.storage.local.set({ userName: 'krit' });
    }
    if (!result.sessions) {
      chrome.storage.local.set({ sessions: [] });
    }
  });
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.action.openPopup();
});

// Optional: Badge to show today's session count
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.sessions) {
    updateBadge();
  }
});

function updateBadge() {
  chrome.storage.local.get(['sessions'], (result) => {
    const sessions = result.sessions || [];
    const today = new Date().toISOString().split('T')[0];
    const todaysSessions = sessions.filter(s => s.date === today && s.phase === 'focus');
    
    if (todaysSessions.length > 0) {
      chrome.action.setBadgeText({ text: todaysSessions.length.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });
}

// Update badge on startup
updateBadge();
