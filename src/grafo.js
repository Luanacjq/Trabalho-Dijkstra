/**
 * Grafo ponderado representado por lista de adjacências.
 *
 * Cada vértice guarda a lista dos seus vizinhos e o peso da aresta que os
 * conecta: Map { 'CD' => [{ para: 'PAR', peso: 7, dados: {...} }, ...] }.
 */
export class Grafo {
  #adjacencias = new Map();

  get vertices() {
    return [...this.#adjacencias.keys()];
  }

  temVertice(id) {
    return this.#adjacencias.has(id);
  }

  adicionarVertice(id) {
    if (!this.temVertice(id)) this.#adjacencias.set(id, []);
  }

  /**
   * Adiciona uma aresta. Por padrão ela vale nos dois sentidos; use
   * maoDupla: false para modelar uma rua de mão única.
   */
  adicionarAresta(de, para, peso, { maoDupla = true, dados = null } = {}) {
    if (!Number.isFinite(peso) || peso < 0) {
      throw new RangeError(`Peso inválido em ${de}-${para}: o Dijkstra exige pesos finitos e não negativos.`);
    }
    this.adicionarVertice(de);
    this.adicionarVertice(para);
    this.#adjacencias.get(de).push({ para, peso, dados });
    if (maoDupla) this.#adjacencias.get(para).push({ para: de, peso, dados });
  }

  vizinhos(id) {
    return this.#adjacencias.get(id) ?? [];
  }
}
