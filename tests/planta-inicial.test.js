import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { PLANTA_INICIAL, PRODUTOS_HORTIFRUTI, volumesHortifruti } from '../src/jogo/planta.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';
import { Cena } from '../src/jogo/cena.js';
import { geometriaEstacao } from '../src/jogo/estacoes.js';

test('horta N1 respeita a posição posterior esquerda e o canteiro compacto da referência visual', () => {
  const svg = readFileSync(new URL('../docs/mercadinhoDoBairro.drawio.svg', import.meta.url), 'utf8');
  const modelo = svg.match(/\bcontent="([^"]*)"/)[1]
    .replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  function geometriaCelula(numero) {
    const celula = modelo.match(new RegExp(`<mxCell[^>]*id="jz9tYpKwZjYspEhf_ZnR-${numero}"[^>]*>[\\s\\S]*?<mxGeometry([^>]*)`));
    assert.ok(celula, `geometria original ${numero}`);
    return Object.fromEntries([...celula[1].matchAll(/(x|y|width|height)="([^"]*)"/g)].map(([, chave, valor]) => [chave, Number(valor)]));
  }
  const grupo = geometriaCelula(60), salao = geometriaCelula(21), horta = geometriaCelula(61);
  assert.ok(horta.y + horta.height < grupo.y + salao.y, 'referência: horta inteira atrás da parede do fundo');
  assert.ok(horta.x + horta.width < grupo.x + salao.x, 'referência: faixa posterior esquerda');
  const implementada = geometriaEstacao('tomate', 'coleta');
  assert.ok(implementada.z + implementada.d / 2 < PLANTA_INICIAL.limites.minZ, 'canteiro inteiro atrás da loja');
  assert.ok(implementada.x + implementada.w / 2 < PLANTA_INICIAL.limites.minX);
  assert.equal(implementada.d, 2.5, 'lado curto com a largura do canteiro anterior, conforme pedido');
  assert.equal(implementada.w, 3.6, 'comprimento compacto da referência visual');
  const sim = new Simulacao();
  const visual = { cena: new THREE.Scene(), sim, produtos: {}, alvosHorta: [], criarLabel() {} };
  Cena.prototype.construirEstacao.call(visual, 'tomate', PRODUTOS.tomate);
  const bounds = new THREE.Box3().setFromObject(visual.alvosHorta[0]);
  assert.ok(bounds.max.z < PLANTA_INICIAL.limites.minZ, 'modelo e alvo de clique atrás da loja');
  const h = PRODUTOS.tomate.horta;
  const meiaTerraX = (implementada.w - 0.27) / 2, meiaTerraZ = (implementada.d - 0.28) / 2;
  for (const fruto of visual.produtos.tomate.frutos) {
    assert.ok(fruto.position.z < PLANTA_INICIAL.limites.minZ);
    const volume = new THREE.Box3().setFromObject(fruto);
    assert.ok(volume.min.x > h.x - meiaTerraX && volume.max.x < h.x + meiaTerraX, 'tomate inteiro dentro da terra, sem invadir as bordas laterais');
    assert.ok(volume.min.z > h.z - meiaTerraZ && volume.max.z < h.z + meiaTerraZ, 'tomate inteiro dentro da terra, sem invadir as bordas da frente e do fundo');
  }
});

function completa() {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  sim.estado.estatisticas.clientes = 450; sim.estado.dinheiro = 40000;
  for (const id of ['milho', 'alaProducao', 'alaTrigo', 'alaPadaria', 'alaArtesanal', 'laranja', 'maca']) assert.ok(sim.comprarMelhoria(id).sucesso, id);
  return sim;
}

