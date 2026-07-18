class AnimationController {
  constructor() {
    this.microTimer = null;
    this.distractionTimer = null;
    this.lastFrameTime = 0;
    this.walkFrameIndex = 0;
  }

  init(Engine, Renderer) {
    this.Engine = Engine;
    this.Renderer = Renderer;
    this.startMicroCycle();
    this.startDistractionCycle();
  }

  tick(now) {
    const state = this.Engine.currentState;
    if (state !== this.Engine.STATES.WALK && state !== this.Engine.STATES.RUN) return;
    if (this.Renderer.walkFrames.length === 0) return;

    const walk = this.Engine.character.animations.walk;
    const fps = state === this.Engine.STATES.RUN ? (walk.fps || 10) * 1.35 : walk.fps || 10;
    const frameMs = 1000 / fps;

    if (now - this.lastFrameTime < frameMs) return;

    this.lastFrameTime = now;
    this.walkFrameIndex = (this.walkFrameIndex + 1) % this.Renderer.walkFrames.length;
    this.Renderer.showWalkFrame(this.walkFrameIndex);
  }

  startMicroCycle() {
    if (this.microTimer) clearTimeout(this.microTimer);

    const nextInterval = 2000 + Math.random() * 5000;
    this.microTimer = setTimeout(() => {
      const state = this.Engine.currentState;

      if ((state === this.Engine.STATES.IDLE || state === this.Engine.STATES.SIT) && !this.Engine.isDragging) {
        const dogEl = this.Engine.elements.dogEl;
        const className = this.pickMicroClass();
        dogEl.classList.add(className);
        setTimeout(() => dogEl.classList.remove(className), className === 'micro-wag' ? 1200 : 650);
      }

      this.startMicroCycle();
    }, nextInterval);
  }

  startDistractionCycle() {
    if (this.distractionTimer) clearTimeout(this.distractionTimer);

    const nextInterval = 5000 + Math.random() * 7000;
    this.distractionTimer = setTimeout(() => {
      if (this.Engine.currentState !== this.Engine.STATES.SLEEP && !this.Engine.isDragging && Math.random() < 0.24) {
        this.Engine.isDistracted = true;
        this.Engine.targetLook.x = (Math.random() - 0.5) * 8;
        this.Engine.targetLook.y = (Math.random() - 0.5) * 4;
        this.Engine.targetLook.rotate = (Math.random() - 0.5) * 7;

        setTimeout(() => {
          this.Engine.isDistracted = false;
          this.Engine.targetLook = { x: 0, y: 0, rotate: 0 };
        }, 1000 + Math.random() * 900);
      }

      this.startDistractionCycle();
    }, nextInterval);
  }

  pickMicroClass() {
    const roll = Math.random();
    if (roll < 0.18) return 'ear-twitch-l';
    if (roll < 0.36) return 'ear-twitch-r';
    if (roll < 0.55) return 'sniff';
    if (roll < 0.72) return 'paw-shift';
    if (roll < 0.86) return 'paw-shift-r';
    return 'micro-wag';
  }
}

module.exports = new AnimationController();
