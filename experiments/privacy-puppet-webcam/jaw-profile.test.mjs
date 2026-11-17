import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const path = new URL('./jaw-profile.mjs', import.meta.url);
test('V3 jaw profile has a stable deadzone, bounded range and time-based return to rest', async () => {
  assert.ok(existsSync(path), 'isolated jaw profile module exists');
  const { jawWeight, stepJaw, jawProfileFor } = await import(path);
  for (const name of ['liam', 'mpfbactormouthv2', 'facecap', 'custom']) assert.equal(jawProfileFor(name), null);
  assert.ok(jawProfileFor('mpfbactormouthv3'));
  assert.equal(jawWeight(0.10), 0);
  assert.equal(jawWeight(0.12), 0);
  assert.equal(jawWeight(0.8), 1);
  assert.equal(jawWeight(0.15, { deadzone: 0.2, full: 0.9 }), 0);
  let last = 0;
  for (let raw = 0; raw <= 1; raw += .01) {
    const value = jawWeight(raw);
    assert.ok(value >= last && value <= 1);
    last = value;
  }
  for (const fps of [30, 60, 120]) {
    let value = 0;
    for (let i = 0; i < fps * 5; i++) value = stepJaw(value, .04 + .06 * (i % 3) / 2, 1 / fps);
    assert.equal(value, 0, 'synthetic resting noise never opens the mouth');
    for (let i = 0; i < fps; i++) value = stepJaw(value, .8, 1 / fps);
    assert.ok(value > .99, 'speech onset responds promptly');
    for (let i = 0; i < fps; i++) value = stepJaw(value, 0, 1 / fps);
    assert.equal(value, 0, 'closed lips settle exactly at neutral');
  }
  assert.equal(stepJaw(.8, .9, 1 / 60, { detected: false }), 0, 'face loss resets immediately');
  const at100ms = fps => {
    let value = 0;
    for (let i = 0; i < fps / 10; i++) value = stepJaw(value, .8, 1 / fps);
    return value;
  };
  assert.ok(Math.abs(at100ms(30) - at100ms(120)) < 1e-12, 'response depends on elapsed time, not frame count');
  let speaking = 0;
  for (const raw of [.2, .75, .3, .5, .05, .8, .25]) for (let frame = 0; frame < 8; frame++) {
    speaking = stepJaw(speaking, raw, 1 / 60);
    assert.ok(speaking >= 0 && speaking <= 1, 'synthetic speech envelope remains bounded');
  }
  for (let frame = 0; frame < 60; frame++) speaking = stepJaw(speaking, 0, 1 / 60);
  assert.equal(speaking, 0, 'a varying speech envelope returns to exact neutral');
});

test('profile overrides only jaw morph after filtering; legacy smoothing and blink remain unchanged', async () => {
  assert.ok(existsSync(path));
  const { applyAvatarExpressions } = await import(path);
  const dictionary = { jawOpen: 0, eyeBlinkLeft: 1, browInnerUp: 2 };
  const state = Object.freeze({ jaw: .7, blinkLeft: 1, expressions: Object.freeze({ jawOpen: .9, browInnerUp: .6 }) });
  const legacy = [0, 0, 0], filtered = [0, 0, 0];
  applyAvatarExpressions(dictionary, legacy, state);
  applyAvatarExpressions(dictionary, filtered, state, 0);
  assert.equal(legacy[0], .175);
  assert.equal(filtered[0], 0, 'raw expression cannot bypass calibrated jaw');
  assert.deepEqual(filtered.slice(1), legacy.slice(1));
  applyAvatarExpressions(dictionary, filtered, state, .5);
  assert.equal(filtered[0], .5, 'no second jaw smoothing');
});
