const { ipcRenderer } = require('electron');

class BoundsManager {
  init(Engine) {
    const initialPos = ipcRenderer.sendSync('get-window-position') || { x: 100, y: 100 };
    Engine.currentPetPosition.x = initialPos.x;
    Engine.currentPetPosition.y = initialPos.y;

    ipcRenderer.on('window-position', (event, { x, y }) => {
      if (Engine.currentState !== Engine.STATES.WALK && !Engine.isDragging) {
        Engine.currentPetPosition.x = x;
        Engine.currentPetPosition.y = y;
      }
    });
  }

  getScreenSize() {
    return {
      width: window.screen.availWidth,
      height: window.screen.availHeight
    };
  }
}

module.exports = new BoundsManager();
