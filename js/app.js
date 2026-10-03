// Estado de esta primera versión. Se pierde al recargar la página.
// Este arreglo es temporal: no sustituye las estructuras propias de la rúbrica.
const mascotas = [];

// El DOM es la representación de los elementos HTML que JavaScript puede modificar.
const formulario = document.querySelector("#formulario-mascota");
const lista = document.querySelector("#lista-mascotas");
const mensaje = document.querySelector("#mensaje-registro");
const nombreInput = document.querySelector("#nombre");
const propietarioInput = document.querySelector("#propietario");
const telefonoInput = document.querySelector("#telefono");

function mostrarPagina() {
  const pagina = location.hash === "#mascotas" ? "mascotas" : "inicio";

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

  document.title = pagina === "inicio"
    ? "VetTurnos · Inicio"
    : "VetTurnos · Registro de mascotas";
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

function registrarMascota(evento) {
  // Impide que el navegador envíe el formulario y recargue la página.
  evento.preventDefault();

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

  mascotas.push(mascota);

  if (mascotas.length === 1) {
    lista.replaceChildren();
  }
  lista.append(crearTarjeta(mascota));
  actualizarResumen();
  formulario.reset();
  mostrarMensaje(`${mascota.nombre} fue registrada correctamente.`);
  nombreInput.focus();
}

formulario.addEventListener("submit", registrarMascota);
// El enlace de accesibilidad mueve el foco sin cambiar la pantalla actual.
document.querySelector(".skip-link").addEventListener("click", (evento) => {
  evento.preventDefault();
  document.querySelector("#contenido").focus();
});
window.addEventListener("hashchange", mostrarPagina);
mostrarPagina();
actualizarResumen();
