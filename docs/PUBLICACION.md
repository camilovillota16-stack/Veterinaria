# Preparar la publicación

Publicado y verificado el 6 de octubre de 2026: [VetTurnos](https://vetturnos-camilo.veterinaria.workers.dev). Usa Cloudflare Workers con SQLite en un Durable Object y el plan gratuito. Se verificaron las cuatro consultas simultáneas, el orden de atención, los historiales y su persistencia después de una nueva publicación. Hay seis mascotas y cuatro profesionales ficticios en la base pública.

## Publicación gratuita con Cloudflare

La interfaz conserva HTML, CSS y JavaScript. El Worker entrega los archivos públicos y envía `/api/*` al objeto `Clinica`. El objeto conserva SQLite y ejecuta el mismo almacén y las mismas estructuras que el servidor local. Las transacciones se ejecutan con `storage.transactionSync`; si una operación falla, se revierten sus escrituras.

Todos los visitantes de esta demostración usan la misma clínica. El identificador `principal` mantiene su base. No cambies este identificador ni elimines la clase `Clinica` durante actualizaciones: seleccionarías otra base o podrías perder la existente.

El alojamiento utiliza la dirección gratuita `workers.dev`; no necesita comprar un dominio. El plan gratuito tiene límites de uso. No se debe activar un plan de pago para esta entrega. Referencias oficiales: [plan gratuito y límites](https://developers.cloudflare.com/durable-objects/platform/pricing/), [SQLite y transacciones](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/) y [archivos públicos](https://developers.cloudflare.com/workers/static-assets/binding/).

Pasos desde la carpeta del proyecto, usando una cuenta gratuita de Cloudflare:

```powershell
npm.cmd ci
npx.cmd wrangler login
npm.cmd test
npm.cmd run web:comprobar
npm.cmd run web:publicar
```

`ci` instala las herramientas con las versiones del archivo de bloqueo. `login` conecta la cuenta en el navegador. `web:comprobar` compila sin publicar. `web:publicar` muestra el enlace real al finalizar. Para probar Cloudflare localmente sin modificar su base pública:

```powershell
npm.cmd run web:probar
```

Abre `http://localhost:3001/`. Los datos del emulador quedan en `.test-data/cloudflare`, excluidos de Git. El servidor local habitual sigue encendiéndose con `npm.cmd start` y usa el puerto 3000.

Wrangler es una dependencia de desarrollo. Se fijó `sharp` en 0.35.5 mediante `overrides` para corregir un aviso de seguridad de su emulador; la instalación informó cero vulnerabilidades. La aplicación publicada no utiliza esta biblioteca de imágenes.

## Servidor local y alternativa de alojamiento Node

Localmente, Node entrega HTML, CSS, JavaScript y la API desde la misma dirección. En Cloudflare, el Worker realiza esa función. Subir únicamente el HTML como una página estática no ejecuta la API ni guarda consultas.

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

Una instalación nueva empieza con una base vacía. El script `datos:demo` carga seis mascotas y cuatro profesionales ficticios. La base local contiene registros del usuario y no se incluye en el código ni se publica como parte del despliegue. Sin argumentos, el comando se dirige al servidor local. Para cargar el enlace público, usa `npm.cmd run datos:demo -- https://DIRECCION-PUBLICA`, reemplazando el origen por el real. La carga no crea visitas ni consultas.

La aplicación académica no tiene usuarios ni permisos: los visitantes del enlace comparten los registros. Utiliza solo ejemplos ficticios. El paquete público contiene únicamente `index.html`, CSS y los cuatro archivos JavaScript de la interfaz; no contiene SQLite, respaldos, código de prueba o credenciales.

## Comprobar antes de entregar

1. Abrir el enlace público desde otro equipo.
2. Registrar una mascota ficticia, solicitar una visita y llamar al siguiente.
3. Comprobar orden normal y urgente y disponibilidad de profesionales.
4. Cerrar con observaciones y consultar el historial.
5. Reiniciar el servicio y comprobar que los registros siguen guardados.
6. Explicar frontend, backend y almacenamiento en el documento final. Los enlaces reales ya figuran en el README.
