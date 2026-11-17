# Actor rest and brows V3

## Objective
Deliver an opt-in V3 MPFB actor with a visually closed neutral mouth and natural brown brows, plus a V3-only jaw response profile that suppresses small resting noise without altering legacy actors or raw MediaPipe diagnostics.

## Problem and rationale
The V2 jaw morph receives raw `jawOpen` directly, while the 0.12 deadzone only serves bone-driven jaws. V2 has no `jaw` bone (it is named `mandible_reference`), so there is no double jaw deformation. `mouthClose` and `mouthPucker` targets are absent. Live closed-mouth scores have not been measured.

Initial centerline inspection did not prove a lip gap. A broader Blender ray grid found a narrow neutral aperture at x +/-3-10.5 mm and z 1.3266-1.327 m, exposing posterior material. V3 corrects that seam with a lower-lip lift of at most 1.2 mm; its full-open endpoint remains unchanged. Resting-score filtering is a separate, avatar-specific calibration guard, not evidence of a particular user's camera values.

## Scope
- Add a deterministic, non-overwriting `--version v3` export at `assets/mpfb-actor-mouth-v3.glb`; preserve the base, V1, and V2 GLBs and generation behavior byte-for-byte.
- Add a V3-only bounded jaw response with configurable deadzone/full-reach, monotonic mapping, time-based asymmetric attack/release, and reset on face loss. Diagnostics continue to show unfiltered raw sensor scores.
- Add realistic, tapered brown eyebrow pigment to the same skinned actor surface, retain all ten existing morph targets, and keep V1/V2 and other avatar profiles unchanged.
- Add deterministic asset and pure-function tests, visual evidence from synthetic poses, and documentation describing limits. Do not request webcam/microphone permissions or claim real-device validation.

## Constraints
- User authorization is limited to this V3 actor/mouth behavior; no changes to camera permission, tracking, blink formula/controls, recording, export, dependencies, or other avatars.
- No external model/texture assets; procedural material/vertex pigment only.
- User-owned review mode is on by default; parent handles native review risk/consent after each work-unit commit. Do not start review or alter the switch.
- Delivery strategy: ask-on-risk; no push, PR, merge, or main changes.
- TDD: enabled; runner `node --test experiments/privacy-puppet-webcam/*.test.mjs`. Source edits follow an observed RED → GREEN → REFACTOR sequence.

## Acceptance criteria
- Existing actor hashes remain: base `b4a8118ab57f6e32a783e473e5e12767a5650b99b45b62d350196f7d996a6b9d`, V1 `618873198684da0b8570b0036e84d92bee9d8c10500e4e2c6da60b3a539c4f67`, V2 `60716d83e6430cb6098c952e54193e928f5ed0f0e5283232a7e6a93d99f9f59f`.
- V3 exports separately and reproducibly, refuses overwrite, preserves all ten morphs, places visible brown brows on deforming skin, and starts with all morph weights zero. V3 neutral pose shows lip contact with no visible teeth or tongue; do not invent geometry changes absent evidence of a true gap.
- The V3 jaw profile is monotonic and bounded, filters small resting values, reaches its configured full value, has time-based attack/release and resets immediately on face loss. The profile applies only to V3 jawOpen; diagnostics remain raw and generic morph behavior remains unchanged for every legacy avatar.
- Automated tests prove V1/V2/base unchanged, V3 selection/config scoping, no generic jaw-expression bypass/double-smoothing, and filter behavior across synthetic rest noise, speech onset/release, and face loss.
- Visual/manual QA reports only what was observed: jaw 0/25/50/100, smile, blink, brow morphs, head turn, neutral before/after; no real webcam, microphone, tracking/FPS, or audio-recording claims.
- `node --test experiments/privacy-puppet-webcam/*.test.mjs`, JS syntax checks, Python syntax checks, reproducibility/no-overwrite checks, and browser visual QA results are recorded honestly.

## Tasks
- [x] T1 (delegated direct; multi-file procedural asset and tests): add reproducible opt-in V3 asset generation with natural brows and neutral-mouth evidence; preserve existing assets.
- [x] T2 (delegated direct; app integration and tests): add an isolated V3-only jaw profile/controls and pure tests for calibration, smoothing, reset, raw diagnostics, and legacy behavior.
- [x] T3 (delegated direct; docs and evidence): validate V3 synthetic poses and app profile integration, update asset/experiment documentation, record screenshots and verification limitations.

