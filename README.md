# Sistema de turnos para una veterinaria

Proyecto académico en JavaScript para registrar mascotas, gestionar turnos normales y urgentes, asignar veterinarios y consultar el historial de atención. Se desarrollará como una aplicación web con almacenamiento persistente en una base de datos.

## Estado del proyecto

Primera interfaz funcional: navegación entre Inicio y Mascotas, registro de mascotas con datos del propietario, validación y contadores. Los registros se conservan solo en memoria y se pierden al recargar. Todavía no hay API, base de datos ni estructuras propias implementadas. La aplicación no está publicada.

## Ejecutar localmente

Requiere Node.js 20 o superior. En la terminal, dentro de la carpeta del proyecto:

```powershell
npm.cmd start
```

Abre http://localhost:3000. Detén el servidor con `Ctrl+C`. Esta etapa usa solo módulos incluidos en Node.js y no necesita instalar dependencias externas.

La explicación del código y los ejercicios están en [docs/LECCION_01.md](docs/LECCION_01.md).

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

- Repositorio remoto: https://github.com/camilovillota16-stack/Veterinaria
- Aplicación publicada: pendiente.
- Backend publicado: pendiente de definición.

## Trabajo con Git

Cada avance funcional se revisará antes de crear un commit con un mensaje que explique el cambio. Solo se incluirán archivos del proyecto. La rama de trabajo inicial es `codex/inicio`. Los commits se subirán al repositorio remoto y se integrarán en `main` después de comprobar el funcionamiento.

El plan de implementación y las comprobaciones están en [docs/PLAN.md](docs/PLAN.md).
