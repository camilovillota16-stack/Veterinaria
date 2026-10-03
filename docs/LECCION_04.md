# Clase 4 Varios servicios y búsqueda de mascotas

## El problema que detectaste

Henry puede necesitar consulta y vacunación en la misma visita. Crear dos turnos separaría esa visita y ocuparía dos posiciones. Ahora una visita tiene varios servicios, pero sigue siendo un solo elemento de la cola.

También necesitamos encontrar una mascota cuando hay 150 registros. En Turnos hay un campo de búsqueda por nombre o propietario, separado del selector de resultados.

## Probar los cambios

1. Abre Turnos y escribe `hen` en Buscar mascota o propietario.
2. Selecciona Henry. Si tiene una visita activa, verás su número y sus servicios marcados.
3. Marca Consulta general y Vacunación (conserva marcados todos los que necesite).
4. Escribe `Le duele la cola` en Motivo de la consulta.
5. Pulsa Añadir a la cola para una visita nueva, o Guardar cambios de la visita si ya existe.
6. Comprueba que aparece un solo turno con los servicios y el motivo. Si ya existía, conserva su número y posición.
7. Recarga: servicios y motivo siguen en espera o en atención. Puedes volver a buscar y seleccionar la mascota para editar su visita.

Las casillas representan la selección completa: al desmarcar un servicio y guardar, lo quitas de esa visita. Puedes editar mientras esté pendiente o en atención; después de cerrar la visita debes solicitar una nueva.

## Un objeto puede contener un arreglo

Antes enviábamos un servicio. Ahora enviamos un arreglo de identificadores:

```javascript
const visita = {
  mascotaId: 1,
  serviciosIds: [1, 2],
  motivo: "Le duele la cola"
};
```

`visita.serviciosIds.length` devuelve 2. Eso significa dos servicios; no dos visitas ni dos mascotas. Consulta general es el servicio; el dolor de cola es el motivo indicado por el propietario, no un diagnóstico.

## La relación en SQLite

La tabla `turnos` guarda la visita y `turno_servicios` guarda sus servicios:

| turno_id | servicio_id |
| --- | --- |
| 1 | 1 |
| 1 | 2 |

Ambas filas pertenecen al turno 1. Guardamos todos los cambios en una transacción: si un servicio falla, se revierte la operación completa. Una migración recupera los servicios de los turnos de la versión anterior, sin borrar mascotas ni turnos.

## La segunda estructura: el trie

Un trie es un árbol de letras. Para buscar `hen`, recorremos las conexiones `h → e → n`. Ese nodo conserva los identificadores cuyos nombres tienen ese prefijo. `estructuras/trie.mjs` contiene nuestra implementación propia.

Cada nodo tiene un `Map` de letras a nodos hijos y un `Set` de identificadores. El Set evita repetir la misma mascota si varias claves coinciden; mascotas distintas con el mismo nombre conservan sus identificadores propios.

El índice incluye el nombre de la mascota, el nombre del propietario y sus palabras. Por eso `villo` encuentra Villota y `garci` encuentra García. Convertimos a minúsculas y retiramos las tildes antes de insertar y buscar. Es una búsqueda por inicio de una palabra: `enry` no encuentra Henry.

El backend construye el trie al iniciar y añade cada mascota nueva después de confirmar su registro. Buscar recorre el prefijo y recupera sus identificadores; no recorre todos los nombres para comprobar si coinciden.

El selector muestra hasta 30 coincidencias (más la mascota seleccionada si también coincide). Si hay muchas, escribe más letras. Cada opción muestra mascota, propietario e identificador para distinguir nombres iguales.

## ¿Por qué esperamos un momento al escribir?

`setTimeout` espera 200 milisegundos antes de consultar. `clearTimeout` cancela la consulta programada si sigues escribiendo. Una revisión numérica descarta las respuestas de búsquedas anteriores para que una respuesta lenta no reemplace la búsqueda más reciente.

## Archivos para leer

- `index.html`: buscador, selector, casillas y motivo.
- `js/turnos.js`: recoge el arreglo de casillas marcadas y decide entre crear o actualizar.
- `db/database.mjs`: transacciones, migración y construcción del índice.
- `estructuras/trie.mjs`: nodos, inserción y búsqueda por prefijo.
- `tests/visitas-busqueda.test.mjs`: búsquedas, visitas múltiples, migración y reversión ante fallos.

En esta clase completamos dos de las cinco estructuras: cola y trie. La clase 5 incorpora el heap de urgencias. La lista del historial y el grafo se implementarán después.
