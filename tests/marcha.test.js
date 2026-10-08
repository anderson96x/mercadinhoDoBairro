import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Cena, personagem } from '../src/jogo/cena.js';

function preparar() {
  const modelo = personagem(0x428b88, 0xf2c49c, true);
  const ator = { x: 0, z: 0, angulo: 0, andando: false };
  let tempo = 0;
  const animar = (dt, distancia = 0) => {
    tempo += dt; ator.z += distancia;
    Cena.prototype.animarPersonagem(modelo, ator, dt, tempo, []);
  };
  animar(0);
  return { modelo, ator, d: modelo.userData, animar };
}

test('passos acompanham a distância, sem depender do relógio global ou da taxa de quadros', () => {
  const simular = (fps, velocidade, duracao) => {
    const p = preparar(); p.ator.andando = true;
    for (let i = 0; i < fps * duracao; i++) p.animar(1 / fps, velocidade / fps);
    return p.d.marcha;
  };
  const normal = simular(60, 4.3, 1);
  const lento = simular(60, 2.15, 2);
  const rapido = simular(144, 4.3, 1);
  assert.ok(Math.abs(normal.fase - lento.fase) < 1e-8);
  assert.ok(Math.abs(normal.fase - rapido.fase) < 1e-8);
  assert.ok(Math.abs(normal.intensidade - rapido.intensidade) < 0.001);
});

test('movimento fixo a 60 Hz mantém a passada ao renderizar a 120 Hz', () => {
  const p = preparar(); p.ator.andando = true;
  for (let i = 0; i < 240; i++) p.animar(1 / 120, i % 2 ? 4.3 / 60 : 0);
  assert.ok(p.d.marcha.intensidade > 0.99);
});

test('cada pé levanta no retorno e a sola nunca atravessa o chão', () => {
  const p = preparar(); p.ator.andando = true;
  const alturas = [[], []], angulos = [];
  for (let i = 0; i < 120; i++) {
    p.animar(1 / 60, 4.3 / 60);
    p.modelo.updateMatrixWorld(true);
    [p.d.peE, p.d.peD].forEach((pe, indice) => {
      const caixa = new THREE.Box3().setFromObject(pe);
      alturas[indice].push(caixa.min.y);
      assert.ok(caixa.min.y >= 0.26 - 1e-6);
    });
    assert.ok(Math.min(...alturas.map(a => a.at(-1))) < 0.261, 'um pé permanece apoiado');
    angulos.push(p.d.pernaE.rotation.x - p.d.coxasMarcha[0].rotation.x);
  }
  for (const valores of alturas) assert.ok(Math.max(...valores) - Math.min(...valores) > 0.08);
  assert.ok(Math.max(...angulos) - Math.min(...angulos) > 0.3, 'joelho flexiona ao caminhar');
});

test('parar ou pressionar uma parede suaviza a pose sem caminhar no lugar', () => {
  const p = preparar(); p.ator.andando = true;
  for (let i = 0; i < 30; i++) p.animar(1 / 60, 4.3 / 60);
  const antes = p.d.peE.position.clone(), fase = p.d.marcha.fase;
  p.animar(1 / 60);
  assert.ok(p.d.peE.position.distanceTo(antes) < 0.04);
  assert.ok(p.d.marcha.intensidade > 0.8);
  for (let i = 0; i < 90; i++) p.animar(1 / 60);
  assert.equal(p.d.marcha.fase, fase);
  assert.ok(p.d.marcha.intensidade < 0.001);
  assert.ok(Math.abs(p.d.peE.position.z - 0.06) < 0.001);
  assert.ok(Math.abs(p.d.corpo.rotation.z) < 0.001);
});

test('pausar preserva a pose e teletransportar não dispara uma passada', () => {
  const p = preparar(); p.ator.andando = true;
  for (let i = 0; i < 30; i++) p.animar(1 / 60, 4.3 / 60);
  const antes = [p.d.peE, p.d.peD, p.d.corpo].map(m => m.position.clone());
  const marcha = { ...p.d.marcha };
  p.animar(0);
  assert.deepEqual(p.d.marcha, marcha);
  [p.d.peE, p.d.peD, p.d.corpo].forEach((m, i) => assert.ok(m.position.equals(antes[i])));
  p.animar(1 / 60, 100);
  assert.equal(p.d.marcha.fase, marcha.fase);
});
