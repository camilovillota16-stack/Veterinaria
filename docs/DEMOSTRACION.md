# Preparación de la demostración

Podemos practicar con pocos registros persistentes y preparar el recorrido de la presentación cuando el flujo esté completo.

## Mascotas de ejemplo

`npm.cmd run datos:demo` registra seis mascotas por la API del servidor del puerto 3000. Los nombres de propietarios llevan Demo y su teléfono de ceros es ficticio.

| Mascota | Especie | Propietario | Uso en la práctica |
| --- | --- | --- | --- |
| Luna | Gato | Demo Ana | Turno normal y búsqueda de nombres repetidos. |
| Max | Perro | Demo Bruno | Urgencia de prioridad media. |
| Nala | Gato | Demo Ana | Urgencia alta y propietario compartido. |
| Rocky | Perro | Demo Bruno | Desempate entre urgencias altas. |
| Luna | Perro | Demo Carla | Distinguir mascotas con el mismo nombre. |
| Ámbar | Conejo | Demo Diego | Búsqueda sin tilde y raza opcional. |

En la base principal ya existe Henry. Al cargar los ejemplos, habrá siete mascotas si no se han añadido otros registros. Repetir el comando no duplica ejemplos que conserven sus datos. Para practicar el registro manual, puedes añadir otra mascota desde Mascotas.

## Recorrido que ya podemos practicar

La carga también registra cuatro profesionales ficticios. Puedes registrar o editar profesionales desde Veterinarios; repetir el comando conserva las ediciones de los profesionales existentes.

En Turnos, el bloque Añadir otro veterinario lleva al formulario de un profesional nuevo. Escribe su nombre, marca sus servicios y pulsa Registrar veterinario. Para editar uno existente, selecciónalo en Profesional.

| Profesional | Servicios |
| --- | --- |
| Demo Ana Veterinaria | Consulta general y Control. |
| Demo Bruno Veterinario | Consulta general, Vacunación y Control. |
| Demo Carla Veterinaria | Consulta general, Vacunación y Control. |
| Demo Diego Veterinario | Consulta general, Vacunación y Control. |

1. Registrar una mascota desde el formulario y recargar para mostrar persistencia.
2. Buscar `lu` y distinguir las dos Luna por especie, propietario e identificador.
3. Buscar `amba` para mostrar que encuentra Ámbar sin escribir la tilde.
4. Solicitar una visita para una Luna con Consulta general y Vacunación.
5. Añadir Max como urgente de prioridad 2.
6. Añadir Nala y después Rocky como urgentes de prioridad 3.
7. Mostrar la espera: Nala, Rocky, Max y la Luna normal (si no hay otros pendientes).
8. Escoger un profesional compatible, llamar al siguiente y cerrar cada visita para verificar el orden.
9. Al llegar a la Luna con Consulta general y Vacunación, comprobar que aparecen Bruno, Carla y Diego si están libres: Ana no ofrece vacunación.
10. Recargar mientras está en atención para mostrar que la asignación se conserva. Después cerrar su turno.

Los turnos se crean durante la práctica; la carga de mascotas no crea turnos. Para observar el orden desde una espera limpia, termina las consultas previas antes de iniciar el recorrido. Durante el recorrido puedes llamar al próximo con un veterinario libre sin cerrar las otras consultas.

## Varios profesionales atendiendo

1. Solicitar cinco visitas normales con Consulta general: Henry, una Luna, Max, Nala y Rocky, en ese orden.
2. Llamar a Henry con Ana. Ana queda ocupada; los otros tres continúan disponibles.
3. Llamar a Luna con Bruno, a Max con Carla y a Nala con Diego, sin cerrar las consultas anteriores. Se muestran cuatro tarjetas, cada una con su paciente y veterinario.
4. Rocky queda en espera porque los cuatro veterinarios están ocupados.
5. Cerrar la consulta de Luna: Henry, Max y Nala siguen en atención; Bruno vuelve a estar disponible.
6. Llamar a Rocky con Bruno. Se recuperan las cuatro consultas abiertas sin cambiar el orden de llegada.

Las llamadas respetan la llegada y prioridad; los cierres pueden ocurrir en otro orden porque las consultas duran tiempos diferentes.

## Lo que falta para la presentación final

- Guardar consultas y recorrer el historial mediante la lista enlazada.
- Publicar y comprobar el recorrido desde los enlaces de entrega.
- Completar el documento final y explicar las cinco estructuras con ejemplos propios.

La base SQLite no se sube a GitHub. Al publicar o descargar el proyecto en otro equipo, habrá que cargar allí los ejemplos mediante su servidor y preparar los turnos de nuevo.
