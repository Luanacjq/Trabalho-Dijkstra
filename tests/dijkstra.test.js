import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { FilaDePrioridade } from '../src/fila.js';
import { Grafo } from '../src/grafo.js';
import { dijkstra } from '../src/dijkstra.js';
import { CENARIOS, chaveRua, custoDaRua, formatarMinutos, montarGrafo } from '../src/cenarios.js';

const mapa = JSON.parse(readFileSync(new URL('../dados/fortaleza.json', import.meta.url), 'utf8'));
const quase = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} deveria ser ${b}`);

function grafoDe(arestas, opcoes) {
  const grafo = new Grafo();
  for (const [a, b, peso] of arestas) grafo.adicionarAresta(a, b, peso, opcoes);
  return grafo;
}

/** Testa todos os caminhos simples. Lento, mas não usa a ideia do Dijkstra. */
function menorCustoPorForcaBruta(grafo, atual, destino, visitados = new Set([atual])) {
  if (atual === destino) return 0;
  let melhor = Infinity;
  for (const { para, peso } of grafo.vizinhos(atual)) {
    if (visitados.has(para)) continue;
    visitados.add(para);
    melhor = Math.min(melhor, peso + menorCustoPorForcaBruta(grafo, para, destino, visitados));
    visitados.delete(para);
  }
  return melhor;
}

/** Gerador pseudoaleatório com semente, para o teste ser reproduzível. */
function aleatorio(semente) {
  return () => {
    semente = (semente * 1664525 + 1013904223) % 4294967296;
    return semente / 4294967296;
  };
}

describe('FilaDePrioridade', () => {
  it('remove em ordem crescente de prioridade', () => {
    const fila = new FilaDePrioridade();
    [5, 1, 4, 2, 3].forEach((n) => fila.inserir(n, n));
    const saida = [];
    while (!fila.estaVazia()) saida.push(fila.remover().valor);
    assert.deepEqual(saida, [1, 2, 3, 4, 5]);
  });

  it('respeita a ordem de chegada nos empates', () => {
    const fila = new FilaDePrioridade();
    ['a', 'b', 'c'].forEach((letra) => fila.inserir(letra, 1));
    assert.equal(fila.remover().valor, 'a');
    assert.equal(fila.remover().valor, 'b');
  });
});

describe('Grafo', () => {
  it('rejeita pesos negativos', () => {
    assert.throws(() => grafoDe([['A', 'B', -1]]), RangeError);
  });

  it('cria arestas nos dois sentidos, salvo mão única', () => {
    assert.equal(grafoDe([['A', 'B', 1]]).vizinhos('B').length, 1);
    assert.equal(grafoDe([['A', 'B', 1]], { maoDupla: false }).vizinhos('B').length, 0);
  });
});

describe('dijkstra', () => {
  it('prefere o caminho barato com mais trechos ao direto caro', () => {
    const grafo = grafoDe([['A', 'B', 1], ['B', 'C', 2], ['A', 'C', 10]]);
    const { caminho, custo } = dijkstra(grafo, 'A', 'C');
    assert.deepEqual(caminho, ['A', 'B', 'C']);
    assert.equal(custo, 3);
  });

  it('trata origem igual ao destino', () => {
    const { caminho, custo } = dijkstra(grafoDe([['A', 'B', 1]]), 'A', 'A');
    assert.deepEqual(caminho, ['A']);
    assert.equal(custo, 0);
  });

  it('informa quando não há rota', () => {
    const grafo = grafoDe([['A', 'B', 1], ['C', 'D', 1]]);
    const resultado = dijkstra(grafo, 'A', 'D');
    assert.equal(resultado.alcancavel, false);
    assert.equal(resultado.custo, Infinity);
    assert.deepEqual(resultado.caminho, []);
  });

  it('respeita ruas de mão única', () => {
    const grafo = grafoDe([['A', 'B', 1]], { maoDupla: false });
    assert.equal(dijkstra(grafo, 'B', 'A').alcancavel, false);
  });

  it('rejeita vértices inexistentes', () => {
    assert.throws(() => dijkstra(grafoDe([['A', 'B', 1]]), 'A', 'Z'), /inexistente/);
  });

  it('concorda com a força bruta em 300 grafos aleatórios', () => {
    const sortear = aleatorio(2026);
    for (let rodada = 0; rodada < 300; rodada++) {
      const grafo = new Grafo();
      const n = 2 + Math.floor(sortear() * 6);
      for (let v = 0; v < n; v++) grafo.adicionarVertice(v);
      for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
          if (sortear() < 0.55) grafo.adicionarAresta(a, b, Math.floor(sortear() * 20));
        }
      }
      assert.equal(dijkstra(grafo, 0, n - 1).custo, menorCustoPorForcaBruta(grafo, 0, n - 1));
    }
  });
});

describe('mapa de Fortaleza', () => {
  const ids = new Set(mapa.pontos.map((p) => p.id));

  it('tem dados consistentes', () => {
    assert.equal(ids.size, mapa.pontos.length);
    const chaves = mapa.ruas.map((r) => chaveRua(r.de, r.para));
    assert.equal(new Set(chaves).size, chaves.length, 'há rua duplicada');
    for (const rua of mapa.ruas) {
      assert.ok(ids.has(rua.de) && ids.has(rua.para), `rua inválida: ${rua.de}-${rua.para}`);
      assert.ok(rua.minutos > 0);
      assert.ok(rua.tipo in CENARIOS.normal.fatores, `tipo inválido: ${rua.tipo}`);
    }
  });

  it('conecta todos os pares, e o custo é a soma dos trechos, em todos os cenários', () => {
    for (const idCenario of Object.keys(CENARIOS)) {
      const grafo = montarGrafo(mapa, idCenario);
      for (const origem of ids) {
        for (const destino of ids) {
          const { caminho, custo, alcancavel } = dijkstra(grafo, origem, destino);
          assert.ok(alcancavel, `${origem} não alcança ${destino}`);
          let soma = 0;
          for (let i = 0; i < caminho.length - 1; i++) {
            soma += grafo.vizinhos(caminho[i]).find((a) => a.para === caminho[i + 1]).peso;
          }
          quase(soma, custo);
        }
      }
    }
  });

  it('o cenário muda a rota escolhida em algum par de pontos', () => {
    const trajeto = (id, o, d) => dijkstra(montarGrafo(mapa, id), o, d).caminho.join();
    const mudou = [...ids].some((o) => [...ids].some((d) => trajeto('normal', o, d) !== trajeto('rush', o, d)));
    assert.ok(mudou);
  });

  it('a interdição tira a rua da rota e nunca reduz o custo', () => {
    const livre = dijkstra(montarGrafo(mapa), 'CD', 'PFU');
    const [a, b] = livre.caminho;
    const chave = chaveRua(a, b);
    const desviada = dijkstra(montarGrafo(mapa, 'normal', new Set([chave])), 'CD', 'PFU');
    assert.ok(desviada.custo >= livre.custo);
    const trechos = desviada.caminho.slice(1).map((v, i) => chaveRua(desviada.caminho[i], v));
    assert.ok(!trechos.includes(chave));
  });

  it('aplica o fator de alagamento', () => {
    const rua = { minutos: 10, tipo: 'bairro', alagavel: true };
    assert.equal(custoDaRua(rua, 'chuva'), 32.5);
  });
});

describe('formatarMinutos', () => {
  it('usa vírgula e omite o decimal zero', () => {
    assert.equal(formatarMinutos(12.5), '12,5');
    assert.equal(formatarMinutos(12), '12');
  });
});
