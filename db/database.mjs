import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { validarMascota, ErrorSolicitud } from "../api/validacion.mjs";
import { Cola } from "../estructuras/cola.mjs";
import { Trie, normalizarBusqueda } from "../estructuras/trie.mjs";

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
    if (!conexion.prepare("PRAGMA table_info(turnos)").all().some((columna) => columna.name === "motivo")) {
      conexion.exec("ALTER TABLE turnos ADD COLUMN motivo TEXT NOT NULL DEFAULT ''");
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
           s.nombre AS servicio, t.motivo, t.tipo, t.estado, t.creado_en AS creadoEn
    FROM turnos AS t
    JOIN mascotas AS m ON m.id = t.mascota_id
    JOIN propietarios AS p ON p.id = m.propietario_id
    JOIN servicios AS s ON s.id = t.servicio_id
  `;
  const pendientes = conexion.prepare(`${consultaTurnos} WHERE t.estado = 'pendiente' AND t.tipo = 'normal' ORDER BY t.id`);
  const enAtencion = conexion.prepare(`${consultaTurnos} WHERE t.estado = 'en_atencion'`);
  const buscarTurno = conexion.prepare(`${consultaTurnos} WHERE t.id = ?`);
  const servicios = conexion.prepare("SELECT id, nombre FROM servicios ORDER BY id");
  const buscarServicio = conexion.prepare("SELECT id FROM servicios WHERE id = ?");
  const turnoActivo = conexion.prepare("SELECT id FROM turnos WHERE mascota_id = ? AND estado IN ('pendiente', 'en_atencion')");
  const insertarTurno = conexion.prepare("INSERT INTO turnos (mascota_id, servicio_id) VALUES (?, ?)");
  const insertarServicioTurno = conexion.prepare("INSERT INTO turno_servicios (turno_id, servicio_id) VALUES (?, ?)");
  const eliminarServiciosTurno = conexion.prepare("DELETE FROM turno_servicios WHERE turno_id = ?");
  const actualizarVisita = conexion.prepare("UPDATE turnos SET servicio_id = ?, motivo = ? WHERE id = ?");
  const consultarServiciosTurno = conexion.prepare(`
    SELECT s.id, s.nombre FROM turno_servicios ts JOIN servicios s ON s.id = ts.servicio_id
    JOIN turnos t ON t.id = ts.turno_id WHERE ts.turno_id = ?
    ORDER BY CASE WHEN s.id = t.servicio_id THEN 0 ELSE 1 END, s.id
  `);
  const llamarTurno = conexion.prepare("UPDATE turnos SET estado = 'en_atencion', llamado_en = CURRENT_TIMESTAMP WHERE id = ? AND estado = 'pendiente'");
  const cerrarTurno = conexion.prepare("UPDATE turnos SET estado = 'finalizado', finalizado_en = CURRENT_TIMESTAMP WHERE id = ? AND estado = 'en_atencion'");
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

  function completarTurno(turno) {
    if (!turno) return null;
    const listaServicios = consultarServiciosTurno.all(turno.id);
    return { ...turno, servicios: listaServicios, servicio: listaServicios.map((s) => s.nombre).join(" · ") };
  }

  function reconstruirCola() {
    const cola = new Cola();
    // El identificador conserva el orden de llegada, incluso con fechas iguales.
    pendientes.all().forEach((turno) => cola.encolar(completarTurno(turno)));
    return cola;
  }

  function estadoTurnos() {
    const cola = reconstruirCola();
    return {
      pendientes: cola.aArray(),
      siguiente: cola.verPrimero(),
      cantidad: cola.tamano,
      enAtencion: completarTurno(enAtencion.get()),
      servicios: servicios.all(),
    };
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
      const resultado = insertarTurno.run(datos.mascotaId, visita.serviciosIds[0]);
      guardarServicios(resultado.lastInsertRowid, visita);
      const turno = completarTurno(buscarTurno.get(resultado.lastInsertRowid));
      cola.encolar(turno);
      return { turno, posicion: cola.tamano };
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
      guardarServicios(turno.id, visita);
      return completarTurno(buscarTurno.get(turno.id));
    });
  }

  function llamarSiguiente() {
    return enTransaccion(() => {
      if (enAtencion.get()) {
        throw new ErrorSolicitud("Cierra el turno en atención antes de llamar otro paciente.", 409);
      }
      const cola = reconstruirCola();
      const siguiente = cola.desencolar();
      if (!siguiente) throw new ErrorSolicitud("No hay turnos pendientes.", 409);
      llamarTurno.run(siguiente.id);
      return completarTurno(buscarTurno.get(siguiente.id));
    });
  }

  function finalizarTurno() {
    return enTransaccion(() => {
      const actual = enAtencion.get();
      if (!actual) throw new ErrorSolicitud("No hay un turno en atención.", 409);
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
    estadoTurnos,
    registrarTurno,
    actualizarTurno,
    llamarSiguiente,
    finalizarTurno,
    cerrar: () => conexion.close(),
  };
}
