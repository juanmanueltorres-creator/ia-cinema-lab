import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const mouthActor = process.env.MOUTH_ACTOR_ASSET ?? new URL('./assets/mpfb-actor-mouth.glb', import.meta.url);
const mouthActorV2 = new URL('./assets/mpfb-actor-mouth-v2.glb', import.meta.url);
const originalActor = new URL('./assets/mpfb-actor.glb', import.meta.url);

function readGlb(file) {
  const bytes = readFileSync(file);
  let offset = 12, json, binary;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = bytes.subarray(offset, offset + length);
    offset += length;
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString());
    if (type === 0x004e4942) binary = chunk;
  }
  assert.ok(json && binary, 'GLB must contain JSON and binary chunks');
  return { gltf: json, binary };
}

function readAccessor(gltf, binary, index) {
  const accessor = gltf.accessors[index];
  const view = gltf.bufferViews[accessor.bufferView];
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const bytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
  const componentCount = widths[accessor.type];
  const componentBytes = bytes[accessor.componentType];
  const stride = view.byteStride ?? componentCount * componentBytes;
  const start = view.byteOffset + (accessor.byteOffset ?? 0);
  const read = accessor.componentType === 5126 ? 'readFloatLE'
    : accessor.componentType === 5123 ? 'readUInt16LE'
      : accessor.componentType === 5125 ? 'readUInt32LE' : 'readUInt8';
  const values = [];
  for (let i = 0; i < accessor.count; i++) {
    for (let j = 0; j < componentCount; j++) {
      values.push(binary[read](start + i * stride + j * componentBytes));
    }
  }
  return { componentCount, count: accessor.count, values };
}

function toothIslands(gltf, binary, meshName, jawWeight = 0) {
  const node = gltf.nodes.find((item) => item.name === meshName);
  const mesh = gltf.meshes[node.mesh];
  const targetIndex = (mesh.extras?.targetNames ?? []).indexOf('jawOpen');
  const islands = [];
  for (const primitive of mesh.primitives) {
    const position = readAccessor(gltf, binary, primitive.attributes.POSITION);
    const targetAccessor = jawWeight && targetIndex >= 0
      ? readAccessor(gltf, binary, primitive.targets[targetIndex].POSITION) : null;
    const points = Array.from({ length: position.count }, (_, index) => {
      const point = position.values.slice(index * 3, index * 3 + 3);
      if (targetAccessor) {
        for (let axis = 0; axis < 3; axis++) point[axis] += targetAccessor.values[index * 3 + axis] * jawWeight;
      }
      return point;
    });
    const indices = primitive.indices === undefined
      ? Array.from({ length: position.count }, (_, index) => index)
      : readAccessor(gltf, binary, primitive.indices).values;
    const parent = Array.from({ length: position.count }, (_, index) => index);
    const find = (index) => parent[index] === index ? index : (parent[index] = find(parent[index]));
    const join = (a, b) => { parent[find(a)] = find(b); };
    for (let i = 0; i + 2 < indices.length; i += 3) {
      join(indices[i], indices[i + 1]);
      join(indices[i + 1], indices[i + 2]);
    }
    const groups = new Map();
    points.forEach((point, index) => {
      const root = find(index);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(point);
    });
    for (const vertices of groups.values()) {
      islands.push({
        min: [0, 1, 2].map((axis) => Math.min(...vertices.map((point) => point[axis]))),
        max: [0, 1, 2].map((axis) => Math.max(...vertices.map((point) => point[axis]))),
      });
    }
  }
  return islands;
}

function boxesOverlap(a, b, epsilon = 1e-5) {
  return [0, 1, 2].every((axis) => a.min[axis] < b.max[axis] - epsilon
    && b.min[axis] < a.max[axis] - epsilon);
}

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

test('separate teeth do not intersect through jaw opening and move with the jaw', () => {
  const { gltf, binary } = readGlb(mouthActor);
  const upper = toothIslands(gltf, binary, 'Upper dentition');
  assert.equal(upper.length, 12, 'upper arch contains twelve separate teeth');
  let previousCenter = Infinity;
  for (const jawWeight of [0, 0.25, 0.5, 1]) {
    const lower = toothIslands(gltf, binary, 'Lower dentition', jawWeight);
    assert.equal(lower.length, 12, 'lower arch contains twelve separate teeth');
    const noAdjacentOverlap = (arch, label) => {
      const byX = [...arch].sort((a, b) => (a.min[0] + a.max[0]) - (b.min[0] + b.max[0]));
      for (let index = 1; index < byX.length; index++) {
        assert.ok(byX[index - 1].max[0] < byX[index].min[0],
          `${label} adjacent teeth overlap at jaw ${jawWeight}`);
      }
    };
    noAdjacentOverlap(upper, 'upper');
    noAdjacentOverlap(lower, 'lower');
    for (const top of upper) for (const bottom of lower) {
      assert.ok(!boxesOverlap(top, bottom), `upper/lower teeth intersect at jaw ${jawWeight}`);
    }
    const center = lower.reduce((sum, box) => sum + (box.min[1] + box.max[1]) / 2, 0) / lower.length;
    assert.ok(center < previousCenter, `lower teeth move down at jaw ${jawWeight}`);
    previousCenter = center;
  }
});

