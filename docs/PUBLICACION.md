# Preparar la publicación

Estado al 6 de octubre de 2026: código preparado para configurar la dirección de escucha y aceptar solicitudes del origen público HTTPS. Todavía no hay un servicio publicado ni un enlace verificado. La elección del almacenamiento depende del presupuesto.

## Qué publicamos

El servidor Node entrega HTML, CSS, JavaScript y la API desde la misma dirección. No necesitamos separar el frontend del backend. Subir el HTML como una página estática no ejecuta la API ni guarda consultas.

El servidor usa Node.js 24 o superior y no tiene dependencias externas. Comando de inicio: `npm start`. Comprobación antes del despliegue: `npm test`. En un alojamiento Node, configura la versión 24 y el comando de construcción `npm test`.

## Configuración del servidor

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto asignado por el alojamiento; localmente 3000. |
| `HOST` | `0.0.0.0` para que el alojamiento pueda recibir tráfico; localmente se conserva `127.0.0.1`. |
| `PUBLIC_URL` | Origen completo de la aplicación, por ejemplo `https://nombre.example.com`, sin ruta ni parámetros. |
| `RENDER_EXTERNAL_URL` | Dirección que Render proporciona automáticamente; se usa si no se configura `PUBLIC_URL`. |
| `VETERINARIA_DB_PATH` | Archivo SQLite dentro del almacenamiento persistente del servidor. |

La dirección pública configurada permite validar el encabezado Origin aunque el alojamiento reciba HTTPS y lo reenvíe por HTTP a Node. No se aceptan orígenes ajenos. Esta validación no es un sistema de usuarios o permisos: la aplicación académica sigue sin autenticación.

La configuración local no necesita estas variables. Un archivo `.env` no se carga automáticamente; las variables deben configurarse en el panel del alojamiento o en el entorno que inicia Node.

## SQLite necesita almacenamiento persistente

Render ofrece discos persistentes para servicios de pago. Su servicio gratuito no conserva archivos SQLite al reiniciarse, volver a desplegarse o detenerse por inactividad. Por eso no debemos tratar una base en su disco temporal como persistente. Una alternativa gratuita requiere otro almacenamiento compatible y adaptar y probar la capa de base de datos.

Referencias oficiales, revisadas el 6 de octubre de 2026: [planes gratuitos](https://render.com/docs/free), [discos persistentes](https://render.com/docs/disks), [precios](https://render.com/pricing), [variables de entorno](https://render.com/docs/environment-variables) y [configuración de servicios web](https://render.com/docs/web-services).

## Datos de demostración

Una instalación nueva empieza con una base vacía. Prepararemos allí mascotas y profesionales ficticios. La base local contiene registros del usuario y no se incluye en el código ni se publicará como parte del despliegue. El comando `datos:demo` actual se dirige al servidor local; no carga automáticamente el servidor público.

## Comprobar antes de entregar

1. Abrir el enlace público desde otro equipo.
2. Registrar una mascota ficticia, solicitar una visita y llamar al siguiente.
3. Comprobar orden normal y urgente y disponibilidad de profesionales.
4. Cerrar con observaciones y consultar el historial.
5. Reiniciar el servicio y comprobar que los registros siguen guardados.
6. Añadir al README los enlaces reales y explicar frontend, backend y almacenamiento en el documento final.