test('N1 usa a proporção 7 × 8, terreno quadrado e somente tomates', () => {
  const sim = new Simulacao();
  assert.equal(PLANTA_INICIAL.salao.w, 7 * PLANTA_INICIAL.escala);
  assert.equal(PLANTA_INICIAL.salao.d, 8 * PLANTA_INICIAL.escala);
  assert.equal(PLANTA_INICIAL.terreno.w, 20 * PLANTA_INICIAL.escala);
  assert.equal(PLANTA_INICIAL.terreno.d, PLANTA_INICIAL.terreno.w);
  assert.deepEqual(Object.keys(sim.estado.produtos).filter(id => sim.estado.produtos[id].liberado), ['tomate']);
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(volumesHortifruti(sim.estado.produtos).length, 1);
  assert.equal(volumesHortifruti(sim.estado.produtos)[0].d, PRODUTOS.tomate.prateleira.d);
  assert.ok(segmentoLivre(sim.estado.jogador, sim.estado.jogador, sim.obstaculos(), 0.32));
  assert.equal(segmentoLivre({ x: -4, z: 0.7 }, { x: -2, z: 0.7 }, sim.obstaculos()), false);
  assert.ok(segmentoLivre({ x: CONFIG.portaProducao.x, z: -10.2 }, { x: CONFIG.portaProducao.x, z: -8.4 }, sim.obstaculos(), 0.32));
});

test('banca cresce por compra, preserva tomates e não cria seção de produto bloqueado', () => {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 350;
  assert.equal(volumesHortifruti(sim.estado.produtos)[0].d, 2.2, 'nível sozinho não constrói');
  sim.estado.dinheiro = 40000; sim.estado.produtos.tomate.prateleira = 5;
  for (const id of ['milho', 'alaProducao', 'alaTrigo', 'alaPadaria', 'alaArtesanal', 'laranja', 'maca']) assert.ok(sim.comprarMelhoria(id).sucesso, id);
  const volumes = volumesHortifruti(sim.estado.produtos);
  assert.equal(volumes.length, 1);
  assert.ok(Math.abs(volumes[0].d - 13.2) < 1e-8);
  assert.ok(Math.abs(volumes[0].z + 1.9) < 1e-9, 'as seis seções acompanham a ordem de desbloqueio');
  assert.equal(sim.estado.produtos.tomate.prateleira, 5);
  assert.equal(sim.obstaculos().filter(o => o.movel === 'hortifruti').length, 1);
  const visual = { cena: new THREE.Scene(), sim: new Simulacao(), produtos: {}, alvosHorta: [], criarLabel() {} };
  for (const id of PRODUTOS_HORTIFRUTI) Cena.prototype.construirEstacao.call(visual, id, PRODUTOS[id]);
  assert.ok(visual.produtos.tomate.grupo.getObjectByName('secao-hortifruti'));
  for (const id of PRODUTOS_HORTIFRUTI.slice(1)) assert.equal(visual.produtos[id].grupo.visible, false);
  const bounds = new THREE.Box3().setFromObject(visual.produtos.tomate.grupo.getObjectByName('secao-hortifruti'));
  assert.ok(bounds.max.x <= PRODUTOS.tomate.prateleira.x + PRODUTOS.tomate.prateleira.w / 2 + 1e-6);
  assert.ok(bounds.min.x >= PRODUTOS.tomate.prateleira.x - PRODUTOS.tomate.prateleira.w / 2 - 1e-6);
});

test('divisórias escolhem uma única seção, inclusive com inventário misto', () => {
  const sim = completa();
  for (let i = 0; i < PRODUTOS_HORTIFRUTI.length - 1; i++) {
    const id = PRODUTOS_HORTIFRUTI[i], proximo = PRODUTOS_HORTIFRUTI[i + 1];
    const divisoria = PRODUTOS[id].prateleira.z - 1.1;
    for (const [offset, esperado] of [[0.001, id], [-0.001, proximo], [0, id]]) {
      for (const e of Object.values(sim.estado.produtos)) e.prateleira = 0;
      Object.assign(sim.estado.jogador, { x: -0.8, z: divisoria + offset, inventario: [...PRODUTOS_HORTIFRUTI] });
      sim.tempo += 1; sim.interagir();
      assert.equal(sim.estado.produtos[esperado].prateleira, 1, `${id}: offset ${offset}`);
      assert.equal(Object.values(sim.estado.produtos).reduce((total, e) => total + e.prateleira, 0), 1);
      sim.tempo += 1; sim.interagir();
      assert.equal(sim.estado.jogador.inventario.length, PRODUTOS_HORTIFRUTI.length - 1, 'não alterna ao esgotar o produto escolhido');
    }
  }
});

