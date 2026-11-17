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
- Route: delegated writer (multi-file asset/generator/test/docs/config behavior). TDD on; runner `node --test experiments/privacy-puppet-webcam/*.test.mjs` plus Blender headless export. Local packaging branch `experiment/issue4-mouth` is based on `experiment/issue4-rescate` at `a0808f440daa39f37678887fb4bf2a883320d5cd`. The user-selected integration chain targets that experimental branch, not `main`: slice 1 is the corrected mouth generator, GLB, and anatomical regression; slice 2 is the refreshed integration documentation and evidence. No remote operation is authorized here.

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
- [x] MOUTH-02 — Extend the geometry regression to reject tooth collisions at jaw 0, .25, .5 and 1.
- [x] MOUTH-03 — Correct dental proportions, regenerate the asset, refresh evidence/docs and commit the bounded fix.

## Progress
- Parent review identified real intersections: adjacent tooth X extents overlap, and upper/lower vertical ranges overlap by about 6 mm at neutral. This invalidates the original geometry acceptance and requires one bounded correction.
- RED/GREEN: geometry test failed on the old upper arch overlap at jaw 0; adjusted tooth width and inter-arch spacing. GLB geometry assertions now pass for both arches at jaw 0/.25/.5/1; the lower arch moves down monotonically.
- Baseline `e1ff242877ed5fa2d4723a03ac05d5dd15d5e7e0`; branch `experiment/issue4-rescate`. Pre-existing untracked `.atl/` was preserved.
- Existing suite baseline: 10/10. New full suite after the correction: 13/13.
- New output SHA-256: `618873198684da0b8570b0036e84d92bee9d8c10500e4e2c6da60b3a539c4f67` (2,849,200 bytes). Second Blender build was byte-identical.
- Original asset SHA-256 remains `b4a8118ab57f6e32a783e473e5e12767a5650b99b45b62d350196f7d996a6b9d`.
- Blender source inspection found an oversized helper sphere in the input GLB that distorted fit if re-exported. The new generator omits it only in the new artifact.
- Browser Chromium captured old/new geometry for jaw 0/25/50/100, smile, blink+jaw, rotated head+jaw and neutral. App selection and jaw test were also run with camera off; no camera or microphone was accessed.
- Blender overwrite guard manually returned exit 1 with output hash unchanged.
- Work-unit commit: `309270cad69a27031b3c343089a6572b33db3e82` (`feat(experiment): add opt-in mouth anatomy actor`).
- Packaging slice 1: `cc1313c4ff5203ec34fbcdfe42125aa37a8795da` (`fix(experiment): separate mouth teeth across jaw poses`) updates only the generator, generated GLB and anatomy regression. Fresh post-commit verification: `node --test experiments/privacy-puppet-webcam/*.test.mjs` — 13/13; `node --check experiments/privacy-puppet-webcam/app.js` — passed; `node --check experiments/privacy-puppet-webcam/face-map.mjs` — passed; `git diff --check` — passed. The synthetic browser geometry screenshots were visually inspected; no device or recorder path was activated for this correction.
- Packaging slice 2 is the refreshed README, task record and synthetic screenshots. It is intended to integrate after slice 1 on `experiment/issue4-rescate`; neither commit changes `main` or performs remote work.
- Engram mirror pending: `mem_review(list)` returned `unknown_project` for `ia-cinema-lab`; no retries were made.
- The user reports testing the real webcam and recording path. This workspace has no corresponding real-camera recording; `docs/evidence/issue-4/actor-synthetic-silent.webm` is historical synthetic/silent evidence and does not independently validate that report or this new asset.

## Next step
No further implementation is authorized here. The user-reported real-camera/recording validation is acknowledged, but this packaging work has no supplied real-media evidence to independently inspect; the attached synthetic evidence does not prove camera, microphone or recording acceptance.

## Relevant files
- `experiments/privacy-puppet-webcam/tools/build-actor-mouth.py` — new non-overwriting procedural mouth builder.
- `experiments/privacy-puppet-webcam/assets/mpfb-actor-mouth.glb` — separate actor asset.
- `experiments/privacy-puppet-webcam/actor-mouth.test.mjs` — actor anatomy and source-preservation tests.
- `experiments/privacy-puppet-webcam/app.js` and `index.html` — minimal opt-in selector wiring.
- `experiments/privacy-puppet-webcam/assets/README.md` — provenance and rebuild instructions.
- `docs/evidence/issue-4-mouth/` — before/after Chromium captures and geometry QA harness.
