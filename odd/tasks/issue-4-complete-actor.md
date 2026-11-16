# Issue 4 - complete experimental actor

## Objective
Deliver a separate, clothed MPFB human with independent real eyelids, jaw motion, head tracking and local recording. Preserve Liam and all Issue 3 work on experiment/privacy-puppet-webcam; no push, merge or main edits.

## Evidence and route
Liam has 11234 body vertices versus MPFB 19158; source files are unavailable and indexed transfer is unsafe. Generate a clearly labeled new actor, not an exact Liam reconstruction. Route: delegated writer, multiple non-trivial files and Blender/browser preparation.

## Execution
Baseline ff09de0cf6d6205cc080c27c6fddf4aad7f5a9ff. TDD enabled by mandatory skill, no repository-specific configuration; runner node --test experiments/privacy-puppet-webcam/face-map.test.mjs. RDD on (default), parent owns native assessment. Delivery ask-on-risk; forecast 300-380 authored lines, generated assets excluded. Engram mirror pending until recognition succeeds.

## Tasks
- [ ] T1: Generate reproducible clothed MPFB actor with official licensed eyes, jaw, rig and faceunits01 eyelids; validate geometry and overwrite guard.
- [ ] T2: Add separate selector option and correct actor framing, preserve existing avatars and capture/recording.
- [ ] T3: Verify each eye, both eyes, mouth, neutral restoration and ten-second local recording; document synthetic versus real-camera evidence.

## Acceptance and checks
Head/neck/torso/clothes, stable eyes/materials, no arbitrary target transfer. Existing avatars unchanged. node --check app.js; node --check face-map.mjs; node --test face-map.test.mjs (paths under experiments/privacy-puppet-webcam), Blender validation and browser image inspection. Real webcam acceptance remains pending unless actually observed.

## Progress and next step
Inventory read and prior commits verified. Await parent readback before source edits. Rollback scope: only new actor asset/generator, minimal selector/framing and this issue's docs/evidence.
