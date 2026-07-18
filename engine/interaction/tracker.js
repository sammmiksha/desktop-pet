const { ipcRenderer } = require('electron');

class InteractionTracker {
  init(Engine, Movement) {
    this.Engine = Engine;
    this.Movement = Movement;
    this.setupListeners();
  }

  setupListeners() {
    const el = this.Engine.elements;

    // Mouse interactive events for click-through toggling
    el.dogEl.addEventListener('mouseenter', () => {
      if (!this.Engine.isDragging) {
        ipcRenderer.send('set-ignore-mouse', false);
      }
    });

    el.dogEl.addEventListener('mouseleave', () => {
      if (!this.Engine.isDragging) {
        ipcRenderer.send('set-ignore-mouse', true, { forward: true });
      }
    });

    // Custom Drag implementation
    el.dogEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.Engine.isDragging = true;
      ipcRenderer.send('set-ignore-mouse', false);

      this.Engine.dragOffset.x = e.clientX;
      this.Engine.dragOffset.y = e.clientY;
      
      this.Engine.applyState(this.Engine.STATES.SIT);
      this.Engine.hideSpeechBubble();
    });

    window.addEventListener('mousemove', (e) => {
      if (this.Engine.isDragging) {
        ipcRenderer.send('drag-window', {
          mouseX: e.screenX,
          mouseY: e.screenY,
          offsetX: this.Engine.dragOffset.x,
          offsetY: this.Engine.dragOffset.y
        });
        
        el.tailEl.style.transform = `rotate(${Math.sin(Date.now() / 50) * 15}deg)`;
        el.tongueEl.classList.remove('hidden');
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.Engine.isDragging) {
        this.Engine.isDragging = false;
        el.tongueEl.classList.add('hidden');
        el.tailEl.style.transform = '';
        ipcRenderer.send('set-ignore-mouse', true, { forward: true });
        this.Engine.applyState(this.Engine.STATES.SIT);
      }
    });

    el.dogEl.addEventListener('dblclick', () => {
      ipcRenderer.send('open-settings');
    });

    el.dogEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      ipcRenderer.send('show-context-menu');
    });

    el.speechBubble.addEventListener('click', () => {
      this.Engine.hideSpeechBubble();
    });

    // Cursor coordinates update from main process
    ipcRenderer.on('cursor-update', (event, { dx, dy, screenX, screenY }) => {
      this.Engine.lastMousePosition.x = screenX;
      this.Engine.lastMousePosition.y = screenY;

      if (this.Engine.currentState === this.Engine.STATES.SLEEP || this.Engine.isDragging) return;

      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      if (distance > 400) {
        if (!this.Engine.isDistracted) {
          this.Engine.targetEyeOffset.x = 0;
          this.Engine.targetEyeOffset.y = 0;
        }
        this.Engine.targetHeadRotate = 0;
        this.Engine.targetHeadTranslate = { x: 0, y: 0 };
        return;
      }

      if (this.Engine.isDistracted) {
        this.Engine.targetHeadRotate = 0;
        this.Engine.targetHeadTranslate = { x: 0, y: 0 };
        return;
      }

      const maxEyeOffset = 4.5;
      const eyeOffsetVal = Math.min(distance * 0.08, maxEyeOffset);
      this.Engine.targetEyeOffset.x = Math.cos(angle) * eyeOffsetVal;
      this.Engine.targetEyeOffset.y = Math.sin(angle) * eyeOffsetVal;

      if (distance <= 250) {
        const maxHeadTilt = 12;
        const headTiltVal = Math.min(distance * 0.05, maxHeadTilt);
        this.Engine.targetHeadRotate = Math.cos(angle) * headTiltVal * 0.6;
        
        const maxHeadPush = 4.0;
        const headPushVal = Math.min(distance * 0.02, maxHeadPush);
        this.Engine.targetHeadTranslate.x = Math.cos(angle) * headPushVal;
        this.Engine.targetHeadTranslate.y = Math.sin(angle) * headPushVal;
      } else {
        this.Engine.targetHeadRotate = 0;
        this.Engine.targetHeadTranslate = { x: 0, y: 0 };
      }
    });

    // Idle state triggers (sleeping / waking)
    ipcRenderer.on('idle-state-change', (event, shouldSleep) => {
      if (shouldSleep) {
        const screen = window.screen;
        const cornerX = Math.random() < 0.5 ? 40 : screen.availWidth - 290;
        const cornerY = screen.availHeight - 240;

        this.Engine.isGoingToSleep = true;
        this.Movement.wanderTarget = { x: cornerX, y: cornerY };
        this.Engine.applyState(this.Engine.STATES.WALK);
      } else {
        this.Engine.isGoingToSleep = false;
        this.Engine.applyState(this.Engine.STATES.STRETCH);
        
        el.dogEl.classList.add('micro-wag');
        setTimeout(() => el.dogEl.classList.remove('micro-wag'), 2000);
        
        this.Engine.showSpeechBubble("Welcome back! Ready to get to work? Let's stretch!", 7000);
        this.Engine.resetReminderTimer();
        
        setTimeout(() => {
          if (this.Engine.currentState === this.Engine.STATES.STRETCH) this.Engine.applyState(this.Engine.STATES.SIT);
        }, 3000);
      }
    });
  }
}

module.exports = new InteractionTracker();
