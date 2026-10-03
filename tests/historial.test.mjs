import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { ListaEnlazada } from '../estructuras/lista.mjs';
import { crearAlmacen } from '../db/database.mjs';
import { crearServidor } from '../api/servidor.mjs';

function archivo(t) {
  mkdirSync('.test-data', { recursive: true });
  const ruta = `.test-data/${randomUUID()}.db`;
  t.after(() => unlinkSync(ruta));
  return ruta;
}
function preparar(almacen) {
  const vet = almacen.registrarVeterinario({ nombre: 'Ana', serviciosIds: [1, 2, 3] });
  const mascota = almacen.registrarMascota({ nombre: 'Luna', especie: 'Gato', propietario: 'Demo', telefono: '0000000000' });
  return { vet, mascota };
}
function abrir(almacen, mascotaId, veterinarioId, serviciosIds = [1]) {
  const turno = almacen.registrarTurno({ mascotaId, serviciosIds, motivo: 'Control de prueba' }).turno;
  almacen.llamarSiguiente({ veterinarioId });
  return turno;
}

test('la lista enlazada recorre los nodos recientes primero sin consumirlos ni mezclar listas', () => {
  const lista = new ListaEnlazada();
  assert.deepEqual([...lista], []);
  for (let n = 1; n <= 100; n++) lista.insertarAlInicio(n);
  assert.equal(lista.tamano, 100);
  assert.deepEqual([...lista], Array.from({ length: 100 }, (_, i) => 100 - i));
  lista.aArray().pop();
  assert.equal(lista.tamano, 100);
  assert.equal([...lista].at(-1), 1);
  assert.deepEqual(new ListaEnlazada().aArray(), []);
});

test('el historial persiste, distingue mascotas homónimas y conserva la copia de la atención original', (t) => {
  const ruta = archivo(t);
  let almacen = crearAlmacen(ruta);
  const { vet, mascota } = preparar(almacen);
  const otra = almacen.registrarMascota({ nombre: 'Luna', especie: 'Perro', propietario: 'Otro demo', telefono: '0000000000' });
  const primera = abrir(almacen, mascota.id, vet.id, [1, 2]);
  const cierre = almacen.finalizarTurno({ turnoId: primera.id, observaciones: '  Control realizado.\nTexto: <b>ejemplo</b>  ' });
  const segunda = abrir(almacen, mascota.id, vet.id, [3]);
  almacen.finalizarTurno({ turnoId: segunda.id });
  almacen.actualizarVeterinario({ veterinarioId: vet.id, nombre: 'Ana nueva', serviciosIds: [3] });
  const historial = almacen.historialMascota(mascota.id);
  assert.deepEqual(historial.consultas.map((c) => c.turnoId), [segunda.id, primera.id]);
  assert.equal(historial.consultas[1].veterinario, 'Ana');
  assert.equal(historial.consultas[1].observaciones, 'Control realizado.\nTexto: <b>ejemplo</b>');
  assert.deepEqual(historial.consultas[1].servicios.map((s) => s.id), [1, 2]);
  assert.equal(historial.consultas[0].observaciones, '');
  assert.equal(cierre.estado, 'finalizado');
  assert.equal(almacen.historialMascota(otra.id).cantidad, 0);
  assert.throws(() => almacen.finalizarTurno({ turnoId: primera.id }), (e) => e.estado === 409);
  almacen.cerrar();
  almacen = crearAlmacen(ruta);
  try {
    assert.deepEqual(almacen.historialMascota(mascota.id), historial);
    const control = new DatabaseSync(ruta);
    try {
      assert.equal(control.prepare('SELECT finalizado_en FROM turnos WHERE id = ?').get(primera.id).finalizado_en, historial.consultas[1].fecha);
    } finally { control.close(); }
  } finally { almacen.cerrar(); }
});

test('observaciones inválidas no cierran ni añaden historial; referencias inválidas se rechazan', () => {
  const almacen = crearAlmacen(':memory:');
  try {
    const { vet, mascota } = preparar(almacen);
    const turno = abrir(almacen, mascota.id, vet.id);
    for (const observaciones of [null, 42, [], 'x'.repeat(2001)]) {
      assert.throws(() => almacen.finalizarTurno({ turnoId: turno.id, observaciones }), (e) => e.estado === 400);
    }
    assert.equal(almacen.historialMascota(mascota.id).cantidad, 0);
    assert.equal(almacen.estadoTurnos().atenciones[0].id, turno.id);
    assert.throws(() => almacen.historialMascota(9999), (e) => e.estado === 404);
    assert.throws(() => almacen.historialMascota('1'), (e) => e.estado === 400);
    assert.throws(() => almacen.historialMascota(0), (e) => e.estado === 400);
  } finally { almacen.cerrar(); }
});

