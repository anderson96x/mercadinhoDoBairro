import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';

test('projeção isométrica mantém a mesma escala nos três eixos e diagonais de 30 graus', () => {
  const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 100);
  const offset = CONFIG.cameraIsometrica;
  camera.position.set(offset.x, offset.y, offset.z); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const origem = new THREE.Vector3().project(camera);
  const eixos = [[1,0,0],[0,1,0],[0,0,1]].map(e => new THREE.Vector3(...e).project(camera).sub(origem));
  const escalas = eixos.map(e => Math.hypot(e.x, e.y));
  for (const escala of escalas) assert.ok(Math.abs(escala - escalas[0]) < 1e-10);
  assert.ok(Math.abs(Math.atan2(Math.abs(eixos[0].y), Math.abs(eixos[0].x)) - Math.PI / 6) < 1e-10);
  assert.equal(CONFIG.anguloCamera, Math.atan2(offset.x, offset.z));
});

test('cliente entra pelo novo vão frontal antes de chegar à ilha central', () => {
  const sim = new Simulacao(); sim.criarCliente(); sim.proximoCliente = Infinity;
  const cliente = sim.clientes[0]; let atravessou = false;
  for (let i = 0; i < 1800 && cliente.fase !== 'comprando'; i++) {
    const z = cliente.z; sim.atualizar(1 / 60);
    if (z >= 6.7 && cliente.z < 6.7) {
      assert.ok(cliente.x > -2.8 && cliente.x < 0.2); atravessou = true;
    }
  }
  assert.ok(atravessou);
  assert.equal(cliente.fase, 'comprando');
  assert.ok(Math.hypot(cliente.x - PRODUTOS.tomate.cliente.x, cliente.z - PRODUTOS.tomate.cliente.z) < 0.025);
});

test('clientes chegam e vão embora pelas duas direções da calçada', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.criarCliente(), true);
  assert.deepEqual(new Set(sim.clientes.map(c => c.ladoEntrada)), new Set([0, 1]));
  assert.deepEqual(new Set(sim.clientes.map(c => c.ladoSaida)), new Set([0, 1]));

  for (const ladoSaida of [0, 1]) {
    const teste = new Simulacao(); teste.proximoCliente = Infinity;
    const cliente = { id: 1, ...CONFIG.clienteCaixa, produto: 'tomate', quantidade: 1, fase: 'saindo', etapa: 0, ladoSaida, andando: false, levaSacolas: true };
    teste.clientes.push(cliente);
    for (let i = 0; i < 1800 && cliente.fase !== 'fim'; i++) teste.atualizarClientes(1 / 60);
    assert.equal(cliente.fase, 'fim');
    assert.ok(Math.hypot(cliente.x - CONFIG.extremosCalcada[ladoSaida].x, cliente.z - CONFIG.extremosCalcada[ladoSaida].z) < 0.025);
  }
});
