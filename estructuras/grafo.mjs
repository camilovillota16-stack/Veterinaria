// Grafo no dirigido con listas de adyacencia.
export class Grafo {
  constructor() { this.adyacencias = new Map(); }

  agregarVertice(clave) {
    if (!this.adyacencias.has(clave)) this.adyacencias.set(clave, new Set());
  }

  conectar(a, b) {
    if (!this.adyacencias.has(a) || !this.adyacencias.has(b)) throw new Error("Los vértices deben existir.");
    this.adyacencias.get(a).add(b);
    this.adyacencias.get(b).add(a);
  }

  vecinos(clave) { return [...(this.adyacencias.get(clave) ?? [])]; }

  vecinosComunes(claves) {
    if (!claves.length) return [];
    return this.vecinos(claves[0]).filter((vecino) => claves.every((clave) => this.adyacencias.get(clave)?.has(vecino)));
  }
}
