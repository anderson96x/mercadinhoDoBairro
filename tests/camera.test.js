import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Cena } from '../src/jogo/cena.js';
import { CONFIG } from '../src/jogo/configuracao.js';

function criarCameraDeTeste() {
  const alvoCamera = new THREE.Vector3(0, 0, 0);
  const camera = new THREE.OrthographicCamera(-20, 20, 15, -15, 0.1, 100);
  const offset = CONFIG.cameraIsometrica;
  camera.position.set(offset.x, offset.y, offset.z);
  camera.lookAt(alvoCamera);
  camera.updateMatrixWorld();
  return {
    w: 800, h: 600, camera, alvoCamera,
    deslocamentoCamera: new THREE.Vector3(), raycaster: new THREE.Raycaster(),
    mobile: false, sim: { estado: { estagioLoja: 0 } },
    baseCamera: () => ({ x: 0, z: 0 })
  };
}

test('arrastar desloca o mapa na mesma direção do ponteiro', () => {
  const cena = criarCameraDeTeste();
  const ponto = new THREE.Vector3(0, 0, 0);
  const antes = ponto.clone().project(cena.camera);
  Cena.prototype.moverCamera.call(cena, 40, 20);
  const { x, y, z } = CONFIG.cameraIsometrica;
  cena.camera.position.copy(cena.alvoCamera).add(new THREE.Vector3(x, y, z));
  cena.camera.lookAt(cena.alvoCamera);
  cena.camera.updateMatrixWorld();
  const depois = ponto.clone().project(cena.camera);
  assert.ok(Math.abs((depois.x - antes.x) * cena.w / 2 - 40) < 0.001);
  assert.ok(Math.abs((antes.y - depois.y) * cena.h / 2 - 20) < 0.001);
});

test('o centro da câmera nunca ultrapassa as bordas do terreno', () => {
  const { minX, maxX, minZ, maxZ } = CONFIG.limiteCamera;
  for (const [x, z, eixo, borda] of [
    [1, 0, 'x', maxX], [-1, 0, 'x', minX],
    [0, 1, 'z', maxZ], [0, -1, 'z', minZ]
  ]) {
    const cena = criarCameraDeTeste();
    const origem = new THREE.Vector3().project(cena.camera);
    const destino = new THREE.Vector3(x, 0, z).project(cena.camera);
    const dx = -(destino.x - origem.x) * cena.w * 2;
    const dy = (destino.y - origem.y) * cena.h * 2;
    for (let i = 0; i < 20; i++) Cena.prototype.moverCamera.call(cena, dx, dy);
    assert.ok(cena.alvoCamera.x >= minX && cena.alvoCamera.x <= maxX);
    assert.ok(cena.alvoCamera.z >= minZ && cena.alvoCamera.z <= maxZ);
    assert.equal(cena.alvoCamera[eixo], borda);
  }
});
