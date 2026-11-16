import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const mouthActor = new URL('./assets/mpfb-actor-mouth.glb', import.meta.url);
const originalActor = new URL('./assets/mpfb-actor.glb', import.meta.url);

test('mouth actor remains separate and preserves the original actor bytes', () => {
  assert.ok(existsSync(originalActor));
  const digest = createHash('sha256').update(readFileSync(originalActor)).digest('hex');
  assert.equal(digest, 'b4a8118ab57f6e32a783e473e5e12767a5650b99b45b62d350196f7d996a6b9d');
});

test('mouth-equipped actor contains cavity, both dentitions and a jaw-driven tongue', () => {
  assert.ok(existsSync(mouthActor), 'the opt-in mouth actor GLB must exist separately');
  const bytes = readFileSync(mouthActor);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.ok(!gltf.meshes.some((mesh) => ['Cube', 'Icosphere', 'Icosphere.001'].includes(mesh.name)),
    'mouth actor must not export the original oversized MPFB inspection sphere');
  const meshes = gltf.meshes.map((mesh) => ({
    name: mesh.name,
    targets: mesh.extras?.targetNames ?? [],
    vertices: mesh.primitives.reduce((count, primitive) => count + gltf.accessors[primitive.attributes.POSITION].count, 0),
  }));
  for (const name of ['Oral cavity', 'Upper dentition', 'Lower dentition', 'Tongue']) {
    assert.ok(meshes.some((mesh) => mesh.name.includes(name)), name);
  }
  const lower = meshes.find((mesh) => mesh.name.includes('Lower dentition'));
  const tongue = meshes.find((mesh) => mesh.name.includes('Tongue'));
  assert.ok(lower.targets.includes('jawOpen'), 'lower dentition must follow the jaw morph');
  assert.ok(tongue.targets.includes('jawOpen'), 'tongue must follow the jaw morph');
  assert.ok(meshes.find((mesh) => mesh.name.includes('Upper dentition')).vertices >= 80);
  const headIndex = gltf.nodes.findIndex((node) => node.name === 'head');
  assert.notEqual(headIndex, -1, 'head attachment node must exist');
  const head = gltf.nodes[headIndex];
  for (const name of ['Oral cavity', 'Upper dentition', 'Lower dentition', 'Tongue']) {
    const nodeIndex = gltf.nodes.findIndex((node) => node.name.includes(name));
    assert.ok(head.children?.includes(nodeIndex), `${name} must follow head rotation`);
  }
  assert.ok(gltf.materials.some((material) => material.name.includes('Oral cavity')));
  assert.ok(gltf.materials.some((material) => material.name.includes('Tooth enamel')));
  const actorSkin = meshes.find((mesh) => mesh.name === 'Actor skin');
  for (const name of ['jawOpen', 'eyeBlinkLeft', 'eyeBlinkRight', 'mouthSmileLeft', 'mouthSmileRight']) {
    assert.ok(actorSkin.targets.includes(name), `actor skin retains ${name}`);
  }
  for (const node of gltf.nodes) {
    if (node.mesh === undefined) continue;
    const weights = node.weights ?? gltf.meshes[node.mesh].weights ?? [];
    assert.ok(weights.every((weight) => weight === 0), `${node.name} starts with neutral expressions`);
  }
});
