import { prepararLojaCompleta } from './helpers/loja-completa.js';
import { reativarImportadosParaTeste } from './helpers/importados-suspensos.js';
reativarImportadosParaTeste();

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG } from '../src/jogo/configuracao.js';
import { PLANTA_EXPANSAO, PLANTA_CARGA, PLANTA_DEPOSITO, PLANTA_INICIAL, PLANTA_ESTACIONAMENTO, pisoEstacionamento } from '../src/jogo/planta.js';
import { construirBairro } from '../src/jogo/bairro.js';
import { Cena } from '../src/jogo/cena.js';
import { Trafego } from '../src/jogo/trafego.js';
import { ENTREGA } from '../src/jogo/entregas.js';
import { construirEstacionamento } from '../src/jogo/estacionamento.js';

function primitivas() {
  const caixa = (pai, w, h, d, cor, x, y, z) => {
    const objeto = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: cor }));
    objeto.position.set(x, y, z); pai.add(objeto); return objeto;
  };
  return { caixa, cilindro: (pai, a, b, h, cor, x, y, z) => caixa(pai, a * 2, h, b * 2, cor, x, y, z),
    esfera: (pai, r, cor, x, y, z) => caixa(pai, r * 2, r * 2, r * 2, cor, x, y, z) };
}

test('compra do N18 amplia 12 u à esquerda e preserva jogadores no novo terreno ao salvar', () => {
  const sim = new Simulacao(); sim.estado.dinheiro = 100000;
  sim.estado.estatisticas.clientes = 17 * CONFIG.clientesPorNivel;
  prepararLojaCompleta(sim);
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
  assert.ok(acesso.max.x <= -16, 'acesso privado termina na borda do mapa anterior');
  assert.ok(Math.abs(acesso.max.z - 9.26) < 1e-6);
  assert.ok(patio.getObjectByName('placa-carga-exclusiva'));
  const listras = patio.getObjectsByProperty('name', 'travessia-carga');
  assert.ok(listras.length >= 6);
  for (const listra of listras) {
    const faixa = new THREE.Box3().setFromObject(listra);
    assert.ok(faixa.min.x >= acesso.min.x && faixa.max.x <= acesso.max.x);
    assert.ok(faixa.min.z < CONFIG.entrada.z && faixa.max.z > CONFIG.entrada.z, 'faixa acompanha o caminho dos pedestres');
    assert.ok(faixa.min.y > acesso.max.y, 'faixa fica visível sobre o asfalto');
    assert.equal(listra.userData.fundo, 6, 'Canvas desenha a faixa depois do acesso');
  }
  assert.equal(PLANTA_CARGA.piso.w, PLANTA_CARGA.acesso.w);
  assert.ok(PLANTA_CARGA.piso.w < ENTREGA.largura * 2, 'pavimento tem espaço para uma única faixa de caminhão');
  assert.ok(PLANTA_CARGA.vaga.w > ENTREGA.largura && PLANTA_CARGA.vaga.d > ENTREGA.comprimento);
  assert.equal(patio.getObjectByName('divisoria-faixas-carga'), undefined);
  const guiasCalcada = patio.parent.children.filter(objeto => objeto.name === 'guia-calcada-carga')
    .map(objeto => new THREE.Box3().setFromObject(objeto)).sort((a, b) => a.min.x - b.min.x);
  assert.equal(guiasCalcada.length, 1);
  assert.ok(Math.abs(guiasCalcada[0].max.x - acesso.min.x) < 1e-6);
  bairro.atualizarExpansao(false);
  assert.equal(patio.parent.visible, false);
  assert.equal(new THREE.Box3().setFromObject(cena.getObjectByName('terreno-principal')).min.x, -16);
});

test('pátio encosta no estacionamento ampliado com apenas as guias entre os pisos', () => {
  const estacionamento = construirEstacionamento();
  estacionamento.atualizar(true, 4, [], 0, true);
  const asfalto = new THREE.Box3().setFromObject(estacionamento.grupo.getObjectByName('asfalto-estacionamento'));
  const bordaCarga = PLANTA_CARGA.piso.x + PLANTA_CARGA.piso.w / 2;
  assert.ok(Math.abs(asfalto.min.x - bordaCarga) < 1e-6, 'nenhuma faixa de grama entre os pisos');
  const guiaClientes = estacionamento.grupo.getObjectsByProperty('name', 'guia-lateral-estacionamento')
    .map(objeto => new THREE.Box3().setFromObject(objeto)).sort((a, b) => a.min.x - b.min.x)[0];
  const guiaCarga = PLANTA_CARGA.guias.find(guia => guia.d > guia.w && guia.x > PLANTA_CARGA.piso.x);
  assert.ok(Math.abs(guiaClientes.min.x - (guiaCarga.x + guiaCarga.w / 2)) < 1e-6, 'guias se tocam na divisa');
  assert.deepEqual(pisoEstacionamento(false), PLANTA_ESTACIONAMENTO.piso, 'N16 mantém a planta original');
});

test('guia dos fundos do pátio termina exatamente na parede do depósito', () => {
  const guiaFundos = PLANTA_CARGA.guias.find(guia => guia.z < PLANTA_CARGA.vaga.z);
  const bordaEsquerdaDeposito = PLANTA_DEPOSITO.piso.x - PLANTA_DEPOSITO.piso.w / 2;
  assert.equal(guiaFundos.x + guiaFundos.w / 2, bordaEsquerdaDeposito);
  assert.ok(Math.abs(PLANTA_CARGA.piso.z - PLANTA_CARGA.piso.d / 2 - PLANTA_DEPOSITO.porta.z) < 1e-9,
    'pátio de carga termina alinhado ao estacionamento dos carros');
});

test('vaga de carga tem três linhas, abertura para a rua e reserva comprimento para caminhões maiores', () => {
  const cena = new THREE.Scene();
  const bairro = construirBairro(cena, primitivas()); bairro.atualizarExpansao(true);
  const linhas = cena.getObjectByName('patio-carga').getObjectsByProperty('name', 'linha-vaga-carga');
  assert.equal(linhas.length, 3);
  assert.ok(PLANTA_CARGA.vaga.d > ENTREGA.comprimento + 1.5);
  assert.ok(linhas.every(linha => linha.position.z < PLANTA_CARGA.vaga.z + PLANTA_CARGA.vaga.d / 2),
    'lado voltado para a rua permanece aberto');
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
