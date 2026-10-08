import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial } from '../src/jogo/simulacao.js';
import { ALA_PADARIA, PRODUTOS } from '../src/jogo/configuracao.js';
import { atualizarPainelProducao, resumoProducao } from '../src/interface/producao.js';

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

test('painel aparece somente junto à oficina em uso', () => {
  const estado = estadoInicial();
  estado.produtos.queijo.liberado = true;
  estado.produtos.geleia.liberado = true;
  const resumo = { textContent: '' }, lista = { innerHTML: '' };
  const painel = { hidden: true, dataset: {}, querySelector: seletor =>
    seletor === '#producao-resumo' ? resumo : lista };

  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, true);

  Object.assign(estado.jogador, PRODUTOS.queijo.coleta);
  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, false);
  assert.match(lista.innerHTML, /Queijaria/);
  assert.doesNotMatch(lista.innerHTML, /Cozinha de geleias/);

  Object.assign(estado.jogador, PRODUTOS.morango.coleta);
  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, true);

  Object.assign(estado.jogador, PRODUTOS.geleia.coleta);
  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, false);
  assert.match(lista.innerHTML, /Cozinha de geleias/);
  assert.doesNotMatch(lista.innerHTML, /Queijaria/);
});

test('cartão da padaria acompanha trigo, farinha, forno e vitrine', () => {
  const estado = estadoInicial();
  assert.deepEqual(resumoProducao(estado), []);
  estado.melhorias.alaPadaria = 1;
  let padaria = resumoProducao(estado)[0];
  assert.equal(padaria.nome, 'Padaria');
  assert.equal(padaria.status, 'Aguardando trigo');
  assert.equal(padaria.prontos, 0);

  estado.producao.trigoPadaria = 2;
  estado.producao.progressoMoagem = ALA_PADARIA.tempoMoagem / 2;
  padaria = resumoProducao(estado)[0];
  assert.equal(padaria.status, 'Moendo trigo');
  assert.equal(padaria.progresso, 50);
  assert.deepEqual(padaria.ingredientes.map(item => item.disponivel), [2, 0]);

  estado.producao.farinha = 1;
  estado.producao.progressoForno = ALA_PADARIA.tempoForno / 2;
  padaria = resumoProducao(estado)[0];
  assert.equal(padaria.status, 'Assando pães');
  assert.equal(padaria.progresso, 50);

  estado.produtos.pao.prateleira = PRODUTOS.pao.capacidadePrateleira;
  padaria = resumoProducao(estado)[0];
  assert.equal(padaria.status, 'Vitrine cheia');
  assert.equal(padaria.progresso, 0);
  assert.equal(padaria.prontos, 18);
});

test('cartão da padaria aparece junto à entrega, forno ou vitrine e some ao sair', () => {
  const estado = estadoInicial();
  estado.melhorias.alaPadaria = 1;
  const resumo = { textContent: '' }, lista = { innerHTML: '' };
  const painel = { hidden: true, dataset: {}, querySelector: seletor =>
    seletor === '#producao-resumo' ? resumo : lista };

  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, true);

  Object.assign(estado.jogador, PRODUTOS.pao.reposicao);
  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, false);
  assert.match(lista.innerHTML, /Padaria/);
  assert.match(lista.innerHTML, /Farinha/);
  assert.equal(resumo.textContent, '0 pães');

  Object.assign(estado.jogador, { x: ALA_PADARIA.forno.x + 0.8, z: ALA_PADARIA.forno.z });
  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, false);

  Object.assign(estado.jogador, PRODUTOS.pao.cliente);
  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, false);

  Object.assign(estado.jogador, PRODUTOS.trigo.coleta);
  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, true);
});
