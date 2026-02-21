// DOM Elements
const studyTab = document.getElementById('study-tab');
const logsTab = document.getElementById('logs-tab');
const studyMode = document.getElementById('study-mode');
const logsMode = document.getElementById('logs-mode');

// Study Mode Elements
const phaseLabel = document.getElementById('phase-label');
const timeDisplay = document.getElementById('time-display');
const progressCircle = document.getElementById('progress-circle');
const focusBtn = document.getElementById('focus-btn');
const breakBtn = document.getElementById('break-btn');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const todaySessions = document.getElementById('today-sessions');
const todayTime = document.getElementById('today-time');

// Logs Mode Elements
const totalSessions = document.getElementById('total-sessions');
const totalTime = document.getElementById('total-time');
const logsList = document.getElementById('logs-list');
const clearLogsBtn = document.getElementById('clear-logs');
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthLabel = document.getElementById('current-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

// Calendar State
let currentCalendarDate = new Date();

// Progress Circle Setup
const radius = 130;
const circumference = 2 * Math.PI * radius;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
progressCircle.style.strokeDashoffset = circumference;

// Constants
const FOCUS_DURATION = 50 * 60;
const BREAK_DURATION = 10 * 60;

// Initialize
init();

function init() {
  loadTimerState();
  loadStats();
  renderCalendar();
  updateStatsPreview();
  
  // Poll for timer updates every second
  setInterval(loadTimerState, 1000);
  
  // Event Listeners
  studyTab.addEventListener('click', () => switchMode('study'));
  logsTab.addEventListener('click', () => switchMode('logs'));
  
  focusBtn.addEventListener('click', () => switchPhase('focus'));
  breakBtn.addEventListener('click', () => switchPhase('break'));
  
  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);
  
  clearLogsBtn.addEventListener('click', clearAllLogs);
  prevMonthBtn.addEventListener('click', () => changeMonth(-1));
  nextMonthBtn.addEventListener('click', () => changeMonth(1));
}

// Load timer state from storage
function loadTimerState() {
  chrome.storage.local.get(['timerState'], (result) => {
    if (result.timerState) {
      const state = result.timerState;
      
      // Update UI
      updateDisplay(state.remainingSeconds);
      
      // Update phase
      if (state.currentPhase === 'focus') {
        phaseLabel.textContent = 'Focus Session';
        focusBtn.classList.add('active');
        breakBtn.classList.remove('active');
      } else {
        phaseLabel.textContent = 'Break Time';
        focusBtn.classList.remove('active');
        breakBtn.classList.add('active');
      }
      
      // Update buttons
      if (state.isRunning) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'block';
      } else {
        startBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
      }
      
      // Update progress
      const totalSeconds = state.currentPhase === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
      const elapsed = totalSeconds - state.remainingSeconds;
      const progress = (elapsed / totalSeconds) * 100;
      setProgress(progress);
    }
  });
}

// Mode Switching
function switchMode(mode) {
  if (mode === 'study') {
    studyTab.classList.add('active');
    logsTab.classList.remove('active');
    studyMode.classList.add('active');
    logsMode.classList.remove('active');
  } else {
    studyTab.classList.remove('active');
    logsTab.classList.add('active');
    studyMode.classList.remove('active');
    logsMode.classList.add('active');
    loadLogs();
    renderCalendar();
  }
}

// Phase Switching
function switchPhase(phase) {
  chrome.storage.local.get(['timerState'], (result) => {
    const state = result.timerState || {};
    
    if (state.isRunning) return; // Don't switch while running
    
    const newDuration = phase === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
    
    chrome.storage.local.set({
      timerState: {
        isRunning: false,
        remainingSeconds: newDuration,
        currentPhase: phase,
        endTime: null
      }
    }, () => {
      loadTimerState();
    });
  });
}

// Timer Functions
function startTimer() {
  chrome.storage.local.get(['timerState'], (result) => {
    const state = result.timerState;
    
    const endTime = Date.now() + (state.remainingSeconds * 1000);
    
    chrome.storage.local.set({
      timerState: {
        ...state,
        isRunning: true,
        endTime: endTime
      }
    }, () => {
      // Create alarm for timer completion
      chrome.alarms.create('focus-timer', {
        when: endTime
      });
      
      // Create alarm for ticking every second
      chrome.alarms.create('timer-tick', {
        periodInMinutes: 1/60 // Every second
      });
      
      loadTimerState();
    });
  });
}

function pauseTimer() {
  chrome.storage.local.get(['timerState'], (result) => {
    const state = result.timerState;
    
    // Clear alarms
    chrome.alarms.clear('focus-timer');
    chrome.alarms.clear('timer-tick');
    
    chrome.storage.local.set({
      timerState: {
        ...state,
        isRunning: false,
        endTime: null
      }
    }, () => {
      loadTimerState();
    });
  });
}

