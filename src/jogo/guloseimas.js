import * as THREE from 'three';
import { materialRotuloSvg } from './rotulos-produtos.js';

const TIPOS = [
  { id: 'cookies', cor: 0xa83242, w: 0.4, h: 0.5, d: 0.26 },
  { id: 'amanteigados', cor: 0x245c9f, w: 0.44, h: 0.48, d: 0.44 },
  { id: 'balas', cor: 0x378c62, w: 0.4, h: 0.53, d: 0.25 },
  { id: 'bombons', cor: 0xc69535, w: 0.5, h: 0.3, d: 0.28 }
];
const materiais = TIPOS.map(({ cor }) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.68 }));
const metal = new THREE.MeshStandardMaterial({ color: 0xdbe1e7, roughness: 0.35, metalness: 0.65 });
const impressoes = new Map();
function materialImpresso(caminho, cor) {
  if (!impressoes.has(caminho)) {
    const rotulo = materialRotuloSvg(caminho, cor);
    impressoes.set(caminho, new THREE.MeshStandardMaterial({
      map: rotulo.map, color: rotulo.color, roughness: 0.85, metalness: 0,
      userData: { svg: rotulo.userData.svg }
    }));
  }
  return impressoes.get(caminho);
}

function facesPacote(w, h, d) {
  // As duas faces fecham o pacote: a arte acompanha o volume e as soldas.
  const niveis = [[-h / 2, w * 0.38, d * 0.07], [-h * 0.3, w / 2, d / 2],
    [h * 0.25, w / 2, d / 2], [h / 2, w * 0.38, d * 0.07]];
  return [1, -1].map(lado => {
    const geometria = new THREE.PlaneGeometry(w, h, 1, 3);
    const pos = geometria.attributes.position, uv = geometria.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const [y, x, z] = niveis[3 - Math.floor(i / 2)], u = i % 2;
      pos.setXYZ(i, (u * 2 - 1) * x, y, lado * z);
      uv.setXY(i, lado > 0 ? u : 1 - u, (y + h / 2) / h);
    }
    if (lado < 0) {
      const indices = geometria.index.array;
      for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    }
    geometria.computeVertexNormals(); return geometria;
  });
}

const facesBalas = facesPacote(TIPOS[2].w, TIPOS[2].h, TIPOS[2].d);
const geometrias = TIPOS.map(({ id, w, h, d }) => {
  if (id === 'amanteigados') return new THREE.CylinderGeometry(w / 2, w / 2, h, 24);
  if (id === 'balas') {
    const posicoes = [];
    const frente = facesBalas[0].attributes.position, verso = facesBalas[1].attributes.position;
    for (const lado of [0, 1]) for (let linha = 0; linha < 3; linha++) {
      const a = linha * 2 + lado, b = a + 2;
      const pontos = [a, b].map(i => new THREE.Vector3().fromBufferAttribute(frente, i));
      pontos.push(new THREE.Vector3().fromBufferAttribute(verso, b), new THREE.Vector3().fromBufferAttribute(verso, a));
      if (lado === 0) pontos.reverse();
      for (const i of [0, 1, 2, 0, 2, 3]) posicoes.push(...pontos[i].toArray());
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(posicoes, 3)); geometria.computeVertexNormals();
    return geometria;
  }
  // A casca não duplica as faces impressas, evitando disputa de profundidade.
  const geometria = new THREE.BoxGeometry(w, h, d);
  geometria.setIndex(Array.from(geometria.index.array).slice(0, 24)); geometria.clearGroups();
  return geometria;
});

export function criarGuloseima(variante = 0) {
  const indice = Math.floor(variante / 3) % TIPOS.length;
  const tipo = TIPOS[indice], { w, h, d } = tipo;
  const grupo = new THREE.Group(); grupo.name = `guloseima-${tipo.id}`; grupo.userData.variedade = tipo.id;
  const corpo = new THREE.Mesh(geometrias[indice], materiais[indice]);
  corpo.name = 'embalagem-guloseima'; corpo.castShadow = true; corpo.receiveShadow = true; grupo.add(corpo);
  for (const verso of [false, true]) {
    const curva = tipo.id === 'amanteigados';
    const geometria = curva
      ? new THREE.CylinderGeometry(w / 2 + 0.003, w / 2 + 0.003, h - 0.04, 24, 1, true, -Math.PI / 2, Math.PI)
      : tipo.id === 'balas' ? facesBalas[verso ? 1 : 0] : new THREE.PlaneGeometry(w, h);
    const rotulo = new THREE.Mesh(geometria, materialImpresso(`doces/${verso ? 'verso-' : ''}${tipo.id}`, tipo.cor));
    rotulo.name = verso ? 'verso-guloseima' : 'rotulo-guloseima';
    if (curva || tipo.id === 'balas') rotulo.userData.texturaCurva = true;
    if (tipo.id !== 'balas') {
      if (!curva) rotulo.position.z = (verso ? -1 : 1) * d / 2;
      if (verso) rotulo.rotation.y = Math.PI;
    }
    grupo.add(rotulo);
  }
  if (tipo.id === 'amanteigados') {
    for (const sinal of [-1, 1]) {
      const aro = new THREE.Mesh(new THREE.CylinderGeometry(w / 2 + 0.004, w / 2 + 0.004, 0.018, 24), metal);
      aro.name = 'aro-lata-biscoitos'; aro.position.y = sinal * (h / 2 - 0.009); grupo.add(aro);
    }
  } else {
    for (const sinal of [-1, 1]) {
      const selo = new THREE.Mesh(new THREE.BoxGeometry(w * (tipo.id === 'balas' ? 0.7 : 1.01), 0.018, d * (tipo.id === 'balas' ? 0.65 : 1.01)), materiais[indice]);
      selo.name = tipo.id === 'balas' ? 'solda-pacote-balas' : 'aba-caixa-doces';
      selo.position.y = sinal * (h / 2 - 0.009); grupo.add(selo);
    }
  }
  return grupo;
}
