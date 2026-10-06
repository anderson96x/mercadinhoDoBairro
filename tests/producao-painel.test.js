import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial } from '../src/jogo/simulacao.js';
import { resumoProducao } from '../src/interface/producao.js';

test('painel exibe somente oficinas liberadas e identifica os ingredientes faltantes', () => {
  const estado = estadoInicial();
  assert.deepEqual(resumoProducao(estado), []);
  estado.produtos.geleia.liberado = true;
  estado.oficinas.geleia.ingredientes.mel = 4;
  const [cozinha] = resumoProducao(estado);
  assert.equal(cozinha.nome, 'Cozinha de geleias');
  assert.equal(cozinha.status, 'Aguardando morango');
  assert.equal(cozinha.produzindo, false);
  assert.deepEqual(cozinha.ingredientes, [
    { id: 'morango', quantidade: 2, disponivel: 0 },
    { id: 'mel', quantidade: 1, disponivel: 4 }
  ]);
});

test('painel acompanha progresso e saída cheia sem alterar a produção', () => {
  const estado = estadoInicial();
  estado.produtos.geleia.liberado = true;
  Object.assign(estado.oficinas.geleia, { ingredientes: { morango: 4, mel: 2 }, progresso: 3 });
  let cozinha = resumoProducao(estado)[0];
  assert.equal(cozinha.progresso, 50);
  assert.equal(cozinha.status, 'Produzindo');
  assert.equal(cozinha.rendimento, 3);
  estado.produtos.geleia.horta = 7;
  const anterior = structuredClone(estado);
  cozinha = resumoProducao(estado)[0];
  assert.equal(cozinha.prontos, 7);
  assert.equal(cozinha.status, 'Recolha os produtos para continuar');
  assert.equal(cozinha.produzindo, false);
  assert.equal(cozinha.progresso, 50);
  assert.deepEqual(estado, anterior);
});
