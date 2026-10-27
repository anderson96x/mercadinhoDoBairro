import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, MELHORIAS, PRODUTOS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';

const SUSPENSOS = ['prateleirasImportados', 'expansao', 'importarProdutos', 'importarCereais', 'importarMantimentos', 'importarDoces'];
const importados = Object.keys(PRODUTOS).filter(id => PRODUTOS[id].origem === 'importado');

test('conteúdo dos antigos níveis 17 a 22 fica inativo inclusive depois do nível 20 e no DEV', () => {
  for (const nivel of [17, 18, 19, 20, 21, 22, 30]) {
    const sim = new Simulacao();
    sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
    sim.estado.dinheiro = 1000000;
    for (const id of SUSPENSOS) {
      assert.equal(MELHORIAS.find(m => m.id === id).ativa, false, id);
      assert.equal(sim.disponibilidadeMelhoria(id).disponivel, false, id);
      assert.equal(sim.comprarMelhoria(id).sucesso, false, id);
      assert.equal(sim.estado.melhorias[id], 0, id);
    }
    assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, false);
    sim.preencherPrateleirasDev();
    for (const id of importados) {
      assert.equal(sim.estado.produtos[id].liberado, false);
      assert.equal(sim.estado.produtos[id].prateleira, 0);
    }
    assert.equal(sim.estado.dinheiro, 1000000);
    assert.deepEqual(sim.estado.deposito.pedidos, []);
    for (const m of MELHORIAS.filter(m => m.ativa !== false)) sim.estado.melhorias[m.id] = m.max;
    assert.equal(sim.missao().titulo, 'O sabor do bairro');
  }
});

test('recarregar remove o conteúdo suspenso de partidas de desenvolvimento', () => {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 29 * CONFIG.clientesPorNivel;
  for (const id of SUSPENSOS) sim.estado.melhorias[id] = 1;
  sim.estado.melhorias.alaProducao = 1;
  sim.estado.melhorias.alaTrigo = 1;
  sim.estado.melhorias.alaPadaria = 1;
  for (const id of importados) Object.assign(sim.estado.produtos[id], { liberado: true, apresentado: true, prateleira: 36 });
  sim.estado.jogador.inventario = ['enlatado'];
  // Também não restaura o formato antigo de compras separadas de gôndolas.
  delete sim.estado.melhorias.prateleirasImportados;
  sim.estado.melhorias.prateleiraImportados1 = 1;
  sim.estado.melhorias.prateleiraImportados2 = 1;
  const restaurado = new Simulacao(sim.estado);
  for (const id of SUSPENSOS) assert.equal(restaurado.estado.melhorias[id], 0, id);
  for (const id of importados) {
    assert.equal(restaurado.estado.produtos[id].liberado, false);
    assert.equal(restaurado.estado.produtos[id].prateleira, 0);
  }
  assert.deepEqual(restaurado.estado.jogador.inventario, []);
});
