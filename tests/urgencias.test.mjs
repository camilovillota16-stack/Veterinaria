import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { HeapPrioridad } from "../estructuras/heap.mjs";
import { crearAlmacen } from "../db/database.mjs";
import { crearServidor } from "../api/servidor.mjs";

function solicitar(almacen, nombre, tipo = "normal", prioridad = 0) {
  const mascota = almacen.registrarMascota({ nombre, especie: "Gato", propietario: "Prueba", telefono: "3000000000" });
  return almacen.registrarTurno({ mascotaId: mascota.id, serviciosIds: [1], tipo, prioridad }).turno;
}
function archivoTemporal(t) {
  const carpeta = new URL("../.test-data/", import.meta.url);
  mkdirSync(carpeta, { recursive: true });
  const archivo = fileURLToPath(new URL(`${randomUUID()}.db`, carpeta));
  t.after(() => unlinkSync(archivo));
  return archivo;
}

test("el heap prioriza, desempata por llegada y permite extraer, insertar y reutilizarse vacío", () => {
  const heap = new HeapPrioridad();
  assert.equal(heap.extraer(), null);
  heap.insertar({ id: 3, prioridad: 2 });
  heap.insertar({ id: 2, prioridad: 3 });
  heap.insertar({ id: 1, prioridad: 3 });
  assert.equal(heap.extraer().id, 1);
  heap.insertar({ id: 4, prioridad: 3 });
  assert.equal(heap.verPrimero().id, 2);
  assert.equal(heap.tamano, 3);
  assert.equal(heap.extraer().id, 2);
  assert.equal(heap.extraer().id, 4);
  assert.equal(heap.extraer().id, 3);
  assert.equal(heap.estaVacio(), true);
  heap.insertar({ id: 5, prioridad: 1 });
  assert.equal(heap.extraer().id, 5);
});

test("el heap coincide con el orden esperado para 500 entradas y su vista no lo consume", () => {
  const heap = new HeapPrioridad();
  const entradas = [];
  // Orden de inserción distinto del id para comprobar también las reclasificaciones.
  for (let i = 0; i < 500; i++) {
    const entrada = { id: (i * 137) % 500 + 1, prioridad: (i * 7) % 3 + 1 };
    entradas.push(entrada);
    heap.insertar(entrada);
  }
  const esperado = entradas.slice().sort((a, b) => b.prioridad - a.prioridad || a.id - b.id);
  assert.deepEqual(heap.enOrden(), esperado);
  assert.equal(heap.tamano, 500);
  assert.equal(heap.verPrimero().id, esperado[0].id);
  const extraidos = [];
  while (!heap.estaVacio()) extraidos.push(heap.extraer());
  assert.deepEqual(extraidos, esperado);
});

test("las urgencias salen antes que los normales, por prioridad y llegada, con entradas validadas", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const luna = solicitar(almacen, "Luna");
    solicitar(almacen, "Max", "urgente", 2);
    solicitar(almacen, "Rocky", "urgente", 3);
    solicitar(almacen, "Nala", "urgente", 3);
    const estado = almacen.estadoTurnos();
    assert.equal(estado.cantidad, 4);
    assert.equal(estado.cantidadUrgentes, 3);
    assert.equal(estado.cantidadNormales, 1);
    assert.deepEqual(estado.pendientes.map((t) => t.mascotaNombre), ["Rocky", "Nala", "Max", "Luna"]);
    const nombres = [];
    for (let i = 0; i < 4; i++) { nombres.push(almacen.llamarSiguiente().mascotaNombre); almacen.finalizarTurno(); }
    assert.deepEqual(nombres, ["Rocky", "Nala", "Max", "Luna"]);
    for (const [tipo, prioridad] of [["otro", 1], [null, 1], ["urgente", 0], ["urgente", 4], ["urgente", "3"], ["normal", 1], ["urgente", 1.5]]) {
      assert.throws(() => almacen.registrarTurno({ mascotaId: luna.mascotaId, serviciosIds: [1], tipo, prioridad }), (e) => e.estado === 400);
    }
    const predeterminada = almacen.registrarTurno({ mascotaId: luna.mascotaId, serviciosIds: [1], tipo: "urgente" }).turno;
    assert.equal(predeterminada.prioridad, 1);
  } finally { almacen.cerrar(); }
});

test("reclasificar un pendiente conserva su llegada y editar servicios conserva su prioridad", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const luna = solicitar(almacen, "Luna");
    const max = solicitar(almacen, "Max", "urgente", 3);
    solicitar(almacen, "Nala");
    almacen.actualizarTurno({ turnoId: luna.id, serviciosIds: [1, 2], tipo: "urgente", prioridad: 3 });
    assert.deepEqual(almacen.estadoTurnos().pendientes.map((t) => t.mascotaNombre), ["Luna", "Max", "Nala"]);
    const actualizada = almacen.actualizarTurno({ turnoId: luna.id, serviciosIds: [2], motivo: "Otro servicio" });
    assert.equal(actualizada.prioridad, 3);
    assert.equal(actualizada.tipo, "urgente");
    assert.equal(actualizada.id, luna.id);
    almacen.actualizarTurno({ turnoId: max.id, serviciosIds: [1], tipo: "normal", prioridad: 0 });
    assert.equal(almacen.estadoTurnos().cantidadUrgentes, 1);
    assert.deepEqual(almacen.estadoTurnos().normales.map((t) => t.mascotaNombre), ["Max", "Nala"]);
    assert.equal(almacen.llamarSiguiente().id, luna.id);
  } finally { almacen.cerrar(); }
});

