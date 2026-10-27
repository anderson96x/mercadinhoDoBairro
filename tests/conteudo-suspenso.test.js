import test from 'node:test';
import assert from 'node:assert/strict';
import { MELHORIAS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';

test('compra genérica antiga não aparece no catálogo ativo', () => {
  assert.equal(MELHORIAS.find(m => m.id === 'prateleirasImportados').ativa, false);
  assert.equal(new Simulacao().comprarMelhoria('prateleirasImportados').sucesso, false);
});
