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

// Timer State
let timerInterval = null;
let remainingSeconds = 50 * 60; // Start with focus time
let currentPhase = 'focus'; // 'focus' or 'break'
let isRunning = false;
let sessionStartTime = null;

// Calendar State
let currentCalendarDate = new Date();

// Constants
const FOCUS_DURATION = 50 * 60; // 50 minutes
const BREAK_DURATION = 10 * 60; // 10 minutes

// Progress Circle Setup
const radius = 130;
const circumference = 2 * Math.PI * radius;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
progressCircle.style.strokeDashoffset = circumference;

// Initialize
init();

function init() {
  loadStats();
  renderCalendar();
  updateDisplay();
  updateStatsPreview();
  
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
  if (isRunning) return; // Don't switch while timer is running
  
  currentPhase = phase;
  
  if (phase === 'focus') {
    remainingSeconds = FOCUS_DURATION;
    phaseLabel.textContent = 'Focus Session';
    focusBtn.classList.add('active');
    breakBtn.classList.remove('active');
  } else {
    remainingSeconds = BREAK_DURATION;
    phaseLabel.textContent = 'Break Time';
    focusBtn.classList.remove('active');
    breakBtn.classList.add('active');
  }
  
  updateDisplay();
  setProgress(0);
}

// Timer Functions
function startTimer() {
  if (isRunning) return;
  
  isRunning = true;
  sessionStartTime = Date.now();
  startBtn.style.display = 'none';
  pauseBtn.style.display = 'block';
  
  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      updateDisplay();
      
      const totalSeconds = currentPhase === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
      const elapsed = totalSeconds - remainingSeconds;
      const progress = (elapsed / totalSeconds) * 100;
      setProgress(progress);
    } else {
      completeSession();
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  
  clearInterval(timerInterval);
  isRunning = false;
  startBtn.style.display = 'block';
  pauseBtn.style.display = 'none';
}

function resetTimer() {
  pauseTimer();
  remainingSeconds = currentPhase === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
  updateDisplay();
  setProgress(0);
}

function completeSession() {
  pauseTimer();
  playNotificationSound();
  showNotification();
  
  // Save session if it was a focus session
  if (currentPhase === 'focus') {
    saveSession();
  }
  
  // Reset timer
  remainingSeconds = currentPhase === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
  updateDisplay();
  setProgress(0);
}

function updateDisplay() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function setProgress(percentage) {
  const offset = circumference - (percentage / 100) * circumference;
  progressCircle.style.strokeDashoffset = offset;
}

// Notification Functions
function showNotification() {
  const title = currentPhase === 'focus' ? 'Focus Session Complete!' : 'Break Time Over!';
  const message = currentPhase === 'focus' 
    ? 'Great work! Time for a break.' 
    : 'Back to focus mode!';
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 2
  });
}

function playNotificationSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create two quick "tick" sounds
  for (let i = 0; i < 2; i++) {
    setTimeout(() => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }, i * 200); // 200ms between ticks
  }
}

// Storage Functions
function saveSession() {
  chrome.storage.local.get(['sessions'], (result) => {
    const sessions = result.sessions || [];
    const today = new Date().toISOString().split('T')[0];
    
    sessions.push({
      date: today,
      timestamp: Date.now(),
      duration: FOCUS_DURATION,
      phase: 'focus'
    });
    
    chrome.storage.local.set({ sessions }, () => {
      updateStatsPreview();
    });
  });
}

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
