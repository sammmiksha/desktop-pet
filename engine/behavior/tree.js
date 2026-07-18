class BehaviorTree {
  constructor() {
    this.behaviorTimer = null;
    this.reminderTimer = null;
    this.lastReminderTime = Date.now();
  }

  init(Engine, Movement) {
    this.Engine = Engine;
    this.Movement = Movement;
    this.startLoop();
    this.startReminderTimer();
  }

  startLoop() {
    if (this.behaviorTimer) clearInterval(this.behaviorTimer);

    const getBehaviorCheckInterval = () => {
      return 20000 + Math.random() * 40000;
    };

    this.behaviorTimer = setInterval(() => {
      if (this.Engine.currentState === this.Engine.STATES.SLEEP || this.Engine.isDragging || this.Engine.currentState === this.Engine.STATES.WALK) return;

      const roll = Math.random();

      // Configure probabilities based on profile settings
      let pSit = 0.50;
      let pWalk = 0.25;
      let pScratch = 0.15; // remaining 0.10 is stretch

      if (this.Engine.config.activityLevel === 'calm') {
        pSit = 0.70;
        pWalk = 0.15;
        pScratch = 0.10;
        this.Engine.elements.dogEl.classList.remove('playful-wag');
      } else if (this.Engine.config.activityLevel === 'energetic') {
        pSit = 0.25;
        pWalk = 0.40;
        pScratch = 0.20;
        this.Engine.elements.dogEl.classList.add('playful-wag');
      } else {
        this.Engine.elements.dogEl.classList.remove('playful-wag');
      }

      if (roll < pSit) {
        this.Engine.applyState(this.Engine.STATES.SIT);
      } else if (roll < pSit + pWalk) {
        this.Movement.startWandering();
      } else if (roll < pSit + pWalk + pScratch) {
        this.Engine.applyState(this.Engine.STATES.SCRATCH);
        setTimeout(() => {
          if (this.Engine.currentState === this.Engine.STATES.SCRATCH) this.Engine.applyState(this.Engine.STATES.SIT);
        }, 3000);
      } else {
        this.Engine.applyState(this.Engine.STATES.STRETCH);
        setTimeout(() => {
          if (this.Engine.currentState === this.Engine.STATES.STRETCH) this.Engine.applyState(this.Engine.STATES.SIT);
        }, 2500);
      }
    }, getBehaviorCheckInterval());
  }

  startReminderTimer() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);

    const getReminderIntervalMs = () => {
      if (this.Engine.config.reminderPreset === '15m') return 15 * 60 * 1000;
      if (this.Engine.config.reminderPreset === '30m') return 30 * 60 * 1000;
      if (this.Engine.config.reminderPreset === '45m') return 45 * 60 * 1000;
      if (this.Engine.config.reminderPreset === '1h') return 60 * 60 * 1000;
      if (this.Engine.config.reminderPreset === '2h') return 2 * 60 * 60 * 1000;
      if (this.Engine.config.reminderPreset === 'custom') {
        const hours = parseFloat(this.Engine.config.customReminderHours) || 0;
        const minutes = parseFloat(this.Engine.config.customReminderMinutes) || 0;
        return (hours * 3600 + minutes * 60) * 1000;
      }
      return 0; // Off
    };

    this.reminderTimer = setInterval(() => {
      if (this.Engine.currentState === this.Engine.STATES.SLEEP) return;

      if (this.Engine.config.remindersEnabled && this.Engine.config.reminderPreset !== 'off') {
        const intervalMs = getReminderIntervalMs();
        if (intervalMs <= 0) return;

        const elapsed = Date.now() - this.lastReminderTime;

        if (elapsed >= intervalMs) {
          this.lastReminderTime = Date.now();
          this.showReminder();
        }
      }
    }, 10000);
  }

  showReminder() {
    let reminders = [
      "You've been doing great. Maybe stretch for a minute? 🐶",
      "Time for a quick stretch break!",
      "Water check! Take a sip of water, friend.",
      "Rest your eyes! Look at something 20 feet away.",
      "How is your posture right now? Straighten up!"
    ];

    if (this.Engine.config.breakMessages && this.Engine.config.breakMessages.length > 0) {
      reminders = this.Engine.config.breakMessages;
    }

    this.Engine.pendingReminderText = reminders[Math.floor(Math.random() * reminders.length)];

    const screen = window.screen;
    let targetX = this.Engine.lastMousePosition.x - 120;
    let targetY = this.Engine.lastMousePosition.y - 120;

    targetX = Math.max(40, Math.min(screen.availWidth - 290, targetX));
    targetY = Math.max(40, Math.min(screen.availHeight - 240, targetY));

    this.Engine.isDeliveringReminder = true;
    this.Movement.wanderTarget = { x: targetX, y: targetY };
    this.Engine.applyState(this.Engine.STATES.WALK);
  }
}

module.exports = new BehaviorTree();
