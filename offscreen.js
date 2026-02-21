// Offscreen document for playing audio

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
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }, i * 200); // 200ms between ticks
  }
}

// Play sound when document loads
playNotificationSound();
