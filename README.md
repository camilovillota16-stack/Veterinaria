# Sistema de turnos para una veterinaria

Proyecto académico en JavaScript para registrar mascotas, gestionar turnos normales y urgentes, asignar veterinarios y consultar el historial de atención. Se desarrollará como una aplicación web con almacenamiento persistente en una base de datos.

## Estado del proyecto

Interfaz funcional con mascotas, propietarios, visitas y veterinarios persistentes en SQLite. Una visita admite varios servicios y un motivo opcional. Varios veterinarios pueden atender al mismo tiempo, cada uno a su propio paciente. Turnos busca mascotas por nombre o propietario y permite actualizar visitas activas. Hay cuatro estructuras propias implementadas: cola FIFO, trie, heap de urgencias y grafo para asignar profesionales que ofrezcan todos los servicios de la visita. Quedan pendientes la lista del historial y la publicación en internet.

## Ejecutar localmente

Requiere Node.js 24 o superior. Se ha verificado con Node.js 24.14.1. En la terminal, dentro de la carpeta del proyecto:

```powershell
npm.cmd start
```

Abre http://localhost:3000. Detén el servidor con `Ctrl+C`. Esta etapa usa solo módulos incluidos en Node.js y no necesita instalar dependencias externas. Debes acceder mediante el servidor; abrir el HTML directamente ya no permite consultar ni guardar registros.

Las guías están en [clase 1](docs/LECCION_01.md), [clase 2](docs/LECCION_02.md), [clase 3 sobre la cola](docs/LECCION_03.md), [clase 4 sobre visitas y búsqueda](docs/LECCION_04.md), [clase 5 sobre urgencias](docs/LECCION_05.md) y [clase 6 sobre veterinarios y grafo](docs/LECCION_06.md).

## Base de datos y API

Para añadir seis mascotas ficticias para practicar, inicia la aplicación en el puerto 3000 y ejecuta en otra terminal:

```powershell
npm.cmd run datos:demo
```

El comando registra los ejemplos mediante la API del servidor local. Los propietarios se identifican como Demo Ana, Demo Bruno, Demo Carla y Demo Diego, con un teléfono ficticio de ceros. Incluye dos mascotas llamadas Luna para probar la búsqueda por propietario, tres especies y razas opcionales. Ejecutarlo de nuevo reconoce los ejemplos existentes. Los registros se guardan en la base que usa ese servidor; los turnos de la demostración se solicitan desde la interfaz. El código de carga se incluye en Git y el archivo SQLite sigue siendo local.

También registra cuatro profesionales ficticios: Demo Ana Veterinaria (Consulta general y Control), Demo Bruno Veterinario, Demo Carla Veterinaria y Demo Diego Veterinario (estos últimos ofrecen los tres servicios). Si ya existen por nombre, conserva sus servicios sin reemplazar cambios realizados desde el formulario. Esto permite demostrar cuatro consultas simultáneas con mascotas diferentes.

Al iniciar, se crean automáticamente las tablas y el archivo `data/veterinaria.db`. Las tablas `propietarios` y `mascotas` se relacionan mediante `propietario_id`. Un registro reutiliza al propietario si coinciden su nombre sin distinguir mayúsculas y su teléfono sin separadores; personas con distinto nombre pueden compartir teléfono. Este criterio es una simplificación para la primera versión.

El registro de propietario y mascota se ejecuta en una transacción: ambos se guardan o ambos se revierten. La raza puede omitirse. El backend vuelve a validar los campos y utiliza consultas SQL con parámetros.

| Ruta | Método | Función |
| --- | --- | --- |
| `/api/mascotas` | GET | Recuperar las mascotas con los datos de sus propietarios. |
| `/api/mascotas` | POST | Registrar una mascota y crear o reutilizar su propietario. |
| `/api/mascotas?q=hen` | GET | Buscar por prefijo del nombre o de una palabra del nombre del propietario. |
| `/api/turnos` | GET | Consultar espera normal, urgencias por prioridad, próximo paciente, todas las `atenciones` y servicios. |
| `/api/turnos` | POST | Solicitar una visita con `mascotaId`, `serviciosIds`, `tipo`, `prioridad` y `motivo` opcional. |
| `/api/turnos/actualizar` | POST | Actualizar servicios y motivo mediante `turnoId`; también tipo y prioridad mientras esté pendiente. |
| `/api/turnos/llamar` | POST | Llamar al próximo paciente y asignar `veterinarioId`; `turnoId` opcional protege contra una selección desactualizada. |
| `/api/turnos/asignar` | POST | Completar la asignación de una atención antigua sin profesional mediante `turnoId` y `veterinarioId`; una asignación existente no se cambia. |
| `/api/turnos/finalizar` | POST | Cerrar únicamente la consulta indicada por `turnoId`; omitirlo se admite solo cuando hay una sola consulta abierta. |
| `/api/veterinarios` | GET | Listar profesionales y sus servicios. |
| `/api/veterinarios` | POST | Registrar un profesional con `nombre` y `serviciosIds`. |
| `/api/veterinarios/actualizar` | POST | Reemplazar nombre y servicios mediante `veterinarioId`, `nombre` y `serviciosIds`. |

La tabla `turnos` conserva el estado y el orden de llegada. El backend reconstruye una `Cola` desde los normales pendientes y un `HeapPrioridad` desde las urgencias pendientes. Crear un turno utiliza `encolar` o `insertar`; llamar al siguiente utiliza `extraer` del heap, o `desencolar` si no hay urgencias. La cola se reconstruye en O(n) y sus operaciones cuestan O(1). Insertar y extraer del heap cuestan O(log u); reconstruirlo con inserciones y producir su vista ordenada cuestan O(u log u), donde u es la cantidad de urgencias. La vista usa una copia del heap, sin consumir la espera real.

