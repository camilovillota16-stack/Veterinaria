# Clase 7: consultas e historial con una lista enlazada

## Lo que puedes hacer

1. En Turnos, llama a una mascota con un veterinario disponible.
2. En su tarjeta de atención, escribe observaciones si deseas dejar una nota.
3. Pulsa Cerrar turno de esa mascota. Se guarda la consulta y se libera su veterinario.
4. En Mascotas, pulsa Ver historial en su tarjeta.
5. Cuando la mascota regrese, crea y cierra otra visita. Su historial mostrará ambas, empezando por la más reciente.

El **motivo** indica por qué llegó la mascota; se escribe al solicitar la visita. Las **observaciones** son las notas de la atención; se escriben antes de cerrar. Son opcionales y admiten hasta 2000 caracteres. Una consulta abierta todavía no aparece como consulta finalizada en el historial.

## Qué es un nodo

Un nodo guarda un valor y una referencia al siguiente nodo. En `estructuras/lista.mjs`, el valor es una consulta:

```javascript
{ valor: consulta, siguiente: otroNodo }
```

`cabeza` señala el primer nodo. `null` indica que no hay un nodo siguiente. Por ejemplo:

```text
cabeza → consulta 3 → consulta 2 → consulta 1 → null
```

SQLite entrega las consultas de la más antigua a la más reciente. Al insertar cada consulta al inicio, la lista termina con las recientes delante:

```javascript
insertarAlInicio(valor) {
  this.cabeza = { valor, siguiente: this.cabeza };
  this.cantidad++;
}
```

`siguiente: this.cabeza` conserva la referencia al primer nodo anterior. Después, `this.cabeza` apunta al nuevo nodo. Así no perdemos las consultas anteriores. Insertar al inicio cuesta O(1): la operación hace el mismo trabajo aunque haya cien consultas.

## Cómo recorremos la lista

```javascript
let actual = this.cabeza;
while (actual) {
  yield actual.valor;
  actual = actual.siguiente;
}
```

Primero leemos el valor del nodo y luego seguimos su enlace. El generador permite usar `for...of` o `[...lista]`. El recorrido no retira nodos. `aArray()` convierte los valores en un arreglo para responder con JSON a la interfaz. Construir y recorrer n nodos cuesta O(n); la base de datos también realiza su lectura y ordenación.

## Dónde se guardan los datos

La lista vive en la memoria del servidor y se reconstruye cada vez que pedimos un historial. SQLite conserva las consultas en `consultas`, dentro de `data/veterinaria.db`. Al reiniciar, los nodos anteriores desaparecen, pero los registros siguen en el archivo y permiten reconstruir la lista.

Cada consulta guarda fecha, mascota, turno, veterinario, servicios, motivo, clasificación y observaciones. Copiamos el nombre del profesional y los servicios al cerrar para conservar lo que había en ese momento. Si luego cambias el nombre de un veterinario, su consulta anterior conserva el nombre guardado. Las fechas se guardan en UTC y se muestran con la hora de Bogotá.

Dos mascotas llamadas Luna tienen identificadores distintos: `/api/mascotas/1/historial` consulta solo la mascota 1. El nombre no se usa como identificador.

## Por qué cerramos con una transacción

Cerrar realiza dos operaciones: insertar la consulta y cambiar el turno a finalizado. Ambas están dentro de una transacción. Si falla cualquiera, SQLite revierte ambas y el veterinario sigue ocupado; puedes reintentar sin dejar una consulta duplicada. La tabla también impide guardar dos consultas para el mismo turno.

Las visitas cerradas antes de esta función se recuperan al iniciar. Se identifican como anteriores y muestran los datos que había disponibles. Si no se registraron observaciones o veterinario, el historial lo indica. Los borradores de otras atenciones se conservan mientras actualizas la pantalla o cierras otro paciente; debes cerrar la consulta para guardar sus notas en SQLite. Recargar antes de cerrar pierde un borrador.

## Las cinco estructuras del proyecto

| Estructura propia | Operación real |
| --- | --- |
| Cola | Respetar la llegada de los turnos normales. |
| Heap | Atender urgencias por prioridad y desempatar por llegada. |
| Trie | Buscar mascotas por el inicio del nombre o propietario. |
| Grafo | Encontrar profesionales que cubran todos los servicios. |
| Lista enlazada | Recorrer las consultas finalizadas de una mascota. |

Para explicar la lista en la presentación, dibuja tres consultas y sus flechas. Luego añade una cuarta al inicio y señala qué cambia en `cabeza` y qué conserva `siguiente`.
