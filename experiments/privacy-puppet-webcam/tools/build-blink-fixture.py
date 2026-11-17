"""Build a separate clay MPFB blink fixture, never modify imported characters.
Run with Blender --background --python this.py -- --targets DIR --output FILE.glb.
Targets are the CC0 eyeBlinkLeft/Right files from extra-targets/faceunits01.
"""
import argparse
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

parser = argparse.ArgumentParser()
parser.add_argument("--targets", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
names = ("eyeBlinkLeft", "eyeBlinkRight")
for name in names:
    if not (args.targets / (name + ".target")).is_file():
        raise RuntimeError("Missing faceunits01 target: " + name)
if args.output.exists():
    raise RuntimeError("Refusing to overwrite an existing asset")

# This process is a fresh headless scene; no .blend is opened or saved.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
human = HumanService.create_human()
keys = human.data.shape_keys.key_blocks
basis = keys[0]
coords = [v.co.copy() for v in basis.data]
for key in list(keys)[1:]:
    for i, vertex in enumerate(key.data):
        coords[i] += (vertex.co - basis.data[i].co) * key.value
body = human.vertex_groups["body"].index
indices = {v.index for v in human.data.vertices
           if coords[v.index].z > 1.40 and any(g.group == body for g in v.groups)}
faces = [list(p.vertices) for p in human.data.polygons if all(i in indices for i in p.vertices)]
used = sorted({i for face in faces for i in face})
remap = {old: new for new, old in enumerate(used)}
mesh = bpy.data.meshes.new("MPFB blink fixture")
mesh.from_pydata([coords[i] for i in used], [], [[remap[i] for i in face] for face in faces])
head = bpy.data.objects.new("MPFB clay head - NOT Liam Kofi or Yuki", mesh)
bpy.context.collection.objects.link(head)
head.shape_key_add(name="Basis")
for name in names:
    TargetService.load_target(human, str(args.targets / (name + ".target")), name="!ex-" + name)
    source = human.data.shape_keys.key_blocks["!ex-" + name]
    key = head.shape_key_add(name="!ex-" + name)
    for j, i in enumerate(used):
        key.data[j].co = coords[i] + (source.data[i].co - basis.data[i].co)
    moved = sum((key.data[j].co - coords[i]).length > 1e-7 for j, i in enumerate(used))
    assert moved > 0, "Empty blink target"
    print("BLINK_PROOF", name, "moved_vertices", moved)


def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = 0.65
    return mat


head.data.materials.append(material("Neutral clay", (0.38, 0.29, 0.23)))
for side in ("l", "r"):
    group = human.vertex_groups["joint-" + side + "-eye"].index
    points = [coords[v.index] for v in human.data.vertices if any(g.group == group for g in v.groups)]
    center = sum(points, Vector()) / len(points)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=0.0115, location=center)
    bpy.context.object.name = "Eye " + side
    bpy.context.object.data.materials.append(material("Eye white " + side, (0.75, 0.75, 0.72)))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.004, location=center + Vector((0, -0.0105, 0)))
    bpy.context.object.name = "Pupil " + side
    bpy.context.object.data.materials.append(material("Pupil " + side, (0.015, 0.02, 0.02)))
bpy.data.objects.remove(human, do_unlink=True)
for obj in bpy.context.scene.objects:
    obj.select_set(True)
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
args.output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(args.output.resolve()), export_format="GLB", use_selection=True, export_morph=True)
print("EXPORTED", json.dumps({"path": str(args.output), "bytes": args.output.stat().st_size}))
