import { prepararMelhoriasAnteriores } from './helpers/progressao.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao, validarEstado } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { SUCOS, produzirSucos } from '../src/jogo/sucos.js';
import { Cena, criarProduto } from '../src/jogo/cena.js';
import { resumoProducao } from '../src/interface/producao.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';
import { criarMaquinaSucos, animarMaquinaSucos, GELADEIRA_SUCOS } from '../src/jogo/sucos-visual.js';

function preparar(nivel = 23) {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 100000;
  prepararMelhoriasAnteriores(sim, 'sucos');
  return sim;
}

test('geladeira exige N23, instalações, saldo e compra única de R$ 1.000', () => {
  const sim = preparar(22);
  assert.equal(sim.comprarMelhoria('sucos').sucesso, false);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 999;
  assert.equal(sim.comprarMelhoria('sucos').sucesso, false);
  sim.estado.dinheiro = 1000;
  assert.equal(sim.comprarMelhoria('sucos').sucesso, true);
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(sim.comprarMelhoria('sucos').sucesso, false);
  for (const id of Object.keys(SUCOS.sabores)) {
    assert.equal(sim.estado.produtos[id].liberado, true);
    assert.equal(PRODUTOS[id].preco, 25);
    assert.equal(sim.estado.produtos[id].apresentado, false);
  }
  const semQueijo = preparar(); semQueijo.estado.melhorias.queijaria = 0;
  assert.equal(semQueijo.comprarMelhoria('sucos').sucesso, false);
});

test('clientes de sabores diferentes ocupam posições separadas diante da geladeira', () => {
  const sim = preparar(); sim.comprarMelhoria('sucos');
  const sabores = Object.keys(SUCOS.sabores);
  sim.clientes = sabores.map((produto, indice) => ({
    id: indice + 1, produto, pontoCompra: indice, fase: 'comprando'
  }));
  for (const [indice, produto] of sabores.entries()) {
    const cliente = sim.clientes[indice];
    sim.clientes.splice(indice, 1);
    assert.equal(sim.escolherPontoCompra(cliente, produto), indice);
    sim.clientes.splice(indice, 0, cliente);
  }
  const posicoes = sabores.map(id => {
    const cliente = sim.clientes.find(c => c.produto === id);
    return PRODUTOS[id].pontosCompra[cliente.pontoCompra].x;
  });
  assert.equal(new Set(posicoes).size, sabores.length);
});

test('entrega aceita frutas e cada receita aguarda coleta no balcão antes de abastecer', () => {
  for (const [id, receita] of Object.entries(SUCOS.sabores)) {
    const sim = preparar(); sim.comprarMelhoria('sucos');
    sim.estado.sucos.proximo = Object.keys(SUCOS.sabores).indexOf(id);
    sim.estado.jogador.inventario = ['tomate', ...Object.keys(receita.ingredientes)];
    Object.assign(sim.estado.jogador, SUCOS.entrega);
    for (let i = 0; i < 4; i++) { sim.tempo++; sim.interagir(); }
    assert.deepEqual(sim.estado.jogador.inventario, ['tomate']);
    produzirSucos(sim.estado, 2);
    const salvo = validarEstado(structuredClone(sim.estado));
    assert.equal(salvo.sucos.progresso[id], 2);
    produzirSucos(salvo, 3);
    assert.equal(salvo.produtos[id].horta, receita.rendimento);
    assert.equal(salvo.produtos[id].prateleira, 0);
    assert.equal(salvo.produtos[id].apresentado, false);
    for (const fruta of Object.keys(receita.ingredientes)) assert.equal(salvo.sucos.ingredientes[fruta], 0);
    const retomado = new Simulacao(salvo);
    retomado.estado.jogador.inventario = [];
    Object.assign(retomado.estado.jogador, SUCOS.entrega);
    for (let i = 0; i < receita.rendimento; i++) { retomado.tempo++; retomado.interagir(); }
    assert.equal(retomado.estado.produtos[id].horta, 0);
    assert.deepEqual(retomado.estado.jogador.inventario, Array(receita.rendimento).fill(id));
    Object.assign(retomado.estado.jogador, SUCOS.cliente);
    for (let i = 0; i < receita.rendimento; i++) { retomado.tempo++; retomado.interagir(); }
    assert.equal(retomado.estado.produtos[id].prateleira, receita.rendimento);
    assert.equal(retomado.estado.produtos[id].apresentado, true);
  }
});

