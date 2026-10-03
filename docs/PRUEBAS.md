# Verificación del proyecto

## Clase 1 Registro temporal

Comprobaciones realizadas el 3 de octubre de 2026 con Node.js 24.14.1 y el navegador integrado de Codex.

| Comprobación | Resultado observado |
| --- | --- |
| Sintaxis de `server.mjs` y `js/app.js` mediante `node --check` | Sin errores. |
| Entrega de HTML y JavaScript por el servidor local | Respuestas HTTP 200. |
| Solicitud de un archivo ajeno a la interfaz, como `/README.md` | Respuesta HTTP 404. |
| Registrar Luna y Nala como gatos y Max como perro | Tres tarjetas, tres mascotas y dos especies en Inicio. |
| Nombre compuesto solo por espacios | Mensaje de validación; el registro no se añade. |
| Teléfono compuesto por letras | Mensaje de validación; el registro no se añade. |
| Enviar un formulario válido con Enter | Mascota registrada y formulario reiniciado. |
| Registrar una raza con espacios en los extremos, como `   Siamés   ` | La tarjeta muestra `Raza: Siamés`. |
| Registrar una mascota sin raza | Registro aceptado; la tarjeta muestra `Raza: Sin especificar`. |
| Navegación entre Inicio y Mascotas | Pantalla y título actualizados sin perder los registros. |
| Enlace de teclado Ir al contenido desde Mascotas | Mantiene la pantalla Mascotas y mueve el foco al contenido. |
| Recargar la página | Registros borrados y estado vacío mostrado, como corresponde a la versión en memoria. |
| Vista de escritorio de 1280 por 900 | Inicio y formulario legibles, sin superposición observada. |
| Vista móvil de 390 por 844 | Contenido en una columna, sin desbordamiento horizontal observado. |

Estas comprobaciones corresponden a la interfaz y el registro temporal. La API, la base de datos y las cinco estructuras propias se verificarán cuando se implementen.

## Clase 2 Persistencia y API

Ocho pruebas automatizadas pasaron con `npm.cmd test` el 3 de octubre de 2026. Utilizan bases independientes de `data/veterinaria.db`.

- Persistencia al cerrar y volver a abrir el archivo SQLite.
- Reutilización del propietario al variar mayúsculas y separadores del teléfono, distinguiendo propietarios con distinto nombre.
- Raza opcional y nombres con comillas tratados como datos.
- Rechazo de campos inválidos desde el backend.
- Reversión del propietario nuevo ante un fallo simulado al insertar la mascota; los registros anteriores permanecen intactos.
- Registro mediante POST y recuperación mediante GET.
- Respuestas ante JSON inválido, campos inválidos y contenido excesivo.
- Restricción de archivos entregados, métodos y orígenes de solicitudes.

Comprobaciones manuales en el navegador, con una base de prueba en el puerto 3001:

| Comprobación | Resultado observado |
| --- | --- |
| Registrar Luna persistente con raza y Max persistente sin raza | Dos tarjetas con la información correspondiente. |
| Recargar la página | Ambas mascotas se recuperan de SQLite. |
| Detener el servidor, volver a iniciarlo y recargar | Ambas mascotas siguen disponibles. |
| Enviar un registro mientras el servidor está detenido | Mensaje de error, campos conservados y ninguna tarjeta del registro fallido. |

La aplicación principal usa el puerto 3000 y su propio archivo `data/veterinaria.db`. Esta comprobación corresponde a la clase 2, antes de implementar la cola.

## Clase 3 Cola de turnos normales

Las 14 pruebas automatizadas pasaron con `npm.cmd test`: las ocho de persistencia y API, más seis de cola y turnos.

- FIFO con operaciones intercaladas, cola vacía y reutilización.
- Conversión a arreglo sin alterar el orden interno de los nodos.
- Orden de llegada independiente del nombre o identificador de la mascota, rechazo de duplicados y cierre obligatorio del turno activo.
- Recuperación de la espera y del paciente en atención al volver a abrir SQLite.
- Reversión de un fallo simulado al llamar un turno, conservando al primer paciente pendiente.
- Flujo de API de solicitud, llamada y cierre, con validación de referencias.

Comprobación manual con una base independiente en el puerto 3001: se registraron Luna, Max y Henry y se solicitaron turnos en el orden Max, Luna, Henry. Max fue llamado primero; la recarga mantuvo a Max en atención y a Luna y Henry en espera. Tras cerrar a Max, se llamó a Luna. Las mascotas con turno activo aparecieron deshabilitadas en el selector.

