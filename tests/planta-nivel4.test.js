import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CONFIG, PRODUTOS, ALA_PRODUCAO } from '../src/jogo/configuracao.js';
import { PLANTA_INICIAL, volumesHortifruti } from '../src/jogo/planta.js';
import { PAREDES_LOJA } from '../src/jogo/bairro.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { Cena } from '../src/jogo/cena.js';
import { geometriaEstacao, estacoesSeparadasPorParede } from '../src/jogo/estacoes.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function nivel4() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 250; sim.estado.dinheiro = 500;
  sim.proximoCliente = Infinity;
  return sim;
}

test('N11 segue o SVG: galinheiro atrás e à direita do milho, ovos na parede posterior após a porta', () => {
  const svg = readFileSync(new URL('../docs/mercadinhoDoBairro.drawio.svg', import.meta.url), 'utf8');
  const modelo = svg.match(/\bcontent="([^"]*)"/)[1]
    .replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  function geometria(numero) {
    const celula = modelo.match(new RegExp(`<mxCell[^>]*id="jz9tYpKwZjYspEhf_ZnR-${numero}"[^>]*>[\\s\\S]*?<mxGeometry([^>]*)`));
    assert.ok(celula, `referência original ${numero}`);
    return Object.fromEntries([...celula[1].matchAll(/(x|y|width|height)="([^"]*)"/g)].map(([, k, v]) => [k, Number(v)]));
  }
  const grupo = geometria(85), salao = geometria(86), ovos = geometria(99), porta = geometria(94);
  const milho = geometria(248), galinheiro = geometria(249);
  assert.ok(Math.abs(ovos.y - salao.y) < 1e-8);
  assert.ok(ovos.x > porta.x + porta.width);
  assert.ok(galinheiro.y + galinheiro.height < milho.y);
  assert.ok(galinheiro.x > milho.x + milho.width);
  assert.ok(galinheiro.y + galinheiro.height < grupo.y + salao.y);
  const g = geometriaEstacao('ovos', 'coleta'), m = geometriaEstacao('milho', 'coleta'), s = PRODUTOS.ovos.prateleira;
  assert.ok(g.z + g.d / 2 < m.z - m.d / 2);
  assert.ok(g.x - g.w / 2 > m.x + m.w / 2);
  assert.ok(g.z + g.d / 2 < PLANTA_INICIAL.limites.minZ);
  assert.ok(s.x - s.w / 2 > CONFIG.portaProducao.x + CONFIG.portaProducao.w / 2);
  assert.ok(s.z - s.d / 2 >= PLANTA_INICIAL.limites.minZ + 0.14 - 1e-8);
  const sim = nivel4(); sim.comprarMelhoria('alaProducao');
  const visual = { cena: new THREE.Scene(), sim, produtos: {}, alvosHorta: [], criarLabel() {} };
  Cena.prototype.construirEstacao.call(visual, 'ovos', PRODUTOS.ovos);
  assert.equal(visual.produtos.ovos.grupo.visible, true);
  assert.equal(visual.produtos.ovos.galinhas.length, 2);
  const { estante, frutas } = visual.produtos.ovos;
  assert.equal(estante.name, 'estante-ovos');
  const limites = new THREE.Box3().setFromObject(estante);
  assert.ok(limites.max.y > 2.5, 'expositor alto como a referência');
  assert.ok(limites.min.z >= s.z - s.d / 2 - 1e-8, 'fundo encostado sem atravessar a parede');
  assert.ok(limites.max.z <= s.z + s.d / 2 + 1e-8);
  const prateleiras = estante.children.filter(o => o.name === 'prateleira-ovos');
  assert.equal(prateleiras.length, 4);
  assert.equal(new Set(frutas.map(f => f.position.y)).size, 4);
  assert.equal(new Set(frutas.map(f => f.position.z)).size, 1, 'ovos alinhados na frente do gabinete');
  assert.ok(estante.getObjectByName('teto-estante-ovos'));
  for (const prateleira of prateleiras) {
    assert.equal(prateleira.rotation.x, 0, 'prateleiras planas como a referência');
    const apoio = new THREE.Box3().setFromObject(prateleira);
    const ovos = frutas.filter(f => f.position.y > apoio.max.y && f.position.y < apoio.max.y + 0.5);
    assert.equal(ovos.length, 3, 'três ovos por nível, capacidade total de 12 preservada');
    for (const ovo of ovos) {
      const b = new THREE.Box3().setFromObject(ovo);
      assert.ok(b.min.x > limites.min.x && b.max.x < limites.max.x);
      assert.ok(b.min.z > limites.min.z && b.max.z < limites.max.z);
      assert.ok(b.min.y >= apoio.max.y - 1e-6, 'ovos apoiados acima da bandeja');
      const centro = ovo.getWorldPosition(new THREE.Vector3());
      const camera = centro.clone().add(new THREE.Vector3(CONFIG.cameraIsometrica.x, CONFIG.cameraIsometrica.y, CONFIG.cameraIsometrica.z));
      const raio = new THREE.Raycaster(camera, centro.clone().sub(camera).normalize(), 0, camera.distanceTo(centro) - 0.01);
      assert.equal(raio.intersectObject(estante, true).length, 0, 'estrutura não esconde o ovo da câmera isométrica');
    }
  }
  for (const modelo of [...visual.produtos.ovos.galinhas, ...visual.produtos.ovos.frutos]) {
    assert.ok(new THREE.Box3().setFromObject(modelo).max.z < PLANTA_INICIAL.limites.minZ);
  }
});

