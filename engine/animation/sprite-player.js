class SpritePlayer {
  constructor() {
    this.microTimer = null;
    this.distractionTimer = null;
  }

  init(Engine) {
    this.Engine = Engine;
    this.startMicroCycle();
    this.startDistractionCycle();
    this.startBlinkCycle();
  }

  startMicroCycle() {
    if (this.microTimer) clearTimeout(this.microTimer);

    const nextInterval = 2000 + Math.random() * 6000;

    this.microTimer = setTimeout(() => {
      const state = this.Engine.currentState;
      if ((state === this.Engine.STATES.SIT || state === this.Engine.STATES.SCRATCH) && !this.Engine.isDragging) {
        const roll = Math.random();
        const dogEl = this.Engine.elements.dogEl;
        const tongueEl = this.Engine.elements.tongueEl;
        
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
      this.startMicroCycle();
    }, nextInterval);
  }

  startDistractionCycle() {
    if (this.distractionTimer) clearTimeout(this.distractionTimer);
    
    const interval = 5000 + Math.random() * 5000;
    
    this.distractionTimer = setTimeout(() => {
      if (this.Engine.currentState !== this.Engine.STATES.SLEEP && !this.Engine.isDragging) {
        if (Math.random() < 0.20) {
          this.Engine.isDistracted = true;

          // Look somewhere random
          const angle = Math.random() * Math.PI * 2;
          const offset = 1.5 + Math.random() * 2.5;
          this.Engine.targetEyeOffset.x = Math.cos(angle) * offset;
          this.Engine.targetEyeOffset.y = Math.sin(angle) * offset;

          this.Engine.targetHeadRotate = 0;
          this.Engine.targetHeadTranslate = { x: 0, y: 0 };

          setTimeout(() => {
            this.Engine.isDistracted = false;
          }, 1500 + Math.random() * 1500);
        }
      }
      this.startDistractionCycle();
    }, interval);
  }

  startBlinkCycle() {
    const nextBlink = 3000 + Math.random() * 3000;
    setTimeout(() => {
      if (this.Engine.currentState !== this.Engine.STATES.SLEEP && !this.Engine.isDragging) {
        const eyelids = document.querySelector('.img-eyelids');
        const whiteEyeImg = document.querySelector('.view-front .eyes image[href*="white_eye"]');
        const pupilImg = document.querySelector('.pupil-layer');
        const vectors = document.querySelectorAll('.eye-white, .pupil, .sparkle');

        if (eyelids) {
          eyelids.classList.remove('hidden');
          if (whiteEyeImg) whiteEyeImg.setAttribute('visibility', 'hidden');
          if (pupilImg) pupilImg.setAttribute('visibility', 'hidden');
          vectors.forEach(v => v.setAttribute('visibility', 'hidden'));

          setTimeout(() => {
            eyelids.classList.add('hidden');
            if (whiteEyeImg) whiteEyeImg.setAttribute('visibility', 'visible');
            if (pupilImg) pupilImg.setAttribute('visibility', 'visible');
            
            // Re-hide vectors if images are successfully loaded
            const whiteEyeVisible = whiteEyeImg && whiteEyeImg.getAttribute('visibility') !== 'hidden';
            if (!whiteEyeVisible) {
              vectors.forEach(v => v.setAttribute('visibility', 'visible'));
            }
          }, 150);
        }
      }
      this.startBlinkCycle();
    }, nextBlink);
  }
}

module.exports = new SpritePlayer();
