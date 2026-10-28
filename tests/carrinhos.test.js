import { prepararMelhoriasAnteriores } from './helpers/progressao.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao, pontoFila } from '../src/jogo/simulacao.js';
import { CONFIG } from '../src/jogo/configuracao.js';
import { CARRINHOS, capacidadeCompraCliente } from '../src/jogo/carrinhos.js';
import { construirEstacionamento } from '../src/jogo/estacionamento.js';
import { aplicarPaletaCarrinho, CARRINHO_CLIENTE, criarCarrinho } from '../src/jogo/carrinhos-visual.js';
import { PALETAS } from '../src/jogo/personalizacao.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function preparar(comprar = true) {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 23 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 20000;
  prepararMelhoriasAnteriores(sim, 'carrinhos');
  // Estes cenários isolam a compra de tomates; outras mercadorias ainda não foram apresentadas.
  for (const [id, produto] of Object.entries(sim.estado.produtos)) if (id !== 'tomate') produto.liberado = false;
  if (comprar) assert.ok(sim.comprarMelhoria('carrinhos').sucesso);
  sim.estado.melhorias.ajudante = 0; // Abastecimento controlado pelo cenário.
  sim.proximoCliente = Infinity; sim.tempo = 5; sim.aleatorio = () => 0;
  sim.definirAssaltosAtivos(false);
  return sim;
}
const pedido = c => c.compras.reduce((total, item) => total + item.desejado, 0);
function passo(sim, estoque = 12) {
  sim.tempo += 0.05;
  if (estoque !== null) sim.estado.produtos.tomate.prateleira = estoque;
  sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
}

test('N24 compra cinco carrinhos por R$ 500 uma vez, exigindo saldo, estacionamento e dez cestas', () => {
  const sim = preparar(false), saldo = sim.estado.dinheiro;
  sim.estado.estatisticas.clientes -= CONFIG.clientesPorNivel;
  assert.equal(sim.comprarMelhoria('carrinhos').sucesso, false);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  for (const requisito of ['estacionamento', 'cestasExtras']) {
    sim.estado.melhorias[requisito] = 0;
    assert.equal(sim.comprarMelhoria('carrinhos').sucesso, false);
    sim.estado.melhorias[requisito] = 1;
  }
  sim.estado.dinheiro = 499;
  assert.equal(sim.comprarMelhoria('carrinhos').sucesso, false);
  sim.estado.dinheiro = saldo;
  assert.equal(sim.comprarMelhoria('carrinhos').sucesso, true);
  assert.equal(sim.estado.dinheiro, saldo - 500);
  assert.equal(sim.comprarMelhoria('carrinhos').sucesso, false);
  assert.equal(sim.totalCarrinhos, 5); assert.equal(sim.totalCestas, 10); assert.equal(sim.limiteClientesLoja, 15);
});

test('dez cestas e cinco carrinhos reservam quinze lugares; o próximo pedestre passa pela calçada', () => {
  const sim = preparar(); sim.aleatorio = () => 0.99;
  for (let i = 0; i < 16; i++) {
    assert.equal(sim.criarCliente(), true);
    Object.assign(sim.clientes.at(-1), { x: 0, z: 0 });
  }
  assert.equal(sim.cestasEmUso, 10); assert.equal(sim.carrinhosEmUso, 5);
  assert.equal(sim.carrinhosDisponiveis, 0); assert.equal(sim.clientes.at(-1).fase, 'passando');
  for (const c of sim.clientes.slice(10, 15)) {
    assert.equal(capacidadeCompraCliente(c), 20);
    assert.ok(pedido(c) >= 10 && pedido(c) <= 20);
  }
  assert.ok(sim.clientes.slice(0, 10).every(c => !c.usaCarrinho && pedido(c) <= 5));
});

