import * as THREE from 'three';

export const ALTURA_BANDEJA_MEL = 0.61;

export function construirColmeia(pai, ponto, { caixa, esfera, cilindro }) {
  const colmeia = new THREE.Group();
  colmeia.name = 'colmeia-madeira';
  colmeia.position.set(ponto.x, 0, ponto.z); pai.add(colmeia);
  const madeira = 0xdca66a, clara = 0xe8ba7c, borda = 0xc28b52;

  for (const x of [-0.88, 0.88]) for (const z of [-1.12, 0.48]) {
    caixa(colmeia, 0.26, 0.43, 0.3, borda, x, 0.39, z);
  }
  caixa(colmeia, 2.12, 0.22, 1.94, madeira, 0, 0.61, -0.4);
  const bandeja = caixa(colmeia, 2.46, 0.12, 3.24, clara, 0, ALTURA_BANDEJA_MEL - 0.06, 0.16);
  bandeja.name = 'bandeja-mel';
  // A extensão da base é a própria bandeja de coleta.
  for (const x of [-1.19, 1.19]) caixa(colmeia, 0.08, 0.1, 1.2, borda, x, 0.64, 1.18);
  caixa(colmeia, 2.46, 0.08, 0.08, borda, 0, 0.63, 1.74);

  for (let andar = 0; andar < 2; andar++) {
    const base = 0.75 + andar * 0.73;
    caixa(colmeia, 2.08, 0.7, 1.9, madeira, 0, base + 0.35, -0.4);
    // Tábuas horizontais, com juntas finas e tons de madeira discretos.
    for (let i = 0; i < 3; i++) {
      const y = base + 0.115 + i * 0.232;
      const cor = [clara, 0xe3b174, 0xe8b97f][(i + andar) % 3];
      for (const z of [-1.356, 0.556]) caixa(colmeia, 2.08, 0.224, 0.024, cor, 0, y, z);
      for (const x of [-1.047, 1.047]) caixa(colmeia, 0.024, 0.224, 1.9, cor, x, y, -0.4);
    }
    for (const z of [-1.378, 0.578]) {
      caixa(colmeia, 0.64, 0.09, 0.018, 0x987044, 0, base + 0.43, z);
      caixa(colmeia, 0.7, 0.075, 0.09, borda, 0, base + 0.48, z);
    }
    for (const x of [-1.067, 1.067]) {
      caixa(colmeia, 0.02, 0.09, 0.55, 0x987044, x, base + 0.43, -0.4);
      caixa(colmeia, 0.09, 0.075, 0.61, borda, x, base + 0.48, -0.4);
    }
  }
  caixa(colmeia, 0.72, 0.065, 0.025, 0x63492e, 0, 0.735, 0.563);
  caixa(colmeia, 0.92, 0.045, 0.22, borda, 0, 0.7, 0.63);
  caixa(colmeia, 2.26, 0.16, 2.06, clara, 0, 2.23, -0.4);

  const empena = new THREE.Shape();
  empena.moveTo(-1.13, 0); empena.lineTo(1.13, 0); empena.lineTo(0, 0.44); empena.closePath();
  const face = new THREE.Mesh(new THREE.ExtrudeGeometry(empena, { depth: 2.06, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: clara, roughness: 0.85 }));
  face.position.set(0, 2.31, -1.43); face.castShadow = true; face.receiveShadow = true; colmeia.add(face);
  const inclinacao = Math.atan2(0.47, 1.24);
  const larguraAgua = Math.hypot(1.24, 0.47);
  for (const lado of [-1, 1]) {
    const telhado = new THREE.Group(); telhado.position.set(lado * 0.62, 2.545, -0.4);
    telhado.rotation.z = -lado * inclinacao; colmeia.add(telhado);
    caixa(telhado, larguraAgua, 0.09, 2.3, madeira, 0, 0, 0);
    for (let i = 0; i < 5; i++) caixa(telhado, larguraAgua, 0.035, 0.448,
      i % 2 ? 0xe4b174 : clara, 0, 0.055, -0.92 + i * 0.46);
  }
  caixa(colmeia, 0.12, 0.1, 2.32, clara, 0, 2.81, -0.4);
  const respiro = cilindro(colmeia, 0.072, 0.072, 0.025, 0x755534, 0, 2.48, 0.648);
  respiro.rotation.x = Math.PI / 2;

  const abelhas = [];
  for (let i = 0; i < 5; i++) {
    const abelha = new THREE.Group(); abelha.name = `abelha-${i + 1}`; pai.add(abelha);
    esfera(abelha, 0.085, 0xf6c844, 0, 0, 0, 0.82, 0.8, 1.4);
    for (const z of [-0.045, 0.028]) {
      const faixa = cilindro(abelha, 0.07, 0.07, 0.026, 0x473727, 0, 0, z, 8);
      faixa.rotation.x = Math.PI / 2;
    }
    esfera(abelha, 0.057, 0x473727, 0, 0.005, 0.11);
    const asas = [-1, 1].map(lado => {
      const asa = new THREE.Group(); asa.position.set(lado * 0.035, 0.05, 0); abelha.add(asa);
      esfera(asa, 0.08, 0xeaf6ed, lado * 0.065, 0, 0, 1.3, 0.15, 0.7);
      return asa;
    });
    abelha.userData.asas = asas;
    abelhas.push(abelha);
  }
  animarAbelhas(abelhas, ponto, 0);
  return abelhas;
}

export function animarAbelhas(abelhas, ponto, tempo) {
  abelhas.forEach((abelha, i) => {
    const sentido = i % 2 ? -1 : 1;
    const fase = tempo * (0.85 + i * 0.09) * sentido + i * Math.PI * 2 / abelhas.length;
    const raioX = 1.5 + i * 0.08, raioZ = 1.85 + i * 0.06;
    abelha.position.set(ponto.x + Math.cos(fase) * raioX,
      1.32 + i * 0.24 + Math.sin(tempo * 2.7 + i * 1.9) * 0.17,
      ponto.z - 0.12 + Math.sin(fase) * raioZ);
    abelha.rotation.set(Math.cos(tempo * 2.7 + i * 1.9) * -0.1,
      Math.atan2(-Math.sin(fase) * raioX * sentido, Math.cos(fase) * raioZ * sentido),
      Math.sin(fase * 2) * 0.12);
    abelha.userData.asas.forEach((asa, lado) => {
      asa.rotation.z = (lado ? 1 : -1) * (0.25 + Math.sin(tempo * 48 + i) * 0.65);
    });
  });
}
