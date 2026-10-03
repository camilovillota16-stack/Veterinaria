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
