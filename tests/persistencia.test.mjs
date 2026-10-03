import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { crearAlmacen } from "../db/database.mjs";
import { crearServidor } from "../api/servidor.mjs";

const datos = (cambios = {}) => ({
  nombre: "Luna", especie: "Gato", raza: "Siamés",
  propietario: "Propietario de prueba", telefono: "300 000 0000", ...cambios,
});

function archivoTemporal(t) {
  const carpeta = new URL("../.test-data/", import.meta.url);
  mkdirSync(carpeta, { recursive: true });
  const archivo = fileURLToPath(new URL(`${randomUUID()}.db`, carpeta));
  t.after(() => unlinkSync(archivo));
  return archivo;
}

function consultar(archivo, sql) {
  const lector = new DatabaseSync(archivo);
  try { return lector.prepare(sql).get(); }
  finally { lector.close(); }
}

async function prepararApi(t) {
  const almacen = crearAlmacen(":memory:");
  const servidor = crearServidor(almacen);
  await new Promise((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen(0, "127.0.0.1", resolve);
  });
  t.after(async () => {
    await new Promise((resolve) => servidor.close(resolve));
    almacen.cerrar();
  });
  return `http://127.0.0.1:${servidor.address().port}`;
}

test("el registro sobrevive al cerrar y volver a abrir la base de datos", (t) => {
  const archivo = archivoTemporal(t);
  let almacen = crearAlmacen(archivo);
  const guardada = almacen.registrarMascota(datos({ nombre: "  Luna  " }));
  almacen.cerrar();
  almacen = crearAlmacen(archivo);
  try {
    assert.equal(almacen.listarMascotas().length, 1);
    assert.equal(almacen.listarMascotas()[0].id, guardada.id);
    assert.equal(almacen.listarMascotas()[0].nombre, "Luna");
  } finally { almacen.cerrar(); }
});

test("dos mascotas reutilizan el propietario pese al formato del teléfono", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const luna = almacen.registrarMascota(datos());
    const max = almacen.registrarMascota(datos({ nombre: "Max", propietario: "PROPIETARIO DE PRUEBA", telefono: "3000000000" }));
    assert.equal(luna.propietarioId, max.propietarioId);
    assert.notEqual(luna.id, max.id);
    const otra = almacen.registrarMascota(datos({ propietario: "Otro propietario" }));
    assert.notEqual(luna.propietarioId, otra.propietarioId);
  } finally { almacen.cerrar(); }
});

test("raza opcional y texto con comillas se guardan sin alterar las tablas", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    const nombre = "Luna'); DROP TABLE mascotas;--";
    const guardada = almacen.registrarMascota(datos({ nombre, raza: undefined }));
    assert.equal(guardada.nombre, nombre);
    assert.equal(guardada.raza, "");
    assert.equal(almacen.listarMascotas().length, 1);
  } finally { almacen.cerrar(); }
});

test("datos inválidos no se insertan aunque se omita el formulario", () => {
  const almacen = crearAlmacen(":memory:");
  try {
    for (const cambios of [{ nombre: "   " }, { telefono: "abc" }, { especie: "Inválida" }, { nombre: "a".repeat(61) }, { propietario: 42 }]) {
      assert.throws(() => almacen.registrarMascota(datos(cambios)));
    }
    assert.throws(() => almacen.registrarMascota(null));
    assert.equal(almacen.listarMascotas().length, 0);
  } finally { almacen.cerrar(); }
});

test("si falla la inserción de mascota se revierte el propietario nuevo", (t) => {
  const archivo = archivoTemporal(t);
  const almacen = crearAlmacen(archivo);
  try {
    almacen.registrarMascota(datos());
    const control = new DatabaseSync(archivo);
    try {
      control.exec(`CREATE TRIGGER fallo_de_prueba BEFORE INSERT ON mascotas
        BEGIN SELECT RAISE(ABORT, 'fallo simulado'); END;`);
    } finally { control.close(); }
    assert.throws(() => almacen.registrarMascota(datos({ propietario: "Nuevo propietario" })), /fallo simulado/);
    assert.equal(consultar(archivo, "SELECT COUNT(*) AS cantidad FROM propietarios").cantidad, 1);
    assert.equal(almacen.listarMascotas().length, 1);
  } finally { almacen.cerrar(); }
});

test("la API crea un registro y permite recuperarlo con GET", async (t) => {
  const base = await prepararApi(t);
  const inicial = await fetch(`${base}/api/mascotas`);
  assert.deepEqual(await inicial.json(), []);
  const respuesta = await fetch(`${base}/api/mascotas`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos()),
  });
  assert.equal(respuesta.status, 201);
  const guardada = await respuesta.json();
  const lista = await (await fetch(`${base}/api/mascotas`)).json();
  assert.equal(lista[0].id, guardada.id);
  assert.equal(lista[0].propietario, "Propietario de prueba");
});

test("la API rechaza JSON inválido, contenido excesivo y campos inválidos", async (t) => {
  const base = await prepararApi(t);
  for (const [contenido, esperado] of [
    ["{", 400],
    [JSON.stringify(datos({ telefono: "abc" })), 400],
    [JSON.stringify({ texto: "a".repeat(17000) }), 413],
  ]) {
    const respuesta = await fetch(`${base}/api/mascotas`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: contenido,
    });
    assert.equal(respuesta.status, esperado);
    assert.equal(typeof (await respuesta.json()).error, "string");
  }
  assert.deepEqual(await (await fetch(`${base}/api/mascotas`)).json(), []);
});

test("el servidor no entrega la base de datos y rechaza métodos y orígenes ajenos", async (t) => {
  const base = await prepararApi(t);
  assert.equal((await fetch(`${base}/data/veterinaria.db`)).status, 404);
  assert.equal((await fetch(`${base}/api/mascotas`, { method: "DELETE" })).status, 405);
  assert.equal((await fetch(`${base}/api/mascotas`, { method: "POST", body: "texto" })).status, 415);
  const respuesta = await fetch(`${base}/api/mascotas`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify(datos()),
  });
  assert.equal(respuesta.status, 403);
});
