import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const asset = new URL('./assets/mpfb-actor-mouth-v3.glb', import.meta.url);
test('V3 adds brows on the deforming skin without replacing earlier actors', () => {
  const old = {
    'mpfb-actor.glb': 'b4a8118ab57f6e32a783e473e5e12767a5650b99b45b62d350196f7d996a6b9d',
    'mpfb-actor-mouth.glb': '618873198684da0b8570b0036e84d92bee9d8c10500e4e2c6da60b3a539c4f67',
    'mpfb-actor-mouth-v2.glb': '60716d83e6430cb6098c952e54193e928f5ed0f0e5283232a7e6a93d99f9f59f',
  };
  for (const [file, hash] of Object.entries(old)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL('./assets/' + file, import.meta.url))).digest('hex'), hash);
  }
  assert.ok(existsSync(asset), 'separate V3 asset exists');
  const bytes = readFileSync(asset);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const skin = gltf.meshes.find(mesh => mesh.name === 'Actor skin');
  const browPrimitives = skin.primitives.filter(p => gltf.materials[p.material].name === 'Brown brow pigment');
  assert.ok(browPrimitives.length > 0, 'brows are skin material regions, not floating objects');
  for (const primitive of browPrimitives) {
    assert.ok(primitive.attributes.JOINTS_0 !== undefined, 'brows retain the skin skeleton');
    for (const name of ['browInnerUp', 'browDownLeft', 'browDownRight', 'browOuterUpLeft', 'browOuterUpRight']) {
      const index = skin.extras.targetNames.indexOf(name);
      assert.ok(index >= 0, name);
      const delta = gltf.accessors[primitive.targets[index].POSITION];
      assert.ok(delta.min.some((v, i) => v !== 0 || delta.max[i] !== 0), name + ' deforms brow pigment vertices');
    }
  }
  for (const mesh of gltf.meshes) assert.ok((mesh.weights ?? []).every(w => w === 0), 'neutral morph weights');
});

test('neutral V3 lip surface occludes the measured sub-millimetre V2 seam aperture', () => {
  const bytes = readFileSync(asset);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const binaryStart = 28 + bytes.readUInt32LE(12);
  const accessor = index => {
    const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView];
    const width = a.type === 'VEC3' ? 3 : 1, size = a.componentType === 5123 ? 2 : 4;
    const read = a.componentType === 5126 ? 'readFloatLE' : size === 2 ? 'readUInt16LE' : 'readUInt32LE';
    return Array.from({ length: a.count }, (_, i) => Array.from({ length: width }, (_, j) =>
      bytes[read](binaryStart + (view.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * (view.byteStride ?? width * size) + j * size)));
  };
  const triangles = gltf.meshes.find(m => m.name === 'Actor skin').primitives.flatMap(p => {
    const positions = accessor(p.attributes.POSITION), ids = accessor(p.indices).flat();
    return Array.from({ length: ids.length / 3 }, (_, i) => ids.slice(i * 3, i * 3 + 3).map(id => positions[id]));
  });
  // glTF is Y-up, front is +Z. Probe the actual V2 opening, not overall lip bounds.
  for (const x of [-.009, -.006, -.003, .003, .006, .009]) for (const y of [1.3266, 1.327]) {
    let front = -Infinity;
    for (const [a, b, c] of triangles) {
      const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(den) < 1e-12) continue;
      const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den;
      const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den;
      if (u >= 0 && v >= 0 && u + v <= 1) front = Math.max(front, u * a[2] + v * b[2] + (1 - u - v) * c[2]);
    }
    assert.ok(front > .14, `closed lips must cover seam x=${x}, y=${y}; depth=${front}`);
  }
});
