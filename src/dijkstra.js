import { FilaDePrioridade } from './fila.js';

/**
 * Encontra o caminho de menor custo entre dois vértices.
 *
 * Retorna { caminho, custo, alcancavel, passos }:
 *  - caminho: lista de vértices da origem ao destino (vazia se não houver rota);
 *  - custo: soma dos pesos do caminho (Infinity se não houver rota);
 *  - passos: registro de cada visita, usado para explicar a execução.
 *
 * Complexidade: O((V + E) log V) com a fila de prioridade em heap.
 */
export function dijkstra(grafo, origem, destino) {
  for (const vertice of [origem, destino]) {
    if (!grafo.temVertice(vertice)) throw new Error(`Vértice inexistente: ${vertice}`);
  }

  const custos = new Map([[origem, 0]]);
  const anteriores = new Map();
  const visitados = new Set();
  const fila = new FilaDePrioridade();
  const passos = [];

  fila.inserir(origem, 0);

  while (!fila.estaVazia()) {
    const { valor: atual, prioridade: custoAtual } = fila.remover();

    // Uma melhoria deixa a entrada antiga na fila; ela é ignorada aqui.
    if (visitados.has(atual)) continue;
    visitados.add(atual);

    const passo = { vertice: atual, custo: custoAtual, relaxamentos: [] };
    passos.push(passo);

    // Ao sair da fila, o custo do vértice já é definitivo.
    if (atual === destino) break;

    for (const { para, peso } of grafo.vizinhos(atual)) {
      if (visitados.has(para)) continue;

      const custoConhecido = custos.get(para) ?? Infinity;
      const custoNovo = custoAtual + peso;
      const melhorou = custoNovo < custoConhecido;
      passo.relaxamentos.push({ para, custoConhecido, custoNovo, melhorou });

      if (melhorou) {
        custos.set(para, custoNovo);
        anteriores.set(para, atual);
        fila.inserir(para, custoNovo);
      }
    }
  }

  if (!visitados.has(destino)) {
    return { caminho: [], custo: Infinity, alcancavel: false, passos };
  }

  const caminho = [destino];
  while (caminho[0] !== origem) caminho.unshift(anteriores.get(caminho[0]));

  return { caminho, custo: custos.get(destino), alcancavel: true, passos };
}
