# Rota Jangada

Trabalho sobre o **algoritmo de Dijkstra** aplicado a um cenário de logística em Fortaleza. Dado o centro de distribuição e o endereço do cliente, o programa encontra a rota de menor tempo total e informa o caminho e o custo.

A Jangada é uma empresa fictícia, com centro de distribuição na Maraponga.

## Como rodar

É preciso ter o [Node.js](https://nodejs.org) 22.2 ou mais recente. O projeto não tem dependências, então não há `npm install`.

```bash
yarn dev      # abre o app em http://localhost:5173 e recarrega ao salvar
yarn start    # demonstração no terminal: CD até a Praia do Futuro
yarn test     # testes automatizados
yarn site     # gera site/index.html novamente
```

Os mesmos comandos funcionam com `npm run dev`, `npm start`, `npm test` e `npm run site`. Se a porta 5173 estiver ocupada, o `dev` usa a próxima livre e mostra o endereço no terminal.

Consultas pela linha de comando:

```bash
node src/cli.js rota --de CD --para "praia do futuro" --cenario rush --passos
node src/cli.js rota --para messejana --interditar AER-MES
node src/cli.js comparar --para messejana
node src/cli.js pontos
```

Cenários disponíveis: `normal`, `madrugada`, `rush`, `chuva` e `domingo`.

O app de navegação fica em `site/index.html`, e basta abri-lo no navegador. No mapa, o primeiro clique escolhe a saída e o segundo escolhe a entrega. Você também troca o cenário, interdita ruas e acompanha o algoritmo passo a passo. O botão **Iniciar entrega** simula o trajeto com a câmera seguindo o veículo. Durante a viagem, **Reportar interdição** fecha a próxima rua e roda o Dijkstra de novo.

## Como o enunciado foi atendido

| Pedido | Onde está |
| --- | --- |
| Pontos de entrega em Fortaleza (vértices) | `dados/fortaleza.json`, 24 pontos |
| Conexões entre os pontos (arestas) | `dados/fortaleza.json`, 46 ligações de mão dupla |
| Peso de cada aresta | Tempo em minutos, ajustado pelo cenário em `src/cenarios.js` |
| Lista de adjacências | `src/grafo.js` |
| Dijkstra com grafo, origem e destino | `dijkstra(grafo, origem, destino)` em `src/dijkstra.js` |
| Caminho mais curto e custo total | Campos `caminho` e `custo` do retorno |

## Estrutura

```text
dados/fortaleza.json   pontos, ruas e tempos-base
src/fila.js            fila de prioridade (heap binário)
src/grafo.js           grafo com lista de adjacências
src/dijkstra.js        o algoritmo
src/cenarios.js        cenários de trânsito e montagem do grafo
src/cli.js             linha de comando
tests/                 testes automatizados
scripts/gerar-site.js  monta a página do app
site/                  modelo e página final
```

## Como o algoritmo funciona

1. A origem recebe custo 0, e os demais pontos começam com custo infinito.
2. A fila de prioridade entrega o ponto não visitado de menor custo acumulado. Esse custo já é definitivo.
3. Para cada vizinho, o algoritmo soma o custo atual ao peso da rua. Se o total for menor que o conhecido, guarda o novo custo e o ponto de onde veio.
4. Quando o destino sai da fila, o algoritmo para e reconstrói o caminho pelos pontos anteriores.

A garantia depende de os pesos não serem negativos, o que vale para tempos de percurso. Por isso `Grafo.adicionarAresta` rejeita pesos negativos. Com o heap binário, a complexidade é **O((V + E) log V)**.

## Modelagem do trânsito

Cada rua tem um tempo-base e um tipo: `avenida`, `expressa`, `orla` ou `bairro`. Algumas são marcadas como alagáveis. O cenário multiplica o tempo-base conforme o tipo, e o grafo é remontado com os novos pesos. O algoritmo não muda.

| Cenário | Avenida | Expressa | Orla | Bairro | Alagável |
| --- | --- | --- | --- | --- | --- |
| Dia normal | ×1 | ×1 | ×1 | ×1 | ×1 |
| Madrugada | ×0,7 | ×0,6 | ×0,7 | ×0,8 | ×1 |
| Hora do rush | ×1,7 | ×2,1 | ×1,3 | ×1,2 | ×1 |
| Quadra chuvosa | ×1,3 | ×1,3 | ×1,3 | ×1,3 | ×2,5 |
| Domingo na orla | ×0,8 | ×0,8 | ×2,4 | ×0,9 | ×1 |

## Limitações

- Os tempos-base e os fatores são estimativas feitas para este trabalho, não medições do Waze ou do Google Maps. Para usar valores medidos, edite `dados/fortaleza.json`.
- O modelo trata bairros como vértices e considera todas as ligações de mão dupla. O grafo aceita mão única com a opção `maoDupla: false`.
- O mapa da página é esquemático: as posições mostram a relação entre os bairros, sem escala geográfica.

## Testes

Os testes cobrem a fila de prioridade, o grafo, os casos de borda do algoritmo e a consistência do mapa. O Dijkstra também é comparado com uma busca por força bruta em 300 grafos aleatórios, e o mapa é verificado em todos os pares de pontos e em todos os cenários.
