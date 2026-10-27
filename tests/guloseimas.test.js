import { prepararLojaCompleta } from './helpers/loja-completa.js';
import { reativarImportadosParaTeste } from './helpers/importados-suspensos.js';
reativarImportadosParaTeste();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { alturaPrateleiraImportados } from '../src/jogo/prateleiras-importados.js';
import { Cena, personagem } from '../src/jogo/cena.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { CLASSES_PRODUTOS } from '../src/jogo/classes-produtos.js';
import { vagasDeposito } from '../src/jogo/entregas.js';
import { geometriaEstacao, distanciaEstacao } from '../src/jogo/estacoes.js';
import { criarGuloseima } from '../src/jogo/guloseimas.js';

test('rótulos SVG de guloseimas têm dimensões explícitas para upload no WebGL', async () => {
  for (const tipo of ['cookies', 'amanteigados', 'balas', 'bombons']) for (const prefixo of ['', 'verso-']) {
    const caminho = new URL(`../public/produtos/doces/${prefixo}${tipo}.svg`, import.meta.url);
    const svg = await readFile(caminho, 'utf8');
    const raiz = svg.match(/<svg\b[^>]*>/)[0];
    const largura = Number(raiz.match(/\bwidth="(\d+)"/)?.[1]);
    const altura = Number(raiz.match(/\bheight="(\d+)"/)?.[1]);
    assert.ok(largura > 0 && altura > 0, `${prefixo}${tipo}: dimensões intrínsecas não podem depender só do viewBox`);
    assert.ok(raiz.includes(`viewBox="0 0 ${largura} ${altura}"`));
  }
});

function loja(nivel = 22) {
  const sim = new Simulacao(); sim.estado.dinheiro = 100000; sim.proximoCliente = Infinity;
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  prepararLojaCompleta(sim);
  for (const id of ['alaProducao', 'alaLeite', 'alaTrigo', 'alaPadaria', 'expansao', 'prateleirasImportados']) {
    assert.equal(sim.comprarMelhoria(id).sucesso, true);
  }
  return sim;
}

test('arte fecha as caixas sem faces sobrepostas e acompanha as dobras das balas', () => {
  for (const variante of [0, 9]) {
    const modelo = criarGuloseima(variante);
    const corpo = modelo.getObjectByName('embalagem-guloseima');
    const raio = new THREE.Raycaster(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1));
    assert.equal(raio.intersectObject(corpo).length, 0, 'casca deixa a frente e o verso para a impressão');
    assert.equal(raio.intersectObject(modelo.getObjectByName('rotulo-guloseima')).length > 0, true);
    for (const nome of ['rotulo-guloseima', 'verso-guloseima']) {
      assert.equal(modelo.getObjectByName(nome).material.isMeshStandardMaterial, true);
    }
  }
  const bombons = new THREE.Box3().setFromObject(criarGuloseima(9)).getSize(new THREE.Vector3());
  assert.ok(bombons.x > bombons.y * 1.5, 'caixa de bombons larga e baixa');
  const balas = criarGuloseima(6).getObjectByName('rotulo-guloseima');
  assert.equal(balas.userData.texturaCurva, true);
  const pos = balas.geometry.attributes.position;
  assert.ok(pos.getZ(0) < pos.getZ(2) / 4, 'solda superior achatada');
  assert.ok(Math.abs(pos.getX(0)) < Math.abs(pos.getX(2)), 'pacote afunila nas soldas');
});

test('guloseimas exigem nível 22, primeira gôndola e saldo; pedidos reservam só a segunda estante', () => {
  assert.match(loja(21).comprarMelhoria('importarDoces').motivo, /nível 22/);
  const sim = loja();
  sim.estado.melhorias.prateleirasImportados = 0;
  assert.equal(sim.comprarMelhoria('importarDoces').sucesso, false);
  sim.comprarMelhoria('prateleirasImportados'); sim.estado.dinheiro = 359;
  assert.equal(sim.comprarMelhoria('importarDoces').sucesso, false);
  sim.estado.dinheiro = 2000;
  assert.equal(sim.encomendarImportacoes({ importarDoces: 4 }).sucesso, true);
  assert.equal(sim.estado.dinheiro, 560);
  assert.equal(vagasDeposito(sim.estado.deposito, 'doces'), 0);
  assert.equal(vagasDeposito(sim.estado.deposito, 'enlatados'), 4);
  assert.equal(sim.estado.produtos.guloseima.prateleira, 0);
  const salvo = new Simulacao(structuredClone(sim.estado));
  for (let i = 0; i < 18000 && (salvo.estado.deposito.pedidos.length || salvo.entregas.caminhao); i++) salvo.entregas.atualizar(salvo, 0.05);
  assert.equal(salvo.estado.produtos.guloseima.horta, 36);
  assert.deepEqual(salvo.estado.deposito.pacotes.map(p => p.slot), [4, 5, 6, 7]);
  Object.assign(salvo.estado.jogador, salvo.produtos.guloseima.coleta);
  salvo.tempo = 10; salvo.interagir();
  assert.deepEqual(salvo.estado.jogador.inventario, ['guloseima']);
  Object.assign(salvo.estado.jogador, salvo.produtos.guloseima.reposicao);
  salvo.tempo++; salvo.interagir();
  assert.equal(salvo.estado.produtos.guloseima.prateleira, 1);
  assert.equal(salvo.estado.produtos.guloseima.apresentado, true);
  assert.equal(PRODUTOS.guloseima.preco, 40);
  const antigo = structuredClone(sim.estado);
  delete antigo.produtos.guloseima; delete antigo.melhorias.importarDoces; antigo.deposito.pedidos = [];
  const migrado = new Simulacao(antigo);
  assert.equal(migrado.estado.produtos.guloseima.liberado, false);
  assert.equal(migrado.estado.dinheiro, antigo.dinheiro);
});

