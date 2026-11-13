# SPEC-001 · Camera to Avatar

**Estado:** borrador · **Prioridad:** P0 · **Entrega:** MVP v0.1

## Historia principal

Como creador, quiero activar mi cámara, interpretar un avatar 3D y guardar un video de mi actuación **sin subirlo a un servidor**.

## Requisitos verificables

| ID | Requisito | Prueba de aceptación |
| --- | --- | --- |
| R1 | Permiso explícito de cámara y micrófono | Si se rechaza, aparece una salida clara y no hay captura. |
| R2 | Rostro → avatar | Al girar cabeza, parpadear y abrir boca, el avatar refleja los cambios. |
| R3 | Dirección visual | Se pueden alternar al menos tres encuadres sin reiniciar cámara. |
| R4 | Grabación audiovisual | Grabar 15 s, detener y reproducir archivo con imagen y voz sincronizadas. |
| R5 | Exportación local | Descarga en formato compatible detectado; informar si no se puede grabar. |
| R6 | Privacidad | Al desactivar o salir, se liberan tracks; no hay uploads ni grabación automática. |

## Restricciones

- Solo frontend estático; sin APIs pagas.
- Un avatar con licencia verificada y blendshapes compatibles.
- Escritorio primero; móvil se prueba, pero no se promete paridad.
- Objetivo de fluidez: **24 FPS o más** en un equipo de referencia por definir; reportar resultados reales, no métricas estimadas.
- Manejar ausencia de rostro, cámara ocupada, navegador incompatible y pérdida de permisos.

## Prueba de salida

Un video corto con tres planos, voz audible, expresiones reconocibles y reproducción correcta fuera de la app. Registrar navegador, FPS y formato. Si falla, corregir antes de ampliar el producto.

**No incluye:** generación de video por prompt, múltiples actores simultáneos, edición multipista, cuentas ni MP4 garantizado.
