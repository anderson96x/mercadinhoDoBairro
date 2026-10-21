import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG, PRODUTOS, MELHORIAS } from '../src/jogo/configuracao.js';
import { PLANTA_EXPANSAO, paredesExpansao, paredesOficinas, selecionarExpositorPosterior } from '../src/jogo/planta.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';
import { construirBairro, PAREDES_LOJA, PAREDES_ESCRITORIO } from '../src/jogo/bairro.js';
import { Cena } from '../src/jogo/cena.js';
import { atualizarPainelProducao } from '../src/interface/producao.js';
import { geometriaEstacao, intervaloEstacoes } from '../src/jogo/estacoes.js';

function loja(nivel = 18) {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 100000;
  for (const id of ['alaProducao', 'alaLeite', 'milho', 'alaTrigo', 'alaPadaria', 'alaArtesanal', 'apiario', 'queijaria', 'cozinhaGeleia', 'ajudante']) {
    assert.equal(sim.comprarMelhoria(id).sucesso, true, id);
  }
  sim.proximoCliente = Infinity;
  return sim;
}

test('expansão exige nível 18, padaria e R$ 10.000, com uma única compra', () => {
  const sim = loja(17);
  assert.match(sim.comprarMelhoria('expansao').motivo, /nível 18/);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 9999;
  assert.equal(sim.comprarMelhoria('expansao').sucesso, false);
  assert.equal(sim.estado.dinheiro, 9999);
  sim.estado.dinheiro = 10000;
  assert.equal(sim.comprarMelhoria('expansao').sucesso, true);
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(sim.estado.melhorias.expansao, 1);
  assert.match(sim.comprarMelhoria('expansao').motivo, /completa/);
  const semPadaria = new Simulacao();
  semPadaria.estado.estatisticas.clientes = 17 * CONFIG.clientesPorNivel;
  semPadaria.estado.dinheiro = 10000;
  assert.match(semPadaria.comprarMelhoria('expansao').motivo, /Padaria/);
  assert.equal(semPadaria.estado.dinheiro, 10000);
  assert.match(semPadaria.missao().titulo, /fundos da loja/);
  assert.match(semPadaria.missao().texto, /10\.000/);
});

test('compra acrescenta o anexo, recua a fazenda e encosta as bancadas na parede sem mover os expositores', () => {
  const sim = loja(), outra = loja();
  const estoques = structuredClone(sim.estado.produtos);
  const paredes = sim.obstaculos().filter(p => PAREDES_LOJA.includes(p) || PAREDES_ESCRITORIO.includes(p));
  assert.equal(sim.produtos, PRODUTOS);
  sim.comprarMelhoria('expansao');
  for (const id of ['tomate', 'milho', 'trigo', 'ovos', 'leite', 'morango', 'mel']) {
    assert.equal(sim.produtos[id].horta.z, PRODUTOS[id].horta.z - 6, id);
    assert.equal(sim.produtos[id].coleta.z, PRODUTOS[id].coleta.z - 6, id);
  }
  for (const id of ['ovos', 'leite', 'queijo']) {
    assert.equal(selecionarExpositorPosterior(sim.produtos[id].reposicao, sim.estado.produtos, sim.produtos), id);
  }
  for (const [id, p] of Object.entries(PRODUTOS)) {
    for (const campo of ['prateleira', 'reposicao', 'cliente', 'pontosCompra']) assert.deepEqual(sim.produtos[id][campo], p[campo], `${id}/${campo}`);
  }
  for (const id of ['queijo', 'geleia']) {
    const p = sim.produtos[id];
    assert.deepEqual(p.horta, PLANTA_EXPANSAO.bancadas[id]);
    assert.ok(Math.abs(p.horta.z - p.curral.d / 2 - (PLANTA_EXPANSAO.portaProducao.z + 0.14)) < 1e-8);
    assert.ok(Math.abs(p.coleta.z - p.horta.z - (PRODUTOS[id].coleta.z - PRODUTOS[id].horta.z)) < 1e-8);
  }
  for (const parede of paredes) assert.ok(sim.obstaculos().includes(parede));
  assert.ok(intervaloEstacoes(sim.produtos.queijo.prateleira, geometriaEstacao('queijo', 'coleta', sim.produtos)) > 0);
  assert.deepEqual(sim.produtos.pao, PRODUTOS.pao);
  assert.deepEqual(sim.estado.produtos, estoques);
  assert.equal(outra.produtos, PRODUTOS);
  assert.equal(sim.portaProducao.z, -15.3);
  assert.deepEqual(sim.limitesMundo, PLANTA_EXPANSAO.limites);
  assert.equal(segmentoLivre({ x: 10, z: -9.3 }, { x: 10, z: -11 }, sim.obstaculos(), 0.32), false);
  for (const porta of PLANTA_EXPANSAO.portas) assert.ok(segmentoLivre({ x: porta.x, z: porta.z + 0.8 }, { x: porta.x, z: porta.z - 1 }, sim.obstaculos(), 0.32));
});

