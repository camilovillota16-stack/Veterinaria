// Lista enlazada propia: cada nodo apunta a la siguiente consulta.
export class ListaEnlazada {
  constructor() {
    this.cabeza = null;
    this.cantidad = 0;
  }

  insertarAlInicio(valor) {
    this.cabeza = { valor, siguiente: this.cabeza };
    this.cantidad++;
  }

  get tamano() { return this.cantidad; }

  *[Symbol.iterator]() {
    let actual = this.cabeza;
    while (actual) {
      yield actual.valor;
      actual = actual.siguiente;
    }
  }

  aArray() { return [...this]; }
}
