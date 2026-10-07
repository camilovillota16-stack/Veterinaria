import { fileURLToPath } from "node:url";
import { crearAlmacen } from "./db/database.mjs";
import { crearServidor } from "./api/servidor.mjs";
import { leerConfiguracion } from "./configuracion.mjs";

const { puerto, host, origenPublico } = leerConfiguracion();
const rutaDatos = process.env.VETERINARIA_DB_PATH
  || fileURLToPath(new URL("data/veterinaria.db", import.meta.url));
const almacen = crearAlmacen(rutaDatos);
const servidor = crearServidor(almacen, { origenPublico });

servidor.once("close", () => almacen.cerrar());
servidor.on("error", (error) => {
  console.error("No se pudo iniciar el servidor:", error.message);
  almacen.cerrar();
  process.exitCode = 1;
});
process.on("SIGINT", () => servidor.close());
process.on("SIGTERM", () => servidor.close());

// Localmente solo acepta conexiones del equipo; HOST permite configurar el alojamiento.
servidor.listen(puerto, host, () => {
  console.log(`Veterinaria disponible en http://localhost:${puerto}`);
  if (origenPublico) console.log('Dirección pública configurada:', origenPublico);
  console.log("Registros persistentes en:", rutaDatos);
  console.log("Presiona Ctrl+C para detener el servidor.");
});
