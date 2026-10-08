import test from 'node:test';
import assert from 'node:assert/strict';
import { Controles } from '../src/jogo/controles.js';

function alvoDeEventos() {
  const eventos = new Map();
  return {
    addEventListener(tipo, callback) { eventos.set(tipo, callback); },
    setPointerCapture() {},
    enviar(tipo, dados) { eventos.get(tipo)?.({ button: 0, pointerType: 'touch', preventDefault() {}, ...dados }); }
  };
}

test('dois dedos movem o mapa sem mover o jogador; um dedo volta a andar no próximo gesto', () => {
  const anterior = globalThis.window;
  globalThis.window = alvoDeEventos();
  try {
    const superficie = alvoDeEventos();
    const joystick = { style: {}, classList: { add() {}, remove() {} }, firstElementChild: { style: {} } };
    const movimentos = [], zooms = [];
    const controles = new Controles(superficie, joystick, (dx, dy) => movimentos.push([dx, dy]), fator => zooms.push(fator));
    superficie.enviar('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
    superficie.enviar('pointermove', { pointerId: 1, clientX: 120, clientY: 100 });
    assert.ok(controles.ler().x > 0);
    superficie.enviar('pointerdown', { pointerId: 2, clientX: 200, clientY: 200 });
    assert.deepEqual(controles.ler(), { x: 0, y: 0 });
    superficie.enviar('pointermove', { pointerId: 2, clientX: 210, clientY: 190 });
    assert.deepEqual(movimentos, [[5, -5]]);
    assert.equal(zooms.length, 1);
    assert.ok(zooms[0] < 1);
    superficie.enviar('pointerup', { pointerId: 2 });
    superficie.enviar('pointermove', { pointerId: 1, clientX: 130, clientY: 100 });
    assert.deepEqual(movimentos, [[5, -5]]);
    assert.deepEqual(controles.ler(), { x: 0, y: 0 });
    superficie.enviar('pointerup', { pointerId: 1 });
    superficie.enviar('pointerdown', { pointerId: 3, clientX: 100, clientY: 100 });
    superficie.enviar('pointermove', { pointerId: 3, clientX: 120, clientY: 100 });
    assert.ok(controles.ler().x > 0);
  } finally {
    globalThis.window = anterior;
  }
});

test('roda do mouse aproxima e afasta sem mover o jogador', () => {
  const anterior = globalThis.window;
  globalThis.window = alvoDeEventos();
  try {
    const superficie = alvoDeEventos();
    const joystick = { style: {}, classList: { add() {}, remove() {} }, firstElementChild: { style: {} } };
    const zooms = [];
    const controles = new Controles(superficie, joystick, () => {}, fator => zooms.push(fator));
    superficie.enviar('wheel', { deltaY: -120 });
    superficie.enviar('wheel', { deltaY: 120 });
    assert.ok(zooms[0] > 1);
    assert.ok(zooms[1] < 1);
    assert.deepEqual(controles.ler(), { x: 0, y: 0 });
    controles.bloqueado = true;
    superficie.enviar('wheel', { deltaY: -120 });
    assert.equal(zooms.length, 2);
  } finally {
    globalThis.window = anterior;
  }
});