test('N11 exige R$ 500 e mantém paredes, fachada e hortifruti existentes, inclusive comprando fora de ordem', () => {
  const sim = nivel4(); sim.estado.estatisticas.clientes = 225;
  assert.equal(sim.comprarMelhoria('alaProducao').sucesso, false);
  sim.estado.estatisticas.clientes = 250;
  assert.equal(sim.estado.produtos.ovos.liberado, false);
  sim.estado.dinheiro = 499;
  assert.equal(sim.comprarMelhoria('alaProducao').sucesso, false);
  sim.estado.dinheiro = 500;
  const paredes = sim.obstaculos().filter(p => PAREDES_LOJA.some(o => o.x === p.x && o.z === p.z && o.w === p.w && o.d === p.d));
  sim.estado.produtos.tomate.prateleira = 5;
  assert.ok(sim.comprarMelhoria('alaProducao').sucesso);
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(sim.estado.estagioLoja, ALA_PRODUCAO.indice);
  assert.equal(sim.estado.produtos.ovos.horta, 0, 'produção automática começa vazia');
  assert.equal(sim.estado.produtos.tomate.prateleira, 5);
  assert.equal(sim.estado.produtos.milho.liberado, false, 'milho não é pré-requisito nem compra concedida');
  assert.equal(volumesHortifruti(sim.estado.produtos)[0].d, 2.2);
  for (const p of paredes) assert.ok(sim.obstaculos().some(o => o.x === p.x && o.z === p.z && o.w === p.w && o.d === p.d));
  assert.ok(sim.obstaculos().some(p => p.lateral && p.x === PLANTA_INICIAL.limites.maxX));
  assert.equal(sim.comprarMelhoria('alaProducao').sucesso, false);
});

test('N11 produz, coleta pela porta dos fundos, abastece e vende um ovo por R$ 15 com devolução da cesta', () => {
  const sim = nivel4(); sim.comprarMelhoria('alaProducao');
  function ir(alvo) {
    let chegou = false;
    for (let i = 0; i < 2400 && !chegou; i++) {
      chegou = sim.caminharCliente(sim.estado.jogador, alvo, 0.05, sim.velocidade);
      sim.atualizar(0.05);
    }
    assert.ok(chegou, `rota até ${JSON.stringify(alvo)}`);
  }
  for (let i = 0; i < 70; i++) sim.atualizar(0.05);
  assert.equal(sim.estado.produtos.ovos.horta, 0);
  sim.atualizar(0.05);
  assert.equal(sim.estado.produtos.ovos.horta, 1);
  ir({ x: CONFIG.portaProducao.x, z: sim.portaProducao.z - 1.1 });
  ir(PRODUTOS.ovos.coleta);
  for (let i = 0; i < 300 && sim.estado.jogador.inventario.length < 4; i++) sim.atualizar(0.05);
  assert.deepEqual(sim.estado.jogador.inventario, Array(4).fill('ovos'));
  ir({ x: CONFIG.portaProducao.x, z: sim.portaProducao.z - 1.1 });
  ir(sim.produtos.ovos.reposicao);
  for (let i = 0; i < 30; i++) sim.atualizar(0.05);
  assert.equal(sim.estado.produtos.ovos.prateleira, 4);
  assert.equal(sim.estado.jogador.inventario.length, 0);
  ir(CONFIG.cadeiraCaixa); assert.ok(sim.estado.jogador.sentadoCaixa);
  sim.proximaId = 4; sim.aleatorio = () => 0;
  assert.ok(sim.criarCliente()); assert.equal(sim.clientes[0].produto, 'ovos');
  for (let i = 0; i < 2400 && sim.estado.estatisticas.ovosVendidos === 0; i++) sim.atualizar(0.05);
  assert.equal(sim.estado.estatisticas.ovosVendidos, 1);
  assert.equal(sim.estado.dinheiro, 15);
  assert.equal(sim.estado.produtos.ovos.prateleira, 3);
  for (let i = 0; i < 600 && sim.clientes.length; i++) sim.atualizar(0.05);
  assert.equal(sim.clientes.length, 0); assert.equal(sim.cestasDisponiveis, 5);
});

