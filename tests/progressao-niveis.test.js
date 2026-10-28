import test from 'node:test';
import { prepararLojaCompleta } from './helpers/loja-completa.js';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG, MELHORIAS, PRODUTOS, ALA_PADARIA } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { Cena } from '../src/jogo/cena.js';
import { PLANTA_COMPACTA, PRODUTOS_HORTIFRUTI } from '../src/jogo/planta.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';
import { prepararMelhoriasAnteriores } from './helpers/progressao.js';

const DESBLOQUEIOS = [
  [2, 'caixa'], [3, 'milho'], [4, 'alaTrigo'], [5, 'ajudante'],
  [6, 'laranja'], [7, 'maca'], [8, 'cestasExtras'], [9, 'alaArtesanal'],
  [10, 'logistica'], [11, 'alaProducao'], [12, 'alaLeite'], [13, 'alaPadaria'],
  [14, 'apiario'], [15, 'queijaria'], [16, 'irrigacao'],
  [17, 'cozinhaGeleia'], [18, 'estacionamento'], [19, 'confeitaria'], [20, 'expansao'], [21, 'prateleiraBiscoitosEnlatados'], [22, 'prateleiraMantimentosCereais'], [23, 'sucos'], [24, 'carrinhos'], [25, 'geladeiraSoda']
];

test('catálogo ativo segue exatamente os desbloqueios aprovados dos níveis 1 a 25', () => {
  const ativos = MELHORIAS.filter(m => m.ativa !== false && m.tipo !== 'importacao')
    .map(m => [m.nivelMinimo, m.id]).sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
  assert.deepEqual(ativos, [...DESBLOQUEIOS].sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])));
  assert.deepEqual(PRODUTOS_HORTIFRUTI, ['tomate', 'milho', 'trigo', 'laranja', 'maca', 'morango']);
});

test('cada melhoria bloqueia um nível antes e pode ser comprada no próprio nível com os pré-requisitos anteriores', () => {
  const sim = new Simulacao();
  sim.estado.dinheiro = 100000;
  for (const [nivel, id] of DESBLOQUEIOS) {
    sim.estado.estatisticas.clientes = (nivel - 2) * CONFIG.clientesPorNivel;
    const saldo = sim.estado.dinheiro;
    assert.match(sim.comprarMelhoria(id).motivo, new RegExp(`nível ${nivel}`), id);
    assert.equal(sim.estado.dinheiro, saldo);
    sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
    assert.equal(sim.comprarMelhoria(id).sucesso, true, id);
    assert.equal(sim.estado.dinheiro, saldo - MELHORIAS.find(m => m.id === id).custo);
    assert.equal(sim.comprarMelhoria(id).sucesso, false, id);
    assert.equal(sim.estado.estagioLoja >= ALA_PADARIA.indice, nivel >= 13);
  }
  assert.equal(sim.totalCestas, 10);
  assert.equal(sim.capacidade, 8);
  assert.equal(sim.velocidade, CONFIG.velocidadeInicial * 1.15);
  assert.equal(sim.velocidadeAjudante, sim.velocidade);
});

test('trigo cabe na loja compacta do N4 e as três seções têm pontos acessíveis pelo corredor', () => {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 3 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 1000;
  prepararMelhoriasAnteriores(sim, 'milho');
  sim.comprarMelhoria('milho'); sim.comprarMelhoria('alaTrigo');
  assert.ok(sim.compacta);
  for (const id of ['tomate', 'milho', 'trigo']) {
    const p = sim.produtos[id];
    assert.ok(p.prateleira.z - p.prateleira.d / 2 > PLANTA_COMPACTA.limites.minZ);
    assert.ok(p.prateleira.z + p.prateleira.d / 2 < PLANTA_COMPACTA.limites.maxZ);
    assert.ok(segmentoLivre(p.reposicao, p.reposicao, sim.obstaculos(), 0.32), id);
    for (const ponto of p.pontosCompra) assert.ok(segmentoLivre(ponto, ponto, sim.obstaculos(), 0.32), id);
    Object.assign(sim.estado.jogador, p.reposicao, { inventario: [id] });
    sim.tempo++; sim.interagir();
    assert.equal(sim.estado.produtos[id].prateleira, 1, id);
  }
});

