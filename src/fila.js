/**
 * Fila de prioridade mínima implementada com heap binário.
 *
 * O JavaScript não tem essa estrutura na biblioteca padrão. Inserir e remover
 * custam O(log n). Em caso de empate na prioridade, sai primeiro quem entrou
 * primeiro, o que torna o resultado do Dijkstra determinístico.
 */
export class FilaDePrioridade {
  #itens = [];
  #contador = 0;

  get tamanho() {
    return this.#itens.length;
  }

  estaVazia() {
    return this.#itens.length === 0;
  }

  inserir(valor, prioridade) {
    this.#itens.push({ valor, prioridade, ordem: this.#contador++ });
    this.#subir(this.#itens.length - 1);
  }

  /** Remove e devolve o item de menor prioridade: { valor, prioridade }. */
  remover() {
    if (this.estaVazia()) throw new Error('A fila está vazia.');
    const primeiro = this.#itens[0];
    const ultimo = this.#itens.pop();
    if (!this.estaVazia()) {
      this.#itens[0] = ultimo;
      this.#descer(0);
    }
    return { valor: primeiro.valor, prioridade: primeiro.prioridade };
  }

  #vemAntes(i, j) {
    const a = this.#itens[i];
    const b = this.#itens[j];
    return a.prioridade !== b.prioridade ? a.prioridade < b.prioridade : a.ordem < b.ordem;
  }

  #trocar(i, j) {
    [this.#itens[i], this.#itens[j]] = [this.#itens[j], this.#itens[i]];
  }

  #subir(i) {
    while (i > 0) {
      const pai = (i - 1) >> 1;
      if (!this.#vemAntes(i, pai)) return;
      this.#trocar(i, pai);
      i = pai;
    }
  }

  #descer(i) {
    const n = this.#itens.length;
    while (true) {
      const esquerda = 2 * i + 1;
      const direita = esquerda + 1;
      let menor = i;
      if (esquerda < n && this.#vemAntes(esquerda, menor)) menor = esquerda;
      if (direita < n && this.#vemAntes(direita, menor)) menor = direita;
      if (menor === i) return;
      this.#trocar(i, menor);
      i = menor;
    }
  }
}
