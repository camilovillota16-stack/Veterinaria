import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { crearAlmacen } from '../db/database.mjs';
import { crearServidor } from '../api/servidor.mjs';

function preparar(almacen) {
  const profesionales = ['Ana', 'Bruno'].map((nombre) => almacen.registrarVeterinario({ nombre, serviciosIds: [1] }));
  const turnos = ['Luna', 'Max', 'Nala'].map((nombre) => {
    const mascota = almacen.registrarMascota({ nombre, especie: 'Gato', propietario: 'Demo', telefono: '0000000000' });
    return almacen.registrarTurno({ mascotaId: mascota.id, serviciosIds: [1] }).turno;
  });
  return { profesionales, turnos };
}
function archivo(t) {
  mkdirSync('.test-data', { recursive: true });
  const ruta = `.test-data/${randomUUID()}.db`;
  t.after(() => unlinkSync(ruta));
  return ruta;
}

test('la migración reemplaza el bloqueo general y las consultas simultáneas persisten al reiniciar', (t) => {
  const ruta = archivo(t);
  let almacen = crearAlmacen(ruta);
  const { profesionales, turnos } = preparar(almacen);
  almacen.llamarSiguiente({ veterinarioId: profesionales[0].id });
  almacen.cerrar();
  const anterior = new DatabaseSync(ruta);
  anterior.exec(`DROP INDEX veterinario_con_consulta_abierta;
    CREATE UNIQUE INDEX un_turno_en_atencion ON turnos(estado) WHERE estado = 'en_atencion'`);
  anterior.close();
  almacen = crearAlmacen(ruta);
  almacen.llamarSiguiente({ veterinarioId: profesionales[1].id });
  almacen.cerrar();
  almacen = crearAlmacen(ruta);
  try {
    assert.deepEqual(almacen.estadoTurnos().atenciones.map((t) => t.id), turnos.slice(0, 2).map((t) => t.id));
    assert.equal(almacen.estadoTurnos().siguiente.veterinariosDisponibles.length, 0);
    assert.ok(almacen.listarVeterinarios().every((v) => v.ocupado));
    const control = new DatabaseSync(ruta);
    try {
      assert.throws(() => control.prepare("UPDATE turnos SET estado = 'en_atencion', veterinario_id = ? WHERE id = ?").run(profesionales[0].id, turnos[2].id), /UNIQUE/);
    } finally { control.close(); }
    almacen.finalizarTurno({ turnoId: turnos[1].id });
    assert.equal(almacen.estadoTurnos().atenciones[0].id, turnos[0].id);
    assert.deepEqual(almacen.estadoTurnos().siguiente.veterinariosDisponibles.map((v) => v.id), [profesionales[1].id]);
  } finally { almacen.cerrar(); }
});

test('cerrar valida la consulta elegida y revierte el fallo sin liberar al veterinario equivocado', (t) => {
  const ruta = archivo(t);
  const almacen = crearAlmacen(ruta);
  try {
    const { profesionales, turnos } = preparar(almacen);
    profesionales.forEach((v) => almacen.llamarSiguiente({ veterinarioId: v.id }));
    for (const datos of [null, [], { turnoId: '1' }, { turnoId: 0 }]) {
      assert.throws(() => almacen.finalizarTurno(datos), (e) => e.estado === 400);
    }
    assert.throws(() => almacen.finalizarTurno({ turnoId: turnos[2].id }), (e) => e.estado === 409);
    const control = new DatabaseSync(ruta);
    try {
      control.exec(`CREATE TRIGGER fallo_cierre BEFORE UPDATE ON turnos
        WHEN NEW.estado = 'finalizado' BEGIN SELECT RAISE(ABORT, 'fallo cierre'); END`);
      assert.throws(() => almacen.finalizarTurno({ turnoId: turnos[1].id }), /fallo cierre/);
      assert.equal(almacen.estadoTurnos().atenciones.length, 2);
      assert.ok(almacen.listarVeterinarios().every((v) => v.ocupado));
    } finally { control.close(); }
  } finally { almacen.cerrar(); }
});

test('la API permite llamar a otro veterinario libre y cerrar una consulta sin afectar a la otra', async (t) => {
  const almacen = crearAlmacen(':memory:');
  const { profesionales, turnos } = preparar(almacen);
  const servidor = crearServidor(almacen);
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise((resolve) => servidor.close(resolve)); almacen.cerrar(); });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const post = (ruta, datos) => fetch(`${base}${ruta}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
  });
  assert.equal((await post('/api/turnos/llamar', { veterinarioId: profesionales[0].id })).status, 200);
  assert.equal((await post('/api/turnos/llamar', { veterinarioId: profesionales[0].id })).status, 409);
  assert.equal((await post('/api/turnos/llamar', { veterinarioId: profesionales[1].id })).status, 200);
  assert.equal((await post('/api/turnos/finalizar', {})).status, 409);
  assert.equal((await post('/api/turnos/finalizar', { turnoId: turnos[1].id })).status, 200);
  const estado = await (await fetch(`${base}/api/turnos`)).json();
  assert.deepEqual(estado.atenciones.map((t) => t.id), [turnos[0].id]);
  assert.deepEqual(estado.siguiente.veterinariosDisponibles.map((v) => v.id), [profesionales[1].id]);
});

test('elegir otro veterinario no salta la llegada y una consulta puede terminar antes que la anterior', () => {
  const almacen = crearAlmacen(':memory:');
  try {
    const { profesionales, turnos } = preparar(almacen);
    assert.throws(() => almacen.llamarSiguiente({ turnoId: turnos[1].id, veterinarioId: profesionales[1].id }), (e) => e.estado === 409);
    assert.equal(almacen.estadoTurnos().siguiente.id, turnos[0].id);
    assert.equal(almacen.llamarSiguiente({ turnoId: turnos[0].id, veterinarioId: profesionales[1].id }).id, turnos[0].id);
    assert.equal(almacen.llamarSiguiente({ turnoId: turnos[1].id, veterinarioId: profesionales[0].id }).id, turnos[1].id);
    almacen.finalizarTurno({ turnoId: turnos[1].id });
    assert.equal(almacen.estadoTurnos().atenciones[0].id, turnos[0].id);
    const urgencia = almacen.registrarMascota({ nombre: 'Urgencia', especie: 'Perro', propietario: 'Demo', telefono: '0000000000' });
    const urgente = almacen.registrarTurno({ mascotaId: urgencia.id, serviciosIds: [1], tipo: 'urgente', prioridad: 3 }).turno;
    assert.throws(() => almacen.llamarSiguiente({ turnoId: turnos[2].id, veterinarioId: profesionales[0].id }), (e) => e.estado === 409);
    assert.equal(almacen.llamarSiguiente({ turnoId: urgente.id, veterinarioId: profesionales[0].id }).id, urgente.id);
  } finally { almacen.cerrar(); }
});
