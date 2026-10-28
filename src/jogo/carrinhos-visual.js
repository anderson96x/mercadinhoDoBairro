import * as THREE from 'three';

const metal = new THREE.MeshStandardMaterial({ color: 0xb7c8ca, metalness: 0.55, roughness: 0.4 });
const borracha = new THREE.MeshStandardMaterial({ color: 0x303c40, roughness: 1 });

export const CARRINHO_CLIENTE = Object.freeze({
  frente: Object.freeze({
    x: 0, y: -0.16, z: 1.04, rotacao: 0,
    carga: Object.freeze({ x: 0, y: 0.48, z: 1.02 }),
    sacola: Object.freeze({ x: 0, y: 0.36, z: 1.2, escala: 0.7 })
  }),
  lateral: Object.freeze({
    x: 0.9, y: -0.16, z: 0, rotacao: Math.PI / 2,
    carga: Object.freeze({ x: 1.04, y: 0.48, z: 0 })
  })
});

export function criarCarrinho() {
  const grupo = new THREE.Group(); grupo.name = 'carrinho-compras';
  const corCesta = new THREE.MeshStandardMaterial({ color: 0x286750, roughness: 0.75 });
  const barrasCesta = [];
  const barra = (inicio, fim, espessura = 0.018, material = metal) => {
    const a = new THREE.Vector3(...inicio), b = new THREE.Vector3(...fim);
    const peca = new THREE.Mesh(new THREE.BoxGeometry(espessura, a.distanceTo(b), espessura), material);
    peca.position.copy(a).add(b).multiplyScalar(0.5);
    peca.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    peca.castShadow = true; grupo.add(peca); return peca;
  };
  // Cesto trapezoidal aberto, com grade metálica em todas as faces.
  for (const lado of [-1, 1]) {
    for (const y of [0.55, 0.72, 0.9, 1.08]) {
      const t = (y - 0.55) / 0.53, x = lado * (0.24 + t * 0.11);
      barra([x, y, -0.24 - t * 0.1], [x, y, 0.47 + t * 0.15]);
    }
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      barra([lado * 0.24, 0.55, -0.24 + t * 0.71], [lado * 0.35, 1.08, -0.34 + t * 0.96]);
    }
    barra([lado * 0.29, 0.2, -0.42], [lado * 0.24, 0.55, -0.24], 0.035);
    barra([lado * 0.29, 0.2, -0.42], [lado * 0.29, 1.12, -0.49], 0.035);
    barra([lado * 0.29, 0.2, -0.42], [lado * 0.29, 0.2, 0.51], 0.035);
    barrasCesta.push(barra([lado * 0.35, 1.08, -0.34], [lado * 0.29, 1.12, -0.49], 0.035, corCesta));
  }
  for (const frente of [false, true]) {
    for (const y of [0.55, 0.72, 0.9, 1.08]) {
      const t = (y - 0.55) / 0.53, x = 0.24 + t * 0.11, z = frente ? 0.47 + t * 0.15 : -0.24 - t * 0.1;
      barra([-x, y, z], [x, y, z]);
    }
    for (let i = 0; i <= 6; i++) {
      const t = i / 6 * 2 - 1;
      barra([t * 0.24, 0.55, frente ? 0.47 : -0.24], [t * 0.35, 1.08, frente ? 0.62 : -0.34]);
    }
  }
  for (let i = 0; i <= 6; i++) {
    const z = -0.24 + i / 6 * 0.71;
    barra([-0.24, 0.55, z], [0.24, 0.55, z]);
    barra([-0.29, 0.2, z], [0.29, 0.2, z]);
  }
  barrasCesta.push(barra([-0.32, 1.12, -0.49], [0.32, 1.12, -0.49], 0.055, corCesta));
  const rodas = [];
  for (const x of [-0.29, 0.29]) for (const z of [-0.37, 0.46]) {
    barra([x, 0.11, z], [x, 0.2, z], 0.04);
    const roda = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.055, 10), borracha);
    roda.rotation.z = Math.PI / 2; roda.position.set(x, 0.1, z); grupo.add(roda); rodas.push(roda);
  }
  grupo.userData.rodas = rodas;
  grupo.userData.barrasCesta = barrasCesta;
  return grupo;
}

export function aplicarPaletaCarrinho(carrinho, paleta) {
  if (!carrinho || carrinho.userData.paletaAplicada === paleta.id) return;
  for (const barra of carrinho.userData.barrasCesta ?? []) barra.material.color.set(paleta.principal);
  carrinho.userData.paletaAplicada = paleta.id;
}