function resetTimer() {
  chrome.storage.local.get(['timerState'], (result) => {
    const state = result.timerState;
    
    // Clear alarms
    chrome.alarms.clear('focus-timer');
    chrome.alarms.clear('timer-tick');
    
    const newDuration = state.currentPhase === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
    
    chrome.storage.local.set({
      timerState: {
        isRunning: false,
        remainingSeconds: newDuration,
        currentPhase: state.currentPhase,
        endTime: null
      }
    }, () => {
      loadTimerState();
      setProgress(0);
    });
  });
}

function updateDisplay(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function setProgress(percentage) {
  const offset = circumference - (percentage / 100) * circumference;
  progressCircle.style.strokeDashoffset = offset;
}

// Storage Functions
function loadStats() {
  chrome.storage.local.get(['sessions'], (result) => {
    const sessions = result.sessions || [];
    const today = new Date().toISOString().split('T')[0];
    
    // Today's stats
    const todaysSessions = sessions.filter(s => s.date === today && s.phase === 'focus');
    const todaysMinutes = todaysSessions.length * 50;
    
    todaySessions.textContent = todaysSessions.length;
    todayTime.textContent = formatMinutes(todaysMinutes);
    
    // Total stats
    const allFocusSessions = sessions.filter(s => s.phase === 'focus');
    const totalMinutes = allFocusSessions.length * 50;
    
    totalSessions.textContent = allFocusSessions.length;
    totalTime.textContent = formatMinutes(totalMinutes);
  });
}

function updateStatsPreview() {
  loadStats();
}

function loadLogs() {
  chrome.storage.local.get(['sessions'], (result) => {
    const sessions = result.sessions || [];
    const focusSessions = sessions.filter(s => s.phase === 'focus');
    
    if (focusSessions.length === 0) {
      logsList.innerHTML = '<div class="empty-state">No sessions yet. Start focusing!</div>';
      return;
    }
    
    // Group sessions by date
    const sessionsByDate = {};
    focusSessions.forEach(session => {
      if (!sessionsByDate[session.date]) {
        sessionsByDate[session.date] = [];
      }
      sessionsByDate[session.date].push(session);
    });
    
    // Sort dates (newest first)
    const sortedDates = Object.keys(sessionsByDate).sort().reverse();
    
    // Create log entries
    let html = '';
    sortedDates.forEach(date => {
      const sessions = sessionsByDate[date];
      const totalMinutes = sessions.length * 50;
      const formattedDate = formatDate(date);
      
      html += `
        <div class="log-entry">
          <div>
            <div class="log-date">${formattedDate}</div>
            <div class="log-details">${sessions.length} session${sessions.length !== 1 ? 's' : ''} completed</div>
          </div>
          <div class="log-time">${formatMinutes(totalMinutes)}</div>
        </div>
      `;
    });
    
    logsList.innerHTML = html;
  });
}

function clearAllLogs() {
  if (confirm('Clear all session logs? This cannot be undone.')) {
    chrome.storage.local.set({ sessions: [] }, () => {
      loadStats();
      loadLogs();
      renderCalendar();
    });
  }
}

// Calendar Functions
function renderCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  // Update month label
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
  currentMonthLabel.textContent = `${monthNames[month]} ${year}`;
  
  // Get sessions data
  chrome.storage.local.get(['sessions'], (result) => {
    const sessions = result.sessions || [];
    const sessionDates = {};
    
    sessions.filter(s => s.phase === 'focus').forEach(session => {
      if (!sessionDates[session.date]) {
        sessionDates[session.date] = 0;
      }
      sessionDates[session.date]++;
    });
    
    // Build calendar
    let html = '';
    
    // Day headers
    const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    dayHeaders.forEach(day => {
      html += `<div class="calendar-day header">${day}</div>`;
    });
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const today = new Date().toISOString().split('T')[0];
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      html += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const hasSessions = sessionDates[dateStr] > 0;
      
      let classes = 'calendar-day';
      if (isToday) classes += ' today';
      if (hasSessions) classes += ' has-sessions';
      
      html += `<div class="${classes}">${day}</div>`;
    }
    
    // Next month days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
      html += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    calendarGrid.innerHTML = html;
  });
}

function changeMonth(direction) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
  renderCalendar();
}

// Utility Functions
function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dateOnly = date.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (dateOnly === todayStr) return 'Today';
  if (dateOnly === yesterdayStr) return 'Yesterday';
  
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Listen for storage changes to refresh stats
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.sessions) {
    updateStatsPreview();
  }
  if (changes.timerState) {
    loadTimerState();
  }
});
