# Issue 4 - complete experimental actor

## Objective
Deliver a separate, clothed MPFB human with independent real eyelids, jaw motion, head tracking and local recording. Preserve Liam and all Issue 3 work on experiment/issue4-rescate; no push, merge or main edits.

## Evidence and route
Liam has 11234 body vertices versus MPFB 19158; source files are unavailable and indexed transfer is unsafe. Generate a clearly labeled new actor, not an exact Liam reconstruction. Route: delegated writer, multiple non-trivial files and Blender/browser preparation.

## Execution
Baseline e4b418f (rescue continuation). TDD enabled by mandatory skill, no repository-specific configuration; runner node --test experiments/privacy-puppet-webcam/face-map.test.mjs experiments/privacy-puppet-webcam/actor.test.mjs. RDD on (default), parent owns native assessment. Delivery ask-on-risk; forecast 300-380 authored lines, generated assets excluded. Engram mirror pending until recognition succeeds.

## Tasks
- [x] T1: Generate reproducible clothed MPFB actor with official licensed eyes, jaw, rig and faceunits01 eyelids; validate geometry and overwrite guard.
- [x] T2: Add separate selector option and correct actor framing, preserve existing avatars and capture/recording.
- [x] T3: Verify each eye, both eyes, mouth, neutral restoration and ten-second local recording; document synthetic versus real-camera evidence.

## Acceptance and checks
Head/neck/torso/clothes, stable eyes/materials, no arbitrary target transfer. Existing avatars unchanged. node --check app.js; node --check face-map.mjs; node --test face-map.test.mjs (paths under experiments/privacy-puppet-webcam), Blender validation and browser image inspection. Real webcam acceptance remains pending unless actually observed.

## Progress and next step
Inventory read and prior commits verified. Rescue audit: existing generator has no brow channels, paints every eye polygon white and needs material-region validation; actor asset absent. Parent readback completed. Generated and inspected the actor, real-camera acceptance remains separate. Rollback scope: only new actor asset/generator, minimal selector/framing and this issue's docs/evidence.

## Rescue verification (2026-11-16)
- T1-T3: new actor 2,751,208 bytes, SHA256 b4a8118ab57f6e32a783e473e5e12767a5650b99b45b62d350196f7d996a6b9d. Ten real facial channels and default skin skeleton; not Liam. Source CC0 links and reproducible commands in assets/README.md.
- RED: 9 passed / 1 failed because actor missing. GREEN: 10/10; node syntax checks and diff whitespace check passed. Nonzero morph assertions account for material-split primitives (a blink correctly does not move lip-only primitives).
- Browser: actual rendered open/left/right/both/mouth/brows/head/restored screenshots inspected, eyes use anatomical MHCLO geometry and corrected standalone UVs. No production capture/calibration logic changed.
- Existing recorder/download and playback verified with synthetic coefficients/silent canvas stream: 10.009 seconds, 823x584, 54 decoded frames at 2.21s. This does not prove webcam inference or microphone synchronization. Headless render reached100FPS without tracking; no lag benchmark claimed. Evidence docs/evidence/issue-4/.
- Generator overwrite guard refused existing asset (expected exit1), hash unchanged. MPFB emits missing original eye material warning (explicit script material replaces it), Blender truncates >4 weights with normalization.
- [ ] T4: User acceptance of new actor with real webcam/calibration, speech/microphone synchronization and browser performance; production art refinement. No teeth/tongue/hair-textured brows; simple shell garment and flat skin are explicit prototype limitations.
- Work-unit commit pending. Engram mirror pending unknown_project. No push/merge/main changes; originals and pre-existing .atl untouched.