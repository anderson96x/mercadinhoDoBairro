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
