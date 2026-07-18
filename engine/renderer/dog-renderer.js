class DogRenderer {
  init(Engine, character) {
    this.Engine = Engine;
    this.character = character;
    this.stage = Engine.elements.stageEl;
    this.layers = {};
    this.walkFrames = [];
    this.currentWalkFrame = 0;

    this.build();
    this.setFacing('right');
    this.setState(character.defaultState || 'idle');
  }

  build() {
    this.stage.innerHTML = '';

    const art = document.createElement('div');
    art.className = 'dog-art';
    this.stage.appendChild(art);
    this.art = art;

    this.layers.idleLeft = this.createImage(this.character.poses.idleLeft, 'dog-render-layer dog-pose pose-idle-left');
    this.layers.idleRight = this.createImage(this.character.poses.idleRight, 'dog-render-layer dog-pose pose-idle-right');
    this.layers.sleep = this.createImage(this.character.poses.sleep, 'dog-render-layer dog-pose pose-sleep');
    this.layers.stretch = this.createImage(this.character.poses.stretch, 'dog-render-layer dog-pose pose-stretch');
    this.layers.scratch = this.createImage(this.character.poses.scratch, 'dog-render-layer dog-pose pose-scratch');
    this.layers.yawn = this.createImage(this.character.poses.yawn, 'dog-render-layer dog-pose pose-yawn');

    const walk = this.character.animations.walk || { frames: [] };
    this.walkFrames = walk.frames.map((src, index) => {
      return this.createImage(src, `dog-render-layer walk-frame walk-frame-${index + 1}`);
    });

    this.eyeRig = this.createEyeRig();
  }

  createImage(src, className) {
    const image = document.createElement('img');
    image.className = className;
    image.src = src;
    image.decoding = 'async';
    image.draggable = false;
    image.addEventListener('error', () => {
      image.classList.remove('active');
      console.warn(`Buddy asset failed to load: ${src}`);
    });
    this.art.appendChild(image);
    return image;
  }

  setState(state) {
    this.clearActiveLayers();
    this.setEyeRigVisible(state === 'idle' || state === 'sit');

    if (state === 'walk' || state === 'run') {
      this.showWalkFrame(this.currentWalkFrame);
      return;
    }

    const pose = this.getPoseForState(state);
    if (pose) {
      pose.classList.add('active');
    }
  }

  setFacing(direction) {
    this.Engine.direction = direction === 'left' ? 'left' : 'right';
    this.Engine.elements.dogEl.classList.toggle('facing-left', this.Engine.direction === 'left');
    this.Engine.elements.dogEl.classList.toggle('facing-right', this.Engine.direction === 'right');

    if (this.Engine.currentState === 'idle' || this.Engine.currentState === 'sit') {
      this.setState(this.Engine.currentState);
    }
  }

  showWalkFrame(index) {
    if (this.walkFrames.length === 0) return;

    this.walkFrames.forEach(frame => frame.classList.remove('active'));
    this.currentWalkFrame = index % this.walkFrames.length;
    this.walkFrames[this.currentWalkFrame].classList.add('active');
  }

  clearActiveLayers() {
    Object.values(this.layers).forEach(layer => layer.classList.remove('active'));
    this.walkFrames.forEach(frame => frame.classList.remove('active'));
  }

  createEyeRig() {
    const rig = document.createElement('div');
    rig.className = 'eye-rig';
    rig.setAttribute('aria-hidden', 'true');

    ['far', 'near'].forEach(position => {
      const eye = document.createElement('div');
      eye.className = `tracking-eye tracking-eye-${position}`;

      const pupil = document.createElement('div');
      pupil.className = 'tracking-pupil';
      eye.appendChild(pupil);
      rig.appendChild(eye);
    });

    this.art.appendChild(rig);
    return rig;
  }

  setEyeRigVisible(isVisible) {
    if (!this.eyeRig) return;
    this.eyeRig.classList.toggle('active', false);
  }

  getPoseForState(state) {
    if (state === 'sleep') return this.layers.sleep;
    if (state === 'stretch') return this.layers.stretch;
    if (state === 'scratch') return this.layers.scratch;
    if (state === 'yawn') return this.layers.yawn;
    if (this.Engine.direction === 'left') return this.layers.idleLeft;
    return this.layers.idleRight;
  }
}

module.exports = new DogRenderer();
