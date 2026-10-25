# Cubie

An interactive Three.js Rubik’s Cube playground and learning companion.

## Run

```sh
npm install
npm run dev
```

Open the Vite URL. `npm test` runs the model and practice checks; `npm run build` produces the static `dist/` site.

## Included

- A dark, mobile-first interface with three tabs: Learn, Practice, and Solve. Secondary settings stay inside expandable controls.
- Rounded cubies, physical sticker materials, environment lighting, orbit/zoom, and animated layer turns. Turns retain the same cubie objects and stickers throughout the animation; exact grid/quaternion snapping prevents drift.
- Learn has four freely selectable topics: pieces, six sides, looking versus turning, and notation. Each of the 17 steps uses one shared lesson surface: an automatic 3D demonstration, an unassisted attempt, and checked feedback. Tours visit all six faces/centers, frame whole faces and isolate the stickers belonging to an edge or corner, distinguish camera motion from layer turns, and show face-relative direction arrows (including two separate quarter turns for F2). Play/Pause freezes and resumes camera motion, turns, and scene holds at the same point; Replay is a separate button. Jump to a scene or start the exercise immediately; dragging stops the demonstration at its current scene. Six-side demonstrations have two scenes and highlight the whole face, without a center-only scene. Hints and longer explanations are optional. Piece checks require the correct type and face; view checks require the requested face to point toward you; turns must match the move, with incorrect attempts resetting the cube. Tapping highlights the selected piece’s one, two, or three stickers; no selection box is drawn. A keyboard-accessible flat view remains available within the lesson. Learning restores your Practice/Solve cube when you leave. Completed learning steps save immediately to local storage and resume at the first unfinished step after reload. Reviewing a completed topic resets that topic’s saved progress. Invalid saved counts are ignored; blocked storage shows a save-failure message. Actual learning time and effectiveness need learner testing.
- In Solve, swipe a cube face to turn a layer; drag the background to orbit. Touch and mouse are supported. Face buttons cover clockwise, counterclockwise, and half turns. Keyboard: U R F D L B; Shift reverses; S scrambles; Space plays/pauses in Solve or starts/stops Practice when a button is not focused.
- Practice demonstrates random quarter turns, primes, and optional half turns for you to copy on a physical cube. Move notation sits directly above the animated cube, without the explanatory sentence. The default view faces green straight on with white visible above. Turn animation has independent Quick (0.9 seconds), Steady (1.5 seconds, default), and Slow (2.4 seconds) settings. Start runs continuously until Stop, with adjustable minimum intervals of 10, 6, 3, or 1.5 seconds per move. Every animation finishes with a short pause before another move begins. Replay move repeats the last demonstration from its original starting state, without adding another turn. It works while stopped or running; during a drill it resets the interval before the next random move. Virtual turn controls and scoring are hidden. Leaving the tab or opening Help stops the drill; a turn already in progress finishes.
- Seven prepared beginner demonstrations. Later lessons put yellow facing up and white facing down. Each example preserves the relevant work from earlier stages and ends solved; examples are independent, not one continuous course through an arbitrary scramble.
- A complete two-phase solver in a Web Worker. Guided and notation views use the same solver. Playback can pause, step backward/forward, restart, finish, or change speed. Core moves, notation prompts, and lesson instructions use 46 bundled Samantha female voice recordings. The Voice switch mutes narration. Unrecorded text or audio failures fall back to a named female English browser voice where available. Move letters use phonetic speech input to avoid announcements such as “capital R.” Practice starts narration and animation together; narration never delays the selected pace.
- Six-face camera capture, median sticker-color sampling, a manual color editor, and validation of color counts, cubie identity, orientation, and permutation parity before solving. Camera frames remain in the browser. Camera access requires HTTPS or localhost.

## Current limits

- The arbitrary-scramble solution uses Cube.js’s Kociemba two-phase algorithm. It is **not** a full layer-by-layer, CFOP, or Roux teaching solver. The beginner lessons are prepared concept demonstrations.
- Practice builds muscle memory on your own cube without scoring. There is no continuous camera tracking or verification of turns on a physical cube.
- Camera detection assumes a standard color scheme and good, even lighting. Check and correct all six faces. Real camera accuracy, touch ergonomics, audio, and performance still need real-device testing.
- Cube state is session-only; learning progress persists in local storage in this browser. Reloading starts a fresh practice cube. Browsers may require a tap before audio can play. The bundled core voice is consistent across devices; fallback voice availability depends on installed voices.
- The canvas needs WebGL. In Learn, dragging on the cube or background changes the view during identification checks; turn lessons use the same face swipes as Solve. Buttons and keyboard provide alternatives to drag gestures; reduced-motion settings default to still teaching views and immediate layer updates. The saved Animation toggle overrides this for learning. Animated tours smoothly rotate both camera direction and up orientation; top and bottom faces settle as squares. Replay and exercise transitions preserve the camera view and rewind demonstrated turns instead of snapping to a new cube. Demonstrations pause when the page is hidden or Help opens.

## Validation

`npm test` checks learning targets, piece classification, all six face-selection answers, Up/Down naming, all 18 geometric turns against the model, scramble reversal, all seven lesson examples and their prior-stage invariants, impossible scans (including flipped edges, twisted corners, and parity), generated solutions, color classification, endless prompts, and half-turn answer checking in Learn (including rejecting a reversed first quarter turn or an extra half turn). Every step is checked for a visual sequence and a concise task; demonstrated turn sequences must match the requested move.

Three.js scene tests check every sticker’s actual world position and normal for all 18 moves, continuity at intermediate frames, overlap locking, and 200 consecutive turns without drift. Teaching checks cover highlight counts, complete multi-sticker pieces, face-relative arrows, safe camera orbits to all six faces, reduced-motion camera updates, pause/resume continuity for cameras and turns, and finishing a turn before reset. Saved-progress checks reject corrupt JSON and invalid counts. Voice checks cover recorded assets, female voice fallback, mute, and cancellation.

Physical camera capture, touch feel, safe areas, and audio output still need real-device testing.

Cube.js 1.3.2’s two runtime files are vendored under `src/vendor/cubejs/` with their MIT license. This avoids the upstream package’s unnecessary legacy npm runtime dependency. Three.js, Lucide, and Vite remain ordinary dependencies.

## Regenerating voice clips

On macOS, run `node scripts/record-voice.mjs` with the Samantha voice installed and FFmpeg on PATH. It generates recordings locally without a microphone or network service. Regenerate after changing narrated lesson descriptions or move instructions.