test('compra fora de ordem deixa a seção de milho ausente e sem colisão', () => {
  const sim = new Simulacao(); sim.estado.estatisticas.clientes = 150; sim.estado.dinheiro = 400;
  assert.ok(sim.comprarMelhoria('alaTrigo').sucesso);
  assert.equal(sim.estado.produtos.milho.liberado, false);
  assert.equal(volumesHortifruti(sim.estado.produtos).length, 2);
  Object.assign(sim.estado.jogador, PRODUTOS.milho.reposicao, { inventario: ['tomate', 'trigo'] });
  sim.tempo = 1; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['tomate', 'trigo']);
});

test('save V3 migra uma vez, preserva estoques e cargas e recupera os dois atores', () => {
  const sim = completa(); sim.estado.melhorias.ajudante = 1;
  sim.estado.produtos.tomate.prateleira = 7;
  sim.estado.jogador.inventario = ['tomate', 'milho'];
  Object.assign(sim.ajudante, { produto: 'milho', destino: 'prateleira', inventario: ['milho'] });
  const salvo = structuredClone(sim.estado); salvo.versaoLayout = 3;
  Object.assign(salvo.jogador, { x: -3.1, z: 0.7 });
  const migrado = new Simulacao(salvo);
  assert.equal(migrado.estado.versaoLayout, CONFIG.versaoLayout);
  assert.equal(migrado.estado.dinheiro, sim.estado.dinheiro);
  assert.equal(migrado.estado.produtos.tomate.prateleira, 7);
  assert.deepEqual(migrado.estado.jogador.inventario, ['tomate', 'milho']);
  assert.deepEqual(migrado.ajudante.inventario, ['milho']);
  for (const ator of [migrado.estado.jogador, migrado.ajudante]) assert.ok(segmentoLivre(ator, ator, migrado.obstaculos(), 0.32));
  const retomado = new Simulacao(structuredClone(migrado.estado));
  assert.deepEqual(retomado.estado, migrado.estado);
});

test('save V4 da horta lateral migra sem perder cargas e não reaplica a recuperação', () => {
  const sim = new Simulacao();
  sim.estado.versaoLayout = 4;
  Object.assign(sim.estado.jogador, { x: -7.4, z: -1.7, inventario: ['tomate', 'tomate'] });
  sim.estado.produtos.tomate.horta = 3; sim.estado.produtos.tomate.prateleira = 6;
  const migrado = new Simulacao(structuredClone(sim.estado));
  assert.equal(migrado.estado.versaoLayout, CONFIG.versaoLayout);
  assert.deepEqual(migrado.estado.jogador.inventario, ['tomate', 'tomate']);
  assert.equal(migrado.estado.produtos.tomate.horta, 3);
  assert.equal(migrado.estado.produtos.tomate.prateleira, 6);
  assert.deepEqual({ x: migrado.estado.jogador.x, z: migrado.estado.jogador.z }, CONFIG.inicio);
  assert.deepEqual(new Simulacao(structuredClone(migrado.estado)).estado, migrado.estado);
});

test('N1 completa colheita, reposição e pagamento manual sem dinheiro artificial', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  function ir(alvo) {
    let chegou = false;
    for (let i = 0; i < 1800 && !chegou; i++) {
      chegou = sim.caminharCliente(sim.estado.jogador, alvo, 0.05, sim.velocidade);
      sim.atualizar(0.05);
    }
    assert.ok(chegou, `jogador alcança ${JSON.stringify(alvo)}`);
  }
  ir(PRODUTOS.tomate.coleta);
  for (let i = 0; i < 30; i++) sim.atualizar(0.05);
  assert.equal(sim.estado.jogador.inventario.length, 4);
  ir(PRODUTOS.tomate.reposicao);
  for (let i = 0; i < 30; i++) sim.atualizar(0.05);
  assert.equal(sim.estado.produtos.tomate.prateleira, 4);
  ir(CONFIG.cadeiraCaixa);
  assert.ok(sim.estado.jogador.sentadoCaixa);
  sim.aleatorio = () => 0; sim.criarCliente();
  for (let i = 0; i < 1800 && sim.estado.estatisticas.clientes === 0; i++) sim.atualizar(0.05);
  assert.equal(sim.estado.estatisticas.clientes, 1);
  assert.ok(sim.estado.dinheiro > 0);
  assert.equal(sim.estado.dinheiro, sim.estado.estatisticas.faturamento);
  for (let i = 0; i < 600 && sim.clientes.length; i++) sim.atualizar(0.05);
  assert.equal(sim.clientes.length, 0);
  assert.equal(sim.cestasDisponiveis, 5);
});
