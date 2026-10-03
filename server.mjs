import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

// Este servidor solo entrega la interfaz. La API y la base de datos vendrán después.
const archivos = new Map([
  ["/", ["index.html", "text/html"]],
  ["/index.html", ["index.html", "text/html"]],
  ["/css/styles.css", ["css/styles.css", "text/css"]],
  ["/js/app.js", ["js/app.js", "text/javascript"]],
]);

const servidor = createServer(async (solicitud, respuesta) => {
  if (solicitud.method !== "GET" && solicitud.method !== "HEAD") {
    respuesta.writeHead(405, { Allow: "GET, HEAD" });
    respuesta.end("Método no permitido");
    return;
  }

  let ruta;
  try {
    ruta = new URL(solicitud.url, "http://localhost").pathname;
  } catch {
    respuesta.writeHead(400);
    respuesta.end("Solicitud inválida");
    return;
  }

  const archivo = archivos.get(ruta);
  if (!archivo) {
    respuesta.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    respuesta.end("Página no encontrada");
    return;
  }

  try {
    const contenido = await readFile(new URL(archivo[0], import.meta.url));
    respuesta.writeHead(200, {
      "Content-Type": `${archivo[1]}; charset=utf-8`,
      "Cache-Control": "no-store",
    });
    respuesta.end(solicitud.method === "HEAD" ? undefined : contenido);
  } catch (error) {
    console.error("No se pudo leer el archivo:", error.message);
    respuesta.writeHead(500);
    respuesta.end("No se pudo cargar la página");
  }
});

servidor.on("error", (error) => {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exitCode = 1;
});

servidor.listen(3000, "127.0.0.1", () => {
  console.log("Veterinaria disponible en http://localhost:3000");
  console.log("Presiona Ctrl+C para detener el servidor.");
});
