const { ipcRenderer } = require('electron');

class MovementEngine {
  constructor() {
    this.wanderTarget = null;
    this.wanderSpeed = 1.8;
  }

  init(Engine) {
    this.Engine = Engine;
    this.updateSpeed();
  }

  updateSpeed() {
    const baseSpeed = 1.8;
    const speedMultiplier = (this.Engine.config.speed || 5) / 5;
    this.wanderSpeed = baseSpeed * speedMultiplier;
  }

  startWandering() {
    const screen = window.screen;
    const winWidth = 250;
    const winHeight = 250;

    const targetX = Math.round(Math.random() * (screen.availWidth - winWidth));
    const targetY = Math.round(Math.random() * (screen.availHeight - winHeight));

    this.wanderTarget = { x: targetX, y: targetY };
    this.Engine.applyState(this.Engine.STATES.WALK);
  }

  stopWandering() {
    this.wanderTarget = null;
  }

  tick() {
    if (this.Engine.currentState === this.Engine.STATES.WALK && this.wanderTarget) {
      const dx = this.wanderTarget.x - this.Engine.currentPetPosition.x;
      const dy = this.wanderTarget.y - this.Engine.currentPetPosition.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 4) {
        this.wanderTarget = null;
        this.onReachDestination();
      } else {
        const stepX = (dx / dist) * this.wanderSpeed;
        const stepY = (dy / dist) * this.wanderSpeed;
        
        this.Engine.currentPetPosition.x += stepX;
        this.Engine.currentPetPosition.y += stepY;

        ipcRenderer.send('move-pet', {
          x: this.Engine.currentPetPosition.x,
          y: this.Engine.currentPetPosition.y
        });

        if (stepX < 0) {
          this.Engine.elements.dogEl.classList.add('mirror');
        } else if (stepX > 0) {
          this.Engine.elements.dogEl.classList.remove('mirror');
        }
      }
    }
  }

  onReachDestination() {
    if (this.Engine.isGoingToSleep) {
      this.Engine.isGoingToSleep = false;
      this.Engine.elements.dogEl.classList.add('curling-up');
      setTimeout(() => {
        this.Engine.elements.dogEl.classList.remove('curling-up');
        this.Engine.applyState(this.Engine.STATES.SLEEP);
      }, 1000);
    } else if (this.Engine.isDeliveringReminder) {
      this.Engine.isDeliveringReminder = false;
      this.Engine.applyState(this.Engine.STATES.SIT);
      this.Engine.elements.dogEl.classList.add('micro-wag');
      setTimeout(() => this.Engine.elements.dogEl.classList.remove('micro-wag'), 1500);
      this.Engine.showSpeechBubble(this.Engine.pendingReminderText, 12000);
    } else {
      this.Engine.applyState(this.Engine.STATES.SIT);
      this.Engine.isLookingAround = true;
      this.Engine.targetHeadRotate = 10;
      setTimeout(() => {
        if (this.Engine.isLookingAround) this.Engine.targetHeadRotate = -10;
      }, 800);
      setTimeout(() => {
        if (this.Engine.isLookingAround) {
          this.Engine.targetHeadRotate = 0;
          this.Engine.isLookingAround = false;
        }
      }, 1600);
    }
  }
}

module.exports = new MovementEngine();
