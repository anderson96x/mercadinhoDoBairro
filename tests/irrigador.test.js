import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { criarIrrigador, animarIrrigador } from '../src/jogo/irrigador.js';

test('irrigador mantém base e mangueira fixas enquanto gira o cabeçote e lança água', () => {
  const irrigador = criarIrrigador(new THREE.Group(), { x: -9.2, z: -12.7 });
  assert.equal(irrigador.visible, false, 'aguarda a compra da irrigação');
  const base = irrigador.getObjectByName('base-irrigador');
  const posicaoBase = base.position.clone(), rotacaoBase = base.quaternion.clone();
  const { cabeca, gotas } = irrigador.userData;
  const rotacaoCabeca = cabeca.rotation.y, posicaoGota = gotas[0].mesh.position.clone();
  animarIrrigador(irrigador, 0.3);
  assert.ok(base.position.equals(posicaoBase));
  assert.ok(base.quaternion.equals(rotacaoBase));
  assert.equal(irrigador.rotation.y, 0);
  assert.notEqual(cabeca.rotation.y, rotacaoCabeca);
  assert.ok(!gotas[0].mesh.position.equals(posicaoGota));
  const posicoes = gotas.map(({ mesh }) => mesh.position.clone());
  animarIrrigador(irrigador, 0.3);
  gotas.forEach(({ mesh }, i) => assert.ok(mesh.position.equals(posicoes[i]), 'tempo pausado congela a água'));
});

test('água percorre arcos, cai sobre a terra e respeita os limites dos canteiros', () => {
  for (const canteiro of [{ w: 3.6, d: 2.5 }, { w: 3.2, d: 2.4 }]) {
    const irrigador = criarIrrigador(new THREE.Group(), { x: 0, z: 0 }, canteiro);
    let subiu = false, desceu = false;
    for (let quadro = 0; quadro < 600; quadro++) {
      animarIrrigador(irrigador, quadro / 60);
      for (const { mesh } of irrigador.userData.gotas) {
        assert.ok(Math.abs(mesh.position.x) < canteiro.w / 2);
        assert.ok(Math.abs(mesh.position.z) < canteiro.d / 2);
        assert.ok(mesh.position.y >= 0.46);
        subiu ||= mesh.position.y > 1.55;
        desceu ||= mesh.position.y < 0.65;
      }
      for (const mesh of irrigador.userData.respingos) {
        assert.ok(Math.abs(mesh.position.x) + 0.1 < canteiro.w / 2);
        assert.ok(Math.abs(mesh.position.z) + 0.1 < canteiro.d / 2);
      }
    }
    assert.ok(subiu && desceu, 'as gotas sobem ao sair do bico e caem até a terra');
  }
});
