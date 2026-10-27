import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CONFIG, PRODUTOS, ALA_LEITE, ALTURA_PAREDE_BAIXA } from '../src/jogo/configuracao.js';
import { PLANTA_INICIAL, PLANTA_COMPACTA, paredesPlantaInicial } from '../src/jogo/planta.js';
import { PAREDES_LOJA, construirBairro } from '../src/jogo/bairro.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { Cena } from '../src/jogo/cena.js';
import { geometriaEstacao, intervaloEstacoes } from '../src/jogo/estacoes.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function nivel5() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 275; sim.estado.dinheiro = 800; sim.proximoCliente = Infinity;
  return sim;
}

test('N12 segue o SVG: curral ao lado do galinheiro, refrigerador ao lado dos ovos, salão inicial', () => {
  const svg = readFileSync(new URL('../docs/mercadinhoDoBairro.drawio.svg', import.meta.url), 'utf8');
  const modelo = svg.match(/\bcontent="([^"]*)"/)[1].replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  function geometria(numero) {
    const celula = modelo.match(new RegExp(`<mxCell[^>]*id="jz9tYpKwZjYspEhf_ZnR-${numero}"[^>]*>[\\s\\S]*?<mxGeometry([^>]*)`));
    assert.ok(celula, `referência original ${numero}`);
    return Object.fromEntries([...celula[1].matchAll(/(x|y|width|height)="([^"]*)"/g)].map(([, k, v]) => [k, Number(v)]));
  }
  const grupo = geometria(105), salao = geometria(106), ovos = geometria(120), leite = geometria(121);
  const galinheiro = geometria(245), curral = geometria(246);
  assert.ok(Math.abs(leite.x - ovos.x - ovos.width) < 1e-8);
  assert.equal(leite.y, ovos.y);
  assert.equal(curral.y, galinheiro.y);
  assert.ok(curral.x > galinheiro.x + galinheiro.width);
  assert.ok(curral.y + curral.height < grupo.y + salao.y);
  assert.equal(salao.width, 299); assert.equal(salao.height, 320);
  const c = geometriaEstacao('leite', 'coleta'), g = geometriaEstacao('ovos', 'coleta'), r = PRODUTOS.leite.prateleira;
  assert.equal(c.z, g.z); assert.ok(c.x - c.w / 2 > g.x + g.w / 2);
  assert.ok(c.z + c.d / 2 < PLANTA_INICIAL.limites.minZ);
  assert.ok(intervaloEstacoes(c, g) > CONFIG.raioInteracao * 2);
  assert.ok(r.x - r.w / 2 > PRODUTOS.ovos.prateleira.x + PRODUTOS.ovos.prateleira.w / 2);
  assert.equal(r.z, PRODUTOS.ovos.prateleira.z);
  assert.ok(r.x + r.w / 2 < PLANTA_INICIAL.limites.maxX - 0.14);
  const sim = nivel5(); sim.comprarMelhoria('alaLeite');
  const visual = { cena: new THREE.Scene(), sim, produtos: {}, alvosHorta: [], criarLabel() {} };
  Cena.prototype.construirEstacao.call(visual, 'leite', PRODUTOS.leite);
  assert.equal(visual.produtos.leite.grupo.visible, true);
  const vaca = new THREE.Box3().setFromObject(visual.vaca);
  assert.ok(vaca.min.x > c.x - c.w / 2 && vaca.max.x < c.x + c.w / 2);
  assert.ok(vaca.min.z > c.z - c.d / 2 && vaca.max.z < c.z + c.d / 2);
  const prateleiras = visual.produtos.leite.refrigerador.grupo.children.filter(o => o.name === 'prateleira-leite');
  assert.equal(prateleiras.length, 3);
  for (const [i, garrafa] of visual.produtos.leite.frutas.entries()) {
    const b = new THREE.Box3().setFromObject(garrafa);
    assert.ok(b.min.x > r.x - r.w / 2 && b.max.x < r.x + r.w / 2);
    assert.ok(b.min.z > r.z - r.d / 2 && b.max.z < r.z + r.d / 2);
    const apoio = new THREE.Box3().setFromObject(prateleiras[Math.floor(i / 4)]);
    assert.ok(b.min.y > apoio.max.y, 'garrafas apoiadas acima da prateleira correspondente');
    const centro = garrafa.getWorldPosition(new THREE.Vector3());
    const camera = centro.clone().add(new THREE.Vector3(CONFIG.cameraIsometrica.x, CONFIG.cameraIsometrica.y, CONFIG.cameraIsometrica.z));
    const raio = new THREE.Raycaster(camera, centro.clone().sub(camera).normalize(), 0, camera.distanceTo(centro) - 0.01);
    assert.equal(raio.intersectObject(visual.produtos.leite.refrigerador.grupo, true).filter(hit => !hit.object.material.transparent).length, 0, 'garrafa visível através da porta, sem bloqueio pela estrutura');
  }
});

