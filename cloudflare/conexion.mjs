// Adaptar la API SQL de Cloudflare al almacén compartido, sin cambiar sus reglas.
export function crearConexionCloudflare(storage) {
  const ejecutar = (sql, argumentos = []) => storage.sql.exec(sql, ...argumentos).toArray();
  return {
    exec: (sql) => ejecutar(sql),
    prepare(sql) {
      return {
        all: (...argumentos) => ejecutar(sql, argumentos),
        get: (...argumentos) => ejecutar(sql, argumentos)[0],
        run(...argumentos) {
          ejecutar(sql, argumentos);
          return ejecutar('SELECT last_insert_rowid() AS lastInsertRowid, changes() AS changes')[0];
        },
      };
    },
    transactionSync: (operacion) => storage.transactionSync(operacion),
    close() {}, // Cloudflare administra el ciclo de vida del almacenamiento.
  };
}
