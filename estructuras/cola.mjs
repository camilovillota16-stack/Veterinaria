// Cola FIFO propia, formada por nodos enlazados.
export class Cola {
  constructor() {
    this.primero = null;
    this.ultimo = null;
    this.cantidad = 0;
  }

  encolar(valor) {
    const nodo = { valor, siguiente: null };
    if (this.ultimo) {
      this.ultimo.siguiente = nodo;
    } else {
      this.primero = nodo;
    }
    this.ultimo = nodo;
    this.cantidad += 1;
  }

  desencolar() {
    if (this.estaVacia()) return null;
    const valor = this.primero.valor;
    this.primero = this.primero.siguiente;
    this.cantidad -= 1;
    if (this.estaVacia()) this.ultimo = null;
    return valor;
  }

  verPrimero() {
    return this.primero ? this.primero.valor : null;
  }

  estaVacia() {
    return this.cantidad === 0;
  }

  get tamano() {
    return this.cantidad;
  }

  aArray() {
    const valores = [];
    let actual = this.primero;
    while (actual) {
      valores.push(actual.valor);
      actual = actual.siguiente;
    }
    return valores;
  }
}