test('pausa, balcão cheio, entrada cheia e saves antigos preservam ingredientes', () => {
  const sim = preparar(); sim.comprarMelhoria('sucos');
  sim.estado.sucos.ingredientes = { laranja: 8, morango: 8, maca: 8 };
  for (const id of Object.keys(SUCOS.sabores)) sim.estado.produtos[id].horta = 6;
  const antes = structuredClone(sim.estado.sucos);
  produzirSucos(sim.estado, 100);
  assert.deepEqual(sim.estado.sucos, antes);
  sim.estado.produtos.sucoLaranja.horta = 0;
  produzirSucos(sim.estado, 0);
  assert.deepEqual(sim.estado.sucos, antes);
  Object.assign(sim.estado.jogador, SUCOS.entrega);
  sim.estado.jogador.inventario = ['laranja']; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['laranja']);
  assert.equal(resumoProducao(sim.estado).filter(p => SUCOS.sabores[p.id]).length, 4);
  delete sim.estado.sucos; delete sim.estado.melhorias.sucos;
  const antigo = validarEstado(sim.estado);
  assert.deepEqual(antigo.sucos.ingredientes, { laranja: 0, morango: 0, maca: 0 });
  assert.equal(antigo.produtos.sucoMisto.liberado, false);
  const adulterado = preparar(); adulterado.comprarMelhoria('sucos');
  adulterado.estado.melhorias.alaLeite = 0;
  const validado = validarEstado(adulterado.estado);
  assert.equal(validado.melhorias.queijaria, 0);
  assert.equal(validado.melhorias.sucos, 0);
  assert.equal(validado.produtos.sucoLaranja.liberado, false);
});

test('modelo compartilha máquina e geladeira, garrafas distintas e reserva livre', () => {
  const sim = preparar(); sim.comprarMelhoria('sucos');
  const cena = { cena: new THREE.Scene(), sim, produtos: {}, criarLabel() {} };
  for (const id of Object.keys(SUCOS.sabores)) {
    Cena.prototype.construirSucos.call(cena, id, PRODUTOS[id]);
    assert.ok(criarProduto(id).children.length > 3);
    assert.equal(cena.produtos[id].frutas.length, 6);
    assert.equal(cena.produtos[id].frutos.length, 6);
  }
  let maquinas = 0, geladeiras = 0;
  cena.cena.traverse(o => { if (o.name === 'maquina-sucos') maquinas++; if (o.name === 'geladeira-sucos') geladeiras++; });
  assert.equal(maquinas, 1); assert.equal(geladeiras, 1);
  assert.equal(sim.obstaculos().includes(SUCOS.bancada), true);
  assert.ok(cena.cena.getObjectByName('balcao-sucos'));
  assert.equal(SUCOS.bancada.w, 2.65);
  assert.equal(SUCOS.bancada.d, 1.75);
  const bandeja = cena.cena.getObjectByName('bandeja-garrafas-sucos');
  assert.ok(bandeja);
  const [baseBandeja] = bandeja.children.filter(o => o.geometry?.type === 'BoxGeometry');
  assert.deepEqual(baseBandeja.geometry.parameters, { width: 0.8, height: 0.08, depth: 1.1, widthSegments: 1, heightSegments: 1, depthSegments: 1 });
  assert.equal(SUCOS.bancada.z - SUCOS.bancada.d / 2, -15.3 + 0.14);
  assert.equal(sim.obstaculos().includes(SUCOS.reservaGeladeira), false);
  assert.ok(SUCOS.reservaGeladeira.x - SUCOS.reservaGeladeira.w / 2 > SUCOS.geladeira.x + SUCOS.geladeira.w / 2);
  // A reserva comporta o móvel futuro sem ocupar acessos existentes.
  for (const ponto of [PRODUTOS.morango.reposicao, SUCOS.cliente, { x: CONFIG.portaProducao.x, z: -8.1 }]) {
    assert.ok(segmentoLivre(ponto, ponto, [...sim.obstaculos(), SUCOS.reservaGeladeira], 0.32));
  }
});