test('V6 migra ovos, progresso de produção e cargas para N11 sem cobrar nem criar extensão lateral', () => {
  const sim = nivel4(); sim.comprarMelhoria('alaProducao');
  sim.estado.estatisticas.clientes = 250; sim.estado.dinheiro = 900;
  assert.ok(sim.comprarMelhoria('ajudante').sucesso);
  sim.estado.versaoLayout = 6; sim.estado.dinheiro = 123;
  sim.estado.produtos.ovos.horta = 3; sim.estado.produtos.ovos.prateleira = 5; sim.estado.produtos.ovos.apresentado = true;
  sim.estado.producao.progressoOvo = 1.2; sim.estado.producao.ovosProduzidos = 8;
  Object.assign(sim.estado.jogador, { x: -7.4, z: -7.8, inventario: ['ovos', 'tomate'] });
  Object.assign(sim.ajudante, { x: -7.4, z: -7.8, produto: 'ovos', destino: 'prateleira', inventario: ['ovos'] });
  const migrado = new Simulacao(structuredClone(sim.estado));
  assert.equal(migrado.estado.versaoLayout, CONFIG.versaoLayout);
  assert.equal(migrado.estado.dinheiro, 123);
  assert.equal(migrado.estado.melhorias.alaProducao, 1);
  assert.deepEqual(migrado.estado.produtos.ovos, sim.estado.produtos.ovos);
  assert.equal(migrado.estado.producao.progressoOvo, 1.2);
  assert.equal(migrado.estado.producao.ovosProduzidos, 8);
  assert.deepEqual(migrado.estado.jogador.inventario, ['ovos', 'tomate']);
  assert.deepEqual(migrado.ajudante.inventario, ['ovos']);
  assert.equal(migrado.ajudante.z, PRODUTOS.ovos.coleta.z);
  assert.ok(migrado.obstaculos().some(o => o.lateral));
  for (const ator of [migrado.estado.jogador, migrado.ajudante]) assert.ok(segmentoLivre(ator, ator, migrado.obstaculos(), 0.32));
  assert.deepEqual(new Simulacao(structuredClone(migrado.estado)).estado, migrado.estado);
});

test('parede posterior separa ovos de objeto externo sem conceder exceção para um vão', () => {
  // Objeto de referência atrás dos ovos: a oficina real agora fica na sala à direita.
  const ovos = geometriaEstacao('ovos', 'reposicao'), oficina = { x: 7.3, z: -12.2, w: 2.65, d: 1.75 };
  assert.ok(estacoesSeparadasPorParede(ovos, oficina, PAREDES_LOJA, CONFIG.raioInteracao));
  const parede = PAREDES_LOJA.find(p => p.z === PLANTA_INICIAL.limites.minZ && p.x > CONFIG.portaProducao.x);
  assert.equal(estacoesSeparadasPorParede(ovos, oficina, [{ ...parede, w: parede.w - 0.4, x: parede.x + 0.2 }], CONFIG.raioInteracao), false, 'parede curta deixa um vão no alcance compartilhado');
  assert.equal(segmentoLivre(PRODUTOS.ovos.reposicao, oficina, PAREDES_LOJA), false);
});
