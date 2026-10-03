import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Trie } from "../estructuras/trie.mjs";
import { crearAlmacenConVeterinario as crearAlmacen } from "./ayudas.mjs";
import { crearServidor } from "../api/servidor.mjs";

function paciente(almacen, nombre, propietario = "Camilo Villota") {
  return almacen.registrarMascota({ nombre, propietario, especie: "Perro", telefono: "3000000000" });
}
function archivoTemporal(t) {
  const carpeta = new URL("../.test-data/", import.meta.url);
  mkdirSync(carpeta, { recursive: true });
  const archivo = fileURLToPath(new URL(`${randomUUID()}.db`, carpeta));
  t.after(() => unlinkSync(archivo));
  return archivo;
}

test("el trie distingue prefijos, normaliza tildes y conserva nombres repetidos sin duplicar ids", () => {
  const trie = new Trie();
  trie.insertar("Ámbar", 1);
  trie.insertar("Ambar", 2);
  trie.insertar("AMBAR", 1);
  trie.insertar("Amelia", 3);
  assert.deepEqual(trie.buscar("  ÁM  "), [1, 2, 3]);
  assert.deepEqual(trie.buscar("amba"), [1, 2]);
  assert.deepEqual(trie.buscar("bar"), []);
  assert.deepEqual(trie.buscar(""), [1, 2, 3]);
});

test("la búsqueda encuentra mascotas y apellidos entre 150 registros, incluidos nuevos registros", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    for (let i = 1; i <= 150; i++) paciente(almacen, `Paciente ${i}`, `Propietario ${i}`);
    const ambar = paciente(almacen, "Ámbar", "María Villota");
    const otra = paciente(almacen, "Ámbar", "Ana García");
    assert.deepEqual(almacen.buscarMascotas("AMBA").map((m) => m.id), [ambar.id, otra.id]);
    assert.deepEqual(almacen.buscarMascotas("villo").map((m) => m.id), [ambar.id]);
    assert.deepEqual(almacen.buscarMascotas("garci").map((m) => m.id), [otra.id]);
    assert.equal(almacen.buscarMascotas("Paciente 150")[0].nombre, "Paciente 150");
    assert.equal(almacen.buscarMascotas("").length, 152);
    assert.deepEqual(almacen.buscarMascotas("inexistente"), []);
  } finally { almacen.cerrar(); }
});

test("varios servicios forman una visita y actualizarla conserva FIFO y el paciente activo", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const henry = paciente(almacen, "Henry");
    const luna = paciente(almacen, "Luna");
    const visita = almacen.registrarTurno({ mascotaId: henry.id, serviciosIds: [1, 2], motivo: "  Le duele la cola  " });
    almacen.registrarTurno({ mascotaId: luna.id, servicioId: 1 });
    assert.equal(visita.turno.motivo, "Le duele la cola");
    assert.deepEqual(visita.turno.servicios.map((s) => s.id), [1, 2]);
    almacen.actualizarTurno({ turnoId: visita.turno.id, serviciosIds: [1, 2, 3], motivo: "Consulta y control" });
    assert.deepEqual(almacen.estadoTurnos().pendientes.map((t) => t.mascotaNombre), ["Henry", "Luna"]);
    assert.equal(almacen.estadoTurnos().cantidad, 2);
    assert.throws(() => almacen.registrarTurno({ mascotaId: henry.id, serviciosIds: [3] }), (e) => e.estado === 409);
    assert.equal(almacen.llamarSiguiente().id, visita.turno.id);
    almacen.actualizarTurno({ turnoId: visita.turno.id, serviciosIds: [2, 3], motivo: "Actualizado en atención" });
    assert.equal(almacen.estadoTurnos().enAtencion.estado, "en_atencion");
    assert.deepEqual(almacen.estadoTurnos().enAtencion.servicios.map((s) => s.id), [2, 3]);
    almacen.finalizarTurno();
    assert.throws(() => almacen.actualizarTurno({ turnoId: visita.turno.id, serviciosIds: [1] }), (e) => e.estado === 409);
    assert.equal(almacen.llamarSiguiente().mascotaNombre, "Luna");
  } finally { almacen.cerrar(); }
});

test("las visitas rechazan servicios vacíos, repetidos o inexistentes y motivos inválidos", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const mascota = paciente(almacen, "Henry");
    for (const serviciosIds of [[], [1, 1], ["1"], [0], null, "1", [1, 9999]]) {
      assert.throws(() => almacen.registrarTurno({ mascotaId: mascota.id, serviciosIds }), (e) => [400, 404].includes(e.estado));
    }
    for (const motivo of [23, null, "a".repeat(501)]) {
      assert.throws(() => almacen.registrarTurno({ mascotaId: mascota.id, serviciosIds: [1], motivo }), (e) => e.estado === 400);
    }
    assert.equal(almacen.estadoTurnos().cantidad, 0);
    assert.throws(() => almacen.actualizarTurno({ turnoId: 9999, serviciosIds: [1] }), (e) => e.estado === 404);
  } finally { almacen.cerrar(); }
});

