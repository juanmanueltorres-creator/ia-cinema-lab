# Actor mouth anatomy prototype

## Objective
Create an opt-in, separate MPFB actor GLB with a dark oral cavity, jaw-attached simplified upper/lower teeth and a stable tongue if feasible, while preserving `assets/mpfb-actor.glb`, all current expression tracking/calibration and recorder behavior.

## Problem and why
The current actor opens its jaw morph, but the posterior skin surface is visible through the mouth and there are no teeth or tongue. Improve the visual anatomy for this prototype without changing the source actor, retargeting incompatible morphs, or claiming speech/viseme quality.

## Scope
- Add a non-overwriting Blender generation path for a new mouth-equipped GLB based on the existing MPFB build process; default expression weights must be neutral.
- Add one explicit avatar selector option, leaving all existing models and tracking/recording untouched.
- Add automated GLB structure/morph/default-weight regression checks and documentation of authored geometry, provenance, limits and rebuild steps.
- Capture and inspect before/after browser images for jaw 0/25/50/100%, smile, blink+jaw, rotated head+jaw and restored neutral. Do not activate a real camera or microphone.

## Constraints
- Keep `assets/mpfb-actor.glb` byte-identical (baseline SHA-256 `b4a8118ab57f6e32a783e473e5e12767a5650b99b45b62d350196f7d996a6b9d`).
- Do not modify MediaPipe, mapping, blink calibration or recording paths. No paid APIs, new global dependencies, or uncertain-license assets.
- Build only a distinct opt-in GLB; scripts refuse overwrite. Respect mouth/skin occlusion and attached lower dentition rather than placing fake teeth over the face.
- Work-unit route: delegated writer (multi-file asset/generator/test/docs/config behavior). TDD on; runner `node --test experiments/privacy-puppet-webcam/*.test.mjs` plus Blender headless generation/regression. Delivery strategy `ask-on-risk`; forecast below 400 authored changed lines excluding generated GLB. No chain decision needed unless actual authored count crosses the advisory threshold.

## Acceptance criteria
- Separate generated GLB has a dark cavity behind the lips, anatomically placed upper dentition fixed to head and lower dentition moving with jaw; tongue moves plausibly if stable, otherwise omission is explicit.
- Jaw morph at neutral/0.25/0.5/1 has useful visible separation, maintains lip channels and smile/blink coexistence, and returns to neutral.
- Original actor hash and all existing models remain unchanged; test default morph weights are zero.
- Rebuild refuses to overwrite any existing output and is reproducible from pinned/CC0 sources or original procedural geometry.
- Browser screenshots show requested synthetic morph states; these are geometry-only evidence, not webcam or recording acceptance.

## Checks
- RED/GREEN regression test for new GLB target, materials/teeth, attachment, defaults, and non-overwrite behavior.
- Blender 5.2 headless export and structural inspection at jaw values 0, .25, .5, 1.
- `node --check experiments/privacy-puppet-webcam/app.js`
- `node --check experiments/privacy-puppet-webcam/face-map.mjs`
- `node --test experiments/privacy-puppet-webcam/*.test.mjs`
- Browser geometry QA and screenshot inspection; no live devices.
- `git diff --check`; parent spot-checks one reported command before delivery.

## Tasks
- [x] MOUTH-01 — Baseline and author the new mouth-equipped actor asset with an explicit opt-in generator; preserve source GLB hash.
- [x] MOUTH-02 — Prove GLB anatomy, attachment, neutral defaults, morph coexistence and overwrite safety with failing-first automated tests.
- [ ] MOUTH-03 — Wire the separate actor selector entry, rebuild/provenance documentation, synthetic browser captures, verification and one Conventional Commit.

## Progress
- Baseline `e1ff242877ed5fa2d4723a03ac05d5dd15d5e7e0`; branch `experiment/issue4-rescate`. `.atl/` is pre-existing untracked and must be preserved.
- Existing suite baseline: 10/10 tests pass. Existing actor SHA-256 matches the preserved value.
- Existing Blender inspection found default morph weights are all 1 in the exported original, but the viewer resets owned channels per frame; new export must explicitly initialize targets at zero.
- Engram mirror unavailable: `mem_review(list)` returned `unknown_project` for `ia-cinema-lab`; local progress remains authoritative and mirror pending.
- RED/GREEN: missing GLB test failed as expected; generated asset structure/default/attachment tests pass. A second RED test caught export of the source Icosphere helper; the builder now removes it only from the new artifact, making framing consistent.
- Browser geometry QA uses Chromium and the actual old/new GLBs with synthetic jaw 0/25/50/100, smile, blink+jaw, rotated head+jaw, and neutral restore. No webcam/mic was activated. `docs/evidence/issue-4-mouth/` contains captures; actual app option was also exercised with camera off.
- Blender overwrite guard manually verified exit 1 with output hash unchanged.
- Original actor SHA-256 remains `b4a8118ab57f6e32a783e473e5e12767a5650b99b45b62d350196f7d996a6b9d`

## Next step
Run full checks, inspect the final captures, update verification evidence, and close MOUTH-03 with one Conventional Commit.

## Relevant files
- `experiments/privacy-puppet-webcam/tools/build-complete-actor.py` — original non-overwriting MPFB body and shape-key generator; preserve behavior/output.
- `experiments/privacy-puppet-webcam/app.js` — actor selector/config and morph rendering.
- `experiments/privacy-puppet-webcam/actor.test.mjs` — existing actor GLB structure tests.
- `experiments/privacy-puppet-webcam/assets/README.md` — asset licensing and rebuild instructions.
