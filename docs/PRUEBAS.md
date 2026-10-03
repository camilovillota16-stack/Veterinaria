# Verificación de la clase 1

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