## Progress and evidence
- Baseline `node --test experiments/privacy-puppet-webcam/*.test.mjs`: PASS, 16/16 on HEAD `8917702` before task work.
- Effective TDD mode: enabled (parent-provided project instruction); exact runner above.
- Task routing: delegated direct single writer, because implementation spans the procedural generator, app integration, tests, docs, and visual evidence. No SDD selected.
- Forecast: three coherent work units, each targeted below ~400 authored changed lines where naturally possible; this is an advisory planning heuristic, not a hard cap.
- T1 commit: `8e3608c`; T2 commit: `3ccbec0`. Parent-owned native risk assessment remains pending.
- Next step: parent verification, then user real-camera acceptance.

## Relevant files
- `experiments/privacy-puppet-webcam/tools/build-actor-mouth.py` — procedural V1/V2 mouth GLB generator.
- `experiments/privacy-puppet-webcam/tools/build-complete-actor.py` — original MPFB actor and ten morph targets.
- `experiments/privacy-puppet-webcam/face-map.mjs` / `face-map.test.mjs` — face coefficient mapping and expression application.
- `experiments/privacy-puppet-webcam/app.js`, `index.html`, `style.css` — actor selection, controls, rendering, and diagnostics.
- `experiments/privacy-puppet-webcam/actor-mouth.test.mjs` — GLB structural/regression tests.



## T1 verified outcome
- New GLB: 3,127,924 bytes, SHA-256 `f7c2f3c4cbf6f07600d4344f0cb87f5764ad07ad85e508c9ef2b589e4edb54e0`.
- RED: missing V3 asset; later exported-ray test failed on the real neutral aperture (front depth 0.053 m instead of lip depth >0.14 m). GREEN: both asset tests pass after bounded lower-lip correction.
- Brow pigment is an original 512x128 embedded procedural UV texture on original skinned triangles; all five brow targets deform those vertices. No cards or detached brow object.
- Blender 5.2.2 reproduced V3 byte-for-byte; V2 regeneration still matches its preserved hash. Existing-output attempt refused with exit 1; hashes unchanged.
- Browser neutral/up/down/blink+rotated images inspected; no detached brows or visible teeth at rest. Synthetic geometry only.
- Rollback boundary: opt-in V3 generator branch, asset and asset regression tests. Earlier models remain unchanged.

## T2 verified outcome
- Pure-function tests failed RED before the isolated profile existed, then passed. V3 defaults: deadzone 12%, full at 80%, attack 35 ms, release 65 ms; both thresholds are adjustable only on V3. These are defaults, not measured camera calibration.
- Frame-independent tests at 30/60/120 FPS, five seconds of synthetic rest noise, varying speech envelope, reset on face loss, unchanged legacy smoothing/blink, and raw-state immutability pass.
- Actual viewer (test-only pose injection, no devices): rest input 4-10% for five seconds yielded jaw 0; 80% input yielded 0.9994 after 250 ms; close/loss returned 0. V2 still rendered raw 10% as 0.10, with V3 controls hidden. Raw meter stayed raw (7% while V3 morph was zero).
- Rollback boundary: `jaw-profile.mjs`, its tests and the V3-only app/HTML wiring; capture, MediaPipe, blink calibration, face-map and recorder source remain unchanged.

## T3 verified outcome
- All 20 Node tests pass; app/face-map/jaw-profile syntax and Python compile pass; whitespace checks pass. Earlier camera, blink, head and recorder paths are unchanged.
- Evidence in `docs/evidence/issue-4-v3/`: matched V2/V3 neutral, jaw 25/50/100, brow raise/frown, smile, blink+brows+head rotation, and actual viewer synthetic rest/open. Pictures inspected, with no detached brows or visible oral parts at neutral.
- Browser QA used cached identical public dependencies because CDN availability is not the subject of this check. Only the existing favicon 404 remained; no failed requests. Synthetic pose injection was test-only and is not shipped in the viewer.
- Camera/microphone were never accessed. Natural speech, live closed-mouth scores, recording/audio synchronization and performance with tracking remain for user approval; no new recording proof is claimed.
- Delivery: existing gradual chained integration policy retained. No push/merge/main changes, no `.atl/` or temporary files included.
