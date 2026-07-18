class StateMachine {
  init(Engine, Renderer) {
    this.Engine = Engine;
    this.Renderer = Renderer;
  }

  transition(nextState) {
    const previousState = this.Engine.currentState;
    if (previousState === nextState) {
      this.Renderer.setState(nextState);
      return;
    }

    this.exit(previousState);
    this.Engine.currentState = nextState;
    this.enter(nextState);
  }

  enter(state) {
    const dogEl = this.Engine.elements.dogEl;
    const stateClass = `state-${state}`;

    Array.from(dogEl.classList)
      .filter(className => className.startsWith('state-'))
      .forEach(className => dogEl.classList.remove(className));

    dogEl.classList.add(stateClass);
    this.Renderer.setState(state);

    if (state === 'sleep') {
      this.Engine.hideSpeechBubble();
      this.Engine.Movement.stopWandering();
    }

    this.Engine.sendStatusUpdate();
  }

  exit() {
    this.Engine.elements.dogEl.classList.remove('arrive-look');
  }
}

module.exports = new StateMachine();