test('V2 is an opt-in mouth asset with broader, anatomically varied crowns', () => {
  assert.ok(existsSync(mouthActorV2), 'the V2 asset must be generated separately');
  const { gltf, binary } = readGlb(mouthActorV2);
  const upper = toothIslands(gltf, binary, 'Upper dentition');
  const lower = toothIslands(gltf, binary, 'Lower dentition');
  assert.equal(upper.length, 12);
  assert.equal(lower.length, 12);
  const widths = upper.sort((a, b) => a.min[0] - b.min[0])
    .map((tooth) => tooth.max[0] - tooth.min[0]);
  assert.ok(widths[5] > 0.005, 'front incisors should have visibly broader crowns than V1');
  assert.ok(Math.max(...widths) - Math.min(...widths) > 0.001,
    'incisors, canines, and posterior crowns should have distinct proportions');
  const targetNames = gltf.meshes.flatMap((mesh) => mesh.extras?.targetNames ?? []);
  for (const name of ['eyeBlinkLeft', 'eyeBlinkRight', 'jawOpen', 'mouthSmileLeft', 'mouthSmileRight']) {
    assert.ok(targetNames.includes(name), `V2 must preserve ${name}`);
  }
  assert.ok(gltf.materials.some((material) => material.name.includes('Tooth enamel')
    && material.pbrMetallicRoughness.roughnessFactor >= 0.35
    && material.pbrMetallicRoughness.baseColorFactor[0] < 0.9),
  'enamel should remain restrained and non-glossy');
});

test('V2 retains cavity, tongue and collision-free jaw morph bounds', () => {
  assert.ok(existsSync(mouthActorV2));
  const { gltf, binary } = readGlb(mouthActorV2);
  const head = gltf.nodes.find((node) => node.name === 'head');
  assert.ok(head, 'original head skeleton must remain');
  assert.ok(gltf.materials.some((material) => material.name.includes('Gingiva')),
    'gum tissue should soften the lip-to-crown transition');
  for (const name of ['Oral cavity', 'Upper dentition', 'Lower dentition', 'Upper gingiva', 'Lower gingiva', 'Tongue']) {
    const nodeIndex = gltf.nodes.findIndex((node) => node.name.includes(name));
    assert.ok(nodeIndex >= 0, name);
    assert.ok(head.children?.includes(nodeIndex), `${name} must follow head rotation`);
  }
  const lowerGingiva = gltf.nodes.find((node) => node.name === 'Lower gingiva');
  const lowerGingivaTargets = gltf.meshes[lowerGingiva.mesh].extras?.targetNames ?? [];
  assert.ok(lowerGingivaTargets.includes('jawOpen'), 'lower gingiva must follow the jaw');
  for (const node of gltf.nodes) {
    if (node.mesh === undefined) continue;
    const weights = node.weights ?? gltf.meshes[node.mesh].weights ?? [];
    assert.ok(weights.every((weight) => weight === 0), `${node.name} starts neutral`);
  }
  const upper = toothIslands(gltf, binary, 'Upper dentition');
  let priorCenter = Infinity;
  for (const jawWeight of [0, 0.25, 0.5, 1]) {
    const lower = toothIslands(gltf, binary, 'Lower dentition', jawWeight);
    for (const arch of [upper, lower]) {
      const sorted = [...arch].sort((a, b) => a.min[0] - b.min[0]);
      for (let index = 1; index < sorted.length; index++) {
        assert.ok(sorted[index - 1].max[0] < sorted[index].min[0],
          `adjacent crown bounds overlap at jaw ${jawWeight}: ${sorted[index - 1].max[0]} >= ${sorted[index].min[0]}`);
      }
    }
    for (const top of upper) for (const bottom of lower) {
      assert.ok(!boxesOverlap(top, bottom, 1e-4), `upper/lower crowns intersect at jaw ${jawWeight}`);
    }
    const center = lower.reduce((sum, box) => sum + (box.min[1] + box.max[1]) / 2, 0) / lower.length;
    assert.ok(center < priorCenter, `lower crowns must follow jawOpen=${jawWeight}`);
    priorCenter = center;
  }
});

test('V2 remains opt-in through the existing actor selector', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert.match(html, /<option value="mpfbactormouthv2">/);
  assert.match(app, /mpfbactormouthv2:\s*\{\s*url:\s*"\.\/assets\/mpfb-actor-mouth-v2\.glb"/);
  assert.match(app, /mpfbactormouth:\s*\{\s*url:\s*"\.\/assets\/mpfb-actor-mouth\.glb"/,
    'V1 must remain selectable');
});
