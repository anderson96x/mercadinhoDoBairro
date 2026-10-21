import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, MELHORIAS, PRODUTOS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';

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
  sim.estado.dinheiro = 269;
  assert.equal(sim.comprarMelhoria('importarProdutos').sucesso, false);
  assert.equal(sim.estado.produtos.enlatado.prateleira, 0);
});

test('cada caixa adiciona 9 enlatados vendidos por R$ 30', () => {
  const sim = abrir();
  sim.comprarMelhoria('prateleirasImportados');
  const saldo = sim.estado.dinheiro;

  assert.equal(sim.comprarMelhoria('importarProdutos').sucesso, true);
  assert.equal(sim.estado.dinheiro, saldo - 270);
  assert.equal(sim.estado.produtos.enlatado.prateleira, 9);
  assert.equal(sim.estado.produtos.enlatado.liberado, true);
  assert.equal(sim.estado.produtos.enlatado.apresentado, true);
  assert.equal(PRODUTOS.enlatado.preco, 30);

  sim.comprarMelhoria('importarProdutos');
  assert.equal(sim.estado.produtos.enlatado.prateleira, 18);
});

test('gôndola comporta quatro caixas e preserva o estoque ao recarregar', () => {
  const sim = abrir(19, 5000);
  sim.comprarMelhoria('prateleirasImportados');
  for (let i = 0; i < 4; i++) assert.equal(sim.comprarMelhoria('importarProdutos').sucesso, true);
  assert.equal(sim.estado.produtos.enlatado.prateleira, 36);
  assert.match(sim.comprarMelhoria('importarProdutos').motivo, /espaço/);

  const restaurado = new Simulacao(structuredClone(sim.estado));
  assert.equal(restaurado.estado.produtos.enlatado.prateleira, 36);
  assert.equal(restaurado.estado.melhorias.importarProdutos, 4);
});
