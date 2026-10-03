# Plan de implementación

## Alcance y decisiones pendientes

El proyecto será desarrollado por una persona, con JavaScript y un plazo de quince días. La interfaz utilizará HTML y CSS. Antes de implementar la persistencia se seleccionarán la tecnología del backend, la base de datos y los servicios de publicación compatibles.

La rúbrica no especifica un mínimo de integrantes. Se debe confirmar con el profesor que se acepta una entrega individual. También se debe confirmar si hay restricciones sobre librerías y cuál es el alcance esperado de las transacciones de base de datos.

## Avances y commits

| Avance | Resultado verificable | Mensaje de commit orientativo |
| --- | --- | --- |
| 1 | Alcance, estructuras, entregables y plan documentados. | docs: definir alcance y plan de la veterinaria |
| 2 | Proyecto ejecutable e interfaz inicial con navegación. | feat: crear base de la aplicación y navegación |
| 3 | Registro de propietarios y mascotas con persistencia. | feat: registrar propietarios y mascotas |
| 4 | Cola de turnos normales y heap de urgencias conectados con la atención. | feat: gestionar turnos normales y urgencias |
| 5 | Búsqueda por trie e historial mediante lista enlazada. | feat: añadir búsqueda de mascotas e historial |
| 6 | Grafo de veterinarios y servicios conectado con la asignación. | feat: asignar veterinarios según sus servicios |
| 7 | Flujo completo verificado y errores corregidos. | fix: corregir incidencias del flujo de atención |
| 8 | Publicación funcional y documentación de entrega. | docs: documentar publicación y entrega final |

Los mensajes se ajustarán al cambio real. Si un avance necesita varias etapas independientes, tendrá varios commits. Se evitará agrupar arreglos ajenos al avance o crear commits que solo pretendan aumentar la cantidad de aportes.

## Distribución de los quince días

| Días | Objetivo |
| --- | --- |
| 1 a 2 | Preparar el proyecto, definir los datos y construir la interfaz inicial. |
| 3 a 5 | Implementar registro y persistencia. |
| 6 a 9 | Implementar y conectar las cinco estructuras. |
| 10 a 11 | Comprobar el flujo completo y corregir errores. |
| 12 a 13 | Publicar y comprobar la aplicación desde internet. |
| 14 a 15 | Completar el documento, README y revisión de entrega. |

## Pantallas

1. Inicio: turnos pendientes y paciente en atención.
2. Mascotas: registro, búsqueda y consulta del historial.
3. Turnos: solicitud de turno, pendientes y llamada del siguiente paciente.
4. Atención: asignación del veterinario y registro de observaciones.
5. Veterinarios y servicios: profesionales y servicios que ofrecen.

## Datos principales

- Propietario: identificador, nombre y contacto.
- Mascota: identificador, propietario, nombre y especie.
- Veterinario: identificador y nombre.
- Servicio: identificador y nombre.
- Relación entre veterinario y servicio: identificadores de ambos.
- Turno: identificador, mascota, servicio, tipo, prioridad, orden de llegada y estado.
- Consulta: identificador, turno, veterinario, fecha y observaciones.

## Reglas de funcionamiento

- Una mascota pertenece a un propietario registrado.
- Un turno solicita un servicio existente.
- Un turno pendiente se encuentra en la cola normal o en el heap de urgencias, según su tipo.
- Las urgencias se atienden antes que los turnos normales. A igual prioridad se conserva el orden de llegada.
- Un veterinario solo puede asignarse si el grafo lo conecta con el servicio del turno.
- Finalizar una atención guarda la consulta y cambia el estado del turno en una misma transacción de base de datos.
- Si falla la persistencia, se conserva o restaura la coherencia de las estructuras en memoria.
- La búsqueda permite distinguir mascotas con el mismo nombre mediante su propietario o identificador.

## Comprobaciones antes de los commits funcionales

- Tres turnos normales salen en el orden en que entraron.
- Una urgencia de mayor prioridad sale antes que otra de menor prioridad; los empates respetan la llegada.
- Con estructuras vacías, llamar al siguiente paciente muestra un mensaje claro.
- Buscar un prefijo devuelve todas las mascotas correspondientes, incluso si comparten nombre.
- El historial conserva las consultas y se puede recorrer después de reiniciar la aplicación.
- La asignación solo ofrece veterinarios relacionados con el servicio solicitado.
- Si no hay un veterinario compatible, el sistema informa la situación y mantiene el turno pendiente.
- Al finalizar una atención, consulta y estado del turno se guardan juntos o se revierten juntos ante un fallo.
- El enlace público permite completar el flujo desde registrar una mascota hasta consultar su atención.

Las comprobaciones se ejecutarán cuando exista la función correspondiente. La planificación inicial no representa una aplicación probada.