test('repositor recolhe os quatro sabores do balcão e abastece a geladeira', () => {
  for (const id of Object.keys(SUCOS.sabores)) {
    const sim = preparar(); sim.comprarMelhoria('sucos'); sim.comprarMelhoria('ajudante');
    for (const [produto, estoque] of Object.entries(sim.estado.produtos)) estoque.prateleira = PRODUTOS[produto].capacidadePrateleira;
    const estoque = sim.estado.produtos[id]; estoque.prateleira = 0; estoque.horta = 3;
    for (let i = 0; i < 6000 && estoque.prateleira < 3; i++) { sim.tempo += 0.05; sim.atualizarAjudante(0.05); }
    assert.equal(estoque.prateleira, 3, id);
    assert.equal(estoque.horta, 0, id);
    assert.equal(estoque.apresentado, true, id);
  }
});

test('abastecer morangos ao lado da geladeira continua selecionando o hortifruti', () => {
  const sim = preparar(); sim.comprarMelhoria('sucos');
  Object.assign(sim.estado.jogador, sim.produtos.morango.reposicao);
  sim.estado.jogador.inventario = ['morango', 'sucoMisto']; sim.tempo++; sim.interagir();
  assert.equal(sim.estado.produtos.morango.prateleira, 1);
  assert.deepEqual(sim.estado.jogador.inventario, ['sucoMisto']);
});

test('cada sabor estreia nos pedidos e vende por R$ 25 no caixa', () => {
  const sim = preparar(); sim.comprarMelhoria('sucos'); sim.comprarMelhoria('caixa');
  sim.aleatorio = () => 0;
  for (let i = 0; i < 30; i++) {
    sim.clientes = []; sim.criarCliente();
    assert.ok(sim.clientes[0].compras.every(c => !SUCOS.sabores[c.produto]));
  }
  for (const id of Object.keys(SUCOS.sabores)) {
    sim.estado.produtos[id].prateleira = 6;
    let cliente;
    for (let i = 0; i < 30; i++) {
      sim.clientes = []; sim.criarCliente();
      if (sim.clientes[0].compras[0].produto === id) { cliente = sim.clientes[0]; break; }
    }
    assert.ok(cliente, id);
    const antes = sim.estado.estatisticas.faturamento;
    for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
      sim.tempo += 0.05; sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
    }
    assert.equal(cliente.fase, 'fim', id);
    assert.equal(sim.estado.estatisticas.faturamento - antes, 25, id);
  }
});

test('máquina mostra líquido girando na cor do sabor e congela sem produção ou na pausa', () => {
  const sim = preparar(); sim.comprarMelhoria('sucos');
  const maquina = criarMaquinaSucos(new THREE.Group()), modelo = maquina.userData.sucos;
  assert.ok(maquina.getObjectByName('cuba-transparente-sucos').material.opacity < 0.3);
  assert.ok(maquina.getObjectByName('cupula-sucos'));
  assert.ok(maquina.getObjectByName('bico-sucos'));
  for (const [indice, [id, sabor]] of Object.entries(SUCOS.sabores).entries()) {
    sim.estado.sucos.proximo = indice;
    sim.estado.sucos.ingredientes = { laranja: 8, morango: 8, maca: 8 };
    sim.estado.sucos.progresso[id] = 0.1;
    const antes = modelo.giro.rotation.y;
    animarMaquinaSucos(maquina, sim.estado, 0.2);
    assert.ok(modelo.giro.rotation.y > antes, id);
    assert.equal(modelo.liquido.material.color.getHex(), sabor.cor, id);
    assert.equal(modelo.superficie.material.color.getHex(), sabor.cor, id);
    const pausado = modelo.giro.rotation.y, superficie = modelo.superficie.rotation.clone();
    animarMaquinaSucos(maquina, sim.estado, 0);
    assert.equal(modelo.giro.rotation.y, pausado);
    assert.ok(modelo.superficie.rotation.equals(superficie));
  }
  const parado = modelo.giro.rotation.y;
  sim.estado.sucos.ingredientes = { laranja: 0, morango: 0, maca: 0 };
  animarMaquinaSucos(maquina, sim.estado, 1);
  assert.equal(modelo.giro.rotation.y, parado);
  sim.estado.sucos.ingredientes = { laranja: 8, morango: 8, maca: 8 };
  for (const id of Object.keys(SUCOS.sabores)) sim.estado.produtos[id].horta = 6;
  animarMaquinaSucos(maquina, sim.estado, 1);
  assert.equal(modelo.giro.rotation.y, parado);
});

