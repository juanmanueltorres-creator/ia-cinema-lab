# Experimento · Camera → Human Puppet

Prueba web independiente para validar **PrivacyPuppet + MediaPipe**, antes de integrarlos en React. No reemplaza el MVP ni representa una demo aprobada.

## Ejecutar

Desde la raíz del repositorio:

```bash
python3 -m http.server 8000
```

Abrir `http://localhost:8000/experiments/privacy-puppet-webcam/` en Chrome/Edge/Firefox compatible. Requiere internet para bibliotecas, modelo de MediaPipe y GLB remotos. Para un servidor público, usar HTTPS.

## Probar

1. Esperar la carga del personaje (15–18 MB).
2. Activar webcam y mirar de frente; después girar la cabeza y abrir/cerrar la boca.
3. Cambiar personaje e iluminación; comprobar que el avatar mantiene la pose.
4. Grabar 10–15 segundos. El micrófono se solicita **solo al grabar**; puede rechazarse.
5. Detener y comprobar la reproducción y sincronía del WebM/MP4 disponible.

## Lo que sí hace

- Detecta rostro y coeficientes faciales en el navegador; aplica movimiento de cabeza y mandíbula al esqueleto MPFB.
- Permite cambiar entre Kofi, Yuki y Liam y usar tres esquemas de luz.
- Captura el canvas con MediaRecorder y descarga el archivo; limpia pistas de cámara/micrófono.
- Si falla la GPU de MediaPipe, intenta CPU.

## Límites que hay que medir

- No está validado aún con webcam real ni probado en móviles.
- Los modelos de PrivacyPuppet suelen mover la mandíbula con huesos; **el parpadeo puede no estar disponible** sin morph targets.
- El seguimiento por puntos es aproximado, puede requerir invertir ejes o calibrar expresiones.
- Webcam, WebGL y MediaRecorder dependen del navegador. MP4 **no está garantizado**.
- CDN y recursos remotos: internet obligatorio; el video de la webcam no se envía, pero el SDK de MediaPipe puede enviar métricas de uso según su política.
- **Los archivos grandes no se copian al repositorio**. Antes de distribuir assets en un producto, confirmar la licencia específica de cada modelo.

## Prueba de parpadeo real

- **Liam, Yuki y Kofi:** son los GLB abiertos de MPFB usados en PrivacyPuppet. No incluyen los `eyeBlinkLeft/Right` esperados; detectar los parpadeos no cierra sus párpados.
- **FaceCap:** muestra técnica de cabeza 3D del repositorio de Three.js con morfologías ARKit. Seleccionala, activá la webcam y usá **Probar parpadeo**. Es un modelo de referencia sin cuerpo ni acabado fotográfico.
- **Mi GLB:** elegí un archivo local con `eyeBlinkLeft` y `eyeBlinkRight`. Se abre en tu navegador mediante `blob:`, sin subirlo a un servidor. Si el GLB no tiene esos objetivos, se informa en pantalla.

Para generar un personaje humano completo con párpados: MPFB2 2.0.15+ en Blender → instalar el asset pack `faceunits01` → **Face operations** → **Load face shape keys** → exportar GLB con shape keys. Para visemas, agregar `visemes02`. Comprobar en el GLB resultante que los nombres `eyeBlinkLeft` y `eyeBlinkRight` fueron exportados. [Referencia oficial](https://www.makehumancommunity.org/mpfb/releases/release_2015.html).

**Pendiente:** observar la calidad visual de FaceCap y de un avatar MPFB exportado con ARKit en una webcam real. No se presenta un parpadeo artificial como equivalente a uno anatómico.

## Referencias y atribución

- [PrivacyPuppet](https://github.com/privacypuppet/privacypuppet) — visualizador y GLB Kofi/Yuki/Liam, código MIT; inspiración del mapeo a huesos. No se copió su visor completo.
- [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js) — reconocimiento facial, Apache 2.0.
- [Three.js](https://threejs.org/) — renderizado WebGL, MIT.
- [Face Cap GLB en Three.js r184](https://github.com/mrdoob/three.js/blob/r184/examples/models/gltf/facecap.glb) — cabeza de muestra con expresiones ARKit, crédito a Face Cap; se carga remotamente y no se distribuye dentro de este repositorio.

El experimento usa JavaScript nativo deliberadamente: minimiza dependencias y permite probar la hipótesis antes de portar la integración al stack React/TypeScript especificado.
