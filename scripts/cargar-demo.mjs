// Mascotas ficticias para practicar y preparar la demostración del proyecto.
// Se registran por la API, igual que desde el formulario, para actualizar el trie.
const base = "http://127.0.0.1:3000";
const ejemplos = [
  { nombre: "Luna", especie: "Gato", raza: "Siamés", propietario: "Demo Ana" },
  { nombre: "Max", especie: "Perro", raza: "Labrador", propietario: "Demo Bruno" },
  { nombre: "Nala", especie: "Gato", raza: "", propietario: "Demo Ana" },
  { nombre: "Rocky", especie: "Perro", raza: "Mestizo", propietario: "Demo Bruno" },
  { nombre: "Luna", especie: "Perro", raza: "Beagle", propietario: "Demo Carla" },
  { nombre: "Ámbar", especie: "Conejo", raza: "", propietario: "Demo Diego" },
].map((mascota) => ({ ...mascota, telefono: "0000000000" }));

function clave(mascota) {
  return JSON.stringify([
    mascota.nombre.trim().toLocaleLowerCase("es"), mascota.especie,
    (mascota.raza ?? "").trim().toLocaleLowerCase("es"),
    mascota.propietario.trim().toLocaleLowerCase("es"), mascota.telefono.replace(/\D/g, ""),
  ]);
}

async function solicitar(ruta, opciones = {}) {
  const respuesta = await fetch(`${base}${ruta}`, { ...opciones, signal: AbortSignal.timeout(5000) });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || "No se pudo consultar el servidor.");
  return datos;
}

try {
  const guardadas = await solicitar("/api/mascotas");
  if (!Array.isArray(guardadas)) throw new Error("La respuesta de mascotas no es válida.");
  const existentes = new Set(guardadas.map(clave));
  let creadas = 0;
  for (const mascota of ejemplos) {
    if (existentes.has(clave(mascota))) {
      console.log(`Ya existe: ${mascota.nombre} · ${mascota.propietario}`);
      continue;
    }
    await solicitar("/api/mascotas", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mascota),
    });
    existentes.add(clave(mascota));
    creadas++;
    console.log(`Registrada: ${mascota.nombre} · ${mascota.propietario}`);
  }
  console.log(`Carga terminada: ${creadas} nuevas, ${ejemplos.length - creadas} ya existentes.`);
  const servicios = (await solicitar("/api/turnos")).servicios;
  const veterinarios = await solicitar("/api/veterinarios");
  for (const ejemplo of [
    { nombre: "Demo Ana Veterinaria", nombresServicios: ["Consulta general", "Control"] },
    { nombre: "Demo Bruno Veterinario", nombresServicios: ["Consulta general", "Vacunación", "Control"] },
  ]) {
    if (veterinarios.some((v) => v.nombre.toLocaleLowerCase("es") === ejemplo.nombre.toLocaleLowerCase("es"))) {
      console.log(`Ya existe el profesional: ${ejemplo.nombre}`);
      continue;
    }
    const serviciosIds = ejemplo.nombresServicios.map((nombre) => servicios.find((s) => s.nombre === nombre)?.id);
    if (serviciosIds.some((id) => !id)) throw new Error("Falta un servicio necesario para los profesionales de demostración.");
    await solicitar("/api/veterinarios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: ejemplo.nombre, serviciosIds }),
    });
    console.log(`Registrado el profesional: ${ejemplo.nombre}`);
  }
} catch (error) {
  console.error("No se completó la carga:", error.message);
  console.error("Comprueba que npm.cmd start esté funcionando en el puerto 3000. Puedes repetir este comando para continuar con los ejemplos que falten.");
  process.exitCode = 1;
}
