import * as THREE from 'three';
import { materialRotuloSvg } from './rotulos-produtos.js';
import { criarGeometriasSaco } from './embalagem-saco.js';

const TIPOS = [
  { id: 'macarrao', cor: 0x075477, altura: 0.62, largura: 0.36, profundidade: 0.24 },
  { id: 'feijao', cor: 0x548165, altura: 0.54, largura: 0.36, profundidade: 0.24 },
  { id: 'arroz', cor: 0x4b789f, altura: 0.56, largura: 0.38, profundidade: 0.25 },
  { id: 'farinha', cor: 0xbd9840, altura: 0.5, largura: 0.34, profundidade: 0.23 }
];
const materiais = TIPOS.map(tipo => new THREE.MeshStandardMaterial({ color: tipo.cor, roughness: 0.92 }));
const acabamentos = TIPOS.map(tipo => new THREE.MeshStandardMaterial({ color: new THREE.Color(tipo.cor).lerp(new THREE.Color(0xffffff), 0.22), roughness: 0.95 }));
const impressoes = new Map();

function materialSaco(caminho, cor, rugosidade) {
  if (!impressoes.has(caminho)) {
    const rotulo = materialRotuloSvg(caminho, cor);
    impressoes.set(caminho, new THREE.MeshStandardMaterial({ map: rotulo.map, color: rotulo.color,
      roughness: rugosidade, metalness: 0, userData: { svg: rotulo.userData.svg } }));
  }
  return impressoes.get(caminho);
}

export function criarMantimento(variante = 0) {
  const indice = Math.floor(variante / 3) % TIPOS.length;
  const tipo = TIPOS[indice], grupo = new THREE.Group();
  grupo.name = `mantimento-${tipo.id}`; grupo.userData.variedade = tipo.id;
  const { largura: w, altura: h, profundidade: d } = tipo;
  const saco = tipo.id !== 'macarrao' ? criarGeometriasSaco(w, h, d) : null;
  const geometria = saco ? saco.bordas : new THREE.BoxGeometry(w, h, d);
  const corpo = new THREE.Mesh(geometria, materiais[indice]);
  corpo.name = 'corpo-mantimento'; corpo.castShadow = true; corpo.receiveShadow = true; grupo.add(corpo);
  const frente = new THREE.Mesh(saco ? saco.frente : new THREE.PlaneGeometry(w - 0.025, h - 0.035),
    saco ? materialSaco(`mantimentos/${tipo.id}`, 0xf1f5f9, 0.95) : materialRotuloSvg(`mantimentos/${tipo.id}`, tipo.cor));
  frente.name = 'rotulo-mantimento'; frente.position.z = saco ? 0 : d / 2 + 0.001; grupo.add(frente);
  const verso = new THREE.Mesh(saco ? saco.verso : new THREE.PlaneGeometry(w - 0.065, h - 0.09),
    saco ? materialSaco(`mantimentos/verso-${tipo.id}`, tipo.cor, 0.95) : materialRotuloSvg(`mantimentos/verso-${tipo.id}`, tipo.cor));
  verso.name = 'verso-mantimento';
  if (saco) {
    for (const face of [frente, verso]) {
      face.userData.texturaCurva = true; face.castShadow = true; face.receiveShadow = true;
    }
  } else {
    verso.position.z = -d / 2 - 0.001; verso.rotation.y = Math.PI;
  }
  grupo.add(verso);
  if (tipo.id === 'macarrao') {
    const lateral = new THREE.Mesh(new THREE.PlaneGeometry(d - 0.025, h - 0.06), materialRotuloSvg('cereais/lateral', 0xfff8e8));
    lateral.position.x = -w / 2 - 0.001; lateral.rotation.y = -Math.PI / 2; grupo.add(lateral);
    const tampa = new THREE.Mesh(new THREE.BoxGeometry(w, 0.014, d), acabamentos[indice]);
    tampa.position.y = h / 2; grupo.add(tampa);
  } else {
    const alca = new THREE.Mesh(saco.alca, acabamentos[indice]);
    alca.name = 'alca-vazada-mantimento'; alca.castShadow = true; alca.receiveShadow = true; grupo.add(alca);
    const vinco = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.004, d * 0.125), materiais[indice]);
    vinco.name = 'vinco-fechamento'; vinco.position.y = h * 0.34; grupo.add(vinco);
  }
  return grupo;
}
