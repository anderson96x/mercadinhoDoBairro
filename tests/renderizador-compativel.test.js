import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RenderizadorCompativel } from '../src/jogo/renderizador-compativel.js';

test('Canvas oculta o verso dos rótulos SVG ao girar os produtos', () => {
  let desenhos = 0;
  const ctx = { fillRect() {}, save() {}, restore() {}, transform() {}, drawImage() { desenhos++; } };
  const documentoAnterior = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  try {
    const renderizador = new RenderizadorCompativel(); renderizador.setSize(400, 400);
    const cena = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 3;
    const material = new THREE.MeshBasicMaterial({ map: new THREE.Texture({ width: 32, height: 32 }) });
    const plano = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), material); cena.add(plano);
    renderizador.render(cena, camera); assert.equal(desenhos, 1);
    plano.rotation.y = Math.PI;
    renderizador.render(cena, camera); assert.equal(desenhos, 1, 'verso não desenha o SVG sobre o volume');
    material.side = THREE.DoubleSide;
    renderizador.render(cena, camera); assert.equal(desenhos, 2);
  } finally {
    if (documentoAnterior === undefined) delete globalThis.document;
    else globalThis.document = documentoAnterior;
  }
});
