import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { ErrorSolicitud } from "./validacion.mjs";

const archivos = new Map([
  ["/", ["index.html", "text/html"]],
  ["/index.html", ["index.html", "text/html"]],
  ["/css/styles.css", ["css/styles.css", "text/css"]],
  ["/js/app.js", ["js/app.js", "text/javascript"]],
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
  return createServer(async (solicitud, respuesta) => {
    try {
      let ruta;
      try {
        ruta = new URL(solicitud.url, "http://localhost").pathname;
      } catch {
        throw new ErrorSolicitud("Solicitud inválida.");
      }
      if (ruta === "/api/mascotas") {
        if (solicitud.method === "GET") {
          responderJson(respuesta, 200, almacen.listarMascotas());
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
