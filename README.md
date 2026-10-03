# Sistema de turnos para una veterinaria

Proyecto académico en JavaScript para registrar mascotas, gestionar turnos normales y urgentes, asignar veterinarios y consultar el historial de atención. Se desarrollará como una aplicación web con almacenamiento persistente en una base de datos.

## Estado del proyecto

Interfaz funcional con registro de mascotas, propietarios y turnos normales persistentes en SQLite. La pantalla Turnos permite añadir pacientes a la cola, llamar al siguiente y cerrar el turno en atención. La primera estructura propia está implementada: una cola FIFO con nodos enlazados. Quedan pendientes la lista del historial, el heap de urgencias, el trie y el grafo. La aplicación funciona localmente y no está publicada en internet.

## Ejecutar localmente

Requiere Node.js 24 o superior. Se ha verificado con Node.js 24.14.1. En la terminal, dentro de la carpeta del proyecto:

```powershell
npm.cmd start
```

Abre http://localhost:3000. Detén el servidor con `Ctrl+C`. Esta etapa usa solo módulos incluidos en Node.js y no necesita instalar dependencias externas. Debes acceder mediante el servidor; abrir el HTML directamente ya no permite consultar ni guardar registros.

Las guías están en [clase 1](docs/LECCION_01.md), [clase 2](docs/LECCION_02.md) y [clase 3 sobre la cola](docs/LECCION_03.md).

## Base de datos y API

Al iniciar, se crean automáticamente las tablas y el archivo `data/veterinaria.db`. Las tablas `propietarios` y `mascotas` se relacionan mediante `propietario_id`. Un registro reutiliza al propietario si coinciden su nombre sin distinguir mayúsculas y su teléfono sin separadores; personas con distinto nombre pueden compartir teléfono. Este criterio es una simplificación para la primera versión.

El registro de propietario y mascota se ejecuta en una transacción: ambos se guardan o ambos se revierten. La raza puede omitirse. El backend vuelve a validar los campos y utiliza consultas SQL con parámetros.

| Ruta | Método | Función |
| --- | --- | --- |
| `/api/mascotas` | GET | Recuperar las mascotas con los datos de sus propietarios. |
| `/api/mascotas` | POST | Registrar una mascota y crear o reutilizar su propietario. |
| `/api/turnos` | GET | Consultar la cola, el turno en atención y los servicios. |
| `/api/turnos` | POST | Solicitar un turno normal para una mascota y un servicio. |
| `/api/turnos/llamar` | POST | Pasar el primer turno de la cola a atención. |
| `/api/turnos/finalizar` | POST | Cerrar el turno que está en atención. |

La tabla `turnos` conserva el estado y el orden de llegada. Antes de consultar o modificar la espera, el backend reconstruye una `Cola` desde los registros pendientes. Crear un turno utiliza `encolar`; llamar al siguiente utiliza `desencolar`. Esta reconstrucción cuesta O(n), mientras las operaciones de insertar y retirar en la cola cuestan O(1). La conversión a arreglo sirve para enviar el resultado como JSON.

Una mascota no puede tener dos turnos activos y solo puede haber un paciente en atención. Los servicios iniciales son Consulta general, Vacunación y Control. Cerrar un turno cambia su estado; el registro de consultas con veterinario e historial se añadirá en las siguientes etapas.

El archivo de datos se conserva al detener el servidor y se excluye de Git. Al descargar el código en otro equipo se crea una base vacía. Para la publicación posterior se deberá elegir un servidor con almacenamiento persistente para SQLite.

Opcionalmente, `PORT` cambia el puerto local y `VETERINARIA_DB_PATH` indica otra ruta de base de datos. El módulo `node:sqlite` puede mostrar `ExperimentalWarning` en la versión de Node utilizada; las pruebas se ejecutaron con esa versión. Referencia: [SQLite en Node.js](https://nodejs.org/download/release/v24.8.0/docs/api/sqlite.html).

## Comprobaciones

```powershell
npm.cmd test
```

Las pruebas usan bases independientes de los registros de la aplicación. Cubren persistencia, transacciones, reutilización de propietarios, validación y respuestas de la API. Los resultados manuales están en [docs/PRUEBAS.md](docs/PRUEBAS.md).

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
| Cola | Implementada con nodos enlazados para procesar turnos normales por orden de llegada. |
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
