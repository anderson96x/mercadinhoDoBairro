import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG, MELHORIAS, PRODUTOS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { Cena } from '../src/jogo/cena.js';

function abrir(nivel = 19, dinheiro = 2000) {
  const sim = new Simulacao();
  sim.proximoCliente = Infinity;
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = dinheiro;
  return sim;
}

test('importação exige nível 19, gôndola e R$ 270', () => {
  const opcao = MELHORIAS.find(melhoria => melhoria.id === 'importarProdutos');
  assert.equal(opcao.categoria, 'importados');
  assert.equal(opcao.titulo, 'Enlatados');
  const bloqueado = abrir(18);
  assert.match(bloqueado.comprarMelhoria('importarProdutos').motivo, /nível 19/);

  const sim = abrir();
  assert.match(sim.comprarMelhoria('importarProdutos').motivo, /Prateleiras de importados/);
  sim.comprarMelhoria('prateleirasImportados');
  assert.match(sim.comprarMelhoria('importarProdutos').motivo, /Expansão/);
  sim.estado.melhorias.expansao = 1;
  sim.estado.dinheiro = 269;
  assert.equal(sim.comprarMelhoria('importarProdutos').sucesso, false);
  assert.equal(sim.estado.produtos.enlatado.prateleira, 0);
});

test('cada caixa encomenda 9 enlatados vendidos por R$ 30, sem estoque instantâneo', () => {
  const sim = abrir();
  sim.comprarMelhoria('prateleirasImportados');
  sim.estado.melhorias.expansao = 1; sim.estado.melhorias.estacionamento = 1;
  const saldo = sim.estado.dinheiro;

  assert.equal(sim.comprarMelhoria('importarProdutos').sucesso, true);
  assert.equal(sim.estado.dinheiro, saldo - 270);
  assert.equal(sim.estado.produtos.enlatado.prateleira, 0);
  assert.equal(sim.estado.produtos.enlatado.horta, 0);
  assert.equal(sim.estado.deposito.pedidos[0].pacotes.length, 1);
  assert.equal(sim.estado.produtos.enlatado.liberado, true);
  assert.equal(sim.estado.produtos.enlatado.apresentado, false);
  assert.equal(PRODUTOS.enlatado.preco, 30);

  const segundoPedido = sim.comprarMelhoria('importarProdutos');
  assert.equal(segundoPedido.sucesso, false);
  assert.match(segundoPedido.motivo, /Aguarde o caminhão/);
  assert.equal(sim.estado.deposito.pedidos.length, 1);
  assert.equal(sim.estado.dinheiro, saldo - 270);
});

test('saves antigos preservam enlatados na gôndola e recebem depósito vazio', () => {
  const sim = abrir(19, 5000);
  sim.comprarMelhoria('prateleirasImportados');
  sim.estado.melhorias.importarProdutos = 4;
  Object.assign(sim.estado.produtos.enlatado, { liberado: true, apresentado: true, prateleira: 36 });
  delete sim.estado.deposito;

  const restaurado = new Simulacao(structuredClone(sim.estado));
  assert.equal(restaurado.estado.produtos.enlatado.prateleira, 36);
  assert.equal(restaurado.estado.melhorias.importarProdutos, 4);
  assert.deepEqual(restaurado.estado.deposito.pacotes, []);
  assert.deepEqual(restaurado.estado.deposito.pedidos, []);
});

