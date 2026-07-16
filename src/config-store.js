const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigStore {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.defaults = {
      name: 'Buddy',
      remindersEnabled: true,
      reminderPreset: '1h', // 'off', '30m', '45m', '1h', '2h', 'custom'
      customReminderHours: 1,
      customReminderMinutes: 30,
      startupLaunch: false,
      activityLevel: 'balanced', // 'calm', 'balanced', 'energetic'
      speed: 5, // 1 to 10 slider
      soundEnabled: true,
      greetingsPreset: 'friendly', // 'friendly', 'professional', 'funny', 'motivational', 'custom'
      morningGreetings: [
        "Hi, how are you? Let's start the day with great ideas!",
        "Good morning! Ready to build something awesome?",
        "Morning! Grab some coffee, let's write some code!"
      ],
      breakMessages: [
        "Time for a quick stretch break!",
        "Water check! Take a sip of water, friend.",
        "Rest your eyes! Look away from the screen for a bit.",
        "How is your posture right now? Straighten up!"
      ],
      goodbyeMessages: [
        "Goodbye! Great work today.",
        "See you next time! Rest up.",
        "Logging off! Sleep tight!"
      ],
      celebrationMessages: [
        "You are a coding wizard! Awesome job!",
        "We did it! High five!",
        "Success! That's how we roll!"
      ]
    };
  }

  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return { ...this.defaults, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('Failed to load config, using defaults', e);
    }
    return { ...this.defaults };
  }

  save(config) {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('Failed to save config', e);
      return false;
    }
  }

  hasConfig() {
    return fs.existsSync(this.configPath);
  }
}

module.exports = new ConfigStore();
