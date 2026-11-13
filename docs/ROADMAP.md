# Roadmap

Cada etapa se abre **solo después** de demostrar la anterior.

| Etapa | Entregable | Puerta de salida |
| --- | --- | --- |
| 0 · Validación | Demo facial + avatar licenciado | Movimientos visibles, rendimiento medido. |
| 1 · MVP | Cámara, avatar, encuadres, audio y exportación | Cumple [SPEC-001](specs/001-camera-to-avatar.md). |
| 2 · Escena | Luz, escenario y segundo personaje grabado por separado | Diálogo editado de 20–30 s con continuidad. |
| 3 · Director IA | Guion y planificación de planos | Escenas reproducibles y editables; proveedor gratuito comprobado. |
| 4 · Video IA | Motor de generación enchufable | Calidad y costo medidos; alternativa no generativa disponible. |

**Bloqueadores conocidos:** licencias de avatares, variación de WebGL/WebGPU entre equipos, sincronía audio-video y cuotas de servicios gratuitos.

**Próxima acción:** validar un único avatar con MediaPipe y verificar la grabación en navegador antes de diseñar el editor.
