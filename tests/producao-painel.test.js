import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial } from '../src/jogo/simulacao.js';
import { ALA_PADARIA, PRODUTOS } from '../src/jogo/configuracao.js';
import { atualizarPainelProducao, resumoProducao } from '../src/interface/producao.js';
import { CONFEITARIA, maquinaConfeitaria } from '../src/jogo/confeitaria.js';

test('barra e porcentagem aparecem somente durante produção ativa e o estado de espera continua visível', () => {
  const estado = estadoInicial();
  estado.melhorias.alaPadaria = 1;
  estado.melhorias.confeitaria = 1;
  const lista = { innerHTML: '' };
  const painel = { hidden: true, dataset: {}, querySelector: () => lista };
  for (const id of ['pao', 'confeitaria']) {
    Object.assign(estado.jogador, id === 'pao' ? PRODUTOS.pao.cliente : CONFEITARIA.entrega);
    atualizarPainelProducao(painel, estado);
    assert.match(lista.innerHTML, /Aguardando/);
    assert.doesNotMatch(lista.innerHTML, /<progress|<b>\d+%/);
    if (id === 'pao') estado.producao.farinha = 1;
    else Object.assign(estado.confeitaria, { mel: 1, ovos: 1, progresso: 3 });
    atualizarPainelProducao(painel, estado);
    assert.match(lista.innerHTML, /<progress/);
    assert.match(lista.innerHTML, /<b>\d+%/);
    estado.produtos[id === 'pao' ? 'pao' : 'bolo'].prateleira = PRODUTOS[id === 'pao' ? 'pao' : 'bolo'].capacidadePrateleira;
    atualizarPainelProducao(painel, estado);
    assert.match(lista.innerHTML, /Vitrine cheia/);
    assert.doesNotMatch(lista.innerHTML, /<progress|<b>\d+%/);
  }
});

test('selos mostram estoque sobre capacidade para doces, pães e os dois cartões juntos', () => {
  const estado = estadoInicial();
  estado.melhorias.alaPadaria = 1;
  estado.melhorias.confeitaria = 1;
  estado.produtos.pao.prateleira = 11;
  estado.produtos.bolo.prateleira = 4;
  estado.produtos.donut.prateleira = 10;
  estado.produtos.eclair.prateleira = 5;
  const lista = { innerHTML: '' };
  const painel = { hidden: true, dataset: {}, querySelector: seletor => { assert.equal(seletor, '#lista-producao'); return lista; } };
  Object.assign(estado.jogador, CONFEITARIA.entrega);
  atualizarPainelProducao(painel, estado);
  assert.match(lista.innerHTML, /class="producao-prontos">19 \/ 24</);
  Object.assign(estado.jogador, PRODUTOS.pao.cliente);
  atualizarPainelProducao(painel, estado);
  assert.match(lista.innerHTML, /class="producao-prontos">11 \/ 18</);
  Object.assign(estado.jogador, { x: CONFEITARIA.limiteEntregaX, z: CONFEITARIA.entrada.z });
  atualizarPainelProducao(painel, estado);
  assert.match(lista.innerHTML, /19 \/ 24/);
  assert.match(lista.innerHTML, /11 \/ 18/);
});

test('cartão da confeitaria aparece somente junto à bandeja de mel e ovos com ingredientes e progresso', () => {
  const estado = estadoInicial();
  estado.melhorias.alaPadaria = 1;
  const lista = { innerHTML: '' };
  const painel = { hidden: true, dataset: {}, querySelector: seletor => { assert.equal(seletor, '#lista-producao'); return lista; } };
  Object.assign(estado.jogador, CONFEITARIA.posto);
  atualizarPainelProducao(painel, estado);
  assert.doesNotMatch(lista.innerHTML, /producao-cartao confeitaria/);
  estado.melhorias.confeitaria = 1;
  Object.assign(estado.confeitaria, { mel: 2, ovos: 3, progresso: 3 });
  for (const ponto of [CONFEITARIA.entrega, CONFEITARIA.entrada]) {
    Object.assign(estado.jogador, ponto);
    atualizarPainelProducao(painel, estado);
    assert.equal(painel.hidden, false);
    assert.match(lista.innerHTML, /producao-cartao confeitaria/);
    assert.match(lista.innerHTML, /Mel/);
    assert.match(lista.innerHTML, /Ovo/);
    assert.match(lista.innerHTML, /2 \/ 8/);
    assert.match(lista.innerHTML, /3 \/ 8/);
    assert.match(lista.innerHTML, /50%/);
    assert.match(lista.innerHTML, /Misturando na batedeira/);
  }
  for (const ponto of [CONFEITARIA.posto, maquinaConfeitaria(), ...Object.keys(CONFEITARIA.produtos).map(id => PRODUTOS[id].cliente)]) {
    Object.assign(estado.jogador, ponto);
    atualizarPainelProducao(painel, estado);
    assert.ok(painel.hidden || !lista.innerHTML.includes('producao-cartao confeitaria'));
  }
  Object.assign(estado.jogador, { x: 0, z: 3 });
  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, true);
});

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
  const lista = { innerHTML: '' };
  const painel = { hidden: true, dataset: {}, querySelector: seletor => { assert.equal(seletor, '#lista-producao'); return lista; } };

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
  const lista = { innerHTML: '' };
  const painel = { hidden: true, dataset: {}, querySelector: seletor => { assert.equal(seletor, '#lista-producao'); return lista; } };

  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, true);

  Object.assign(estado.jogador, PRODUTOS.pao.reposicao);
  atualizarPainelProducao(painel, estado);
  assert.equal(painel.hidden, false);
  assert.match(lista.innerHTML, /Padaria/);
  assert.match(lista.innerHTML, /Farinha/);

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