test('pedestres com carrinho pedem de dez a vinte itens, inclusive pão e pouca variedade', () => {
  for (const sorteio of [0, 0.5, 0.999]) for (const produtos of [['tomate'], ['pao'], ['tomate', 'pao']]) {
    const sim = preparar();
    sim.estado.melhorias.estacionamento = 0; // Isola o pedido a pé, sem sortear um motorista.
    sim.clientes = Array.from({ length: 10 }, (_, i) => ({ id: -i - 1, cestaReservada: true, x: 0, z: 0 }));
    sim.aleatorio = () => sorteio;
    for (const [id, p] of Object.entries(sim.estado.produtos)) p.liberado = p.apresentado = produtos.includes(id);
    assert.ok(sim.criarCliente());
    assert.equal(pedido(sim.clientes.at(-1)), 10 + Math.floor(sorteio * 11));
  }
});

test('motorista reserva carrinho e tenta vinte itens com qualquer reputação, inclusive pão', () => {
  for (const reputacao of ['irritado', 'neutro', 'feliz']) for (const produtos of [['tomate'], ['pao'], ['tomate', 'pao']]) {
    const sim = preparar(); sim.estado.satisfacoesRecentes = Array(10).fill(reputacao);
    for (const [id, p] of Object.entries(sim.estado.produtos)) p.liberado = p.apresentado = produtos.includes(id);
    assert.ok(sim.criarCliente());
    const c = sim.clientes[0];
    assert.ok(c.carroId && c.carrinhoReservado && !c.cestaReservada);
    assert.equal(pedido(c), 20);
  }
});

test('motorista retira carrinho no estacionamento, compra vinte itens, paga e devolve antes de embarcar', () => {
  const sim = preparar(); sim.estado.produtos.laranja.apresentado = false;
  sim.criarCliente(); const c = sim.clientes[0];
  let chegouManobra = false, retirou = false, puxou = false, devolveu = false, empurrou = false, pagou = false;
  for (let i = 0; i < 12000 && c.fase !== 'fim'; i++) {
    const tinha = c.temCarrinho, fase = c.fase, etapa = c.etapa, x = c.x;
    passo(sim);
    if (!c.temCarrinho && etapa === -2 && c.etapa === -3) {
      chegouManobra = true;
      assert.ok(Math.hypot(c.x - CARRINHOS.manobra.x, c.z - CARRINHOS.manobra.z) < 0.1);
    }
    if (!tinha && c.temCarrinho) {
      assert.ok(chegouManobra, 'cliente deve chegar pela traseira antes de tocar no carrinho');
      retirou = true; assert.ok(Math.hypot(c.x - CARRINHOS.retirada.x, c.z - CARRINHOS.retirada.z) < 0.1);
      assert.equal(sim.carrinhosNoSuporte, 4);
    }
    if (c.fase === 'retirandoCarrinho' && c.x < x) {
      puxou = true;
      assert.ok(Math.abs(c.angulo - Math.PI / 2) < 0.1, 'cliente recua olhando para o suporte');
    }
    if (c.embalado && c.temCarrinho) { pagou = true; assert.equal(sim.carrinhosDisponiveis, 4); }
    if (c.fase === 'devolvendoCarrinho' && c.x > x) {
      empurrou = true;
      assert.ok(Math.abs(c.angulo - Math.PI / 2) < 0.1, 'cliente empurra olhando para o suporte');
    }
    if (tinha && !c.temCarrinho) {
      devolveu = true; assert.ok(Math.hypot(c.x - CARRINHOS.retirada.x, c.z - CARRINHOS.retirada.z) < 0.1);
      assert.equal(fase, 'devolvendoCarrinho');
      assert.equal(c.etapa, 2, 'motorista deve seguir direto ao carro depois da devolução');
    }
  }
  assert.equal(c.fase, 'fim', JSON.stringify(c));
  assert.ok(chegouManobra && retirou && puxou && pagou && empurrou && devolveu);
  assert.equal(c.quantidade, 20); assert.equal(c.satisfacao, 'feliz');
  assert.equal(sim.estado.estatisticas.faturamento, 100);
  assert.equal(sim.carrinhosDisponiveis, 5); assert.equal(sim.cestasEmUso, 0);
});

