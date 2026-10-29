import { prepararMelhoriasAnteriores } from './helpers/progressao.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, MELHORIAS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { gondolaInstalada } from '../src/jogo/classes-produtos.js';
import { PRATELEIRAS_IMPORTADOS } from '../src/jogo/planta.js';
import { prepararLojaCompleta } from './helpers/loja-completa.js';

function loja(nivel = 22) {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 100000;
  prepararLojaCompleta(sim);
  prepararMelhoriasAnteriores(sim, 'prateleiraBiscoitosEnlatados');
  return sim;
}
const pares = [
  { id: 'prateleiraBiscoitosEnlatados', nivel: 21, pedidos: ['importarDoces', 'importarProdutos'], produtos: ['guloseima', 'enlatado'] },
  { id: 'prateleiraMantimentosCereais', nivel: 22, pedidos: ['importarMantimentos', 'importarCereais'], produtos: ['mantimento', 'cereal'] }
];
for (const [indice, par] of pares.entries()) {
  test(`${par.id} exige nível e compra para importar as duas categorias`, () => {
    const sim = loja(par.nivel - 1);
    assert.equal(sim.comprarMelhoria(par.id).sucesso, false);
    sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
    for (const id of par.pedidos) assert.equal(sim.disponibilidadeMelhoria(id).requisitoMelhoria, par.id);
    prepararMelhoriasAnteriores(sim, par.id);
    sim.estado.dinheiro = 999;
    assert.equal(sim.comprarMelhoria(par.id).sucesso, false);
    sim.estado.dinheiro = 10000;
    assert.equal(sim.comprarMelhoria(par.id).sucesso, true);
    assert.equal(sim.estado.dinheiro, 9000);
    assert.equal(gondolaInstalada(sim.estado.melhorias, indice), true);
    assert.equal(gondolaInstalada(sim.estado.melhorias, 1 - indice), indice === 1);
    assert.equal(sim.comprarMelhoria(par.id).sucesso, false);
    for (const id of par.pedidos) assert.equal(sim.disponibilidadeMelhoria(id).disponivel, true, id);
    for (const id of par.produtos) assert.equal(sim.estado.produtos[id].horta, 0);
    const pedido = Object.fromEntries(par.pedidos.map(id => [id, 1]));
    assert.equal(sim.encomendarImportacoes(pedido).sucesso, true);
    const restaurado = new Simulacao(sim.estado);
    assert.equal(restaurado.estado.melhorias[par.id], 1);
    assert.equal(gondolaInstalada(restaurado.estado.melhorias, 1 - indice), indice === 1);
    assert.equal(restaurado.obstaculos().includes(PRATELEIRAS_IMPORTADOS[indice]), true);
    assert.equal(restaurado.obstaculos().includes(PRATELEIRAS_IMPORTADOS[1 - indice]), indice === 1);
    assert.deepEqual(restaurado.estado.deposito.pedidos[0].pacotes.sort(), [...par.produtos].sort());
    for (const id of par.produtos) assert.equal(restaurado.estado.produtos[id].liberado, true);
  });
}
test('gôndolas exigem expansão e a primeira não habilita importações da segunda', () => {
  const sim = loja(21);
  sim.estado.melhorias.expansao = 0;
  assert.equal(sim.disponibilidadeMelhoria(pares[0].id).requisitoMelhoria, 'expansao');
  sim.estado.melhorias.expansao = 1;
  assert.equal(sim.comprarMelhoria(pares[0].id).sucesso, true);
  for (const id of pares[1].pedidos) assert.equal(sim.comprarMelhoria(id).sucesso, false);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  for (const id of pares[1].pedidos) assert.equal(sim.disponibilidadeMelhoria(id).requisitoMelhoria, pares[1].id);
  assert.equal(MELHORIAS.filter(m => m.ativa !== false && m.tipo === 'mobiliario' && m.id.startsWith('prateleira')).length, 2);
});
test('compra antiga das duas gôndolas migra sem cobrar novamente', () => {
  const sim = loja(20);
  sim.estado.melhorias.prateleirasImportados = 2;
  const saldo = sim.estado.dinheiro;
  const restaurado = new Simulacao(sim.estado);
  for (const par of pares) assert.equal(restaurado.estado.melhorias[par.id], 1);
  assert.equal(restaurado.estado.dinheiro, saldo);
  const recarregado = new Simulacao(restaurado.estado);
  for (const par of pares) assert.equal(recarregado.estado.melhorias[par.id], 1);
});
