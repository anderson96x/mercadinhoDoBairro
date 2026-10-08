import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG, PRODUTOS, MELHORIAS, OFICINAS, ALA_ARTESANAL } from '../src/jogo/configuracao.js';
import { Simulacao, validarEstado, distancia } from '../src/jogo/simulacao.js';
import { Cena, criarProduto } from '../src/jogo/cena.js';
import { construirBairro } from '../src/jogo/bairro.js';

const novos = ['morango', 'mel', 'queijo', 'geleia'];
function abrir(nivel = 15) {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 30000;
  for (const id of ['caixa', 'milho', 'alaProducao', 'alaLeite', 'ajudante', 'alaTrigo', 'cestasExtras', 'alaPadaria',
    'logistica', 'alaArtesanal', 'apiario', 'queijaria', 'irrigacao', 'equipeAgil', 'cozinhaGeleia']) {
    if (MELHORIAS.find(m => m.id === id).nivelMinimo <= nivel) assert.equal(sim.comprarMelhoria(id).sucesso, true, id);
  }
  sim.proximoCliente = Infinity;
  sim.estado.lojaAberta = false;
  return sim;
}
function interagir(sim, ponto) {
  Object.assign(sim.estado.jogador, ponto);
  sim.tempo += 1;
  sim.interagir();
}

test('cada nível de 10 a 15 tem compras com custo, pré-requisitos e limite', () => {
  for (let nivel = 10; nivel <= 15; nivel++) {
    const melhorias = MELHORIAS.filter(m => m.nivelMinimo === nivel && m.ativa !== false);
    assert.ok(melhorias.length);
    for (const m of melhorias) {
      const sim = abrir(nivel - 1);
      assert.match(sim.comprarMelhoria(m.id).motivo, new RegExp(`nível ${nivel}`));
      sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
      sim.estado.dinheiro = m.custo - 1;
      assert.equal(sim.comprarMelhoria(m.id).sucesso, false);
      sim.estado.dinheiro = m.custo;
      assert.equal(sim.comprarMelhoria(m.id).sucesso, true, m.id);
      assert.equal(sim.estado.dinheiro, 0);
      assert.equal(sim.comprarMelhoria(m.id).sucesso, false);
    }
  }
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 350; sim.estado.dinheiro = 30000;
  for (const id of ['alaArtesanal', 'apiario', 'queijaria', 'cozinhaGeleia', 'equipeAgil']) assert.equal(sim.comprarMelhoria(id).sucesso, false, id);
});

test('cesta de trabalho amplia viagens e mantém oito produtos ao recarregar', () => {
  const sim = abrir(10);
  assert.equal(sim.capacidade, 8);
  assert.equal(sim.velocidade, CONFIG.velocidadeInicial * 1.15);
  sim.estado.jogador.inventario = Array(8).fill('tomate');
  const retomado = new Simulacao(structuredClone(sim.estado));
  assert.equal(retomado.capacidade, 8);
  assert.equal(retomado.estado.jogador.inventario.length, 8);
});

test('morango e mel renovam estoque limitado e podem ser colhidos e repostos', () => {
  const sim = abrir(12);
  sim.estado.melhorias.ajudante = 0;
  for (const id of ['morango', 'mel']) {
    const estoque = sim.estado.produtos[id], p = PRODUTOS[id];
    estoque.horta = 0;
    for (let i = 0; i < 1000; i++) sim.atualizar(0.05);
    assert.equal(estoque.horta, p.capacidadeHorta);
    sim.estado.jogador.inventario = [];
    interagir(sim, p.coleta);
    assert.deepEqual(sim.estado.jogador.inventario, [id]);
    const antes = estoque.prateleira;
    interagir(sim, p.reposicao);
    assert.equal(estoque.prateleira, antes + 1);
    assert.equal(estoque.apresentado, true);
  }
});

test('objetivos guiam ingredientes, coleta do lote pronto e primeiro abastecimento', () => {
  const sim = abrir(13);
  sim.estado.produtos.morango.apresentado = true;
  sim.estado.produtos.mel.apresentado = true;
  assert.equal(sim.missao().destino, 'coleta-leite');
  sim.estado.jogador.inventario = ['leite'];
  assert.equal(sim.missao().destino, 'coleta-queijo');
  interagir(sim, PRODUTOS.queijo.coleta);
  sim.atualizarProducao(5);
  assert.equal(sim.missao().destino, 'coleta-queijo');
  interagir(sim, PRODUTOS.queijo.coleta);
  assert.equal(sim.missao().destino, 'prateleira-queijo');
  interagir(sim, PRODUTOS.queijo.reposicao);
  assert.equal(sim.missao().exibir, false);
});

