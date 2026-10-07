import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { crearAlmacenEnConexion } from './almacen.mjs';

// La versión local conserva node:sqlite y el mismo archivo de datos.
export function crearAlmacen(ruta) {
  if (ruta !== ':memory:') mkdirSync(dirname(resolve(ruta)), { recursive: true });
  const conexion = new DatabaseSync(ruta);
  conexion.exec('PRAGMA foreign_keys = ON');
  return crearAlmacenEnConexion({
    exec: (sql) => conexion.exec(sql),
    prepare: (sql) => conexion.prepare(sql),
    close: () => conexion.close(),
    transactionSync(operacion) {
      conexion.exec('BEGIN IMMEDIATE');
      try {
        const resultado = operacion();
        conexion.exec('COMMIT');
        return resultado;
      } catch (error) {
        conexion.exec('ROLLBACK');
        throw error;
      }
    },
  });
}