test('si falla el guardado de la consulta o el cierre, ambos se revierten y el veterinario sigue ocupado', (t) => {
  const ruta = archivo(t);
  const almacen = crearAlmacen(ruta);
  try {
    const { vet, mascota } = preparar(almacen);
    const turno = abrir(almacen, mascota.id, vet.id);
    const control = new DatabaseSync(ruta);
    try {
      control.exec("CREATE TRIGGER fallo_consulta BEFORE INSERT ON consultas BEGIN SELECT RAISE(ABORT, 'fallo consulta'); END");
      assert.throws(() => almacen.finalizarTurno({ turnoId: turno.id, observaciones: 'Ejemplo' }), /fallo consulta/);
      assert.equal(almacen.historialMascota(mascota.id).cantidad, 0);
      assert.equal(almacen.estadoTurnos().atenciones.length, 1);
      control.exec("DROP TRIGGER fallo_consulta; CREATE TRIGGER fallo_cierre BEFORE UPDATE ON turnos WHEN NEW.estado = 'finalizado' BEGIN SELECT RAISE(ABORT, 'fallo cierre'); END");
      assert.throws(() => almacen.finalizarTurno({ turnoId: turno.id, observaciones: 'Ejemplo' }), /fallo cierre/);
      assert.equal(almacen.historialMascota(mascota.id).cantidad, 0);
      assert.equal(almacen.listarVeterinarios()[0].ocupado, true);
      control.exec('DROP TRIGGER fallo_cierre');
      almacen.finalizarTurno({ turnoId: turno.id, observaciones: 'Ejemplo' });
      assert.equal(almacen.historialMascota(mascota.id).cantidad, 1);
    } finally { control.close(); }
  } finally { almacen.cerrar(); }
});

test('las visitas antiguas se migran una sola vez sin inventar observaciones ni veterinario', (t) => {
  const ruta = archivo(t);
  let almacen = crearAlmacen(ruta);
  const { vet, mascota } = preparar(almacen);
  const turno = abrir(almacen, mascota.id, vet.id);
  almacen.finalizarTurno({ turnoId: turno.id });
  almacen.cerrar();
  const control = new DatabaseSync(ruta);
  control.exec("DROP TABLE consultas; UPDATE turnos SET veterinario_id = NULL, finalizado_en = '2026-10-01 12:00:00'");
  control.close();
  for (let n = 0; n < 2; n++) {
    almacen = crearAlmacen(ruta);
    try {
      const historial = almacen.historialMascota(mascota.id);
      assert.equal(historial.cantidad, 1);
      assert.equal(historial.consultas[0].origen, 'anterior');
      assert.equal(historial.consultas[0].observaciones, '');
      assert.equal(historial.consultas[0].veterinarioId, null);
      assert.equal(historial.consultas[0].veterinario, '');
      assert.equal(historial.consultas[0].fecha, '2026-10-01T12:00:00Z');
      if (n === 1) {
        const nueva = abrir(almacen, mascota.id, vet.id);
        almacen.finalizarTurno({ turnoId: nueva.id });
        const fechas = new DatabaseSync(ruta);
        try {
          fechas.prepare('UPDATE consultas SET fecha = ? WHERE turno_id = ?').run('2026-10-01T12:00:00.500Z', nueva.id);
          assert.deepEqual(almacen.historialMascota(mascota.id).consultas.map((c) => c.turnoId), [nueva.id, turno.id]);
        } finally { fechas.close(); }
      }
    } finally { almacen.cerrar(); }
  }
});

test('la API guarda observaciones y consulta el historial con validación de referencias y métodos', async (t) => {
  const almacen = crearAlmacen(':memory:');
  const { vet, mascota } = preparar(almacen);
  const turno = abrir(almacen, mascota.id, vet.id);
  const servidor = crearServidor(almacen);
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise((resolve) => servidor.close(resolve)); almacen.cerrar(); });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const cierre = await fetch(`${base}/api/turnos/finalizar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turnoId: turno.id, observaciones: 'Control guardado' }) });
  assert.equal(cierre.status, 200);
  const ruta = `${base}/api/mascotas/${mascota.id}/historial`;
  const historial = await (await fetch(ruta)).json();
  assert.equal(historial.consultas[0].observaciones, 'Control guardado');
  assert.equal((await fetch(`${base}/api/mascotas/9999/historial`)).status, 404);
  assert.equal((await fetch(ruta, { method: 'POST' })).status, 405);
});
