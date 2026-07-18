# Buddy - Design Customization Guidelines & Master Specification

This document defines the visual, anatomical, behavioral, and technical specifications for the Buddy desktop pet companion. All agents working on the codebase must adhere strictly to this design system.

---

## 1. Character Design - Quality & Style
* **Premium Game Character**: The style must resemble modern premium game companions (e.g., Animal Crossing, Spiritfarer, Pokémon companion creatures, Nintendogs) or Disney-style character illustrations.
* **Proportions**: Head must be exactly **30–35% of total body height** (not an oversized chibi mascot).
* **Base Colors**: Soft white base coat, light grey ears/patches, red collar band with a circular gold tag hanging from it.
* **Clean Silhouettes**: Designed with simple organic outlines and flat/gently shaded fills that instantly read as a "dog" even as a solid black silhouette.

---

## 2. Anatomical Requirements
* **Short thick neck**: Connects the head naturally to the torso and acts as the pivot origin for head tilts.
* **Broad Chest & Shoulders**: The chest must be wider than the neck, with front legs starting below the shoulders rather than the chin.
* **Canine Joint Kinematics**:
  * **Front Legs**: Shoulder ➔ Upper Leg ➔ Elbow ➔ Lower Leg ➔ Paw.
  * **Hind Legs**: Hip ➔ Thigh ➔ Hock ➔ Paw.
  * Paws must look solid and capable of supporting body weight.
* **Fluffy Tail**: Attached naturally to the pelvis.
* **Floppy Ears**: Framing the face, with slight volume.
* **Rounded Muzzle**: Separate snout layer with a small black nose and friendly smile.

---

## 3. Layered Asset Structure (Rigging)
For interactive states (sitting/idle), the character must be split into independent layers for coordinate-tracking translations and micro-animations:
* `body` (chest, torso, back, legs)
* `neck` (connecting segment)
* `head` (face, muzzle, forehead)
* `ear-l` & `ear-r` (floppy ears)
* `eye-white-l` & `eye-white-r` (static whites with tracking space)
* `pupil-l` & `pupil-r` (displaceable pupils)
* `eyelids` (for blinks)
* `eyebrows` (for expressions)
* `nose` & `mouth` (mouth shapes, tongue out)
* `tail` (base + tip)
* `collar` & `tag`

---

## 4. Animation Poses & States

### Idle & Micro Animations
Buddy must never appear frozen. Gentle movements trigger every 2–8 seconds:
* **Breathing**: Body scale pulse.
* **Blinking**: Eyelids close/open.
* **Eye Tracking**: Pupils follow the cursor instantly (50–100ms lag) when within 400px.
* **Ear Twitches**: Left/right ears rotate independently.
* **Tail Wag**: Calm, happy, or rapid wags.
* **Head Tilt**: Subtle tilting translations.
* **Tongue Poke**: Mouth opens briefly.
* **Paw Shift**: Subtle weight shifts.

### Locomotion Spritesheets
* **Walk & Run**: Managed via a frame-by-frame spritesheet loop (6–8 frames) showing clear weight shifts and bouncing head-bobs.
* **Stretch**: A play-bow stance (shoulders flat on ground, hips/tail raised, head up).
* **Sleep**: Natural curled bean posture (head resting on paws, tail wrapped, eyes closed with slow breathing).
* **Scratch**: Sitting posture scratching behind ear with back leg.

---

## 5. Absolutely Avoid
* ❌ Chibi proportions or oversized heads.
* ❌ Blob bodies built from simple geometric circles.
* ❌ Missing/invisible necks.
* ❌ Straight tube/featureless cylinder legs.
* ❌ Sticker, plush toy, logo, or emoji appearances.
* ❌ Teleporting (smooth acceleration/deceleration windows only).
* ❌ Robotic movements or sliding strides.
