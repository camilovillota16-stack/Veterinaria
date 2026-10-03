# Clase 6: veterinarios y grafo

Ahora podemos registrar profesionales, marcar qué servicios ofrecen y asignar uno compatible al atender una visita. Cola, trie, heap y grafo ya participan en el programa. La quinta estructura será la lista enlazada del historial.

## Primero prueba la función

1. Recarga la aplicación y abre Veterinarios. La carga de demostración incluye Ana y Bruno.
2. Ana ofrece Consulta general y Control; Bruno ofrece los tres servicios.
3. En Turnos, busca una mascota sin visita activa y solicita Consulta general y Vacunación.
4. Cuando sea el próximo paciente, observa el selector: solo debe ofrecer Bruno.
5. Llama al siguiente. La tarjeta En atención muestra al profesional asignado.
6. Recarga: la visita y el veterinario continúan guardados. Luego cierra el turno.

Si antes hay otros pacientes pendientes, se respeta el heap y la cola. Para experimentar con otro profesional, regístralo desde Veterinarios y marca sus servicios. Al regresar a Turnos se actualizan las opciones. Las mascotas de esta práctica son ficticias.

## Qué significa grafo

Un grafo representa elementos y conexiones entre ellos. Los elementos son **vértices** y las conexiones son **aristas**. Aquí los vértices son profesionales y servicios; una arista significa «este profesional ofrece este servicio».

```text
Ana ─── Consulta general ─── Bruno
Ana ─── Control ──────────── Bruno
        Vacunación ──────── Bruno
```

Para una visita con consulta y vacunación:

- Vecinos de Consulta general: Ana y Bruno.
- Vecinos de Vacunación: Bruno.
- Vecinos comunes: Bruno. Es el único que puede atender toda esa visita.

Se llama grafo bipartito porque sus vértices pertenecen a dos grupos y las conexiones van entre grupos. No estamos conectando una mascota con otra: el grafo resuelve la asignación de profesionales.

## Cómo lo escribimos en JavaScript

La implementación propia está en `estructuras/grafo.mjs`. Un `Map` guarda cada vértice con su conjunto de vecinos. Un `Set` evita repetir conexiones.

```javascript
const grafo = new Grafo();
grafo.agregarVertice("veterinario:2");
grafo.agregarVertice("servicio:1");
grafo.agregarVertice("servicio:2");
grafo.conectar("veterinario:2", "servicio:1");
grafo.conectar("veterinario:2", "servicio:2");

grafo.vecinosComunes(["servicio:1", "servicio:2"]);
// Devuelve ["veterinario:2"].
```

El prefijo distingue al veterinario 2 del servicio 2. `conectar` guarda ambas direcciones, de modo que podemos preguntar tanto qué servicios ofrece un profesional como quiénes ofrecen un servicio. `vecinosComunes` toma los vecinos del primer servicio y conserva los que aparecen también en todos los demás.

Construir el grafo cuesta O(V + S + E), con V profesionales, S servicios y E conexiones. Buscar los vecinos comunes cuesta O(d × k), donde d es la cantidad de profesionales del primer servicio y k la cantidad de servicios de la visita. La aplicación recorre luego los V profesionales para ordenar los resultados por identificador.

## Dónde se guardan los datos

SQLite guarda las tablas `veterinarios` y `veterinario_servicios`. La segunda tiene una fila por conexión: el identificador del profesional y el del servicio. `turnos.veterinario_id` guarda quién atiende esa visita. El grafo se reconstruye a partir de esas tablas al consultar o asignar; así recupera las conexiones después de reiniciar.

Registrar o editar guarda el nombre y todas sus conexiones en una transacción. Llamar guarda el cambio de estado y la asignación juntos. Si ocurre un error, se revierte toda la operación.

En esta versión un profesional debe cubrir todos los servicios y solo hay una consulta abierta en toda la veterinaria. Sin profesional compatible, se informa el problema y el próximo paciente sigue pendiente. No se modifica la prioridad para resolverlo. Tampoco se permite retirar un servicio que necesita la visita que ese profesional está atendiendo.

El veterinario se elige antes de llamar y se mantiene durante la consulta. Mientras atiende, figura como Ocupado y no aparece como disponible. Se muestra su nombre, sin selector para cambiarlo. La selección del próximo veterinario se oculta hasta cerrar el turno; después el profesional vuelve a estar disponible. En Veterinarios puedes ver el estado de cada profesional.

Las visitas antiguas se conservan. Si una estaba en atención antes de esta mejora y no tiene veterinario, selecciónalo y pulsa Asignar veterinario antes de cerrarla. Los nombres de los profesionales son únicos sin distinguir mayúsculas; es una simplificación del proyecto.

## Para comprobar que lo entendiste

Si Ana ofrece Consulta general y Control, y Bruno ofrece los tres servicios, ¿quiénes pueden atender una visita que pide solamente Control? ¿Qué cambia si añadimos Vacunación a la misma visita?

No necesitas cambiar código para probarlo: usa los formularios. El siguiente avance guardará las observaciones de cada atención y permitirá recorrer las consultas anteriores con una lista enlazada.
