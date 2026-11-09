#!/usr/bin/env node
/**
 * Gera site/index.html a partir de site/template.html.
 *
 * A página recebe o mesmo código de src/ usado no terminal e os dados do mapa,
 * tudo embutido. Por isso ela funciona como arquivo único.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULOS_DA_PAGINA = ['fila', 'grafo', 'dijkstra', 'cenarios'];

const ler = (caminho) => readFileSync(join(RAIZ, caminho), 'utf8');

/** Junta os módulos em um único script, removendo import e export. */
function codigoParaNavegador() {
  return MODULOS_DA_PAGINA
    .map((modulo) => ler(`src/${modulo}.js`).replace(/^import .*$/gm, '').replace(/^export /gm, ''))
    .join('\n');
}

const substituicoes = {
  '/*__CODIGO__*/': codigoParaNavegador(),
  '__MAPA_JSON__': JSON.stringify(JSON.parse(ler('dados/fortaleza.json'))),
};

let pagina = ler('site/template.html');
for (const [marcador, valor] of Object.entries(substituicoes)) {
  pagina = pagina.split(marcador).join(valor);
}

const documento = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n'
  + `${pagina}\n</body></html>\n`;

writeFileSync(join(RAIZ, 'site/index.html'), documento);
console.log('site/index.html gerado.');
