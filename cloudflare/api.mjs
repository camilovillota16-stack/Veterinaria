import { ErrorSolicitud } from '../api/validacion.mjs';

function json(datos, estado = 200, encabezados = {}) {
  return new Response(JSON.stringify(datos), { status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...encabezados } });
}

async function leerDatos(solicitud) {
  const tipo = (solicitud.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  if (tipo !== 'application/json') throw new ErrorSolicitud('Envía los datos como application/json.', 415);
  const lector = solicitud.body?.getReader();
  if (!lector) throw new ErrorSolicitud('El contenido no es un JSON válido.');
  const partes = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await lector.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 16384) {
      await lector.cancel();
      throw new ErrorSolicitud('El registro enviado es demasiado grande.', 413);
    }
    partes.push(value);
  }
  const contenido = new Uint8Array(bytes);
  let posicion = 0;
  for (const parte of partes) { contenido.set(parte, posicion); posicion += parte.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(contenido)); }
  catch { throw new ErrorSolicitud('El contenido no es un JSON válido.'); }
}

export async function atenderApi(solicitud, almacen) {
  try {
    const url = new URL(solicitud.url);
    const ruta = url.pathname;
    const historial = /^\/api\/mascotas\/(\d+)\/historial$/.exec(ruta);
    if (historial) {
      if (solicitud.method !== 'GET') return json({ error: 'Método no permitido.' }, 405, { Allow: 'GET' });
      return json(almacen.historialMascota(Number(historial[1])));
    }
    const rutas = new Map([
      ['/api/mascotas', { get: () => url.searchParams.has('q') ? almacen.buscarMascotas(url.searchParams.get('q')) : almacen.listarMascotas(), post: almacen.registrarMascota, estado: 201 }],
      ['/api/veterinarios', { get: almacen.listarVeterinarios, post: almacen.registrarVeterinario, estado: 201 }],
      ['/api/veterinarios/actualizar', { post: almacen.actualizarVeterinario }],
      ['/api/turnos', { get: almacen.estadoTurnos, post: almacen.registrarTurno, estado: 201 }],
      ['/api/turnos/actualizar', { post: almacen.actualizarTurno }],
      ['/api/turnos/llamar', { post: almacen.llamarSiguiente }],
      ['/api/turnos/asignar', { post: almacen.asignarVeterinario }],
      ['/api/turnos/finalizar', { post: almacen.finalizarTurno }],
    ]);
    const acciones = rutas.get(ruta);
    if (!acciones) return json({ error: 'Página no encontrada.' }, 404);
    if (solicitud.method === 'GET' && acciones.get) return json(acciones.get());
    if (solicitud.method !== 'POST') return json({ error: 'Método no permitido.' }, 405, { Allow: acciones.get ? 'GET, POST' : 'POST' });
    const origen = solicitud.headers.get('Origin');
    if (origen && origen !== url.origin) throw new ErrorSolicitud('Origen de la solicitud no permitido.', 403);
    // El cuerpo se lee antes; todas las operaciones SQL posteriores son síncronas.
    const datos = await leerDatos(solicitud);
    return json(acciones.post(datos), acciones.estado ?? 200);
  } catch (error) {
    const esperado = error instanceof ErrorSolicitud;
    if (!esperado) console.error('Error del servidor:', error.message);
    return json({ error: esperado ? error.message : 'No se pudo completar la operación. Inténtalo de nuevo.' }, esperado ? error.estado : 500);
  }
}
