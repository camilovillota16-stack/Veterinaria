import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Cola } from "../estructuras/cola.mjs";
import { crearAlmacenConVeterinario as crearAlmacen } from "./ayudas.mjs";
import { crearServidor } from "../api/servidor.mjs";

function registrarPaciente(almacen, nombre) {
  return almacen.registrarMascota({ nombre, especie: "Gato", propietario: "Propietario de prueba", telefono: "3000000000" });
}
function solicitar(almacen, mascota) {
  return almacen.registrarTurno({ mascotaId: mascota.id, servicioId: almacen.estadoTurnos().servicios[0].id });
}
function archivoTemporal(t) {
  const carpeta = new URL("../.test-data/", import.meta.url);
  mkdirSync(carpeta, { recursive: true });
  const archivo = fileURLToPath(new URL(`${randomUUID()}.db`, carpeta));
  t.after(() => unlinkSync(archivo));
  return archivo;
}

test("la cola respeta FIFO con operaciones intercaladas y se puede reutilizar vacía", () => {
  const cola = new Cola();
  assert.equal(cola.desencolar(), null);
  cola.encolar("Luna");
  cola.encolar("Max");
  assert.equal(cola.desencolar(), "Luna");
  cola.encolar("Henry");
  assert.equal(cola.verPrimero(), "Max");
  assert.equal(cola.tamano, 2);
  assert.equal(cola.desencolar(), "Max");
  assert.equal(cola.desencolar(), "Henry");
  assert.equal(cola.ultimo, null);
  cola.encolar("Nala");
  assert.equal(cola.desencolar(), "Nala");
  assert.equal(cola.estaVacia(), true);
});

test("convertir la cola en arreglo no permite alterar su orden interno", () => {
  const cola = new Cola();
  cola.encolar(1);
  cola.encolar(2);
  const vista = cola.aArray();
  vista.reverse();
  assert.deepEqual(cola.aArray(), [1, 2]);
});

test("los turnos salen por llegada, impiden duplicados y requieren cerrar la atención", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const luna = registrarPaciente(almacen, "Luna");
    const max = registrarPaciente(almacen, "Max");
    const henry = registrarPaciente(almacen, "Henry");
    solicitar(almacen, max);
    solicitar(almacen, luna);
    solicitar(almacen, henry);
    assert.deepEqual(almacen.estadoTurnos().pendientes.map((turno) => turno.mascotaNombre), ["Max", "Luna", "Henry"]);
    assert.throws(() => solicitar(almacen, max), (error) => error.estado === 409);
    assert.equal(almacen.llamarSiguiente().mascotaNombre, "Max");
    assert.throws(() => almacen.llamarSiguiente(), (error) => error.estado === 409);
    almacen.finalizarTurno();
    assert.equal(almacen.llamarSiguiente().mascotaNombre, "Luna");
    almacen.finalizarTurno();
    assert.equal(almacen.llamarSiguiente().mascotaNombre, "Henry");
    almacen.finalizarTurno();
    assert.throws(() => almacen.llamarSiguiente(), (error) => error.estado === 409);
    assert.throws(() => almacen.finalizarTurno(), (error) => error.estado === 409);
    assert.equal(almacen.estadoTurnos().cantidad, 0);
    assert.equal(almacen.estadoTurnos().enAtencion, null);
    assert.equal(solicitar(almacen, max).posicion, 1);
  } finally { almacen.cerrar(); }
});

test("al reabrir SQLite se recuperan el paciente activo y el orden pendiente", (t) => {
  const archivo = archivoTemporal(t);
  let almacen = crearAlmacen(archivo);
  solicitar(almacen, registrarPaciente(almacen, "Luna"));
  solicitar(almacen, registrarPaciente(almacen, "Max"));
  almacen.llamarSiguiente();
  almacen.cerrar();
  almacen = crearAlmacen(archivo);
  try {
    assert.equal(almacen.estadoTurnos().enAtencion.mascotaNombre, "Luna");
    assert.equal(almacen.estadoTurnos().siguiente.mascotaNombre, "Max");
    almacen.finalizarTurno();
    assert.equal(almacen.llamarSiguiente().mascotaNombre, "Max");
  } finally { almacen.cerrar(); }
});

test("un fallo al llamar un turno no pierde el primer nodo ni altera la espera", (t) => {
  const archivo = archivoTemporal(t);
  const almacen = crearAlmacen(archivo);
  try {
    solicitar(almacen, registrarPaciente(almacen, "Luna"));
    solicitar(almacen, registrarPaciente(almacen, "Max"));
    const control = new DatabaseSync(archivo);
    try {
      control.exec(`CREATE TRIGGER fallo_al_llamar BEFORE UPDATE ON turnos
        WHEN NEW.estado = 'en_atencion' BEGIN SELECT RAISE(ABORT, 'fallo simulado'); END;`);
      assert.throws(() => almacen.llamarSiguiente(), /fallo simulado/);
      assert.equal(almacen.estadoTurnos().siguiente.mascotaNombre, "Luna");
      assert.equal(almacen.estadoTurnos().cantidad, 2);
      assert.equal(almacen.estadoTurnos().enAtencion, null);
      control.exec("DROP TRIGGER fallo_al_llamar");
      assert.equal(almacen.llamarSiguiente().mascotaNombre, "Luna");
    } finally { control.close(); }
  } finally { almacen.cerrar(); }
});

test("la API permite solicitar, llamar y cerrar turnos y rechaza referencias inválidas", async (t) => {
  const almacen = crearAlmacen(":memory:");
  const mascota = registrarPaciente(almacen, "Luna");
  const servidor = crearServidor(almacen);
  await new Promise((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => servidor.close(resolve));
    almacen.cerrar();
  });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const post = (ruta, datos = {}) => fetch(`${base}${ruta}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
  });
  assert.equal((await post("/api/turnos", { mascotaId: "1", servicioId: 1 })).status, 400);
  assert.equal((await post("/api/turnos", { mascotaId: 9999, servicioId: 1 })).status, 404);
  assert.equal((await post("/api/turnos", { mascotaId: mascota.id, servicioId: 1 })).status, 201);
  assert.equal((await post("/api/turnos", { mascotaId: mascota.id, servicioId: 1 })).status, 409);
  const estado = await (await fetch(`${base}/api/turnos`)).json();
  assert.equal(estado.cantidad, 1);
  const llamado = await post("/api/turnos/llamar");
  assert.equal(llamado.status, 200);
  assert.equal((await llamado.json()).estado, "en_atencion");
  assert.equal((await post("/api/turnos/finalizar")).status, 200);
  assert.equal((await post("/api/turnos/llamar")).status, 409);
});