test('clientes simultâneos circulam no anexo e devolvem todas as cestas', () => {
  const sim = abrir(); sim.estado.lojaAberta = true;
  let seed = 152;
  sim.aleatorio = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  for (const id of novos) sim.estado.produtos[id].apresentado = true;
  const clientes = [];
  for (let tick = 0; tick < 8000 && (clientes.length < 10 || sim.clientes.length); tick++) {
    // Isola a circulação: abastecimento abundante, sem assalto ou novas chegadas após a décima.
    for (const [id, estoque] of Object.entries(sim.estado.produtos)) estoque.prateleira = PRODUTOS[id].capacidadePrateleira;
    if (clientes.length < 10 && tick % 30 === 0 && sim.criarCliente()) clientes.push(sim.clientes.at(-1));
    sim.tempo += 0.05; sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
  }
  assert.equal(clientes.length, 10);
  assert.equal(sim.clientes.length, 0);
  assert.equal(sim.estado.estatisticas.clientes, 360);
  assert.equal(sim.cestasDisponiveis, 10);
  assert.ok(clientes.some(c => c.itens.some(id => novos.includes(id))));
});

test('queijaria transforma leite em lote coletável, sem abastecimento mágico', () => {
  const sim = abrir(13), estoque = sim.estado.produtos.queijo;
  sim.estado.jogador.inventario = ['leite'];
  interagir(sim, PRODUTOS.queijo.coleta);
  assert.deepEqual(sim.estado.jogador.inventario, []);
  assert.equal(sim.estado.oficinas.queijo.ingredientes.leite, 1);
  sim.atualizarProducao(2);
  assert.equal(estoque.horta, 0);
  const retomado = new Simulacao(structuredClone(sim.estado));
  retomado.atualizarProducao(3);
  assert.equal(retomado.estado.produtos.queijo.horta, 2);
  assert.equal(retomado.estado.produtos.queijo.prateleira, 0);
  assert.equal(retomado.estado.oficinas.queijo.ingredientes.leite, 0);
  interagir(retomado, PRODUTOS.queijo.coleta);
  interagir(retomado, PRODUTOS.queijo.reposicao);
  assert.equal(retomado.estado.produtos.queijo.prateleira, 1);
});

test('geleia exige os dois ingredientes, pausa com saída cheia e retoma sem perder insumos', () => {
  const sim = abrir(), oficina = sim.estado.oficinas.geleia, estoque = sim.estado.produtos.geleia;
  sim.estado.jogador.inventario = ['morango', 'morango'];
  interagir(sim, PRODUTOS.geleia.coleta); interagir(sim, PRODUTOS.geleia.coleta);
  sim.atualizarProducao(60);
  assert.equal(estoque.horta, 0);
  assert.equal(oficina.ingredientes.morango, 2);
  sim.estado.jogador.inventario.push('mel'); interagir(sim, PRODUTOS.geleia.coleta);
  sim.atualizarProducao(6);
  assert.equal(estoque.horta, 3);
  assert.deepEqual(oficina.ingredientes, { morango: 0, mel: 0 });
  estoque.horta = 9; oficina.ingredientes = { morango: 2, mel: 1 };
  sim.atualizarProducao(60);
  assert.deepEqual(oficina.ingredientes, { morango: 2, mel: 1 });
  for (let i = 0; i < 3; i++) interagir(sim, PRODUTOS.geleia.coleta);
  sim.atualizarProducao(6);
  assert.equal(estoque.horta, 9);
  assert.equal(oficina.produzidos, 6);
});

test('depósito cheio não consome ingredientes e pausa congela receitas', () => {
  const sim = abrir(), oficina = sim.estado.oficinas.queijo;
  oficina.ingredientes.leite = OFICINAS.queijo.capacidadeEntrada;
  sim.estado.jogador.inventario = ['leite'];
  interagir(sim, PRODUTOS.queijo.coleta);
  assert.deepEqual(sim.estado.jogador.inventario, ['leite']);
  sim.pausado = true; sim.atualizar(10);
  assert.equal(oficina.progresso, 0);
  assert.equal(oficina.ingredientes.leite, 8);
});

test('novos produtos só entram nos pedidos após abastecer e todos chegam ao caixa', () => {
  const sim = abrir(); sim.aleatorio = () => 0; sim.estado.lojaAberta = true;
  for (let i = 0; i < 30; i++) {
    sim.clientes = []; sim.criarCliente();
    assert.ok(sim.clientes[0].compras.every(c => !novos.includes(c.produto)));
  }
  for (const id of novos) {
    sim.estado.produtos[id].prateleira = 12;
    let cliente;
    for (let i = 0; i < 30; i++) {
      sim.clientes = []; sim.criarCliente();
      if (sim.clientes[0].compras[0].produto === id) { cliente = sim.clientes[0]; break; }
    }
    assert.ok(cliente, id);
    const receitaAntes = sim.estado.estatisticas.faturamento;
    for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) { sim.tempo += 0.05; sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05); }
    assert.equal(cliente.fase, 'fim', id);
    assert.equal(sim.estado.estatisticas.faturamento - receitaAntes, PRODUTOS[id].preco, id);
  }
});

