import { crearAlmacen } from "../db/database.mjs";

// Las pruebas de cola, heap y visitas necesitan ahora un profesional compatible.
export function crearAlmacenConVeterinario(ruta) {
  const almacen = crearAlmacen(ruta);
  if (!almacen.listarVeterinarios().length) {
    almacen.registrarVeterinario({ nombre: "Veterinario de prueba", serviciosIds: almacen.estadoTurnos().servicios.map((s) => s.id) });
  }
  return almacen;
}
