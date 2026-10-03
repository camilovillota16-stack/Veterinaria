import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Grafo } from "../estructuras/grafo.mjs";
import { crearAlmacen } from "../db/database.mjs";
import { crearServidor } from "../api/servidor.mjs";

function visita(almacen, nombre = "Luna", serviciosIds = [1], tipo = "normal", prioridad = 0) {
  const mascota = almacen.registrarMascota({ nombre, especie: "Gato", propietario: "Prueba", telefono: "0000000000" });
  return almacen.registrarTurno({ mascotaId: mascota.id, serviciosIds, tipo, prioridad }).turno;
}
function archivoTemporal(t) {
  const carpeta = new URL("../.test-data/", import.meta.url);
  mkdirSync(carpeta, { recursive: true });
  const archivo = fileURLToPath(new URL(`${randomUUID()}.db`, carpeta));
  t.after(() => unlinkSync(archivo));
  return archivo;
}

test("el grafo conecta en ambos sentidos y encuentra vecinos comunes sin duplicarlos", () => {
  const grafo = new Grafo();
  ["s:1", "s:2", "s:3", "v:1", "v:2"].forEach((id) => grafo.agregarVertice(id));
  grafo.conectar("v:1", "s:1");
  grafo.conectar("v:1", "s:2");
  grafo.conectar("v:2", "s:1");
  grafo.conectar("v:1", "s:1");
  assert.deepEqual(grafo.vecinos("s:1"), ["v:1", "v:2"]);
  assert.deepEqual(grafo.vecinosComunes(["s:1", "s:2"]), ["v:1"]);
  assert.deepEqual(grafo.vecinosComunes(["s:1", "s:3"]), []);
  assert.deepEqual(grafo.vecinosComunes([]), []);
  grafo.vecinos("s:1").reverse();
  assert.deepEqual(grafo.vecinos("s:1"), ["v:1", "v:2"]);
  assert.throws(() => grafo.conectar("v:1", "inexistente"), /existir/);
});

test("veterinarios validan servicios y nombres y la edición cambia las conexiones reales", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const ana = almacen.registrarVeterinario({ nombre: "  Ana  ", serviciosIds: [1, 3] });
    assert.equal(ana.nombre, "Ana");
    assert.throws(() => almacen.registrarVeterinario({ nombre: "ana", serviciosIds: [1] }), (e) => e.estado === 409);
    for (const datos of [{ nombre: "", serviciosIds: [1] }, { nombre: "Bruno", serviciosIds: [] }, { nombre: "Bruno", serviciosIds: [1, 1] }, { nombre: "Bruno", serviciosIds: [999] }]) {
      assert.throws(() => almacen.registrarVeterinario(datos), (e) => [400, 404].includes(e.estado));
    }
    assert.equal(almacen.listarVeterinarios().length, 1);
    const turno = visita(almacen, "Luna", [1, 2]);
    assert.equal(turno.veterinariosCompatibles.length, 0);
    almacen.actualizarVeterinario({ veterinarioId: ana.id, nombre: "Ana", serviciosIds: [1, 2] });
    assert.deepEqual(almacen.estadoTurnos().siguiente.veterinariosCompatibles.map((v) => v.id), [ana.id]);
  } finally { almacen.cerrar(); }
});

test("varios servicios requieren un solo veterinario conectado a todos ellos", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    almacen.registrarVeterinario({ nombre: "Ana", serviciosIds: [1] });
    almacen.registrarVeterinario({ nombre: "Bruno", serviciosIds: [2] });
    const carla = almacen.registrarVeterinario({ nombre: "Carla", serviciosIds: [1, 2, 3] });
    const turno = visita(almacen, "Luna", [1, 2]);
    assert.deepEqual(turno.veterinariosCompatibles.map((v) => ({ id: v.id, nombre: v.nombre })), [{ id: carla.id, nombre: "Carla" }]);
    assert.throws(() => almacen.llamarSiguiente({ veterinarioId: 1 }), (e) => e.estado === 409);
    assert.throws(() => almacen.llamarSiguiente({ veterinarioId: "3" }), (e) => e.estado === 400);
    assert.equal(almacen.estadoTurnos().siguiente.id, turno.id);
    const actual = almacen.llamarSiguiente({ veterinarioId: carla.id, turnoId: turno.id });
    assert.equal(actual.veterinarioId, carla.id);
    assert.equal(actual.veterinario, "Carla");
  } finally { almacen.cerrar(); }
});

test("sin profesional compatible la urgencia no se pierde ni se salta, y se rechaza una espera desactualizada", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const normal = visita(almacen, "Luna");
    const urgente = visita(almacen, "Max", [2], "urgente", 3);
    assert.throws(() => almacen.llamarSiguiente(), (e) => e.estado === 409);
    assert.equal(almacen.estadoTurnos().siguiente.id, urgente.id);
    assert.equal(almacen.estadoTurnos().cantidad, 2);
    assert.equal(almacen.estadoTurnos().enAtencion, null);
    const vet = almacen.registrarVeterinario({ nombre: "Ana", serviciosIds: [1, 2] });
    assert.throws(() => almacen.llamarSiguiente({ turnoId: normal.id, veterinarioId: vet.id }), (e) => e.estado === 409);
    assert.equal(almacen.llamarSiguiente({ turnoId: urgente.id, veterinarioId: vet.id }).id, urgente.id);
  } finally { almacen.cerrar(); }
});

