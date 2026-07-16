# Buddy - Cozy Desktop Companion

**Latest Release**: v1.0.0

A cute, privacy-first desktop pet companion for your computer. Buddy roams your screen, tracks your cursor with googly eyes, and reminds you to stretch and take breaks while you work.

Buddy runs 100% offline with zero tracking, zero telemetry, and zero registry bloat.

---

## Direct Download

You do not need to install Node.js, clone this repository, or run terminal commands to use Buddy. We compile the application into a single, portable executable file.

### [Click Here to Download Buddy for Windows (.exe)](https://github.com/sammmiksha/desktop-pet/releases/download/Desktop-pet/desktop-pet.exe)

---

## How to Run Buddy on Windows

Since Buddy is a standalone portable application not distributed through the Microsoft Store, Windows Defender SmartScreen might show a warning on first launch.

1. **Download** the `desktop-pet.exe` file from the link above.
2. **Double-click** the downloaded file.
3. If the Windows SmartScreen popup appears:
   * Click **More info** on the message box.
   * Click the **Run anyway** button.
4. Buddy will appear on your screen! Double-click or Right-click him to open **Buddy's Notebook** settings.

---

## Features

* **Cozy Character Sheet Poses**: Built exactly like the official model sheet, Buddy supports Sitting, Walking (with a 4-step leg cycle), Running, Stretching, and Sleeping illustrations.
* **Googly Cursor Tracking**: Buddy's eyes and head follow your mouse cursor smoothly across your screen monitors.
* **Break Reminders**: Set custom notification intervals (including a 15-minute preset) to receive reminders to drink water, stretch, or rest your eyes.
* **Notebook Settings**: A cozy journal-style dashboard divided into tabs (General, Notifications, Messages, Behavior, About) to configure startup settings, speed, activity rates, and custom messages.
* **Start on Boot**: Option to launch Buddy automatically when Windows starts.

---

## Development & Building

If you are a developer and want to modify Buddy or compile the executable yourself:

### 1. Prerequisites
Install [Node.js](https://nodejs.org/) (LTS recommended).

### 2. Run Locally
```bash
# Clone the repository
git clone https://github.com/sammmiksha/desktop-pet.git

# Install dependencies
npm install

# Run the app in development mode
npm start
```

### 3. Build the Portable .exe
```bash
# Package the application into a standalone portable exe
npm run dist
```
> **Windows Build Note**: If the build fails with a `Cannot create symbolic link` error, run your terminal (Command Prompt or PowerShell) as **Administrator** and execute `npm run dist` again. Windows requires administrator privileges to create symbolic links during package extraction.

Once completed, you will find a standalone `desktop-pet.exe` inside the newly created `dist/` directory. Upload this file to your GitHub Releases page!

---

## Privacy & Safety
Buddy has zero telemetry, zero internet connection requirements, and zero data collecting. Everything resides locally in your user profile path.
