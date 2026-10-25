# Cubie

An interactive Three.js Rubik’s Cube playground and learning companion.

## Run

```sh
npm install
npm run dev
```

Open the Vite URL. `npm test` runs the model and practice checks; `npm run build` produces the static `dist/` site.

## Included

- A dark, mobile-first interface with three modes: Play, Practice, and Solve. Secondary settings stay inside expandable controls.
- Rounded cubies, physical sticker materials, environment lighting, orbit/zoom, and animated layer turns. Turns retain the same cubie objects and stickers throughout the animation; exact grid/quaternion snapping prevents drift.
- Swipe a cube face to turn a layer; drag the background to orbit. Touch and mouse are supported. Face buttons cover clockwise, counterclockwise, and half turns. Keyboard: U R F D L B; Shift reverses; S scrambles; Space plays/pauses when a button is not focused.
- Endless movement drills: quarter turns, primes, optional half turns, face/direction hints, female spoken prompts, five pacing choices, correct-turn feedback and session streaks. Two matching quarter turns count as a half turn.
- Seven prepared beginner demonstrations. Later lessons put yellow on top and white underneath. Each example preserves the relevant work from earlier stages and ends solved; examples are independent, not one continuous course through an arbitrary scramble.
- A complete two-phase solver in a Web Worker. Guided and notation views use the same solver. Playback can pause, step backward/forward, restart, finish, or change speed. Core moves, notation prompts, and lesson instructions use 46 bundled Samantha female voice recordings. The Voice switch mutes narration. Unrecorded text or audio failures fall back to a named female English browser voice where available. Timed drills begin counting after the spoken prompt finishes.
- Six-face camera capture, median sticker-color sampling, a manual color editor, and validation of color counts, cubie identity, orientation, and permutation parity before solving. Camera frames remain in the browser. Camera access requires HTTPS or localhost.

## Current limits

- The arbitrary-scramble solution uses Cube.js’s Kociemba two-phase algorithm. It is **not** a full layer-by-layer, CFOP, or Roux teaching solver. The beginner lessons are prepared concept demonstrations.
- Movement drills check turns on the **virtual** cube. There is no continuous camera tracking or verification of turns on a physical cube.
- Camera detection assumes a standard color scheme and good, even lighting. Check and correct all six faces. Real camera accuracy, touch ergonomics, audio, and performance still need real-device testing.
- Progress and cube state are session-only. Reloading starts a fresh practice cube. Browsers may require a tap before audio can play. The bundled core voice is consistent across devices; fallback voice availability depends on installed voices.
- The canvas needs WebGL. Buttons and keyboard provide alternatives to drag gestures; reduced-motion settings shorten turn animations to 160 ms.

## Validation

`npm test` checks all 18 geometric turns against the model, scramble reversal, all seven lesson examples and their prior-stage invariants, impossible scans (including flipped edges, twisted corners, and parity), generated solutions, color classification, endless prompts, and half-turn scoring.

Three.js scene tests check every sticker’s actual world position and normal for all 18 moves, continuity at intermediate frames, overlap locking, and 200 consecutive turns without drift. Voice checks cover recorded assets, female voice fallback, mute, and cancellation.

Physical camera capture, touch feel, safe areas, and audio output still need real-device testing.

Cube.js 1.3.2’s two runtime files are vendored under `src/vendor/cubejs/` with their MIT license. This avoids the upstream package’s unnecessary legacy npm runtime dependency. Three.js, Lucide, and Vite remain ordinary dependencies.

## Regenerating voice clips

On macOS, run `node scripts/record-voice.mjs` with the Samantha voice installed and FFmpeg on PATH. It generates recordings locally without a microphone or network service. Regenerate after changing narrated lesson descriptions or move instructions.
