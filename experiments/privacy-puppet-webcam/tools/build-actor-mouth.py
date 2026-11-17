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
parser.add_argument('--version', choices=('v1', 'v2', 'v3'), default='v1')
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
tooth_material = material('Tooth enamel - procedural',
    (0.88, 0.85, 0.76) if args.version != 'v1' else (0.82, 0.72, 0.56),
    0.42 if args.version != 'v1' else 0.32)
tongue_material = material('Tongue - procedural', (0.42, 0.075, 0.085), 0.68)
gingiva_material = material('Gingiva - procedural', (0.30, 0.055, 0.065), 0.78) if args.version != 'v1' else None

if args.version != 'v1':
    for mat in bpy.data.materials:
        if mat.name == 'Natural lip tone':
            shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
            shader.inputs['Base Color'].default_value = (0.40, 0.18, 0.16, 1)
            shader.inputs['Roughness'].default_value = 0.72


if args.version == 'v3':
    # UV pigment is attached to the original skinned surface, including all
    # brow blendshapes. A texture avoids jagged low-density vertex-color edges.
    skin = bpy.data.objects['Actor skin']
    # A ray grid found a 0.4-0.8 mm opening at the central neutral seam.
    # Raise only jaw-driven lower-lip vertices by at most 1.2 mm at rest.
    # Leave the jawOpen endpoint intact; all other relative expression deltas stay intact.
    keys = skin.data.shape_keys.key_blocks
    basis, opening = keys[0], keys['jawOpen']
    for i, vertex in enumerate(basis.data):
        x, y, z = vertex.co
        if abs(x) < .03 and y < -.14 and 1.315 < z < 1.3275 and opening.data[i].co.z - z < -.01:
            weight = min(1, (z - 1.315) / .009) * min(1, (.03 - abs(x)) / .012)
            offset = Vector((0, 0, .0012 * weight))
            for key in keys:
                if key != opening:
                    key.data[i].co += offset
            skin.data.vertices[i].co = basis.data[i].co
    pigment = material('Brown brow pigment', (1, 1, 1), .65)
    image = bpy.data.images.new('Original procedural brow pigment', width=512, height=128)
    image.colorspace_settings.name = 'sRGB'
    pixels = []
    for row in range(128):
        z = 1.395 + (row + .5) / 128 * .038
        for column in range(512):
            x = .006 + (column + .5) / 512 * .062
            t = (x - .011) / .049
            arch = 1.410 + .009 * math.sin(math.pi * max(0, min(1, t)))
            half_width = .0031 * math.sin(math.pi * t) ** .4 if 0 < t < 1 else 0
            amount = max(0, min(1, (half_width - abs(z - arch)) / .0007))
            amount *= .83 + .12 * math.sin(x * 12000 + z * 3600)
            linear = [a * (1 - amount) + b * amount
                      for a, b in zip((.46, .27, .17), (.028, .014, .008))]
            pixels.extend(tuple(12.92 * v if v <= .0031308 else 1.055 * v ** (1 / 2.4) - .055
                                for v in linear) + (1,))
    image.pixels = pixels
    image.pack()
    uv = skin.data.uv_layers.new(name='BrowPigmentUV')
    for loop in skin.data.loops:
        point = skin.data.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = ((abs(point.x) - .006) / .062, (point.z - 1.395) / .038)
    uv_node = pigment.node_tree.nodes.new('ShaderNodeUVMap')
    uv_node.uv_map = 'BrowPigmentUV'
    texture = pigment.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    texture.extension = 'EXTEND'
    pigment.node_tree.links.new(uv_node.outputs['UV'], texture.inputs['Vector'])
    shader = next(n for n in pigment.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    pigment.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
    index = len(skin.data.materials)
    skin.data.materials.append(pigment)
    for poly in skin.data.polygons:
        center = sum((skin.data.vertices[i].co for i in poly.vertices), Vector()) / len(poly.vertices)
        if .006 < abs(center.x) < .068 and center.y < -.09 and 1.399 < center.z < 1.429:
            poly.material_index = index


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
        width = 0.0017 if index in (0, 11) else 0.0018
        height = 0.0047 if index in (0, 11) else 0.0048
        depth = 0.0038
        parts.append(ellipsoid((x, y, z), (width, depth, height), 7, 10))
    return merge(parts)


def rounded_crown(center, width, depth, height, cusp=0.0):
    vertices, faces = [], []
    ring_profile = ((-0.50, 0.72), (-0.36, 0.92), (-0.02, 1.0),
                    (0.28, 0.96), (0.43, 0.78), (0.49, 0.54))
    segments = 16
    for level, scale in ring_profile:
        for segment in range(segments):
            angle = 2 * math.pi * segment / segments
            # A superellipse gives an incisor a rounded rectangular crown rather than a point.
            cosine = math.cos(angle)
            sine = math.sin(angle)
            c = math.copysign(abs(cosine) ** 0.72, cosine)
            s = math.copysign(abs(sine) ** 0.72, sine)
            cusp_height = cusp * max(0.0, cosine) ** 8 if level > 0.4 else 0.0
            vertices.append((center[0] + width * scale * c,
                center[1] + depth * scale * s, center[2] + height * level + cusp_height))
    for ring in range(len(ring_profile) - 1):
        for segment in range(segments):
            a = ring * segments + segment
            b = ring * segments + (segment + 1) % segments
            c = (ring + 1) * segments + (segment + 1) % segments
            d = (ring + 1) * segments + segment
            faces.append((a, b, c, d))
    faces.extend((tuple(reversed(range(segments))),
        tuple((len(ring_profile) - 1) * segments + index for index in range(segments))))
    return vertices, faces


def natural_arch(z):
    # Twelve teeth per arch: broad incisors taper through canines to smaller molars.
    x_positions = (-0.037, -0.031, -0.024, -0.017, -0.0095, -0.0032,
                   0.0032, 0.0095, 0.017, 0.024, 0.031, 0.037)
    radii = (0.0021, 0.0023, 0.00255, 0.0027, 0.0031, 0.0031,
             0.0031, 0.0031, 0.0027, 0.00255, 0.0023, 0.0021)
    heights = (0.0068, 0.0072, 0.0082, 0.0074, 0.0072, 0.008,
               0.008, 0.0072, 0.0074, 0.0082, 0.0072, 0.0068)
    parts = []
    for index, x in enumerate(x_positions):
        side = abs(x) / 0.037
        y = -0.122 + 0.015 * side ** 2
        width = radii[index]
        depth = 0.0034 if index in (4, 5, 6, 7) else 0.0030
        cusp = 0.00035 if index in (2, 9) else 0
        parts.append(rounded_crown((x, y, z), width, depth, heights[index], cusp))
    return merge(parts)


def gingiva_arch(z, upper):
    x_positions = (-0.037, -0.031, -0.024, -0.017, -0.0095, -0.0032,
                   0.0032, 0.0095, 0.017, 0.024, 0.031, 0.037)
    widths = (0.0021, 0.0023, 0.00255, 0.0027, 0.0031, 0.0031,
              0.0031, 0.0031, 0.0027, 0.00255, 0.0023, 0.0021)
    heights = (0.0068, 0.0072, 0.0082, 0.0074, 0.0072, 0.008,
               0.008, 0.0072, 0.0074, 0.0082, 0.0072, 0.0068)
    parts = []
    for index, x in enumerate(x_positions):
        y = -0.122 + 0.015 * (abs(x) / 0.037) ** 2
        root_z = z + heights[index] * 0.47 * (1 if upper else -1)
        parts.append(ellipsoid((x, y, root_z),
            (widths[index] * 1.04, 0.0031, 0.00135), 8, 12))
    return merge(parts)


upper_vertices, upper_faces = natural_arch(1.3225) if args.version != 'v1' else dental_arch(1.3225)
make_mesh('Upper dentition', upper_vertices, upper_faces, tooth_material)
lower_vertices, lower_faces = natural_arch(1.3120) if args.version != 'v1' else dental_arch(1.3120)
make_mesh('Lower dentition', lower_vertices, lower_faces, tooth_material, jaw_morph=True)
if args.version != 'v1':
    upper_gum_vertices, upper_gum_faces = gingiva_arch(1.3225, upper=True)
    lower_gum_vertices, lower_gum_faces = gingiva_arch(1.3120, upper=False)
    make_mesh('Upper gingiva', upper_gum_vertices, upper_gum_faces, gingiva_material)
    make_mesh('Lower gingiva', lower_gum_vertices, lower_gum_faces, gingiva_material, jaw_morph=True)
tongue_vertices, tongue_faces = ellipsoid((0, -0.102, 1.290), (0.014, 0.024, 0.004), 9, 18)
make_mesh('Tongue', tongue_vertices, tongue_faces, tongue_material, jaw_morph=True)

args.output.parent.mkdir(parents=True, exist_ok=True)
for obj in bpy.context.scene.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(args.output.resolve()), export_format='GLB',
    use_selection=True, export_morph=True, export_animations=False)
print('EXPORTED_MOUTH_ACTOR', args.output.stat().st_size)
