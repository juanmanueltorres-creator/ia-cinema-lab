import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const file = new URL('./assets/mpfb-actor.glb', import.meta.url);
test('experimental actor exports real eyelids, jaw, clothing and head skeleton', () => {
  assert.ok(existsSync(file), 'complete actor GLB must exist');
  const bytes = readFileSync(file);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const targets = gltf.meshes.flatMap(m => m.extras?.targetNames ?? []);
  for (const name of ['eyeBlinkLeft', 'eyeBlinkRight', 'jawOpen', 'browInnerUp', 'browDownLeft', 'browDownRight']) assert.ok(targets.includes(name), name);
  for (const name of ['Actor skin', 'Fitted clothing', 'HighPolyEyes']) assert.ok(gltf.nodes.some(n => n.name.includes(name)), name);
  assert.ok(gltf.nodes.some(n => n.name === 'head'));
  assert.ok(gltf.skins.length > 0);
  assert.ok(gltf.images?.length > 0, 'eyes have an embedded iris texture');
  for (const mesh of gltf.meshes) {
    for (const [index, name] of (mesh.extras?.targetNames ?? []).entries()) {
      assert.ok(mesh.primitives.some(primitive => {
        const position = gltf.accessors[primitive.targets[index].POSITION];
        return position.min.some((v, i) => v !== 0 || position.max[i] !== 0);
      }), 'nonzero morph geometry: ' + name);
    }
  }
});
