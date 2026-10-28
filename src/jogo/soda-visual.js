import * as THREE from 'three';
import { criarGeladeiraSucos, GELADEIRA_SUCOS } from './sucos-visual.js';
import { materialRotuloSvg } from './rotulos-produtos.js';
import { SODA } from './soda.js';

const rosa = new THREE.MeshStandardMaterial({ color: 0xdf496c, roughness: 0.4 });
const metal = new THREE.MeshStandardMaterial({ color: 0xcbd0e3, roughness: 0.3, metalness: 0.65 });
function peca(pai, geometria, material, x, y, z, nome) {
  const mesh = new THREE.Mesh(geometria, material);
  mesh.name = nome; mesh.position.set(x, y, z); mesh.castShadow = true; pai.add(mesh);
  return mesh;
}
function rotulo(pai, w, h, x, y, z, angulo = 0) {
  const arte = peca(pai, new THREE.PlaneGeometry(w, h), materialRotuloSvg('soda', 0xdf496c), x, y, z, 'marca-soda');
  arte.rotation.y = angulo;
  return arte;
}

export function criarLataSoda() {
  const grupo = new THREE.Group(); grupo.name = 'lata-soda';
  peca(grupo, new THREE.CylinderGeometry(0.105, 0.105, 0.29, 16), rosa, 0, 0, 0, 'corpo-lata-soda');
  for (const y of [-0.15, 0.15]) {
    peca(grupo, new THREE.CylinderGeometry(0.098, 0.098, 0.015, 16), metal, 0, y, 0, 'tampa-lata-soda');
    const aro = peca(grupo, new THREE.TorusGeometry(0.099, 0.008, 4, 16), metal, 0, y, 0, 'aro-lata-soda');
    aro.rotation.x = Math.PI / 2;
  }
  const lacre = peca(grupo, new THREE.TorusGeometry(0.025, 0.007, 4, 8), metal, 0, 0.162, 0, 'lacre-soda');
  lacre.rotation.x = Math.PI / 2; lacre.scale.y = 1.5;
  const arte = peca(grupo, new THREE.CylinderGeometry(0.106, 0.106, 0.27, 16, 1, true, -Math.PI / 2, Math.PI), materialRotuloSvg('soda', 0xdf496c), 0, 0, 0, 'rotulo-lata-soda');
  arte.userData.texturaCurva = true;
  return grupo;
}

export function posicaoLataSoda(ponto, indice) {
  // Quatro níveis, duas fileiras compactas de três latas em cada nível.
  return new THREE.Vector3(ponto.x + (indice % 3 - 1) * 0.24,
    GELADEIRA_SUCOS.alturas[Math.floor(indice / 6)] + 0.2,
    ponto.z + 0.16 + Math.floor(indice % 6 / 3) * 0.24);
}

export function criarGeladeiraSoda(pai) {
  const grupo = criarGeladeiraSucos(pai);
  grupo.name = 'geladeira-soda'; grupo.position.set(SODA.geladeira.x, 0, SODA.geladeira.z);
  grupo.traverse(o => {
    if (o.name.includes('prateleira-sucos')) o.name = o.name.replace('prateleira-sucos', 'prateleira-soda');
    if (['base-geladeira-sucos', 'lateral-geladeira-sucos', 'teto-geladeira-sucos', 'faixa-vermelha-sucos', 'identificacao-sabor-sucos'].includes(o.name)) o.material = rosa;
  });
  const { w, d } = SODA.geladeira;
  rotulo(grupo, w - 0.2, 0.18, 0, 2.795, d / 2 + 0.015);
  for (const lado of [-1, 1]) rotulo(grupo, d - 0.08, 2.1, lado * (w / 2 + 0.003), 1.78, 0, lado * Math.PI / 2);
  return grupo;
}

export function criarCaixaSoda() {
  const grupo = new THREE.Group(); grupo.name = 'caixa-soda';
  peca(grupo, new THREE.BoxGeometry(0.68, 0.32, 0.68), rosa, 0, 0.16, 0, 'papelao-soda');
  for (const lado of [-1, 1]) {
    rotulo(grupo, 0.66, 0.3, 0, 0.16, lado * 0.341, lado < 0 ? Math.PI : 0);
    rotulo(grupo, 0.66, 0.3, lado * 0.341, 0.16, 0, lado * Math.PI / 2);
  }
  const topo = rotulo(grupo, 0.66, 0.66, 0, 0.321, 0); topo.rotation.x = -Math.PI / 2;
  return grupo;
}
