const formularioTurno = document.querySelector("#formulario-turno");
const mascotaTurno = document.querySelector("#mascota-turno");
const buscadorTurno = document.querySelector("#buscar-mascota-turno");
const motivoTurno = document.querySelector("#motivo-turno");
const opcionesServicios = document.querySelector("#opciones-servicios");
const botonTurno = formularioTurno.querySelector('button[type="submit"]');
const botonLlamar = document.querySelector("#llamar-siguiente");
const botonCerrar = document.querySelector("#cerrar-turno");
const botonActualizarTurnos = document.querySelector("#recargar-turnos");
const avisoTurnos = document.querySelector("#estado-turnos");
let estadoCola = null;
let operacionTurno = false;
let buscando = false;
let revisionBusqueda = 0;
let temporizadorBusqueda;

function visitaSeleccionada() {
  const id = Number(mascotaTurno.value);
  return [...(estadoCola?.pendientes ?? []), estadoCola?.enAtencion].find((turno) => turno?.mascotaId === id);
}
function serviciosSeleccionados() {
  return [...opcionesServicios.querySelectorAll("input:checked")].map((input) => Number(input.value));
}
function actualizarBotonesTurnos() {
  const bloqueado = operacionTurno || !estadoCola;
  botonTurno.disabled = bloqueado || buscando || !mascotaTurno.value || !serviciosSeleccionados().length;
  botonLlamar.disabled = bloqueado || Boolean(estadoCola?.enAtencion) || !estadoCola?.cantidad;
  botonCerrar.disabled = bloqueado || !estadoCola?.enAtencion;
  botonActualizarTurnos.disabled = operacionTurno;
  mascotaTurno.disabled = bloqueado || buscando;
  buscadorTurno.disabled = operacionTurno;
  document.querySelector("#servicios-turno").disabled = bloqueado;
  motivoTurno.disabled = bloqueado;
}
function opcionTurno(valor, texto) {
  const opcion = document.createElement("option");
  opcion.value = valor;
  opcion.textContent = texto;
  return opcion;
}
function prepararVisitaSeleccionada() {
  const visita = visitaSeleccionada();
  // Cambiar de paciente carga su visita; los datos no se mezclan entre mascotas.
  opcionesServicios.querySelectorAll("input").forEach((input) => {
    input.checked = Boolean(visita?.servicios.some((servicio) => servicio.id === Number(input.value)));
  });
  motivoTurno.value = visita?.motivo ?? "";
  document.querySelector("#texto-boton-turno").textContent = visita ? "Guardar cambios de la visita" : "Añadir a la cola";
  document.querySelector("#ayuda-visita").textContent = visita
    ? `Visita #${visita.id} ${visita.estado === "en_atencion" ? "en atención" : "en espera"}. Puedes cambiar sus servicios y motivo sin crear otro turno ni perder su lugar.`
    : "Nueva visita: marca los servicios que necesita y escribe el motivo si lo deseas.";
  actualizarBotonesTurnos();
}
function mostrarResultados(mascotas) {
  const seleccion = mascotaTurno.value;
  const limite = 30;
  const visibles = mascotas.slice(0, limite);
  const seleccionada = mascotas.find((mascota) => String(mascota.id) === seleccion);
  if (seleccionada && !visibles.includes(seleccionada)) visibles.push(seleccionada);
  mascotaTurno.replaceChildren(opcionTurno("", mascotas.length ? "Selecciona una mascota" : "Sin coincidencias"));
  visibles.forEach((mascota) => {
    const visita = [...estadoCola.pendientes, estadoCola.enAtencion].find((turno) => turno?.mascotaId === mascota.id);
    mascotaTurno.append(opcionTurno(mascota.id, `${mascota.nombre} · ${mascota.propietario} · #${mascota.id}${visita ? " (visita activa)" : ""}`));
  });
  mascotaTurno.value = seleccionada ? seleccion : "";
  document.querySelector("#resultados-busqueda-turno").textContent = mascotas.length
    ? `${mascotas.length} coincidencia${mascotas.length === 1 ? "" : "s"}.${mascotas.length > limite ? ` Se muestran ${visibles.length}; escribe más letras para reducir la lista.` : ""}`
    : "No hay coincidencias. Prueba otro nombre o registra la mascota en Mascotas.";
  if (seleccion !== mascotaTurno.value) prepararVisitaSeleccionada();
}
function mostrarEstadoCola(mascotas, estado) {
  estadoCola = estado;
  opcionesServicios.replaceChildren();
  estado.servicios.forEach((servicio) => {
    const etiqueta = document.createElement("label");
    etiqueta.className = "service-option";
    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.name = "serviciosIds";
    casilla.value = servicio.id;
    etiqueta.append(casilla, document.createTextNode(servicio.nombre));
    opcionesServicios.append(etiqueta);
  });
  mostrarResultados(mascotas);
  prepararVisitaSeleccionada();
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
    descripcion.textContent = `Visita #${turno.id} · ${turno.servicio}`;
    detalles.append(titulo, descripcion);
    if (turno.motivo) {
      const motivo = document.createElement("p");
      motivo.textContent = `Motivo: ${turno.motivo}`;
      detalles.append(motivo);
    }
    tarjeta.append(posicion, detalles);
    listaTurnos.append(tarjeta);
  });
  const actual = document.querySelector("#turno-actual");
  actual.replaceChildren();
  const paciente = document.createElement("p");
  paciente.className = "panel-description";
  paciente.textContent = estado.enAtencion
    ? `${estado.enAtencion.mascotaNombre} · ${estado.enAtencion.servicio} · Visita #${estado.enAtencion.id}`
    : "Todavía no hay un paciente en atención.";
  actual.append(paciente);
  if (estado.enAtencion?.motivo) {
    const motivo = document.createElement("p");
    motivo.className = "panel-description";
    motivo.textContent = `Motivo: ${estado.enAtencion.motivo}`;
    actual.append(motivo);
  }
  document.querySelector("#contador-turnos").textContent = estado.cantidad;
  document.querySelector("#total-turnos").textContent = estado.cantidad;
}
async function consultarTurnos() {
  const respuestas = await Promise.all([fetch(`/api/mascotas?q=${encodeURIComponent(buscadorTurno.value)}`), fetch("/api/turnos")]);
  if (respuestas.some((respuesta) => !respuesta.ok)) throw new Error("No se pudieron consultar los turnos.");
  return Promise.all(respuestas.map((respuesta) => respuesta.json()));
}
async function cargarTurnos() {
  if (operacionTurno) return;
  revisionBusqueda++;
  buscando = false;
  operacionTurno = true;
  actualizarBotonesTurnos();
  avisoTurnos.textContent = "Cargando turnos…";
  try {
    const [mascotas, estado] = await consultarTurnos();
    mostrarEstadoCola(mascotas, estado);
    avisoTurnos.textContent = "Cada visita conserva su lugar en la cola, aunque añadas otro servicio. Cierra la atención para llamar al siguiente.";
  } catch {
    estadoCola = null;
    avisoTurnos.textContent = "No se pudieron cargar los turnos. Comprueba el servidor y pulsa Actualizar turnos.";
  } finally {
    operacionTurno = false;
    actualizarBotonesTurnos();
  }
}
async function buscarMascotasTurno(revision) {
  if (revision !== revisionBusqueda || operacionTurno || !estadoCola) return;
  try {
    const respuesta = await fetch(`/api/mascotas?q=${encodeURIComponent(buscadorTurno.value)}`);
    if (!respuesta.ok) throw new Error("No se pudo buscar.");
    const mascotas = await respuesta.json();
    if (revision !== revisionBusqueda) return;
    mostrarResultados(mascotas);
  } catch {
    if (revision !== revisionBusqueda) return;
    mascotaTurno.replaceChildren(opcionTurno("", "Búsqueda no disponible"));
    prepararVisitaSeleccionada();
    document.querySelector("#resultados-busqueda-turno").textContent = "No se pudo buscar. Pulsa Actualizar turnos para reintentar.";
  } finally {
    if (revision === revisionBusqueda) {
      buscando = false;
      actualizarBotonesTurnos();
    }
  }
}
async function enviarOperacionTurno(ruta, datos, mensajeExito) {
  if (operacionTurno || !estadoCola) return;
  revisionBusqueda++;
  buscando = false;
  operacionTurno = true;
  actualizarBotonesTurnos();
  avisoTurnos.textContent = "Guardando cambio…";
  try {
    const respuesta = await fetch(ruta, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.error || "No se pudo completar la operación.");
    const [mascotas, estado] = await consultarTurnos();
    mostrarEstadoCola(mascotas, estado);
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
buscadorTurno.addEventListener("input", () => {
  clearTimeout(temporizadorBusqueda);
  const revision = ++revisionBusqueda;
  buscando = true;
  document.querySelector("#resultados-busqueda-turno").textContent = "Buscando mascotas…";
  actualizarBotonesTurnos();
  temporizadorBusqueda = setTimeout(() => buscarMascotasTurno(revision), 200);
});
mascotaTurno.addEventListener("change", prepararVisitaSeleccionada);
opcionesServicios.addEventListener("change", actualizarBotonesTurnos);
formularioTurno.addEventListener("submit", (evento) => {
  evento.preventDefault();
  if (botonTurno.disabled) return;
  const visita = visitaSeleccionada();
  const datos = { serviciosIds: serviciosSeleccionados(), motivo: motivoTurno.value };
  enviarOperacionTurno(visita ? "/api/turnos/actualizar" : "/api/turnos", {
    ...datos, ...(visita ? { turnoId: visita.id } : { mascotaId: Number(mascotaTurno.value) }),
  }, visita ? "Visita actualizada. Conserva su lugar y todos los servicios marcados." : "Visita añadida al final de la cola con sus servicios.");
});
botonLlamar.addEventListener("click", () => enviarOperacionTurno("/api/turnos/llamar", {}, "El primer paciente de la cola pasó a atención."));
botonCerrar.addEventListener("click", () => enviarOperacionTurno("/api/turnos/finalizar", {}, "Visita cerrada. Puedes llamar al siguiente paciente."));
botonActualizarTurnos.addEventListener("click", cargarTurnos);
window.addEventListener("hashchange", () => { if (location.hash === "#turnos") cargarTurnos(); });
cargarTurnos();
