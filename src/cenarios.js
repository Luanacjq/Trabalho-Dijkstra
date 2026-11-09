import { Grafo } from './grafo.js';

/**
 * Cada cenário multiplica o tempo-base da rua conforme o tipo dela.
 * Ruas marcadas como alagáveis recebem ainda o fator "alagavel".
 */
export const CENARIOS = {
  normal: {
    nome: 'Dia normal',
    descricao: 'Tempos-base, com trânsito moderado.',
    fatores: { avenida: 1, expressa: 1, orla: 1, bairro: 1, alagavel: 1 },
  },
  madrugada: {
    nome: 'Madrugada',
    descricao: 'Vias livres, sobretudo as expressas.',
    fatores: { avenida: 0.7, expressa: 0.6, orla: 0.7, bairro: 0.8, alagavel: 1 },
  },
  rush: {
    nome: 'Hora do rush',
    descricao: 'Avenidas e vias expressas congestionadas.',
    fatores: { avenida: 1.7, expressa: 2.1, orla: 1.3, bairro: 1.2, alagavel: 1 },
  },
  chuva: {
    nome: 'Quadra chuvosa',
    descricao: 'Tudo mais lento, e os pontos alagáveis bem mais.',
    fatores: { avenida: 1.3, expressa: 1.3, orla: 1.3, bairro: 1.3, alagavel: 2.5 },
  },
  domingo: {
    nome: 'Domingo na orla',
    descricao: 'Cidade tranquila, mas a orla fica lotada.',
    fatores: { avenida: 0.8, expressa: 0.8, orla: 2.4, bairro: 0.9, alagavel: 1 },
  },
};

/** Chave da rua, igual nos dois sentidos: chaveRua('B', 'A') === 'A-B'. */
export function chaveRua(a, b) {
  return [a, b].sort().join('-');
}

export function custoDaRua(rua, idCenario) {
  const { fatores } = CENARIOS[idCenario];
  const fator = fatores[rua.tipo] * (rua.alagavel ? fatores.alagavel : 1);
  return Math.round(rua.minutos * fator * 10) / 10;
}

/** Monta o grafo do cenário, sem as ruas interditadas. */
export function montarGrafo(mapa, idCenario = 'normal', interditadas = new Set()) {
  if (!CENARIOS[idCenario]) throw new Error(`Cenário inexistente: ${idCenario}`);

  const grafo = new Grafo();
  for (const ponto of mapa.pontos) grafo.adicionarVertice(ponto.id);
  for (const rua of mapa.ruas) {
    if (interditadas.has(chaveRua(rua.de, rua.para))) continue;
    grafo.adicionarAresta(rua.de, rua.para, custoDaRua(rua, idCenario), { dados: rua });
  }
  return grafo;
}

/** Formata minutos no padrão brasileiro: 12.5 vira "12,5" e 12 vira "12". */
export function formatarMinutos(valor) {
  return valor.toFixed(1).replace('.', ',').replace(/,0$/, '');
}
