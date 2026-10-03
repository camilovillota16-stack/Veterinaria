// Copia en memoria de los registros que recuperamos de la base de datos.
// Este arreglo no sustituye las cinco estructuras propias de la rúbrica.
const mascotas = [];

// El DOM es la representación de los elementos HTML que JavaScript puede modificar.
const formulario = document.querySelector("#formulario-mascota");
const lista = document.querySelector("#lista-mascotas");
const mensaje = document.querySelector("#mensaje-registro");
const nombreInput = document.querySelector("#nombre");
const propietarioInput = document.querySelector("#propietario");
const telefonoInput = document.querySelector("#telefono");
const botonRegistrar = formulario.querySelector('button[type="submit"]');
const estadoDatos = document.querySelector("#estado-datos");
const botonReintentar = document.querySelector("#reintentar-carga");
let datosCargados = false;
let guardando = false;

function mostrarPagina() {
  const destino = location.hash.slice(1);
  const pagina = ["inicio", "mascotas", "turnos", "veterinarios"].includes(destino) ? destino : "inicio";

  document.querySelectorAll(".page").forEach((seccion) => {
    seccion.hidden = seccion.id !== pagina;
  });

  document.querySelectorAll(".nav-link").forEach((enlace) => {
    if (enlace.getAttribute("href") === `#${pagina}`) {
      enlace.setAttribute("aria-current", "page");
    } else {
      enlace.removeAttribute("aria-current");
    }
  });

  const titulos = { inicio: "Inicio", mascotas: "Registro de mascotas", turnos: "Turnos de atención", veterinarios: "Veterinarios y servicios" };
  document.title = `VetTurnos · ${titulos[pagina]}`;
}

function mostrarMensaje(texto, esError = false) {
  mensaje.textContent = texto;
  mensaje.classList.toggle("error", esError);
}

function actualizarResumen() {
  document.querySelector("#total-mascotas").textContent = mascotas.length;
  document.querySelector("#contador-lista").textContent = mascotas.length;

  // Un Set permite contar las especies distintas, sin repetirlas.
  const especies = new Set(mascotas.map((mascota) => mascota.especie));
  document.querySelector("#total-especies").textContent = especies.size;
}

function crearTarjeta(mascota) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "patient-card";

  const avatar = document.createElement("span");
  avatar.className = "patient-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = mascota.nombre.charAt(0).toUpperCase();

  const detalles = document.createElement("div");
  detalles.className = "patient-details";

  const titulo = document.createElement("h3");
  titulo.textContent = mascota.nombre;

  const especie = document.createElement("span");
  especie.className = "species-tag";
  especie.textContent = mascota.especie;

  const raza = document.createElement("p");
  raza.textContent = `Raza: ${mascota.raza || "Sin especificar"}`;

  const propietario = document.createElement("p");
  propietario.textContent = `Propietario: ${mascota.propietario}`;

  const telefono = document.createElement("p");
  telefono.textContent = `Contacto: ${mascota.telefono}`;

  // textContent muestra lo escrito como texto, sin interpretarlo como HTML.
  detalles.append(titulo, especie, raza, propietario, telefono);
  tarjeta.append(avatar, detalles);
  return tarjeta;
}

function dibujarMascotas() {
  lista.replaceChildren();
  if (!mascotas.length) {
    const vacio = document.createElement("p");
    vacio.className = "empty-state";
    vacio.textContent = "Todavía no hay mascotas registradas. Completa el formulario para añadir la primera.";
    lista.append(vacio);
  } else {
    mascotas.forEach((mascota) => lista.append(crearTarjeta(mascota)));
  }
  actualizarResumen();
}

async function cargarMascotas() {
  datosCargados = false;
  botonRegistrar.disabled = true;
  botonReintentar.hidden = true;
  estadoDatos.textContent = "Cargando los registros guardados…";
  try {
    const respuesta = await fetch("/api/mascotas");
    if (!respuesta.ok) throw new Error("No se pudieron consultar los registros.");
    const guardadas = await respuesta.json();
    if (!Array.isArray(guardadas)) throw new Error("Respuesta de registros inválida.");
    mascotas.splice(0, mascotas.length, ...guardadas);
    dibujarMascotas();
    datosCargados = true;
    estadoDatos.textContent = "Tus registros se guardan y estarán disponibles al volver a abrir la aplicación.";
  } catch {
    estadoDatos.textContent = "No se pudieron cargar los registros. Comprueba que el servidor esté funcionando y vuelve a intentarlo.";
    lista.replaceChildren();
    const aviso = document.createElement("p");
    aviso.className = "empty-state";
    aviso.textContent = "Los registros no están disponibles en este momento.";
    lista.append(aviso);
    botonReintentar.hidden = false;
  } finally {
    botonRegistrar.disabled = !datosCargados;
  }
}

async function registrarMascota(evento) {
  // Impide que el navegador envíe el formulario y recargue la página.
  evento.preventDefault();
  if (!datosCargados || guardando) return;

  const datos = new FormData(formulario);
  const mascota = {
    nombre: datos.get("nombre").trim(),
    especie: datos.get("especie"),
    raza: datos.get("raza").trim(),
    propietario: datos.get("propietario").trim(),
    telefono: datos.get("telefono").trim(),
  };

  if (!mascota.nombre || !mascota.propietario) {
    mostrarMensaje("Escribe el nombre de la mascota y de su propietario.", true);
    (!mascota.nombre ? nombreInput : propietarioInput).focus();
    return;
  }

  const digitosTelefono = mascota.telefono.replace(/\D/g, "");
  const formatoTelefonoValido = /^\+?[\d\s()-]+$/.test(mascota.telefono);
  if (!formatoTelefonoValido || digitosTelefono.length < 7 || digitosTelefono.length > 15) {
    mostrarMensaje("Introduce un teléfono válido con entre 7 y 15 dígitos.", true);
    telefonoInput.focus();
    return;
  }

  guardando = true;
  botonRegistrar.disabled = true;
  mostrarMensaje("Guardando mascota…");
  try {
    // POST envía el objeto al servidor. JSON lo convierte en texto para transportarlo.
    const respuesta = await fetch("/api/mascotas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mascota),
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.error || "No se pudo registrar la mascota.");

    // Añadimos la tarjeta solo cuando el servidor confirma que guardó el registro.
    mascotas.push(resultado);
    dibujarMascotas();
    formulario.reset();
    mostrarMensaje(`${resultado.nombre} fue registrada correctamente.`);
    nombreInput.focus();
  } catch (error) {
    const detalle = error instanceof TypeError
      ? "No se pudo conectar con el servidor."
      : error instanceof SyntaxError
        ? "No se recibió una confirmación válida."
        : error.message;
    mostrarMensaje(`No se confirmó el registro. ${detalle} Tus campos se conservan; si hubo un problema de conexión, recarga para comprobar si se guardó.`, true);
  } finally {
    guardando = false;
    botonRegistrar.disabled = !datosCargados;
  }
}

formulario.addEventListener("submit", registrarMascota);
// El enlace de accesibilidad mueve el foco sin cambiar la pantalla actual.
document.querySelector(".skip-link").addEventListener("click", (evento) => {
  evento.preventDefault();
  document.querySelector("#contenido").focus();
});
window.addEventListener("hashchange", mostrarPagina);
botonReintentar.addEventListener("click", cargarMascotas);
mostrarPagina();
actualizarResumen();
cargarMascotas();
