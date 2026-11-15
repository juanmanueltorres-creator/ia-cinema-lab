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

## Referencias y atribución

- [PrivacyPuppet](https://github.com/privacypuppet/privacypuppet) — visualizador y GLB Kofi/Yuki/Liam, código MIT; inspiración del mapeo a huesos. No se copió su visor completo.
- [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js) — reconocimiento facial, Apache 2.0.
- [Three.js](https://threejs.org/) — renderizado WebGL, MIT.

El experimento usa JavaScript nativo deliberadamente: minimiza dependencias y permite probar la hipótesis antes de portar la integración al stack React/TypeScript especificado.