test("la visita conserva al veterinario asignado durante la consulta y valida los cambios de servicios", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const ana = almacen.registrarVeterinario({ nombre: "Ana", serviciosIds: [1] });
    const bruno = almacen.registrarVeterinario({ nombre: "Bruno", serviciosIds: [1, 2, 3] });
    const turno = visita(almacen);
    almacen.llamarSiguiente({ veterinarioId: ana.id });
    assert.throws(() => almacen.actualizarTurno({ turnoId: turno.id, serviciosIds: [1, 2] }), (e) => e.estado === 409);
    assert.deepEqual(almacen.estadoTurnos().enAtencion.servicios.map((s) => s.id), [1]);
    assert.throws(() => almacen.actualizarVeterinario({ veterinarioId: ana.id, nombre: "Ana", serviciosIds: [2] }), (e) => e.estado === 409);
    assert.throws(() => almacen.asignarVeterinario({ turnoId: turno.id, veterinarioId: bruno.id }), (e) => e.estado === 409);
    assert.throws(() => almacen.asignarVeterinario({ turnoId: turno.id, veterinarioId: ana.id }), (e) => e.estado === 409);
    almacen.actualizarVeterinario({ veterinarioId: ana.id, nombre: "Ana", serviciosIds: [1, 2] });
    almacen.actualizarTurno({ turnoId: turno.id, serviciosIds: [1, 2] });
    assert.equal(almacen.estadoTurnos().enAtencion.veterinarioId, ana.id);
    almacen.finalizarTurno();
    assert.throws(() => almacen.asignarVeterinario({ turnoId: turno.id, veterinarioId: bruno.id }), (e) => e.estado === 409);
  } finally { almacen.cerrar(); }
});

test("cada veterinario atiende su paciente y cerrar una consulta solo libera a ese profesional", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const ana = almacen.registrarVeterinario({ nombre: "Ana", serviciosIds: [1] });
    const bruno = almacen.registrarVeterinario({ nombre: "Bruno", serviciosIds: [1] });
    const luna = visita(almacen, "Luna");
    const max = visita(almacen, "Max");
    const rocky = visita(almacen, "Rocky");
    almacen.llamarSiguiente({ veterinarioId: ana.id });
    assert.deepEqual(almacen.estadoTurnos().siguiente.veterinariosDisponibles.map((v) => v.id), [bruno.id]);
    assert.equal(almacen.listarVeterinarios().find((v) => v.id === ana.id).ocupado, true);
    assert.throws(() => almacen.llamarSiguiente({ veterinarioId: ana.id }), (e) => e.estado === 409);
    assert.equal(almacen.estadoTurnos().siguiente.id, max.id);
    assert.equal(almacen.llamarSiguiente({ veterinarioId: bruno.id }).id, max.id);
    assert.deepEqual(almacen.estadoTurnos().atenciones.map((t) => t.id), [luna.id, max.id]);
    assert.equal(almacen.estadoTurnos().siguiente.veterinariosDisponibles.length, 0);
    assert.throws(() => almacen.llamarSiguiente({ veterinarioId: ana.id }), (e) => e.estado === 409);
    assert.throws(() => almacen.finalizarTurno(), (e) => e.estado === 409);
    assert.equal(almacen.estadoTurnos().atenciones.length, 2);
    assert.throws(() => almacen.actualizarVeterinario({ veterinarioId: bruno.id, nombre: 'Bruno', serviciosIds: [2] }), (e) => e.estado === 409);
    const carla = almacen.registrarVeterinario({ nombre: 'Carla', serviciosIds: [1] });
    assert.equal(almacen.llamarSiguiente({ veterinarioId: carla.id }).id, rocky.id);
    almacen.finalizarTurno({ turnoId: max.id });
    assert.deepEqual(almacen.estadoTurnos().atenciones.map((t) => t.id), [luna.id, rocky.id]);
    assert.equal(almacen.listarVeterinarios().find((v) => v.id === bruno.id).ocupado, false);
    assert.equal(almacen.listarVeterinarios().find((v) => v.id === ana.id).ocupado, true);
    const nala = visita(almacen, 'Nala');
    assert.deepEqual(almacen.estadoTurnos().siguiente.veterinariosDisponibles.map((v) => v.id), [bruno.id]);
    almacen.finalizarTurno({ turnoId: luna.id });
    assert.equal(almacen.listarVeterinarios().find((v) => v.id === ana.id).ocupado, false);
    assert.equal(almacen.llamarSiguiente({ veterinarioId: ana.id }).id, nala.id);
    assert.throws(() => almacen.finalizarTurno({ turnoId: max.id }), (e) => e.estado === 409);
  } finally { almacen.cerrar(); }
});

