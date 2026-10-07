import test from 'node:test';
import assert from 'node:assert/strict';
import { crearAlmacen } from '../db/database.mjs';
import { atenderApi } from '../cloudflare/api.mjs';

function preparar(t) {
  const almacen = crearAlmacen(':memory:');
  t.after(() => almacen.cerrar());
  return async (ruta, datos, opciones = {}) => {
    const solicitud = new Request(`https://demo.example.com${ruta}`, datos === undefined ? opciones : {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://demo.example.com', ...opciones.headers },
      body: JSON.stringify(datos), ...opciones,
    });
    return atenderApi(solicitud, almacen);
  };
}
const mascota = { nombre: 'Luna', especie: 'Gato', propietario: 'Demo', telefono: '0000000000' };

test('la API de Cloudflare conserva búsqueda, varios servicios, urgencias y cierre con historial', async (t) => {
  const enviar = preparar(t);
  const paciente = await (await enviar('/api/mascotas', mascota)).json();
  const vet = await (await enviar('/api/veterinarios', { nombre: 'Ana demo', serviciosIds: [1, 2, 3] })).json();
  const buscando = await (await enviar('/api/mascotas?q=lu')).json();
  assert.equal(buscando[0].id, paciente.id);
  const { turno } = await (await enviar('/api/turnos', { mascotaId: paciente.id, serviciosIds: [1, 2], tipo: 'urgente', prioridad: 3 })).json();
  assert.equal((await enviar('/api/turnos/actualizar', { turnoId: turno.id, serviciosIds: [1, 2, 3], motivo: 'Visita de prueba' })).status, 200);
  assert.equal((await enviar('/api/turnos/llamar', { turnoId: turno.id, veterinarioId: vet.id })).status, 200);
  assert.equal((await enviar('/api/veterinarios')).status, 200);
  assert.equal((await enviar('/api/turnos/finalizar', { turnoId: turno.id, observaciones: 'Texto <b>de prueba</b>' })).status, 200);
  const historial = await (await enviar(`/api/mascotas/${paciente.id}/historial`)).json();
  assert.equal(historial.consultas[0].servicios.length, 3);
  assert.equal(historial.consultas[0].observaciones, 'Texto <b>de prueba</b>');
  assert.equal(historial.consultas[0].prioridad, 3);
  assert.equal((await enviar('/api/veterinarios/actualizar', { veterinarioId: vet.id, nombre: 'Nombre nuevo', serviciosIds: [1] })).status, 200);
  assert.equal((await (await enviar(`/api/mascotas/${paciente.id}/historial`)).json()).consultas[0].veterinario, 'Ana demo');
});

test('la API de Cloudflare limita bytes y valida origen, JSON, referencias y métodos', async (t) => {
  const enviar = preparar(t);
  assert.equal((await enviar('/api/mascotas', mascota, { headers: { 'Content-Type': 'application/json', Origin: 'https://ajeno.example.com' } })).status, 403);
  assert.equal((await enviar('/api/mascotas', undefined, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await enviar('/api/mascotas', undefined, { method: 'POST', body: 'texto' })).status, 415);
  assert.equal((await enviar('/api/mascotas', { texto: 'á'.repeat(9000) })).status, 413);
  assert.deepEqual(await (await enviar('/api/mascotas')).json(), []);
  assert.equal((await enviar('/api/mascotas/999/historial')).status, 404);
  assert.equal((await enviar('/api/mascotas/1/historial', {})).status, 405);
  assert.equal((await enviar('/api/mascotas', undefined, { method: 'DELETE' })).headers.get('Allow'), 'GET, POST');
  assert.equal((await enviar('/api/turnos/llamar', undefined)).status, 405);
  assert.equal((await enviar('/api/no-existe')).status, 404);
});

test('la API de Cloudflare preserva una consulta abierta al rechazar observaciones inválidas', async (t) => {
  const enviar = preparar(t);
  const paciente = await (await enviar('/api/mascotas', mascota)).json();
  const vet = await (await enviar('/api/veterinarios', { nombre: 'Ana', serviciosIds: [1] })).json();
  const { turno } = await (await enviar('/api/turnos', { mascotaId: paciente.id, serviciosIds: [1] })).json();
  await enviar('/api/turnos/llamar', { veterinarioId: vet.id });
  assert.equal((await enviar('/api/turnos/finalizar', { turnoId: turno.id, observaciones: 'x'.repeat(2001) })).status, 400);
  assert.equal((await (await enviar('/api/turnos')).json()).atenciones[0].id, turno.id);
  assert.equal((await (await enviar(`/api/mascotas/${paciente.id}/historial`)).json()).cantidad, 0);
});
