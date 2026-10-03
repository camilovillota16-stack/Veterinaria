# Sistema de turnos para una veterinaria

Proyecto académico en JavaScript para registrar mascotas, gestionar turnos normales y urgentes, asignar veterinarios y consultar el historial de atención. Se desarrollará como una aplicación web con almacenamiento persistente en una base de datos.

## Estado del proyecto

Planificación inicial. La aplicación todavía no está implementada ni publicada.

## Integrante

- Camilo Villota. Confirmar el nombre que debe figurar en la entrega.

## Funciones de la primera versión

- Registrar propietarios y mascotas.
- Solicitar turnos con un servicio y una prioridad.
- Llamar al siguiente paciente: primero las urgencias y después los turnos normales.
- Asignar un veterinario que ofrezca el servicio solicitado.
- Finalizar la atención y registrar las observaciones de la consulta.
- Buscar mascotas por el inicio de su nombre y consultar su historial.

## Estructuras de datos

| Estructura | Uso |
| --- | --- |
| Lista enlazada | Recorrer el historial de consultas de cada mascota. |
| Cola | Procesar turnos normales por orden de llegada. |
| Heap de prioridad | Procesar urgencias por prioridad y, en caso de empate, por orden de llegada. |
| Trie | Buscar mascotas por prefijo del nombre y conservar los identificadores de mascotas con nombres iguales. |
| Grafo | Representar veterinarios y servicios como vértices, con conexiones que indican qué servicios ofrece cada veterinario. |

Las cinco estructuras tendrán implementaciones propias en JavaScript y participarán en operaciones reales de la aplicación. La base de datos conservará los registros; al iniciar el sistema se reconstruirán las estructuras necesarias a partir de los datos guardados.

## Entrega

- Código funcional con los avances integrados en la rama `main`.
- Aplicación publicada y backend publicado si se utiliza.
- Documento final con alcance, tecnologías y justificación de las estructuras, incluido en el repositorio.
- Lista de integrantes y enlaces de publicación en este README.

## Enlaces

- Repositorio remoto: pendiente.
- Aplicación publicada: pendiente.
- Backend publicado: pendiente de definición.

## Trabajo con Git

Cada avance funcional se revisará antes de crear un commit con un mensaje que explique el cambio. Solo se incluirán archivos del proyecto. Los commits se subirán cuando esté configurado el repositorio remoto y se integrarán en `main` después de comprobar el funcionamiento.

El plan de implementación y las comprobaciones están en [docs/PLAN.md](docs/PLAN.md).