test('falta de estoque e loja fechada liberam o carrinho sem vendas inventadas', () => {
  for (const fechada of [false, true]) {
    const sim = preparar(); sim.criarCliente(); const c = sim.clientes[0];
    if (fechada) sim.estado.lojaAberta = false;
    for (let i = 0; i < 12000 && c.fase !== 'fim'; i++) passo(sim, 0);
    assert.equal(c.fase, 'fim', JSON.stringify(c));
    assert.equal(c.quantidade, 0); assert.equal(sim.carrinhosDisponiveis, 5);
    assert.equal(sim.estado.estatisticas.faturamento, 0);
  }
});

test('saves antigos recebem carrinhos bloqueados e compra nova persiste sem perder as cestas', () => {
  const sim = preparar();
  const salvo = structuredClone(sim.estado);
  assert.equal(new Simulacao(salvo).totalCarrinhos, 5);
  delete salvo.melhorias.carrinhos;
  const antigo = new Simulacao(salvo);
  assert.equal(antigo.totalCarrinhos, 0); assert.equal(antigo.totalCestas, 10);
});

test('quinze compradores circulam, formam fila e liberam todas as cestas e carrinhos', () => {
  const sim = preparar(); sim.aleatorio = () => 0.9; sim.estado.melhorias.caixa = 0;
  for (const id of ['alaTrigo', 'alaProducao', 'alaLeite', 'alaPadaria', 'expansao', 'prateleiraBiscoitosEnlatados', 'prateleiraMantimentosCereais']) {
    assert.equal(sim.estado.melhorias[id], 1, id);
  }
  // Isola a circulação de um grupo de quinze no salão completo.
  for (const [id, produto] of Object.entries(sim.estado.produtos)) produto.liberado = id === 'tomate';
  let criados = 0;
  for (let i = 0; i < 20000; i++) {
    if (criados < 15 && i % 20 === 0 && sim.criarCliente()) criados++;
    passo(sim);
    if (criados === 15 && sim.clientes.every(c => c.fase === 'fila')) break;
  }
  assert.equal(criados, 15);
  assert.equal(sim.cestasEmUso, 10); assert.equal(sim.carrinhosEmUso, 5);
  assert.ok(sim.clientes.every(c => c.fase === 'fila'), JSON.stringify(sim.clientes));
  sim.estado.melhorias.caixa = 1;
  for (let i = 0; i < 20000 && sim.clientes.length; i++) passo(sim);
  assert.equal(sim.clientes.length, 0, JSON.stringify(sim.clientes));
  assert.equal(sim.cestasDisponiveis, 10); assert.equal(sim.carrinhosDisponiveis, 5);
});

test('carrinho com estoque insuficiente vende só o encontrado e é devolvido', () => {
  const sim = preparar(); sim.criarCliente(); const c = sim.clientes[0];
  sim.estado.produtos.tomate.prateleira = 7;
  for (let i = 0; i < 12000 && c.fase !== 'fim'; i++) passo(sim, null);
  assert.equal(c.fase, 'fim'); assert.equal(c.quantidade, 7); assert.equal(c.satisfacao, 'neutro');
  assert.equal(sim.estado.estatisticas.faturamento, 35); assert.equal(sim.carrinhosDisponiveis, 5);
});

test('recarga durante assalto preserva vinte itens no carrinho e sua reserva', () => {
  const sim = preparar();
  sim.estado.banco.assalto = { tempo: 4, invadiu: true, roubado: false, encerrado: false, valor: 0 };
  const salvo = structuredClone(sim.estado);
  salvo.clientesAssalto = [{ id: 1, x: 0, z: 0, fase: 'comprando', produto: 'tomate', usaCarrinho: true,
    temCarrinho: true, carrinhoReservado: true, quantidade: 20, itens: Array(20).fill('tomate'),
    compras: [{ produto: 'tomate', desejado: 20, quantidade: 20 }] }];
  const restaurada = new Simulacao(salvo), c = restaurada.clientes[0];
  assert.equal(c.itens.length, 20); assert.equal(c.compras[0].desejado, 20);
  assert.equal(c.compras[0].quantidade, 20); assert.equal(restaurada.carrinhosDisponiveis, 4);
  assert.ok(c.temCarrinho && c.usaCarrinho && !c.temCesta);
});

