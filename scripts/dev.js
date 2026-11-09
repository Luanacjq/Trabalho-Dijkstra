#!/usr/bin/env node
/**
 * Servidor local de desenvolvimento: gera o app, serve em localhost e recarrega
 * o navegador quando src/, dados/ ou site/template.html mudam.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA_INICIAL = Number(process.env.PORT) || 5173;
const TENTATIVAS_DE_PORTA = 20;

const RECARREGAR = `<script>
new EventSource("/eventos").addEventListener("recarregar", () => location.reload());
</script>`;

const clientes = new Set();

function gerarSite() {
  try {
    execFileSync(process.execPath, [join(RAIZ, 'scripts/gerar-site.js')], { stdio: 'pipe' });
    return true;
  } catch (erro) {
    console.error(`Não foi possível gerar o app:\n${erro.stderr || erro.message}`);
    return false;
  }
}

function responderEventos(resposta) {
  resposta.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  resposta.write(': conectado\n\n');
  clientes.add(resposta);
  resposta.on('close', () => clientes.delete(resposta));
}

function responderPagina(resposta) {
  const html = readFileSync(join(RAIZ, 'site/index.html'), 'utf8').replace('</body>', `${RECARREGAR}</body>`);
  resposta.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  resposta.end(html);
}

const servidor = createServer((pedido, resposta) => {
  const { pathname } = new URL(pedido.url, 'http://localhost');
  if (pathname === '/eventos') return responderEventos(resposta);
  if (pathname === '/' || pathname === '/index.html') return responderPagina(resposta);
  resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  resposta.end('Não encontrado');
});

let tentativa = 0;
servidor.on('error', (erro) => {
  if (erro.code === 'EADDRINUSE' && ++tentativa < TENTATIVAS_DE_PORTA) {
    servidor.listen(PORTA_INICIAL + tentativa, '127.0.0.1');
    return;
  }
  console.error(`Não foi possível iniciar o servidor: ${erro.message}`);
  process.exit(1);
});

servidor.on('listening', () => {
  console.log(`\n  Rota Jangada rodando em http://localhost:${servidor.address().port}`);
  console.log('  Salve um arquivo e a página recarrega sozinha. Ctrl+C para parar.\n');
});

let espera = null;
function aoMudar() {
  clearTimeout(espera);
  espera = setTimeout(() => {
    if (!gerarSite()) return;
    console.log(`[${new Date().toLocaleTimeString('pt-BR')}] app atualizado`);
    for (const cliente of clientes) cliente.write('event: recarregar\ndata: ok\n\n');
  }, 120);
}

if (!gerarSite()) process.exit(1);

watch(join(RAIZ, 'src'), { recursive: true }, aoMudar);
watch(join(RAIZ, 'dados'), { recursive: true }, aoMudar);
watch(join(RAIZ, 'site'), (_evento, arquivo) => {
  if (arquivo === 'template.html') aoMudar();
});

servidor.listen(PORTA_INICIAL, '127.0.0.1');