test('saves antigos mantêm planta e saldo; expansão e posições na fazenda persistem ao recarregar', () => {
  const sim = loja();
  delete sim.estado.melhorias.expansao;
  const antigo = new Simulacao(structuredClone(sim.estado));
  assert.equal(antigo.estado.melhorias.expansao, 0);
  assert.equal(antigo.produtos, PRODUTOS);
  assert.equal(antigo.estado.dinheiro, sim.estado.dinheiro);
  assert.equal(antigo.comprarMelhoria('expansao').sucesso, true);
  Object.assign(antigo.estado.jogador, antigo.produtos.trigo.coleta);
  Object.assign(antigo.ajudante, antigo.produtos.mel.coleta, { produto: 'mel', destino: 'prateleira', inventario: ['mel'] });
  antigo.estado.oficinas.queijo.ingredientes.leite = 3;
  const restaurado = new Simulacao(structuredClone(antigo.estado));
  assert.deepEqual(restaurado.estado.jogador, antigo.estado.jogador);
  assert.equal(restaurado.ajudante.z, antigo.ajudante.z);
  assert.deepEqual(restaurado.ajudante.inventario, ['mel']);
  assert.equal(restaurado.estado.oficinas.queijo.ingredientes.leite, 3);
  assert.equal(restaurado.estado.dinheiro, antigo.estado.dinheiro);
  const adulterado = loja(17).estado;
  adulterado.melhorias.expansao = 1;
  assert.equal(new Simulacao(adulterado).estado.melhorias.expansao, 0);
});

test('porta junto à cozinha vira parede e a lateral contínua bloqueia passagem em todas as emendas', () => {
  const sim = loja(); sim.comprarMelhoria('expansao');
  assert.equal(PLANTA_EXPANSAO.portas.length, 1);
  assert.equal(segmentoLivre({ x: 10, z: -14.5 }, { x: 10, z: -16.1 }, sim.obstaculos(), 0.32), false);
  const lateral = paredesExpansao().find(p => p.lateralContinua);
  assert.equal(paredesOficinas(true).length, 0);
  assert.equal(segmentoLivre({ x: 16.5, z: -13.5 }, { x: 16.5, z: -14.7 }, sim.obstaculos(), 0.32), true);
  assert.equal(lateral.d, 22);
  for (const z of [-14.3, -9.3, 0, 6.5]) {
    assert.equal(segmentoLivre({ x: 20.4, z }, { x: 21.4, z }, sim.obstaculos(), 0.32), false);
  }
  const ator = { ...PRODUTOS.queijo.coleta };
  let chegou = false;
  for (let tick = 0; tick < 3000 && !chegou; tick++) {
    sim.tempo += 0.05; chegou = sim.caminharCliente(ator, sim.produtos.mel.coleta, 0.05);
  }
  assert.equal(chegou, true);
});

test('jogador na fazenda acompanha a mudança e coleta, entrega e repõe nas novas posições', () => {
  const sim = loja();
  Object.assign(sim.estado.jogador, PRODUTOS.tomate.coleta);
  sim.comprarMelhoria('expansao');
  assert.equal(sim.estado.jogador.z, sim.produtos.tomate.coleta.z);
  sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['tomate']);
  Object.assign(sim.estado.jogador, sim.produtos.queijo.coleta, { inventario: ['leite'] });
  sim.tempo += 1; sim.interagir();
  assert.equal(sim.estado.oficinas.queijo.ingredientes.leite, 1);
  sim.atualizarProducao(5);
  sim.tempo += 1; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['queijo']);
  Object.assign(sim.estado.jogador, sim.produtos.queijo.reposicao);
  sim.tempo += 1; sim.interagir();
  assert.equal(sim.estado.produtos.queijo.prateleira, 1);
});

test('repositor leva produtos da fazenda recuada e da cozinha até os expositores originais', () => {
  const sim = loja(); sim.comprarMelhoria('expansao');
  for (const id of ['tomate', 'ovos', 'leite', 'morango', 'mel', 'queijo', 'geleia']) {
    for (const [item, estoque] of Object.entries(sim.estado.produtos)) {
      estoque.prateleira = PRODUTOS[item].capacidadePrateleira; estoque.horta = 0;
    }
    sim.estado.produtos[id].horta = 1; sim.estado.produtos[id].prateleira = 0;
    Object.assign(sim.ajudante, CONFIG.inicio, { produto: id, destino: 'horta', inventario: [], temporizador: 0 });
    for (let tick = 0; tick < 4000 && !sim.estado.produtos[id].prateleira; tick++) {
      sim.tempo += 0.05; sim.atualizarAjudante(0.05);
    }
    assert.equal(sim.estado.produtos[id].prateleira, 1, id);
  }
});

