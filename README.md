# IA Cinema Lab

Estudio audiovisual **100 % web** para interpretar personajes 3D con cámara, dirigir escenas y producir videos. Código abierto; sin servicios pagos obligatorios.

**Estado:** diseño inicial. Aún no hay aplicación funcional.

## Primer entregable

Un avatar 3D sigue expresiones faciales desde la webcam; el usuario elige un encuadre, graba voz y actuación y exporta un video local. Primero calidad y reproducción verificables; después ampliación.

## Tecnología prevista

React + TypeScript + Vite · Three.js / React Three Fiber · MediaPipe Face Landmarker · VRM · MediaRecorder.

El procesamiento facial será local en el navegador. La compatibilidad y los formatos de video se validarán mediante una prueba técnica, no se darán por garantizados.

## Documentos

- [Visión](docs/PRODUCT_VISION.md)
- [Arquitectura y referencias](docs/ARCHITECTURE.md)
- [Especificación v0.1](docs/specs/001-camera-to-avatar.md)
- [Roadmap](docs/ROADMAP.md)
- [Reglas de desarrollo](AGENTS.md)

Licencia del código: [MIT](LICENSE). Las licencias de modelos 3D, voces y otros recursos deben verificarse por separado.