test('gôndola é preenchida de baixo para cima, com nove produtos por nível', () => {
  const visual = { cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  Cena.prototype.construirImportado.call(visual, 'enlatado', PRODUTOS.enlatado);
  const latas = visual.produtos.enlatado.frutas;

  assert.equal(latas.length, 36);
  assert.equal(new Set(latas.map(lata => lata.position.y)).size, 4);
  for (let i = 1; i < latas.length; i++) assert.ok(latas[i].position.y >= latas[i - 1].position.y);
  const cores = latas.map(lata => lata.children[0].material.color.getHex());
  assert.equal(new Set(cores).size, 4);
  for (const cor of new Set(cores)) {
    assert.equal(cores.filter(item => item === cor).length, 9);
  }
  assert.ok(latas.slice(0, 9).every(lata => lata.position.y === latas[0].position.y));
  assert.ok(latas.slice(9, 18).every(lata => lata.position.y > latas[0].position.y));
});

test('cereais exigem nível 20 e saldo, reservam sua classe e preservam saves antigos', () => {
  const sim = abrir(19);
  sim.estado.melhorias.prateleirasImportados = 1;
  sim.estado.melhorias.expansao = 1;
  assert.match(sim.comprarMelhoria('importarCereais').motivo, /nível 20/);
  for (const id of ['alaProducao', 'alaLeite', 'alaTrigo', 'alaPadaria']) sim.estado.melhorias[id] = 1;
  sim.estado.estatisticas.clientes = 19 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 404;
  assert.equal(sim.comprarMelhoria('importarCereais').sucesso, false);
  sim.estado.dinheiro = 5000;
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1, importarCereais: 5 }).sucesso, false);
  assert.equal(sim.estado.dinheiro, 5000);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1, importarCereais: 4 }).sucesso, true);
  assert.equal(sim.estado.dinheiro, 5000 - 270 - 4 * 405);
  assert.equal(PRODUTOS.cereal.preco, 45);
  assert.equal(sim.estado.produtos.cereal.prateleira, 0);
  assert.equal(sim.estado.produtos.cereal.apresentado, false);
  const restaurado = new Simulacao(structuredClone(sim.estado));
  for (let i = 0; i < 18000 && (restaurado.estado.deposito.pedidos.length || restaurado.entregas.caminhao); i++) restaurado.entregas.atualizar(restaurado, 0.05);
  assert.equal(restaurado.estado.produtos.cereal.horta, 36);
  assert.deepEqual(restaurado.estado.deposito.pacotes.filter(p => p.produto === 'cereal').map(p => p.slot), [8, 9, 10, 11]);
  Object.assign(restaurado.estado.jogador, restaurado.produtos.cereal.coleta);
  restaurado.tempo = 10; restaurado.interagir();
  assert.deepEqual(restaurado.estado.jogador.inventario, ['cereal']);
  Object.assign(restaurado.estado.jogador, restaurado.produtos.cereal.reposicao);
  restaurado.tempo++; restaurado.interagir();
  assert.equal(restaurado.estado.produtos.cereal.prateleira, 1);
  assert.equal(restaurado.estado.produtos.cereal.apresentado, true);
  restaurado.estado.melhorias.ajudante = 1;
  for (const [id, p] of Object.entries(restaurado.estado.produtos)) if (id !== 'cereal') p.prateleira = restaurado.produtos[id].capacidadePrateleira;
  for (let i = 0; i < 20000 && restaurado.estado.produtos.cereal.prateleira < 36; i++) { restaurado.tempo += 0.05; restaurado.atualizarAjudante(0.05); }
  assert.equal(restaurado.estado.produtos.cereal.prateleira, 36);
  for (const destino of [...restaurado.produtos.cereal.pontosCompra, CONFIG.clienteCaixa]) {
    const ator = { ...restaurado.produtos.cereal.coleta };
    let chegou = false;
    for (let i = 0; i < 3000 && !chegou; i++) chegou = restaurado.caminharCliente(ator, destino, 0.05);
    assert.ok(chegou, `Rota de cereais: ${JSON.stringify(destino)}`);
  }
  const antigo = structuredClone(sim.estado);
  delete antigo.produtos.cereal; delete antigo.melhorias.importarCereais; antigo.deposito.pedidos = [];
  const migrado = new Simulacao(antigo);
  assert.equal(migrado.estado.produtos.cereal.liberado, false);
  assert.equal(migrado.estado.produtos.cereal.prateleira, 0);
});

test('cereais têm embalagens em quatro cores iguais às latas na face oposta da gôndola', () => {
  const visual = { cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  for (const id of ['cereal', 'enlatado']) Cena.prototype.construirImportado.call(visual, id, PRODUTOS[id]);
  const cereais = visual.produtos.cereal.frutas, latas = visual.produtos.enlatado.frutas;
  assert.deepEqual(cereais.map(p => p.children[0].material.color.getHex()), latas.map(p => p.children[0].material.color.getHex()));
  assert.equal(new Set(cereais.map(p => p.children[0].material.color.getHex())).size, 4);
  for (const p of cereais) {
    assert.equal(p.children[0].geometry.type, 'BoxGeometry');
    assert.ok(p.getObjectByName('topo-caixa-cereal'));
    assert.ok(p.getObjectByName('lateral-caixa-cereal'));
    assert.ok(p.getObjectByName('selo-caixa-cereal'));
    assert.ok(p.getObjectByName('faixa-caixa-cereal'));
    assert.ok(p.position.x > PRODUTOS.cereal.prateleira.x);
    const frente = p.getObjectByName('selo-caixa-cereal');
    const posicaoFrente = p.localToWorld(frente.position.clone());
    assert.ok(posicaoFrente.x > p.position.x, 'arte frontal aponta para o corredor, longe da divisória');
  }
  assert.ok(latas.every(p => p.position.x < PRODUTOS.enlatado.prateleira.x));
});
