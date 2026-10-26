import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RenderizadorCompativel } from '../src/jogo/renderizador-compativel.js';
import { criarGeometriasSaco } from '../src/jogo/embalagem-saco.js';

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

test('Canvas aplica o SVG por triângulos à superfície curva do saco', () => {
  let desenhos = 0, recortes = 0;
  const ctx = { fillRect() {}, save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    clip() { recortes++; }, transform(...valores) { assert.ok(valores.every(Number.isFinite)); },
    drawImage() { desenhos++; } };
  const documentoAnterior = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  try {
    const renderizador = new RenderizadorCompativel(); renderizador.setSize(400, 400);
    const cena = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 3;
    const material = new THREE.MeshStandardMaterial({ map: new THREE.Texture({ width: 380, height: 560 }) });
    const saco = new THREE.Mesh(criarGeometriasSaco(0.38, 0.56, 0.25).frente, material);
    saco.userData.texturaCurva = true; cena.add(saco);
    renderizador.render(cena, camera);
    assert.ok(desenhos >= 4, 'arte acompanha a frente e os ombros do pacote');
    assert.equal(recortes, desenhos, 'cada triângulo limita o desenho da textura');
  } finally {
    if (documentoAnterior === undefined) delete globalThis.document;
    else globalThis.document = documentoAnterior;
  }
});
