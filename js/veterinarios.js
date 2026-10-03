const formularioVet = document.querySelector("#formulario-veterinario");
const editarVet = document.querySelector("#veterinario-editar");
const nombreVet = document.querySelector("#nombre-veterinario");
const serviciosVet = document.querySelector("#opciones-veterinario");
const guardarVet = document.querySelector("#guardar-veterinario");
const recargarVet = document.querySelector("#recargar-veterinarios");
const avisoVet = document.querySelector("#estado-veterinarios");
let profesionales = [];
let cargadosVet = false;
let operacionVet = false;

function casillasVet() { return [...serviciosVet.querySelectorAll("input:checked")].map((input) => Number(input.value)); }
function botonesVet() {
  const bloqueado = operacionVet || !cargadosVet;
  guardarVet.disabled = bloqueado || !casillasVet().length;
  recargarVet.disabled = operacionVet;
  editarVet.disabled = bloqueado;
  nombreVet.disabled = bloqueado;
  document.querySelector("#servicios-veterinario").disabled = bloqueado;
}
function seleccionarVet() {
  const elegido = profesionales.find((v) => v.id === Number(editarVet.value));
  nombreVet.value = elegido?.nombre ?? "";
  serviciosVet.querySelectorAll("input").forEach((input) => {
    input.checked = Boolean(elegido?.servicios.some((s) => s.id === Number(input.value)));
  });
  guardarVet.textContent = elegido ? "Guardar cambios del veterinario" : "Registrar veterinario";
  botonesVet();
}
function pintarVeterinarios(lista, servicios) {
  profesionales = lista;
  const seleccion = editarVet.value;
  editarVet.replaceChildren();
  const nuevo = document.createElement("option");
  nuevo.value = "";
  nuevo.textContent = "Nuevo veterinario";
  editarVet.append(nuevo);
  lista.forEach((v) => {
    const opcion = document.createElement("option");
    opcion.value = v.id;
    opcion.textContent = `${v.nombre} · #${v.id}`;
    editarVet.append(opcion);
  });
  editarVet.value = lista.some((v) => String(v.id) === seleccion) ? seleccion : "";
  serviciosVet.replaceChildren();
  servicios.forEach((s) => {
    const etiqueta = document.createElement("label");
    etiqueta.className = "service-option";
    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.value = s.id;
    etiqueta.append(casilla, document.createTextNode(s.nombre));
    serviciosVet.append(etiqueta);
  });
  const contenedor = document.querySelector("#lista-veterinarios");
  contenedor.replaceChildren();
  if (!lista.length) {
    const vacio = document.createElement("p");
    vacio.className = "empty-state";
    vacio.textContent = "Todavía no hay veterinarios. Registra el primero y marca sus servicios.";
    contenedor.append(vacio);
  }
  lista.forEach((v) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "patient-card";
    const detalle = document.createElement("div");
    detalle.className = "patient-details";
    const titulo = document.createElement("h3");
    titulo.textContent = v.nombre;
    const texto = document.createElement("p");
    texto.textContent = v.servicios.map((s) => s.nombre).join(" · ");
    const disponibilidad = document.createElement("p");
    disponibilidad.textContent = v.ocupado ? "Ocupado · consulta en curso" : "Disponible";
    detalle.append(titulo, texto, disponibilidad);
    tarjeta.append(detalle);
    contenedor.append(tarjeta);
  });
  document.querySelector("#contador-veterinarios").textContent = lista.length;
  seleccionarVet();
}
async function consultarVeterinarios() {
  const respuestas = await Promise.all([fetch("/api/veterinarios"), fetch("/api/turnos")]);
  if (respuestas.some((r) => !r.ok)) throw new Error("No se pudieron cargar los veterinarios.");
  const [lista, estado] = await Promise.all(respuestas.map((r) => r.json()));
  pintarVeterinarios(lista, estado.servicios);
}
async function cargarVeterinarios() {
  if (operacionVet) return;
  operacionVet = true;
  botonesVet();
  avisoVet.textContent = "Cargando profesionales…";
  try {
    await consultarVeterinarios();
    cargadosVet = true;
    avisoVet.textContent = "Cada profesional puede ofrecer varios servicios. Las visitas requieren alguien compatible con todos sus servicios.";
  } catch (error) {
    cargadosVet = false;
    avisoVet.textContent = `${error.message} Comprueba el servidor y pulsa Actualizar veterinarios.`;
  } finally { operacionVet = false; botonesVet(); }
}
formularioVet.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (guardarVet.disabled || operacionVet) return;
  operacionVet = true;
  botonesVet();
  avisoVet.textContent = "Guardando profesional…";
  try {
    const editar = Boolean(editarVet.value);
    const respuesta = await fetch(editar ? "/api/veterinarios/actualizar" : "/api/veterinarios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombreVet.value, serviciosIds: casillasVet(), ...(editar ? { veterinarioId: Number(editarVet.value) } : {}) }),
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.error || "No se pudo guardar.");
    await consultarVeterinarios();
    cargadosVet = true;
    avisoVet.textContent = `${resultado.nombre} guardado. Sus servicios estarán disponibles al volver a Turnos.`;
  } catch (error) {
    avisoVet.textContent = `${error.message} Si falló la conexión, actualiza los veterinarios para comprobar el registro antes de repetir.`;
  } finally { operacionVet = false; botonesVet(); }
});
editarVet.addEventListener("change", seleccionarVet);
serviciosVet.addEventListener("change", botonesVet);
recargarVet.addEventListener("click", cargarVeterinarios);
window.addEventListener("hashchange", () => { if (location.hash === "#veterinarios") cargarVeterinarios(); });
cargarVeterinarios();