test("persisten profesionales y asignación; una visita antigua sin asignar se recupera y puede completarse", (t) => {
  const archivo = archivoTemporal(t);
  let almacen = crearAlmacen(archivo);
  const ana = almacen.registrarVeterinario({ nombre: "Ana", serviciosIds: [1, 2] });
  const turno = visita(almacen, "Luna", [1, 2]);
  almacen.llamarSiguiente({ veterinarioId: ana.id });
  almacen.cerrar();
  almacen = crearAlmacen(archivo);
  assert.equal(almacen.estadoTurnos().enAtencion.veterinarioId, ana.id);
  assert.equal(almacen.listarVeterinarios()[0].servicios.length, 2);
  almacen.cerrar();
  const control = new DatabaseSync(archivo);
  control.exec("DROP INDEX veterinario_con_consulta_abierta; ALTER TABLE turnos DROP COLUMN veterinario_id");
  control.close();
  almacen = crearAlmacen(archivo);
  try {
    assert.equal(almacen.estadoTurnos().enAtencion.veterinarioId, null);
    assert.throws(() => almacen.finalizarTurno(), (e) => e.estado === 409);
    almacen.asignarVeterinario({ turnoId: turno.id, veterinarioId: ana.id });
    assert.equal(almacen.finalizarTurno().estado, "finalizado");
  } finally { almacen.cerrar(); }
});

test("los fallos al editar conexiones o llamar revierten nombre, servicios y asignación", (t) => {
  const archivo = archivoTemporal(t);
  const almacen = crearAlmacen(archivo);
  try {
    const ana = almacen.registrarVeterinario({ nombre: "Ana", serviciosIds: [1] });
    const turno = visita(almacen);
    const control = new DatabaseSync(archivo);
    try {
      control.exec(`CREATE TRIGGER fallo_conexion BEFORE INSERT ON veterinario_servicios
        WHEN NEW.servicio_id = 2 BEGIN SELECT RAISE(ABORT, 'fallo conexion'); END;`);
      assert.throws(() => almacen.actualizarVeterinario({ veterinarioId: ana.id, nombre: "Ana nueva", serviciosIds: [1, 2] }), /fallo conexion/);
      assert.equal(almacen.listarVeterinarios()[0].nombre, "Ana");
      assert.deepEqual(almacen.listarVeterinarios()[0].servicios.map((s) => s.id), [1]);
      assert.throws(() => almacen.registrarVeterinario({ nombre: "Bruno", serviciosIds: [2] }), /fallo conexion/);
      assert.equal(almacen.listarVeterinarios().length, 1);
      control.exec(`CREATE TRIGGER fallo_llamada BEFORE UPDATE ON turnos
        WHEN NEW.estado = 'en_atencion' BEGIN SELECT RAISE(ABORT, 'fallo llamada'); END;`);
      assert.throws(() => almacen.llamarSiguiente({ veterinarioId: ana.id }), /fallo llamada/);
      assert.equal(almacen.estadoTurnos().siguiente.id, turno.id);
      assert.equal(almacen.estadoTurnos().siguiente.veterinarioId, null);
      assert.equal(almacen.estadoTurnos().enAtencion, null);
    } finally { control.close(); }
  } finally { almacen.cerrar(); }
});

test("la API registra, edita y asigna veterinarios y protege referencias y métodos", async (t) => {
  const almacen = crearAlmacen(":memory:");
  const turno = visita(almacen, "Luna", [1, 2]);
  const servidor = crearServidor(almacen);
  await new Promise((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  t.after(async () => { await new Promise((resolve) => servidor.close(resolve)); almacen.cerrar(); });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const post = (ruta, datos = {}, headers = {}) => fetch(`${base}${ruta}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(datos),
  });
  assert.equal((await post("/api/turnos/llamar")).status, 409);
  assert.equal((await post("/api/veterinarios", { nombre: "Ana", serviciosIds: [1] }, { Origin: "http://otro.test" })).status, 403);
  const respuesta = await post("/api/veterinarios", { nombre: "Ana", serviciosIds: [1] });
  assert.equal(respuesta.status, 201);
  const ana = await respuesta.json();
  assert.equal((await fetch(`${base}/api/veterinarios`)).status, 200);
  assert.equal((await fetch(`${base}/api/veterinarios/actualizar`)).status, 405);
  assert.equal((await post("/api/veterinarios/actualizar", { veterinarioId: ana.id, nombre: "Ana", serviciosIds: [1, 2] })).status, 200);
  const llamado = await post("/api/turnos/llamar", { turnoId: turno.id, veterinarioId: ana.id });
  assert.equal(llamado.status, 200);
  assert.equal((await llamado.json()).veterinarioId, ana.id);
  assert.equal((await post("/api/turnos/asignar", { turnoId: turno.id, veterinarioId: 9999 })).status, 409);
});