test('cinco modelos ficam encaixados no suporte, sem ocupar a retirada ou a fila de quinze clientes', () => {
  const sim = preparar(), visual = construirEstacionamento();
  visual.atualizar(true, 4, [], 0, false, 5, true);
  const suporte = visual.grupo.getObjectByName('carrinhos-estacionamento');
  assert.ok(suporte.visible); assert.equal(suporte.children.filter(c => c.visible).length, 5);
  const volume = new THREE.Box3().setFromObject(suporte);
  assert.ok(volume.min.x >= CARRINHOS.suporte.x - CARRINHOS.suporte.w / 2);
  assert.ok(volume.max.x <= CARRINHOS.suporte.x + CARRINHOS.suporte.w / 2);
  for (const ponto of [CARRINHOS.retirada, CARRINHOS.manobra, ...Array.from({ length: 15 }, (_, i) => pontoFila(i))]) {
    assert.ok(segmentoLivre(ponto, ponto, sim.obstaculos(), 0.32), JSON.stringify(ponto));
  }
  visual.atualizar(true, 0, [], 0, false, 2, true);
  assert.equal(suporte.children.filter(c => c.visible).length, 2);
  visual.atualizar(true, 0, [], 0, false, 0, false);
  assert.equal(suporte.visible, false);
});

test('carrinho vai à frente no deslocamento e ao lado somente durante a compra', () => {
  const carrinho = criarCarrinho();
  const frente = CARRINHO_CLIENTE.frente;
  carrinho.position.set(frente.x, frente.y, frente.z); carrinho.rotation.y = frente.rotacao;
  carrinho.updateWorldMatrix(true, true);
  let volume = new THREE.Box3().setFromObject(carrinho);
  assert.ok(volume.min.z > 0.25, 'ao caminhar, o carrinho deve ficar à frente do cliente');
  assert.ok(Math.abs((volume.min.x + volume.max.x) / 2) < 0.01, 'carrinho dianteiro deve ficar centralizado');
  assert.ok(frente.sacola.z > volume.min.z && frente.sacola.z < volume.max.z,
    'a sacola paga deve ficar dentro do carrinho dianteiro');

  const lateral = CARRINHO_CLIENTE.lateral;
  carrinho.position.set(lateral.x, lateral.y, lateral.z); carrinho.rotation.y = lateral.rotacao;
  carrinho.updateWorldMatrix(true, true);
  volume = new THREE.Box3().setFromObject(carrinho);
  assert.ok(volume.min.x > 0.25, 'carrinho deve ficar separado do corpo e ao lado');
  assert.ok(volume.max.z < 0.4, 'carrinho não pode avançar até a prateleira');
  assert.ok(volume.min.z > -0.4, 'carrinho deve acompanhar a face da prateleira');
  assert.ok(lateral.carga.x > volume.min.x && lateral.carga.x < volume.max.x);
});

test('barra do carrinho acompanha a mesma cor principal das cestas', () => {
  const carrinho = criarCarrinho();
  assert.equal(carrinho.userData.barrasCesta.length, 3);
  for (const paleta of PALETAS) {
    aplicarPaletaCarrinho(carrinho, paleta);
    assert.ok(carrinho.userData.barrasCesta.every(barra => `#${barra.material.color.getHexString()}` === paleta.principal));
  }
  const estacionamento = construirEstacionamento();
  estacionamento.aplicarPaleta(PALETAS[3]);
  const encaixados = estacionamento.grupo.getObjectByName('carrinhos-estacionamento').children;
  assert.ok(encaixados.every(c => c.userData.barrasCesta.every(barra => `#${barra.material.color.getHexString()}` === PALETAS[3].principal)));
});
