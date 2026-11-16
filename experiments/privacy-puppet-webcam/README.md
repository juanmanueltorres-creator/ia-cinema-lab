# Experimento · Camera → Human Puppet

**Issue #4 — nuevo actor disponible:** ejecutar el servidor indicado abajo y elegir **MPFB Actor · personaje experimental completo**. Incluye cuerpo/ropa, ojos texturizados y diez expresiones faciales; conserva los otros personajes. Es un prototipo funcional con materiales sencillos, no un acabado audiovisual final. [Generación, licencias y límites](assets/README.md#complete-experimental-actor-issue-4-rescue). Pruebas actuales: `node --test experiments/privacy-puppet-webcam/*.test.mjs` desde la raíz.

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

## Issue #3: evidencia y limitaciones verificadas

El visor resuelve nombres ARKit, `eyeBlink_L/R` de FaceCap, `blink_left/right` y prefijos MPFB2 `!ex-`. Aplica el mismo resolvedor al diagnóstico y a la animación. Al perder el rostro neutraliza canales faciales controlados, sin alterar morphs demográficos. El diagnóstico desplegable muestra jerarquía, huesos y diccionarios exactos del GLB, nunca datos de cámara.

FaceCap r184 también necesita Meshopt y KTX2/Basis: ahora se cargan sus decodificadores versionados al seleccionar un modelo comprimido, no al cargar Liam/Kofi/Yuki. El shader y los modelos originales no se reemplazaron.

**MPFB · cabeza de prueba** es un GLB separado generado con Blender + los dos targets de parpadeo de `faceunits01`: tiene cierre geométrico real, pero NO conserva el aspecto de los actores ni tiene boca articulada. Sirve para comprobar el camino `!ex-` y la captura, no como reemplazo. [Licencias y reproducción PowerShell](assets/README.md).

La inspección de los tres GLB originales confirmó solo 4–5 targets demográficos y ningún `eyeBlink*`, `blink_*` o `!ex-*`. Liam importado tiene 11.234 vértices de cuerpo; la basemesh MPFB tiene 19.158. Los targets MPFB son indexados: aplicarlos directamente al GLB reordenado/recortado no es una conversión segura. El árbol público fijado de PrivacyPuppet no incluye `.blend`, `.mhm` ni `.mhclo`; hace falta recuperar las fuentes originales o diseñar y validar un retarget de huesos para conservar sus apariencias. No se declara resuelto el parpadeo de esos tres actores.

Prueba sin cámara: seleccionar FaceCap o la cabeza MPFB, pulsar **Probar parpadeo**, **Probar ojo izquierdo** y **Probar ojo derecho**. Cada pulso cierra durante 900 ms y vuelve al seguimiento/reposo; izquierda/derecha son anatómicas, no la posición en pantalla. Observar la secuencia 0 → 1 → 0. [MPFB abierto](../../docs/evidence/issue-3/mpfb-open.png) / [cerrado](../../docs/evidence/issue-3/mpfb-closed.png); [FaceCap abierto](../../docs/evidence/issue-3/facecap-open.png) / [cerrado](../../docs/evidence/issue-3/facecap-closed.png).

Verificación local: `node --check app.js`, `node --check face-map.mjs` y `node --test face-map.test.mjs`: 7/7 pruebas. Los dos tests nuevos fallaron antes del arreglo y pasaron después. Navegador Chromium headless en Windows: carga de Liam, mandíbula manual visible y cierre bilateral/independiente/reapertura de FaceCap y MPFB observados. El navegador no resolvía el CDN: la prueba enrutó las mismas dependencias públicas descargadas a temporales; no demuestra disponibilidad del CDN. Único 404 restante: favicon.

**Pendiente de aceptación:** webcam real (ambos ojos e independientes), cara neutra al perder detección en vivo, boca/dientes/lengua durante habla y reproducción de una grabación audiovisual; Chrome/Firefox interactivos y FPS con MediaPipe. No se activó cámara ni micrófono en la automatización. La captura y el grabador existentes no se modificaron; esto no equivale a haber validado la grabación completa.

## Ajuste experimental de sensibilidad de párpados (rescate Issue #4)

El valor que informa MediaPipe en la interfaz sigue siendo **crudo**: algunos cierres completos registran solo 45–55 %. El control **Cierre completo del párpado con señal de** transforma ese nivel en un morph target de cierre completo. Valor inicial: **50 %**, ajustable entre **35 y 90 %**. Si el avatar cierra demasiado fácil con ojos abiertos, **subí** el valor. Si queda entreabierto con ojos realmente cerrados, **bajalo**.

La transformación usa curva suave con zona neutra 8 %. La velocidad de cierre del morph es mayor que la de apertura, para capturar parpadeos de poca duración sin cambiar mandíbula, sonrisa, cejas ni grabación. Esto solo afecta avatares que realmente tienen shape keys de párpados: FaceCap, MPFB de prueba o GLB propios compatibles. **No agrega párpados a Liam, Kofi y Yuki.**

Validación pendiente: webcam real, falso positivo al mirar hacia abajo, sincronización izquierda/derecha y grabación audiovisual. El actor completo se generó y está disponible como `assets/mpfb-actor.glb`; `actor.test.mjs` ya se ejecuta en CI. La nueva geometría todavía requiere aceptación con webcam real, aunque el usuario validó previamente el seguimiento y grabador existentes.
