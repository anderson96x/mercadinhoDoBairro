import assert from 'node:assert/strict';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG, MELHORIAS, PRODUTOS, SEQUENCIA_MELHORIAS } from '../src/jogo/configuracao.js';
import { geometriaEstacao, intervaloEstacoes, estacoesSeparadasPorParede } from '../src/jogo/estacoes.js';
import { PAREDES_LOJA } from '../src/jogo/bairro.js';
import { CONFEITARIA } from '../src/jogo/confeitaria.js';
import { SUCOS } from '../src/jogo/sucos.js';

export function abrirLoja(nivel = 15) {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 40000;
  for (const id of SEQUENCIA_MELHORIAS) {
    const melhoria = MELHORIAS.find(m => m.id === id);
    if (melhoria.ativa !== false && melhoria.nivelMinimo <= nivel) assert.equal(sim.comprarMelhoria(id).sucesso, true, id);
  }
  sim.proximoCliente = Infinity;
  sim.estado.lojaAberta = false;
  return sim;
}

for (let nivel = 1; nivel <= 24; nivel++) {
  const sim = abrirLoja(nivel);
  for (const [id, produto] of Object.entries(sim.produtos)) {
    if (!sim.estado.produtos[id].liberado) continue;
    const pontos = produto.origem === 'importado' ? produto.pontosCompra : [produto.coleta, produto.reposicao, ...produto.pontosCompra];
    for (const ponto of pontos) {
      const ator = Object.assign(sim.estado.jogador, CONFIG.inicio);
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

const pads = Object.entries(PRODUTOS).filter(([, p]) => !['importado', 'confeitaria', 'sucos'].includes(p.origem)).flatMap(([id,p]) =>
  (id === 'pao' ? ['reposicao'] : ['coleta','reposicao']).map(tipo => ({ id, tipo, ...geometriaEstacao(id, tipo) })));
pads.push({ id: 'confeitaria', tipo: 'entrega', ...CONFEITARIA.entrada });
pads.push({ id: 'sucos', tipo: 'entrega', ...SUCOS.bancada });
for (let i=0;i<pads.length;i++) for (let j=i+1;j<pads.length;j++) {
  if ([pads[i].id, pads[j].id].includes('confeitaria') && [pads[i].id, pads[j].id].includes('pao')) {
    // Duas seções contíguas do mesmo balcão, selecionadas por lados exclusivos em interagir().
    assert.ok(Math.abs(Math.abs(pads[i].x - pads[j].x) - (pads[i].w + pads[j].w) / 2) < 1e-8);
    continue;
  }
  if (pads[i].tipo === 'reposicao' && pads[j].tipo === 'reposicao' && pads[i].movel
    && pads[i].movel === pads[j].movel && ['hortifruti', 'parede-frios', 'doces'].includes(pads[i].movel)) continue;
  assert.ok(intervaloEstacoes(pads[i],pads[j]) > CONFIG.raioInteracao * 2
    || estacoesSeparadasPorParede(pads[i], pads[j], PAREDES_LOJA, CONFIG.raioInteracao),
    `Insufficient object spacing: ${pads[i].id}/${pads[i].tipo}, ${pads[j].id}/${pads[j].tipo}`);
}
console.log(`${pads.length} interaction targets: independent fixtures have separated ranges or a continuous wall; produce sections share a stand.`);
