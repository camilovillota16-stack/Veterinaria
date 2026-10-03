# Clase 2 Guardar y recuperar mascotas

## Objetivo

Comprender cómo el navegador envía una mascota al servidor y cómo SQLite la conserva después de recargar la página o reiniciar el servidor. Este avance añade el backend y la persistencia; las cinco estructuras de la rúbrica se implementarán en las siguientes clases.

## Las tres piezas

| Pieza | Dónde se ejecuta | Responsabilidad |
| --- | --- | --- |
| Interfaz `js/app.js` | Navegador | Leer el formulario, enviar los datos y mostrar las respuestas. |
| API `api/servidor.mjs` | Node.js | Recibir solicitudes GET y POST, validar su contenido y responder. |
| Almacén `db/database.mjs` | Node.js | Consultar y guardar registros en el archivo SQLite. |

`server.mjs` inicia el almacén y la API. El comando sigue siendo `npm.cmd start`. Node.js 24 incluye el módulo utilizado; no necesitamos instalar paquetes adicionales.

## Enviar la mascota

La función `registrarMascota` conserva las validaciones anteriores. Ahora es `async` porque debe esperar la respuesta del servidor:

```javascript
const respuesta = await fetch("/api/mascotas", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(mascota),
});
```

- `fetch` hace una solicitud HTTP al servidor.
- `POST` indica que enviamos un registro nuevo.
- `JSON.stringify` convierte nuestro objeto JavaScript en texto JSON para transportarlo.
- `Content-Type` indica el formato del contenido.
- `await` espera el resultado de esa operación dentro de una función `async`.

Después leemos la respuesta:

```javascript
const resultado = await respuesta.json();
if (!respuesta.ok) throw new Error(resultado.error);
```

`respuesta.json()` interpreta el texto JSON recibido y produce un valor JavaScript. `respuesta.ok` comprueba si el código HTTP indica éxito. En nuestro registro exitoso el servidor devuelve 201 y el objeto guardado, con sus identificadores.

La tarjeta se añade solo cuando el servidor confirma el guardado. Mientras esperamos, el botón está deshabilitado para evitar varios envíos por clics repetidos. Si falla la operación, los campos se conservan y aparece un mensaje. Ante una respuesta perdida por un problema de conexión, se debe recargar y comprobar si el registro existe antes de repetir el envío.

## Las tablas

SQLite organiza registros en tablas. Cada fila corresponde a un registro y cada columna a una propiedad.

- `propietarios` guarda nombre y teléfono, junto con las claves usadas para evitar repetir el mismo propietario.
- `mascotas` guarda nombre, especie, raza, fecha y `propietario_id`.
- `id` identifica una fila. `propietario_id` conecta la mascota con la fila de su propietario mediante una clave foránea.

Una persona puede tener varias mascotas. En esta primera versión reutilizamos al propietario si coinciden su nombre sin distinguir mayúsculas y los dígitos del teléfono. El teléfono por sí solo no identifica a una persona: dos propietarios con distinto nombre pueden compartirlo.

## La transacción

En `db/database.mjs`, busca:

```javascript
conexion.exec("BEGIN IMMEDIATE");
```

Inicia la transacción. Dentro de `try` guardamos o buscamos al propietario y después insertamos su mascota. Si todo funciona:

```javascript
conexion.exec("COMMIT");
```

Si una operación falla, `catch` ejecuta:

```javascript
conexion.exec("ROLLBACK");
```

Así evitamos crear un propietario nuevo sin su mascota cuando falla la segunda operación. Las pruebas simulan ese fallo y comprueban que los registros previos permanecen intactos.

Los signos `?` de las consultas SQL son parámetros. Los valores se pasan con `run(...)`, de modo que nombres con comillas se guardan como datos.

## Recuperar los datos

Al abrir la página se ejecuta `cargarMascotas`:

```javascript
const respuesta = await fetch("/api/mascotas");
const guardadas = await respuesta.json();
```

Al no especificar un método, `fetch` usa GET. El servidor consulta SQLite y devuelve el arreglo de registros. La interfaz llena su copia en memoria y dibuja las tarjetas.

Al recargar, el arreglo del navegador vuelve a empezar vacío, pero esta vez lo rellenamos con los registros de la base de datos. Si falla la carga, se muestra un error y un botón para volver a intentarlo.

## Práctica

1. Registra una mascota con raza y otra sin raza.
2. Recarga la página. Ambas deben seguir apareciendo.
3. Detén el servidor con Ctrl+C y vuelve a iniciarlo con `npm.cmd start`. Recarga y comprueba que los registros siguen ahí.
4. Abre `http://localhost:3000/api/mascotas`. Verás el JSON que la interfaz recibe.
5. Encuentra en el código el POST que envía y el GET que recupera. Explica cuál de los dos usa `JSON.stringify` y por qué.

## Dónde quedan los registros

El archivo local es `data/veterinaria.db`. Se crea automáticamente y conserva tus datos. Está excluido de Git: subimos el código y el esquema que lo crea, mientras cada instalación mantiene su propia base de datos.

Los registros temporales que se crearon antes de esta clase no se migran automáticamente. El almacenamiento persistente aplica a los nuevos registros realizados con esta versión.

## Comprobar el avance

`npm.cmd test` ejecuta pruebas de persistencia, transacciones, validaciones y API con datos de prueba independientes. No requiere detener la aplicación principal.
