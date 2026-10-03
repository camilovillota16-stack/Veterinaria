const formularioTurno = document.querySelector("#formulario-turno");
const mascotaTurno = document.querySelector("#mascota-turno");
const buscadorTurno = document.querySelector("#buscar-mascota-turno");
const motivoTurno = document.querySelector("#motivo-turno");
const tipoTurno = document.querySelector("#tipo-turno");
const prioridadTurno = document.querySelector("#prioridad-turno");
const opcionesServicios = document.querySelector("#opciones-servicios");
const botonTurno = formularioTurno.querySelector('button[type="submit"]');
const botonLlamar = document.querySelector("#llamar-siguiente");
const botonActualizarTurnos = document.querySelector("#recargar-turnos");
const avisoTurnos = document.querySelector("#estado-turnos");
const veterinarioSiguiente = document.querySelector("#veterinario-siguiente");
let estadoCola = null;
let operacionTurno = false;
let buscando = false;
let revisionBusqueda = 0;
let temporizadorBusqueda;
const borradoresObservaciones = new Map();

function visitaSeleccionada() {
  const id = Number(mascotaTurno.value);
  return [...(estadoCola?.pendientes ?? []), ...(estadoCola?.atenciones ?? [])].find((turno) => turno?.mascotaId === id);
}
function serviciosSeleccionados() {
  return [...opcionesServicios.querySelectorAll("input:checked")].map((input) => Number(input.value));
}
function actualizarBotonesTurnos() {
  const bloqueado = operacionTurno || !estadoCola;
  botonTurno.disabled = bloqueado || buscando || !mascotaTurno.value || !serviciosSeleccionados().length;
  const sinAsignar = estadoCola?.atenciones.some((t) => !t.veterinarioId);
  botonLlamar.disabled = bloqueado || sinAsignar || !estadoCola?.cantidad || !veterinarioSiguiente.value;
  veterinarioSiguiente.disabled = bloqueado || sinAsignar || !estadoCola?.siguiente?.veterinariosDisponibles.length;
  document.querySelector("#asignacion-siguiente").hidden = !estadoCola?.siguiente;
  document.querySelectorAll('#turno-actual button, #turno-actual select, #turno-actual textarea').forEach((control) => {
    control.disabled = bloqueado || control.dataset.sinOpciones === 'true';
  });
  botonActualizarTurnos.disabled = operacionTurno;
  mascotaTurno.disabled = bloqueado || buscando;
  buscadorTurno.disabled = operacionTurno;
  document.querySelector("#servicios-turno").disabled = bloqueado;
  motivoTurno.disabled = bloqueado;
  const enAtencion = visitaSeleccionada()?.estado === "en_atencion";
  tipoTurno.disabled = bloqueado || enAtencion;
  prioridadTurno.disabled = bloqueado || enAtencion || tipoTurno.value !== "urgente";
  document.querySelector("#grupo-prioridad").hidden = tipoTurno.value !== "urgente";
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
  tipoTurno.value = visita?.tipo ?? "normal";
  prioridadTurno.value = String(visita?.tipo === "urgente" ? visita.prioridad : 1);
  document.querySelector("#texto-boton-turno").textContent = visita ? "Guardar cambios de la visita" : "Añadir a la cola";
  document.querySelector("#ayuda-visita").textContent = visita
    ? `Visita #${visita.id} ${visita.estado === "en_atencion" ? "en atención" : "en espera"}. Puedes cambiar sus servicios y motivo sin crear otro turno. La prioridad se modifica solo mientras está en espera.`
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
    const visita = [...estadoCola.pendientes, ...estadoCola.atenciones].find((turno) => turno?.mascotaId === mascota.id);
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
  mostrarListaTurnos(document.querySelector("#lista-urgencias"), estado.urgentes, "No hay urgencias en espera.");
  mostrarListaTurnos(document.querySelector("#lista-turnos"), estado.normales, "No hay turnos normales en espera.", estado.cantidadUrgentes + 1);
  document.querySelector("#contador-urgencias").textContent = estado.cantidadUrgentes;
  document.querySelector("#contador-normales").textContent = estado.cantidadNormales;
  document.querySelector("#siguiente-turno").textContent = estado.siguiente
    ? `Próximo paciente: ${estado.siguiente.mascotaNombre} · ${etiquetaAtencion(estado.siguiente)}.`
    : "No hay pacientes pendientes.";
  mostrarOpcionesVeterinarios(veterinarioSiguiente, estado.siguiente, veterinarioSiguiente.value);
  document.querySelector("#ayuda-asignacion").textContent = estado.atenciones.some((t) => !t.veterinarioId)
    ? "Completa la asignación de la consulta antigua antes de llamar al próximo paciente."
    : !estado.siguiente
    ? "Solicita una visita para ver los profesionales compatibles."
    : estado.siguiente.veterinariosDisponibles.length
      ? "Solo aparecen veterinarios libres que ofrecen todos los servicios del próximo paciente."
      : estado.siguiente.veterinariosCompatibles.length
        ? "Los veterinarios compatibles están ocupados. Este paciente conserva su lugar hasta que uno termine su consulta."
        : "No hay un profesional compatible. Registra o actualiza sus servicios en Veterinarios; esta visita conserva su lugar en espera.";
  const actual = document.querySelector("#turno-actual");
  actual.replaceChildren();
  if (!estado.atenciones.length) {
    const vacio = document.createElement('p');
    vacio.className = 'panel-description';
    vacio.textContent = 'Todavía no hay pacientes en atención.';
    actual.append(vacio);
  }
  estado.atenciones.forEach((turno) => actual.append(tarjetaAtencion(turno)));
  for (const id of borradoresObservaciones.keys()) {
    if (!estado.atenciones.some((t) => t.id === id)) borradoresObservaciones.delete(id);
  }
  document.querySelector("#contador-turnos").textContent = estado.cantidad;
  document.querySelector("#total-turnos").textContent = estado.cantidad;
}
function tarjetaAtencion(turno) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'consultation-card';
  const titulo = document.createElement('h3');
  titulo.textContent = `${turno.mascotaNombre} · Visita #${turno.id}`;
  const servicios = document.createElement('p');
  servicios.textContent = `${turno.servicio} · ${etiquetaAtencion(turno)}`;
  const profesional = document.createElement('p');
  profesional.textContent = turno.veterinario ? `Veterinario: ${turno.veterinario} · Ocupado` : 'Consulta antigua sin veterinario: completa su asignación.';
  tarjeta.append(titulo, servicios, profesional);
  if (turno.motivo) {
    const motivo = document.createElement('p');
    motivo.textContent = `Motivo: ${turno.motivo}`;
    tarjeta.append(motivo);
  }
  const accion = document.createElement('button');
  accion.className = 'button';
  accion.type = 'button';
  if (turno.veterinarioId) {
    const etiqueta = document.createElement('label');
    const observaciones = document.createElement('textarea');
    observaciones.id = `observaciones-${turno.id}`;
    observaciones.maxLength = 2000;
    observaciones.rows = 3;
    observaciones.placeholder = 'Ej. Se realizó control.';
    observaciones.value = borradoresObservaciones.get(turno.id) ?? '';
    observaciones.addEventListener('input', () => borradoresObservaciones.set(turno.id, observaciones.value));
    etiqueta.htmlFor = observaciones.id;
    etiqueta.textContent = `Observaciones de ${turno.mascotaNombre} · #${turno.id} (opcional)`;
    tarjeta.append(etiqueta, observaciones);
    accion.textContent = `Cerrar turno de ${turno.mascotaNombre} · #${turno.id}`;
    accion.addEventListener('click', () => enviarOperacionTurno('/api/turnos/finalizar', { turnoId: turno.id, observaciones: observaciones.value }, `Consulta de ${turno.mascotaNombre} guardada en su historial. Su veterinario vuelve a estar disponible.`));
  } else {
    const etiqueta = document.createElement('label');
    const selector = document.createElement('select');
    selector.id = `asignar-visita-${turno.id}`;
    etiqueta.htmlFor = selector.id;
    etiqueta.textContent = `Veterinario para la visita #${turno.id}`;
    mostrarOpcionesVeterinarios(selector, turno);
    selector.dataset.sinOpciones = String(!turno.veterinariosDisponibles.length);
    accion.dataset.sinOpciones = selector.dataset.sinOpciones;
    tarjeta.append(etiqueta, selector);
    accion.textContent = 'Asignar veterinario';
    accion.addEventListener('click', () => enviarOperacionTurno('/api/turnos/asignar', { turnoId: turno.id, veterinarioId: Number(selector.value) }, 'Veterinario asignado a la consulta antigua.'));
  }
  tarjeta.append(accion);
  return tarjeta;
}
function mostrarOpcionesVeterinarios(selector, turno, seleccionado) {
  selector.replaceChildren();
  const opciones = turno?.veterinariosDisponibles ?? [];
  if (!opciones.length) {
    selector.append(opcionTurno("", turno ? "Sin veterinario disponible" : "Sin paciente"));
    return;
  }
  opciones.forEach((v) => selector.append(opcionTurno(v.id, `${v.nombre} · #${v.id}`)));
  const valor = String(seleccionado ?? "");
  selector.value = opciones.some((v) => String(v.id) === valor) ? valor : String(opciones[0].id);
}
function etiquetaAtencion(turno) {
  return turno.tipo === "urgente"
    ? `Urgente · prioridad ${["", "baja", "media", "alta"][turno.prioridad]} (${turno.prioridad})`
    : "Normal";
}
function mostrarListaTurnos(listaTurnos, turnos, textoVacio, inicio = 1) {
  listaTurnos.replaceChildren();
  if (!turnos.length) {
    const vacio = document.createElement("p");
    vacio.className = "empty-state";
    vacio.textContent = textoVacio;
    listaTurnos.append(vacio);
  }
  turnos.forEach((turno, indice) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = turno.tipo === "urgente" ? "patient-card urgent-card" : "patient-card";
    const posicion = document.createElement("span");
    posicion.className = "queue-position";
    posicion.textContent = String(indice + inicio).padStart(2, "0");
    const detalles = document.createElement("div");
    detalles.className = "patient-details";
    const titulo = document.createElement("h3");
    titulo.textContent = turno.mascotaNombre;
    const tipo = document.createElement("span");
    tipo.className = turno.tipo === "urgente" ? "species-tag urgent-tag" : "species-tag";
    tipo.textContent = etiquetaAtencion(turno);
    const descripcion = document.createElement("p");
    descripcion.textContent = `Visita #${turno.id} · ${turno.servicio}`;
    detalles.append(titulo, tipo, descripcion);
    if (turno.motivo) {
      const motivo = document.createElement("p");
      motivo.textContent = `Motivo: ${turno.motivo}`;
      detalles.append(motivo);
    }
    tarjeta.append(posicion, detalles);
    listaTurnos.append(tarjeta);
  });
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
    avisoTurnos.textContent = "Primero las urgencias por prioridad; en empates se respeta la llegada. Cada veterinario libre puede atender a un paciente diferente.";
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
tipoTurno.addEventListener("change", actualizarBotonesTurnos);
veterinarioSiguiente.addEventListener("change", actualizarBotonesTurnos);
formularioTurno.addEventListener("submit", (evento) => {
  evento.preventDefault();
  if (botonTurno.disabled) return;
  const visita = visitaSeleccionada();
  const datos = {
    serviciosIds: serviciosSeleccionados(), motivo: motivoTurno.value,
    tipo: tipoTurno.value, prioridad: tipoTurno.value === "urgente" ? Number(prioridadTurno.value) : 0,
  };
  enviarOperacionTurno(visita ? "/api/turnos/actualizar" : "/api/turnos", {
    ...datos, ...(visita ? { turnoId: visita.id } : { mascotaId: Number(mascotaTurno.value) }),
  }, visita ? "Visita actualizada. Conserva su llegada; el orden depende del tipo y la prioridad." : "Visita registrada con sus servicios. Las urgencias pasan primero, según su prioridad.");
});
botonLlamar.addEventListener("click", () => enviarOperacionTurno("/api/turnos/llamar", {
  turnoId: estadoCola.siguiente?.id, veterinarioId: Number(veterinarioSiguiente.value),
}, "El siguiente paciente pasó a atención con su veterinario asignado."));
botonActualizarTurnos.addEventListener("click", cargarTurnos);
window.addEventListener("hashchange", () => { if (location.hash === "#turnos") cargarTurnos(); });
cargarTurnos();
