import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG, MELHORIAS, PRODUTOS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { Cena } from '../src/jogo/cena.js';
import { construirPrateleirasImportados } from '../src/jogo/prateleiras-importados.js';

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
  const variedades = latas.map(lata => lata.userData.variedade);
  assert.deepEqual([...new Set(variedades)], ['milho', 'atum', 'sardinha-azul', 'sardinha-vermelha']);
  for (const variedade of new Set(variedades)) {
    assert.equal(variedades.filter(item => item === variedade).length, 9);
  }
  for (const lata of latas) {
    const rotulo = lata.getObjectByName('rotulo-enlatado');
    assert.ok(rotulo.material.userData.svg.endsWith(`${lata.userData.variedade}.svg`));
    assert.equal(rotulo.geometry.type, 'PlaneGeometry');
    const frente = lata.localToWorld(rotulo.position.clone());
    assert.ok(frente.x < lata.position.x, 'rótulo aponta para o corredor');
    const caixa = new THREE.Box3().setFromObject(lata);
    assert.ok(caixa.max.z - caixa.min.z < 0.55, 'embalagens cabem entre vizinhas');
  }
  assert.ok(latas[0].userData.altura > latas[9].userData.altura);
  assert.ok(latas[9].userData.altura > latas[18].userData.altura);
  assert.ok(latas[18].getObjectByName('tampa-svg-enlatado'));
  assert.ok(latas[27].getObjectByName('tampa-svg-enlatado'));
  assert.ok(latas.slice(0, 9).every(lata => lata.position.y === latas[0].position.y));
  assert.ok(latas.slice(9, 18).every(lata => lata.position.y > latas[0].position.y));
});

test('gôndola cheia mantém enlatados e cereais sobre as tábuas, sem esconder produtos nas bordas', () => {
  const caixa = (pai, w, h, d, cor, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: cor }));
    mesh.position.set(x, y, z); pai.add(mesh); return mesh;
  };
  const movel = construirPrateleirasImportados(caixa);
  movel.atualizar({ prateleirasImportados: 2 });
  movel.grupo.updateMatrixWorld(true);
  const tabuas = movel.grupo.children[0].children.filter(o => o.name === 'nivel-prateleira-importados')
    .map(o => new THREE.Box3().setFromObject(o));
  const visual = { cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  for (const id of ['enlatado', 'cereal']) {
    Cena.prototype.construirImportado.call(visual, id, PRODUTOS[id]);
    for (const [i, produto] of visual.produtos[id].frutas.entries()) {
      const limite = new THREE.Box3().setFromObject(produto), nivel = Math.floor(i / 9), tabua = tabuas[nivel];
      assert.ok(Math.abs(limite.min.y - tabua.max.y) < 0.001, `${id}: base sobre a tábua ${nivel}`);
      assert.ok(limite.min.x > tabua.min.x && limite.max.x < tabua.max.x, `${id}: embalagem dentro da largura da tábua`);
      assert.ok(limite.min.z > tabua.min.z && limite.max.z < tabua.max.z, `${id}: embalagem dentro do comprimento da tábua`);
      if (nivel < 3) assert.ok(limite.max.y < tabuas[nivel + 1].min.y, `${id}: topo livre da tábua superior`);
      const frente = id === 'enlatado' ? limite.min.x : limite.max.x;
      const borda = id === 'enlatado' ? tabua.min.x : tabua.max.x;
      assert.ok(Math.abs(Math.abs(frente - borda) - 0.06) < 0.001, 'frentes alinhadas com recuo uniforme');
    }
    const produtos = visual.produtos[id].frutas;
    assert.ok(Math.abs(produtos[0].position.z + produtos[8].position.z - 2 * PRODUTOS[id].prateleira.z) < 0.001, 'margens simétricas nas pontas');
  }
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

test('cereais têm embalagens em quatro cores na face oposta aos enlatados da gôndola', () => {
  const visual = { cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  for (const id of ['cereal', 'enlatado']) Cena.prototype.construirImportado.call(visual, id, PRODUTOS[id]);
  const cereais = visual.produtos.cereal.frutas, latas = visual.produtos.enlatado.frutas;
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