test('laranja N6, maçã N7 e morango N9 aparecem e funcionam sem comprar padaria ou animais', () => {
  const sim = new Simulacao(); sim.estado.dinheiro = 10000;
  const visual = { sim, cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  for (const [nivel, melhoria, id] of [[6, 'laranja', 'laranja'], [7, 'maca', 'maca'], [9, 'alaArtesanal', 'morango']]) {
    sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
    prepararMelhoriasAnteriores(sim, melhoria);
    assert.equal(sim.comprarMelhoria(melhoria).sucesso, true);
    Cena.prototype.construirEstacao.call(visual, id, sim.produtos[id]);
    assert.ok(visual.produtos[id].grupo.visible, id);
    sim.estado.produtos[id].horta = 1;
    Object.assign(sim.estado.jogador, sim.produtos[id].coleta);
    sim.tempo++; sim.interagir();
    assert.deepEqual(sim.estado.jogador.inventario, [id]);
    Object.assign(sim.estado.jogador, sim.produtos[id].reposicao);
    sim.tempo++; sim.interagir();
    assert.equal(sim.estado.produtos[id].prateleira, 1);
    assert.equal(sim.estado.melhorias.alaPadaria, 0);
    assert.equal(sim.estado.produtos.ovos.liberado, false);
    assert.equal(sim.estado.produtos.leite.liberado, false);
    assert.ok(sim.estado.estagioLoja < ALA_PADARIA.indice);
    assert.equal(PRODUTOS[id].nivelMinimo, nivel);
  }
});

test('mel e queijo aguardam o salão da padaria mesmo quando a estufa já foi comprada', () => {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 14 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 20000;
  prepararLojaCompleta(sim);
  prepararMelhoriasAnteriores(sim, 'apiario');
  sim.estado.melhorias.alaPadaria = 0;
  for (const id of ['apiario', 'queijaria']) {
    assert.equal(sim.disponibilidadeMelhoria(id).requisitoMelhoria, 'alaPadaria');
    assert.equal(sim.comprarMelhoria(id).sucesso, false);
  }
});

test('seções e cestas que precisam da planta maior aguardam a compra de laranja', () => {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 19 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 20000;
  for (const id of ['maca', 'cestasExtras', 'alaArtesanal', 'alaProducao', 'alaLeite']) {
    assert.equal(sim.disponibilidadeMelhoria(id).requisitoMelhoria, 'laranja', id);
    assert.equal(sim.comprarMelhoria(id).sucesso, false, id);
    assert.equal(sim.compacta, true);
  }
  assert.equal(sim.comprarMelhoria('logistica').sucesso, false);
  assert.equal(sim.compacta, true, 'outras compras não ampliam a loja');
});

test('cada melhoria exige a compra anterior mesmo com nível e saldo suficientes', () => {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 24 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 100000;
  for (let i = 0; i < DESBLOQUEIOS.length; i++) {
    const [, id] = DESBLOQUEIOS[i];
    if (i > 0) {
      const anterior = DESBLOQUEIOS[i - 1][1];
      sim.estado.melhorias[anterior] = 0;
      const estado = structuredClone(sim.estado);
      assert.equal(sim.disponibilidadeMelhoria(id).requisitoMelhoria, anterior, id);
      assert.equal(sim.comprarMelhoria(id).sucesso, false, id);
      assert.deepEqual(sim.estado, estado, 'compra bloqueada preserva saldo, estoque e melhorias');
      sim.estado.melhorias[anterior] = 1;
    }
    assert.equal(sim.comprarMelhoria(id).sucesso, true, id);
  }
});

test('saves com compras fora da nova sequência preservam aquisições, estoques e dinheiro', () => {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 5 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 321;
  sim.estado.melhorias.laranja = 1;
  Object.assign(sim.estado.produtos.laranja, { liberado: true, horta: 4, prateleira: 3, apresentado: true });
  const restaurado = new Simulacao(structuredClone(sim.estado));
  assert.equal(restaurado.estado.melhorias.laranja, 1);
  assert.equal(restaurado.estado.melhorias.ajudante, 0);
  assert.equal(restaurado.estado.produtos.laranja.horta, 4);
  assert.equal(restaurado.estado.produtos.laranja.prateleira, 3);
  assert.equal(restaurado.estado.dinheiro, 321);
  restaurado.aumentarNivelDev();
  assert.equal(restaurado.nivel, 7, 'níveis continuam avançando sem a compra pendente');
  assert.equal(restaurado.disponibilidadeMelhoria('maca').disponivel, true);
});
