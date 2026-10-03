import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { validarMascota } from "../api/validacion.mjs";

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
  `);
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

  function registrarMascota(datos) {
    const mascota = validarMascota(datos);
    const nombreClave = mascota.propietario.toLocaleLowerCase("es");
    const telefonoClave = mascota.telefono.replace(/\D/g, "");
    // La transacción guarda propietario y mascota juntos, o revierte ambos.
    conexion.exec("BEGIN IMMEDIATE");
    try {
      insertarPropietario.run(mascota.propietario, mascota.telefono, nombreClave, telefonoClave);
      const propietario = buscarPropietario.get(nombreClave, telefonoClave);
      // Los signos ? enlazan valores: no concatenamos datos del usuario al SQL.
      const resultado = insertarMascota.run(mascota.nombre, mascota.especie, mascota.raza, propietario.id);
      const guardada = buscarMascota.get(resultado.lastInsertRowid);
      conexion.exec("COMMIT");
      return guardada;
    } catch (error) {
      conexion.exec("ROLLBACK");
      throw error;
    }
  }
  return {
    listarMascotas: () => listar.all(),
    registrarMascota,
    cerrar: () => conexion.close(),
  };
}
