import * as THREE from 'three';
import { LATICINIOS } from './laticinios.js';
import { materialRotuloSvg } from './rotulos-produtos.js';

const materiais = new Map();
export const GELADEIRA_LATICINIOS = {
  alturas: [0.79, 1.28, 1.77, 2.26],
  escala: 1
};

function peca(pai, geometria, cor, x, y, z, nome) {
  if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.65, emissive: cor, emissiveIntensity: 0.2 }));
  const mesh = new THREE.Mesh(geometria, materiais.get(cor));
  mesh.position.set(x, y, z); mesh.name = nome; mesh.castShadow = true; pai.add(mesh);
  return mesh;
}

export function criarLaticinio(variante = 0) {
  const id = Object.keys(LATICINIOS.variedades)[variante % 4];
  const grupo = new THREE.Group(); grupo.name = `embalagem-${id}`;
  grupo.userData.variedade = id;
  const cores = [0x5da5b9, 0x8a71b5, 0xeda461, 0xe77e85, 0x8fb461, 0xe7bd5b];
  const cor = cores[(Math.floor(variante / 4) + (id === 'iogurte' ? 3 : id === 'manteiga' ? 4 : 0)) % cores.length];
  const rotulo = (geometria, face, x, y, z, rotacao = 0) => {
    const mesh = new THREE.Mesh(geometria, materialRotuloSvg(`laticinios/${id}-${face}`, cor));
    // O Canvas aplica UVs de triângulos também às tampas circulares.
    if (geometria.type === 'CircleGeometry') mesh.userData.texturaCurva = true;
    mesh.name = `rotulo-${id}-${face}`; mesh.position.set(x, y, z); mesh.rotation.x = rotacao; grupo.add(mesh);
  };
  if (id === 'manteiga') {
    // Caixa retangular baixa, com tampa branca impressa e faixa colorida.
    peca(grupo, new THREE.BoxGeometry(0.4, 0.12, 0.27), 0xfff8df, 0, 0.06, 0, 'caixa-manteiga');
    peca(grupo, new THREE.BoxGeometry(0.405, 0.035, 0.275), cor, 0, 0.053, 0, 'faixa-manteiga');
    peca(grupo, new THREE.BoxGeometry(0.415, 0.022, 0.285), 0xfffdf5, 0, 0.13, 0, 'tampa-manteiga');
    rotulo(new THREE.PlaneGeometry(0.398, 0.265), 'tampa', 0, 0.142, 0, -Math.PI / 2);
    rotulo(new THREE.PlaneGeometry(0.3, 0.065), 'frente', 0, 0.085, 0.139);
  } else {
    const baixo = id === 'requeijao';
    const altura = baixo ? 0.18 : id === 'cremeLeite' ? 0.37 : 0.32;
    const raio = baixo ? 0.185 : 0.16;
    peca(grupo, new THREE.CylinderGeometry(raio, raio * 0.73, altura, 16), 0xfffcf0, 0, altura / 2, 0, `pote-${id}`);
    // Cinta cônica acompanha o copo, deixando base e borda brancas aparentes.
    peca(grupo, new THREE.CylinderGeometry(raio * 0.968, raio * 0.791, altura * 0.64, 16), cor, 0, altura * 0.54, 0, `faixa-${id}`);
    peca(grupo, new THREE.CylinderGeometry(raio + 0.012, raio + 0.012, 0.022, 16), cor, 0, altura + 0.009, 0, `borda-tampa-${id}`);
    peca(grupo, new THREE.CylinderGeometry(raio, raio, 0.009, 16), 0xfffdf5, 0, altura + 0.024, 0, `tampa-${id}`);
    rotulo(new THREE.CircleGeometry(raio * 0.95, 24), 'tampa', 0, altura + 0.03, 0, -Math.PI / 2);
    if (!baixo) rotulo(new THREE.PlaneGeometry(raio * 1.45, altura * 0.39), 'frente', 0, altura * 0.55, raio * 0.95);
  }
  return grupo;
}

export function posicaoLaticinio(ponto, indice) {
  return new THREE.Vector3(ponto.x + (indice % 3 - 1) * 0.64,
    GELADEIRA_LATICINIOS.alturas[Math.floor(indice / 9)] + 0.035,
    ponto.z + (Math.floor(indice % 9 / 3) - 1) * 0.4);
}

export function criarCaixaLaticinios() {
  const grupo = new THREE.Group(); grupo.name = 'caixa-laticinios';
  const altura = LATICINIOS.alturaCaixa;
  peca(grupo, new THREE.BoxGeometry(0.54, altura, 0.54), 0xe9eee8, 0, altura / 2, 0, 'caixa-refrigerada');
  peca(grupo, new THREE.BoxGeometry(0.54, altura * 0.36, 0.016), 0x62a9bc, 0, altura / 2, 0.28, 'faixa-laticinios');
  peca(grupo, new THREE.BoxGeometry(0.12, 0.012, 0.55), 0x62a9bc, 0, altura + 0.007, 0, 'fita-laticinios');
  return grupo;
}
