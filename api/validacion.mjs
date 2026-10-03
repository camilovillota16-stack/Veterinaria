export class ErrorSolicitud extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.estado = estado;
  }
}

const especiesPermitidas = new Set(["Perro", "Gato", "Ave", "Conejo", "Otra"]);

function leerTexto(datos, campo, maximo, opcional = false) {
  const valor = datos[campo] ?? (opcional ? "" : null);
  if (typeof valor !== "string") {
    throw new ErrorSolicitud(`El campo ${campo} debe ser texto.`);
  }
  const texto = valor.trim();
  if ((!opcional && !texto) || texto.length > maximo) {
    throw new ErrorSolicitud(`Revisa el campo ${campo}: máximo ${maximo} caracteres.`);
  }
  return texto;
}

// El servidor vuelve a validar: también puede recibir solicitudes sin formulario.
export function validarMascota(datos) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    throw new ErrorSolicitud("Envía un objeto con los datos de la mascota.");
  }
  const mascota = {
    nombre: leerTexto(datos, "nombre", 60),
    especie: leerTexto(datos, "especie", 20),
    raza: leerTexto(datos, "raza", 60, true),
    propietario: leerTexto(datos, "propietario", 100),
    telefono: leerTexto(datos, "telefono", 25),
  };
  if (!especiesPermitidas.has(mascota.especie)) {
    throw new ErrorSolicitud("Selecciona una especie válida.");
  }
  const digitos = mascota.telefono.replace(/\D/g, "");
  if (!/^\+?[\d\s()-]+$/.test(mascota.telefono) || digitos.length < 7 || digitos.length > 15) {
    throw new ErrorSolicitud("Introduce un teléfono válido con entre 7 y 15 dígitos.");
  }
  return mascota;
}
