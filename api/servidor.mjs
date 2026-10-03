import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { ErrorSolicitud } from "./validacion.mjs";

const archivos = new Map([
  ["/", ["index.html", "text/html"]],
  ["/index.html", ["index.html", "text/html"]],
  ["/css/styles.css", ["css/styles.css", "text/css"]],
  ["/js/app.js", ["js/app.js", "text/javascript"]],
  ["/js/turnos.js", ["js/turnos.js", "text/javascript"]],
  ["/js/veterinarios.js", ["js/veterinarios.js", "text/javascript"]],
  ["/js/historial.js", ["js/historial.js", "text/javascript"]],
]);

function responderJson(respuesta, estado, datos) {
  respuesta.writeHead(estado, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  respuesta.end(JSON.stringify(datos));
}

async function leerJson(solicitud) {
  const tipo = (solicitud.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
  if (tipo !== "application/json") throw new ErrorSolicitud("Envía los datos como application/json.", 415);
  const partes = [];
  let bytes = 0;
  let demasiadoGrande = false;
  for await (const parte of solicitud) {
    bytes += parte.length;
    if (bytes > 16384) {
      demasiadoGrande = true;
      partes.length = 0;
    } else {
      partes.push(parte);
    }
  }
  if (demasiadoGrande) throw new ErrorSolicitud("El registro enviado es demasiado grande.", 413);
  try {
    return JSON.parse(Buffer.concat(partes).toString("utf8"));
  } catch {
    throw new ErrorSolicitud("El contenido no es un JSON válido.");
  }
}

export function crearServidor(almacen) {
  const rutasTurnos = new Map([
    ["/api/turnos", almacen.registrarTurno],
    ["/api/turnos/actualizar", almacen.actualizarTurno],
    ["/api/turnos/llamar", almacen.llamarSiguiente],
    ["/api/turnos/finalizar", almacen.finalizarTurno],
    ["/api/turnos/asignar", almacen.asignarVeterinario],
    ["/api/veterinarios", almacen.registrarVeterinario],
    ["/api/veterinarios/actualizar", almacen.actualizarVeterinario],
  ]);
  return createServer(async (solicitud, respuesta) => {
    try {
      let ruta;
      try {
        ruta = new URL(solicitud.url, "http://localhost").pathname;
      } catch {
        throw new ErrorSolicitud("Solicitud inválida.");
      }
      const historial = /^\/api\/mascotas\/(\d+)\/historial$/.exec(ruta);
      if (historial) {
        if (solicitud.method !== 'GET') {
          respuesta.setHeader('Allow', 'GET');
          responderJson(respuesta, 405, { error: 'Método no permitido.' });
        } else {
          responderJson(respuesta, 200, almacen.historialMascota(Number(historial[1])));
        }
        return;
      }
      if (ruta === "/api/mascotas") {
        if (solicitud.method === "GET") {
          const consulta = new URL(solicitud.url, "http://localhost").searchParams.get("q");
          responderJson(respuesta, 200, consulta === null ? almacen.listarMascotas() : almacen.buscarMascotas(consulta));
        } else if (solicitud.method === "POST") {
          const origen = solicitud.headers.origin;
          if (origen && origen !== `http://${solicitud.headers.host}`) {
            throw new ErrorSolicitud("Origen de la solicitud no permitido.", 403);
          }
          const datos = await leerJson(solicitud);
          responderJson(respuesta, 201, almacen.registrarMascota(datos));
        } else {
          respuesta.setHeader("Allow", "GET, POST");
          responderJson(respuesta, 405, { error: "Método no permitido." });
        }
        return;
      }
      if (rutasTurnos.has(ruta)) {
        if (["/api/turnos", "/api/veterinarios"].includes(ruta) && solicitud.method === "GET") {
          responderJson(respuesta, 200, ruta === "/api/turnos" ? almacen.estadoTurnos() : almacen.listarVeterinarios());
        } else if (solicitud.method === "POST") {
          const origen = solicitud.headers.origin;
          if (origen && origen !== `http://${solicitud.headers.host}`) {
            throw new ErrorSolicitud("Origen de la solicitud no permitido.", 403);
          }
          const datos = await leerJson(solicitud);
          const operacion = rutasTurnos.get(ruta);
          responderJson(respuesta, ["/api/turnos", "/api/veterinarios"].includes(ruta) ? 201 : 200, operacion(datos));
        } else {
          respuesta.setHeader("Allow", ["/api/turnos", "/api/veterinarios"].includes(ruta) ? "GET, POST" : "POST");
          responderJson(respuesta, 405, { error: "Método no permitido." });
        }
        return;
      }
      if (solicitud.method !== "GET" && solicitud.method !== "HEAD") {
        respuesta.setHeader("Allow", "GET, HEAD");
        responderJson(respuesta, 405, { error: "Método no permitido." });
        return;
      }
      const archivo = archivos.get(ruta);
      if (!archivo) {
        responderJson(respuesta, 404, { error: "Página no encontrada." });
        return;
      }
      const contenido = await readFile(new URL(`../${archivo[0]}`, import.meta.url));
      respuesta.writeHead(200, {
        "Content-Type": `${archivo[1]}; charset=utf-8`,
        "Cache-Control": "no-store",
      });
      respuesta.end(solicitud.method === "HEAD" ? undefined : contenido);
    } catch (error) {
      const esperado = error instanceof ErrorSolicitud;
      if (!esperado) console.error("Error del servidor:", error.message);
      if (!respuesta.destroyed && !respuesta.headersSent) {
        responderJson(respuesta, esperado ? error.estado : 500, {
          error: esperado ? error.message : "No se pudo completar la operación. Inténtalo de nuevo.",
        });
      }
    }
  });
}
