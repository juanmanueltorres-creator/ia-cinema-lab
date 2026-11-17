import { clamp, expressionName, applyExpressions } from './face-map.mjs';

const V3_JAW = Object.freeze({ deadzone: 0.12, full: 0.80 });
export function jawProfileFor(avatar) {
  return avatar === 'mpfbactormouthv3' ? V3_JAW : null;
}

// Values are calibration defaults, not measurements from a user's camera.
export function jawWeight(raw, { deadzone = 0.12, full = 0.80 } = {}) {
  const value = Number.isFinite(raw) ? raw : 0;
  const start = clamp(deadzone, 0, .4);
  const end = Math.max(start + .05, clamp(full, .1, 1));
  const progress = clamp((value - start) / (end - start), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

export function stepJaw(previous, raw, seconds, options = {}) {
  if (options.detected === false) return 0;
  const target = jawWeight(raw, options);
  const dt = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const tau = target > previous ? .035 : .065;
  const next = target + (previous - target) * Math.exp(-dt / tau);
  return target === 0 && next < .001 ? 0 : clamp(next, 0, 1);
}

export function applyAvatarExpressions(dictionary, influences, state, filteredJaw) {
  applyExpressions(dictionary, influences, state);
  if (filteredJaw === undefined) return;
  // The profile is already smoothed once per frame, consistently across meshes.
  for (const [target, index] of Object.entries(dictionary)) {
    if (expressionName(target) === 'jawOpen') influences[index] = filteredJaw;
  }
}
