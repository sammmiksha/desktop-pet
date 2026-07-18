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
  
  // Side view tracking elements
  const sideHead = document.querySelector('.side-head-group');
  const sidePupil = document.querySelector('.side-pupil');
  const sideSparkle = document.querySelector('.side-sparkle');
  
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
  
  // High fidelity behavior tracking variables
  let lastMousePosition = { x: 400, y: 300 };
  let isGoingToSleep = false;
  let isDeliveringReminder = false;
  let pendingReminderText = "";
  let isLookingAround = false;
  
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
      if (currentState !== STATES.WALK && !isDragging) {
        currentPetPosition.x = x;
        currentPetPosition.y = y;
      }
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

    // Setup hybrid spritesheet / image asset loader and fallback controls
    document.querySelectorAll('image').forEach(img => {
      img.addEventListener('load', () => {
        const parent = img.parentElement;
        if (parent) {
          const shapes = parent.querySelectorAll('path, circle, ellipse, polygon, rect');
          shapes.forEach(shape => {
            if (shape !== img) {
              shape.setAttribute('visibility', 'hidden');
            }
          });
        }
      });

      img.addEventListener('error', () => {
        const currentHref = img.getAttribute('href') || '';
        if (currentHref.endsWith('.webp')) {
          img.setAttribute('href', currentHref.replace('.webp', '.png'));
        } else {
          img.setAttribute('visibility', 'hidden');
        }
      });
      
      const src = img.getAttribute('href');
      img.setAttribute('href', '');
      img.setAttribute('href', src);
    });

    // Start loops & engines
    requestAnimationFrame(animationTick);
    startBehaviorEngine();
    startReminderTimer();
    runDistractionCycle();
    startMicroAnimationCycle();
    
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

    // Apply eye translations directly to SVG cx/cy attributes for bulletproof rendering
    if (currentState !== STATES.SLEEP) {
      pupilLeft.setAttribute('cx', 80 + currentEyeOffset.x);
      pupilLeft.setAttribute('cy', 58 + currentEyeOffset.y);
      pupilRight.setAttribute('cx', 120 + currentEyeOffset.x);
      pupilRight.setAttribute('cy', 58 + currentEyeOffset.y);
      
      sparkleLeft.setAttribute('cx', 78 + currentEyeOffset.x * 0.7);
      sparkleLeft.setAttribute('cy', 55 + currentEyeOffset.y * 0.7);
      sparkleRight.setAttribute('cx', 118 + currentEyeOffset.x * 0.7);
      sparkleRight.setAttribute('cy', 55 + currentEyeOffset.y * 0.7);

      // Track side eye pupils too (when walking/running/stretching)
      if (sidePupil && sideSparkle) {
        sidePupil.setAttribute('cx', 140 + currentEyeOffset.x * 0.8);
        sidePupil.setAttribute('cy', 74 + currentEyeOffset.y * 0.8);
        sideSparkle.setAttribute('cx', 138.5 + currentEyeOffset.x * 0.5);
        sideSparkle.setAttribute('cy', 72 + currentEyeOffset.y * 0.5);
      }
    } else {
      pupilLeft.setAttribute('cx', 80);
      pupilLeft.setAttribute('cy', 58);
      pupilRight.setAttribute('cx', 120);
      pupilRight.setAttribute('cy', 58);
      
      sparkleLeft.setAttribute('cx', 78);
      sparkleLeft.setAttribute('cy', 55);
      sparkleRight.setAttribute('cx', 118);
      sparkleRight.setAttribute('cy', 55);

      if (sidePupil && sideSparkle) {
        sidePupil.setAttribute('cx', 140);
        sidePupil.setAttribute('cy', 74);
        sideSparkle.setAttribute('cx', 138.5);
        sideSparkle.setAttribute('cy', 72);
      }
    }

    // 2. Head tilt interpolation (adds rich aesthetics)
    currentHeadRotate += (targetHeadRotate - currentHeadRotate) * 0.12;
    currentHeadTranslate.x += (targetHeadTranslate.x - currentHeadTranslate.x) * 0.12;
    currentHeadTranslate.y += (targetHeadTranslate.y - currentHeadTranslate.y) * 0.12;

    if (currentState !== STATES.SLEEP) {
      const transformString = `rotate(${currentHeadRotate}deg) translate(${currentHeadTranslate.x}px, ${currentHeadTranslate.y}px)`;
      headEl.style.transform = transformString;
      if (sideHead) {
        sideHead.style.transform = transformString;
      }
    } else {
      headEl.style.transform = '';
      if (sideHead) {
        sideHead.style.transform = '';
      }
    }

    // 3. Wandering physics frame step
    if (currentState === STATES.WALK && wanderTarget) {
      const dx = wanderTarget.x - currentPetPosition.x;
      const dy = wanderTarget.y - currentPetPosition.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 4) {
        wanderTarget = null;
        
        if (isGoingToSleep) {
          isGoingToSleep = false;
          dogEl.classList.add('curling-up');
          setTimeout(() => {
            dogEl.classList.remove('curling-up');
            applyState(STATES.SLEEP);
          }, 1000);
        } else if (isDeliveringReminder) {
          isDeliveringReminder = false;
          applyState(STATES.SIT);
          dogEl.classList.add('micro-wag');
          setTimeout(() => dogEl.classList.remove('micro-wag'), 1500);
          showSpeechBubble(pendingReminderText, 12000);
        } else {
          // Play stand -> walk -> reach -> stop -> look around -> sit sequence
          applyState(STATES.SIT);
          isLookingAround = true;
          targetHeadRotate = 10;
          setTimeout(() => {
            if (isLookingAround) targetHeadRotate = -10;
          }, 800);
          setTimeout(() => {
            if (isLookingAround) {
              targetHeadRotate = 0;
              isLookingAround = false;
            }
          }, 1600);
        }
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

    // Timing varies (20 to 60 seconds) so it never feels predictable
    const getBehaviorCheckInterval = () => {
      return 20000 + Math.random() * 40000;
    };

    wanderTimer = setInterval(() => {
      if (currentState === STATES.SLEEP || isDragging || currentState === STATES.WALK) return;

      const roll = Math.random();

      // Configure probabilities based on profile setting
      let pSit = 0.50;
      let pWalk = 0.25;
      let pScratch = 0.15; // remaining 0.10 is stretch

      if (config.activityLevel === 'calm') {
        pSit = 0.70;
        pWalk = 0.15;
        pScratch = 0.10;
        dogEl.classList.remove('playful-wag');
      } else if (config.activityLevel === 'energetic') {
        pSit = 0.25;
        pWalk = 0.40;
        pScratch = 0.20;
        dogEl.classList.add('playful-wag');
      } else {
        dogEl.classList.remove('playful-wag');
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
        }, 2500);
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

  // Micro Animations Cycle (Happens every 2-8 seconds while sitting/standing still)
  let microAnimTimer = null;
  function startMicroAnimationCycle() {
    if (microAnimTimer) clearTimeout(microAnimTimer);

    const nextInterval = 2000 + Math.random() * 6000;

    microAnimTimer = setTimeout(() => {
      if ((currentState === STATES.SIT || currentState === STATES.SCRATCH) && !isDragging) {
        const roll = Math.random();
        
        if (roll < 0.15) {
          dogEl.classList.add('ear-twitch-l');
          setTimeout(() => dogEl.classList.remove('ear-twitch-l'), 500);
        } else if (roll < 0.30) {
          dogEl.classList.add('ear-twitch-r');
          setTimeout(() => dogEl.classList.remove('ear-twitch-r'), 500);
        } else if (roll < 0.45) {
          dogEl.classList.add('sniff');
          setTimeout(() => dogEl.classList.remove('sniff'), 800);
        } else if (roll < 0.60) {
          dogEl.classList.add('paw-shift');
          setTimeout(() => dogEl.classList.remove('paw-shift'), 650);
        } else if (roll < 0.70) {
          dogEl.classList.add('paw-shift-r');
          setTimeout(() => dogEl.classList.remove('paw-shift-r'), 650);
        } else if (roll < 0.85) {
          dogEl.classList.add('micro-wag');
          setTimeout(() => dogEl.classList.remove('micro-wag'), 1200);
        } else {
          tongueEl.classList.remove('hidden');
          setTimeout(() => tongueEl.classList.add('hidden'), 1000);
        }
      }
      startMicroAnimationCycle();
    }, nextInterval);
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
      "You've been doing great. Maybe stretch for a minute? 🐶",
      "Time for a quick stretch break!",
      "Water check! Take a sip of water, friend.",
      "Rest your eyes! Look at something 20 feet away.",
      "How is your posture right now? Straighten up!"
    ];

    if (config.breakMessages && config.breakMessages.length > 0) {
      reminders = config.breakMessages;
    }

    pendingReminderText = reminders[Math.floor(Math.random() * reminders.length)];

    // Walk near the user's mouse cursor
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;

    // Offset slightly from cursor position
    let targetX = lastMousePosition.x - 120;
    let targetY = lastMousePosition.y - 120;

    // Clamp inside screen bounds
    targetX = Math.max(40, Math.min(screenWidth - 290, targetX));
    targetY = Math.max(40, Math.min(screenHeight - 240, targetY));

    isDeliveringReminder = true;
    wanderTarget = { x: targetX, y: targetY };
    applyState(STATES.WALK);
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
    lastMousePosition.x = screenX;
    lastMousePosition.y = screenY;

    if (currentState === STATES.SLEEP || isDragging) return;

    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // 1. Awareness Limit: if cursor is too far, center eyes/head
    if (distance > 400) {
      if (!isDistracted) {
        targetEyeOffset.x = 0;
        targetEyeOffset.y = 0;
      }
      targetHeadRotate = 0;
      targetHeadTranslate = { x: 0, y: 0 };
      return;
    }

    // If looking away (distracted), do not track cursor with eyes
    if (isDistracted) {
      targetHeadRotate = 0;
      targetHeadTranslate = { x: 0, y: 0 };
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
      // Walk to a bottom corner first
      const screenWidth = window.screen.availWidth;
      const screenHeight = window.screen.availHeight;
      const cornerX = Math.random() < 0.5 ? 40 : screenWidth - 290;
      const cornerY = screenHeight - 240;

      isGoingToSleep = true;
      wanderTarget = { x: cornerX, y: cornerY };
      applyState(STATES.WALK);
    } else {
      // Wake up sequence
      isGoingToSleep = false;
      applyState(STATES.STRETCH);
      
      // Excited tail wag
      dogEl.classList.add('micro-wag');
      setTimeout(() => dogEl.classList.remove('micro-wag'), 2000);
      
      showSpeechBubble("Welcome back! Ready to get to work? Let's stretch!", 7000);
      lastReminderTime = Date.now();
      
      setTimeout(() => {
        if (currentState === STATES.STRETCH) applyState(STATES.SIT);
      }, 3000);
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
