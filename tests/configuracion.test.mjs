import test from 'node:test';
import assert from 'node:assert/strict';
import { leerConfiguracion } from '../configuracion.mjs';
import { crearAlmacen } from '../db/database.mjs';
import { crearServidor } from '../api/servidor.mjs';

test('la configuración conserva el inicio local y permite configurar un servidor alojado', () => {
  assert.deepEqual(leerConfiguracion({}), { puerto: 3000, host: '127.0.0.1', origenPublico: undefined });
  assert.deepEqual(leerConfiguracion({ PORT: '10000', HOST: '0.0.0.0', PUBLIC_URL: 'https://veterinaria.example.com/' }),
    { puerto: 10000, host: '0.0.0.0', origenPublico: 'https://veterinaria.example.com' });
  assert.equal(leerConfiguracion({ RENDER_EXTERNAL_URL: 'https://demo.onrender.com' }).origenPublico, 'https://demo.onrender.com');
  assert.equal(leerConfiguracion({ PUBLIC_URL: 'https://dominio.example.com', RENDER_EXTERNAL_URL: 'https://demo.onrender.com' }).origenPublico, 'https://dominio.example.com');
});

test('una configuración inválida falla antes de abrir el servidor', () => {
  for (const PORT of ['0', '65536', '', 'abc', '3000.5']) assert.throws(() => leerConfiguracion({ PORT }), /PORT/);
  assert.throws(() => leerConfiguracion({ HOST: 'invalido' }), /HOST/);
  for (const PUBLIC_URL of ['sin-url', 'ftp://example.com', 'https://user:secret@example.com',
    'https://example.com/api', 'https://example.com?x=1', 'https://example.com#mascotas']) {
    assert.throws(() => leerConfiguracion({ PUBLIC_URL }), /PUBLIC_URL/);
  }
});

async function api(t, opciones = {}) {
  const almacen = crearAlmacen(':memory:');
  const servidor = crearServidor(almacen, opciones);
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise((resolve) => servidor.close(resolve)); almacen.cerrar(); });
  return { almacen, base: `http://127.0.0.1:${servidor.address().port}` };
}
const mascota = { nombre: 'Luna', especie: 'Gato', propietario: 'Demo', telefono: '0000000000' };

test('el servidor local acepta su origen y rechaza un origen HTTPS ajeno', async (t) => {
  const { base, almacen } = await api(t);
  const enviar = (origen) => fetch(`${base}/api/mascotas`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origen }, body: JSON.stringify(mascota) });
  assert.equal((await enviar('https://ajeno.example.com')).status, 403);
  assert.equal((await enviar(base)).status, 201);
  assert.equal(almacen.listarMascotas().length, 1);
});

test('el origen HTTPS configurado funciona detrás de un proxy y no confía en encabezados reenviados', async (t) => {
  const publico = 'https://veterinaria.example.com';
  const { base, almacen } = await api(t, { origenPublico: publico });
  async function enviar(ruta, datos, origen = publico, extra = {}) {
    return fetch(`${base}${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origen, ...extra }, body: JSON.stringify(datos) });
  }
  const rutas = ['/api/mascotas', '/api/veterinarios', '/api/veterinarios/actualizar', '/api/turnos',
    '/api/turnos/actualizar', '/api/turnos/llamar', '/api/turnos/asignar', '/api/turnos/finalizar'];
  for (const ruta of rutas) {
    assert.equal((await enviar(ruta, {}, 'https://ajeno.example.com',
      { 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': 'ajeno.example.com' })).status, 403);
  }
  assert.equal((await enviar('/api/mascotas', mascota, base)).status, 403);
  const registrada = await enviar('/api/mascotas', mascota);
  assert.equal(registrada.status, 201);
  const paciente = await registrada.json();
  const vetRespuesta = await enviar('/api/veterinarios', { nombre: 'Ana demo', serviciosIds: [1, 2] });
  assert.equal(vetRespuesta.status, 201);
  const vet = await vetRespuesta.json();
  assert.equal((await enviar('/api/veterinarios/actualizar', { veterinarioId: vet.id, nombre: 'Ana demo', serviciosIds: [1, 2, 3] })).status, 200);
  const solicitud = await enviar('/api/turnos', { mascotaId: paciente.id, serviciosIds: [1] });
  assert.equal(solicitud.status, 201);
  const { turno } = await solicitud.json();
  assert.equal((await enviar('/api/turnos/actualizar', { turnoId: turno.id, serviciosIds: [1, 2], motivo: 'Demostración' })).status, 200);
  assert.equal((await enviar('/api/turnos/llamar', { turnoId: turno.id, veterinarioId: vet.id })).status, 200);
  assert.equal((await enviar('/api/turnos/finalizar', { turnoId: turno.id, observaciones: 'Consulta de prueba' })).status, 200);
  assert.equal(almacen.historialMascota(paciente.id).consultas[0].observaciones, 'Consulta de prueba');
});
