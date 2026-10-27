import * as THREE from 'three';

const materiais = new Map();
function material(cor) {
  if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.72 }));
  return materiais.get(cor);
}

export function criarDoceConfeitaria(id, variante = 0) {
  const grupo = new THREE.Group(); grupo.name = id;
  const adicionar = (geometria, cor, x, y, z) => {
    const malha = new THREE.Mesh(geometria, material(cor));
    malha.position.set(x, y, z); malha.castShadow = true; malha.receiveShadow = true;
    grupo.add(malha); return malha;
  };
  if (id === 'donut') {
    adicionar(new THREE.TorusGeometry(0.105, 0.052, 8, 16), 0xd99b4b, 0, 0.055, 0).rotation.x = Math.PI / 2;
    adicionar(new THREE.TorusGeometry(0.105, 0.044, 8, 16), variante % 2 ? 0x593023 : 0xf2a2ba, 0, 0.09, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      adicionar(new THREE.BoxGeometry(0.035, 0.012, 0.014), i % 2 ? 0xffe19c : 0xffffff, Math.cos(a) * 0.105, 0.135, Math.sin(a) * 0.105).rotation.y = a;
    }
  } else if (id === 'bolo') {
    adicionar(new THREE.CylinderGeometry(0.145, 0.145, 0.18, 16), 0xdba567, 0, 0.09, 0);
    adicionar(new THREE.CylinderGeometry(0.148, 0.148, 0.035, 16), 0xfff0cd, 0, 0.085, 0);
    adicionar(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16), variante % 2 ? 0x613221 : 0xf0b4b1, 0, 0.195, 0);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      adicionar(new THREE.SphereGeometry(0.028, 8, 6), 0xfff4df, Math.cos(a) * 0.1, 0.235, Math.sin(a) * 0.1);
    }
    adicionar(new THREE.SphereGeometry(0.034, 8, 6), 0xc63742, 0, 0.245, 0);
  } else {
    const massa = adicionar(new THREE.SphereGeometry(0.12, 12, 8), 0xdba35d, 0, 0.085, 0); massa.scale.set(1.7, 0.7, 0.8);
    const recheio = adicionar(new THREE.SphereGeometry(0.12, 12, 8), 0xffefc9, 0, 0.09, 0); recheio.scale.set(1.73, 0.15, 0.82);
    const cobertura = adicionar(new THREE.SphereGeometry(0.115, 12, 8), 0x573023, 0, 0.145, 0); cobertura.scale.set(1.65, 0.28, 0.8);
    for (let i = 0; i < 4; i++) adicionar(new THREE.BoxGeometry(0.02, 0.008, 0.12), 0xffe8c4, (i - 1.5) * 0.07, 0.177, 0).rotation.y = -0.3;
  }
  return grupo;
}
