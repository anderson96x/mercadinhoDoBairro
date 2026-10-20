import * as THREE from 'three';

const ALTURA_BICO = 1.48;
const ALTURA_TERRA = 0.46;
const TEMPO_VOO = 0.85;
const VELOCIDADE_ROTACAO = 0.72;
const metal = new THREE.MeshStandardMaterial({ color: 0xb9c7c6, metalness: 0.65, roughness: 0.3 });
const latao = new THREE.MeshStandardMaterial({ color: 0xd5ad60, metalness: 0.6, roughness: 0.34 });
const verde = new THREE.MeshStandardMaterial({ color: 0x286750, roughness: 0.72 });
const borracha = new THREE.MeshStandardMaterial({ color: 0x344d44, roughness: 0.9 });
const agua = new THREE.MeshBasicMaterial({ color: 0xa8e6f5, transparent: true, opacity: 0.82, depthWrite: false });
const espuma = new THREE.MeshBasicMaterial({ color: 0xd2f6fa, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
const geometriaGota = new THREE.OctahedronGeometry(0.034);
const geometriaRespingo = new THREE.RingGeometry(0.065, 0.085, 10);
const eixoY = new THREE.Vector3(0, 1, 0);
const tangente = new THREE.Vector3();

function peca(pai, geometria, material, x, y, z) {
  const mesh = new THREE.Mesh(geometria, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  pai.add(mesh);
  return mesh;
}

export function criarIrrigador(grupo, horta, canteiro = { w: 3.6, d: 2.5 }) {
  const irrigador = new THREE.Group(); irrigador.name = 'irrigador';
  irrigador.position.set(horta.x, 0, horta.z);
  irrigador.visible = false; grupo.add(irrigador);
  const base = new THREE.Group(); base.name = 'base-irrigador'; irrigador.add(base);
  peca(base, new THREE.CylinderGeometry(0.24, 0.31, 0.1, 10), verde, 0, 0.48, 0);
  peca(base, new THREE.CylinderGeometry(0.085, 0.1, 0.8, 10), metal, 0, 0.91, 0);
  for (const y of [0.58, 1.25]) peca(base, new THREE.CylinderGeometry(0.12, 0.12, 0.11, 10), verde, 0, y, 0);
  peca(base, new THREE.CylinderGeometry(0.1, 0.13, 0.13, 10), latao, 0, 1.36, 0);
  const mangueira = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.54, 0), new THREE.Vector3(-0.23, 0.5, 0.14),
    new THREE.Vector3(-0.48, 0.47, 0.32), new THREE.Vector3(-0.75, 0.47, 0.2)
  ]);
  peca(base, new THREE.TubeGeometry(mangueira, 10, 0.045, 6, false), borracha, 0, 0, 0);
  const cabeca = new THREE.Group(); cabeca.name = 'cabeca-irrigador';
  cabeca.position.y = ALTURA_BICO; irrigador.add(cabeca);
  peca(cabeca, new THREE.CylinderGeometry(0.16, 0.12, 0.16, 10), latao, 0, -0.02, 0);
  peca(cabeca, new THREE.CylinderGeometry(0.09, 0.09, 0.055, 8), verde, 0, 0.09, 0);
  for (const lado of [-1, 1]) {
    const braco = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(lado * 0.22, 0, 0),
      new THREE.Vector3(lado * 0.36, 0.04, -lado * 0.07)
    ]);
    peca(cabeca, new THREE.TubeGeometry(braco, 6, 0.045, 6, false), metal, 0, 0, 0);
    const bico = peca(cabeca, new THREE.CylinderGeometry(0.064, 0.075, 0.12, 8), latao, lado * 0.36, 0.04, -lado * 0.07);
    bico.quaternion.setFromUnitVectors(eixoY, new THREE.Vector3(lado, 0.25, -lado * 0.2).normalize());
  }
  const gotas = [], respingos = [];
  for (let jato = 0; jato < 6; jato++) {
    for (let i = 0; i < 7; i++) {
      const gota = new THREE.Mesh(geometriaGota, agua);
      gota.name = 'gota-irrigador'; irrigador.add(gota);
      gotas.push({ mesh: gota, jato, atraso: i / 7 });
    }
    const respingo = new THREE.Mesh(geometriaRespingo, espuma);
    respingo.rotation.x = -Math.PI / 2; irrigador.add(respingo); respingos.push(respingo);
  }
  irrigador.userData = { cabeca, gotas, respingos, fase: horta.x * 0.31 + horta.z * 0.17,
    alcanceX: canteiro.w / 2 - 0.22, alcanceZ: canteiro.d / 2 - 0.22 };
  animarIrrigador(irrigador, 0);
  return irrigador;
}

function direcaoJato(dados, jato, emissao) {
  return emissao * VELOCIDADE_ROTACAO + dados.fase + Math.floor(jato / 3) * Math.PI + (jato % 3 - 1) * 0.16;
}

function alcanceJato(dados, angulo, jato) {
  // Contém a água na terra do canteiro, inclusive nos canteiros retangulares.
  return (0.88 + jato % 3 * 0.05) / Math.hypot(Math.cos(angulo) / dados.alcanceX, Math.sin(angulo) / dados.alcanceZ);
}

export function animarIrrigador(irrigador, tempo) {
  const d = irrigador.userData;
  d.cabeca.rotation.y = -(tempo * VELOCIDADE_ROTACAO + d.fase);
  for (const { mesh, jato, atraso } of d.gotas) {
    const t = ((tempo / TEMPO_VOO + atraso) % 1 + 1) % 1;
    // A gota conserva a direção que o bico tinha ao lançá-la.
    const angulo = direcaoJato(d, jato, tempo - t * TEMPO_VOO);
    const alcance = alcanceJato(d, angulo, jato);
    const raio = THREE.MathUtils.lerp(0.4, alcance, t);
    mesh.position.set(Math.cos(angulo) * raio, ALTURA_BICO + 0.04 + (ALTURA_TERRA - ALTURA_BICO - 0.04) * t + 2.2 * t * (1 - t), Math.sin(angulo) * raio);
    tangente.set(Math.cos(angulo) * (alcance - 0.4), ALTURA_TERRA - ALTURA_BICO - 0.04 + 2.2 * (1 - 2 * t), Math.sin(angulo) * (alcance - 0.4)).normalize();
    mesh.quaternion.setFromUnitVectors(eixoY, tangente);
    mesh.scale.set(0.68 + t * 0.25, 1.7 - t * 0.65, 0.68 + t * 0.25);
  }
  d.respingos.forEach((mesh, jato) => {
    const t = ((tempo / TEMPO_VOO + jato / 6) % 1 + 1) % 1;
    const angulo = direcaoJato(d, jato, tempo - t * TEMPO_VOO - TEMPO_VOO);
    const alcance = alcanceJato(d, angulo, jato);
    mesh.position.set(Math.cos(angulo) * alcance, ALTURA_TERRA + 0.015, Math.sin(angulo) * alcance);
    mesh.scale.setScalar(0.25 + t * 0.9);
    mesh.visible = t < 0.72;
  });
}
