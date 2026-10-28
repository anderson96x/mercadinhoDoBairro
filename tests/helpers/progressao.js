import assert from 'node:assert/strict';
import { SEQUENCIA_MELHORIAS } from '../../src/jogo/configuracao.js';

// Compra os pré-requisitos na ordem real, sem consumir o orçamento do recurso em teste.
export function prepararMelhoriasAnteriores(sim, id) {
  const saldo = sim.estado.dinheiro;
  const indice = SEQUENCIA_MELHORIAS.indexOf(id);
  try {
    sim.estado.dinheiro = 100000;
    for (const anterior of SEQUENCIA_MELHORIAS.slice(0, Math.max(0, indice))) {
      if (!sim.estado.melhorias[anterior]) {
        assert.equal(sim.comprarMelhoria(anterior).sucesso, true, `pré-requisito ${anterior} de ${id}`);
      }
    }
  } finally {
    sim.estado.dinheiro = saldo;
  }
}