test('cuba fica vazia antes do preparo e esvazia ao colocar cada lote nas garrafas', () => {
  const sim = preparar(); sim.comprarMelhoria('sucos');
  const maquina = criarMaquinaSucos(new THREE.Group()), modelo = maquina.userData.sucos;
  const verificarLiquido = visivel => {
    for (const parte of [modelo.liquido, modelo.superficie, modelo.giro]) assert.equal(parte.visible, visivel);
  };
  verificarLiquido(false);
  sim.estado.sucos.ingredientes.laranja = 2;
  animarMaquinaSucos(maquina, sim.estado, 0.1);
  verificarLiquido(false);
  produzirSucos(sim.estado, 2);
  animarMaquinaSucos(maquina, sim.estado, 0.1);
  verificarLiquido(true);
  animarMaquinaSucos(maquina, sim.estado, 0);
  verificarLiquido(true);
  produzirSucos(sim.estado, 3);
  animarMaquinaSucos(maquina, sim.estado, 0.1);
  assert.equal(sim.estado.produtos.sucoLaranja.horta, 1);
  verificarLiquido(false);
  produzirSucos(sim.estado, 0.1);
  animarMaquinaSucos(maquina, sim.estado, 0.1);
  verificarLiquido(true);
  produzirSucos(sim.estado, 4.9);
  animarMaquinaSucos(maquina, sim.estado, 0.1);
  assert.equal(sim.estado.produtos.sucoLaranja.horta, 2);
  verificarLiquido(false);
});

test('geladeira tem porta única e quatro prateleiras com seis garrafas alinhadas por sabor', () => {
  const sim = preparar(); sim.comprarMelhoria('sucos');
  const cena = { cena: new THREE.Scene(), sim, produtos: {}, criarLabel() {} };
  for (const id of Object.keys(SUCOS.sabores)) Cena.prototype.construirSucos.call(cena, id, PRODUTOS[id]);
  const geladeira = cena.cena.getObjectByName('geladeira-sucos');
  assert.equal(geladeira.children.filter(o => o.name === 'porta-vidro-sucos').length, 1);
  for (const [indice, id] of Object.keys(SUCOS.sabores).entries()) {
    const prateleira = geladeira.getObjectByName(`prateleira-sucos-${id}`);
    assert.equal(prateleira.userData.sabor, id);
    const garrafas = cena.produtos[id].frutas;
    const caixas = garrafas.map(o => new THREE.Box3().setFromObject(o));
    const frente = garrafas[0].position.z;
    for (const [i, garrafa] of garrafas.entries()) {
      assert.equal(garrafa.position.z, frente);
      assert.ok(Math.abs(caixas[i].min.y - (prateleira.position.y + 0.035)) < 1e-6);
      const teto = indice === 3 ? 2.7 : GELADEIRA_SUCOS.alturas[indice + 1] - 0.035;
      assert.ok(caixas[i].max.y < teto, 'Garrafas cabem entre as prateleiras');
      if (i) assert.ok(caixas[i].min.x > caixas[i - 1].max.x, 'Garrafas próximas sem sobreposição');
    }
    const largura = caixas.at(-1).max.x - caixas[0].min.x;
    assert.ok(largura > prateleira.geometry.parameters.width * 0.9, 'Fileira ocupa a largura da prateleira');
  }
});

test('garrafas têm ombros cônicos, tampa escura e rótulo verde nas quatro cores de fruta', () => {
  for (const [id, sabor] of Object.entries(SUCOS.sabores)) {
    const garrafa = criarProduto(id);
    const ombros = garrafa.getObjectByName('ombros-garrafa-suco');
    assert.ok(ombros.geometry.parameters.radiusTop < ombros.geometry.parameters.radiusBottom);
    assert.equal(ombros.material.color.getHex(), sabor.cor);
    assert.equal(garrafa.getObjectByName('tampa-garrafa-suco').material.color.getHex(), 0x30464b);
    assert.equal(garrafa.getObjectByName('rotulo-verde-suco').material.color.getHex(), 0x68ae4f);
    assert.equal(garrafa.children.filter(o => o.name === 'faixa-rotulo-suco').length, 2);
    const limites = new THREE.Box3().setFromObject(garrafa);
    assert.ok((limites.max.x - limites.min.x) * 0.55 < 0.21, 'Garrafa deve caber na sua vaga do balcão');
  }
});
