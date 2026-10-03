import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { validarMascota, ErrorSolicitud } from "../api/validacion.mjs";
import { Cola } from "../estructuras/cola.mjs";
import { Trie, normalizarBusqueda } from "../estructuras/trie.mjs";
import { HeapPrioridad } from "../estructuras/heap.mjs";
import { Grafo } from "../estructuras/grafo.mjs";

export function crearAlmacen(ruta) {
  if (ruta !== ":memory:") mkdirSync(dirname(resolve(ruta)), { recursive: true });
  const conexion = new DatabaseSync(ruta);
  conexion.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS propietarios (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      nombre_clave TEXT NOT NULL,
      telefono_clave TEXT NOT NULL,
      UNIQUE (nombre_clave, telefono_clave)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS mascotas (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      especie TEXT NOT NULL CHECK (especie IN ('Perro', 'Gato', 'Ave', 'Conejo', 'Otra')),
      raza TEXT NOT NULL DEFAULT '',
      propietario_id INTEGER NOT NULL REFERENCES propietarios(id),
      creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
    CREATE TABLE IF NOT EXISTS servicios (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE
    ) STRICT;
    INSERT OR IGNORE INTO servicios (nombre)
    VALUES ('Consulta general'), ('Vacunación'), ('Control');
    CREATE TABLE IF NOT EXISTS turnos (
      id INTEGER PRIMARY KEY,
      mascota_id INTEGER NOT NULL REFERENCES mascotas(id),
      servicio_id INTEGER NOT NULL REFERENCES servicios(id),
      tipo TEXT NOT NULL DEFAULT 'normal' CHECK (tipo IN ('normal', 'urgente')),
      estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_atencion', 'finalizado')),
      creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      llamado_en TEXT,
      finalizado_en TEXT
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS mascota_con_turno_activo
      ON turnos(mascota_id) WHERE estado IN ('pendiente', 'en_atencion');
    CREATE UNIQUE INDEX IF NOT EXISTS un_turno_en_atencion
      ON turnos(estado) WHERE estado = 'en_atencion';
  `);
  // Migración compatible con los turnos existentes: conservan su primer servicio.
  conexion.exec("BEGIN IMMEDIATE");
  try {
    conexion.exec(`
      CREATE TABLE IF NOT EXISTS veterinarios (
        id INTEGER PRIMARY KEY,
        nombre TEXT NOT NULL,
        nombre_clave TEXT NOT NULL UNIQUE
      ) STRICT;
      CREATE TABLE IF NOT EXISTS veterinario_servicios (
        veterinario_id INTEGER NOT NULL REFERENCES veterinarios(id),
        servicio_id INTEGER NOT NULL REFERENCES servicios(id),
        PRIMARY KEY (veterinario_id, servicio_id)
      ) STRICT;
    `);
    if (!conexion.prepare("PRAGMA table_info(turnos)").all().some((columna) => columna.name === "veterinario_id")) {
      conexion.exec("ALTER TABLE turnos ADD COLUMN veterinario_id INTEGER REFERENCES veterinarios(id)");
    }
    if (!conexion.prepare("PRAGMA table_info(turnos)").all().some((columna) => columna.name === "motivo")) {
      conexion.exec("ALTER TABLE turnos ADD COLUMN motivo TEXT NOT NULL DEFAULT ''");
    }
    if (!conexion.prepare("PRAGMA table_info(turnos)").all().some((columna) => columna.name === "prioridad")) {
      conexion.exec("ALTER TABLE turnos ADD COLUMN prioridad INTEGER NOT NULL DEFAULT 0 CHECK (prioridad BETWEEN 0 AND 3)");
      conexion.exec("UPDATE turnos SET prioridad = 1 WHERE tipo = 'urgente'");
    }
    conexion.exec(`
      CREATE TABLE IF NOT EXISTS turno_servicios (
        turno_id INTEGER NOT NULL REFERENCES turnos(id),
        servicio_id INTEGER NOT NULL REFERENCES servicios(id),
        PRIMARY KEY (turno_id, servicio_id)
      ) STRICT;
      INSERT OR IGNORE INTO turno_servicios (turno_id, servicio_id)
        SELECT id, servicio_id FROM turnos;
    `);
    conexion.exec("COMMIT");
  } catch (error) {
    conexion.exec("ROLLBACK");
    conexion.close();
    throw error;
  }
  const consultaMascotas = `
    SELECT m.id, m.nombre, m.especie, m.raza,
           p.id AS propietarioId, p.nombre AS propietario, p.telefono,
           m.creado_en AS creadoEn
    FROM mascotas AS m
    JOIN propietarios AS p ON p.id = m.propietario_id
  `;
  const listar = conexion.prepare(`${consultaMascotas} ORDER BY m.id`);
  const buscarMascota = conexion.prepare(`${consultaMascotas} WHERE m.id = ?`);
  const buscarPropietario = conexion.prepare(`
    SELECT id FROM propietarios WHERE nombre_clave = ? AND telefono_clave = ?
  `);
  const insertarPropietario = conexion.prepare(`
    INSERT INTO propietarios (nombre, telefono, nombre_clave, telefono_clave)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (nombre_clave, telefono_clave) DO NOTHING
  `);
  const insertarMascota = conexion.prepare(`
    INSERT INTO mascotas (nombre, especie, raza, propietario_id) VALUES (?, ?, ?, ?)
  `);

  const consultaTurnos = `
    SELECT t.id, t.mascota_id AS mascotaId, m.nombre AS mascotaNombre,
           m.especie, p.nombre AS propietario, t.servicio_id AS servicioId,
           s.nombre AS servicio, t.motivo, t.tipo, t.prioridad, t.estado, t.creado_en AS creadoEn,
           t.veterinario_id AS veterinarioId, v.nombre AS veterinario
    FROM turnos AS t
    JOIN mascotas AS m ON m.id = t.mascota_id
    JOIN propietarios AS p ON p.id = m.propietario_id
    JOIN servicios AS s ON s.id = t.servicio_id
    LEFT JOIN veterinarios AS v ON v.id = t.veterinario_id
  `;
  const pendientes = conexion.prepare(`${consultaTurnos} WHERE t.estado = 'pendiente' AND t.tipo = 'normal' ORDER BY t.id`);
  const urgentesPendientes = conexion.prepare(`${consultaTurnos} WHERE t.estado = 'pendiente' AND t.tipo = 'urgente' ORDER BY t.id`);
  const enAtencion = conexion.prepare(`${consultaTurnos} WHERE t.estado = 'en_atencion'`);
  const buscarTurno = conexion.prepare(`${consultaTurnos} WHERE t.id = ?`);
  const servicios = conexion.prepare("SELECT id, nombre FROM servicios ORDER BY id");
  const buscarServicio = conexion.prepare("SELECT id FROM servicios WHERE id = ?");
  const turnoActivo = conexion.prepare("SELECT id FROM turnos WHERE mascota_id = ? AND estado IN ('pendiente', 'en_atencion')");
  const insertarTurno = conexion.prepare("INSERT INTO turnos (mascota_id, servicio_id, tipo, prioridad) VALUES (?, ?, ?, ?)");
  const insertarServicioTurno = conexion.prepare("INSERT INTO turno_servicios (turno_id, servicio_id) VALUES (?, ?)");
  const eliminarServiciosTurno = conexion.prepare("DELETE FROM turno_servicios WHERE turno_id = ?");
  const actualizarVisita = conexion.prepare("UPDATE turnos SET servicio_id = ?, motivo = ? WHERE id = ?");
  const actualizarClasificacion = conexion.prepare("UPDATE turnos SET tipo = ?, prioridad = ? WHERE id = ?");
  const consultarServiciosTurno = conexion.prepare(`
    SELECT s.id, s.nombre FROM turno_servicios ts JOIN servicios s ON s.id = ts.servicio_id
    JOIN turnos t ON t.id = ts.turno_id WHERE ts.turno_id = ?
    ORDER BY CASE WHEN s.id = t.servicio_id THEN 0 ELSE 1 END, s.id
  `);
  const llamarTurno = conexion.prepare("UPDATE turnos SET estado = 'en_atencion', llamado_en = CURRENT_TIMESTAMP, veterinario_id = ? WHERE id = ? AND estado = 'pendiente'");
  const asignarTurno = conexion.prepare("UPDATE turnos SET veterinario_id = ? WHERE id = ? AND estado = 'en_atencion'");
  const cerrarTurno = conexion.prepare("UPDATE turnos SET estado = 'finalizado', finalizado_en = CURRENT_TIMESTAMP WHERE id = ? AND estado = 'en_atencion'");
  const consultarVeterinarios = conexion.prepare("SELECT id, nombre FROM veterinarios ORDER BY id");
  const buscarVeterinario = conexion.prepare("SELECT id, nombre FROM veterinarios WHERE id = ?");
  const buscarNombreVeterinario = conexion.prepare("SELECT id FROM veterinarios WHERE nombre_clave = ?");
  const insertarVeterinario = conexion.prepare("INSERT INTO veterinarios (nombre, nombre_clave) VALUES (?, ?)");
  const modificarVeterinario = conexion.prepare("UPDATE veterinarios SET nombre = ?, nombre_clave = ? WHERE id = ?");
  const conexionesVeterinarios = conexion.prepare("SELECT veterinario_id AS veterinarioId, servicio_id AS servicioId FROM veterinario_servicios");
  const serviciosVeterinario = conexion.prepare(`SELECT s.id, s.nombre FROM veterinario_servicios vs
    JOIN servicios s ON s.id = vs.servicio_id WHERE vs.veterinario_id = ? ORDER BY s.id`);
  const insertarConexion = conexion.prepare("INSERT INTO veterinario_servicios (veterinario_id, servicio_id) VALUES (?, ?)");
  const borrarConexiones = conexion.prepare("DELETE FROM veterinario_servicios WHERE veterinario_id = ?");

  function reconstruirGrafo() {
    const grafo = new Grafo();
    servicios.all().forEach((s) => grafo.agregarVertice(`servicio:${s.id}`));
    consultarVeterinarios.all().forEach((v) => grafo.agregarVertice(`veterinario:${v.id}`));
    conexionesVeterinarios.all().forEach((c) => grafo.conectar(`veterinario:${c.veterinarioId}`, `servicio:${c.servicioId}`));
    return grafo;
  }

  function compatibles(serviciosIds, grafo = reconstruirGrafo()) {
    const claves = new Set(grafo.vecinosComunes(serviciosIds.map((id) => `servicio:${id}`)));
    return consultarVeterinarios.all().filter((v) => claves.has(`veterinario:${v.id}`));
  }

  function listarVeterinarios() {
    const actual = enAtencion.get();
    return consultarVeterinarios.all().map((v) => ({ ...v, servicios: serviciosVeterinario.all(v.id),
      ocupado: actual?.veterinarioId === v.id }));
  }

  function guardarVeterinario(datos, editar = false) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos)
      || typeof datos.nombre !== "string" || !datos.nombre.trim() || datos.nombre.trim().length > 100) {
      throw new ErrorSolicitud("Escribe un nombre de veterinario de hasta 100 caracteres.");
    }
    const visita = validarVisita(datos);
    const nombre = datos.nombre.trim();
    const clave = nombre.toLocaleLowerCase("es");
    if (editar && (!Number.isSafeInteger(datos.veterinarioId) || datos.veterinarioId < 1)) throw new ErrorSolicitud("Selecciona un veterinario válido.");
    return enTransaccion(() => {
      if (editar && !buscarVeterinario.get(datos.veterinarioId)) throw new ErrorSolicitud("El veterinario no existe.", 404);
      const repetido = buscarNombreVeterinario.get(clave);
      if (repetido && (!editar || repetido.id !== datos.veterinarioId)) throw new ErrorSolicitud("Ya hay un veterinario registrado con ese nombre.", 409);
      if (visita.serviciosIds.some((id) => !buscarServicio.get(id))) throw new ErrorSolicitud("Uno de los servicios no existe.", 404);
      const actual = enAtencion.get();
      if (editar && actual?.veterinarioId === datos.veterinarioId
        && consultarServiciosTurno.all(actual.id).some((s) => !visita.serviciosIds.includes(s.id))) {
        throw new ErrorSolicitud("No puedes quitar un servicio que está atendiendo. Espera a que termine la consulta.", 409);
      }
      let id = datos.veterinarioId;
      if (editar) modificarVeterinario.run(nombre, clave, id);
      else id = Number(insertarVeterinario.run(nombre, clave).lastInsertRowid);
      borrarConexiones.run(id);
      visita.serviciosIds.forEach((servicioId) => insertarConexion.run(id, servicioId));
      return { ...buscarVeterinario.get(id), servicios: serviciosVeterinario.all(id) };
    });
  }
  let indiceMascotas;
  function indexarMascota(mascota) {
    for (const texto of [mascota.nombre, mascota.propietario]) {
      const normalizado = normalizarBusqueda(texto);
      for (const clave of new Set([normalizado, ...normalizado.split(" ")])) {
        indiceMascotas.insertar(clave, mascota.id);
      }
    }
  }
  function reconstruirIndiceMascotas() {
    indiceMascotas = new Trie();
    listar.all().forEach(indexarMascota);
  }
  reconstruirIndiceMascotas();

  function buscarMascotas(consulta) {
    if (typeof consulta !== "string" || consulta.length > 100) {
      throw new ErrorSolicitud("La búsqueda admite hasta 100 caracteres.");
    }
    return indiceMascotas.buscar(consulta).sort((a, b) => a - b).map((id) => buscarMascota.get(id));
  }

  function completarTurno(turno, grafo = reconstruirGrafo()) {
    if (!turno) return null;
    const listaServicios = consultarServiciosTurno.all(turno.id);
    const veterinariosCompatibles = compatibles(listaServicios.map((s) => s.id), grafo);
    const ocupado = enAtencion.get()?.veterinarioId;
    return { ...turno, servicios: listaServicios, servicio: listaServicios.map((s) => s.nombre).join(" · "),
      veterinariosCompatibles, veterinariosDisponibles: veterinariosCompatibles.filter((v) => v.id !== ocupado) };
  }

  function reconstruirCola(grafo = reconstruirGrafo()) {
    const cola = new Cola();
    // El identificador conserva el orden de llegada, incluso con fechas iguales.
    pendientes.all().forEach((turno) => cola.encolar(completarTurno(turno, grafo)));
    return cola;
  }

  function estadoTurnos() {
    const grafo = reconstruirGrafo();
    const cola = reconstruirCola(grafo);
    const heap = reconstruirHeap(grafo);
    const normales = cola.aArray();
    const urgentes = heap.enOrden();
    return {
      pendientes: [...urgentes, ...normales],
      normales,
      urgentes,
      siguiente: heap.verPrimero() ?? cola.verPrimero(),
      cantidad: cola.tamano + heap.tamano,
      cantidadNormales: cola.tamano,
      cantidadUrgentes: heap.tamano,
      enAtencion: completarTurno(enAtencion.get(), grafo),
      servicios: servicios.all(),
    };
  }

  function reconstruirHeap(grafo = reconstruirGrafo()) {
    const heap = new HeapPrioridad();
    urgentesPendientes.all().forEach((turno) => heap.insertar(completarTurno(turno, grafo)));
    return heap;
  }

  function validarClasificacion(datos, actual = null) {
    const tipo = datos.tipo === undefined ? (actual?.tipo ?? "normal") : datos.tipo;
    const prioridad = datos.prioridad === undefined
      ? (actual?.tipo === tipo ? actual.prioridad : tipo === "urgente" ? 1 : 0)
      : datos.prioridad;
    if (!["normal", "urgente"].includes(tipo) || !Number.isSafeInteger(prioridad)
      || (tipo === "normal" ? prioridad !== 0 : prioridad < 1 || prioridad > 3)) {
      throw new ErrorSolicitud("Selecciona atención normal o urgente; las urgencias requieren una prioridad entre 1 y 3.");
    }
    return { tipo, prioridad };
  }

  function validarVisita(datos) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
      throw new ErrorSolicitud("Envía los datos de la visita.");
    }
    // Se mantiene servicioId para las solicitudes de la versión anterior.
    const serviciosIds = datos.serviciosIds === undefined ? [datos.servicioId] : datos.serviciosIds;
    if (!Array.isArray(serviciosIds) || !serviciosIds.length || serviciosIds.length > 50
      || serviciosIds.some((id) => !Number.isSafeInteger(id) || id < 1)
      || new Set(serviciosIds).size !== serviciosIds.length) {
      throw new ErrorSolicitud("Selecciona al menos un servicio válido, sin repetirlo.");
    }
    const motivo = datos.motivo === undefined ? "" : datos.motivo;
    if (typeof motivo !== "string" || motivo.trim().length > 500) {
      throw new ErrorSolicitud("El motivo debe ser texto de hasta 500 caracteres.");
    }
    return { serviciosIds, motivo: motivo.trim() };
  }

  function guardarServicios(turnoId, visita) {
    if (visita.serviciosIds.some((id) => !buscarServicio.get(id))) {
      throw new ErrorSolicitud("Uno de los servicios no existe.", 404);
    }
    eliminarServiciosTurno.run(turnoId);
    for (const id of visita.serviciosIds) insertarServicioTurno.run(turnoId, id);
    actualizarVisita.run(visita.serviciosIds[0], visita.motivo, turnoId);
  }

  function enTransaccion(operacion) {
    conexion.exec("BEGIN IMMEDIATE");
    try {
      const resultado = operacion();
      conexion.exec("COMMIT");
      return resultado;
    } catch (error) {
      conexion.exec("ROLLBACK");
      throw error;
    }
  }

  function registrarTurno(datos) {
    const visita = validarVisita(datos);
    const clasificacion = validarClasificacion(datos);
    if (!datos || typeof datos !== "object" || Array.isArray(datos)
      || !Number.isSafeInteger(datos.mascotaId) || datos.mascotaId < 1) {
      throw new ErrorSolicitud("Selecciona una mascota y un servicio válidos.");
    }
    return enTransaccion(() => {
      if (!buscarMascota.get(datos.mascotaId) || visita.serviciosIds.some((id) => !buscarServicio.get(id))) {
        throw new ErrorSolicitud("La mascota o el servicio no existen.", 404);
      }
      if (turnoActivo.get(datos.mascotaId)) {
        throw new ErrorSolicitud("Esta mascota ya tiene una visita activa. Actualiza sus servicios en ese turno.", 409);
      }
      const cola = reconstruirCola();
      const heap = reconstruirHeap();
      const resultado = insertarTurno.run(datos.mascotaId, visita.serviciosIds[0], clasificacion.tipo, clasificacion.prioridad);
      guardarServicios(resultado.lastInsertRowid, visita);
      const turno = completarTurno(buscarTurno.get(resultado.lastInsertRowid));
      if (turno.tipo === "urgente") {
        heap.insertar(turno);
        return { turno, posicion: heap.enOrden().findIndex((pendiente) => pendiente.id === turno.id) + 1 };
      }
      cola.encolar(turno);
      return { turno, posicion: heap.tamano + cola.tamano };
    });
  }

  function actualizarTurno(datos) {
    const visita = validarVisita(datos);
    if (!Number.isSafeInteger(datos.turnoId) || datos.turnoId < 1) {
      throw new ErrorSolicitud("Selecciona un turno válido.");
    }
    return enTransaccion(() => {
      const turno = buscarTurno.get(datos.turnoId);
      if (!turno) throw new ErrorSolicitud("El turno no existe.", 404);
      if (turno.estado === "finalizado") throw new ErrorSolicitud("Esta visita ya terminó. Solicita un nuevo turno.", 409);
      const clasificacion = validarClasificacion(datos, turno);
      if (turno.estado === "en_atencion" && (turno.tipo !== clasificacion.tipo || turno.prioridad !== clasificacion.prioridad)) {
        throw new ErrorSolicitud("La prioridad solo puede cambiar mientras la visita está en espera.", 409);
      }
      guardarServicios(turno.id, visita);
      if (turno.veterinarioId && !compatibles(visita.serviciosIds).some((v) => v.id === turno.veterinarioId)) {
        throw new ErrorSolicitud("El veterinario asignado no ofrece todos esos servicios. Durante la consulta no puedes cambiar de profesional.", 409);
      }
      actualizarClasificacion.run(clasificacion.tipo, clasificacion.prioridad, turno.id);
      return completarTurno(buscarTurno.get(turno.id));
    });
  }

  function elegirVeterinario(turno, datos) {
    const opciones = turno.veterinariosCompatibles;
    if (datos.veterinarioId !== undefined && (!Number.isSafeInteger(datos.veterinarioId) || datos.veterinarioId < 1)) {
      throw new ErrorSolicitud("Selecciona un veterinario válido.");
    }
    if (!opciones.length) throw new ErrorSolicitud("No hay un veterinario que ofrezca todos los servicios de esta visita. Regístralo en Veterinarios; el turno sigue en espera.", 409);
    const elegido = datos.veterinarioId === undefined ? opciones[0] : opciones.find((v) => v.id === datos.veterinarioId);
    if (!elegido) throw new ErrorSolicitud("Ese veterinario no ofrece todos los servicios de la visita.", 409);
    return elegido;
  }

  function llamarSiguiente(datos = {}) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) throw new ErrorSolicitud("Envía los datos de asignación.");
    return enTransaccion(() => {
      if (enAtencion.get()) {
        throw new ErrorSolicitud("Cierra el turno en atención antes de llamar otro paciente.", 409);
      }
      const cola = reconstruirCola();
      const heap = reconstruirHeap();
      const siguiente = heap.estaVacio() ? cola.desencolar() : heap.extraer();
      if (!siguiente) throw new ErrorSolicitud("No hay turnos pendientes.", 409);
      if (datos.turnoId !== undefined && datos.turnoId !== siguiente.id) throw new ErrorSolicitud("El próximo paciente cambió. Actualiza los turnos antes de llamar.", 409);
      const veterinario = elegirVeterinario(siguiente, datos);
      llamarTurno.run(veterinario.id, siguiente.id);
      return completarTurno(buscarTurno.get(siguiente.id));
    });
  }

  function asignarVeterinario(datos) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos) || !Number.isSafeInteger(datos.turnoId) || datos.turnoId < 1) {
      throw new ErrorSolicitud("Selecciona una visita válida.");
    }
    return enTransaccion(() => {
      const actual = completarTurno(enAtencion.get());
      if (!actual || actual.id !== datos.turnoId) throw new ErrorSolicitud("La visita indicada no está en atención. Actualiza los turnos.", 409);
      if (actual.veterinarioId) throw new ErrorSolicitud("La consulta ya tiene un veterinario asignado. No puedes cambiarlo durante la atención.", 409);
      const veterinario = elegirVeterinario(actual, datos);
      asignarTurno.run(veterinario.id, actual.id);
      return completarTurno(buscarTurno.get(actual.id));
    });
  }

  function finalizarTurno() {
    return enTransaccion(() => {
      const actual = enAtencion.get();
      if (!actual) throw new ErrorSolicitud("No hay un turno en atención.", 409);
      if (!actual.veterinarioId) throw new ErrorSolicitud("Asigna un veterinario a esta visita antes de cerrarla.", 409);
      cerrarTurno.run(actual.id);
      return completarTurno(buscarTurno.get(actual.id));
    });
  }

  function registrarMascota(datos) {
    const mascota = validarMascota(datos);
    const nombreClave = mascota.propietario.toLocaleLowerCase("es");
    const telefonoClave = mascota.telefono.replace(/\D/g, "");
    // La transacción guarda propietario y mascota juntos, o revierte ambos.
    let guardada;
    conexion.exec("BEGIN IMMEDIATE");
    try {
      insertarPropietario.run(mascota.propietario, mascota.telefono, nombreClave, telefonoClave);
      const propietario = buscarPropietario.get(nombreClave, telefonoClave);
      // Los signos ? enlazan valores: no concatenamos datos del usuario al SQL.
      const resultado = insertarMascota.run(mascota.nombre, mascota.especie, mascota.raza, propietario.id);
      guardada = buscarMascota.get(resultado.lastInsertRowid);
      conexion.exec("COMMIT");
    } catch (error) {
      conexion.exec("ROLLBACK");
      throw error;
    }
    indexarMascota(guardada);
    return guardada;
  }
  return {
    listarMascotas: () => listar.all(),
    buscarMascotas,
    registrarMascota,
    listarVeterinarios,
    registrarVeterinario: (datos) => guardarVeterinario(datos),
    actualizarVeterinario: (datos) => guardarVeterinario(datos, true),
    asignarVeterinario,
    estadoTurnos,
    registrarTurno,
    actualizarTurno,
    llamarSiguiente,
    finalizarTurno,
    cerrar: () => conexion.close(),
  };
}
