import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { construirBairro } from '../src/jogo/bairro.js';
import { criarGeladeiraSucos } from '../src/jogo/sucos-visual.js';

test('acabamentos externos da geladeira não disputam faces coplanares de cores diferentes', () => {
  const grupo = criarGeladeiraSucos(new THREE.Group());
  const nomes = ['rodape-geladeira-sucos', 'base-geladeira-sucos', 'lateral-geladeira-sucos',
    'teto-geladeira-sucos', 'faixa-vermelha-sucos', 'grade-geladeira-sucos', 'lamina-grade-sucos'];
  const pecas = grupo.children.filter(p => nomes.includes(p.name));
  for (let i = 0; i < pecas.length; i++) for (let j = i + 1; j < pecas.length; j++) {
    const a = pecas[i], b = pecas[j];
    if (a.material.color.equals(b.material.color)) continue;
    const caixaA = new THREE.Box3().setFromObject(a), caixaB = new THREE.Box3().setFromObject(b);
    for (const eixo of ['x', 'y', 'z']) for (const face of ['min', 'max']) {
      if (Math.abs(caixaA[face][eixo] - caixaB[face][eixo]) > 1e-6) continue;
      const sobrepostas = ['x', 'y', 'z'].filter(e => e !== eixo).every(e =>
        Math.min(caixaA.max[e], caixaB.max[e]) - Math.max(caixaA.min[e], caixaB.min[e]) > 1e-6);
      assert.ok(!sobrepostas, `${a.name} e ${b.name} compartilham a face ${face}.${eixo}`);
    }
  }
  const base = new THREE.Box3().setFromObject(grupo.getObjectByName('base-geladeira-sucos'));
  const grade = new THREE.Box3().setFromObject(grupo.getObjectByName('grade-geladeira-sucos'));
  assert.ok(grade.min.z > base.max.z, 'grade fica à frente do gabinete');
  for (const lamina of grupo.children.filter(p => p.name === 'lamina-grade-sucos')) {
    assert.ok(new THREE.Box3().setFromObject(lamina).min.z > grade.max.z, 'lâminas ficam à frente da grade');
  }
});

test('rodapés envolvem também as pontas das paredes sem compartilhar as faces claras', () => {
  const cena = new THREE.Scene(), pecas = [];
  const caixa = (pai, w, h, d, cor, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: cor }));
    m.position.set(x, y, z); pai.add(m); pecas.push(m); return m;
  };
  const bairro = construirBairro(cena, { caixa,
    esfera: (pai, r, cor, x, y, z) => caixa(pai, r, r, r, cor, x, y, z),
    cilindro: (pai, r, b, h, cor, x, y, z) => caixa(pai, r, h, b, cor, x, y, z) });
  const rodapes = pecas.filter(p => p.position.y === 0.34 && p.geometry.parameters.height === 0.22);
  assert.ok(rodapes.length > 4);
  for (const compacta of [true, false]) {
    bairro.atualizarProfundidade(compacta);
    for (const rodape of rodapes) {
      const parede = rodape.parent.children.find(p => p.isMesh && p !== rodape
        && p.position.x === rodape.position.x && p.position.z === rodape.position.z
        && p.geometry.parameters.height > 0.3
        && Math.abs(p.position.y - p.geometry.parameters.height / 2 - 0.23) < 1e-6);
      assert.ok(parede, 'parede correspondente existe');
      for (const dimensao of ['width', 'depth']) {
        assert.ok(rodape.geometry.parameters[dimensao] > parede.geometry.parameters[dimensao],
          `rodapé deve cobrir as pontas em ${dimensao}`);
      }
    }
  }
});