Se revisó la pantalla de escritorio y la de móvil de 360 por 800. Tras ajustar la navegación, el ancho del contenido y el ancho disponible eran ambos 345 píxeles, sin desbordamiento horizontal. Al reiniciar la aplicación principal se comprobó que su mascota registrada seguía disponible.

La cola está implementada. El historial con lista enlazada, las urgencias con heap, la búsqueda con trie, el grafo y la publicación siguen pendientes.

## Clase 4 Visitas y búsqueda por trie

Las 22 pruebas automatizadas pasaron el 3 de octubre de 2026: las 14 anteriores más ocho de visitas y búsqueda. Cubren prefijos, tildes, mayúsculas, nombres repetidos, búsqueda entre 150 registros, incorporación de nuevas mascotas al índice, varios servicios en una visita, edición en espera y en atención sin cambiar FIFO, validación, persistencia, migración de la versión anterior y reversión completa ante fallos simulados al guardar servicios.

Se comprobó el navegador con 153 mascotas sintéticas en una base independiente en el puerto 3001:

| Comprobación | Resultado observado |
| --- | --- |
| Abrir el selector sin búsqueda | 153 coincidencias; primeras 30 visibles y aviso para escribir más letras. |
| Buscar `hen` | Henry encontrado, aunque su identificador es 151. |
| Crear una visita con Consulta general, Vacunación y motivo | Una sola posición en espera con ambos servicios y el motivo. |
| Añadir Control a la misma visita | Mismo número de turno y misma posición. |
| Buscar `garci` | Ámbar del propietario Ana García, sin necesitar escribir la tilde. |
| Buscar `amba` | Dos mascotas Ámbar, distinguibles por propietario e identificador. |
| Buscar un nombre inexistente | Mensaje sin coincidencias y botón de solicitud deshabilitado. |
| Crear otra visita y llamar al siguiente | Henry pasó primero a atención; la segunda mascota quedó en espera. |
| Editar los servicios de Henry en atención | Conservó su número y estado; desmarcar Control lo retiró de la visita. |
| Recargar | Servicios, motivo, atención actual y espera conservados. |
| Cambiar de mascota | No se mezclaron casillas ni motivo entre pacientes. |
| Vista móvil de 360 por 800 | Ancho disponible y del contenido de 345 píxeles, sin desbordamiento horizontal. |

La cola y el trie están implementados: dos de las cinco estructuras. Quedan pendientes historial, urgencias, grafo y publicación. Los registros sintéticos no se añadieron a la base principal ni al repositorio.

## Clase 5 Heap de urgencias

Las 30 pruebas automatizadas pasaron el 3 de octubre de 2026. Las ocho nuevas cubren inserciones y extracciones intercaladas del heap, vacío y reutilización, 500 entradas comparadas con el orden esperado, una vista que no consume el heap, urgencias antes que normales, desempate por llegada, clasificación inválida, reclasificación sin perder la llegada, atención actual protegida, edición de servicios sin perder prioridad, reinicio, migración de urgentes antiguos, reversión ante fallos en clasificación o llamada y flujo HTTP.

La prueba del navegador utilizó una base independiente en el puerto 3001. Se prepararon Luna normal, Max urgente de prioridad 2 y Rocky urgente de prioridad 3. Desde el formulario se registró Nala urgente de prioridad 3. La espera mostró Rocky, Nala, Max, Luna. Al llamar al siguiente, Rocky pasó a atención y Nala quedó como próxima, seguida por Max y Luna. La recarga conservó estados y prioridades; al seleccionar a Rocky, los campos de tipo y prioridad estaban bloqueados y los servicios seguían editables.

Se revisó el escritorio mediante captura completa y el ancho móvil de 360 por 800: contenido y ancho disponible de 345 píxeles, sin desbordamiento horizontal. Se reinició el servidor principal con la migración de prioridad; la prueba no añadió mascotas ni turnos sintéticos a su base.

Hay tres estructuras implementadas: cola, trie y heap. Quedan pendientes el grafo, la lista del historial y la publicación.

## Registros para practicar la demostración

Se ejecutó `npm.cmd run datos:demo` con el servidor principal en el puerto 3000: se registraron seis mascotas ficticias mediante la API. La consulta de SQLite confirmó siete mascotas incluyendo Henry y cinco propietarios en total. Hay dos Luna, pertenecientes a propietarios distintos, y tres especies. Se conservan los dos turnos finalizados anteriores y no se crearon turnos adicionales durante la carga.

Una segunda ejecución indicó cero mascotas nuevas y seis ejemplos ya existentes. La recarga del navegador principal mostró siete mascotas y tres especies en Inicio. Los ejemplos persisten en la base principal; el repositorio contiene el script y la guía de demostración, mientras el archivo SQLite permanece excluido de Git.

