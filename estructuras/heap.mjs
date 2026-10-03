// Heap máximo: mayor prioridad primero; en empates, menor id (llegó antes).
export class HeapPrioridad {
  constructor(comparar = (a, b) => a.prioridad - b.prioridad || b.id - a.id) {
    this.elementos = [];
    this.comparar = comparar;
  }

  get tamano() { return this.elementos.length; }
  estaVacio() { return this.tamano === 0; }
  verPrimero() { return this.elementos[0] ?? null; }

  insertar(valor) {
    this.elementos.push(valor);
    let indice = this.tamano - 1;
    while (indice > 0) {
      const padre = Math.floor((indice - 1) / 2);
      if (this.comparar(this.elementos[indice], this.elementos[padre]) <= 0) break;
      this.intercambiar(indice, padre);
      indice = padre;
    }
  }

  extraer() {
    if (this.estaVacio()) return null;
    const primero = this.elementos[0];
    const ultimo = this.elementos.pop();
    if (this.estaVacio()) return primero;
    this.elementos[0] = ultimo;
    let indice = 0;
    while (true) {
      const izquierdo = indice * 2 + 1;
      const derecho = izquierdo + 1;
      let mejor = indice;
      if (izquierdo < this.tamano && this.comparar(this.elementos[izquierdo], this.elementos[mejor]) > 0) mejor = izquierdo;
      if (derecho < this.tamano && this.comparar(this.elementos[derecho], this.elementos[mejor]) > 0) mejor = derecho;
      if (mejor === indice) break;
      this.intercambiar(indice, mejor);
      indice = mejor;
    }
    return primero;
  }

  intercambiar(a, b) {
    [this.elementos[a], this.elementos[b]] = [this.elementos[b], this.elementos[a]];
  }

  enOrden() {
    const copia = new HeapPrioridad(this.comparar);
    copia.elementos = this.elementos.slice();
    const ordenados = [];
    while (!copia.estaVacio()) ordenados.push(copia.extraer());
    return ordenados;
  }
}
