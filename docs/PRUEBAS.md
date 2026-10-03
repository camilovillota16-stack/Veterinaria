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

La aplicación principal usa el puerto 3000 y su propio archivo `data/veterinaria.db`. El despliegue público y las cinco estructuras propias siguen pendientes.
