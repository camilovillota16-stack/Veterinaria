# Clase 5 Urgencias con un heap de prioridad

## Qué cambia

La cola normal respeta la llegada. El heap urgente permite que un turno de mayor prioridad pase antes. La pantalla separa ambas esperas y muestra el próximo paciente.

1. Urgencias de prioridad 3 (alta).
2. Urgencias de prioridad 2 (media).
3. Urgencias de prioridad 1 (baja).
4. Turnos normales, por llegada.

Las prioridades se seleccionan manualmente en esta aplicación académica; no se calculan a partir de síntomas. A igual prioridad, pasa antes el turno que llegó antes. Una urgencia nueva no interrumpe al paciente en atención: primero se cierra la visita actual.

## Prueba práctica

Con mascotas de prueba, solicita estos turnos en este orden:

| Mascota | Tipo | Prioridad |
| --- | --- | --- |
| Luna | Normal | 0 (automática) |
| Max | Urgente | 2 |
| Rocky | Urgente | 3 |
| Nala | Urgente | 3 |

Selecciona Tipo de atención Urgente para ver el selector de prioridad. Marca los servicios y solicita el turno como antes. El orden esperado de llamada es **Rocky, Nala, Max, Luna**. Rocky pasa antes que Nala porque llegó primero entre los de prioridad 3.

Pulsa Llamar siguiente y luego Cerrar turno antes de cada nueva llamada. Recarga para comprobar que prioridad, espera y atención actual siguen guardadas. Puedes cambiar el tipo o la prioridad de un pendiente desde el mismo formulario; se conserva su número y llegada original. En atención se pueden editar servicios y motivo, pero el tipo y la prioridad quedan bloqueados.

## El heap usa un arreglo como árbol

Abre `estructuras/heap.mjs`. El arreglo no está totalmente ordenado: cada padre tiene preferencia sobre sus hijos. La raíz, en posición 0, contiene el turno que debe salir primero.

Para un elemento en el índice i:

```javascript
const padre = Math.floor((i - 1) / 2);
const hijoIzquierdo = i * 2 + 1;
const hijoDerecho = i * 2 + 2;
```

`insertar` añade al final y hace subir al turno mientras tenga preferencia sobre su padre. `extraer` retira la raíz, coloca allí al último y lo hace bajar intercambiándolo con el hijo de mayor preferencia. Ambas operaciones cuestan O(log u).

## El comparador

```javascript
(a, b) => a.prioridad - b.prioridad || b.id - a.id
```

Si el resultado es positivo, a debe salir antes. Primero compara prioridad. Si son iguales, la resta da cero y `||` evalúa la comparación de identificadores: el menor id tiene preferencia porque llegó antes.

```javascript
const heap = new HeapPrioridad();
heap.insertar({ id: 1, prioridad: 2 });
heap.insertar({ id: 2, prioridad: 3 });
heap.extraer(); // Devuelve el turno 2.
```

## Cómo se conecta con la aplicación

SQLite conserva el tipo y la prioridad. `reconstruirHeap` lee urgencias pendientes y las inserta en nuestro heap: la consulta SQL no decide el orden por prioridad. `llamarSiguiente` extrae la raíz si hay urgencias; en caso contrario desencola un normal. El cambio a atención se confirma dentro de una transacción. Si falla, reconstruir la estructura recupera el mismo turno pendiente.

`enOrden` copia el heap y extrae los elementos de la copia para mostrar la espera. Eso no consume los turnos reales. Reconstruir el heap con inserciones y mostrarlo ordenado cuestan O(u log u); no confundas ese costo con el de una extracción individual.

La clasificación y los servicios se actualizan en la misma transacción. Si falla alguno, se revierten todos los cambios. Los turnos de la versión anterior se migran sin borrar datos.

Con esta etapa tenemos **tres de las cinco estructuras: cola, trie y heap**. Siguen pendientes el grafo de veterinarios y servicios y la lista enlazada del historial.
