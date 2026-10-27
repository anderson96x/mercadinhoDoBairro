import * as THREE from 'three';

// Modelo compartilhado pelo pomar e pelas árvores decorativas do bairro.
export function criarArvore(pai, { x = 0, z = 0, nome = 'arvore' } = {}, { cilindro, esfera }) {
  const arvore = new THREE.Group();
  arvore.name = nome;
  arvore.position.set(x, 0, z);
  pai.add(arvore);
  cilindro(arvore, 0.18, 0.28, 2, 0x87603a, 0, 1.1, 0, 7);
  for (const lado of [-1, 1]) {
    const galho = cilindro(arvore, 0.08, 0.12, 1.1, 0x87603a, lado * 0.3, 1.8, 0, 6);
    galho.rotation.z = -lado * 0.55;
  }
  for (const [px, py, pz, raio, cor] of [
    [0, 3.35, 0, 1, 0x8fc92d], [-0.7, 2.7, 0, 0.95, 0x78b52b],
    [0.7, 2.75, -0.15, 0.95, 0x92cc31], [0, 2.65, 0.65, 1, 0x6eac29],
    [0, 2.8, -0.65, 0.85, 0x83be2d], [-0.5, 3.15, 0.5, 0.75, 0x9bd43a]
  ]) esfera(arvore, raio, cor, px, py, pz, 1, 0.85, 1);
  return arvore;
}
