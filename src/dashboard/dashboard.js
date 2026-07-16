const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  // General Inputs
  const nameInput = document.getElementById('companion-name');
  const sidebarPetName = document.getElementById('sidebar-pet-name');

  // Reminders / Notification Inputs
  const remindersCheckbox = document.getElementById('reminders-enabled');
  const customIntervalPane = document.getElementById('custom-interval-pane');
  const customHoursInput = document.getElementById('custom-hours');
  const customMinutesInput = document.getElementById('custom-minutes');
  const reminderBubblePreview = document.getElementById('reminder-bubble-preview-text');

  // Messages Inputs & Previews
  const messageList = document.getElementById('message-list');
  const addMessageBtn = document.getElementById('add-message-btn');
  const greetingsBubblePreview = document.getElementById('greetings-bubble-preview-text');

  // Modal Dialog Elements
  const addModal = document.getElementById('add-modal');
  const modalInput = document.getElementById('modal-message-input');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSaveBtn = document.getElementById('modal-save-btn');

  // Behavior Inputs (Distributed Tabs)
  const startupCheckbox = document.getElementById('startup-launch-behavior');
  const speedSlider = document.getElementById('speed-slider-behavior');
  const speedIndicator = document.getElementById('speed-indicator-bar-behavior');

  // Save Button
  const globalSaveBtn = document.getElementById('global-save-btn');

  // Load configuration
  const config = ipcRenderer.sendSync('get-config');

  // Local message catalog cache
  let currentMessages = {
    morningGreetings: [...(config.morningGreetings || [])],
    breakMessages: [...(config.breakMessages || [])],
    goodbyeMessages: [...(config.goodbyeMessages || [])],
    celebrationMessages: [...(config.celebrationMessages || [])]
  };

  // Bind Dynamic Status updates
  const initStatusDisplay = () => {
    const status = ipcRenderer.sendSync('get-pet-status') || { activity: 'Sitting', mood: 'Happy' };
    updateStatusLabels(status.activity, status.mood);

    ipcRenderer.on('pet-status-updated', (event, { activity, mood }) => {
      updateStatusLabels(activity, mood);
    });
  };

  const updateStatusLabels = (activity, mood) => {
    const actVal = document.getElementById('status-activity-val');
    const moodVal = document.getElementById('status-mood-val');

    let actEmoji = '🟢';
    if (activity === 'Sleeping') actEmoji = '😴';
    else if (activity === 'Sitting') actEmoji = '🪑';
    else if (activity === 'Walking Around' || activity === 'Wandering') actEmoji = '🚶';
    else if (activity === 'Scratching') actEmoji = '🐕';
    else if (activity === 'Stretching') actEmoji = '🙆';

    let moodEmoji = '😊';
    if (mood === 'Sleepy') moodEmoji = '😴';
    else if (mood === 'Curious') moodEmoji = '🤔';

    if (actVal) actVal.innerText = `${actEmoji} ${activity}`;
    if (moodVal) moodVal.innerText = `${moodEmoji} ${mood}`;
  };

  // Tab switcher
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      navItems.forEach(i => i.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      item.classList.add('active');
      const tabId = item.getAttribute('data-tab');
      const targetTab = document.getElementById(tabId);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // Render greetings list dynamically
  const renderGreetings = () => {
    if (!messageList) return;
    messageList.innerHTML = '';
    currentMessages.morningGreetings.forEach((msg, idx) => {
      const li = document.createElement('li');
      li.className = 'message-item-cozy';
      li.innerHTML = `
        <span class="msg-text">${msg}</span>
        <button class="msg-delete-btn" data-idx="${idx}">🗑️</button>
      `;
      messageList.appendChild(li);
    });

    // Delete handlers
    document.querySelectorAll('.msg-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        currentMessages.morningGreetings.splice(idx, 1);
        renderGreetings();
        updatePreviewTexts();
      });
    });
  };

  // Modal actions
  if (addMessageBtn) {
    addMessageBtn.addEventListener('click', () => {
      modalInput.value = '';
      addModal.classList.remove('hidden');
    });
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', () => {
      addModal.classList.add('hidden');
    });
  }

  if (modalSaveBtn) {
    modalSaveBtn.addEventListener('click', () => {
      const text = modalInput.value.trim();
      if (text) {
        currentMessages.morningGreetings.push(text);
        renderGreetings();
        updatePreviewTexts();
      }
      addModal.classList.add('hidden');
    });
  }

  // Initialize fields
  const populateFields = () => {
    // General Name input live bindings
    nameInput.value = config.name || 'Buddy';
    sidebarPetName.innerText = nameInput.value;
    nameInput.addEventListener('input', () => {
      const val = nameInput.value.trim() || 'Buddy';
      sidebarPetName.innerText = val;
    });

    // Behavior tab
    if (startupCheckbox) startupCheckbox.checked = !!config.startupLaunch;

    // Reminders Switch Toggle
    remindersCheckbox.checked = !!config.remindersEnabled;
    
    // Preset radios
    const presetRadios = document.querySelectorAll('input[name="reminder-preset"]');
    presetRadios.forEach(radio => {
      if (radio.value === config.reminderPreset) {
        radio.checked = true;
        radio.closest('.radio-card-cozy').classList.add('selected');
      }

      radio.addEventListener('change', () => {
        presetRadios.forEach(r => r.closest('.radio-card-cozy').classList.remove('selected'));
        if (radio.checked) {
          radio.closest('.radio-card-cozy').classList.add('selected');
        }
        toggleCustomIntervalPane();
        updatePreviewTexts();
      });
    });

    // Custom Time
    customHoursInput.value = config.customReminderHours !== undefined ? config.customReminderHours : 1;
    customMinutesInput.value = config.customReminderMinutes !== undefined ? config.customReminderMinutes : 30;

    customHoursInput.addEventListener('input', updatePreviewTexts);
    customMinutesInput.addEventListener('input', updatePreviewTexts);

    remindersCheckbox.addEventListener('change', toggleRemindersState);
    toggleRemindersState();

    // Speed Slider
    if (speedSlider) {
      speedSlider.value = config.speed || 5;
      updateSpeedIndicator();
      speedSlider.addEventListener('input', updateSpeedIndicator);
    }

    // Behavior Level
    const activityRadios = document.querySelectorAll('input[name="activity-level-behavior"]');
    activityRadios.forEach(radio => {
      if (radio.value === config.activityLevel) {
        radio.checked = true;
      }
    });

    // Load greetings dynamically
    renderGreetings();
  };

  const toggleRemindersState = () => {
    const container = document.getElementById('reminders-options-container');
    if (remindersCheckbox.checked) {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
    toggleCustomIntervalPane();
  };

  const toggleCustomIntervalPane = () => {
    const customRadio = document.querySelector('input[name="reminder-preset"][value="custom"]');
    if (remindersCheckbox.checked && customRadio && customRadio.checked) {
      customIntervalPane.classList.remove('hidden');
    } else {
      customIntervalPane.classList.add('hidden');
    }
  };

  const updateSpeedIndicator = () => {
    if (!speedSlider || !speedIndicator) return;
    const val = parseInt(speedSlider.value);
    speedIndicator.innerText = '█'.repeat(val) + '░'.repeat(10 - val);
  };

  const updatePreviewTexts = () => {
    // Break Preview
    const breaks = currentMessages.breakMessages;
    if (breaks && breaks.length > 0) {
      reminderBubblePreview.innerText = breaks[Math.floor(Math.random() * breaks.length)] + " 💧";
    } else {
      reminderBubblePreview.innerText = "Time for a break!";
    }

    // Greeting Preview
    const greetings = currentMessages.morningGreetings;
    if (greetings && greetings.length > 0) {
      greetingsBubblePreview.innerText = greetings[Math.floor(Math.random() * greetings.length)];
    } else {
      greetingsBubblePreview.innerText = "Let's build something awesome today! ❤️";
    }
  };

  // Global Save Button Event
  globalSaveBtn.addEventListener('click', () => {
    const selectedPresetRadio = document.querySelector('input[name="reminder-preset"]:checked');
    const selectedActivityRadio = document.querySelector('input[name="activity-level-behavior"]:checked');

    const parsedHours = customHoursInput.value !== '' ? parseInt(customHoursInput.value) : 1;
    const parsedMinutes = customMinutesInput.value !== '' ? parseInt(customMinutesInput.value) : 30;

    const updatedConfig = {
      name: nameInput.value.trim() || 'Buddy',
      remindersEnabled: remindersCheckbox.checked,
      reminderPreset: selectedPresetRadio ? selectedPresetRadio.value : '1h',
      customReminderHours: isNaN(parsedHours) ? 1 : parsedHours,
      customReminderMinutes: isNaN(parsedMinutes) ? 30 : parsedMinutes,
      startupLaunch: startupCheckbox ? startupCheckbox.checked : false,
      activityLevel: selectedActivityRadio ? selectedActivityRadio.value : 'balanced',
      speed: speedSlider ? (parseInt(speedSlider.value) || 5) : 5,
      soundEnabled: true,
      morningGreetings: [...currentMessages.morningGreetings],
      breakMessages: [...currentMessages.breakMessages],
      goodbyeMessages: [...currentMessages.goodbyeMessages],
      celebrationMessages: [...currentMessages.celebrationMessages]
    };

    ipcRenderer.send('save-config', updatedConfig);

    // Save button feedback
    globalSaveBtn.classList.add('saved');
    globalSaveBtn.innerText = '✓ Saved Settings';

    setTimeout(() => {
      globalSaveBtn.classList.remove('saved');
      globalSaveBtn.innerText = '💾 Save Changes';
    }, 2000);
  });

  // Start initialization
  populateFields();
  initStatusDisplay();
  updatePreviewTexts();
});
