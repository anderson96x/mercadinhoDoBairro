import { prepararMelhoriasAnteriores } from './helpers/progressao.js';
import test from 'node:test';
import { prepararLojaCompleta } from './helpers/loja-completa.js';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG, PRODUTOS, MELHORIAS, SEQUENCIA_MELHORIAS, OFICINAS, ALA_ARTESANAL, ALA_PADARIA } from '../src/jogo/configuracao.js';
import { Simulacao, validarEstado, distancia } from '../src/jogo/simulacao.js';
import { Cena, criarProduto } from '../src/jogo/cena.js';
import { PLANTA_OFICINAS, volumesDoces, selecionarCompartimentoDoces } from '../src/jogo/planta.js';
import { construirBairro } from '../src/jogo/bairro.js';

const novos = ['morango', 'mel', 'queijo', 'geleia'];
function abrir(nivel = 17) {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 30000;
  if (nivel >= 6) prepararLojaCompleta(sim);
  for (const id of SEQUENCIA_MELHORIAS) {
    if (!sim.estado.melhorias[id] && MELHORIAS.find(m => m.id === id).nivelMinimo <= nivel) assert.equal(sim.comprarMelhoria(id).sucesso, true, id);
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

test('cada nível de 10 a 17 tem compras com custo, pré-requisitos e limite', () => {
  for (let nivel = 10; nivel <= 17; nivel++) {
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
  sim.estado.estatisticas.clientes = 0; sim.estado.dinheiro = 30000;
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
  const sim = abrir(14);
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
  const sim = abrir(15);
  sim.estado.produtos.morango.apresentado = true;
  sim.estado.produtos.laranja.apresentado = true;
  sim.estado.produtos.maca.apresentado = true;
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
  assert.notEqual(sim.missao().titulo, 'Macieira');
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
  assert.equal(sim.estado.estatisticas.clientes, 410);
  assert.equal(sim.cestasDisponiveis, 10);
  assert.ok(clientes.some(c => c.itens.some(id => novos.includes(id))));
});

test('queijaria transforma leite em lote coletável, sem abastecimento mágico', () => {
  const sim = abrir(15), estoque = sim.estado.produtos.queijo;
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
      const ator = Object.assign(sim.estado.jogador, CONFIG.inicio);
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

test('irrigação acelera hortas sem alterar a velocidade do repositor', () => {
  const sim = abrir(16); sim.estado.melhorias.ajudante = 0;
  assert.equal(sim.velocidadeAjudante, sim.velocidade);
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
  assert.equal(salvo.estagioLoja, ALA_PADARIA.indice);
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

test('N9 preserva o salão N9 e sua parede posterior, sem anexo', () => {
  const cena = new THREE.Scene();
  const mesh = (g, w, h, d, cor, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()); g.add(m); m.position.set(x || 0, y || 0, z || 0); return m; };
  const bairro = construirBairro(cena, { caixa: mesh, cilindro: mesh, esfera: mesh });
  bairro.atualizarEstagio(4);
  assert.equal(cena.getObjectByName('ala-artesanal'), undefined);
  assert.equal(cena.getObjectByName('parede-passagem-artesanal').visible, true);
  bairro.atualizarEstagio(5);
  assert.equal(cena.getObjectByName('ala-artesanal'), undefined);
  assert.equal(cena.getObjectByName('parede-passagem-artesanal').visible, true);
  assert.equal(cena.getObjectByName('ampliacao-padaria').scale.x, 1);
  bairro.atualizarEstagio(5, 4);
  assert.equal(cena.getObjectByName('parede-passagem-artesanal').visible, true);
});

test('sala das oficinas abre com qualquer fábrica e permite entrar e sair sem porta', () => {
  const cena = new THREE.Scene();
  const mesh = g => { const m = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()); g.add(m); return m; };
  const bairro = construirBairro(cena, { caixa: mesh, cilindro: mesh, esfera: mesh });
  const sala = cena.getObjectByName('sala-oficinas');
  for (const melhoria of ['queijaria', 'cozinhaGeleia']) {
    const sim = abrir(14);
    bairro.atualizarOficinas(sim.estado.produtos);
    assert.equal(sala.visible, false);
    assert.ok(PLANTA_OFICINAS.paredes.every(p => !sim.obstaculos().includes(p)));
    sim.estado.estatisticas.clientes = 400;
    prepararMelhoriasAnteriores(sim, melhoria);
    assert.equal(sim.comprarMelhoria(melhoria).sucesso, true);
    bairro.atualizarOficinas(sim.estado.produtos);
    assert.equal(sala.visible, true);
    assert.ok(PLANTA_OFICINAS.paredes.every(p => sim.obstaculos().includes(p)));
    const id = melhoria === 'queijaria' ? 'queijo' : 'geleia';
    const ator = { x: 11, z: -10.5 };
    for (const destino of [PRODUTOS[id].coleta, { x: 11, z: -10.5 }]) {
      let chegou = false;
      for (let i = 0; i < 1500 && !chegou; i++) { sim.tempo += 0.05; chegou = sim.caminharCliente(ator, destino, 0.05); }
      assert.equal(chegou, true, melhoria);
    }
  }
});

test('N9 posiciona estufa ao lado do curral com canteiro padronizado e conserva saves V12', () => {
  const p = PRODUTOS.morango;
  assert.deepEqual(p.canteiro, PRODUTOS.tomate.canteiro);
  assert.ok(Math.abs(p.horta.z - PRODUTOS.leite.horta.z) <= 0.5);
  assert.ok(p.horta.x - p.canteiro.w / 2 > PRODUTOS.leite.horta.x + PRODUTOS.leite.curral.w / 2);
  assert.equal(p.prateleira.x, PRODUTOS.trigo.prateleira.x);
  assert.ok(Math.abs(p.prateleira.z - PRODUTOS.maca.prateleira.z) - p.prateleira.d < 1e-9);
  const sim = abrir(9);
  const visual = { cena: new THREE.Scene(), sim, produtos: {}, criarLabel() {} };
  Cena.prototype.construirArtesanal.call(visual, 'morango', p);
  for (const fruto of visual.produtos.morango.frutos) {
    assert.ok(Math.abs(fruto.position.x - p.horta.x) < p.canteiro.w / 2);
    assert.ok(Math.abs(fruto.position.z - p.horta.z) < p.canteiro.d / 2);
  }
  sim.estado.versaoLayout = 12;
  sim.estado.jogador.inventario = ['morango'];
  Object.assign(sim.estado.produtos.morango, { horta: 5, prateleira: 7, apresentado: true });
  const migrado = new Simulacao(structuredClone(sim.estado));
  assert.equal(migrado.estado.versaoLayout, CONFIG.versaoLayout);
  assert.deepEqual(migrado.estado.produtos.morango, sim.estado.produtos.morango);
  assert.deepEqual(migrado.estado.jogador.inventario, ['morango']);
  assert.equal(migrado.estado.melhorias.alaArtesanal, 1);
});

test('N14 instala mel na frente direita e mantém os estoques ao migrar saves V14', () => {
  const sim = abrir(13), p = PRODUTOS.mel;
  assert.equal(sim.estado.produtos.mel.liberado, false);
  const visual = { cena: new THREE.Scene(), sim, produtos: {}, criarLabel() {} };
  Cena.prototype.construirArtesanal.call(visual, 'mel', p);
  assert.equal(visual.produtos.mel.grupo.visible, false);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  assert.equal(sim.comprarMelhoria('apiario').sucesso, true);
  assert.equal(sim.estado.estagioLoja, 5);
  assert.ok(p.horta.x > PRODUTOS.morango.horta.x);
  assert.equal(p.horta.z, PRODUTOS.morango.horta.z);
  assert.ok(p.prateleira.x > 14 && p.prateleira.x + p.prateleira.w / 2 < 20.9);
  assert.ok(p.prateleira.z > 3 && p.prateleira.z + p.prateleira.d / 2 < 6.7);
  assert.ok(p.cliente.z < p.prateleira.z - p.prateleira.d / 2);
  Cena.prototype.construirArtesanal.call(visual, 'mel', p);
  assert.equal(visual.produtos.mel.grupo.visible, true);
  for (const pote of visual.produtos.mel.frutas) {
    assert.ok(Math.abs(pote.position.x - p.prateleira.x) < p.prateleira.w / 2);
    assert.ok(Math.abs(pote.position.z - p.prateleira.z) < p.prateleira.d / 2);
  }
  sim.estado.versaoLayout = 14;
  Object.assign(sim.estado.produtos.mel, { horta: 5, prateleira: 7, apresentado: true });
  Object.assign(sim.estado.jogador, { x: 13.2, z: -14.7, inventario: ['mel'] });
  const migrado = new Simulacao(structuredClone(sim.estado));
  assert.equal(migrado.estado.versaoLayout, CONFIG.versaoLayout);
  assert.equal(migrado.estado.melhorias.apiario, 1);
  assert.deepEqual(migrado.estado.produtos.mel, sim.estado.produtos.mel);
  assert.deepEqual(migrado.estado.jogador.inventario, ['mel']);
});

test('N15 instala queijaria na sala dos fundos, refrigerador ao lado do leite e migra produção V15', () => {
  const sim = abrir(14), p = PRODUTOS.queijo;
  assert.equal(sim.estado.produtos.queijo.liberado, false);
  const visual = { cena: new THREE.Scene(), sim, produtos: {}, criarLabel() {} };
  Cena.prototype.construirArtesanal.call(visual, 'queijo', p);
  assert.equal(visual.produtos.queijo.grupo.visible, false);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  assert.equal(sim.comprarMelhoria('queijaria').sucesso, true);
  assert.equal(sim.estado.estagioLoja, 5);
  assert.ok(Math.abs(p.horta.x - PLANTA_OFICINAS.piso.x) + p.curral.w / 2 < PLANTA_OFICINAS.piso.w / 2);
  assert.ok(p.horta.z + p.curral.d / 2 < -9.3);
  assert.ok(p.coleta.z > p.horta.z && p.coleta.z < -9.3);
  const leite = PRODUTOS.leite.prateleira;
  assert.ok(p.prateleira.x - p.prateleira.w / 2 > leite.x + leite.w / 2);
  assert.equal(p.prateleira.z, leite.z);
  assert.equal(p.prateleira.w, leite.w);
  assert.equal(p.prateleira.d, leite.d);
  assert.ok(p.cliente.z > p.prateleira.z + p.prateleira.d / 2);
  Cena.prototype.construirArtesanal.call(visual, 'queijo', p);
  assert.equal(visual.produtos.queijo.grupo.visible, true);
  const fridge = visual.produtos.queijo.refrigerador.grupo;
  assert.equal(fridge.name, 'refrigerador-parede-queijo');
  assert.equal(fridge.children.filter(o => o.name === 'prateleira-queijo').length, 3);
  assert.equal(fridge.children.filter(o => o.name === 'porta-vidro-queijo').length, 2);
  const bounds = new THREE.Box3().setFromObject(fridge);
  assert.ok(bounds.max.y > 2.9);
  assert.ok(bounds.min.x >= p.prateleira.x - p.prateleira.w / 2 - 1e-6);
  assert.ok(bounds.max.x <= p.prateleira.x + p.prateleira.w / 2 + 1e-6);
  assert.ok(bounds.min.z >= p.prateleira.z - p.prateleira.d / 2 - 1e-6);
  assert.ok(bounds.max.z <= p.prateleira.z + p.prateleira.d / 2 + 1e-6);
  assert.equal(visual.produtos.queijo.frutas.length, 12);
  assert.equal(new Set(visual.produtos.queijo.frutas.map(f => f.position.y)).size, 3);
  for (const queijo of visual.produtos.queijo.frutas) {
    assert.ok(Math.abs(queijo.position.x - p.prateleira.x) < p.prateleira.w / 2);
    assert.ok(Math.abs(queijo.position.z - p.prateleira.z) < p.prateleira.d / 2);
    const b = new THREE.Box3().setFromObject(queijo);
    assert.ok(b.min.x > bounds.min.x && b.max.x < bounds.max.x);
    assert.ok(b.min.z > bounds.min.z && b.max.z < bounds.max.z);
  }
  sim.estado.versaoLayout = 15;
  Object.assign(sim.estado.oficinas.queijo, { ingredientes: { leite: 2 }, progresso: 2, produzidos: 4 });
  Object.assign(sim.estado.produtos.queijo, { horta: 3, prateleira: 7, apresentado: true });
  Object.assign(sim.estado.jogador, { x: 19.2, z: -16, inventario: ['queijo'] });
  const migrado = new Simulacao(structuredClone(sim.estado));
  assert.equal(migrado.estado.versaoLayout, CONFIG.versaoLayout);
  assert.equal(migrado.estado.melhorias.queijaria, 1);
  assert.deepEqual(migrado.estado.oficinas.queijo, sim.estado.oficinas.queijo);
  assert.deepEqual(migrado.estado.produtos.queijo, sim.estado.produtos.queijo);
  assert.deepEqual(migrado.estado.jogador.inventario, ['queijo']);
});

test('N17 prolonga o mel sem misturar estoques ou repor a seção vizinha na divisória', () => {
  const sim = abrir(14);
  assert.ok(Math.abs(volumesDoces(sim.estado.produtos)[0].w - PRODUTOS.mel.prateleira.w) < 1e-8);
  assert.equal(selecionarCompartimentoDoces(PRODUTOS.geleia.reposicao, sim.estado.produtos), undefined);
  sim.estado.estatisticas.clientes = 400;
  prepararMelhoriasAnteriores(sim, 'cozinhaGeleia');
  assert.equal(sim.comprarMelhoria('cozinhaGeleia').sucesso, true);
  assert.equal(sim.estado.melhorias.queijaria, 1); // A cozinha exige as compras anteriores.
  const volumes = sim.obstaculos().filter(o => o.movel === 'doces');
  assert.equal(volumes.length, 1);
  assert.ok(Math.abs(volumes[0].w - 6.4) < 1e-8);
  assert.equal(sim.estado.estagioLoja, 5);
  const divisoria = PRODUTOS.mel.prateleira.x - PRODUTOS.mel.prateleira.w / 2;
  for (const [x, id] of [[divisoria - 0.01, 'geleia'], [divisoria, 'mel'], [divisoria + 0.01, 'mel']]) {
    sim.estado.produtos.mel.prateleira = 0;
    sim.estado.produtos.geleia.prateleira = 0;
    sim.estado.jogador.inventario = ['mel', 'geleia'];
    interagir(sim, { x, z: PRODUTOS.mel.reposicao.z });
    assert.equal(sim.estado.produtos[id].prateleira, 1);
    assert.equal(sim.estado.produtos[id === 'mel' ? 'geleia' : 'mel'].prateleira, 0);
  }
  sim.estado.produtos.mel.prateleira = PRODUTOS.mel.capacidadePrateleira;
  sim.estado.jogador.inventario = ['geleia'];
  const antes = sim.estado.produtos.geleia.prateleira;
  interagir(sim, { x: divisoria, z: PRODUTOS.mel.reposicao.z });
  assert.equal(sim.estado.produtos.geleia.prateleira, antes);
  assert.deepEqual(sim.estado.jogador.inventario, ['geleia']);
});

test('N17 mantém a cozinha externa, potes dentro da seção e produção de saves V16', () => {
  const sim = abrir(17), p = PRODUTOS.geleia;
  assert.ok(Math.abs(p.horta.x - PLANTA_OFICINAS.piso.x) + p.curral.w / 2 < PLANTA_OFICINAS.piso.w / 2);
  assert.ok(p.horta.z + p.curral.d / 2 < -9.3);
  const visual = { cena: new THREE.Scene(), sim, produtos: {}, criarLabel() {} };
  Cena.prototype.construirArtesanal.call(visual, 'geleia', p);
  for (const pote of visual.produtos.geleia.frutas) {
    assert.ok(Math.abs(pote.position.x - p.prateleira.x) < p.prateleira.w / 2);
    assert.ok(Math.abs(pote.position.z - p.prateleira.z) < p.prateleira.d / 2);
  }
  sim.estado.versaoLayout = 16;
  Object.assign(sim.estado.oficinas.geleia, { ingredientes: { morango: 2, mel: 1 }, progresso: 2, produzidos: 3 });
  Object.assign(sim.estado.produtos.geleia, { horta: 3, prateleira: 7, apresentado: true });
  Object.assign(sim.estado.jogador, { x: 19.2, z: -10.9, inventario: ['geleia'] });
  const migrado = new Simulacao(structuredClone(sim.estado));
  assert.equal(migrado.estado.versaoLayout, CONFIG.versaoLayout);
  assert.deepEqual(migrado.estado.oficinas.geleia, sim.estado.oficinas.geleia);
  assert.deepEqual(migrado.estado.produtos.geleia, sim.estado.produtos.geleia);
  assert.deepEqual(migrado.estado.jogador.inventario, ['geleia']);
});
