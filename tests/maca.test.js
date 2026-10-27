import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';

function abrir() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 18 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 10000;
  sim.proximoCliente = Infinity;
  assert.ok(sim.comprarMelhoria('laranja').sucesso);
  assert.ok(sim.comprarMelhoria('maca').sucesso);
  return sim;
}

test('macieira exige nível 19 e R$ 800, com compra única', () => {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 17 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 800;
  assert.equal(sim.comprarMelhoria('maca').sucesso, false);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 799;
  assert.equal(sim.comprarMelhoria('maca').sucesso, false);
  sim.estado.dinheiro = 800;
  assert.ok(sim.comprarMelhoria('maca').sucesso);
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(sim.comprarMelhoria('maca').sucesso, false);
});

test('maçãs crescem com limite, pausam e abastecem a seção sem alterar laranjas', () => {
  const sim = abrir(), estoque = sim.estado.produtos.maca;
  estoque.horta = 0;
  sim.pausado = true; sim.atualizar(3);
  assert.equal(estoque.horta, 0);
  sim.pausado = false;
  for (let i = 0; i < 500; i++) sim.atualizar(0.1);
  assert.equal(estoque.horta, 8);
  Object.assign(sim.estado.jogador, PRODUTOS.maca.coleta);
  sim.tempo += 1; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['maca']);
  Object.assign(sim.estado.jogador, PRODUTOS.maca.reposicao);
  sim.tempo += 1; sim.interagir();
  assert.equal(estoque.prateleira, 1);
  assert.equal(estoque.apresentado, true);
  assert.equal(sim.estado.produtos.laranja.prateleira, 0);
  assert.equal(sim.estado.produtos.laranja.horta, 8);
});

test('repositor colhe maçãs e abastece o hortifruti com as duas árvores abertas', () => {
  const sim = abrir();
  assert.ok(sim.comprarMelhoria('ajudante').sucesso);
  sim.estado.produtos.tomate.prateleira = 12;
  sim.estado.produtos.laranja.prateleira = 12;
  for (let i = 0; i < 6000 && sim.estado.produtos.maca.prateleira < 8; i++) {
    sim.tempo += 0.05; sim.atualizarAjudante(0.05);
  }
  assert.equal(sim.estado.produtos.maca.prateleira, 8);
});

test('maçã entra nos pedidos após abastecimento e rende R$ 7 no caixa', () => {
  const sim = abrir(); sim.aleatorio = () => 0;
  for (let i = 0; i < 20; i++) {
    sim.clientes = []; sim.criarCliente();
    assert.ok(sim.clientes[0].compras.every(c => c.produto !== 'maca'));
  }
  sim.estado.produtos.maca.prateleira = 12;
  assert.ok(sim.comprarMelhoria('caixa').sucesso);
  let cliente;
  for (let i = 0; i < 30; i++) {
    sim.clientes = []; sim.criarCliente();
    if (sim.clientes[0].compras[0].produto === 'maca') { cliente = sim.clientes[0]; break; }
  }
  assert.ok(cliente);
  for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
    sim.tempo += 0.05; sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
  }
  assert.equal(cliente.fase, 'fim');
  assert.equal(sim.estado.estatisticas.faturamento, 7);
});

test('recarga preserva maçãs e save anterior recebe macieira bloqueada', () => {
  const sim = abrir();
  Object.assign(sim.estado.produtos.maca, { horta: 3, prateleira: 5, crescimento: 1.5, apresentado: true });
  const salvo = structuredClone(sim.estado);
  const retomado = new Simulacao(salvo);
  assert.equal(retomado.estado.melhorias.maca, 1);
  assert.deepEqual(retomado.estado.produtos.maca, sim.estado.produtos.maca);
  delete salvo.melhorias.maca; delete salvo.produtos.maca;
  const antigo = new Simulacao(salvo);
  assert.equal(antigo.estado.produtos.maca.liberado, false);
  assert.equal(antigo.estado.dinheiro, sim.estado.dinheiro);
  assert.equal(antigo.estado.melhorias.laranja, 1);
});
