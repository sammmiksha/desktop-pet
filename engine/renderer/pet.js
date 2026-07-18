const { ipcRenderer } = require('electron');
const Bounds = require('../physics/bounds');
const Movement = require('../movement/physics');
const Behavior = require('../behavior/tree');
const StateMachine = require('../behavior/state-machine');
const Animation = require('../animation/animation-controller');
const Interaction = require('../interaction/tracker');
const CharacterLoader = require('../character/character-loader');
const DogRenderer = require('./dog-renderer');

document.addEventListener('DOMContentLoaded', () => {
  const character = CharacterLoader.load('assets/characters/buddy/config/buddy.manifest.json');

  const Engine = {
    STATES: {
      IDLE: 'idle',
      SIT: 'idle',
      WALK: 'walk',
      RUN: 'run',
      SCRATCH: 'scratch',
      STRETCH: 'stretch',
      SLEEP: 'sleep',
      YAWN: 'yawn',
      DRAGGING: 'dragging',
      PAUSED: 'paused'
    },

    character,
    Movement,
    Renderer: DogRenderer,
    StateMachine,

    currentState: character.defaultState || 'idle',
    direction: 'right',
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    currentPetPosition: { x: 0, y: 0 },
    lastMousePosition: { x: 400, y: 300 },
    isGoingToSleep: false,
    isDeliveringReminder: false,
    pendingReminderText: '',
    isLookingAround: false,
    isDistracted: false,

    targetLook: { x: 0, y: 0, rotate: 0 },
    currentLook: { x: 0, y: 0, rotate: 0 },

    config: ipcRenderer.sendSync('get-config'),

    elements: {
      dogEl: document.getElementById('dog'),
      stageEl: document.getElementById('dog-stage'),
      speechBubble: document.getElementById('speech-bubble'),
      bubbleContent: document.getElementById('bubble-content')
    },

    applyState(state) {
      const normalizedState = state === 'sit' ? this.STATES.IDLE : state;
      this.StateMachine.transition(normalizedState);
    },

    setFacing(direction) {
      this.Renderer.setFacing(direction);
    },

    sendStatusUpdate() {
      const statusByState = {
        idle: { activity: 'Sitting', mood: 'Happy' },
        walk: { activity: 'Walking Around', mood: 'Curious' },
        run: { activity: 'Running Around', mood: 'Playful' },
        scratch: { activity: 'Scratching', mood: 'Content' },
        stretch: { activity: 'Stretching', mood: 'Refreshed' },
        sleep: { activity: 'Sleeping', mood: 'Sleepy' },
        yawn: { activity: 'Yawning', mood: 'Sleepy' },
        dragging: { activity: 'Being Moved', mood: 'Surprised' },
        paused: { activity: 'Paused', mood: 'Calm' }
      };

      ipcRenderer.send('pet-status-changed', statusByState[this.currentState] || statusByState.idle);
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

  DogRenderer.init(Engine, character);
  StateMachine.init(Engine, DogRenderer);
  Bounds.init(Engine);
  Movement.init(Engine);
  Behavior.init(Engine, Movement);
  Animation.init(Engine, DogRenderer);
  Interaction.init(Engine, Movement);

  Engine.applyState(Engine.currentState);

  function tick(now) {
    updateLookPose();
    Movement.tick();
    Animation.tick(now);
    requestAnimationFrame(tick);
  }

  function updateLookPose() {
    if (Engine.currentState === Engine.STATES.SLEEP) {
      Engine.targetLook = { x: 0, y: 0, rotate: 0 };
    }

    Engine.currentLook.x += (Engine.targetLook.x - Engine.currentLook.x) * 0.14;
    Engine.currentLook.y += (Engine.targetLook.y - Engine.currentLook.y) * 0.14;
    Engine.currentLook.rotate += (Engine.targetLook.rotate - Engine.currentLook.rotate) * 0.14;

    const isLooking =
      Math.abs(Engine.currentLook.x) > 0.15 ||
      Math.abs(Engine.currentLook.y) > 0.15 ||
      Math.abs(Engine.currentLook.rotate) > 0.15;

    Engine.elements.dogEl.classList.toggle('cursor-watch', isLooking);
    Engine.elements.dogEl.style.setProperty('--look-x', `${Engine.currentLook.x.toFixed(2)}px`);
    Engine.elements.dogEl.style.setProperty('--look-y', `${Engine.currentLook.y.toFixed(2)}px`);
    Engine.elements.dogEl.style.setProperty('--look-rotate', `${Engine.currentLook.rotate.toFixed(2)}deg`);
    Engine.elements.dogEl.style.setProperty('--eye-x', `${(Engine.currentLook.x * 0.72).toFixed(2)}px`);
    Engine.elements.dogEl.style.setProperty('--eye-y', `${(Engine.currentLook.y * 0.9).toFixed(2)}px`);
  }

  requestAnimationFrame(tick);

  setTimeout(() => {
    Engine.showRandomGreeting();
  }, 1000);

  Engine.sendStatusUpdate();

  ipcRenderer.on('config-updated', (event, newConfig) => {
    Engine.config = newConfig;
    Movement.updateSpeed();
    Engine.resetReminderTimer();
    Behavior.startLoop();
    Behavior.startReminderTimer();
  });
});
