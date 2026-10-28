import { prepararMelhoriasAnteriores } from './helpers/progressao.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Cena } from '../src/jogo/cena.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { PLANTA_INICIAL, compartimentoHortifruti } from '../src/jogo/planta.js';

function abrir() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 5 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 10000;
  sim.proximoCliente = Infinity;
  prepararMelhoriasAnteriores(sim, 'laranja');
  assert.ok(sim.comprarMelhoria('laranja').sucesso);
  return sim;
}

test('laranjeira exige nível 6 e R$ 800, com compra única', () => {
  const sim = new Simulacao();
  sim.estado.dinheiro = 800;
  assert.equal(sim.comprarMelhoria('laranja').sucesso, false);
  sim.estado.estatisticas.clientes = 5 * CONFIG.clientesPorNivel;
  prepararMelhoriasAnteriores(sim, 'laranja');
  sim.estado.dinheiro = 799;
  assert.equal(sim.comprarMelhoria('laranja').sucesso, false);
  sim.estado.dinheiro = 800;
  assert.ok(sim.comprarMelhoria('laranja').sucesso);
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(sim.comprarMelhoria('laranja').sucesso, false);
});

test('laranjas renovam na árvore, respeitam pausa e podem ser colhidas e repostas', () => {
  const sim = abrir(), estoque = sim.estado.produtos.laranja;
  estoque.horta = 0;
  sim.pausado = true; sim.atualizar(3);
  assert.equal(estoque.horta, 0);
  sim.pausado = false;
  for (let i = 0; i < 500; i++) sim.atualizar(0.1);
  assert.equal(estoque.horta, 8);
  Object.assign(sim.estado.jogador, PRODUTOS.laranja.coleta);
  sim.tempo += 1; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['laranja']);
  Object.assign(sim.estado.jogador, PRODUTOS.laranja.reposicao);
  sim.tempo += 1; sim.interagir();
  assert.equal(estoque.prateleira, 1);
  assert.equal(estoque.apresentado, true);
});

test('repositor transporta laranjas da árvore para o hortifruti', () => {
  const sim = abrir();
  assert.equal(sim.estado.melhorias.ajudante, 1);
  sim.estado.produtos.tomate.prateleira = 12;
  for (let i = 0; i < 6000 && sim.estado.produtos.laranja.prateleira < 8; i++) {
    sim.tempo += 0.05; sim.atualizarAjudante(0.05);
  }
  assert.equal(sim.estado.produtos.laranja.prateleira, 8);
});

test('cliente pede laranja após abastecimento e paga R$ 7', () => {
  const sim = abrir();
  sim.aleatorio = () => 0;
  for (let i = 0; i < 20; i++) {
    sim.clientes = []; sim.criarCliente();
    assert.ok(sim.clientes[0].compras.every(c => c.produto !== 'laranja'));
  }
  sim.estado.produtos.laranja.prateleira = 12;
  assert.equal(sim.estado.melhorias.caixa, 1);
  let cliente;
  for (let i = 0; i < 30; i++) {
    sim.clientes = []; sim.criarCliente();
    if (sim.clientes[0].compras[0].produto === 'laranja') { cliente = sim.clientes[0]; break; }
  }
  assert.ok(cliente);
  for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
    sim.tempo += 0.05; sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
  }
  assert.equal(cliente.fase, 'fim');
  assert.equal(sim.estado.estatisticas.faturamento, 7);
});

test('save antigo recebe laranja bloqueada e save novo preserva compra e estoques', () => {
  const sim = abrir();
  sim.estado.produtos.laranja.horta = 3;
  sim.estado.produtos.laranja.prateleira = 5;
  const salvo = structuredClone(sim.estado);
  const retomado = new Simulacao(salvo);
  assert.equal(retomado.estado.melhorias.laranja, 1);
  assert.equal(retomado.estado.produtos.laranja.horta, 3);
  assert.equal(retomado.estado.produtos.laranja.prateleira, 5);
  delete salvo.melhorias.laranja; delete salvo.produtos.laranja;
  const antigo = new Simulacao(salvo);
  assert.equal(antigo.estado.produtos.laranja.liberado, false);
  assert.equal(antigo.estado.dinheiro, sim.estado.dinheiro);
});

test('hortifruti reserva uma seção inteira após a laranja dentro do salão', () => {
  const laranja = PRODUTOS.laranja.prateleira, maca = PRODUTOS.maca.prateleira;
  assert.ok(Math.abs(laranja.z - maca.z - laranja.d) < 1e-8);
  const fundoFuturo = laranja.z - laranja.d * 1.5;
  assert.ok(fundoFuturo > PLANTA_INICIAL.limites.minZ + 0.3);
  assert.ok(compartimentoHortifruti('tomate').prateleira.z + laranja.d / 2 < PLANTA_INICIAL.limites.maxZ - 1);
});

test('laranjeira aparece sem depender da compra de outras alas', () => {
  const sim = abrir();
  const visual = { sim, cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  Cena.prototype.construirEstacao.call(visual, 'laranja', PRODUTOS.laranja);
  const objetos = visual.produtos.laranja;
  assert.ok(objetos.grupo.visible);
  const arvore = objetos.grupo.getObjectByName('laranjeira');
  assert.ok(arvore);
  assert.ok(!arvore.children.some(o => o.geometry?.parameters?.width === 3.2 && o.geometry?.parameters?.depth === 3.2));
  assert.equal(objetos.frutos.length, 8);
  assert.ok(objetos.frutos.every(f => f.position.y >= 2.5));
  assert.ok(objetos.frutos.every(f => f.scale.x === 1.9));
});
