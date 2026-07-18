# MASTER DESIGN SPECIFICATION — BUDDY, THE PREMIUM DESKTOP COMPANION

This design specification outlines the architectural guidelines, character anatomy models, rendering layout structures, and behavioral state layers for Buddy, the premium 2D game-style animated desktop companion.

---

## 1. Character Proportions & Quality
Buddy is designed to resemble high-fidelity modern game characters (Animal Crossing, Spiritfarer, Pokémon companion creature assets) rather than simple icons or mascots.

* **Head Size**: scaled to **30–35% of total body height** (avoiding exaggerated chibi ovals).
* **Neck**: A short, distinct connecting column (acting as the pivot line for head tilts).
* **Chest**: Broad chest, wider than the neck, with natural shoulder placements.
* **Legs**: Jointed canine limbs with defined thighs, elbows, shins, and weight-supporting paws.
* **Tail**: Curved, fluffy tail attached naturally to the pelvis.
* **Muzzle**: Rounded snout with a small black nose dot and a smiling mouth.
* **Ears**: Volume-rich floppy grey ears framing the cheeks.
* **Base Palette**: White main coat (`#ffffff`), light grey ears/patches (`#b2bec3`), red collar (`#ff4757`), gold tag (`#ffa502`).

---

## 2. Dynamic 2D Spritesheet Rendering Engine
The rendering engine in `pet.html`, `pet.css`, and `pet.js` operates as a hybrid 2D game sprite player, supporting drop-in transparent image assets with automatic fallback handlers:

```
[Assets folder] ──(WebP / PNG)──> [SVG image overlays] ──(on success)──> Hides vector fallbacks
                                       │
                                   (on error)
                                       │
                                       ▼
                              Renders rigged vector paths
```

### Directory Asset Paths (Project Root):
* `assets/buddy/idle/`: Modular layers for sitting/idle (body, neck, head base, ears, collar, tag, nose, snout, mouth, eye-whites, pupils).
* `assets/buddy/walk/`: Spritesheet frames (`walk-1.webp` to `walk-4.webp` or `walk-8.webp`) and side-profile head overlays.
* `assets/buddy/run/`: Running frame sequences.
* `assets/buddy/stretch/`: Play-bow stretch image.
* `assets/buddy/sleep/`: Curled sleeping image.
* `assets/buddy/expressions/`: Eyelid/eyebrow variations.

---

## 3. Interactive Layer Rigging
During sitting/idle states, the face and neck remain fully interactive, tracking cursor positions and playing organic lifelike micro-animations:
* **Ears**: Twitch independently.
* **Eyes**: Whites (`eye-white-l/r`) stay static while pupils (`pupil-l/r`) translate dynamically in screen space.
* **Pupil coordinates**: Directly set using SVG `cx` and `cy` attributes for bulletproof rendering in Electron.
* **Attention Span**: Buddy tracks the cursor within 250px, wags his tail, and goes into a 6-second ignore cooldown after 4 seconds of continuous tracking to look alive.
* **Look-Aways**: Distraction cycle rotates head to look away organically every few seconds.

---

## 4. Behavior Engine
* **Layer 1: Micro Animations (Every 2–8 seconds)**: blinks, nose sniffs, ear twitches, paw lifts, tongue wiggles, and micro wags.
* **Layer 2: Posture Ticks (Every 20–60 seconds)**: shifts sitting, scratching, and play-bow stretching states.
* **Layer 3: Locomotion & Reminders (Every 1–5 minutes)**: walks to random screen locations, curls up in corners to sleep on idle, and walks directly next to the user's cursor to deliver health break alerts.
