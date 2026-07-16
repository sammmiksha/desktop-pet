const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  const dogEl = document.getElementById('dog');
  const tailEl = document.querySelector('.tail');
  const headEl = document.querySelector('.head-group');
  const tongueEl = document.querySelector('.tongue');
  const pupilLeft = document.querySelector('.pupil-l');
  const pupilRight = document.querySelector('.pupil-r');
  const sparkleLeft = document.querySelector('.sparkle-l');
  const sparkleRight = document.querySelector('.sparkle-r');
  
  const speechBubble = document.getElementById('speech-bubble');
  const bubbleContent = document.getElementById('bubble-content');

  // Load config
  let config = ipcRenderer.sendSync('get-config');

  // App States
  const STATES = {
    SIT: 'sit',
    WALK: 'walk',
    SCRATCH: 'scratch',
    STRETCH: 'stretch',
    SLEEP: 'sleep'
  };

  let currentState = STATES.SIT;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let currentPetPosition = { x: 0, y: 0 };
  
  // Roaming / Wandering Target
  let wanderTarget = null;
  let wanderSpeed = 1.8; // px per frame, adjusted by config
  let wanderTimer = null;

  // Distraction Cycle (Organic look-away)
  let isDistracted = false;
  let distractionTimer = null;

  // Reminder Timer
  let reminderTimer = null;
  let lastReminderTime = Date.now();

  // Eye and head track offsets
  let targetEyeOffset = { x: 0, y: 0 };
  let currentEyeOffset = { x: 0, y: 0 };
  let targetHeadRotate = 0;
  let targetHeadTranslate = { x: 0, y: 0 };
  let currentHeadRotate = 0;
  let currentHeadTranslate = { x: 0, y: 0 };

  // Initialize
  init();

  function init() {
    updateSpeedAndRates();
    applyState(STATES.SIT);

    const initialPos = ipcRenderer.sendSync('get-window-position') || { x: 100, y: 100 };
    currentPetPosition.x = initialPos.x;
    currentPetPosition.y = initialPos.y;

    ipcRenderer.on('window-position', (event, { x, y }) => {
      currentPetPosition.x = x;
      currentPetPosition.y = y;
    });

    // Initial greeting
    setTimeout(() => {
      showRandomGreeting();
    }, 1000);

    // Mouse interactive events for click-through toggling
    dogEl.addEventListener('mouseenter', () => {
      if (!isDragging) {
        ipcRenderer.send('set-ignore-mouse', false);
      }
    });

    dogEl.addEventListener('mouseleave', () => {
      if (!isDragging) {
        ipcRenderer.send('set-ignore-mouse', true, { forward: true });
      }
    });

    // Custom Drag implementation
    dogEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left click drags
      isDragging = true;
      
      // Keep click captures active
      ipcRenderer.send('set-ignore-mouse', false);

      dragOffset.x = e.clientX;
      dragOffset.y = e.clientY;
      
      // Stop wandering and stretching
      applyState(STATES.SIT);
      hideSpeechBubble();
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        ipcRenderer.send('drag-window', {
          mouseX: e.screenX,
          mouseY: e.screenY,
          offsetX: dragOffset.x,
          offsetY: dragOffset.y
        });
        
        // Fast tail wag when dragged!
        tailEl.style.transform = `rotate(${Math.sin(Date.now() / 50) * 15}deg)`;
        tongueEl.classList.remove('hidden'); // Show tongue while happy dragging!
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        tongueEl.classList.add('hidden');
        tailEl.style.transform = '';
        ipcRenderer.send('set-ignore-mouse', true, { forward: true });
        
        applyState(STATES.SIT);
      }
    });

    // Double-click to open Settings Dashboard
    dogEl.addEventListener('dblclick', () => {
      ipcRenderer.send('open-settings');
    });

    // Right-click context menu
    dogEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      ipcRenderer.send('show-context-menu');
    });

    // Speech bubble click dismissal
    speechBubble.addEventListener('click', () => {
      hideSpeechBubble();
    });

    // Start loops & engines
    requestAnimationFrame(animationTick);
    startBehaviorEngine();
    startReminderTimer();
    runDistractionCycle();
    
    // Send initial status to main process
    sendStatusUpdate();
  }

  function updateSpeedAndRates() {
    // Speed slider is 1 to 10. Default 5 maps to 1.8px/frame
    const baseSpeed = 1.8;
    const speedMultiplier = (config.speed || 5) / 5;
    wanderSpeed = baseSpeed * speedMultiplier;
  }

  // State Management
  function applyState(state) {
    currentState = state;

    // Reset classes
    dogEl.className = '';
    
    // Add specific state class
    dogEl.classList.add(`state-${state}`);

    // State specific actions
    if (state === STATES.SLEEP) {
      hideSpeechBubble();
      tongueEl.classList.add('hidden');
      wanderTarget = null;
    } else if (state === STATES.SIT) {
      tongueEl.classList.add('hidden');
    }

    sendStatusUpdate();
  }

  // Broadcast state changes to main process
  function sendStatusUpdate() {
    let activity = 'Awake';
    let mood = 'Happy';

    if (currentState === STATES.SIT) {
      activity = 'Sitting';
      mood = 'Happy';
    } else if (currentState === STATES.WALK) {
      activity = 'Walking Around';
      mood = 'Curious';
    } else if (currentState === STATES.SCRATCH) {
      activity = 'Scratching';
      mood = 'Happy';
    } else if (currentState === STATES.STRETCH) {
      activity = 'Stretching';
      mood = 'Happy';
    } else if (currentState === STATES.SLEEP) {
      activity = 'Sleeping';
      mood = 'Sleepy';
    }

    ipcRenderer.send('pet-status-changed', { activity, mood });
  }

  // Animation Update Tick (60 FPS visual interpolation)
  function animationTick() {
    // 1. Eye tracking interpolation
    currentEyeOffset.x += (targetEyeOffset.x - currentEyeOffset.x) * 0.15;
    currentEyeOffset.y += (targetEyeOffset.y - currentEyeOffset.y) * 0.15;

    // Apply eye translations
    if (currentState !== STATES.SLEEP) {
      pupilLeft.style.transform = `translate(${currentEyeOffset.x}px, ${currentEyeOffset.y}px)`;
      pupilRight.style.transform = `translate(${currentEyeOffset.x}px, ${currentEyeOffset.y}px)`;
      sparkleLeft.style.transform = `translate(${currentEyeOffset.x * 0.7}px, ${currentEyeOffset.y * 0.7}px)`;
      sparkleRight.style.transform = `translate(${currentEyeOffset.x * 0.7}px, ${currentEyeOffset.y * 0.7}px)`;
    } else {
      pupilLeft.style.transform = '';
      pupilRight.style.transform = '';
      sparkleLeft.style.transform = '';
      sparkleRight.style.transform = '';
    }

    // 2. Head tilt interpolation (adds rich aesthetics)
    currentHeadRotate += (targetHeadRotate - currentHeadRotate) * 0.12;
    currentHeadTranslate.x += (targetHeadTranslate.x - currentHeadTranslate.x) * 0.12;
    currentHeadTranslate.y += (targetHeadTranslate.y - currentHeadTranslate.y) * 0.12;

    if (currentState !== STATES.SLEEP) {
      headEl.style.transform = `rotate(${currentHeadRotate}deg) translate(${currentHeadTranslate.x}px, ${currentHeadTranslate.y}px)`;
    } else {
      headEl.style.transform = '';
    }

    // 3. Wandering physics frame step
    if (currentState === STATES.WALK && wanderTarget) {
      const dx = wanderTarget.x - currentPetPosition.x;
      const dy = wanderTarget.y - currentPetPosition.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 4) {
        applyState(STATES.SIT);
        wanderTarget = null;
      } else {
        const stepX = (dx / dist) * wanderSpeed;
        const stepY = (dy / dist) * wanderSpeed;
        
        currentPetPosition.x += stepX;
        currentPetPosition.y += stepY;

        ipcRenderer.send('move-pet', {
          x: currentPetPosition.x,
          y: currentPetPosition.y
        });

        if (stepX < 0) {
          dogEl.classList.add('mirror');
        } else if (stepX > 0) {
          dogEl.classList.remove('mirror');
        }
      }
    }

    requestAnimationFrame(animationTick);
  }

  // Distraction cycle (making eye movement feel organic instead of a robotic camera)
  function runDistractionCycle() {
    if (distractionTimer) clearTimeout(distractionTimer);
    
    // Cycle check every 5 to 10 seconds
    const interval = 5000 + Math.random() * 5000;
    
    distractionTimer = setTimeout(() => {
      if (currentState !== STATES.SLEEP && !isDragging) {
        // 20% chance to look away randomly (e.g. at a bird, or day-dreaming)
        if (Math.random() < 0.20) {
          isDistracted = true;

          // Look somewhere random
          const angle = Math.random() * Math.PI * 2;
          const offset = 1.5 + Math.random() * 2.5; // 1.5 - 4.0px
          targetEyeOffset.x = Math.cos(angle) * offset;
          targetEyeOffset.y = Math.sin(angle) * offset;

          // Head relaxes
          targetHeadRotate = 0;
          targetHeadTranslate = { x: 0, y: 0 };

          // Reset distraction after 1.5 to 3 seconds
          setTimeout(() => {
            isDistracted = false;
          }, 1500 + Math.random() * 1500);
        }
      }
      runDistractionCycle();
    }, interval);
  }

  // Behavioral Engine (State transitions based on activity profile)
  function startBehaviorEngine() {
    if (wanderTimer) clearInterval(wanderTimer);

    const getBehaviorCheckInterval = () => {
      if (config.activityLevel === 'calm') return 25000; // Check every 25 seconds
      if (config.activityLevel === 'energetic') return 10000; // Check every 10 seconds
      return 17000; // Balanced (default)
    };

    wanderTimer = setInterval(() => {
      if (currentState === STATES.SLEEP || isDragging || currentState === STATES.WALK) return;

      const roll = Math.random();

      // Configure probabilities based on profile
      let pSit = 0.70;
      let pWalk = 0.10;
      let pScratch = 0.10;

      if (config.activityLevel === 'calm') {
        pSit = 0.85;
        pWalk = 0.05;
        pScratch = 0.05; // remaining 0.05 is stretch
      } else if (config.activityLevel === 'energetic') {
        pSit = 0.45;
        pWalk = 0.25;
        pScratch = 0.15; // remaining 0.15 is stretch
      }

      if (roll < pSit) {
        applyState(STATES.SIT);
      } else if (roll < pSit + pWalk) {
        startWandering();
      } else if (roll < pSit + pWalk + pScratch) {
        applyState(STATES.SCRATCH);
        setTimeout(() => {
          if (currentState === STATES.SCRATCH) applyState(STATES.SIT);
        }, 3000);
      } else {
        applyState(STATES.STRETCH);
        setTimeout(() => {
          if (currentState === STATES.STRETCH) applyState(STATES.SIT);
        }, 2000);
      }
    }, getBehaviorCheckInterval());
  }

  function startWandering() {
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;

    const winWidth = 250;
    const winHeight = 250;

    const targetX = Math.round(Math.random() * (screenWidth - winWidth));
    const targetY = Math.round(Math.random() * (screenHeight - winHeight));

    wanderTarget = { x: targetX, y: targetY };
    applyState(STATES.WALK);
  }

  // Health Reminders
  function startReminderTimer() {
    if (reminderTimer) clearInterval(reminderTimer);

    const getReminderIntervalMs = () => {
      if (config.reminderPreset === '15m') return 15 * 60 * 1000;
      if (config.reminderPreset === '30m') return 30 * 60 * 1000;
      if (config.reminderPreset === '45m') return 45 * 60 * 1000;
      if (config.reminderPreset === '1h') return 60 * 60 * 1000;
      if (config.reminderPreset === '2h') return 2 * 60 * 60 * 1000;
      if (config.reminderPreset === 'custom') {
        const hours = parseFloat(config.customReminderHours) || 0;
        const minutes = parseFloat(config.customReminderMinutes) || 0;
        return (hours * 3600 + minutes * 60) * 1000;
      }
      return 0; // Off or invalid
    };

    reminderTimer = setInterval(() => {
      if (currentState === STATES.SLEEP) return;

      if (config.remindersEnabled && config.reminderPreset !== 'off') {
        const intervalMs = getReminderIntervalMs();
        if (intervalMs <= 0) return;

        const elapsed = Date.now() - lastReminderTime;

        if (elapsed >= intervalMs) {
          lastReminderTime = Date.now();
          showReminder();
        }
      }
    }, 10000);
  }

  function showReminder() {
    let reminders = [
      "Time for a quick stretch break!",
      "Water check! Take a sip of water, friend.",
      "Rest your eyes! Look at something 20 feet away.",
      "How is your posture right now? Straighten up!"
    ];

    if (config.breakMessages && config.breakMessages.length > 0) {
      reminders = config.breakMessages;
    }

    const reminder = reminders[Math.floor(Math.random() * reminders.length)];
    
    applyState(STATES.STRETCH);
    showSpeechBubble(reminder, 10000);
    tongueEl.classList.remove('hidden');

    setTimeout(() => {
      tongueEl.classList.add('hidden');
      if (currentState === STATES.STRETCH) applyState(STATES.SIT);
    }, 4000);
  }

  // Speech Bubbles
  function showSpeechBubble(text, duration = 8000) {
    bubbleContent.innerText = text;
    speechBubble.classList.remove('hidden');
    
    if (window.bubbleFadeTimeout) clearTimeout(window.bubbleFadeTimeout);
    window.bubbleFadeTimeout = setTimeout(() => {
      hideSpeechBubble();
    }, duration);
  }

  function hideSpeechBubble() {
    speechBubble.classList.add('hidden');
  }

  function showRandomGreeting() {
    let greetings = [
      "Hi, how are you? Let's start the day with great ideas!"
    ];

    if (config.morningGreetings && config.morningGreetings.length > 0) {
      greetings = config.morningGreetings;
    }

    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    showSpeechBubble(greeting, 8000);
  }

  // Cursor IPC Handler
  ipcRenderer.on('cursor-update', (event, { dx, dy, screenX, screenY }) => {
    if (currentState === STATES.SLEEP || isDragging) return;

    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // 1. Awareness Limit (400px): if cursor is too far, look forward
    if (distance > 400) {
      if (!isDistracted) {
        targetEyeOffset.x = 0;
        targetEyeOffset.y = 0;
      }
      targetHeadRotate = 0;
      targetHeadTranslate = { x: 0, y: 0 };
      return;
    }

    // If looking away (distracted), do not track cursor with eyes, but relax head tilt
    if (isDistracted) {
      if (distance <= 200) {
        // tiny tilt if cursor is extremely close, even when distracted
        const maxHeadTilt = 6;
        const headTiltVal = Math.min(distance * 0.04, maxHeadTilt);
        targetHeadRotate = Math.cos(angle) * headTiltVal * 0.5;
        targetHeadTranslate.x = Math.cos(angle) * 2;
        targetHeadTranslate.y = Math.sin(angle) * 2;
      } else {
        targetHeadRotate = 0;
        targetHeadTranslate = { x: 0, y: 0 };
      }
      return;
    }

    // 2. Track pupils (max 4.5px offset)
    const maxEyeOffset = 4.5;
    const eyeOffsetVal = Math.min(distance * 0.08, maxEyeOffset);
    targetEyeOffset.x = Math.cos(angle) * eyeOffsetVal;
    targetEyeOffset.y = Math.sin(angle) * eyeOffsetVal;

    // 3. Proximity-Triggered Head Tilt (within 250px)
    if (distance <= 250) {
      const maxHeadTilt = 12;
      const headTiltVal = Math.min(distance * 0.05, maxHeadTilt);
      targetHeadRotate = Math.cos(angle) * headTiltVal * 0.6;
      
      const maxHeadPush = 4.0;
      const headPushVal = Math.min(distance * 0.02, maxHeadPush);
      targetHeadTranslate.x = Math.cos(angle) * headPushVal;
      targetHeadTranslate.y = Math.sin(angle) * headPushVal;
    } else {
      targetHeadRotate = 0;
      targetHeadTranslate = { x: 0, y: 0 };
    }
  });

  ipcRenderer.on('idle-state-change', (event, shouldSleep) => {
    if (shouldSleep) {
      applyState(STATES.SLEEP);
    } else {
      applyState(STATES.SIT);
      showSpeechBubble("Welcome back! Ready to get to work?", 6000);
      lastReminderTime = Date.now();
    }
  });

  ipcRenderer.on('config-updated', (event, newConfig) => {
    config = newConfig;
    updateSpeedAndRates();
    lastReminderTime = Date.now();
    
    // Restart loops
    startBehaviorEngine();
    startReminderTimer();
  });
});
