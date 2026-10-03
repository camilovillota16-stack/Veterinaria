const formularioTurno = document.querySelector("#formulario-turno");
const mascotaTurno = document.querySelector("#mascota-turno");
const servicioTurno = document.querySelector("#servicio-turno");
const botonTurno = formularioTurno.querySelector('button[type="submit"]');
const botonLlamar = document.querySelector("#llamar-siguiente");
const botonCerrar = document.querySelector("#cerrar-turno");
const botonActualizarTurnos = document.querySelector("#recargar-turnos");
const avisoTurnos = document.querySelector("#estado-turnos");
let estadoCola = null;
let operacionTurno = false;
let mascotasDisponibles = 0;

function actualizarBotonesTurnos() {
  const bloqueado = operacionTurno || !estadoCola;
  botonTurno.disabled = bloqueado || !mascotasDisponibles;
  botonLlamar.disabled = bloqueado || Boolean(estadoCola?.enAtencion) || !estadoCola?.cantidad;
  botonCerrar.disabled = bloqueado || !estadoCola?.enAtencion;
  botonActualizarTurnos.disabled = operacionTurno;
}

function opcionTurno(valor, texto, deshabilitada = false) {
  const opcion = document.createElement("option");
  opcion.value = valor;
  opcion.textContent = texto;
  opcion.disabled = deshabilitada;
  return opcion;
}

function mostrarEstadoCola(mascotasGuardadas, estado) {
  estadoCola = estado;
  const seleccionMascota = mascotaTurno.value;
  const seleccionServicio = servicioTurno.value;
  const ocupadas = new Set(estado.pendientes.map((turno) => turno.mascotaId));
  if (estado.enAtencion) ocupadas.add(estado.enAtencion.mascotaId);
  mascotasDisponibles = mascotasGuardadas.filter((mascota) => !ocupadas.has(mascota.id)).length;

  mascotaTurno.replaceChildren(opcionTurno("", mascotasDisponibles ? "Selecciona una mascota" : "No hay mascotas disponibles"));
  mascotasGuardadas.forEach((mascota) => {
    const ocupada = ocupadas.has(mascota.id);
    mascotaTurno.append(opcionTurno(mascota.id, `${mascota.nombre} · ${mascota.propietario}${ocupada ? " (con turno activo)" : ""}`, ocupada));
  });
  mascotaTurno.value = seleccionMascota;
  servicioTurno.replaceChildren(opcionTurno("", "Selecciona un servicio"));
  estado.servicios.forEach((servicio) => servicioTurno.append(opcionTurno(servicio.id, servicio.nombre)));
  servicioTurno.value = seleccionServicio;

  const listaTurnos = document.querySelector("#lista-turnos");
  listaTurnos.replaceChildren();
  if (!estado.cantidad) {
    const vacio = document.createElement("p");
    vacio.className = "empty-state";
    vacio.textContent = "No hay pacientes en espera.";
    listaTurnos.append(vacio);
  }
  estado.pendientes.forEach((turno, indice) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "patient-card";
    const posicion = document.createElement("span");
    posicion.className = "queue-position";
    posicion.textContent = String(indice + 1).padStart(2, "0");
    const detalles = document.createElement("div");
    detalles.className = "patient-details";
    const titulo = document.createElement("h3");
    titulo.textContent = turno.mascotaNombre;
    const descripcion = document.createElement("p");
    descripcion.textContent = `Turno #${turno.id} · ${turno.servicio}`;
    detalles.append(titulo, descripcion);
    tarjeta.append(posicion, detalles);
    listaTurnos.append(tarjeta);
  });
  const actual = document.querySelector("#turno-actual");
  actual.replaceChildren();
  const paciente = document.createElement("p");
  paciente.className = "panel-description";
  paciente.textContent = estado.enAtencion
    ? `${estado.enAtencion.mascotaNombre} · ${estado.enAtencion.servicio} · Turno #${estado.enAtencion.id}`
    : "Todavía no hay un paciente en atención.";
  actual.append(paciente);
  document.querySelector("#contador-turnos").textContent = estado.cantidad;
  document.querySelector("#total-turnos").textContent = estado.cantidad;
}

async function consultarTurnos() {
  const respuestas = await Promise.all([fetch("/api/mascotas"), fetch("/api/turnos")]);
  if (respuestas.some((respuesta) => !respuesta.ok)) throw new Error("No se pudieron consultar los turnos.");
  return Promise.all(respuestas.map((respuesta) => respuesta.json()));
}

async function cargarTurnos() {
  if (operacionTurno) return;
  operacionTurno = true;
  actualizarBotonesTurnos();
  avisoTurnos.textContent = "Cargando turnos…";
  try {
    const [mascotasGuardadas, estado] = await consultarTurnos();
    mostrarEstadoCola(mascotasGuardadas, estado);
    avisoTurnos.textContent = "Los turnos se conservan al recargar. Cierra el turno en atención para llamar al siguiente.";
  } catch {
    estadoCola = null;
    avisoTurnos.textContent = "No se pudieron cargar los turnos. Comprueba el servidor y pulsa Actualizar turnos.";
  } finally {
    operacionTurno = false;
    actualizarBotonesTurnos();
  }
}

async function enviarOperacionTurno(ruta, datos, mensajeExito) {
  if (operacionTurno || !estadoCola) return;
  operacionTurno = true;
  actualizarBotonesTurnos();
  avisoTurnos.textContent = "Guardando cambio…";
  try {
    const respuesta = await fetch(ruta, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.error || "No se pudo completar la operación.");
    const [mascotasGuardadas, estado] = await consultarTurnos();
    mostrarEstadoCola(mascotasGuardadas, estado);
    if (ruta === "/api/turnos") formularioTurno.reset();
    avisoTurnos.textContent = mensajeExito;
  } catch (error) {
    const detalle = error instanceof TypeError || error instanceof SyntaxError
      ? "No se pudo confirmar la respuesta del servidor." : error.message;
    avisoTurnos.textContent = `${detalle} Pulsa Actualizar turnos para comprobar el estado antes de repetir la operación.`;
  } finally {
    operacionTurno = false;
    actualizarBotonesTurnos();
  }
}

formularioTurno.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const datos = new FormData(formularioTurno);
  enviarOperacionTurno("/api/turnos", {
    mascotaId: Number(datos.get("mascotaId")), servicioId: Number(datos.get("servicioId")),
  }, "Turno añadido al final de la cola.");
});
botonLlamar.addEventListener("click", () => enviarOperacionTurno("/api/turnos/llamar", {}, "El primer paciente de la cola pasó a atención."));
botonCerrar.addEventListener("click", () => enviarOperacionTurno("/api/turnos/finalizar", {}, "Turno cerrado. Puedes llamar al siguiente paciente."));
botonActualizarTurnos.addEventListener("click", cargarTurnos);
window.addEventListener("hashchange", () => { if (location.hash === "#turnos") cargarTurnos(); });
cargarTurnos();
