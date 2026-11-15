# Issue 3 - real eyelid blink

## Objective and scope
Deliver real blink input/output without replacing Liam, Kofi or Yuki, damaging mouth motion, recording, or local-only camera processing. Work only on `experiment/privacy-puppet-webcam`; no push or merge.

## Evidence and constraints
The pinned character GLBs contain demographic targets only. FaceCap has nonzero `eyeBlink_L/R`; current exact-name matching misses them. Never overwrite source GLBs or claim skeletal names alone prove eyelid closure. No paid services or face uploads.

## Execution
- Baseline: `51a2fee9e6026bcc22f5cea2ce4b217e3eca1953`.
- Route: delegated writer; mapping/preparation needs 4+ files and multiple non-trivial edits.
- TDD: enabled by mandatory test-driven-development skill; no repository-specific mode found. Runner: `node --test experiments/privacy-puppet-webcam/face-map.test.mjs`.
- RDD: on (default); parent owns native assessment/review after each work unit.
- Delivery: ask-on-risk; forecast 250-380 authored lines for viewer fix and evidence. Asset generation is a separate bounded task if viable. No PR created.
- Engram mirror: pending (project recognition failed in parent session).

## Tasks
- [x] T1: Correct expression alias resolution, neutral reset, diagnostics and independent manual blink. Verify Node checks/tests and browser neutral/left/right/both/neutral states; keep capture/recorder unchanged.
- [x] T2: Inspect Blender 5.2 + MPFB2 2.0.18 and faceunits01; prove whether originals can gain real blink without appearance loss. Export only a separate test asset when supported and licensed; otherwise document exact blocker.
- [x] T3: Record reproducible commands/evidence/limitations.
- [ ] T4: User acceptance with real webcam, speech and recording playback, plus preserved-character source recovery. Original character eyelids remain unresolved.

## Required checks
`node --check experiments/privacy-puppet-webcam/app.js`; `node --check experiments/privacy-puppet-webcam/face-map.mjs`; `node --test experiments/privacy-puppet-webcam/face-map.test.mjs`.

## Progress and next step
Blender CLI 5.2.2 LTS and MPFB2 2.0.18 verified. Live Blender MCP disconnected. faceunits01 is not installed globally; two official CC0 targets downloaded to temporary storage and used through MPFB TargetService. Separate 340,040-byte clay head generated, never a replacement for the actors. Imported Liam has 11,234 body vertices versus MPFB 19,158: direct index transfer is unsafe; original authoring sources absent upstream.

Viewer checks: alias/reset regression tests observed RED (5 pass, 2 fail) then GREEN (7 pass). Exact CI commands pass with escalation; sandbox alone blocks node test subprocess with EPERM. Node --check app.js / face-map.mjs pass. FaceCap initially failed to load because Meshopt/KTX2 decoders were absent; lazy pinned decoders fix loading.

Runtime: Chromium headless, neutral/both/left/right/reopened states visually inspected for FaceCap and generated MPFB fixture; Liam manual jaw and unchanged appearance observed. Public CDN DNS failed in browser, so identical public dependency bytes were routed from temporary downloads. Only favicon404 remained. Screenshots in docs/evidence/issue-3 contain avatars only, no webcam. Reported render FPS is not a MediaPipe performance measurement.

Next: native RDD assessment by parent, then real-camera acceptance and recovery of source MPFB characters. No camera/microphone enabled, no recording playback observed. Work-unit evidence: `5e4001dcc8b8ad39e8f3dcce0873ba632bcd899d` (T1-T3, 280 authored changed lines including this task document). Native RDD assessment pending parent; this is not an approval receipt. Blender overwrite-guard smoke check returned expected exit 1, preserving the shipped asset.

## Rollback
Viewer unit can be reverted independently of original models: app.js, face-map.mjs, tests, index.html and README additions. No original model edits.
