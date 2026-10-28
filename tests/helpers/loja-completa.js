import assert from 'node:assert/strict';
import { prepararMelhoriasAnteriores } from './progressao.js';

// Prepara a planta completa sem consumir o saldo reservado ao recurso em teste.
export function prepararLojaCompleta(sim) {
  if (sim.estado.melhorias.laranja) return;
  prepararMelhoriasAnteriores(sim, 'laranja');
  const saldo = sim.estado.dinheiro;
  sim.estado.dinheiro += sim.custoMelhoria('laranja');
  assert.equal(sim.comprarMelhoria('laranja').sucesso, true, 'compra da seção de laranjas');
  assert.equal(sim.estado.dinheiro, saldo);
}
