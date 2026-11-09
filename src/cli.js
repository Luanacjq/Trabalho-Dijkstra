#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { dijkstra } from './dijkstra.js';
import { CENARIOS, chaveRua, formatarMinutos, montarGrafo } from './cenarios.js';

const mapa = JSON.parse(readFileSync(new URL('../dados/fortaleza.json', import.meta.url), 'utf8'));
const LARGURA = 60;

const AJUDA = `
Rota Jangada: menor caminho para entregas em Fortaleza

Uso:
  node src/cli.js                     demonstração: CD até Praia do Futuro
  node src/cli.js rota [opções]       calcula uma rota e imprime o romaneio
  node src/cli.js comparar [opções]   compara a rota em todos os cenários
  node src/cli.js pontos              lista os pontos de entrega

Opções:
  --de <ponto>         ponto de partida (padrão: CD)
  --para <ponto>       ponto de entrega (padrão: PFU)
  --cenario <id>       ${Object.keys(CENARIOS).join(', ')}
  --interditar <A-B>   fecha uma rua; pode ser repetido
  --passos             mostra a execução do algoritmo

Exemplo:
  node src/cli.js rota --de CD --para "praia do futuro" --cenario rush --passos
`;

const semAcento = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const nomeDe = (id) => mapa.pontos.find((ponto) => ponto.id === id).nome;

function resolverPonto(texto) {
  const busca = semAcento(texto);
  const exato = mapa.pontos.find((p) => semAcento(p.id) === busca || semAcento(p.nome) === busca);
  if (exato) return exato.id;

  const parecidos = mapa.pontos.filter((p) => semAcento(p.nome).includes(busca));
  if (parecidos.length === 1) return parecidos[0].id;
  if (parecidos.length > 1) {
    throw new Error(`"${texto}" é ambíguo: ${parecidos.map((p) => p.nome).join(', ')}.`);
  }
  throw new Error(`Ponto não encontrado: "${texto}". Use "node src/cli.js pontos" para ver a lista.`);
}

function lerInterdicoes(lista = []) {
  return new Set(lista.map((texto) => {
    const [a, b] = texto.split('-').map(resolverPonto);
    if (!b || !mapa.ruas.some((r) => chaveRua(r.de, r.para) === chaveRua(a, b))) {
      throw new Error(`Rua não encontrada: "${texto}". Use o formato A-B, por exemplo PAP-PFU.`);
    }
    return chaveRua(a, b);
  }));
}

function ruaEntre(a, b) {
  return mapa.ruas.find((r) => chaveRua(r.de, r.para) === chaveRua(a, b));
}

function custoDoTrecho(grafo, a, b) {
  return grafo.vizinhos(a).find((aresta) => aresta.para === b).peso;
}

function imprimirRomaneio(grafo, resultado, origem, destino, idCenario, interditadas) {
  const borda = '─'.repeat(LARGURA);
  console.log(`\n┌${borda}┐`);
  const linha = (texto = '') => console.log(`│ ${texto.padEnd(LARGURA - 2)} │`);

  linha('ROMANEIO DE ENTREGA · Rota Jangada');
  linha();
  linha(`Saída:    ${nomeDe(origem)}`);
  linha(`Entrega:  ${nomeDe(destino)}`);
  linha(`Cenário:  ${CENARIOS[idCenario].nome}`);
  if (interditadas.size) linha(`Fechadas: ${[...interditadas].join(', ')}`);
  console.log(`├${borda}┤`);

  if (!resultado.alcancavel) {
    linha('Não existe rota com as interdições atuais.');
  } else {
    for (let i = 0; i < resultado.caminho.length - 1; i++) {
      const a = resultado.caminho[i];
      const b = resultado.caminho[i + 1];
      const minutos = `${formatarMinutos(custoDoTrecho(grafo, a, b))} min`;
      linha(`${nomeDe(a)} → ${nomeDe(b)}`.padEnd(LARGURA - 2 - minutos.length) + minutos);
      const { via } = ruaEntre(a, b);
      if (via) linha(`  por ${via}`);
    }
    console.log(`├${borda}┤`);
    const total = `${formatarMinutos(resultado.custo)} min`;
    linha('TEMPO TOTAL'.padEnd(LARGURA - 2 - total.length) + total);
  }
  console.log(`└${borda}┘`);
}

function imprimirPassos(resultado) {
  console.log('\nExecução do algoritmo:');
  resultado.passos.forEach((passo, i) => {
    console.log(`\n${String(i + 1).padStart(2)}. Visita ${nomeDe(passo.vertice)} (${formatarMinutos(passo.custo)} min)`);
    for (const { para, custoNovo, custoConhecido, melhorou } of passo.relaxamentos) {
      const antes = custoConhecido === Infinity ? '∞' : formatarMinutos(custoConhecido);
      const situacao = melhorou ? 'melhora' : 'mantém';
      console.log(`    ${situacao} ${nomeDe(para)}: ${antes} → ${formatarMinutos(custoNovo)}`);
    }
  });
}

function comandoRota({ origem, destino, idCenario, interditadas, passos }) {
  const grafo = montarGrafo(mapa, idCenario, interditadas);
  const resultado = dijkstra(grafo, origem, destino);
  imprimirRomaneio(grafo, resultado, origem, destino, idCenario, interditadas);
  if (passos) imprimirPassos(resultado);
}

function comandoComparar({ origem, destino, interditadas }) {
  console.log(`\n${nomeDe(origem)} → ${nomeDe(destino)}\n`);
  for (const [id, cenario] of Object.entries(CENARIOS)) {
    const { custo, caminho, alcancavel } = dijkstra(montarGrafo(mapa, id, interditadas), origem, destino);
    const tempo = alcancavel ? `${formatarMinutos(custo)} min` : 'sem rota';
    console.log(`${cenario.nome.padEnd(18)}${tempo.padStart(10)}   ${caminho.map(nomeDe).join(' → ')}`);
  }
}

function comandoPontos() {
  for (const { id, nome } of mapa.pontos) console.log(`${id.padEnd(5)}${nome}`);
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      de: { type: 'string', default: 'CD' },
      para: { type: 'string', default: 'PFU' },
      cenario: { type: 'string', default: 'normal' },
      interditar: { type: 'string', multiple: true },
      passos: { type: 'boolean', default: false },
      ajuda: { type: 'boolean', short: 'h', default: false },
    },
  });

  const comando = positionals[0] ?? 'demonstracao';
  if (values.ajuda || comando === 'ajuda') return console.log(AJUDA);
  if (comando === 'pontos') return comandoPontos();
  if (!CENARIOS[values.cenario]) throw new Error(`Cenário inexistente: "${values.cenario}".`);

  const opcoes = {
    origem: resolverPonto(values.de),
    destino: resolverPonto(values.para),
    idCenario: values.cenario,
    interditadas: lerInterdicoes(values.interditar),
    passos: values.passos,
  };

  if (comando === 'rota') return comandoRota(opcoes);
  if (comando === 'comparar') return comandoComparar(opcoes);
  if (comando === 'demonstracao') {
    comandoRota(opcoes);
    console.log('');
    return comandoComparar(opcoes);
  }
  throw new Error(`Comando desconhecido: "${comando}". Use --ajuda para ver as opções.`);
}

try {
  main();
} catch (erro) {
  console.error(`Erro: ${erro.message}`);
  process.exitCode = 1;
}
