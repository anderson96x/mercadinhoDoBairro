import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Cena } from '../src/jogo/cena.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { PRODUTOS } from '../src/jogo/configuracao.js';
import { PRODUTOS_HORTIFRUTI } from '../src/jogo/planta.js';

test('cada produto recebe o expositor de madeira sem exigir os demais desbloqueios', () => {
  for (let mascara = 0; mascara < 2 ** PRODUTOS_HORTIFRUTI.length; mascara++) {
    const sim = new Simulacao();
    sim.estado.estagioLoja = 5;
    const visual = { sim, cena: new THREE.Scene(), produtos: {}, alvosHorta: [], criarLabel() {} };
    for (const [i, id] of PRODUTOS_HORTIFRUTI.entries()) {
      const liberado = !!(mascara & (1 << i));
      sim.estado.produtos[id].liberado = liberado;
      Cena.prototype.construirEstacao.call(visual, id, PRODUTOS[id]);
      const objetos = visual.produtos[id];
      assert.equal(objetos.grupo.visible, liberado);
      assert.equal(objetos.banca.name, 'secao-hortifruti');
      assert.equal(objetos.banca.getObjectByName('bandeja-inclinada').rotation.z, -0.14);
      assert.equal(objetos.frutas.length, PRODUTOS[id].capacidadePrateleira);
      assert.equal(sim.estado.produtos[id].prateleira, 0);
      const p = PRODUTOS[id].prateleira;
      const bounds = new THREE.Box3().setFromObject(objetos.banca);
      assert.ok(bounds.min.x >= p.x - p.w / 2 - 1e-6);
      assert.ok(bounds.max.x <= p.x + p.w / 2 + 1e-6);
      assert.ok(bounds.min.z >= p.z - p.d / 2 - 1e-6);
      assert.ok(bounds.max.z <= p.z + p.d / 2 + 1e-6);
    }
  }
});
