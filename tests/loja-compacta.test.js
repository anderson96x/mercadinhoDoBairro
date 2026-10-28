import { prepararMelhoriasAnteriores } from './helpers/progressao.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { PLANTA_COMPACTA, PLANTA_INICIAL } from '../src/jogo/planta.js';
import { construirBairro } from '../src/jogo/bairro.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function nivel5() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 4 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 5000;
  prepararMelhoriasAnteriores(sim, 'laranja');
  sim.sincronizarProfundidade();
  return sim;
}

test('loja mantém metade da profundidade e a porta acessível sem comprar laranja, mesmo em níveis altos', () => {
  const sim = new Simulacao();
  assert.equal(PLANTA_COMPACTA.salao.d, PLANTA_INICIAL.salao.d / 2);
  assert.equal(PLANTA_COMPACTA.limites.maxZ, PLANTA_INICIAL.limites.maxZ);
  for (const nivel of [1, 5, 6, 7, 19]) {
    sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
    assert.ok(sim.compacta);
    sim.aberturasPortasProducao[0] = 1;
    const paredes = sim.obstaculos();
    assert.equal(segmentoLivre({ x: 6, z: 0 }, { x: 6, z: -3 }, paredes, 0.32), false);
    assert.ok(segmentoLivre({ x: sim.portaProducao.x, z: 0 }, { x: sim.portaProducao.x, z: -3 }, paredes, 0.32));
  }
});

test('somente a compra de laranja amplia a loja, cobrando uma vez e preservando estoques e compras', () => {
  const sim = nivel5();
  sim.estado.produtos.trigo.prateleira = 5;
  sim.estado.produtos.milho.prateleira = 3;
  const produtos = structuredClone(sim.estado.produtos), melhorias = { ...sim.estado.melhorias };
  const dinheiro = sim.estado.dinheiro;
  Object.assign(sim.estado.jogador, PRODUTOS.trigo.prateleira);
  assert.equal(sim.produtos.trigo.prateleira.z, PRODUTOS.trigo.prateleira.z + 0.6);
  assert.equal(sim.aumentarNivelDev(), 6);
  assert.equal(sim.compacta, true, 'subir de nível não amplia a loja');
  const saldoN6 = sim.estado.dinheiro;
  sim.estado.dinheiro = 799;
  assert.equal(sim.comprarMelhoria('laranja').sucesso, false);
  assert.equal(sim.compacta, true, 'compra recusada não amplia a loja');
  sim.estado.dinheiro = saldoN6;
  assert.equal(sim.comprarMelhoria('laranja').sucesso, true);
  assert.equal(sim.compacta, false);
  assert.equal(sim.estado.dinheiro, dinheiro + CONFIG.bonusNivel - 800);
  assert.deepEqual(sim.estado.produtos.trigo, produtos.trigo);
  assert.deepEqual(sim.estado.produtos.milho, produtos.milho);
  assert.deepEqual(sim.estado.melhorias, { ...melhorias, laranja: 1 });
  assert.equal(sim.comprarMelhoria('laranja').sucesso, false);
  assert.equal(sim.estado.dinheiro, dinheiro + CONFIG.bonusNivel - 800);
  assert.equal(sim.produtos, PRODUTOS);
  assert.deepEqual(sim.portaProducao, PLANTA_INICIAL.portaProducao);
  assert.ok(segmentoLivre(sim.estado.jogador, sim.estado.jogador, sim.obstaculos(), 0.32));
  assert.ok(segmentoLivre({ x: 6, z: 0 }, { x: 6, z: -3 }, sim.obstaculos(), 0.32));
});

test('pagamento do cliente que libera N6 mantém a loja compacta até comprar laranja', () => {
  const sim = nivel5();
  sim.estado.estatisticas.clientes = 5 * CONFIG.clientesPorNivel - 1;
  sim.estado.melhorias.caixa = 1;
  const cliente = { ...CONFIG.clienteCaixa, fase: 'fila', itens: ['tomate'], produto: 'tomate', quantidade: 1,
    pedido: [{ produto: 'tomate', desejado: 1, quantidade: 1 }], ordemFila: 0 };
  sim.clientes.push(cliente);
  sim.atualizarCaixa(CONFIG.tempoCaixa);
  assert.equal(sim.nivel, 6);
  assert.equal(sim.compacta, true);
  assert.equal(sim.ultimaPlantaCompacta, true);
  assert.equal(sim.comprarMelhoria('laranja').sucesso, true);
  assert.equal(sim.compacta, false);
  assert.equal(sim.ultimaPlantaCompacta, false);
});

test('saves anteriores preservam produção, saldo e carga na loja compacta ou completa', () => {
  for (const nivel of [5, 6, 19]) {
    const sim = nivel5();
    sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
    if (nivel >= 6) assert.equal(sim.comprarMelhoria('laranja').sucesso, true);
    sim.estado.versaoLayout = 23;
    sim.estado.produtos.trigo.prateleira = 5;
    sim.estado.produtos.trigo.apresentado = true;
    sim.estado.produtos.trigo.crescimento = 1.2;
    Object.assign(sim.estado.jogador, { x: 7.1, z: -1.3, inventario: ['trigo'] });
    const retomado = new Simulacao(structuredClone(sim.estado));
    assert.equal(retomado.compacta, nivel < 6);
    assert.equal(retomado.estado.dinheiro, sim.estado.dinheiro);
    assert.deepEqual(retomado.estado.produtos, sim.estado.produtos);
    assert.equal(retomado.estado.produtos.trigo.crescimento, 1.2);
    assert.deepEqual(retomado.estado.jogador.inventario, ['trigo']);
    assert.ok(segmentoLivre(retomado.estado.jogador, retomado.estado.jogador, retomado.obstaculos(), 0.32));
  }
});

test('piso, paredes, porta e lixeira acompanham a planta e restauram no N6', () => {
  const cena = new THREE.Scene();
  const caixa = (grupo, w, h, d, cor, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: cor }));
    mesh.position.set(x, y, z); grupo.add(mesh); return mesh;
  };
  const bairro = construirBairro(cena, { caixa, esfera: (g, r, c, x, y, z) => caixa(g, r, r, r, c, x, y, z),
    cilindro: (g, r, b, h, c, x, y, z) => caixa(g, r, h, b, c, x, y, z) });
  for (const compacta of [true, false]) {
    bairro.atualizarProfundidade(compacta);
    cena.updateMatrixWorld(true);
    const piso = new THREE.Box3().setFromObject(cena.getObjectByName('piso-inicial'));
    assert.ok(Math.abs(piso.min.z - (compacta ? -1.3 : -9.3)) < 1e-5);
    assert.ok(Math.abs(piso.max.z - 6.7) < 1e-5);
    assert.equal(cena.getObjectByName('entrada-producao').position.z, compacta ? 8 : 0);
    assert.equal(cena.getObjectByName('lixeira').position.z, CONFIG.lixeira.z + (compacta ? 8 : 0));
  }
});