test('N12 exige nível e R$ 800, conserva piso e paredes mesmo sem comprar milho ou ovos', () => {
  const sim = nivel5(); sim.estado.estatisticas.clientes = 250;
  assert.equal(sim.comprarMelhoria('alaLeite').sucesso, false);
  sim.estado.estatisticas.clientes = 275;
  assert.equal(sim.estado.produtos.leite.liberado, false);
  sim.estado.dinheiro = 799; assert.equal(sim.comprarMelhoria('alaLeite').sucesso, false);
  sim.estado.dinheiro = 800; assert.ok(sim.comprarMelhoria('alaLeite').sucesso);
  assert.equal(sim.estado.dinheiro, 0); assert.equal(sim.estado.estagioLoja, ALA_LEITE.indice);
  assert.equal(sim.estado.produtos.leite.horta, 0);
  assert.equal(sim.estado.produtos.ovos.liberado, false); assert.equal(sim.estado.produtos.milho.liberado, false);
  for (const p of PAREDES_LOJA) assert.ok(sim.obstaculos().some(o => o.x === p.x && o.z === p.z && o.w === p.w && o.d === p.d));
  const cena = new THREE.Scene(), geometria = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshBasicMaterial();
  const mesh = (grupo, ...args) => { const m = new THREE.Mesh(geometria, material); grupo.add(m); return m; };
  const bairro = construirBairro(cena, { caixa: mesh, esfera: mesh, cilindro: mesh });
  bairro.atualizarEstagio(1); bairro.atualizarEstagio(2, 1);
  for (const nome of ['ampliacao-padaria', 'andaime-padaria']) assert.equal(cena.getObjectByName(nome).visible, false, nome);
  assert.equal(cena.getObjectByName('rodape-frontal').scale.x, 1);
  bairro.atualizarEstagio(2, 10);
  assert.equal(cena.getObjectByName('rodape-frontal').scale.x, 1);
});

test('divisória entre ovos e leite seleciona um expositor, mesmo com inventário misto e item esgotado', () => {
  const sim = nivel5(); sim.estado.dinheiro = 1300;
  sim.comprarMelhoria('alaProducao'); sim.comprarMelhoria('alaLeite');
  const e = PRODUTOS.ovos.prateleira, l = PRODUTOS.leite.prateleira;
  const divisoria = (e.x + e.w / 2 + l.x - l.w / 2) / 2;
  for (const [offset, esperado] of [[-0.001, 'ovos'], [0, 'ovos'], [0.001, 'leite']]) {
    sim.estado.produtos.ovos.prateleira = 0; sim.estado.produtos.leite.prateleira = 0;
    Object.assign(sim.estado.jogador, { x: divisoria + offset, z: sim.produtos.leite.reposicao.z, inventario: ['ovos', 'leite'] });
    sim.tempo++; sim.interagir();
    assert.equal(sim.estado.produtos[esperado].prateleira, 1);
    assert.equal(sim.estado.jogador.inventario.length, 1);
    sim.tempo++; sim.interagir(); assert.equal(sim.estado.jogador.inventario.length, 1, 'não alterna para o vizinho');
  }
});