## Clase 6 Grafo y asignación de veterinarios

Las 38 pruebas automatizadas pasaron el 3 de octubre de 2026. Las ocho nuevas cubren conexiones bidireccionales y vecinos comunes, validación y edición de profesionales, cobertura de todos los servicios por un mismo profesional, falta de compatibles sin perder ni saltar urgencias, selección del próximo paciente desactualizada, edición y reasignación conservando compatibilidad, persistencia, migración de visitas antiguas sin profesional, reversión de nombre y conexiones ante fallos simulados y rutas HTTP. Las pruebas anteriores incorporan un profesional de prueba como requisito para llamar; la base nueva de la aplicación no crea profesionales automáticamente.

Comprobación del navegador con una base independiente en el puerto 3001:

| Comprobación | Resultado observado |
| --- | --- |
| Luna pendiente con Consulta general y Vacunación, sin profesionales | Llamar siguiente deshabilitado; mensaje para registrar un profesional compatible. |
| Registrar Ana con solo Consulta general | Sigue sin haber profesional compatible; Luna permanece pendiente. |
| Registrar Bruno con los tres servicios | El selector del próximo paciente muestra solo Bruno. |
| Llamar a Luna y recargar | Atención y asignación a Bruno conservadas. |
| Editar Ana para añadir Vacunación | Ana aparece también como compatible al volver a Turnos. |
| Reasignar la atención a Ana y recargar | La tarjeta y el selector conservan Ana. |
| Turnos y Veterinarios en móvil de 360 por 800 | Contenido y ancho disponible de 345 píxeles, sin desbordamiento horizontal. |

Se reinició el servidor principal con la migración del veterinario. La carga de demostración conservó las seis mascotas existentes y añadió dos profesionales ficticios. Repetirla reconoció ambos profesionales sin duplicarlos. El navegador principal muestra Ana con Consulta general y Control y Bruno con los tres servicios. No se añadieron visitas de prueba a la base principal.

Hay cuatro estructuras implementadas: cola, trie, heap y grafo. Quedan pendientes la lista enlazada del historial, el registro de observaciones y la publicación.

## Ajuste de disponibilidad y consulta abierta

Pasaron las 39 pruebas automatizadas. Se actualizó la prueba de asignación para rechazar cambios de veterinario durante una consulta y se añadió la comprobación de ocupado/disponible: un profesional ocupado queda fuera de las opciones disponibles, sigue existiendo una sola atención y vuelve a estar disponible al cerrar. Las visitas antiguas sin profesional todavía pueden completar su asignación.

Se comprobó en una base de prueba independiente: Luna en atención con Ana y Max en espera. Turnos mostró el nombre de Ana como ocupada, sin selector para cambiarla ni selector del próximo veterinario. Veterinarios mostró Ana ocupada y Bruno disponible. Al cerrar a Luna, reapareció la selección del próximo profesional con Ana y Bruno, y Llamar siguiente quedó habilitado. Este ajuste mantiene una sola consulta abierta en toda la veterinaria.

## Consultas simultáneas por veterinario

Este avance reemplaza el límite general de una consulta descrito en el ajuste anterior. Ahora cada veterinario puede tener una consulta abierta con un paciente diferente; los profesionales ocupados quedan fuera de la selección. Se conserva el profesional de cada consulta hasta cerrarla.

Pasaron las 43 pruebas automatizadas. Las nuevas y actualizadas cubren varias atenciones, cierre por identificador sin afectar las otras, profesional ocupado rechazado, registro de un tercer profesional durante dos consultas, migración del antiguo índice general, índice único por veterinario, persistencia tras reinicio, reversión de un cierre fallido, API y validación de cierre ambiguo. También se comprobó que elegir otro veterinario no salta al primer paciente y que una urgencia sigue pasando antes que los normales pendientes.

En una base independiente se preparó Henry demo con Ana y Luna demo como próxima. El navegador ofreció solo Bruno para Luna y permitió llamarla sin cerrar a Henry. La recarga conservó ambas tarjetas y sus botones independientes. Con ambos ocupados, Max demo esperó. Se registró Carla desde Veterinarios; al regresar apareció como disponible para Max sin cerrar ninguna consulta. Al cerrar a Luna, Henry siguió en atención, Bruno reapareció disponible y Max conservó su lugar. El orden de llamada se conserva; la duración permite que Luna termine antes que Henry.

La vista móvil de 360 por 800 mantuvo un ancho de contenido y disponible de 345 píxeles. Los datos y consultas de prueba no se añadieron a la base principal.
