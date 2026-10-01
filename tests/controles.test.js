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
    const movimentos = [];
    const controles = new Controles(superficie, joystick, (dx, dy) => movimentos.push([dx, dy]));
    superficie.enviar('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
    superficie.enviar('pointermove', { pointerId: 1, clientX: 120, clientY: 100 });
    assert.ok(controles.ler().x > 0);
    superficie.enviar('pointerdown', { pointerId: 2, clientX: 200, clientY: 200 });
    assert.deepEqual(controles.ler(), { x: 0, y: 0 });
    superficie.enviar('pointermove', { pointerId: 2, clientX: 210, clientY: 190 });
    assert.deepEqual(movimentos, [[10, -10]]);
    superficie.enviar('pointerup', { pointerId: 2 });
    superficie.enviar('pointermove', { pointerId: 1, clientX: 130, clientY: 100 });
    assert.deepEqual(movimentos, [[10, -10]]);
    assert.deepEqual(controles.ler(), { x: 0, y: 0 });
    superficie.enviar('pointerup', { pointerId: 1 });
    superficie.enviar('pointerdown', { pointerId: 3, clientX: 100, clientY: 100 });
    superficie.enviar('pointermove', { pointerId: 3, clientX: 120, clientY: 100 });
    assert.ok(controles.ler().x > 0);
  } finally {
    globalThis.window = anterior;
  }
});