test('N12 completa produção, coleta posterior, reposição e venda de leite por R$ 20', () => {
  const sim = nivel5(); sim.comprarMelhoria('alaLeite');
  function ir(alvo) {
    let chegou = false;
    for (let i = 0; i < 2400 && !chegou; i++) {
      chegou = sim.caminharCliente(sim.estado.jogador, alvo, 0.05, sim.velocidade); sim.atualizar(0.05);
    }
    assert.ok(chegou, `rota até ${JSON.stringify(alvo)}`);
  }
  ir({ x: CONFIG.portaProducao.x, z: sim.portaProducao.z - 1.1 });
  ir(PRODUTOS.leite.coleta);
  for (let i = 0; i < 400 && sim.estado.jogador.inventario.length < 4; i++) sim.atualizar(0.05);
  assert.deepEqual(sim.estado.jogador.inventario, Array(4).fill('leite'));
  ir({ x: CONFIG.portaProducao.x, z: sim.portaProducao.z - 1.1 }); ir(sim.produtos.leite.reposicao);
  for (let i = 0; i < 30; i++) sim.atualizar(0.05);
  assert.equal(sim.estado.produtos.leite.prateleira, 4);
  ir(CONFIG.cadeiraCaixa); assert.ok(sim.estado.jogador.sentadoCaixa);
  sim.proximaId = 5; sim.aleatorio = () => 0;
  assert.ok(sim.criarCliente()); assert.equal(sim.clientes[0].produto, 'leite');
  for (let i = 0; i < 2400 && sim.estado.estatisticas.leitesVendidos === 0; i++) sim.atualizar(0.05);
  assert.equal(sim.estado.estatisticas.leitesVendidos, 1); assert.equal(sim.estado.dinheiro, 20);
  assert.equal(sim.estado.produtos.leite.prateleira, 3);
  for (let i = 0; i < 600 && sim.clientes.length; i++) sim.atualizar(0.05);
  assert.equal(sim.clientes.length, 0); assert.equal(sim.cestasDisponiveis, 5);
});

test('save V7 mantém leite, dinheiro, produção parcial e cargas após remover a antiga extensão N12', () => {
  const sim = nivel5(); sim.comprarMelhoria('alaLeite');
  sim.estado.estatisticas.clientes = 275; sim.estado.dinheiro = 900; sim.comprarMelhoria('ajudante');
  sim.estado.versaoLayout = 7; sim.estado.dinheiro = 123;
  Object.assign(sim.estado.produtos.leite, { horta: 3, prateleira: 5, apresentado: true });
  sim.estado.producao.progressoLeite = 1.2; sim.estado.producao.leitesProduzidos = 8;
  Object.assign(sim.estado.jogador, { x: 12.4, z: -4.2, inventario: ['leite'] });
  Object.assign(sim.ajudante, { x: -2.2, z: -14.65, produto: 'leite', destino: 'prateleira', inventario: ['leite'] });
  const migrado = new Simulacao(structuredClone(sim.estado));
  assert.equal(migrado.estado.versaoLayout, CONFIG.versaoLayout);
  assert.equal(migrado.estado.dinheiro, 123); assert.equal(migrado.estado.melhorias.alaLeite, 1);
  assert.deepEqual(migrado.estado.produtos.leite, sim.estado.produtos.leite);
  assert.equal(migrado.estado.producao.progressoLeite, 1.2); assert.equal(migrado.estado.producao.leitesProduzidos, 8);
  assert.deepEqual(migrado.estado.jogador.inventario, ['leite']); assert.deepEqual(migrado.ajudante.inventario, ['leite']);
  assert.equal(migrado.ajudante.z, PRODUTOS.leite.coleta.z);
  assert.ok(migrado.obstaculos().some(o => o.lateral));
  for (const ator of [migrado.estado.jogador, migrado.ajudante]) assert.ok(segmentoLivre(ator, ator, migrado.obstaculos(), 0.32));
  assert.deepEqual(new Simulacao(structuredClone(migrado.estado)).estado, migrado.estado);
});
