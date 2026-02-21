// Background service worker for persistent timers

chrome.runtime.onInstalled.addListener(() => {
  console.log('Focus Timer v2 installed');
  
  // Initialize storage
  chrome.storage.local.get(['userName', 'sessions', 'timerState'], (result) => {
    if (!result.userName) {
      chrome.storage.local.set({ userName: 'krit' });
    }
    if (!result.sessions) {
      chrome.storage.local.set({ sessions: [] });
    }
    if (!result.timerState) {
      chrome.storage.local.set({ 
        timerState: {
          isRunning: false,
          remainingSeconds: 3000,
          currentPhase: 'focus',
          endTime: null
        }
      });
    }
  });
});

// Handle alarm for timer completion
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focus-timer') {
    handleTimerComplete();
  } else if (alarm.name === 'timer-tick') {
    updateTimer();
  }
});

// Update timer every second
function updateTimer() {
  chrome.storage.local.get(['timerState'], (result) => {
    const state = result.timerState;
    
    if (!state || !state.isRunning) {
      chrome.alarms.clear('timer-tick');
      return;
    }
    
    const now = Date.now();
    const remainingMs = state.endTime - now;
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    
    if (remainingSeconds <= 0) {
      handleTimerComplete();
    } else {
      chrome.storage.local.set({
        timerState: {
          ...state,
          remainingSeconds: remainingSeconds
        }
      });
    }
  });
}

// Handle timer completion
function handleTimerComplete() {
  chrome.storage.local.get(['timerState', 'sessions'], (result) => {
    const state = result.timerState;
    const sessions = result.sessions || [];
    
    // Clear alarms
    chrome.alarms.clear('focus-timer');
    chrome.alarms.clear('timer-tick');
    
    // Play notification sound by opening a helper window
    playNotificationSound();
    
    // Show notification
    const title = state.currentPhase === 'focus' ? 'Focus Session Complete!' : 'Break Time Over!';
    const message = state.currentPhase === 'focus' 
      ? 'Great work! Time for a break.' 
      : 'Back to focus mode!';
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: title,
      message: message,
      priority: 2,
      requireInteraction: true
    });
    
    // Save session if it was a focus session
    if (state.currentPhase === 'focus') {
      const today = new Date().toISOString().split('T')[0];
      sessions.push({
        date: today,
        timestamp: Date.now(),
        duration: 3000,
        phase: 'focus'
      });
      
      chrome.storage.local.set({ sessions });
      updateBadge();
    }
    
    // Reset timer state
    const newDuration = state.currentPhase === 'focus' ? 3000 : 600;
    chrome.storage.local.set({
      timerState: {
        isRunning: false,
        remainingSeconds: newDuration,
        currentPhase: state.currentPhase,
        endTime: null
      }
    });
  });
}

// Play notification sound
function playNotificationSound() {
  // Create an offscreen document to play sound
  chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play timer completion sound'
  }).then(() => {
    // Send message to play sound
    setTimeout(() => {
      chrome.offscreen.closeDocument();
    }, 1000);
  }).catch((error) => {
    // Offscreen API might not be available in all contexts
    console.log('Could not create offscreen document:', error);
  });
}

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.action.openPopup();
});

// Update badge to show today's session count
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

// Initialize badge on startup
updateBadge();
