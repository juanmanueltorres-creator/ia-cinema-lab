# AGENTS.md

Contrato operativo para agentes que trabajen en IA Cinema Lab.

## Antes de modificar

1. Leer [SPEC-001](docs/specs/001-camera-to-avatar.md) y [arquitectura](docs/ARCHITECTURE.md).
2. Inspeccionar archivos y cambios existentes. No reemplazar código funcional sin necesidad.
3. Hacer cambios pequeños, en rama propia y con un objetivo comprobable.

## Reglas

- **Prioridad:** cámara → avatar → grabación → exportación. No sumar módulos futuros al MVP.
- **Stack previsto:** React, TypeScript, Vite, React Three Fiber, MediaPipe y VRM. Confirmar versiones antes de instalarlas.
- **Privacidad:** pedir permiso explícito; procesar cámara localmente; detener tracks al salir; no subir rostros o grabaciones.
- **Costo:** no introducir APIs pagas, claves en frontend ni servicios con facturación obligatoria.
- **Recursos:** registrar origen y licencia de cada modelo, textura, voz y audio. No asumir que MIT cubre assets de terceros.
- **Documentación:** una idea por párrafo; no repetir información ni declarar como implementado lo planificado.
- **Calidad:** contemplar permisos rechazados, falta de rostro, baja potencia y formatos de video no soportados.

## Verificación

El repositorio todavía **no tiene aplicación ni scripts**. Al crear el scaffold, definir y ejecutar `npm run lint`, `npm run test` y `npm run build`; no afirmar que corrieron antes de existir. Añadir prueba manual de cámara, lip-sync, audio y exportación.

En cada PR: **qué cambió · cómo se comprobó · qué falta**. No mergear automáticamente a `main`.