test('painel acompanha as bancadas recuadas e clientes continuam comprando nos expositores originais', () => {
  const sim = loja(); sim.comprarMelhoria('expansao');
  const lista = { innerHTML: '' }, resumo = { textContent: '' };
  const painel = { hidden: true, dataset: {}, querySelector: seletor => seletor === '#producao-resumo' ? resumo : lista };
  for (const [id, nome] of [['queijo', 'Queijaria'], ['geleia', 'Cozinha de geleias']]) {
    Object.assign(sim.estado.jogador, sim.produtos[id].coleta);
    atualizarPainelProducao(painel, sim.estado);
    assert.equal(painel.hidden, false);
    assert.ok(lista.innerHTML.includes(nome));
  }
  Object.assign(sim.estado.jogador, CONFIG.inicio);
  atualizarPainelProducao(painel, sim.estado);
  assert.equal(painel.hidden, true);
  sim.estado.melhorias.caixa = 1;
  sim.estado.produtos.queijo.prateleira = 12;
  sim.estado.produtos.queijo.apresentado = true;
  sim.aleatorio = () => 0;
  assert.equal(sim.criarCliente(), true);
  const cliente = sim.clientes[0];
  Object.assign(cliente, { produto: 'queijo', compras: [{ produto: 'queijo', desejado: 1, quantidade: 0 }], compraAtual: 0, pontoCompra: 0 });
  for (let tick = 0; tick < 6000 && !sim.estado.estatisticas.faturamento; tick++) sim.atualizar(1 / 60);
  assert.equal(sim.estado.estatisticas.faturamento, PRODUTOS.queijo.preco);
  assert.equal(sim.estado.produtos.queijo.prateleira, 11);
});

test('visual mantém o salão e a porta originais e remove a mureta da cozinha ampliada', () => {
  const cena = new THREE.Scene();
  const caixa = (pai, w, h, d, cor, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: cor }));
    mesh.position.set(x, y, z); pai.add(mesh); return mesh;
  };
  const bairro = construirBairro(cena, { caixa, cilindro: (pai, r1, r2, h, cor, x, y, z) => caixa(pai, r1 * 2, h, r2 * 2, cor, x, y, z), esfera: (pai, r, cor, x, y, z) => caixa(pai, r * 2, r * 2, r * 2, cor, x, y, z) });
  bairro.atualizarEstagio(5);
  const sim = loja();
  bairro.atualizarOficinas(sim.estado.produtos);
  const cozinha = cena.getObjectByName('sala-oficinas');
  const limitesCozinha = new THREE.Box3().setFromObject(cozinha);
  assert.equal(cena.getObjectByName('expansao-fundos').visible, false);
  bairro.atualizarExpansao(true);
  assert.equal(cena.getObjectByName('expansao-fundos').visible, true);
  bairro.atualizarOficinas(sim.estado.produtos);
  assert.equal(cena.getObjectByName('parede-fundos-antiga').visible, true);
  assert.equal(cena.getObjectByName('parede-passagem-artesanal').visible, true);
  assert.equal(cena.getObjectByName('entrada-producao').position.z, 0);
  assert.equal(cozinha.visible, true);
  assert.equal(cena.getObjectByName('parede-lateral-padaria').visible, false);
  assert.equal(cena.getObjectByName('paredes-cozinha-originais').visible, false);
  assert.equal(cena.getObjectByName('paredes-cozinha-expansao').visible, true);
  assert.equal(cena.getObjectByName('paredes-cozinha-expansao').children.length, 0);
  assert.equal(cena.getObjectByName('parede-lateral-continua').geometry.parameters.depth, 22);
  assert.deepEqual(new THREE.Box3().setFromObject(cozinha), limitesCozinha);
  assert.equal(cena.getObjectByName('cerca-fazenda').position.z, -6);
  sim.comprarMelhoria('expansao');
  const labels = [];
  const visual = { cena, sim, produtos: {}, alvosHorta: [], criarLabel(id, ponto) { labels.push({ id, ponto }); } };
  for (const [id, p] of Object.entries(sim.produtos)) {
    if (id === 'pao') continue;
    Cena.prototype.construirEstacao.call(visual, id, p);
    assert.equal(labels.find(label => label.id === `horta-${id}`).ponto.z, p.horta.z);
    assert.equal(visual.produtos[id].frutas[0].position.z >= p.prateleira.z - p.prateleira.d / 2, true, id);
  }
  assert.equal(MELHORIAS.find(m => m.id === 'expansao').categoria, 'mercado');
});
