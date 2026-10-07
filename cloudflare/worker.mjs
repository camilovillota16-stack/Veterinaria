import { DurableObject } from 'cloudflare:workers';
import { crearAlmacenEnConexion } from '../db/almacen.mjs';
import { crearConexionCloudflare } from './conexion.mjs';
import { atenderApi } from './api.mjs';

export class Clinica extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.almacen = crearAlmacenEnConexion(crearConexionCloudflare(ctx.storage));
  }
  fetch(solicitud) { return atenderApi(solicitud, this.almacen); }
}

export default {
  async fetch(solicitud, env) {
    const url = new URL(solicitud.url);
    if (url.pathname.startsWith('/api/')) {
      // Un solo identificador conserva la base y coordina los turnos de la clínica.
      return env.CLINICA.getByName('principal').fetch(solicitud);
    }
    return env.ASSETS.fetch(solicitud);
  },
};
