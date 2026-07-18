# Buddy Desktop Companion v2.0 - Character & Animation Redesign Specification

## Objective

The current implementation has reached the prototype stage but **does not meet the desired quality**. The goal is **not to refine the existing dog**, but to redesign Buddy from the ground up while preserving the movement engine, settings, reminders, and application architecture.

The final companion should feel like a small living puppy sharing the user's desktop, not an animated sticker or mascot.

---

## Current Problems That MUST Be Fixed

### 1. Character Design

The current companion looks constructed from circles and geometric shapes.

Problems:
* Head is too large.
* Neck is unnaturally long and thin.
* Chest is extremely narrow.
* Legs are cylindrical lines without joints.
* Feet are disconnected.
* Body proportions resemble a mascot instead of a dog.
* Walking silhouette does not immediately read as "dog."

**This design should not be iterated on further. It should be replaced.**

---

### 2. Animation

Current animation feels mechanical.
* The companion frequently appears frozen.
* The walk cycle resembles sliding.
* Stretching does not resemble canine movement.
* Sleeping is only a static image.
* Eye tracking is slow or non-functional.
* Animations should appear smooth and continuous.

---

### 3. Desktop Presence

The companion currently feels like an icon. It should instead feel like a creature occupying the desktop.

Movement should have:
* momentum
* anticipation
* acceleration
* deceleration
* breathing
* weight

---

## Character Requirements

Buddy should resemble a small young puppy.

Suggested inspiration:
* Cavalier King Charles Spaniel
* Maltese
* Miniature Golden Retriever puppy
* Cocker Spaniel puppy

NOT
* mascot
* plush toy
* emoji
* logo
* sticker
* blob

---

## Body Proportions

* **Head**: 30-35% of total height.
* **Body**: 65-70% of total height.
* The neck should be short and muscular.
* The chest should be broad.
* The rib cage should be visible.
* The body should be longer than it is tall.
* Legs should contain visible joints.

#### Front legs:
Shoulder ➔ Upper leg ➔ Elbow ➔ Lower leg ➔ Paw

#### Rear legs:
Hip ➔ Thigh ➔ Hock ➔ Paw

* Tail should begin naturally from the hips.

---

## Face

Buddy should appear intelligent.
* Large expressive eyes.
* Rounded pupils.
* Soft eyelids.
* Small eyebrows.
* Rounded muzzle.
* Soft smile.
* Small nose.
* Long floppy ears.
* Eyes should communicate emotion rather than permanent surprise.

---

## Eyes

Current implementation is unacceptable.

Requirements:
* **Cursor tracking latency**: Less than 50 milliseconds.
* **Update frequency**: 60 FPS.
* **Maximum pupil movement**: 4 pixels.
* **Smooth interpolation**.
* **Blink** every 3-6 seconds.
* Occasionally **squint**.
* Occasionally **glance away** before returning.
* The head should rotate slightly toward the cursor.

---

## Animation Philosophy

Buddy should never appear frozen. Every moment Buddy is alive.

Examples:
* Breathing.
* Blinking.
* Tail movement.
* Ear twitch.
* Nose sniff.
* Tongue appears briefly.
* Weight shift.
* Paw adjustment.
* Head movement.
* Eye movement.

These are **micro animations** and should happen continuously.

---

## Behaviour System

Instead of choosing a random animation every 15 seconds, Buddy should use a behaviour tree.

Priority order:
1. Sleeping
2. Waking
3. Stretching
4. Walking
5. Sitting
6. Looking Around
7. Cursor Interaction
8. Micro Idle Animations

Buddy should naturally transition between states.

---

## Walking

Current implementation should be replaced.

Walking should include:
* Turn toward destination.
* Lean body slightly.
* Walk.
* Slow down before stopping.
* Look around.
* Choose next behaviour.

* No teleportation.
* No sliding.
* Entire body participates.
* Head bobs slightly.
* Shoulders move.
* Hips move.
* Tail counterbalances.
* Ears bounce.

---

## Stretching

Current stretch animation should be discarded.

Correct stretch:
* Front legs extended.
* Chest lowered.
* Rear elevated.
* Tail raised.
* Neck extended.
* Head looking forward.
* Slow recovery.

---

## Sleeping

Sleeping should not simply swap images.

Sequence:
Walk ➔ Choose quiet location ➔ Turn ➔ Curl body ➔ Close eyes ➔ Tail wraps ➔ Breathing animation ➔ Occasional ear twitch ➔ Wake ➔ Stretch ➔ Stand.

---

## Desktop Movement

Buddy should not remain in one location. He should roam the entire desktop.

Possible locations:
* Top-left.
* Top-right.
* Center.
* Bottom-left.
* Bottom-right.
* Near active window.
* Near cursor.
* Near taskbar.

Desktop movement should feel exploratory rather than random.

---

## User Interaction

When cursor approaches:
* Eyes follow.
* Head turns.
* Tail wags once.
* Buddy watches the cursor.

If user clicks Buddy:
* Small reaction.
* Tail wag.
* Blink.
* Speech bubble.

---

## Animation Frequency

* **Micro animations**: Every 2-6 seconds.
* **Idle actions**: Every 20-45 seconds.
* **Walking**: Every 30-90 seconds.
* **Stretch**: After sleep.
* **Sleep**: Only after user inactivity.

---

## Rendering System

Do not build Buddy as one image.

Separate layers:
* Body.
* Neck.
* Head.
* Tail.
* Left ear.
* Right ear.
* Left eye.
* Right eye.
* Left pupil.
* Right pupil.
* Upper eyelids.
* Lower eyelids.
* Eyebrows.
* Collar.
* Tag.
* Front legs.
* Rear legs.

This enables smooth procedural animation.

---

## Technical Goal

Buddy should be treated as a reusable animation framework.

The system should support replacing the dog later with:
* Cat.
* Rabbit.
* Fox.
* Dragon.
* Bird.

Without rewriting the animation engine.

---

## Definition of Success

The redesign is complete only when:
* The silhouette instantly reads as a dog.
* Walking feels natural.
* Stretching resembles a real puppy.
* Sleeping feels believable.
* Eye tracking is smooth and immediate.
* The companion never feels frozen.
* The desktop feels shared with a living character rather than displaying an animated sticker.
