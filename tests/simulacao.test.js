import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulacao, validarEstado } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';

function avancar(sim, segundos, entrada) {
  for (let i = 0; i < segundos * 60; i++) sim.atualizar(1 / 60, entrada);
}
function aproximar(sim, ponto) { Object.assign(sim.estado.jogador, ponto); }

test('colher, repor, atender e receber o valor exato da compra', () => {
  const sim = new Simulacao();
  aproximar(sim, { x: -4.8, z: -1.7 });
  avancar(sim, 3);
  assert.equal(sim.estado.jogador.inventario.length, 6);
  assert.equal(sim.estado.estatisticas.colhidos, 6);
  aproximar(sim, PRODUTOS.tomate.reposicao);
  avancar(sim, 3);
  assert.equal(sim.estado.jogador.inventario.length, 0);
  assert.equal(sim.estado.estatisticas.repostos, 6);
  aproximar(sim, CONFIG.caixa);
  avancar(sim, 30);
  assert.ok(sim.estado.estatisticas.clientes >= 1);
  assert.ok(sim.estado.dinheiro > 0);
  assert.equal(sim.estado.dinheiro, sim.estado.estatisticas.faturamento);
  assert.equal(sim.estado.dinheiro % PRODUTOS.tomate.preco, 0);
  const vendidos = sim.estado.dinheiro / PRODUTOS.tomate.preco;
  const carregados = sim.clientes.filter(c => !['saindo','fim'].includes(c.fase)).reduce((s,c) => s+c.quantidade,0);
  assert.equal(vendidos + carregados + sim.estado.produtos.tomate.prateleira, 6);
});

test('a cesta tem limite, e uma prateleira cheia não consome produtos', () => {
  const sim = new Simulacao();
  aproximar(sim, { x: -4.8, z: -1.7 }); avancar(sim, 12);
  assert.equal(sim.estado.jogador.inventario.length, sim.capacidade);
  sim.estado.produtos.tomate.prateleira = 12;
  aproximar(sim, PRODUTOS.tomate.reposicao); sim.interagir();
  assert.equal(sim.estado.jogador.inventario.length, 6);
  assert.equal(sim.estado.produtos.tomate.prateleira, 12);
});

test('melhorias respeitam o saldo, o limite e o desbloqueio de produtos', () => {
  const sim = new Simulacao();
  assert.equal(sim.comprarMelhoria('milho').sucesso, false);
  assert.equal(sim.comprarMelhoria('inexistente').sucesso, false);
  assert.equal(sim.estado.dinheiro, 0);
  sim.estado.dinheiro = 500;
  assert.equal(sim.comprarMelhoria('milho').sucesso, true);
  assert.equal(sim.estado.dinheiro, 420);
  assert.equal(sim.estado.produtos.milho.liberado, true);
  assert.equal(sim.comprarMelhoria('milho').sucesso, false);
  assert.equal(sim.estado.dinheiro, 420);
  assert.equal(sim.comprarMelhoria('mochila').sucesso, true);
  assert.equal(sim.capacidade, 10);
  assert.equal(sim.custoMelhoria('mochila'), 105);
});

test('funcionários conseguem produzir e vender com o jogador distante', () => {
  const sim = new Simulacao();
  sim.estado.dinheiro = 440;
  sim.comprarMelhoria('milho'); sim.comprarMelhoria('caixa'); sim.comprarMelhoria('ajudante');
  aproximar(sim, { x: -9, z: 8 });
  avancar(sim, 240);
  assert.ok(sim.estado.estatisticas.clientes >= 5);
  assert.ok(sim.estado.dinheiro > 0);
  assert.ok(sim.estado.produtos.milho.horta <= 8);
  for (const p of Object.values(sim.estado.produtos)) { assert.ok(p.prateleira >= 0 && p.prateleira <= 12); assert.ok(p.horta >= 0 && p.horta <= 8); }
});

test('movimento respeita obstáculos e limites do mapa; pausa congela o mundo', () => {
  const sim = new Simulacao();
  aproximar(sim, { x: 0.4, z: 0.5 });
  for (let i=0;i<120;i++) sim.mover(sim.estado.jogador,0,-1,1/60,4);
  assert.ok(sim.estado.jogador.z >= -0.68);
  aproximar(sim, { x: -10, z: 8 });
  for (let i=0;i<100;i++) sim.mover(sim.estado.jogador,-1,0,1/60,4);
  assert.ok(sim.estado.jogador.x >= CONFIG.limiteMundo.minX);
  sim.pausado = true;
  const anterior = JSON.stringify(sim.estado);
  avancar(sim, 10, { x: 1, y: 1 });
  assert.equal(JSON.stringify(sim.estado), anterior);
});

test('salvamento incompleto ou adulterado não gera dinheiro negativo nem estoques inválidos', () => {
  assert.equal(validarEstado(null).dinheiro, 0);
  const estado = validarEstado({ versao: 1, dinheiro: -10, melhorias: { mochila: 99, milho: 1 }, produtos: { tomate: { horta: 999, prateleira: -2 }, milho: { horta: 7, prateleira: 4 } }, jogador: { inventario: ['tomate','milho','desconhecido'] }, estatisticas: { clientes: NaN } });
  assert.equal(estado.dinheiro, 0); assert.equal(estado.melhorias.mochila, 3);
  assert.equal(estado.produtos.tomate.horta, 8); assert.equal(estado.produtos.tomate.prateleira, 0);
  assert.deepEqual(estado.jogador.inventario, ['tomate','milho']);
  assert.equal(estado.estatisticas.clientes, 0);
});
