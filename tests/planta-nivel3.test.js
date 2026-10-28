import { prepararMelhoriasAnteriores } from './helpers/progressao.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { PLANTA_INICIAL, volumesHortifruti } from '../src/jogo/planta.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { Cena } from '../src/jogo/cena.js';
import { geometriaEstacao, intervaloEstacoes } from '../src/jogo/estacoes.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function nivel3() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 2 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 350;
  prepararMelhoriasAnteriores(sim, 'milho');
  sim.proximoCliente = Infinity;
  return sim;
}

test('N3 segue o desenho original: milho alinhado e atrás do tomate, ambos atrás da loja', () => {
  const svg = readFileSync(new URL('../docs/mercadinhoDoBairro.drawio.svg', import.meta.url), 'utf8');
  const modelo = svg.match(/\bcontent="([^"]*)"/)[1]
    .replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  function geometria(numero) {
    const celula = modelo.match(new RegExp(`<mxCell[^>]*id="jz9tYpKwZjYspEhf_ZnR-${numero}"[^>]*>[\\s\\S]*?<mxGeometry([^>]*)`));
    assert.ok(celula, `referência original ${numero}`);
    return Object.fromEntries([...celula[1].matchAll(/(x|y|width|height)="([^"]*)"/g)].map(([, k, v]) => [k, Number(v)]));
  }
  const grupo = geometria(67), salao = geometria(68), tomate = geometria(78), milho = geometria(79);
  assert.equal(milho.x, tomate.x);
  assert.ok(milho.y + milho.height < tomate.y);
  for (const horta of [tomate, milho]) assert.ok(horta.y + horta.height < grupo.y + salao.y);

  const t = geometriaEstacao('tomate', 'coleta'), m = geometriaEstacao('milho', 'coleta');
  assert.equal(m.x, t.x);
  assert.equal(m.w, t.w); assert.equal(m.d, t.d);
  assert.ok(m.z + m.d / 2 < t.z - t.d / 2);
  for (const horta of [t, m]) assert.ok(horta.z + horta.d / 2 < PLANTA_INICIAL.limites.minZ);
  assert.ok(intervaloEstacoes(t, m) > CONFIG.raioInteracao * 2, 'coletas independentes');
  assert.ok(intervaloEstacoes(m, geometriaEstacao('trigo', 'coleta')) > CONFIG.raioInteracao * 2, 'reserva do trigo não invade o milho');
});

test('milho exige N3 e R$ 350, acrescenta somente sua seção e mantém o salão inicial', () => {
  const sim = nivel3();
  sim.estado.estatisticas.clientes = CONFIG.clientesPorNivel;
  assert.equal(sim.comprarMelhoria('milho').sucesso, false);
  sim.estado.estatisticas.clientes = 2 * CONFIG.clientesPorNivel;
  assert.equal(sim.estado.produtos.milho.liberado, false, 'atingir o nível não constrói');
  assert.equal(volumesHortifruti(sim.estado.produtos)[0].d, 2.2);
  sim.estado.dinheiro = 349;
  assert.equal(sim.comprarMelhoria('milho').sucesso, false);
  sim.estado.dinheiro = 350; sim.estado.produtos.tomate.prateleira = 3;
  assert.ok(sim.comprarMelhoria('milho').sucesso);
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(sim.estado.estagioLoja, 0);
  assert.deepEqual(Object.keys(PRODUTOS).filter(id => sim.estado.produtos[id].liberado), ['tomate', 'milho']);
  assert.equal(sim.estado.produtos.tomate.prateleira, 3);
  assert.equal(sim.estado.produtos.milho.horta, 8);
  assert.equal(sim.estado.produtos.milho.prateleira, 0);
  assert.equal(volumesHortifruti(sim.estado.produtos).length, 1);
  assert.equal(volumesHortifruti(sim.estado.produtos)[0].d, 4.4);
  assert.equal(sim.comprarMelhoria('milho').sucesso, false, 'compra única');
});

test('modelo N3 contém oito espigas dentro do canteiro, alvos atrás da loja e somente duas seções', () => {
  const sim = nivel3(); sim.comprarMelhoria('milho');
  const visual = { cena: new THREE.Scene(), sim, produtos: {}, alvosHorta: [], criarLabel() {} };
  for (const id of ['tomate', 'milho', 'trigo', 'morango']) Cena.prototype.construirEstacao.call(visual, id, PRODUTOS[id]);
  assert.equal(visual.produtos.milho.grupo.visible, true);
  assert.equal(visual.produtos.trigo.grupo.visible, false);
  assert.equal(visual.produtos.morango.grupo.visible, false);
  const alvo = visual.alvosHorta.find(a => a.userData.produtoHorta === 'milho');
  assert.ok(new THREE.Box3().setFromObject(alvo).max.z < PLANTA_INICIAL.limites.minZ);
  const { horta, canteiro } = PRODUTOS.milho, frutos = visual.produtos.milho.frutos;
  assert.equal(frutos.length, 8);
  assert.equal(new Set(frutos.map(f => f.position.x)).size, 4);
  assert.equal(new Set(frutos.map(f => f.position.z)).size, 2);
  for (const fruto of frutos) {
    const b = new THREE.Box3().setFromObject(fruto);
    assert.ok(b.min.x > horta.x - (canteiro.w - 0.27) / 2 && b.max.x < horta.x + (canteiro.w - 0.27) / 2);
    assert.ok(b.min.z > horta.z - (canteiro.d - 0.28) / 2 && b.max.z < horta.z + (canteiro.d - 0.28) / 2);
  }
});

