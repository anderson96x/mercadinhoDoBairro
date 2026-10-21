import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG } from '../src/jogo/configuracao.js';
import { PLANTA_EXPANSAO, PLANTA_CARGA, PLANTA_INICIAL } from '../src/jogo/planta.js';
import { construirBairro } from '../src/jogo/bairro.js';
import { Cena } from '../src/jogo/cena.js';
import { Trafego } from '../src/jogo/trafego.js';

test('compra do N18 amplia 12 u à esquerda e preserva jogadores no novo terreno ao salvar', () => {
  const sim = new Simulacao(); sim.estado.dinheiro = 100000;
  sim.estado.estatisticas.clientes = 17 * CONFIG.clientesPorNivel;
  for (const id of ['alaProducao', 'alaLeite', 'alaTrigo', 'alaPadaria']) assert.equal(sim.comprarMelhoria(id).sucesso, true);
  assert.equal(sim.limitesMundo.minX, CONFIG.limiteMundo.minX);
  const antes = structuredClone(sim.estado.produtos);
  assert.equal(sim.comprarMelhoria('expansao').sucesso, true);
  assert.equal(PLANTA_EXPANSAO.terreno.w, PLANTA_INICIAL.terreno.w + 12);
  assert.equal(PLANTA_EXPANSAO.terreno.x + PLANTA_EXPANSAO.terreno.w / 2, PLANTA_INICIAL.terreno.x + PLANTA_INICIAL.terreno.w / 2);
  assert.equal(sim.limitesMundo.minX, -27.7);
  assert.deepEqual(sim.estado.produtos, antes);
  assert.equal(sim.estado.melhorias.estacionamento, 0);
  Object.assign(sim.estado.jogador, { x: -25, z: -2 });
  const salva = new Simulacao(structuredClone(sim.estado));
  assert.equal(salva.estado.jogador.x, -25);
  assert.equal(salva.estado.jogador.z, -2);
});

test('pátio, rua e terreno ampliados acompanham compra e recarga, sem depender de vagas de clientes', () => {
  const cena = new THREE.Scene();
  const caixa = (pai, w, h, d, cor, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: cor }));
    m.position.set(x, y, z); pai.add(m); return m;
  };
  const bairro = construirBairro(cena, { caixa, cilindro: (pai, a, b, h, cor, x, y, z) => caixa(pai, a * 2, h, b * 2, cor, x, y, z),
    esfera: (pai, r, cor, x, y, z) => caixa(pai, r * 2, r * 2, r * 2, cor, x, y, z) });
  const patio = cena.getObjectByName('patio-carga');
  assert.equal(patio.parent.visible, false);
  bairro.atualizarExpansao(true); bairro.atualizarEstacionamento(false);
  assert.equal(patio.parent.visible, true);
  const terreno = new THREE.Box3().setFromObject(cena.getObjectByName('terreno-principal'));
  assert.equal(terreno.min.x, -28); assert.equal(terreno.max.x, 24);
  const acesso = new THREE.Box3().setFromObject(patio.getObjectByName('acesso-exclusivo-carga'));
  assert.ok(acesso.max.x < -16, 'acesso privado fica inteiramente fora do mapa anterior');
  assert.ok(Math.abs(acesso.max.z - 9.26) < 1e-6);
  assert.ok(patio.getObjectByName('placa-carga-exclusiva'));
  bairro.atualizarExpansao(false);
  assert.equal(patio.parent.visible, false);
  assert.equal(new THREE.Box3().setFromObject(cena.getObjectByName('terreno-principal')).min.x, -16);
});

test('câmera alcança o pátio no N18 e tráfego percorre a extensão da rua', () => {
  const camera = new THREE.OrthographicCamera(-30, 30, 20, -20, 0.1, 100);
  camera.position.set(18, 18, 18); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const cena = { w: 1200, h: 800, camera, sim: { estado: { melhorias: { expansao: 1 } } }, baseCamera: () => ({ x: 0, z: 0 }),
    alvoCamera: new THREE.Vector3(), deslocamentoCamera: new THREE.Vector3() };
  const a = new THREE.Vector3(0, 0, 0).project(camera), b = new THREE.Vector3(-1, 0, 0).project(camera);
  for (let i = 0; i < 50; i++) Cena.prototype.moverCamera.call(cena, -(b.x - a.x) * 2000, (b.y - a.y) * 2000);
  assert.equal(cena.alvoCamera.x, PLANTA_EXPANSAO.limiteCamera.minX);
  const trafego = new Trafego(new THREE.Scene(), () => 0.5);
  trafego.atualizarExpansao(true); trafego.criarNaFaixa(1);
  assert.ok(trafego.carros[0].grupo.position.x < -24);
  assert.ok(trafego.minX < PLANTA_CARGA.acesso.x);
});
