const { app, BrowserWindow, screen, ipcMain, Menu, Tray, powerMonitor } = require('electron');
const path = require('path');
const configStore = require('../settings/config-store');

let petWindow = null;
let dashboardWindow = null;
let cursorPollInterval = null;
let idleCheckInterval = null;
let petStatusState = { state: 'sit', mood: 'happy' };

// Clean up single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (dashboardWindow) {
      if (dashboardWindow.isMinimized()) dashboardWindow.restore();
      dashboardWindow.focus();
    } else if (petWindow) {
      openDashboard();
    }
  });
}

function createPetWindow(config) {
  if (petWindow) return;

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Size of the pet window (wide enough to accommodate speech bubbles)
  const winWidth = 250;
  const winHeight = 250;

  // Center coordinates
  const initialX = Math.round((width - winWidth) / 2);
  const initialY = Math.round((height - winHeight) / 2);

  petWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: initialX,
    y: initialY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  // Enable click-through by default
  petWindow.setIgnoreMouseEvents(true, { forward: true });
  petWindow.loadFile(path.join(__dirname, '../engine/renderer', 'pet.html'));

  petWindow.on('move', () => {
    const bounds = petWindow.getBounds();
    petWindow.webContents.send('window-position', { x: bounds.x, y: bounds.y });
  });

  petWindow.on('closed', () => {
    petWindow = null;
  });

  // Start polling cursor position
  startPolling();
}

function openDashboard() {
  if (dashboardWindow) {
    dashboardWindow.focus();
    return;
  }

  dashboardWindow = new BrowserWindow({
    width: 1020,
    height: 750,
    resizable: true,
    title: "Companion Dashboard",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Hide default menu bar
  dashboardWindow.setMenuBarVisibility(false);
  dashboardWindow.loadFile(path.join(__dirname, '../dashboard', 'dashboard.html'));

  dashboardWindow.on('closed', () => {
    dashboardWindow = null;
  });
}

// Global cursor polling to send screen coordinates relative to the pet window
function startPolling() {
  if (cursorPollInterval) clearInterval(cursorPollInterval);
  if (idleCheckInterval) clearInterval(idleCheckInterval);

  let lastIdleState = false; // false = active, true = sleeping

  cursorPollInterval = setInterval(() => {
    if (!petWindow) return;

    const cursor = screen.getCursorScreenPoint();
    const bounds = petWindow.getBounds();

    // Calculate delta relative to the center of the pet window
    const petCenterX = bounds.x + bounds.width / 2;
    const petCenterY = bounds.y + bounds.height / 2;
    const dx = cursor.x - petCenterX;
    const dy = cursor.y - petCenterY;

    petWindow.webContents.send('cursor-update', {
      dx,
      dy,
      screenX: cursor.x,
      screenY: cursor.y
    });
  }, 40); // ~25 FPS tracking

  // Idle check every 2 seconds
  idleCheckInterval = setInterval(() => {
    if (!petWindow) return;

    const idleTime = powerMonitor.getSystemIdleTime();
    // If idle for more than 5 minutes (300 seconds), tell pet to sleep
    const shouldSleep = idleTime >= 300; 

    if (shouldSleep !== lastIdleState) {
      lastIdleState = shouldSleep;
      petWindow.webContents.send('idle-state-change', shouldSleep);
    }
  }, 2000);
}

// IPC Event Handlers
ipcMain.on('get-config', (event) => {
  event.returnValue = configStore.load();
});

ipcMain.on('get-window-position', (event) => {
  if (petWindow) {
    const bounds = petWindow.getBounds();
    event.returnValue = { x: bounds.x, y: bounds.y };
  } else {
    event.returnValue = { x: 100, y: 100 };
  }
});

ipcMain.on('has-config-file', (event) => {
  event.returnValue = configStore.hasConfig();
});

ipcMain.on('pet-status-changed', (event, data) => {
  petStatusState = data;
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send('pet-status-updated', data);
  }
});

ipcMain.on('get-pet-status', (event) => {
  event.returnValue = petStatusState;
});

ipcMain.on('save-config', (event, newConfig) => {
  // Manage startup registry keys
  app.setLoginItemSettings({
    openAtLogin: newConfig.startupLaunch,
    path: app.getPath('exe')
  });

  configStore.save(newConfig);

  // Update pet window if it exists
  if (petWindow) {
    petWindow.webContents.send('config-updated', newConfig);
  }

  // If onboarding and dashboard is open, close it and open pet
  if (dashboardWindow && !petWindow) {
    createPetWindow(newConfig);
    dashboardWindow.close();
  }
});

ipcMain.on('open-settings', () => {
  openDashboard();
});

ipcMain.on('drag-window', (event, { mouseX, mouseY, offsetX, offsetY }) => {
  if (petWindow) {
    // Keep pet inside the screen boundaries
    const { width, height } = screen.getPrimaryDisplay().bounds;
    const bounds = petWindow.getBounds();
    
    let targetX = mouseX - offsetX;
    let targetY = mouseY - offsetY;

    // Boundary clamps
    targetX = Math.max(0, Math.min(width - bounds.width, targetX));
    targetY = Math.max(0, Math.min(height - bounds.height, targetY));

    petWindow.setPosition(targetX, targetY);
  }
});

ipcMain.on('set-ignore-mouse', (event, ignore, options) => {
  if (petWindow) {
    petWindow.setIgnoreMouseEvents(ignore, options);
  }
});

ipcMain.on('show-context-menu', () => {
  const template = [
    {
      label: 'Settings Dashboard',
      click: () => { openDashboard(); }
    },
    { type: 'separator' },
    {
      label: 'Quit Companion',
      click: () => { app.quit(); }
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup();
});

ipcMain.on('move-pet', (event, { x, y }) => {
  if (petWindow) {
    const { width, height } = screen.getPrimaryDisplay().bounds;
    const bounds = petWindow.getBounds();

    let targetX = Math.round(x);
    let targetY = Math.round(y);

    // Boundary clamp
    targetX = Math.max(0, Math.min(width - bounds.width, targetX));
    targetY = Math.max(0, Math.min(height - bounds.height, targetY));

    petWindow.setPosition(targetX, targetY);
  }
});

// App Lifecycle
app.whenReady().then(() => {
  const config = configStore.load();

  if (!configStore.hasConfig()) {
    // Onboarding: open settings dashboard first
    openDashboard();
  } else {
    // Normal startup: open pet directly
    createPetWindow(config);
  }
});

app.on('window-all-closed', () => {
  // Keep app running in background even if dashboard is closed
  if (process.platform !== 'darwin' && !petWindow) {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (cursorPollInterval) clearInterval(cursorPollInterval);
  if (idleCheckInterval) clearInterval(idleCheckInterval);
});
