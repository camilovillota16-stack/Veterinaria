# Plan de implementación

## Alcance y decisiones pendientes

El proyecto será desarrollado por una persona, con JavaScript y un plazo de quince días. La interfaz utiliza HTML y CSS; el backend utiliza Node.js y la persistencia utiliza SQLite a través del módulo incluido `node:sqlite`. Queda pendiente seleccionar los servicios de publicación, incluido un almacenamiento persistente para la base de datos.

El 6 de octubre se eligió la publicación gratuita en Cloudflare Workers con SQLite persistente en un Durable Object. El servidor Node local se conserva y comparte las reglas del almacén con la versión publicada. Los datos públicos serán ficticios e independientes de la base local.

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

1. Inicio: turnos pendientes y acceso a recepción.
2. Mascotas: registro, búsqueda y consulta del historial.
3. Turnos: solicitud de turno, pendientes y llamada del siguiente paciente.
4. Atención: asignación del veterinario y registro de observaciones.
5. Veterinarios y servicios: profesionales y servicios que ofrecen.

## Datos principales

- Propietario: identificador, nombre y contacto.
- Mascota: identificador, propietario, nombre, especie y raza opcional.
- Veterinario: identificador y nombre.
- Servicio: identificador y nombre.
- Relación entre veterinario y servicio: identificadores de ambos.
- Turno o visita: identificador, mascota, veterinario asignado, motivo opcional, tipo, prioridad, orden de llegada y estado.
- Servicio de una visita: identificadores del turno y del servicio; una visita admite varios servicios.
- Consulta: identificador, turno, mascota, veterinario, fecha, observaciones y copia del nombre del profesional, servicios, motivo y clasificación al cerrar.

## Reglas de funcionamiento

- Una mascota pertenece a un propietario registrado.
- Un turno solicita uno o varios servicios existentes, sin repetirlos. Una mascota solo puede tener una visita activa.
- Cambiar los servicios o el motivo de una visita activa conserva su estado y orden de llegada; una visita finalizada ya no se modifica.
- Un turno pendiente se encuentra en la cola normal o en el heap de urgencias, según su tipo.
- Las urgencias se atienden antes que los turnos normales. A igual prioridad se conserva el orden de llegada.
- La prioridad urgente va de 1 (baja) a 3 (alta); los normales tienen prioridad 0. Solo se reclasifican visitas pendientes, conservando su llegada original.
- Cada veterinario puede atender a una mascota distinta al mismo tiempo. Un profesional ocupado queda fuera de la selección para el próximo paciente. Una urgencia no interrumpe consultas abiertas.
- Un solo veterinario cubre todos los servicios de la visita. El grafo obtiene los vecinos comunes de los servicios y la interfaz permite escoger entre ellos. Sin profesional compatible, el próximo paciente conserva su posición pendiente.
- Editar los servicios de la atención o del profesional asignado no puede invalidar la asignación actual. Las atenciones antiguas sin profesional requieren asignarlo antes de cerrar.
- El profesional asignado se conserva durante la consulta. Cada atención tiene su propio cierre, que solo libera al veterinario correspondiente. La pantalla Veterinarios muestra Disponible u Ocupado y permite registrar más profesionales mientras hay consultas abiertas.
- El orden de llamada respeta prioridad y llegada; el orden de cierre depende de la duración de cada consulta y puede ser distinto.
- Finalizar una atención guarda la consulta y cambia el estado del turno en una misma transacción de base de datos.
- Las observaciones son opcionales y admiten hasta 2000 caracteres. El historial muestra solo consultas finalizadas, de la más reciente a la más antigua, mediante una lista enlazada propia.
- Los cambios posteriores al profesional no modifican la copia guardada en el historial. Las visitas anteriores a esta función se recuperan con sus datos disponibles y sin inventar información faltante.
- Si falla la persistencia, se conserva o restaura la coherencia de las estructuras en memoria.
- La búsqueda por prefijo del nombre o propietario permite distinguir mascotas con el mismo nombre mediante su propietario o identificador.

## Comprobaciones antes de los commits funcionales

- Tres turnos normales salen en el orden en que entraron.
- Una urgencia de mayor prioridad sale antes que otra de menor prioridad; los empates respetan la llegada.
- Con estructuras vacías, llamar al siguiente paciente muestra un mensaje claro.
- Buscar un prefijo devuelve todas las mascotas correspondientes, incluso si comparten nombre.
- El historial conserva las consultas y se puede recorrer después de reiniciar la aplicación.
- La asignación solo ofrece veterinarios relacionados con todos los servicios solicitados.
- Si no hay un veterinario compatible, el sistema informa la situación y mantiene el turno pendiente.
- Al finalizar una atención, consulta y estado del turno se guardan juntos o se revierten juntos ante un fallo.
- El enlace público permite completar el flujo desde registrar una mascota hasta consultar su atención.

Las comprobaciones se ejecutarán cuando exista la función correspondiente. La planificación inicial no representa una aplicación probada.

## Estado después de la clase 7

Las cinco estructuras ya participan en el flujo de la aplicación y las consultas persisten después del cierre y del reinicio. Pasaron 49 pruebas automatizadas; las comprobaciones del navegador están en PRUEBAS.md. Faltan la publicación, la comprobación desde los enlaces públicos y el documento final de entrega.
