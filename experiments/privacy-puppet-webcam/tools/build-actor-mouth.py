"""Add procedural, morph-driven oral anatomy to a separate MPFB actor GLB."""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

parser = argparse.ArgumentParser()
parser.add_argument('--input', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
if not args.input.is_file():
    raise RuntimeError('Missing source actor: ' + str(args.input))
if args.output.exists():
    raise RuntimeError('Refusing to overwrite existing actor: ' + str(args.output))

bpy.ops.import_scene.gltf(filepath=str(args.input.resolve()))
rig = next((obj for obj in bpy.data.objects if obj.type == 'ARMATURE'), None)
if rig is None or 'head' not in rig.pose.bones:
    raise RuntimeError('Source actor must have an armature with a head bone')
head = rig.pose.bones['head']
jaw = next((bone for bone in rig.pose.bones if bone.name in ('jaw', 'mandible_reference')), None)
if jaw is None:
    raise RuntimeError('Source actor must include its jaw hinge bone')
hinge = jaw.head.copy()
# The source GLB includes an oversized, unparented MPFB helper sphere. It is not
# part of the character and would dominate framing if propagated into this export.
for obj in list(bpy.data.objects):
    if obj.type == 'MESH' and obj.name.lower().startswith(('icosphere', 'cube')):
        bpy.data.objects.remove(obj, do_unlink=True)
for obj in bpy.data.objects:
    if obj.type != 'MESH' or obj.data.shape_keys is None:
        continue
    for key in obj.data.shape_keys.key_blocks:
        key.value = 0.0


def material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return mat


cavity_material = material('Oral cavity - procedural', (0.035, 0.008, 0.012), 0.92)
tooth_material = material('Tooth enamel - procedural', (0.82, 0.72, 0.56), 0.32)
tongue_material = material('Tongue - procedural', (0.42, 0.075, 0.085), 0.68)


def ellipsoid(center, radius, rings=7, segments=10):
    center = Vector(center)
    vertices = []
    for ring in range(rings + 1):
        theta = math.pi * ring / rings
        for segment in range(segments):
            phi = 2 * math.pi * segment / segments
            vertices.append((
                center.x + radius[0] * math.sin(theta) * math.cos(phi),
                center.y + radius[1] * math.sin(theta) * math.sin(phi),
                center.z + radius[2] * math.cos(theta),
            ))
    faces = []
    for ring in range(rings):
        for segment in range(segments):
            a = ring * segments + segment
            b = ring * segments + (segment + 1) % segments
            c = (ring + 1) * segments + (segment + 1) % segments
            d = (ring + 1) * segments + segment
            faces.append((a, b, c, d))
    return vertices, faces


def merge(parts):
    vertices, faces = [], []
    for points, polygons in parts:
        offset = len(vertices)
        vertices.extend(points)
        faces.extend(tuple(index + offset for index in face) for face in polygons)
    return vertices, faces


def attach_to_head(obj):
    bone_world = rig.matrix_world @ head.matrix
    obj.parent = rig
    obj.parent_type = 'BONE'
    obj.parent_bone = head.name
    obj.matrix_parent_inverse = bone_world.inverted()
    obj.matrix_basis = Matrix.Identity(4)


def make_mesh(name, vertices, faces, mat, jaw_morph=False):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = True
    if jaw_morph:
        basis = obj.shape_key_add(name='Basis')
        opening = obj.shape_key_add(name='jawOpen', from_mix=False)
        opening.value = 0.0
        rotation = Matrix.Rotation(0.42, 4, 'X')
        for index, vertex in enumerate(basis.data):
            opening.data[index].co = hinge + (rotation @ (vertex.co - hinge))
    attach_to_head(obj)
    return obj


cavity_vertices, cavity_faces = ellipsoid((0, -0.092, 1.310), (0.040, 0.004, 0.018), 8, 20)
make_mesh('Oral cavity', cavity_vertices, cavity_faces, cavity_material)


def dental_arch(z):
    x_positions = (-0.027, -0.022, -0.018, -0.013, -0.008, -0.004,
                   0.004, 0.008, 0.013, 0.018, 0.022, 0.027)
    parts = []
    for index, x in enumerate(x_positions):
        side_distance = abs(x) / 0.027
        y = -0.122 + 0.012 * side_distance ** 2
        width = 0.0045 if index in (0, 11) else 0.0052
        height = 0.008 if index in (0, 11) else 0.009
        depth = 0.0045
        parts.append(ellipsoid((x, y, z), (width, depth, height), 7, 10))
    return merge(parts)


upper_vertices, upper_faces = dental_arch(1.317)
make_mesh('Upper dentition', upper_vertices, upper_faces, tooth_material)
lower_vertices, lower_faces = dental_arch(1.305)
make_mesh('Lower dentition', lower_vertices, lower_faces, tooth_material, jaw_morph=True)
tongue_vertices, tongue_faces = ellipsoid((0, -0.102, 1.290), (0.014, 0.024, 0.004), 9, 18)
make_mesh('Tongue', tongue_vertices, tongue_faces, tongue_material, jaw_morph=True)

args.output.parent.mkdir(parents=True, exist_ok=True)
for obj in bpy.context.scene.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(args.output.resolve()), export_format='GLB',
    use_selection=True, export_morph=True, export_animations=False)
print('EXPORTED_MOUTH_ACTOR', args.output.stat().st_size)
