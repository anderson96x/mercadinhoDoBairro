import * as THREE from 'three';

const materiais = new Map();

export function materialRotuloSvg(caminho, cor) {
  if (!materiais.has(caminho)) {
    const mapa = typeof document !== 'undefined'
      ? new THREE.TextureLoader().load(`${import.meta.env?.BASE_URL ?? '/'}produtos/${caminho}.svg`)
      : null;
    if (mapa) mapa.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: mapa, color: mapa ? 0xffffff : cor, toneMapped: false });
    material.userData.svg = `produtos/${caminho}.svg`;
    materiais.set(caminho, material);
  }
  return materiais.get(caminho);
}