test("una urgencia nueva no interrumpe al paciente activo y pasa al cerrar su visita", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const luna = solicitar(almacen, "Luna");
    almacen.llamarSiguiente();
    solicitar(almacen, "Max");
    const urgente = solicitar(almacen, "Nala", "urgente", 3);
    assert.equal(almacen.estadoTurnos().enAtencion.id, luna.id);
    assert.equal(almacen.estadoTurnos().siguiente.id, urgente.id);
    assert.throws(() => almacen.llamarSiguiente(), (e) => e.estado === 409);
    assert.throws(() => almacen.actualizarTurno({ turnoId: luna.id, serviciosIds: [2], tipo: "urgente", prioridad: 3 }), (e) => e.estado === 409);
    assert.equal(almacen.estadoTurnos().enAtencion.servicios[0].id, 1);
    almacen.finalizarTurno();
    assert.equal(almacen.llamarSiguiente().id, urgente.id);
    almacen.actualizarTurno({ turnoId: urgente.id, serviciosIds: [1, 2] });
    assert.equal(almacen.estadoTurnos().enAtencion.prioridad, 3);
  } finally { almacen.cerrar(); }
});

test("el reinicio recupera prioridades y la migración admite urgentes antiguos sin prioridad", (t) => {
  const archivo = archivoTemporal(t);
  let almacen = crearAlmacen(archivo);
  const luna = solicitar(almacen, "Luna");
  const max = solicitar(almacen, "Max", "urgente", 2);
  const nala = solicitar(almacen, "Nala", "urgente", 3);
  almacen.cerrar();
  almacen = crearAlmacen(archivo);
  assert.deepEqual(almacen.estadoTurnos().pendientes.map((t) => t.id), [nala.id, max.id, luna.id]);
  almacen.cerrar();
  const control = new DatabaseSync(archivo);
  control.exec("ALTER TABLE turnos DROP COLUMN prioridad");
  control.close();
  almacen = crearAlmacen(archivo);
  try {
    assert.deepEqual(almacen.estadoTurnos().urgentes.map((t) => t.prioridad), [1, 1]);
    assert.deepEqual(almacen.estadoTurnos().pendientes.map((t) => t.id), [max.id, nala.id, luna.id]);
    assert.equal(almacen.estadoTurnos().normales[0].prioridad, 0);
  } finally { almacen.cerrar(); }
});

test("un fallo en la clasificación o llamada revierte servicios y conserva el heap", (t) => {
  const archivo = archivoTemporal(t);
  const almacen = crearAlmacen(archivo);
  try {
    const max = solicitar(almacen, "Max", "urgente", 2);
    solicitar(almacen, "Nala", "urgente", 1);
    const control = new DatabaseSync(archivo);
    try {
      control.exec(`CREATE TRIGGER fallo_prioridad BEFORE UPDATE OF prioridad ON turnos
        WHEN NEW.prioridad = 3 BEGIN SELECT RAISE(ABORT, 'fallo prioridad'); END;`);
      assert.throws(() => almacen.actualizarTurno({ turnoId: max.id, serviciosIds: [2], tipo: "urgente", prioridad: 3 }), /fallo prioridad/);
      assert.equal(almacen.estadoTurnos().siguiente.prioridad, 2);
      assert.equal(almacen.estadoTurnos().siguiente.servicios[0].id, 1);
      control.exec(`CREATE TRIGGER fallo_llamada BEFORE UPDATE ON turnos
        WHEN NEW.estado = 'en_atencion' BEGIN SELECT RAISE(ABORT, 'fallo llamada'); END;`);
      assert.throws(() => almacen.llamarSiguiente(), /fallo llamada/);
      assert.equal(almacen.estadoTurnos().siguiente.id, max.id);
      assert.equal(almacen.estadoTurnos().cantidadUrgentes, 2);
      assert.equal(almacen.estadoTurnos().enAtencion, null);
    } finally { control.close(); }
  } finally { almacen.cerrar(); }
});

test("la API permite crear y reclasificar urgencias y llama primero al heap", async (t) => {
  const almacen = crearAlmacen(":memory:");
  const luna = solicitar(almacen, "Luna");
  const mascota = almacen.registrarMascota({ nombre: "Max", especie: "Perro", propietario: "Prueba", telefono: "3000000000" });
  const servidor = crearServidor(almacen);
  await new Promise((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  t.after(async () => { await new Promise((resolve) => servidor.close(resolve)); almacen.cerrar(); });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const post = (ruta, datos = {}) => fetch(`${base}${ruta}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
  });
  assert.equal((await post("/api/turnos", { mascotaId: mascota.id, serviciosIds: [1], tipo: "urgente", prioridad: 0 })).status, 400);
  const respuesta = await post("/api/turnos", { mascotaId: mascota.id, serviciosIds: [1, 2], tipo: "urgente", prioridad: 2 });
  assert.equal(respuesta.status, 201);
  const max = (await respuesta.json()).turno;
  assert.equal((await post("/api/turnos/actualizar", { turnoId: max.id, serviciosIds: [1, 2], tipo: "urgente", prioridad: 3 })).status, 200);
  const estado = await (await fetch(`${base}/api/turnos`)).json();
  assert.equal(estado.siguiente.id, max.id);
  assert.equal(estado.normales[0].id, luna.id);
  assert.equal(estado.urgentes[0].prioridad, 3);
  const llamado = await post("/api/turnos/llamar");
  assert.equal((await llamado.json()).id, max.id);
});