test('todas as bancas, oficinas e pontos de compra têm rotas livres na loja ampliada', () => {
  const sim = abrir();
  for (const id of novos) {
    const p = PRODUTOS[id];
    for (const ponto of [p.coleta, p.reposicao, ...p.pontosCompra]) {
      const ator = { ...CONFIG.inicio };
      let chegou = false;
      for (let i = 0; i < 3000 && !chegou; i++) { sim.tempo += 0.05; chegou = sim.caminharCliente(ator, ponto, 0.05); }
      assert.equal(chegou, true, `${id}: ${JSON.stringify(ponto)}; parou em ${JSON.stringify(ator)}`);
      assert.ok(distancia(ator, ponto) < 0.1);
    }
  }
});

test('repositor coleta e abastece todos os novos produtos', () => {
  for (const id of novos) {
    const sim = abrir();
    for (const [produto, p] of Object.entries(sim.estado.produtos)) p.prateleira = PRODUTOS[produto].capacidadePrateleira;
    const estoque = sim.estado.produtos[id]; estoque.prateleira = 0; estoque.horta = 8;
    for (let i = 0; i < 6000 && estoque.prateleira < 8; i++) { sim.tempo += 0.05; sim.atualizarAjudante(0.05); }
    assert.equal(estoque.prateleira, 8, id);
    assert.equal(estoque.apresentado, true, id);
  }
});

test('irrigação acelera hortas e reposição ágil reduz o tempo das viagens', () => {
  const sim = abrir(14); sim.estado.melhorias.ajudante = 0;
  assert.equal(sim.velocidadeAjudante, 2.8 * 1.3);
  for (const [id, p] of Object.entries(PRODUTOS).filter(([, p]) => p.origem === 'horta')) {
    const estoque = sim.estado.produtos[id]; estoque.horta = 0; estoque.crescimento = 0;
    for (let i = 0; i < 100; i++) sim.atualizar(p.tempoCrescimento * 0.75 / 100 + 1e-8);
    assert.equal(estoque.horta, 1, id);
  }
});

test('save anterior ganha campos padrão; save novo preserva oficinas e valida valores', () => {
  const antigo = new Simulacao().estado; delete antigo.oficinas;
  for (const id of novos) delete antigo.produtos[id];
  const migrado = validarEstado(antigo);
  for (const id of novos) assert.equal(migrado.produtos[id].liberado, false);
  const sim = abrir();
  sim.estado.oficinas.geleia = { ingredientes: { morango: Infinity, mel: 999 }, progresso: NaN, produzidos: -3 };
  const salvo = validarEstado(sim.estado);
  assert.deepEqual(salvo.oficinas.geleia, { ingredientes: { morango: 0, mel: 8 }, progresso: 0, produzidos: 0 });
  assert.equal(salvo.estagioLoja, ALA_ARTESANAL.indice);
  for (const id of novos) assert.equal(salvo.produtos[id].liberado, true);
});

test('estufa, colmeia, oficinas e produtos têm modelos próprios', () => {
  const visual = { cena: new THREE.Scene(), sim: abrir(), produtos: {}, criarLabel() {} };
  for (const id of novos) {
    Cena.prototype.construirArtesanal.call(visual, id, PRODUTOS[id]);
    assert.equal(visual.produtos[id].grupo.visible, true);
    assert.equal(visual.produtos[id].frutas.length, PRODUTOS[id].capacidadePrateleira);
    assert.equal(visual.produtos[id].frutos.length, PRODUTOS[id].capacidadeHorta);
    assert.ok(criarProduto(id).children.length > 1);
  }
  assert.equal(visual.produtos.mel.abelhas.length, 5);
  assert.ok(visual.produtos.queijo.grupo.userData.mexedor);
  assert.ok(visual.produtos.morango.irrigador);
});

test('anexo abre passagem e preserva alas anteriores durante a construção', () => {
  const cena = new THREE.Scene();
  const mesh = (g, w, h, d, cor, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()); g.add(m); m.position.set(x || 0, y || 0, z || 0); return m; };
  const bairro = construirBairro(cena, { caixa: mesh, cilindro: mesh, esfera: mesh });
  bairro.atualizarEstagio(4);
  assert.equal(cena.getObjectByName('ala-artesanal').visible, false);
  assert.equal(cena.getObjectByName('parede-passagem-artesanal').visible, true);
  bairro.atualizarEstagio(5);
  assert.equal(cena.getObjectByName('ala-artesanal').visible, true);
  assert.equal(cena.getObjectByName('parede-passagem-artesanal').visible, false);
  assert.equal(cena.getObjectByName('ala-trigo').scale.x, 1);
  bairro.atualizarEstagio(5, 4);
  assert.equal(cena.getObjectByName('ala-artesanal').scale.y, 1);
});
