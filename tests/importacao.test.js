import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG, MELHORIAS, PRODUTOS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { Cena } from '../src/jogo/cena.js';

function abrir(nivel = 19, dinheiro = 2000) {
  const sim = new Simulacao();
  sim.proximoCliente = Infinity;
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = dinheiro;
  return sim;
}

test('importação exige nível 19, gôndola e R$ 270', () => {
  const opcao = MELHORIAS.find(melhoria => melhoria.id === 'importarProdutos');
  assert.equal(opcao.categoria, 'importados');
  assert.equal(opcao.titulo, 'Enlatados');
  const bloqueado = abrir(18);
  assert.match(bloqueado.comprarMelhoria('importarProdutos').motivo, /nível 19/);

  const sim = abrir();
  assert.match(sim.comprarMelhoria('importarProdutos').motivo, /Prateleiras de importados/);
  sim.comprarMelhoria('prateleirasImportados');
  assert.match(sim.comprarMelhoria('importarProdutos').motivo, /Expansão/);
  sim.estado.melhorias.expansao = 1;
  sim.estado.dinheiro = 269;
  assert.equal(sim.comprarMelhoria('importarProdutos').sucesso, false);
  assert.equal(sim.estado.produtos.enlatado.prateleira, 0);
});

test('cada caixa encomenda 9 enlatados vendidos por R$ 30, sem estoque instantâneo', () => {
  const sim = abrir();
  sim.comprarMelhoria('prateleirasImportados');
  sim.estado.melhorias.expansao = 1; sim.estado.melhorias.estacionamento = 1;
  const saldo = sim.estado.dinheiro;

  assert.equal(sim.comprarMelhoria('importarProdutos').sucesso, true);
  assert.equal(sim.estado.dinheiro, saldo - 270);
  assert.equal(sim.estado.produtos.enlatado.prateleira, 0);
  assert.equal(sim.estado.produtos.enlatado.horta, 0);
  assert.equal(sim.estado.deposito.pedidos[0].pacotes.length, 1);
  assert.equal(sim.estado.produtos.enlatado.liberado, true);
  assert.equal(sim.estado.produtos.enlatado.apresentado, false);
  assert.equal(PRODUTOS.enlatado.preco, 30);

  sim.comprarMelhoria('importarProdutos');
  assert.equal(sim.estado.deposito.pedidos.length, 2);
});

test('saves antigos preservam enlatados na gôndola e recebem depósito vazio', () => {
  const sim = abrir(19, 5000);
  sim.comprarMelhoria('prateleirasImportados');
  sim.estado.melhorias.importarProdutos = 4;
  Object.assign(sim.estado.produtos.enlatado, { liberado: true, apresentado: true, prateleira: 36 });
  delete sim.estado.deposito;

  const restaurado = new Simulacao(structuredClone(sim.estado));
  assert.equal(restaurado.estado.produtos.enlatado.prateleira, 36);
  assert.equal(restaurado.estado.melhorias.importarProdutos, 4);
  assert.deepEqual(restaurado.estado.deposito.pacotes, []);
  assert.deepEqual(restaurado.estado.deposito.pedidos, []);
});

test('gôndola cheia mostra três latas de cada caixa na prateleira superior', () => {
  const visual = { cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  Cena.prototype.construirImportado.call(visual, 'enlatado', PRODUTOS.enlatado);
  const latas = visual.produtos.enlatado.frutas;

  assert.equal(latas.length, 12);
  assert.equal(new Set(latas.map(lata => lata.position.y)).size, 1);
  const cores = latas.map(lata => lata.children[0].material.color.getHex());
  assert.equal(new Set(cores).size, 4);
  for (const cor of new Set(cores)) {
    assert.equal(cores.filter(item => item === cor).length, 3);
  }
  const azuisInferiores = visual.produtos.enlatado.decoracoes;
  assert.equal(azuisInferiores.length, 9);
  assert.equal(new Set(azuisInferiores.map(lata => lata.position.y)).size, 3);
  assert.equal(new Set(azuisInferiores.map(lata => lata.children[0].material.color.getHex())).size, 1);
});
