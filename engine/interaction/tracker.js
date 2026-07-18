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
      el.dogEl.classList.add('dragging');
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
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.Engine.isDragging) {
        this.Engine.isDragging = false;
        el.dogEl.classList.remove('dragging');
        ipcRenderer.send('set-ignore-mouse', true, { forward: true });
        this.Engine.applyState(this.Engine.STATES.SIT);
        
        // Synchronize final coordinates after dragging
        const pos = ipcRenderer.sendSync('get-window-position') || { x: 100, y: 100 };
        this.Engine.currentPetPosition.x = pos.x;
        this.Engine.currentPetPosition.y = pos.y;
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
          this.Engine.targetLook = { x: 0, y: 0, rotate: 0 };
        }
        return;
      }

      if (this.Engine.isDistracted) {
        return;
      }

      const lookStrength = Math.min(distance / 250, 1);
      this.Engine.targetLook = {
        x: Math.cos(angle) * lookStrength * 4,
        y: Math.sin(angle) * lookStrength * 2.5,
        rotate: Math.cos(angle) * lookStrength * 5
      };

      if (distance <= 250) {
        el.dogEl.classList.add('micro-wag');
        clearTimeout(this.cursorWagTimeout);
        this.cursorWagTimeout = setTimeout(() => el.dogEl.classList.remove('micro-wag'), 500);
      } else {
        el.dogEl.classList.remove('micro-wag');
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
