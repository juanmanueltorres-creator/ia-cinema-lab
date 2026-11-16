"""Generate a new clothed MPFB actor; never import or overwrite another avatar."""
import argparse
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

parser = argparse.ArgumentParser()
parser.add_argument('--sources', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
names = ('eyeBlinkLeft', 'eyeBlinkRight', 'jawOpen', 'browDownLeft', 'browDownRight',
         'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight', 'mouthSmileLeft', 'mouthSmileRight')
for name in (*[n + '.target' for n in names], 'high-poly.obj', 'high-poly.mhclo', 'brown_eye.png'):
    if not (args.sources / name).is_file():
        raise RuntimeError('Missing source: ' + name)
if args.output.exists():
    raise RuntimeError('Refusing to overwrite existing avatar')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
macro = TargetService.get_default_macro_info_dict()
macro.update(gender=1.0, age=0.3, muscle=0.55, weight=0.45)
macro['race'] = {'caucasian': 0.8, 'african': 0.1, 'asian': 0.1}
human = HumanService.create_human(macro_detail_dict=macro)
keys = human.data.shape_keys.key_blocks
basis = keys[0]
coords = [v.co.copy() for v in basis.data]
for key in list(keys)[1:]:
    for i, vertex in enumerate(key.data):
        coords[i] += (vertex.co - basis.data[i].co) * key.value
rig = HumanService.add_builtin_rig(human, 'default', import_weights=True)
# jawOpen owns skin deformation; do not also rotate the same jaw in the viewer.
rig.data.bones['jaw'].name = 'mandible_reference'
eyes = HumanService.add_mhclo_asset(str(args.sources / 'high-poly.mhclo'), human,
    asset_type='Eyes', subdiv_levels=0)
eyes.name = 'HighPolyEyes'


def material(name, color, roughness=0.65):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return mat


skin = material('Actor skin material', (0.46, 0.27, 0.17))
shirt = material('Navy knit shirt', (0.018, 0.038, 0.075))
pants = material('Charcoal trousers', (0.026, 0.030, 0.036))
hair = material('Short dark hair', (0.023, 0.013, 0.009))
body_group = human.vertex_groups['body'].index
body_indices = {v.index for v in human.data.vertices if any(g.group == body_group for g in v.groups)}
body_faces = [list(p.vertices) for p in human.data.polygons if all(i in body_indices for i in p.vertices)]


def mesh_part(name, faces, offset=0):
    used = sorted({i for face in faces for i in face})
    remap = {old: new for new, old in enumerate(used)}
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([coords[i] + human.data.vertices[i].normal * offset for i in used], [],
                     [[remap[i] for i in face] for face in faces])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for group in human.vertex_groups:
        obj.vertex_groups.new(name=group.name)
    for j, i in enumerate(used):
        for g in human.data.vertices[i].groups:
            obj.vertex_groups[g.group].add([j], g.weight, 'REPLACE')
    obj.parent = rig
    armature = obj.modifiers.new('MPFB rig', 'ARMATURE')
    armature.object = rig
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj, used


body, used = mesh_part('Actor skin', body_faces)
body.data.materials.append(skin)
body.data.materials.append(material('Natural lip tone', (0.36, 0.16, 0.12)))
lip_group = human.vertex_groups['lips'].index
lip_indices = {v.index for v in human.data.vertices if any(g.group == lip_group for g in v.groups)}
for polygon, face in zip(body.data.polygons, body_faces):
    if all(i in lip_indices for i in face):
        polygon.material_index = 1
body.shape_key_add(name='Basis')
for name in names:
    TargetService.load_target(human, str(args.sources / (name + '.target')), name='!ex-' + name)
    source = human.data.shape_keys.key_blocks['!ex-' + name]
    key = body.shape_key_add(name=name)
    for j, i in enumerate(used):
        key.data[j].co = coords[i] + (source.data[i].co - source.relative_key.data[i].co)
    moved = sum((key.data[j].co - coords[i]).length > 1e-7 for j, i in enumerate(used))
    assert moved > 0, 'Empty expression ' + name
    print('TARGET_PROOF', name, moved)
# Original fitted shell garments: no third-party clothing or textures.
# Exclude neck, hands and head; retain a complete clothed lower body.
neck_group = human.vertex_groups['joint-neck'].index
neck_height = sum(coords[v.index].z for v in human.data.vertices
                  if any(g.group == neck_group for g in v.groups)) / 8
print('BODY_BOUNDS', min(p.z for p in coords), max(p.z for p in coords), 'NECK', neck_height)
def covered(i):
    p = coords[i]
    return p.z < neck_height - 0.025
clothing_faces = [f for f in body_faces if all(covered(i) for i in f)]
clothing, _ = mesh_part('Fitted clothing', clothing_faces, 0.006)
# Level the upper boundary to avoid a saw-toothed cut through the neckline.
edge_counts = {}
for poly in clothing.data.polygons:
    for edge in poly.edge_keys:
        edge_counts[edge] = edge_counts.get(edge, 0) + 1
for edge, count in edge_counts.items():
    if count == 1:
        for i in edge:
            vertex = clothing.data.vertices[i]
            if vertex.co.z > neck_height - 0.10:
                vertex.co.z = neck_height - 0.025
clothing.data.materials.append(shirt)
clothing.data.materials.append(pants)
for poly in clothing.data.polygons:
    height = sum(clothing.data.vertices[i].co.z for i in poly.vertices) / len(poly.vertices)
    poly.material_index = 1 if height < 0.88 else 0
# Short scalp crop, not an eyelid overlay.
scalp = human.vertex_groups['scalp'].index
scalp_indices = {v.index for v in human.data.vertices if any(g.group == scalp for g in v.groups)}
hair_faces = [f for f in body_faces if all(i in scalp_indices for i in f)]
crop, _ = mesh_part('Short hair crop', hair_faces, 0.002)
crop.data.materials.append(hair)
# Anatomical MakeHuman eyes are fitted by MHCLO; use simple stable eye materials.
eyes.data.materials.clear()
eye_material = material('Brown eyes - MakeHuman UV texture', (1, 1, 1), 0.28)
texture = eye_material.node_tree.nodes.new('ShaderNodeTexImage')
texture.image = bpy.data.images.load(str(args.sources / 'brown_eye.png'))
shader = next(n for n in eye_material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
eye_material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
eyes.data.materials.append(eye_material)
# The imported UV atlas is a skin-atlas layout, not the standalone eye image.
# Reproject each anatomical globe onto the standalone iris/sclera texture.
for side in (-1, 1):
    verts = [v.co for v in eyes.data.vertices if v.co.x * side > 0]
    center = (Vector((min(v.x for v in verts), min(v.y for v in verts), min(v.z for v in verts))) +
              Vector((max(v.x for v in verts), max(v.y for v in verts), max(v.z for v in verts)))) / 2
    diameter = max(v.x for v in verts) - min(v.x for v in verts)
    for loop in eyes.data.loops:
        point = eyes.data.vertices[loop.vertex_index].co
        if point.x * side > 0:
            eyes.data.uv_layers.active.data[loop.index].uv = (
                0.5 + (point.x - center.x) / diameter,
                0.5 + (point.z - center.z) / diameter)
for poly in eyes.data.polygons:
    poly.use_smooth = True
    poly.material_index = 0
bpy.data.objects.remove(human, do_unlink=True)
for obj in bpy.context.scene.objects:
    obj.select_set(True)
args.output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(args.output.resolve()), export_format='GLB',
    use_selection=True, export_morph=True, export_animations=False)
print('EXPORTED_ACTOR', args.output.stat().st_size)
