// MediaPipe results → normalized, bounded rig inputs. No network or browser APIs.
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function mapFace(result, neutral = null) {
  const points = result.faceLandmarks?.[0];
  if (!points) return null;
  const a = points[33], b = points[263], nose = points[1];
  if (!a || !b || !nose) return null;

  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const span = Math.max(0.04, Math.hypot(b.x - a.x, b.y - a.y));
  // Relative coordinates tolerate variable distance from the camera.
  const rawYaw = (nose.x - midX) / span;
  const rawPitch = (nose.y - midY) / span;
  const rawRoll = Math.atan2(b.y - a.y, b.x - a.x);
  const origin = neutral ?? { yaw: rawYaw, pitch: rawPitch, roll: rawRoll };
  const categories = result.faceBlendshapes?.[0]?.categories ?? [];
  const score = Object.fromEntries(categories.map(({ categoryName, score }) => [categoryName, score]));

  return {
    neutral: origin,
    yaw: clamp((rawYaw - origin.yaw) * 1.5, -0.5, 0.5),
    pitch: clamp((rawPitch - origin.pitch) * 1.6, -0.35, 0.35),
    roll: clamp(rawRoll - origin.roll, -0.32, 0.32),
    jaw: clamp(score.jawOpen ?? 0, 0, 1),
    blinkLeft: clamp(score.eyeBlinkLeft ?? 0, 0, 1),
    blinkRight: clamp(score.eyeBlinkRight ?? 0, 0, 1),
    lookLeft: clamp((score.eyeLookOutLeft ?? 0) - (score.eyeLookInLeft ?? 0), -1, 1),
    // ARKit coefficients can drive matching morph targets on properly rigged GLBs.
    expressions: Object.fromEntries(Object.entries(score).map(([name, value]) => [name, clamp(value, 0, 1)])),
    detected: true,
  };
}

// Retarget partial MediaPipe eye-closure scores to full eyelid movement.
// Keep these scores separate from the raw diagnostic percentages.
// A webcam may score fully closed eyelids below 1.0.
export function blinkWeight(raw, { neutral = 0.08, full = 0.50 } = {}) {
  const span = Math.max(0.05, full - neutral);
  const progress = clamp((clamp(raw, 0, 1) - neutral) / span, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

// Rig-specific jaw retargeting: ignore small resting-mouth noise and
// cap the angle to avoid an exaggerated "hinged jaw" effect.
export function jawAngle(score, { deadzone = 0.12, maxScore = 0.85, maxRadians = 0.30 } = {}) {
  const normalized = clamp((score - deadzone) / (maxScore - deadzone), 0, 1);
  return Math.pow(normalized, 1.25) * maxRadians;
}

// Canonical MediaPipe/ARKit channels only; demographic shape keys remain untouched.
const FACE_CHANNEL = /^(?:brow|cheek|eye|jaw|mouth|nose|tongue)[A-Z][A-Za-z]*$/;
const EXPRESSION_ALIASES = {
  eyeBlink_L: "eyeBlinkLeft", eyeBlink_R: "eyeBlinkRight",
  blink_left: "eyeBlinkLeft", blink_right: "eyeBlinkRight",
  mouthOpen: "jawOpen",
};
export function expressionName(target) {
  const name = target.startsWith("!ex-") ? target.slice(4) : target;
  return EXPRESSION_ALIASES[name] ?? (FACE_CHANNEL.test(name) ? name : null);
}

export function applyExpressions(dictionary, influences, state, factor = 0.25) {
  for (const [target, index] of Object.entries(dictionary)) {
    const name = expressionName(target);
    if (!name) continue;
    const override = { jawOpen: state?.jaw, eyeBlinkLeft: state?.blinkLeft, eyeBlinkRight: state?.blinkRight };
    const value = clamp(override[name] ?? state?.expressions?.[name] ?? 0, 0, 1);
    // Fast eyelid closure captures short real blinks; softer release avoids snapping.
    // Other facial channels (jaw, brow, smile) keep their original smoothing.
    const speed = factor >= 1 ? 1
      : name === "eyeBlinkLeft" || name === "eyeBlinkRight"
        ? (value > influences[index] ? 0.82 : 0.42)
        : factor;
    influences[index] += (value - influences[index]) * speed;
  }
}
