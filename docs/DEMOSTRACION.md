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

La carga también registra Demo Ana Veterinaria (Consulta general y Control) y Demo Bruno Veterinario (Consulta general, Vacunación y Control). Puedes registrar o editar profesionales desde Veterinarios; repetir el comando conserva las ediciones de los profesionales existentes.

1. Registrar una mascota desde el formulario y recargar para mostrar persistencia.
2. Buscar `lu` y distinguir las dos Luna por especie, propietario e identificador.
3. Buscar `amba` para mostrar que encuentra Ámbar sin escribir la tilde.
4. Solicitar una visita para una Luna con Consulta general y Vacunación.
5. Añadir Max como urgente de prioridad 2.
6. Añadir Nala y después Rocky como urgentes de prioridad 3.
7. Mostrar la espera: Nala, Rocky, Max y la Luna normal (si no hay otros pendientes).
8. Escoger un profesional compatible, llamar al siguiente y cerrar cada visita para verificar el orden.
9. Al llegar a la Luna con Consulta general y Vacunación, comprobar que solo se ofrece Bruno: Ana no ofrece vacunación.
10. Recargar mientras está en atención para mostrar que la asignación se conserva. Después cerrar su turno.

Los turnos se crean durante la práctica; la carga de mascotas no crea turnos. Si ya hay un paciente activo, termina su visita antes de iniciar el recorrido.

## Lo que falta para la presentación final

- Guardar consultas y recorrer el historial mediante la lista enlazada.
- Publicar y comprobar el recorrido desde los enlaces de entrega.
- Completar el documento final y explicar las cinco estructuras con ejemplos propios.

La base SQLite no se sube a GitHub. Al publicar o descargar el proyecto en otro equipo, habrá que cargar allí los ejemplos mediante su servidor y preparar los turnos de nuevo.
