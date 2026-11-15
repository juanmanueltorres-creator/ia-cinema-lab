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
