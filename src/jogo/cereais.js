import * as THREE from 'three';
import { materialRotuloSvg } from './rotulos-produtos.js';

const VARIEDADES = [
  { id: 'mel', cor: 0xffd43f },
  { id: 'flocos', cor: 0x059bc2 },
  { id: 'chocolate', cor: 0x95cf21 },
  { id: 'frutas', cor: 0xf44773 }
];
const materiais = VARIEDADES.map(({ cor }) => ({
  caixa: new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85 }),
  topo: new THREE.MeshStandardMaterial({ color: new THREE.Color(cor).multiplyScalar(0.92), roughness: 0.85 }),
  vinco: new THREE.MeshStandardMaterial({ color: new THREE.Color(cor).multiplyScalar(0.75), roughness: 0.85 })
}));

export function criarCereal(variante = 0) {
  const indice = Math.floor(variante / 3) % VARIEDADES.length;
  const tipo = VARIEDADES[indice], material = materiais[indice];
  const grupo = new THREE.Group(); grupo.name = `cereal-${tipo.id}`;
  grupo.userData.variedade = tipo.id;
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.66, 0.26), material.caixa);
  corpo.name = 'caixa-cereal'; corpo.castShadow = true; corpo.receiveShadow = true; grupo.add(corpo);
  const topo = new THREE.Mesh(new THREE.BoxGeometry(0.358, 0.008, 0.258), material.topo);
  topo.name = 'topo-caixa-cereal'; topo.position.y = 0.334; grupo.add(topo);
  for (const z of [-0.105, 0.105]) {
    const vinco = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.002, 0.002), material.vinco);
    vinco.position.set(0, 0.339, z); grupo.add(vinco);
  }
  const frente = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.66), materialRotuloSvg(`cereais/${tipo.id}`, tipo.cor));
  frente.name = 'rotulo-cereal'; frente.position.z = 0.131; grupo.add(frente);
  const verso = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.66), materialRotuloSvg('cereais/verso', 0xfff8e8));
  verso.name = 'verso-caixa-cereal'; verso.position.z = -0.131; verso.rotation.y = Math.PI; grupo.add(verso);
  for (const lado of [-1, 1]) {
    const lateral = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.48), materialRotuloSvg('cereais/lateral', 0xfff8e8));
    lateral.name = 'lateral-caixa-cereal'; lateral.position.set(lado * 0.181, -0.065, 0);
    lateral.rotation.y = lado * Math.PI / 2; grupo.add(lateral);
  }
  return grupo;
}
