import { reativarImportadosParaTeste } from './helpers/importados-suspensos.js';
reativarImportadosParaTeste();

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Cena, personagem } from '../src/jogo/cena.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { CLASSES_PRODUTOS } from '../src/jogo/classes-produtos.js';
import { vagasDeposito } from '../src/jogo/entregas.js';
import { geometriaEstacao, distanciaEstacao } from '../src/jogo/estacoes.js';

function loja(nivel = 21) {
  const sim = new Simulacao(); sim.estado.dinheiro = 100000; sim.proximoCliente = Infinity;
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  for (const id of ['alaProducao', 'alaLeite', 'alaTrigo', 'alaPadaria', 'expansao', 'prateleirasImportados']) {
    assert.equal(sim.comprarMelhoria(id).sucesso, true);
  }
  return sim;
}

test('mantimentos exigem nível 21, segunda gôndola e saldo; pedidos reservam só a quarta estante', () => {
  assert.match(loja(20).comprarMelhoria('importarMantimentos').motivo, /nível 21/);
  const sim = loja();
  assert.match(sim.comprarMelhoria('importarMantimentos').motivo, /segunda/);
  sim.comprarMelhoria('prateleirasImportados'); sim.estado.dinheiro = 314;
  assert.equal(sim.comprarMelhoria('importarMantimentos').sucesso, false);
  sim.estado.dinheiro = 2000;
  assert.equal(sim.encomendarImportacoes({ importarMantimentos: 4 }).sucesso, true);
  assert.equal(sim.estado.dinheiro, 740);
  assert.equal(vagasDeposito(sim.estado.deposito, 'mantimentos'), 0);
  assert.equal(vagasDeposito(sim.estado.deposito, 'enlatados'), 4);
  assert.equal(sim.estado.produtos.mantimento.prateleira, 0);
  const salvo = new Simulacao(structuredClone(sim.estado));
  for (let i = 0; i < 18000 && (salvo.estado.deposito.pedidos.length || salvo.entregas.caminhao); i++) salvo.entregas.atualizar(salvo, 0.05);
  assert.equal(salvo.estado.produtos.mantimento.horta, 36);
  assert.deepEqual(salvo.estado.deposito.pacotes.map(p => p.slot), [12, 13, 14, 15]);
  Object.assign(salvo.estado.jogador, salvo.produtos.mantimento.coleta);
  salvo.tempo = 10; salvo.interagir();
  assert.deepEqual(salvo.estado.jogador.inventario, ['mantimento']);
  Object.assign(salvo.estado.jogador, salvo.produtos.mantimento.reposicao);
  salvo.tempo++; salvo.interagir();
  assert.equal(salvo.estado.produtos.mantimento.prateleira, 1);
  assert.equal(salvo.estado.produtos.mantimento.apresentado, true);
  assert.equal(PRODUTOS.mantimento.preco, 35);
  const antigo = structuredClone(sim.estado);
  delete antigo.produtos.mantimento; delete antigo.melhorias.importarMantimentos; antigo.deposito.pedidos = [];
  const migrado = new Simulacao(antigo);
  assert.equal(migrado.estado.produtos.mantimento.liberado, false);
  assert.equal(migrado.estado.dinheiro, antigo.dinheiro);
});

