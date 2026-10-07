// Separar la configuración permite ejecutar el mismo código localmente o alojado.
export function leerConfiguracion(entorno = process.env) {
  const puerto = Number(entorno.PORT ?? 3000);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error('PORT debe ser un puerto entre 1 y 65535.');
  }
  const host = entorno.HOST ?? '127.0.0.1';
  if (!['127.0.0.1', '0.0.0.0', '::1', '::'].includes(host)) {
    throw new Error('HOST debe ser 127.0.0.1, 0.0.0.0, ::1 o ::.');
  }
  const direccion = entorno.PUBLIC_URL || entorno.RENDER_EXTERNAL_URL;
  let origenPublico;
  if (direccion) {
    let url;
    try { url = new URL(direccion); } catch { throw new Error('PUBLIC_URL debe ser una dirección HTTP o HTTPS válida.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('PUBLIC_URL debe contener solo el origen HTTP o HTTPS, sin credenciales, ruta ni parámetros.');
    }
    origenPublico = url.origin;
  }
  return { puerto, host, origenPublico };
}
