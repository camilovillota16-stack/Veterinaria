import { fileURLToPath } from "node:url";
import { crearAlmacen } from "./db/database.mjs";
import { crearServidor } from "./api/servidor.mjs";

const puerto = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  throw new Error("PORT debe ser un puerto entre 1 y 65535.");
}
const rutaDatos = process.env.VETERINARIA_DB_PATH
  || fileURLToPath(new URL("data/veterinaria.db", import.meta.url));
const almacen = crearAlmacen(rutaDatos);
const servidor = crearServidor(almacen);

servidor.once("close", () => almacen.cerrar());
servidor.on("error", (error) => {
  console.error("No se pudo iniciar el servidor:", error.message);
  almacen.cerrar();
  process.exitCode = 1;
});
process.on("SIGINT", () => servidor.close());
process.on("SIGTERM", () => servidor.close());

// Por ahora ejecutamos la aplicación solo en el equipo local.
servidor.listen(puerto, "127.0.0.1", () => {
  console.log(`Veterinaria disponible en http://localhost:${puerto}`);
  console.log("Registros persistentes en:", rutaDatos);
  console.log("Presiona Ctrl+C para detener el servidor.");
});
