import { reativarImportadosParaTeste } from './helpers/importados-suspensos.js';
reativarImportadosParaTeste();

import test from 'node:test';
import { prepararLojaCompleta } from './helpers/loja-completa.js';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG } from '../src/jogo/configuracao.js';
import { LINHA_FRONTAL_PADARIA, LINHA_TRASEIRA_PRATELEIRAS_IMPORTADOS, PRATELEIRAS_IMPORTADOS } from '../src/jogo/planta.js';
import { Simulacao, pontoFila } from '../src/jogo/simulacao.js';
import { segmentoLivre, buscarCaminho } from '../src/jogo/navegacao.js';
import { construirPrateleirasImportados } from '../src/jogo/prateleiras-importados.js';

function nivel(n = 17) {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  sim.estado.estatisticas.clientes = (n - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 5000;
  prepararLojaCompleta(sim);
  return sim;
}

test('melhoria exige nível 17 e instala duas prateleiras por R$ 1.000 cada', () => {
  const sim = nivel(16);
  assert.match(sim.comprarMelhoria('prateleirasImportados').motivo, /nível 17/);
  assert.equal(sim.estado.dinheiro, 5000);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 999;
  assert.equal(sim.comprarMelhoria('prateleirasImportados').sucesso, false);
  assert.equal(sim.estado.dinheiro, 999);
  sim.estado.dinheiro = 2000;
  assert.equal(sim.comprarMelhoria('prateleirasImportados').sucesso, true);
  assert.equal(sim.estado.melhorias.prateleirasImportados, 1);
  assert.equal(sim.comprarMelhoria('prateleirasImportados').sucesso, true);
  assert.equal(sim.estado.melhorias.prateleirasImportados, 2);
  assert.equal(sim.estado.dinheiro, 0);
  sim.estado.dinheiro = 1000;
  assert.match(sim.comprarMelhoria('prateleirasImportados').motivo, /completa/);
  assert.equal(sim.estado.dinheiro, 1000);
});

test('prateleiras continuam vazias, sem novos estoques ou produtos, inclusive no nível 18', () => {
  for (const n of [17, 18]) {
    const sim = nivel(n), produtos = structuredClone(sim.estado.produtos);
    sim.comprarMelhoria('prateleirasImportados');
    sim.comprarMelhoria('prateleirasImportados');
    assert.equal(sim.estado.dinheiro, 3000);
    assert.equal(sim.estado.estagioLoja, 0);
    assert.deepEqual(sim.estado.produtos, produtos);
  }
});

test('saves preservam o nível e migram as duas opções provisórias', () => {
  const sim = nivel();
  sim.comprarMelhoria('prateleirasImportados');
  const salvo = structuredClone(sim.estado);
  const restaurado = new Simulacao(salvo);
  assert.equal(restaurado.estado.melhorias.prateleirasImportados, 1);
  delete salvo.melhorias.prateleirasImportados;
  const migrado = new Simulacao(salvo);
  assert.equal(migrado.estado.dinheiro, 4000);
  assert.equal(migrado.estado.melhorias.prateleirasImportados, 0);
  salvo.melhorias.prateleiraImportados1 = 1;
  assert.equal(new Simulacao(salvo).estado.melhorias.prateleirasImportados, 1);
  salvo.melhorias.prateleiraImportados2 = 1;
  assert.equal(new Simulacao(salvo).estado.melhorias.prateleirasImportados, 2);
  for (const valor of [-1, NaN, Infinity, 7]) {
    const adulterado = nivel(16).estado;
    adulterado.melhorias.prateleirasImportados = valor;
    const validado = new Simulacao(adulterado);
    assert.equal(validado.estado.melhorias.prateleirasImportados, 0);
  }
});

test('colisões aparecem por compra e desocupam jogador, repositor e cliente na instalação', () => {
  const sim = nivel();
  for (const [indice, p] of PRATELEIRAS_IMPORTADOS.entries()) {
    assert.equal(sim.obstaculos().includes(p), false);
    Object.assign(sim.estado.jogador, { x: p.x, z: p.z });
    Object.assign(sim.ajudante, { x: p.x, z: p.z });
    const cliente = { x: p.x, z: p.z }; sim.clientes.push(cliente);
    sim.comprarMelhoria('prateleirasImportados');
    assert.equal(sim.estado.melhorias.prateleirasImportados, indice + 1);
    assert.equal(sim.obstaculos().includes(p), true);
    for (const ator of [sim.estado.jogador, sim.ajudante, cliente])
      assert.ok(segmentoLivre(ator, ator, [p], 0.32));
    const recarregado = new Simulacao({ ...sim.estado, jogador: { ...sim.estado.jogador, x: p.x, z: p.z } });
    assert.ok(segmentoLivre(recarregado.estado.jogador, recarregado.estado.jogador, [p], 0.32));
  }
});

test('corredores das prateleiras preservam os dez lugares da fila e acesso ao fundo', () => {
  const sim = nivel();
  sim.comprarMelhoria('prateleirasImportados');
  sim.comprarMelhoria('prateleirasImportados');
  for (let i = 0; i < 10; i++) assert.ok(segmentoLivre(pontoFila(i), pontoFila(i), sim.obstaculos(), 0.32));
  const livre = (a, b) => segmentoLivre(a, b, sim.obstaculosCliente({}), 0.32);
  sim.aberturasPortasProducao.fill(1);
  for (const p of PRATELEIRAS_IMPORTADOS) for (const lado of [-1, 1]) {
    const destino = { x: p.x + lado * (p.w / 2 + 0.6), z: p.z };
    assert.ok(buscarCaminho(CONFIG.inicio, destino, livre, sim.limitesClientes).length);
  }
});

test('as duas prateleiras têm o mesmo tamanho e terminam nas mesmas linhas', () => {
  assert.equal(PRATELEIRAS_IMPORTADOS[0].d, PRATELEIRAS_IMPORTADOS[1].d);
  assert.equal(PRATELEIRAS_IMPORTADOS[0].d, 5.775);
  for (const p of PRATELEIRAS_IMPORTADOS) {
    assert.ok(Math.abs(p.z + p.d / 2 - LINHA_FRONTAL_PADARIA) < 1e-9);
    assert.ok(Math.abs(p.z - p.d / 2 - LINHA_TRASEIRA_PRATELEIRAS_IMPORTADOS) < 1e-9);
  }
});

test('objetivo do nível 17 orienta as duas compras sem exigir estacionamento', () => {
  const sim = nivel();
  assert.match(sim.missao().texto, /1\.000 cada/);
  assert.equal(sim.missao().destino, 'celular');
  sim.comprarMelhoria('prateleirasImportados');
  assert.match(sim.missao().titulo, /prateleiras/);
  sim.comprarMelhoria('prateleirasImportados');
  assert.doesNotMatch(sim.missao().titulo, /prateleiras/);
});

test('modelo usa quatro níveis vazios de dois lados e visibilidade independente', () => {
  const caixa = (pai, w, h, d, cor, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    mesh.position.set(x, y, z); pai.add(mesh); return mesh;
  };
  const visual = construirPrateleirasImportados(caixa);
  const sim = nivel();
  for (const p of PRATELEIRAS_IMPORTADOS) assert.equal(visual.grupo.getObjectByName(p.nome).visible, false);
  for (const [indice, p] of PRATELEIRAS_IMPORTADOS.entries()) {
    sim.comprarMelhoria('prateleirasImportados'); visual.atualizar(sim.estado.melhorias);
    const estante = visual.grupo.getObjectByName(p.nome);
    assert.equal(estante.visible, true);
    assert.equal(visual.grupo.getObjectByName(PRATELEIRAS_IMPORTADOS.at(1 - indice).nome).visible, indice > 0);
    const niveis = estante.children.filter(o => o.name === 'nivel-prateleira-importados');
    assert.equal(niveis.length, 4);
    assert.ok(niveis.every(o => o.geometry.parameters.width === p.w));
    const limites = new THREE.Box3().setFromObject(estante);
    assert.ok(Math.abs(limites.min.x - (p.x - p.w / 2)) < 1e-6);
    assert.ok(Math.abs(limites.max.z - (p.z + p.d / 2)) < 1e-6);
  }
});
