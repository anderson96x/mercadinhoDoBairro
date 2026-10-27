import * as THREE from 'three';

export function construirBatedeira() {
  const grupo = new THREE.Group(); grupo.name = 'batedeira-confeitaria';
  const materiais = new Map();
  const malha = (geometria, cor, x, y, z) => {
    if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5, metalness: cor === 0xaeb8b9 ? 0.75 : 0.05 }));
    const objeto = new THREE.Mesh(geometria, materiais.get(cor)); objeto.position.set(x, y, z);
    objeto.castShadow = true; objeto.receiveShadow = true; grupo.add(objeto); return objeto;
  };
  const caixa = (w, h, d, cor, x, y, z) => malha(new THREE.BoxGeometry(w, h, d), cor, x, y, z);
  caixa(0.6, 0.62, 0.7, 0xd5d9d5, 0, 0.54, 0);
  caixa(0.62, 0.08, 0.72, 0xaeb8b9, 0, 0.24, 0);
  caixa(0.6, 0.09, 0.72, 0xf4f3e8, 0, 0.89, 0);
  caixa(0.6, 1, 0.18, 0xf4f3e8, 0, 1.38, -0.25);
  caixa(0.62, 0.28, 0.69, 0xf4f3e8, 0, 1.85, -0.005);
  malha(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16), 0xf4f3e8, 0.12, 2.035, -0.12);
  malha(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 12), 0x637371, 0.12, 2.09, -0.12);
  const perfil = [new THREE.Vector2(0.13, 0), new THREE.Vector2(0.22, 0.07), new THREE.Vector2(0.25, 0.44), new THREE.Vector2(0.245, 0.47), new THREE.Vector2(0.23, 0.44), new THREE.Vector2(0.2, 0.09), new THREE.Vector2(0.13, 0.035)];
  malha(new THREE.LatheGeometry(perfil, 20), 0xb87f57, 0, 0.94, 0.08).name = 'cuba-batedeira';
  const massa = malha(new THREE.CylinderGeometry(0.21, 0.19, 0.035, 20), 0xedc184, 0, 1.28, 0.08);
  massa.name = 'massa-batedeira';
  const rotor = new THREE.Group(); rotor.name = 'batedor-confeitaria'; rotor.position.set(0, 1.55, 0.08); grupo.add(rotor);
  const metal = new THREE.MeshStandardMaterial({ color: 0xaeb8b9, roughness: 0.3, metalness: 0.8 });
  const eixo = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), metal); rotor.add(eixo);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(Math.cos(a) * 0.22, -0.22, Math.sin(a) * 0.22), new THREE.Vector3(0, -0.24, 0));
    rotor.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 12, 0.009, 5, false), metal));
  }
  caixa(0.14, 0.33, 0.025, 0x34433f, -0.2, 1.5, -0.145);
  for (const [y, cor] of [[1.59, 0xe7503b], [1.46, 0x64bd7b]]) caixa(0.06, 0.065, 0.035, cor, -0.2, y, -0.125);
  return { grupo, rotor, massa };
}