test('mantimentos têm nove unidades de cada tipo voltadas de frente para os enlatados', () => {
  const visual = { cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  for (const id of ['enlatado', 'mantimento', 'cereal']) Cena.prototype.construirImportado.call(visual, id, PRODUTOS[id]);
  const produtos = visual.produtos.mantimento.frutas;
  assert.equal(produtos.length, 36);
  assert.deepEqual([...new Set(produtos.map(p => p.userData.variedade))], ['macarrao', 'feijao', 'arroz', 'farinha']);
  for (const [i, produto] of produtos.entries()) {
    const tipo = produto.userData.variedade, rotulo = produto.getObjectByName('rotulo-mantimento');
    assert.equal(produtos.filter(p => p.userData.variedade === tipo).length, 9);
    assert.ok(rotulo.material.userData.svg.endsWith(`mantimentos/${tipo}.svg`));
    const centroRotulo = new THREE.Box3().setFromObject(rotulo).getCenter(new THREE.Vector3());
    assert.ok(centroRotulo.x < produto.position.x);
    assert.ok(produto.position.x > visual.produtos.enlatado.frutas[i].position.x);
    assert.equal(produto.position.z, visual.produtos.enlatado.frutas[i].position.z);
    const bounds = new THREE.Box3().setFromObject(produto);
    assert.ok(bounds.max.y - bounds.min.y < 0.56);
  }
  assert.equal(CLASSES_PRODUTOS.mantimentos.gondola, CLASSES_PRODUTOS.cereais.gondola);
  assert.equal(CLASSES_PRODUTOS.mantimentos.lado, -CLASSES_PRODUTOS.cereais.lado);
});

test('sacos kraft têm base firme, ombros afunilados e alça realmente vazada', () => {
  const visual = { cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  Cena.prototype.construirImportado.call(visual, 'mantimento', PRODUTOS.mantimento);
  for (const indice of [9, 18, 27]) {
    const produto = visual.produtos.mantimento.frutas[indice];
    const frente = produto.getObjectByName('rotulo-mantimento');
    assert.equal(frente.userData.texturaCurva, true);
    const posicoes = frente.geometry.attributes.position;
    assert.ok(posicoes.getZ(2) > 0.1, 'corpo conserva profundidade');
    assert.ok(posicoes.getZ(0) < posicoes.getZ(2) * 0.2, 'fechamento achatado');
    assert.ok(Math.abs(posicoes.getX(0)) < Math.abs(posicoes.getX(2)), 'ombros afunilados');
    const alca = produto.getObjectByName('alca-vazada-mantimento');
    assert.ok(alca);
    assert.equal(alca.geometry.parameters.shapes.holes.length, 1);
    const local = new THREE.Mesh(alca.geometry, alca.material);
    const altura = { 9: 0.54, 18: 0.56, 27: 0.5 }[indice];
    const raio = new THREE.Raycaster(new THREE.Vector3(0, altura * 0.425, 1), new THREE.Vector3(0, 0, -1));
    assert.equal(raio.intersectObject(local).length, 0, 'vão da alça atravessa o papel');
    raio.ray.origin.x = 0.11;
    assert.ok(raio.intersectObject(local).length > 0, 'papel permanece nos lados da alça');
    assert.equal(frente.material.isMeshStandardMaterial, true, 'iluminação acompanha o relevo');
  }
});

test('corredor dos mantimentos tem rotas de compra, coleta, reposição e saída livres', () => {
  const sim = loja(); sim.comprarMelhoria('prateleirasImportados');
  for (const destino of [sim.produtos.mantimento.coleta, sim.produtos.mantimento.reposicao, ...sim.produtos.mantimento.pontosCompra, CONFIG.clienteCaixa]) {
    const ator = Object.assign(sim.estado.jogador, CONFIG.inicio); let chegou = false;
    for (let i = 0; i < 3000 && !chegou; i++) chegou = sim.caminharCliente(ator, destino, 0.05);
    assert.ok(chegou, JSON.stringify(destino));
  }
  const face = geometriaEstacao('mantimento', 'reposicao');
  assert.ok(distanciaEstacao(PRODUTOS.cereal.reposicao, face) > CONFIG.raioInteracao);
});

test('pacotes de mantimentos mantêm volume e não se atravessam no transporte', () => {
  const modelo = personagem(0xffffff, 0xf2c49c, true);
  Cena.prototype.animarPersonagem(modelo, { x: 0, z: 0, andando: false }, 1, 0, Array(8).fill('mantimento'));
  const volumes = modelo.userData.carga.children.map(p => new THREE.Box3().setFromObject(p.clone()));
  for (const [i, a] of volumes.entries()) {
    assert.ok(a.max.z - a.min.z > 0.08);
    for (const b of volumes.slice(i + 1)) assert.equal(a.intersectsBox(b), false);
  }
});

test('repositor abastece mantimentos e cliente compra pelo preço da classe', () => {
  const sim = loja(); sim.comprarMelhoria('prateleirasImportados');
  sim.encomendarImportacoes({ importarMantimentos: 1 });
  for (let i = 0; i < 18000 && (sim.estado.deposito.pedidos.length || sim.entregas.caminhao); i++) sim.entregas.atualizar(sim, 0.05);
  sim.estado.melhorias.ajudante = 1;
  for (const [id, estado] of Object.entries(sim.estado.produtos)) if (id !== 'mantimento') estado.liberado = false;
  for (let i = 0; i < 20000 && sim.estado.produtos.mantimento.prateleira < 9; i++) {
    sim.tempo += 0.05; sim.atualizarAjudante(0.05);
  }
  assert.equal(sim.estado.produtos.mantimento.prateleira, 9);
  assert.equal(sim.estado.produtos.mantimento.horta, 0);
  assert.equal(sim.estado.produtos.mantimento.apresentado, true);
  assert.equal(sim.comprarMelhoria('caixa').sucesso, true);
  sim.aleatorio = () => 0;
  assert.equal(sim.criarCliente(), true);
  const cliente = sim.clientes[0], faturamento = sim.estado.estatisticas.faturamento;
  for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
    sim.tempo += 0.05; sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
  }
  assert.equal(cliente.fase, 'fim');
  assert.deepEqual(cliente.itens, ['mantimento']);
  assert.equal(sim.estado.estatisticas.faturamento - faturamento, 35);
});