test('N3 percorre a porta posterior, colhe as duas hortas, repõe e vende milho por R$ 10', () => {
  const sim = nivel3(); sim.comprarMelhoria('milho');
  function ir(alvo) {
    let chegou = false;
    for (let i = 0; i < 2400 && !chegou; i++) {
      chegou = sim.caminharCliente(sim.estado.jogador, alvo, 0.05, sim.velocidade);
      sim.atualizar(0.05);
    }
    assert.ok(chegou, `rota até ${JSON.stringify(alvo)}`);
  }
  function esperar() { for (let i = 0; i < 30; i++) sim.atualizar(0.05); }
  ir({ x: CONFIG.portaProducao.x, z: CONFIG.portaProducao.z - 1.1 });
  ir({ x: -5.8, z: PRODUTOS.milho.coleta.z });
  ir(PRODUTOS.milho.coleta); esperar();
  assert.deepEqual(sim.estado.jogador.inventario, Array(4).fill('milho'));
  ir(PRODUTOS.milho.reposicao); esperar();
  assert.equal(sim.estado.produtos.milho.prateleira, 4);
  assert.equal(sim.estado.produtos.tomate.prateleira, 0);
  ir(PRODUTOS.tomate.coleta); esperar();
  assert.deepEqual(sim.estado.jogador.inventario, Array(4).fill('tomate'));
  ir(PRODUTOS.tomate.reposicao); esperar();
  assert.equal(sim.estado.produtos.tomate.prateleira, 4);
  ir(CONFIG.cadeiraCaixa);
  assert.equal(sim.estado.melhorias.caixa, 1);
  sim.aleatorio = () => 0;
  for (let venda = 0; venda < 2; venda++) {
    assert.ok(sim.criarCliente());
    for (let i = 0; i < 1800 && sim.estado.estatisticas.clientes < 51 + venda; i++) sim.atualizar(0.05);
    assert.equal(sim.estado.estatisticas.clientes, 51 + venda);
    for (let i = 0; i < 600 && sim.clientes.length; i++) sim.atualizar(0.05);
    assert.equal(sim.clientes.length, 0);
    assert.equal(sim.cestasDisponiveis, 5);
  }
  assert.equal(sim.estado.dinheiro, 15, 'uma venda de tomate e uma de milho');
  assert.equal(sim.estado.estatisticas.faturamento, 15);
  assert.equal(sim.estado.produtos.tomate.prateleira, 3);
  assert.equal(sim.estado.produtos.milho.prateleira, 3);
});

test('save V5 preserva milho comprado, dinheiro e cargas ao migrar da antiga horta lateral', () => {
  const sim = nivel3(); sim.comprarMelhoria('milho');
  sim.estado.versaoLayout = 5;
  sim.estado.dinheiro = 123;
  sim.estado.produtos.milho.horta = 3; sim.estado.produtos.milho.prateleira = 5;
  Object.assign(sim.estado.jogador, { x: -7.4, z: 3.4, inventario: ['milho', 'tomate'] });
  sim.estado.melhorias.ajudante = 1;
  Object.assign(sim.ajudante, { x: -7.4, z: 3.4, produto: 'milho', destino: 'prateleira', inventario: ['milho'] });
  const migrado = new Simulacao(structuredClone(sim.estado));
  assert.equal(migrado.estado.versaoLayout, CONFIG.versaoLayout);
  assert.equal(migrado.estado.melhorias.milho, 1);
  assert.equal(migrado.estado.dinheiro, 123);
  assert.equal(migrado.estado.produtos.milho.horta, 3);
  assert.equal(migrado.estado.produtos.milho.prateleira, 5);
  assert.deepEqual(migrado.estado.jogador.inventario, ['milho', 'tomate']);
  assert.deepEqual(migrado.ajudante.inventario, ['milho']);
  assert.equal(migrado.ajudante.x, PRODUTOS.milho.coleta.x);
  assert.equal(migrado.ajudante.z, PRODUTOS.milho.coleta.z);
  for (const ator of [migrado.estado.jogador, migrado.ajudante]) assert.ok(segmentoLivre(ator, ator, migrado.obstaculos(), 0.32));
  assert.deepEqual(new Simulacao(structuredClone(migrado.estado)).estado, migrado.estado);
});
