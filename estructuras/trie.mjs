export function normalizarBusqueda(texto) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es").trim().replace(/\s+/g, " ");
}

function crearNodo() {
  return { hijos: new Map(), identificadores: new Set() };
}

// Cada prefijo conserva los identificadores, incluso con nombres repetidos.
export class Trie {
  constructor() { this.raiz = crearNodo(); }

  insertar(texto, identificador) {
    let nodo = this.raiz;
    nodo.identificadores.add(identificador);
    for (const letra of normalizarBusqueda(texto)) {
      if (!nodo.hijos.has(letra)) nodo.hijos.set(letra, crearNodo());
      nodo = nodo.hijos.get(letra);
      nodo.identificadores.add(identificador);
    }
  }

  buscar(prefijo) {
    let nodo = this.raiz;
    for (const letra of normalizarBusqueda(prefijo)) {
      nodo = nodo.hijos.get(letra);
      if (!nodo) return [];
    }
    return [...nodo.identificadores];
  }
}
