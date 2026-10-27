import test from 'node:test';
import { prepararLojaCompleta } from './helpers/loja-completa.js';
import assert from 'node:assert/strict';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { PAREDES_LOJA } from '../src/jogo/bairro.js';
import { Simulacao, pontoFila } from '../src/jogo/simulacao.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

test('N7 mantém paredes iniciais e canteiros iguais, com trigo atrás do milho', () => {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 150; sim.estado.dinheiro = 400;
  prepararLojaCompleta(sim);
  assert.equal(sim.estado.produtos.trigo.liberado, false);
  assert.ok(sim.comprarMelhoria('alaTrigo').sucesso);
  assert.equal(sim.estado.produtos.milho.liberado, false);
  for (const p of PAREDES_LOJA) assert.ok(sim.obstaculos().some(o => o.x === p.x && o.z === p.z && o.w === p.w && o.d === p.d));
  for (const id of ['milho', 'trigo', 'morango']) assert.deepEqual(PRODUTOS[id].canteiro, PRODUTOS.tomate.canteiro);
  assert.equal(PRODUTOS.trigo.horta.x, PRODUTOS.milho.horta.x);
  assert.ok(PRODUTOS.trigo.horta.z + PRODUTOS.trigo.canteiro.d / 2 < PRODUTOS.milho.horta.z - PRODUTOS.milho.canteiro.d / 2);
  Object.assign(sim.estado.jogador, { ...PRODUTOS.trigo.reposicao, inventario: ['tomate', 'trigo'] });
  sim.tempo = 10; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['tomate']);
  assert.equal(sim.estado.produtos.trigo.prateleira, 1);
});

test('save V8 preserva trigo e cargas ao recuperar atores da antiga expansão N7', () => {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 150; sim.estado.dinheiro = 1300;
  sim.comprarMelhoria('alaTrigo'); sim.comprarMelhoria('ajudante');
  sim.estado.versaoLayout = 8;
  Object.assign(sim.estado.produtos.trigo, { horta: 3, prateleira: 5, apresentado: true });
  Object.assign(sim.estado.jogador, { x: 10.9, z: -1.3, inventario: ['trigo'] });
  Object.assign(sim.ajudante, { x: 10.9, z: -1.3, inventario: ['trigo'], produto: 'trigo', destino: 'prateleira' });
  const migrado = new Simulacao(structuredClone(sim.estado));
  assert.equal(migrado.estado.versaoLayout, CONFIG.versaoLayout);
  assert.deepEqual(migrado.estado.produtos.trigo, sim.estado.produtos.trigo);
  assert.equal(migrado.estado.dinheiro, sim.estado.dinheiro);
  for (const ator of [migrado.estado.jogador, migrado.ajudante]) {
    assert.deepEqual(ator.inventario, ['trigo']);
    assert.ok(segmentoLivre(ator, ator, migrado.obstaculos(), 0.32));
  }
  assert.deepEqual(new Simulacao(structuredClone(migrado.estado)).estado, migrado.estado);
});

test('dez posições de fila cabem e são alcançáveis no salão antes do N9', () => {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 6 * CONFIG.clientesPorNivel;
  prepararLojaCompleta(sim);
  for (let i = 0; i < 10; i++) {
    const alvo = pontoFila(i), ator = { ...CONFIG.inicio };
    assert.ok(alvo.x < 10.9 - 0.5 && alvo.z < 6.7 - 0.5);
    let chegou = false;
    for (let tick = 0; tick < 2400 && !chegou; tick++) chegou = sim.caminharCliente(ator, alvo, 0.05);
    assert.ok(chegou, 'posição ' + i);
  }
});
