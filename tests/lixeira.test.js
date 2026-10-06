import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';

function juntoDaLixeira() {
  const sim = new Simulacao();
  Object.assign(sim.estado.jogador, { x: CONFIG.lixeira.x, z: CONFIG.lixeira.z + 0.8, andando: false, inventario: ['tomate', 'milho', 'tomate'] });
  return sim;
}

test('lixeira abre ao parar, sem descartar automaticamente nem reabrir ao fechar', () => {
  const sim = juntoDaLixeira();
  sim.estado.jogador.andando = true;
  sim.interagir();
  assert.equal(sim.consumirEventos().length, 0);
  sim.estado.jogador.andando = false;
  sim.interagir();
  assert.equal(sim.consumirEventos()[0].tipo, 'lixeira');
  assert.deepEqual(sim.estado.jogador.inventario, ['tomate', 'milho', 'tomate']);
  sim.interagir();
  assert.equal(sim.consumirEventos().length, 0);
  Object.assign(sim.estado.jogador, CONFIG.inicio);
  sim.interagir();
  Object.assign(sim.estado.jogador, { x: CONFIG.lixeira.x, z: CONFIG.lixeira.z + 0.8 });
  sim.interagir();
  assert.equal(sim.consumirEventos()[0].tipo, 'lixeira');
});

test('descarta uma unidade escolhida ou toda a carga sem gerar dinheiro ou progresso', () => {
  const sim = juntoDaLixeira();
  const dinheiro = sim.estado.dinheiro;
  const estatisticas = { ...sim.estado.estatisticas };
  const produtos = structuredClone(sim.estado.produtos);
  assert.deepEqual(sim.descartarInventario('tomate'), { sucesso: true, quantidade: 1 });
  assert.deepEqual(sim.estado.jogador.inventario, ['milho', 'tomate']);
  assert.equal(sim.descartarInventario('leite').sucesso, false);
  assert.deepEqual(sim.descartarInventario(), { sucesso: true, quantidade: 2 });
  assert.deepEqual(sim.estado.jogador.inventario, []);
  assert.equal(sim.descartarInventario().sucesso, false);
  assert.equal(sim.estado.dinheiro, dinheiro);
  assert.deepEqual(sim.estado.estatisticas, estatisticas);
  assert.deepEqual(sim.estado.produtos, produtos);
});

test('não permite descarte distante ou através da parede do escritório', () => {
  const sim = juntoDaLixeira();
  Object.assign(sim.estado.jogador, CONFIG.inicio);
  assert.equal(sim.descartarInventario().sucesso, false);
  Object.assign(sim.estado.jogador, { x: 0.6, z: CONFIG.lixeira.z });
  assert.equal(sim.descartarInventario().sucesso, false);
  assert.equal(sim.estado.jogador.inventario.length, 3);
});

test('lixeira tem colisão e pode ser alcançada pelo salão', () => {
  const sim = juntoDaLixeira();
  assert.ok(sim.obstaculos().includes(CONFIG.lixeira));
  assert.ok(sim.pertoDaLixeira());
  sim.mover(sim.estado.jogador, 0, -1, 0.05, 4.3);
  sim.mover(sim.estado.jogador, 0, -1, 0.05, 4.3);
  assert.ok(sim.estado.jogador.z >= CONFIG.lixeira.z + CONFIG.lixeira.d / 2 + 0.27);
});