Las urgencias tienen prioridad baja (1), media (2) o alta (3); todas pasan antes que los normales (prioridad 0). A igual prioridad se llama al menor identificador de turno, que conserva la llegada. El tipo y la prioridad solo se cambian en espera; reclasificar conserva el identificador y la llegada, pero puede cambiar el orden de llamada. Una urgencia nueva no interrumpe las consultas abiertas; puede pasar con otro profesional compatible y libre. Si no se envía tipo, las nuevas solicitudes se consideran normales; una urgencia sin prioridad explícita toma 1. Al editar, los campos omitidos conservan la clasificación existente.

Una mascota no puede tener dos turnos activos y cada veterinario solo puede tener una consulta abierta, protegido por un índice único de SQLite. Se elimina automáticamente el antiguo índice que limitaba a un solo paciente en toda la clínica, conservando los registros. Cada turno reúne uno o varios servicios en `turno_servicios`; la creación y la actualización se guardan en transacciones. Actualizar reemplaza la selección completa de servicios y motivo, conservando identificador, estado y llegada. Los turnos anteriores se migran automáticamente con su servicio original y prioridad 0 para normales (1 para urgentes antiguos sin prioridad). Se mantiene `servicioId` como entrada compatible con la versión anterior; las nuevas solicitudes usan `serviciosIds`.

El trie se reconstruye al iniciar y se amplía después de guardar una mascota. Indexa nombres completos y sus palabras, ignora tildes y mayúsculas, y conserva identificadores distintos para nombres repetidos. Encontrar el nodo cuesta O(p), donde p es la longitud del prefijo; recuperar k resultados cuesta O(k), y ordenarlos por identificador cuesta O(k log k). La interfaz muestra hasta 30 resultados y conserva el seleccionado si también coincide; se puede escribir más letras para localizar cualquier mascota.

Los servicios iniciales son Consulta general, Vacunación y Control. Cada veterinario ofrece al menos uno. En esta versión los nombres de profesionales son únicos sin distinguir mayúsculas; los identificadores mantienen las relaciones. Nombre y conexiones se guardan en una transacción.

El grafo propio usa listas de adyacencia con `Map` y `Set`: vértices `veterinario:ID` y `servicio:ID`, conectados en ambos sentidos. Se reconstruye desde `veterinarios`, `servicios` y `veterinario_servicios`; los vecinos comunes de los servicios son los profesionales compatibles. Su construcción cuesta O(V + S + E). Para una visita con k servicios, la intersección cuesta O(d × k), donde d es el número de profesionales del primer servicio; después se filtra la lista de V profesionales para conservar su orden.

Un solo profesional cubre todos los servicios de cada visita y se guarda en `turnos.veterinario_id`. Si no hay uno compatible y libre, el próximo paciente sigue pendiente; no se salta al siguiente. La interfaz envía la elección explícita. La API permite omitir `veterinarioId` y usa el primer compatible disponible por identificador. La llamada y la asignación se guardan juntas en una transacción. Durante la consulta se conserva al veterinario asignado. No se pueden retirar servicios al profesional ni cambiar los de una atención si esto invalida su asignación actual.

La lista de profesionales indica Disponible u Ocupado. Cada visita incluye `veterinariosCompatibles` por servicios y `veterinariosDisponibles`, que excluye a todos los profesionales en atención. La selección del próximo veterinario sigue disponible aunque existan otras consultas; también se pueden registrar profesionales nuevos mientras atienden los anteriores. Cada consulta tiene su propia tarjeta y botón de cierre; cerrar una solo libera a su veterinario. `atenciones` contiene todas las consultas abiertas. `enAtencion` se conserva como campo compatible que representa únicamente la primera.

La cola y el heap controlan el orden para empezar la atención. Si Henry llegó antes que Luna con la misma prioridad, se llama primero a Henry; Luna puede comenzar después con otro profesional aunque Henry siga en consulta. Luna puede terminar antes por la duración de su consulta. Elegir otro veterinario no altera el próximo paciente.

Las visitas anteriores conservan sus datos al añadir la columna del veterinario. Una atención antigua sin profesional debe asignarlo antes de cerrar; los turnos ya finalizados permanecen con asignación vacía. Cerrar cambia el estado del turno; el registro de observaciones y el historial se añadirán en la siguiente etapa.

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
- Solicitar visitas con uno o varios servicios, motivo y prioridad.
- Llamar al siguiente paciente: primero las urgencias y después los turnos normales.
- Asignar un veterinario que ofrezca todos los servicios solicitados.
- Finalizar la atención y registrar las observaciones de la consulta.
- Buscar mascotas por el inicio de su nombre y consultar su historial.

## Estructuras de datos

| Estructura | Uso |
| --- | --- |
| Lista enlazada | Recorrer el historial de consultas de cada mascota. |
| Cola | Implementada con nodos enlazados para procesar turnos normales por orden de llegada. |
| Heap de prioridad | Implementado: urgencias por prioridad y, en caso de empate, por orden de llegada. |
| Trie | Implementado: buscar mascotas por prefijo del nombre o propietario, conservando los identificadores de mascotas con nombres iguales. |
| Grafo | Implementado: vecinos comunes de los servicios para asignar un veterinario compatible con toda la visita. |

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
