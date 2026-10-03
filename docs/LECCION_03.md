# Clase 3 Cola de turnos normales

## Objetivo

Comprender y utilizar una cola FIFO propia. FIFO significa que el primero en entrar es el primero en salir. En la aplicación, el turno que llega primero pasa primero a atención.

La cola es la primera de las cinco estructuras obligatorias. Aunque utiliza nodos enlazados, no la contamos también como la lista del historial: esa será una estructura distinta, con otro uso.

## Probar la aplicación

1. En Mascotas, registra al menos tres pacientes.
2. En Turnos, solicita un turno para cada uno, eligiendo un servicio.
3. Observa que aparecen en el orden en que solicitaste los turnos.
4. Pulsa Llamar siguiente. El primero deja la espera y aparece en atención.
5. Pulsa Cerrar turno para poder llamar al siguiente.
6. Recarga. La espera y el paciente en atención se recuperan de la base de datos.

En la versión de esta clase, una mascota con turno activo no podía recibir otro y quedaba deshabilitada. La clase 4 amplía ese flujo: se puede seleccionar su visita activa y cambiar los servicios sin crear otro turno. El cierre sigue siendo administrativo: la consulta y su historial se incorporarán después.

## La clase Cola

Abre `estructuras/cola.mjs`. Una clase describe cómo crear objetos que comparten datos y operaciones. `new Cola()` crea una cola independiente y ejecuta su `constructor`.

```javascript
constructor() {
  this.primero = null;
  this.ultimo = null;
  this.cantidad = 0;
}
```

`this` hace referencia a esa cola. `primero` y `ultimo` empiezan en `null` porque no hay ningún nodo. `cantidad` cuenta los elementos.

## El nodo

Un nodo es un objeto que guarda un valor y una conexión al siguiente nodo:

```javascript
const nodo = { valor, siguiente: null };
```

El valor será un turno. El último nodo tiene `siguiente: null` porque no hay otro después.

```text
primero → [Luna] → [Max] → [Henry] → null
                            ↑
                          ultimo
```

## Encolar

Lee `encolar(valor)`. Si existe un último nodo, conectamos su propiedad `siguiente` con el nuevo. Si la cola estaba vacía, el nuevo también será el primero. Después actualizamos `ultimo` e incrementamos `cantidad`.

```javascript
const cola = new Cola();
cola.encolar("Luna");
cola.encolar("Max");
```

Ahora el primero es Luna y el último es Max.

## Desencolar

Lee `desencolar()`. Guardamos el valor del primer nodo y movemos `primero` a su nodo siguiente. Disminuimos la cantidad. Si la cola queda vacía, también ponemos `ultimo` en `null`. Finalmente devolvemos el valor retirado.

```javascript
cola.desencolar(); // Devuelve "Luna"
cola.verPrimero(); // Devuelve "Max", sin retirarlo
```

Encolar y desencolar cuestan O(1): cada operación modifica unas pocas referencias, sin recorrer toda la cola.

## Relación con SQLite

La tabla `turnos` contiene mascota, servicio y estado: `pendiente`, `en_atencion` o `finalizado`. El identificador del turno conserva el orden de llegada en esta versión.

En `db/database.mjs`, `reconstruirCola` lee los pendientes ordenados por identificador y los encola. Esto cuesta O(n), donde n es la cantidad de turnos pendientes. Lo hacemos antes de las operaciones para mantener la cola coherente con los datos persistentes.

Al registrar un turno, se guarda en SQLite y se encola para obtener su posición. Al llamar al siguiente, se desencola y se cambia su estado a `en_atencion` dentro de una transacción. Si el cambio falla, se revierte y la próxima reconstrucción recupera el mismo primer turno.

`aArray()` recorre los nodos para producir una representación que se puede enviar como JSON. La cola almacena nodos y referencias; el arreglo es solo una forma de mostrar su contenido.

## Archivos del avance

| Archivo | Responsabilidad |
| --- | --- |
| `estructuras/cola.mjs` | Implementar encolar, desencolar, consultar y recorrer la cola. |
| `db/database.mjs` | Guardar turnos, reconstruir la cola y actualizar estados en transacciones. |
| `api/servidor.mjs` | Exponer las rutas para consultar, solicitar, llamar y cerrar turnos. |
| `js/turnos.js` | Leer selecciones, hacer solicitudes y mostrar espera y atención actual. |
| `tests/turnos.test.mjs` | Comprobar FIFO, persistencia, duplicados y recuperación ante fallos. |

## Ejercicio para explicar el código

Escribe el estado de `primero`, `ultimo` y `cantidad` después de cada operación:

```javascript
const cola = new Cola();
cola.encolar("Henry");
cola.encolar("Luna");
cola.desencolar();
```

Después encuentra en el backend la línea que llama a `cola.desencolar()` y explica por qué necesitamos confirmar el cambio en SQLite antes de informar al usuario que el paciente pasó a atención.
