# Actor Mouth Art V2

## Objective

Refine the experimental MPFB actor's visible mouth with more natural tooth proportions and facial transitions, while preserving the actor identity, existing V1 output, and existing ARKit expression channels.

## Problem and rationale

The current separate-teeth geometry is visibly undersized and pointy when the jaw opens. V2 should improve tooth shape, arch proportions, enamel appearance, and lip transition without replacing the actor or changing webcam, calibration, recording, or face-mapping behavior.

## Scope and constraints

- Baseline: branch `experiment/issue4-mouth`, commit `1062c7dfd8022f1ce37aef4cef781f4f490132a4`.
- Preserve SHA-256 `b4a8118ab57f6e32a783e473e5e12767a5650b99b45b62d350196f7d996a6b9d` (`assets/mpfb-actor.glb`) and `618873198684da0b8570b0036e84d92bee9d8c10500e4e2c6da60b3a539c4f67` (`assets/mpfb-actor-mouth.glb`).
- Add a reproducible, explicit V2 opt-in producing `assets/mpfb-actor-mouth-v2.glb`; retain V1 as the default generation behavior and never overwrite an existing asset.
- Keep the existing actor, skeletal topology, and ARKit blendshape names. Preserve the cavity and tongue; do not add visemes, paid services, dependencies, or external assets.
- Do not alter MediaPipe, face mapping, calibration, webcam, recording, or microphone code. Keep the viewer's V1 behavior intact and add only a selectable V2 actor option.
- TDD: enabled by the applicable test-driven-development skill; runner: `node --test experiments/privacy-puppet-webcam/*.test.mjs`.
- Route: delegated direct, one bounded writer. Three implementation tasks; estimated authored diff below 380 lines as a planning forecast, not a hard limit. No remote operations.

## Acceptance criteria

- V2 generation is deterministic from the same input, opt-in, and non-overwriting; default V1 generation remains compatible.
- V2 includes individually shaped upper and lower teeth with a natural arch, restrained off-white enamel, lip/cavity transition improvements, and jaw-driven lower dentition/tongue. No obvious overlaps through jaw weights 0, 0.25, 0.5, and 1; checks are conservative geometry checks rather than a full collision solver.
- Existing meshes, head attachment, neutral expression weights, and ARKit skin channels remain available; both old GLB hashes remain unchanged.
- The viewer can select V2 without changing its default actor or altering existing controls and expression mappings.
- Before/after evidence is captured with identical camera and lighting for neutral, jaw-open, smile, blink, and head rotation; inspect images and discard any changes that worsen the familiar actor appearance.
- All required automated and Blender reproducibility/non-overwrite checks are reported honestly. Do not claim live camera or microphone validation.

## Tasks

- [x] AMV2-1: Added asset and selector tests before implementation; they failed first because V2 was absent. The later gingiva requirement also failed before the geometry was added.
- [x] AMV2-2: Added opt-in `--version v2`, individually shaped crowns, soft gingiva, enamel/lip material refinement, and generated the separate V2 GLB. Default V1 regeneration reproduced the original V1 hash; both existing V1/V2 output paths refused overwrite.
- [x] AMV2-3: Added the selectable actor option, updated asset/experiment docs, and captured matched geometry plus actual viewer manual-jaw evidence. Full tests: 16/16 pass; JS/Python syntax checks pass; Blender V1/V2 determinism and no-overwrite checks pass. The headless browser showed the V2 GLB and manual jaw test; the only console error was a 404 favicon, with no failed asset requests. Webcam/mic were not used.

## Verification evidence

- Focused and full runner: `node --test experiments/privacy-puppet-webcam/*.test.mjs`.
- Syntax checks: PowerShell `$env:PYTHONPYCACHEPREFIX='A:\tmp\issue4-qa\pycache'; python -m py_compile experiments/privacy-puppet-webcam/tools/build-actor-mouth.py` and `node --check experiments/privacy-puppet-webcam/app.js`.
- Blender: regenerate V2 to a temporary output with Blender 5.2.2; compare reproducibility and verify the command refuses to overwrite both V1 and an existing V2 output. Do not modify checked-in V1.
- Visual harness: inspect the V1 and V2 GLBs with identical `docs/evidence/issue-4-mouth/geometry-qa.html` camera/light settings and compare the requested poses. This is synthetic geometry review only.

## Progress and next step

Exploration confirmed the current generator makes twelve low-profile ellipsoid teeth per arch with restrained vertex resolution; the open-jaw screenshot shows the result as conspicuously small, spaced points. V2 now uses rounded, varied crowns with narrow gingiva at each root. Upper/lower crown AABBs show no overlap at jaw weights 0, 0.25, 0.5, and 1; this is a conservative geometry check, not a full collision solver. The app loads V2 and opens it through the existing manual jaw button without asking for camera/mic permission. The task document is the current recovery record; its Engram mirror is pending because Engram returned `unknown_project` for the detected project. Next: parent review and gradual integration; no remote operations were performed.

V2 size: 2,976,040 bytes. SHA-256: `60716d83e6430cb6098c952e54193e928f5ed0f0e5283232a7e6a93d99f9f59f`. Baseline actor and V1 hashes remain unchanged.

## Relevant files

- `experiments/privacy-puppet-webcam/tools/build-actor-mouth.py` — current procedural mouth generation.
- `experiments/privacy-puppet-webcam/tools/build-complete-actor.py` — preserved actor and ARKit morph generation.
- `experiments/privacy-puppet-webcam/actor-mouth.test.mjs` — current GLB integrity, morph and geometry checks.
- `experiments/privacy-puppet-webcam/app.js` and `index.html` — V2 is selectable in the existing actor selector.
- `experiments/privacy-puppet-webcam/assets/mpfb-actor-mouth-v2.glb` — opt-in generated V2 asset.
- `docs/evidence/issue-4-mouth/geometry-qa.html` — synthetic pose review harness.
- `docs/evidence/issue-4-mouth/after-v2-*.png` and `app-v2-jaw-100.png` — matched synthetic poses and live-viewer manual jaw capture.
