import assert from 'node:assert/strict';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG, MELHORIAS, PRODUTOS } from '../src/jogo/configuracao.js';
import { geometriaEstacao, intervaloEstacoes } from '../src/jogo/estacoes.js';

export function abrirLoja(nivel = 15) {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 40000;
  for (const id of ['caixa', 'milho', 'alaProducao', 'alaLeite', 'ajudante', 'alaTrigo', 'cestasExtras', 'alaPadaria',
    'logistica', 'alaArtesanal', 'apiario', 'queijaria', 'irrigacao', 'equipeAgil', 'cozinhaGeleia']) {
    if (MELHORIAS.find(m => m.id === id).nivelMinimo <= nivel) assert.equal(sim.comprarMelhoria(id).sucesso, true, id);
  }
  sim.proximoCliente = Infinity;
  sim.estado.lojaAberta = false;
  return sim;
}

for (const nivel of [1, 3, 4, 5, 7, 9, 11, 12, 13, 15]) {
  const sim = abrirLoja(nivel);
  for (const [id, produto] of Object.entries(PRODUTOS)) {
    if (!sim.estado.produtos[id].liberado) continue;
    for (const ponto of [produto.coleta, produto.reposicao, ...produto.pontosCompra]) {
      const ator = { ...CONFIG.inicio };
      let chegou = false;
      for (let tick = 0; tick < 3000 && !chegou; tick++) {
        sim.tempo += 0.05;
        chegou = sim.caminharCliente(ator, ponto, 0.05);
      }
      assert.ok(chegou, `N${nivel}: ${id} ${JSON.stringify(ponto)}; actor ${JSON.stringify(ator)}`);
      // Returning from the furthest departments must also reach checkout.
      chegou = false;
      for (let tick = 0; tick < 3000 && !chegou; tick++) {
        sim.tempo += 0.05;
        chegou = sim.caminharCliente(ator, CONFIG.clienteCaixa, 0.05);
      }
      assert.ok(chegou, `Return N${nivel}: ${id}; actor ${JSON.stringify(ator)}; route ${JSON.stringify(sim.caminhosClientes.get(ator))}`);
    }
  }
  console.log(`N${nivel}: purchase, collection, stocking and checkout routes pass.`);
}

const pads = Object.entries(PRODUTOS).flatMap(([id,p]) =>
  (id === 'pao' ? ['reposicao'] : ['coleta','reposicao']).map(tipo => ({ id, tipo, ...geometriaEstacao(id, tipo) })));
for (let i=0;i<pads.length;i++) for (let j=i+1;j<pads.length;j++) {
  assert.ok(intervaloEstacoes(pads[i],pads[j]) > CONFIG.raioInteracao * 2,
    `Insufficient object spacing: ${pads[i].id}/${pads[i].tipo}, ${pads[j].id}/${pads[j].tipo}`);
}
console.log(`${pads.length} physical stations have disjoint pickup/stocking ranges, without floor markers.`);