test("servicios, motivo y búsqueda se recuperan al reabrir la base sin duplicar servicios", (t) => {
  const archivo = archivoTemporal(t);
  let almacen = crearAlmacen(archivo);
  const mascota = paciente(almacen, "Ámbar");
  almacen.registrarTurno({ mascotaId: mascota.id, serviciosIds: [2, 1], motivo: "Le duele la cola" });
  almacen.llamarSiguiente();
  almacen.cerrar();
  for (let intento = 0; intento < 2; intento++) {
    almacen = crearAlmacen(archivo);
    try {
      const visita = almacen.estadoTurnos().enAtencion;
      assert.deepEqual(visita.servicios.map((s) => s.id), [2, 1]);
      assert.equal(visita.motivo, "Le duele la cola");
      assert.equal(almacen.buscarMascotas("amba")[0].id, mascota.id);
    } finally { almacen.cerrar(); }
  }
});

test("la migración conserva un turno antiguo y permite añadirle un servicio", (t) => {
  const archivo = archivoTemporal(t);
  let almacen = crearAlmacen(archivo);
  const mascota = paciente(almacen, "Henry");
  const anterior = almacen.registrarTurno({ mascotaId: mascota.id, servicioId: 2 }).turno;
  almacen.cerrar();
  const control = new DatabaseSync(archivo);
  control.exec("DROP TABLE turno_servicios; ALTER TABLE turnos DROP COLUMN motivo;");
  control.close();
  almacen = crearAlmacen(archivo);
  try {
    const visita = almacen.estadoTurnos().siguiente;
    assert.equal(visita.id, anterior.id);
    assert.deepEqual(visita.servicios.map((s) => s.id), [2]);
    assert.equal(visita.motivo, "");
    almacen.actualizarTurno({ turnoId: visita.id, serviciosIds: [2, 1], motivo: "Consulta adicional" });
    assert.equal(almacen.estadoTurnos().cantidad, 1);
    assert.equal(almacen.listarMascotas()[0].id, mascota.id);
  } finally { almacen.cerrar(); }
});

test("un fallo al guardar servicios revierte toda la visita sin alterar la cola", (t) => {
  const archivo = archivoTemporal(t);
  const almacen = crearAlmacen(archivo);
  try {
    const visita = almacen.registrarTurno({ mascotaId: paciente(almacen, "Henry").id, serviciosIds: [1, 2], motivo: "Anterior" }).turno;
    const control = new DatabaseSync(archivo);
    try {
      control.exec(`CREATE TRIGGER fallo_servicio BEFORE INSERT ON turno_servicios
        WHEN NEW.servicio_id = 3 BEGIN SELECT RAISE(ABORT, 'fallo simulado'); END;`);
      assert.throws(() => almacen.actualizarTurno({ turnoId: visita.id, serviciosIds: [2, 3], motivo: "Nuevo" }), /fallo simulado/);
      const recuperada = almacen.estadoTurnos().siguiente;
      assert.deepEqual(recuperada.servicios.map((s) => s.id), [1, 2]);
      assert.equal(recuperada.motivo, "Anterior");
      assert.equal(almacen.estadoTurnos().cantidad, 1);
      assert.throws(() => almacen.registrarTurno({ mascotaId: paciente(almacen, "Luna").id, serviciosIds: [1, 3] }), /fallo simulado/);
      assert.equal(almacen.estadoTurnos().cantidad, 1);
    } finally { control.close(); }
  } finally { almacen.cerrar(); }
});

test("la API busca por prefijo y actualiza servicios y motivo de una visita existente", async (t) => {
  const almacen = crearAlmacen(":memory:");
  const mascota = paciente(almacen, "Ámbar");
  const servidor = crearServidor(almacen);
  await new Promise((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  t.after(async () => { await new Promise((resolve) => servidor.close(resolve)); almacen.cerrar(); });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const post = (ruta, datos) => fetch(`${base}${ruta}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
  });
  const resultados = await (await fetch(`${base}/api/mascotas?q=AMBA`)).json();
  assert.equal(resultados[0].id, mascota.id);
  assert.equal((await fetch(`${base}/api/mascotas?q=${"x".repeat(101)}`)).status, 400);
  const creado = await post("/api/turnos", { mascotaId: mascota.id, serviciosIds: [1, 2], motivo: "Le duele la cola" });
  assert.equal(creado.status, 201);
  const visita = (await creado.json()).turno;
  const actualizado = await post("/api/turnos/actualizar", { turnoId: visita.id, serviciosIds: [1, 2, 3], motivo: "Consulta y control" });
  assert.equal(actualizado.status, 200);
  assert.equal((await actualizado.json()).servicios.length, 3);
  const estado = await (await fetch(`${base}/api/turnos`)).json();
  assert.equal(estado.cantidad, 1);
  assert.equal(estado.siguiente.motivo, "Consulta y control");
});
