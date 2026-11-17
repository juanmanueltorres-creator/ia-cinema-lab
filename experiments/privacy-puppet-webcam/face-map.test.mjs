import test from "node:test";
import assert from "node:assert/strict";
import { mapFace, clamp, jawAngle } from "./face-map.mjs";

const sample = (noseX = 0.5, jaw = 0.4) => {
  const points = Array.from({ length: 264 }, () => ({ x: 0.5, y: 0.5 }));
  points[33] = { x: 0.35, y: 0.4 };
  points[263] = { x: 0.65, y: 0.4 };
  points[1] = { x: noseX, y: 0.53 };
  return {
    faceLandmarks: [points],
    faceBlendshapes: [{ categories: [
      { categoryName: "jawOpen", score: jaw },
      { categoryName: "eyeBlinkLeft", score: 0.6 },
      { categoryName: "eyeBlinkRight", score: 0.2 },
    ] }],
  };
};
test("sin rostro: no hay pose", () => {
  assert.equal(mapFace({ faceLandmarks: [] }), null);
});
test("calibración neutral: centro sin rotación", () => {
  const pose = mapFace(sample());
  assert.ok(pose);
  assert.equal(pose.yaw, 0);
  assert.equal(pose.pitch, 0);
  assert.equal(pose.roll, 0);
  assert.equal(pose.jaw, 0.4);
  assert.equal(pose.blinkLeft, 0.6);
});
test("cambios y límites estables", () => {
  const center = mapFace(sample()).neutral;
  const shifted = mapFace(sample(0.7, 2), center);
  assert.ok(shifted.yaw > 0);
  assert.equal(shifted.jaw, 1);
  assert.equal(clamp(-5, -1, 1), -1);
});

test("jaw retargeting is quiet at rest and bounded while speaking", () => {
  assert.equal(jawAngle(0), 0);
  assert.equal(jawAngle(0.1), 0);
  assert.ok(jawAngle(0.6) > 0.1);
  assert.ok(jawAngle(0.6) < 0.3);
  assert.equal(jawAngle(1), 0.3);
});

test("ARKit targets preserve sensor values for eyelid and mouth morphs", () => {
  const pose = mapFace(sample(0.5, 0.48));
  assert.equal(pose.expressions.jawOpen, 0.48);
  assert.equal(pose.expressions.eyeBlinkLeft, 0.6);
  assert.equal(pose.expressions.eyeBlinkRight, 0.2);
  assert.equal(pose.expressions.missing, undefined);
});

test("expression aliases resolve FaceCap and MPFB eyelids without touching demographic shapes", async () => {
  const { expressionName } = await import("./face-map.mjs");
  assert.equal(typeof expressionName, "function");
  assert.equal(expressionName("eyeBlink_L"), "eyeBlinkLeft");
  assert.equal(expressionName("eyeBlink_R"), "eyeBlinkRight");
  assert.equal(expressionName("!ex-eyeBlinkLeft"), "eyeBlinkLeft");
  assert.equal(expressionName("!ex-eyeBlinkRight"), "eyeBlinkRight");
  assert.equal(expressionName("blink_left"), "eyeBlinkLeft");
  assert.equal(expressionName("$md-age"), null);
});

test("expression application resets owned channels on face loss, preserving model shapes", async () => {
  const { applyExpressions } = await import("./face-map.mjs");
  assert.equal(typeof applyExpressions, "function");
  const dict = { "!ex-eyeBlinkLeft": 0, eyeBlink_R: 1, jawOpen: 2, mouthSmileLeft: 3, "$md-age": 4 };
  const values = [0, 0, 0, 0, 0.7];
  applyExpressions(dict, values, { jaw: 0.4, blinkLeft: 1, blinkRight: 0.2, expressions: { mouthSmileLeft: 0.8 } }, 1);
  assert.deepEqual(values, [1, 0.2, 0.4, 0.8, 0.7]);
  applyExpressions(dict, values, null, 1);
  assert.deepEqual(values, [0, 0, 0, 0, 0.7]);
});

test("blink sensitivity reaches full closure for underreported camera scores", async () => {
  const { blinkWeight } = await import("./face-map.mjs");
  assert.equal(blinkWeight(0), 0);
  assert.equal(blinkWeight(0.08), 0);
  assert.ok(blinkWeight(0.47) > 0.98, "47% from camera should close eyelid");
  assert.equal(blinkWeight(0.50), 1);
  assert.equal(blinkWeight(1), 1);
  assert.equal(blinkWeight(0.47, { full: 0.9 }) < 0.6, true);
  assert.ok(blinkWeight(0.22) < blinkWeight(0.40));
});

test("eyelid morphs close faster than face channels and reopen smoothly", async () => {
  const { applyExpressions } = await import("./face-map.mjs");
  const dict = { "eyeBlink_L": 0, "!ex-eyeBlinkRight": 1, mouthSmileLeft: 2 };
  const values = [0, 0, 0];
  applyExpressions(dict, values, { blinkLeft: 1, blinkRight: 1, expressions: { mouthSmileLeft: 1 } });
  assert.ok(values[0] > 0.8 && values[1] > 0.8);
  assert.equal(values[2], 0.25);
  applyExpressions(dict, values, { blinkLeft: 0, blinkRight: 0, expressions: { mouthSmileLeft: 0 } });
  assert.ok(values[0] > 0 && values[0] < 0.55, "eyelids open smoothly after closure");
});
