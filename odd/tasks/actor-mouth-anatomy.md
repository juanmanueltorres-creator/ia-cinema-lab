# Actor mouth anatomy prototype

## Objective
Create an opt-in, separate MPFB actor GLB with a dark oral cavity, simplified upper/lower teeth and a stable tongue, while preserving `assets/mpfb-actor.glb`, expression tracking/calibration and recorder behavior.

## Problem and why
The original actor's jaw morph exposes the posterior skin surface and has no teeth or tongue. Improve prototype mouth anatomy without changing the source actor, retargeting incompatible morphs, or claiming speech/viseme quality.

## Scope
- Add a non-overwriting Blender generation path for a new mouth-equipped GLB; initialize all morph weights at neutral.
- Add one explicit avatar selector option, leaving existing models and tracking/recording untouched.
- Add automated GLB structure/morph/default-weight regression checks and document authored geometry, provenance, limitations and rebuild steps.
- Capture before/after browser images for jaw 0/25/50/100%, smile, blink+jaw, rotated head+jaw and neutral restore. Do not activate a real camera or microphone.

## Constraints
- Keep `assets/mpfb-actor.glb` byte-identical (baseline SHA-256 `b4a8118ab57f6e32a783e473e5e12767a5650b99b45b62d350196f7d996a6b9d`).
- Do not modify MediaPipe, mapping, blink calibration or recording paths. No paid APIs, new global dependencies or uncertain-license assets.
- Build only a distinct opt-in GLB; the generator refuses overwrite. Place lower dentition inside the mouth and attach it to jaw motion.
- Route: delegated writer (multi-file asset/generator/test/docs/config behavior). TDD on; runner `node --test experiments/privacy-puppet-webcam/*.test.mjs` plus Blender headless export. Delivery strategy `ask-on-risk`; estimated authored change count was under 400 lines, generated binaries/screenshots excluded.

## Acceptance criteria
- Separate generated GLB has a dark cavity behind the lips, upper dentition fixed to head, lower dentition and tongue moving on `jawOpen`.
- Jaw morph at neutral/0.25/0.5/1 is visibly distinct; smile/blink coexist and neutral can be restored.
- Original actor and other models remain unchanged; new export starts with all morph weights zero.
- Rebuild is deterministic and refuses to overwrite an existing output.
- Browser screenshots show synthetic morph states only; these are not webcam or recording acceptance.

## Checks
- RED/GREEN tests for new GLB structure, material presence, attachment, preserved expression channels, source hash and neutral weights.
- Blender 5.2 headless export and jaw geometry inspection at 0, .25, .5 and 1.
- Manually invoke the generator with an existing output and verify exit 1 plus unchanged output hash.
- `node --check experiments/privacy-puppet-webcam/app.js`
- `node --check experiments/privacy-puppet-webcam/face-map.mjs`
- `node --test experiments/privacy-puppet-webcam/*.test.mjs`
- Browser geometry QA and screenshot inspection; no live devices.
- `git diff --check`; parent spot-check one reported command.

## Tasks
- [x] MOUTH-01 — Baseline and generate the new mouth actor through an explicit opt-in script; preserve source GLB hash.
- [x] MOUTH-02 — Prove GLB anatomy, attachment, neutral defaults, morph coexistence and overwrite safety.
- [x] MOUTH-03 — Wire the selector entry, rebuild/provenance documentation, browser captures, verification and one Conventional Commit.

## Progress
- Baseline `e1ff242877ed5fa2d4723a03ac05d5dd15d5e7e0`; branch `experiment/issue4-rescate`. Pre-existing untracked `.atl/` was preserved.
- Existing suite baseline: 10/10. New full suite: 12/12.
- New output SHA-256: `eec96f6c69070db0c35ad78e2f8ba178f030e791172005499964e3ba6d679dd1` (2,849,196 bytes). Second Blender build was byte-identical.
- Original asset SHA-256 remains `b4a8118ab57f6e32a783e473e5e12767a5650b99b45b62d350196f7d996a6b9d`.
- Blender source inspection found an oversized helper sphere in the input GLB that distorted fit if re-exported. The new generator omits it only in the new artifact.
- Browser Chromium captured old/new geometry for jaw 0/25/50/100, smile, blink+jaw, rotated head+jaw and neutral. App selection and jaw test were also run with camera off; no camera or microphone was accessed.
- Blender overwrite guard manually returned exit 1 with output hash unchanged.
- Work-unit commit: `309270cad69a27031b3c343089a6572b33db3e82` (`feat(experiment): add opt-in mouth anatomy actor`).
- Engram mirror pending: `mem_review(list)` returned `unknown_project` for `ia-cinema-lab`; no retries were made.

## Next step
No further implementation is authorized here. Real-camera/microphone acceptance remains intentionally untested; do not activate devices without later user approval.

## Relevant files
- `experiments/privacy-puppet-webcam/tools/build-actor-mouth.py` — new non-overwriting procedural mouth builder.
- `experiments/privacy-puppet-webcam/assets/mpfb-actor-mouth.glb` — separate actor asset.
- `experiments/privacy-puppet-webcam/actor-mouth.test.mjs` — actor anatomy and source-preservation tests.
- `experiments/privacy-puppet-webcam/app.js` and `index.html` — minimal opt-in selector wiring.
- `experiments/privacy-puppet-webcam/assets/README.md` — provenance and rebuild instructions.
- `docs/evidence/issue-4-mouth/` — before/after Chromium captures and geometry QA harness.