test('quatro variedades ficam apoiadas na face da primeira gôndola voltada ao hortifruti', () => {
  const visual = { cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  Cena.prototype.construirImportado.call(visual, 'guloseima', PRODUTOS.guloseima);
  const produtos = visual.produtos.guloseima.frutas;
  assert.equal(produtos.length, 36);
  assert.deepEqual([...new Set(produtos.map(p => p.userData.variedade))], ['cookies', 'amanteigados', 'balas', 'bombons']);
  for (const [i, produto] of produtos.entries()) {
    const rotulo = produto.getObjectByName('rotulo-guloseima');
    assert.equal(produtos.filter(p => p.userData.variedade === produto.userData.variedade).length, 9);
    assert.ok(rotulo.material.userData.svg.endsWith(`doces/${produto.userData.variedade}.svg`));
    assert.ok(produto.getObjectByName('verso-guloseima'));
    const centro = new THREE.Box3().setFromObject(rotulo).getCenter(new THREE.Vector3());
    assert.ok(centro.x < produto.position.x);
    const bounds = new THREE.Box3().setFromObject(produto);
    assert.ok(Math.abs(bounds.min.y - alturaPrateleiraImportados(Math.floor(i / 9))) < 0.001);
    if (i < 27) assert.ok(bounds.max.y < alturaPrateleiraImportados(Math.floor(i / 9) + 1) - 0.07);
    assert.ok(bounds.min.x >= PRODUTOS.guloseima.prateleira.x - 0.6);
    assert.ok(bounds.max.x < PRODUTOS.guloseima.prateleira.x);
    for (const outro of produtos.slice(i + 1)) assert.equal(bounds.intersectsBox(new THREE.Box3().setFromObject(outro)), false);
  }
  assert.equal(CLASSES_PRODUTOS.doces.gondola, 0);
  assert.equal(CLASSES_PRODUTOS.doces.lado, -1);
  assert.ok(produtos[9].getObjectByName('aro-lata-biscoitos'));
  assert.ok(produtos[18].getObjectByName('solda-pacote-balas'));
});

test('corredor das guloseimas tem rotas de compra, coleta, reposição e saída livres', () => {
  const sim = loja(); sim.comprarMelhoria('prateleirasImportados');
  for (const destino of [sim.produtos.guloseima.coleta, sim.produtos.guloseima.reposicao, ...sim.produtos.guloseima.pontosCompra, CONFIG.clienteCaixa]) {
    const ator = Object.assign(sim.estado.jogador, CONFIG.inicio); let chegou = false;
    for (let i = 0; i < 3000 && !chegou; i++) chegou = sim.caminharCliente(ator, destino, 0.05);
    assert.ok(chegou, JSON.stringify(destino));
  }
  const face = geometriaEstacao('guloseima', 'reposicao');
  assert.ok(distanciaEstacao(PRODUTOS.enlatado.reposicao, face) > CONFIG.raioInteracao);
});

test('pacotes de guloseimas mantêm volume e não se atravessam no transporte', () => {
  const modelo = personagem(0xffffff, 0xf2c49c, true);
  Cena.prototype.animarPersonagem(modelo, { x: 0, z: 0, andando: false }, 1, 0, Array(8).fill('guloseima'));
  const volumes = modelo.userData.carga.children.map(p => new THREE.Box3().setFromObject(p.clone()));
  for (const [i, a] of volumes.entries()) {
    assert.ok(a.max.z - a.min.z > 0.08);
    for (const b of volumes.slice(i + 1)) assert.equal(a.intersectsBox(b), false);
  }
});

test('repositor abastece guloseimas e cliente compra pelo preço da classe', () => {
  const sim = loja(); sim.comprarMelhoria('prateleirasImportados');
  sim.encomendarImportacoes({ importarDoces: 1 });
  for (let i = 0; i < 18000 && (sim.estado.deposito.pedidos.length || sim.entregas.caminhao); i++) sim.entregas.atualizar(sim, 0.05);
  sim.estado.melhorias.ajudante = 1;
  for (const [id, estado] of Object.entries(sim.estado.produtos)) if (id !== 'guloseima') estado.liberado = false;
  for (let i = 0; i < 20000 && sim.estado.produtos.guloseima.prateleira < 9; i++) {
    sim.tempo += 0.05; sim.atualizarAjudante(0.05);
  }
  assert.equal(sim.estado.produtos.guloseima.prateleira, 9);
  assert.equal(sim.estado.produtos.guloseima.horta, 0);
  assert.equal(sim.estado.produtos.guloseima.apresentado, true);
  assert.equal(sim.comprarMelhoria('caixa').sucesso, true);
  sim.aleatorio = () => 0;
  assert.equal(sim.criarCliente(), true);
  const cliente = sim.clientes[0], faturamento = sim.estado.estatisticas.faturamento;
  for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
    sim.tempo += 0.05; sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
  }
  assert.equal(cliente.fase, 'fim');
  assert.deepEqual(cliente.itens, ['guloseima']);
  assert.equal(sim.estado.estatisticas.faturamento - faturamento, 40);
});
