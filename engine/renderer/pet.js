const { ipcRenderer } = require('electron');
const Bounds = require('../physics/bounds');
const Movement = require('../movement/physics');
const Behavior = require('../behavior/tree');
const Animation = require('../animation/sprite-player');
const Interaction = require('../interaction/tracker');

document.addEventListener('DOMContentLoaded', () => {
  // Global Engine Context
  const Engine = {
    STATES: {
      SIT: 'sit',
      WALK: 'walk',
      SCRATCH: 'scratch',
      STRETCH: 'stretch',
      SLEEP: 'sleep'
    },
    currentState: 'sit',
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    currentPetPosition: { x: 0, y: 0 },
    
    lastMousePosition: { x: 400, y: 300 },
    isGoingToSleep: false,
    isDeliveringReminder: false,
    pendingReminderText: "",
    isLookingAround: false,
    isDistracted: false,
    
    targetEyeOffset: { x: 0, y: 0 },
    currentEyeOffset: { x: 0, y: 0 },
    targetHeadRotate: 0,
    targetHeadTranslate: { x: 0, y: 0 },
    currentHeadRotate: 0,
    currentHeadTranslate: { x: 0, y: 0 },

    config: ipcRenderer.sendSync('get-config'),

    elements: {
      dogEl: document.getElementById('dog'),
      tailEl: document.querySelector('.tail'),
      headEl: document.querySelector('.head-group'),
      tongueEl: document.querySelector('.tongue'),
      pupilLeft: document.querySelector('.pupid-l') || document.querySelector('.pupil-l'),
      pupilRight: document.querySelector('.pupid-r') || document.querySelector('.pupil-r'),
      sparkleLeft: document.querySelector('.sparkle-l'),
      sparkleRight: document.querySelector('.sparkle-r'),
      
      sideHead: document.querySelector('.side-head-group'),
      sidePupil: document.querySelector('.side-pupil'),
      sideSparkle: document.querySelector('.side-sparkle'),
      
      speechBubble: document.getElementById('speech-bubble'),
      bubbleContent: document.getElementById('bubble-content')
    },

    applyState(state) {
      this.currentState = state;
      this.elements.dogEl.className = '';
      this.elements.dogEl.classList.add(`state-${state}`);

      if (state === this.STATES.SLEEP) {
        this.hideSpeechBubble();
        this.elements.tongueEl.classList.add('hidden');
        Movement.stopWandering();
      } else if (state === this.STATES.SIT) {
        this.elements.tongueEl.classList.add('hidden');
      }

      this.sendStatusUpdate();
    },

    sendStatusUpdate() {
      let activity = 'Awake';
      let mood = 'Happy';

      if (this.currentState === this.STATES.SIT) {
        activity = 'Sitting';
      } else if (this.currentState === this.STATES.WALK) {
        activity = 'Walking Around';
        mood = 'Curious';
      } else if (this.currentState === this.STATES.SCRATCH) {
        activity = 'Scratching';
      } else if (this.currentState === this.STATES.STRETCH) {
        activity = 'Stretching';
      } else if (this.currentState === this.STATES.SLEEP) {
        activity = 'Sleeping';
        mood = 'Sleepy';
      }

      ipcRenderer.send('pet-status-changed', { activity, mood });
    },

    showSpeechBubble(text, duration = 8000) {
      this.elements.bubbleContent.innerText = text;
      this.elements.speechBubble.classList.remove('hidden');
      
      if (window.bubbleFadeTimeout) clearTimeout(window.bubbleFadeTimeout);
      window.bubbleFadeTimeout = setTimeout(() => {
        this.hideSpeechBubble();
      }, duration);
    },

    hideSpeechBubble() {
      this.elements.speechBubble.classList.add('hidden');
    },

    showRandomGreeting() {
      let greetings = ["Hi, how are you? Let's start the day with great ideas!"];
      if (this.config.morningGreetings && this.config.morningGreetings.length > 0) {
        greetings = this.config.morningGreetings;
      }
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      this.showSpeechBubble(greeting, 8000);
    },

    resetReminderTimer() {
      Behavior.lastReminderTime = Date.now();
    }
  };

  window.Engine = Engine;

  // Initialize Sub-Modules
  Bounds.init(Engine);
  Movement.init(Engine);
  Behavior.init(Engine, Movement);
  Animation.init(Engine);
  Interaction.init(Engine, Movement);

  // Setup Image Asset Overlays and Load Observers
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

  // Start Animation tick loop
  function tick() {
    // 1. Eye tracking translations
    if (Engine.currentState !== Engine.STATES.SLEEP) {
      Engine.currentEyeOffset.x += (Engine.targetEyeOffset.x - Engine.currentEyeOffset.x) * 0.15;
      Engine.currentEyeOffset.y += (Engine.targetEyeOffset.y - Engine.currentEyeOffset.y) * 0.15;

      Engine.elements.pupilLeft.setAttribute('cx', 80 + Engine.currentEyeOffset.x);
      Engine.elements.pupilLeft.setAttribute('cy', 58 + Engine.currentEyeOffset.y);
      Engine.elements.pupilRight.setAttribute('cx', 120 + Engine.currentEyeOffset.x);
      Engine.elements.pupilRight.setAttribute('cy', 58 + Engine.currentEyeOffset.y);
      
      Engine.elements.sparkleLeft.setAttribute('cx', 78 + Engine.currentEyeOffset.x * 0.7);
      Engine.elements.sparkleLeft.setAttribute('cy', 55 + Engine.currentEyeOffset.y * 0.7);
      Engine.elements.sparkleRight.setAttribute('cx', 118 + Engine.currentEyeOffset.x * 0.7);
      Engine.elements.sparkleRight.setAttribute('cy', 55 + Engine.currentEyeOffset.y * 0.7);

      if (Engine.elements.sidePupil && Engine.elements.sideSparkle) {
        Engine.elements.sidePupil.setAttribute('cx', 140 + Engine.currentEyeOffset.x * 0.8);
        Engine.elements.sidePupil.setAttribute('cy', 74 + Engine.currentEyeOffset.y * 0.8);
        Engine.elements.sideSparkle.setAttribute('cx', 138.5 + Engine.currentEyeOffset.x * 0.5);
        Engine.elements.sideSparkle.setAttribute('cy', 72 + Engine.currentEyeOffset.y * 0.5);
      }
    } else {
      Engine.elements.pupilLeft.setAttribute('cx', 80);
      Engine.elements.pupilLeft.setAttribute('cy', 58);
      Engine.elements.pupilRight.setAttribute('cx', 120);
      Engine.elements.pupilRight.setAttribute('cy', 58);
      
      Engine.elements.sparkleLeft.setAttribute('cx', 78);
      Engine.elements.sparkleLeft.setAttribute('cy', 55);
      Engine.elements.sparkleRight.setAttribute('cx', 118);
      Engine.elements.sparkleRight.setAttribute('cy', 55);

      if (Engine.elements.sidePupil && Engine.elements.sideSparkle) {
        Engine.elements.sidePupil.setAttribute('cx', 140);
        Engine.elements.sidePupil.setAttribute('cy', 74);
        Engine.elements.sideSparkle.setAttribute('cx', 138.5);
        Engine.elements.sideSparkle.setAttribute('cy', 72);
      }
    }

    // 2. Head tilt rotations
    Engine.currentHeadRotate += (Engine.targetHeadRotate - Engine.currentHeadRotate) * 0.12;
    Engine.currentHeadTranslate.x += (Engine.targetHeadTranslate.x - Engine.currentHeadTranslate.x) * 0.12;
    Engine.currentHeadTranslate.y += (Engine.targetHeadTranslate.y - Engine.currentHeadTranslate.y) * 0.12;

    if (Engine.currentState !== Engine.STATES.SLEEP) {
      const trans = `rotate(${Engine.currentHeadRotate}deg) translate(${Engine.currentHeadTranslate.x}px, ${Engine.currentHeadTranslate.y}px)`;
      Engine.elements.headEl.style.transform = trans;
      if (Engine.elements.sideHead) {
        Engine.elements.sideHead.style.transform = trans;
      }
    } else {
      Engine.elements.headEl.style.transform = '';
      if (Engine.elements.sideHead) {
        Engine.elements.sideHead.style.transform = '';
      }
    }

    // 3. Movement tick
    Movement.tick();

    requestAnimationFrame(tick);
  }

  // Start the tick loop
  requestAnimationFrame(tick);

  // Initial greeting
  setTimeout(() => {
    Engine.showRandomGreeting();
  }, 1000);

  // Initial status broadcast
  Engine.sendStatusUpdate();

  // Watch for config changes
  ipcRenderer.on('config-updated', (event, newConfig) => {
    Engine.config = newConfig;
    Movement.updateSpeed();
    Engine.resetReminderTimer();
    
    // Restart loops
    Behavior.startLoop();
    Behavior.startReminderTimer();
  });
});
