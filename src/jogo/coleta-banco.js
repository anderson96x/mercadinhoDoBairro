import * as THREE from 'three';
import { CONFIG } from './configuracao.js';
import { RUA } from './bairro.js';
import { BANCO } from './banco.js';

const suave = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const cores = new Map();
function material(cor, duplo = false) {
  const chave = `${cor}:${duplo}`;
  if (!cores.has(chave)) cores.set(chave, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, side: duplo ? THREE.DoubleSide : THREE.FrontSide }));
  return cores.get(chave);
}
function bloco(pai, w, h, d, cor, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(cor));
  mesh.position.set(x, y, z); mesh.castShadow = true; pai.add(mesh); return mesh;
}
function painel(pai, pontos, cor) {
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(pontos.flat(), 3));
  geometria.setIndex([0, 1, 2, 0, 2, 3]);
  geometria.computeVertexNormals();
  const malha = new THREE.Mesh(geometria, material(cor, true));
  malha.castShadow = true; pai.add(malha);
  return malha;
}
function criarCarroForte() {
  const van = new THREE.Group(); van.name = 'carro-forte';
  const branco = 0xe9efed, claro = 0xd5dddc, azul = 0x3579aa, verde = 0x25855d;
  const escuro = 0x263a43, pneu = 0x2e383c;

  // Caixa de valores alta e cabine curta com vidro inclinado, como na referência.
  // Paredes separadas deixam uma abertura real para a porta lateral do passageiro.
  bloco(van, 2.05, 0.18, 1.35, branco, -0.64, 0.75, 0);
  bloco(van, 2.05, 1.34, 0.08, branco, -0.64, 1.49, -0.635);
  bloco(van, 0.09, 1.34, 1.35, branco, -1.62, 1.49, 0);
  bloco(van, 0.09, 1.34, 1.35, branco, 0.34, 1.49, 0);
  bloco(van, 0.12, 1.34, 0.08, branco, -1.605, 1.49, 0.635);
  bloco(van, 1.13, 1.34, 0.08, branco, -0.185, 1.49, 0.635);
  bloco(van, 1.8, 0.012, 1.1, escuro, -0.64, 0.85, 0);
  bloco(van, 2.07, 0.13, 1.38, claro, -0.64, 2.22, 0);
  bloco(van, 1.14, 0.58, 1.34, branco, 0.94, 0.72, 0);
  bloco(van, 0.68, 0.49, 1.31, branco, 0.68, 1.24, 0);
  painel(van, [[0.35, 1.82, -0.65], [0.76, 1.82, -0.65], [1.49, 1.08, -0.65], [0.91, 1.08, -0.65]], branco);
  painel(van, [[0.76, 1.82, 0.65], [0.35, 1.82, 0.65], [0.91, 1.08, 0.65], [1.49, 1.08, 0.65]], branco);
  painel(van, [[0.83, 1.75, -0.6], [0.83, 1.75, 0.6], [1.46, 1.07, 0.6], [1.46, 1.07, -0.6]], branco);
  for (const lado of [-1, 1]) {
    const z = lado * 0.663;
    painel(van, [[0.48, 1.7, z], [0.78, 1.7, z], [1.29, 1.16, z], [0.94, 1.16, z]], azul);
    bloco(van, 0.11, 0.13, 0.22, claro, 1.1, 1.13, lado * 0.77);
    bloco(van, 2.03, 0.09, 0.025, verde, -0.64, 0.82, lado * 0.69);
    bloco(van, 0.37, 0.1, 0.04, escuro, 1.08, 0.6, lado * 0.61);
    bloco(van, 0.08, 0.08, 0.05, 0xe3ad28, 1.52, 0.81, lado * 0.48);
    bloco(van, 0.06, 0.13, 0.05, 0xc5524a, -1.69, 0.85, lado * 0.47);
  }
  painel(van, [[0.94, 1.66, -0.57], [0.94, 1.66, 0.57], [1.43, 1.13, 0.57], [1.43, 1.13, -0.57]], azul);
  bloco(van, 0.09, 0.22, 0.61, claro, 1.51, 0.82, 0);
  for (const z of [-0.22, -0.07, 0.08, 0.23]) bloco(van, 0.025, 0.17, 0.025, escuro, 1.565, 0.83, z);
  bloco(van, 0.18, 0.12, 1.53, escuro, 1.58, 0.51, 0);
  bloco(van, 0.11, 0.09, 1.44, claro, -1.7, 0.51, 0);
  const giro = new THREE.Group(); giro.position.set(-0.51, 2.34, 0); van.add(giro);
  bloco(giro, 0.2, 0.05, 0.2, claro, 0, 0, 0);
  const luz = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8), material(0xf4b52c));
  luz.position.y = 0.13; giro.add(luz); van.userData.giro = giro;

  const rodas = [];
  for (const x of [-1.18, 1.02]) for (const lado of [-1, 1]) {
    const roda = new THREE.Group(); roda.position.set(x, 0.36, lado * 0.66); van.add(roda); rodas.push(roda);
    const borracha = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 10), material(pneu));
    borracha.rotation.x = Math.PI / 2; roda.add(borracha);
    const calota = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 8), material(claro));
    calota.rotation.x = Math.PI / 2; calota.position.z = lado * 0.1; roda.add(calota);
  }
  van.userData.rodas = rodas;
  return van;
}
export function criarAgente(pele, assaltante = false) {
  const roupa = assaltante ? 0x141517 : 0x233b50;
  const rosto = assaltante ? 0x18191c : pele;
  const grupo = new THREE.Group();
  const corpo = new THREE.Group(); grupo.add(corpo);
  bloco(corpo, 0.46, 0.5, 0.28, roupa, 0, 0.8, 0);
  bloco(corpo, 0.38, 0.33, 0.035, assaltante ? 0x202126 : 0x597084, 0, 0.81, 0.16);
  if (!assaltante) bloco(corpo, 0.07, 0.09, 0.025, 0xe9c76c, -0.1, 0.91, 0.19);
  const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 6), material(rosto));
  cabeca.position.y = 1.21; corpo.add(cabeca);
  bloco(corpo, 0.39, 0.09, 0.34, roupa, 0, 1.4, 0);
  if (assaltante) bloco(corpo, 0.37, 0.15, 0.09, 0x111214, 0, 1.12, 0.17);
  bloco(corpo, 0.3, 0.03, 0.19, assaltante ? 0x111214 : 0x172b3c, 0, 1.35, 0.2);
  for (const x of [-0.08, 0.08]) bloco(corpo, 0.055, 0.04, 0.02, assaltante ? 0xe3ded0 : 0x20282f, x, 1.23, 0.195);
  const pernas = [], bracos = [];
  for (const lado of [-1, 1]) {
    const perna = new THREE.Group(); perna.position.set(lado * 0.13, 0.56, 0); corpo.add(perna);
    bloco(perna, 0.18, 0.45, 0.19, assaltante ? 0x191a1d : 0x243444, 0, -0.23, 0);
    bloco(perna, 0.21, 0.12, 0.32, assaltante ? 0x0d0e10 : 0x172129, 0, -0.49, 0.055); pernas.push(perna);
    const braco = new THREE.Group(); braco.position.set(lado * 0.28, 0.98, 0); corpo.add(braco);
    bloco(braco, 0.15, 0.36, 0.16, roupa, 0, -0.17, 0);
    bloco(braco, 0.13, 0.13, 0.14, rosto, 0, -0.4, 0); bracos.push(braco);
  }
  const maleta = new THREE.Group(); bracos[1].add(maleta); maleta.position.set(0.05, -0.63, 0);
  bloco(maleta, 0.17, 0.3, 0.44, assaltante ? 0x111315 : 0x354e49, 0, 0, 0);
  bloco(maleta, 0.19, 0.035, 0.45, assaltante ? 0x323539 : 0x9aa99d, 0, 0.02, 0);
  bloco(maleta, 0.045, 0.07, 0.14, assaltante ? 0x090a0b : 0x293831, 0, 0.19, 0);
  grupo.userData = { corpo, pernas, bracos, maleta };
  return grupo;
}

export function pontoRota(rota, progresso) {
  const comprimentos = rota.slice(1).map((p, i) => Math.hypot(p.x - rota[i].x, p.z - rota[i].z));
  let restante = Math.max(0, Math.min(1, progresso)) * comprimentos.reduce((a, b) => a + b, 0);
  for (let i = 0; i < comprimentos.length; i++) {
    const a = rota[i], b = rota[i + 1];
    if (restante <= comprimentos[i] || i === comprimentos.length - 1) {
      const t = Math.min(1, restante / comprimentos[i]);
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, angulo: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    restante -= comprimentos[i];
  }
}

export class ColetaBancoVisual {
  constructor(cena) { this.cena = cena; this.grupo = null; }

  criar() {
    this.grupo = new THREE.Group(); this.grupo.name = 'coleta-bancaria'; this.cena.add(this.grupo);
    this.van = criarCarroForte();
    this.van.rotation.y = Math.PI; this.grupo.add(this.van);
    const caixa = new THREE.Box3().setFromObject(this.van);
    this.inicio = RUA.maxX - caixa.max.x - 0.08;
    this.fim = RUA.minX - caixa.min.x + 0.08;
    this.van.position.set(this.inicio, 0.04, RUA.faixas[0].z);
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#25855d'; ctx.font = 'bold 112px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 64, 66);
    this.textura = new THREE.CanvasTexture(canvas); this.textura.colorSpace = THREE.SRGBColorSpace;
    this.placaMaterial = new THREE.MeshBasicMaterial({ map: this.textura, transparent: true, side: THREE.DoubleSide });
    for (const lado of [-1, 1]) {
      const placa = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), this.placaMaterial);
      placa.position.set(lado > 0 ? -0.18 : -0.86, 1.64, lado * 0.691);
      if (lado > 0) placa.scale.setScalar(0.69);
      placa.rotation.y = lado < 0 ? Math.PI : 0; this.van.add(placa);
    }
    this.portaLateral = new THREE.Group();
    this.portaLateral.name = 'porta-passageiro';
    this.portaLateral.position.set(-0.75, 1.49, 0.7); this.van.add(this.portaLateral);
    bloco(this.portaLateral, 0.8, 1.34, 0.055, 0xe9efed, -0.4, 0, 0);
    bloco(this.portaLateral, 0.68, 0.08, 0.015, 0x25855d, -0.4, -0.62, 0.036);
    bloco(this.portaLateral, 0.08, 0.13, 0.025, 0x536b70, -0.69, -0.12, 0.043);
    this.agentes = [criarAgente(0xdba67d), criarAgente(0x986b4d)];
    this.agentes.forEach(a => this.grupo.add(a));
  }

  atualizar(coleta) {
    if (!coleta || coleta.tempo < 0) { if (this.grupo) this.liberar(); return; }
    if (!this.grupo) this.criar();
    const t = coleta.tempo, estacionamento = -1.3;
    const x = t < BANCO.chegada ? this.inicio + (estacionamento - this.inicio) * suave(t / BANCO.chegada)
      : t < BANCO.partida ? estacionamento : estacionamento + (this.fim - estacionamento) * suave((t - BANCO.partida) / (BANCO.fim - BANCO.partida));
    this.van.position.x = x;
    this.van.userData.rodas.forEach(roda => { roda.rotation.z = (x - this.inicio) / 0.34; });
    this.van.userData.giro.scale.y = 1 + 0.06 * Math.sin(t * 9);
    const abertura = suave(t - BANCO.chegada) * (1 - suave(t - BANCO.embarque));
    this.portaLateral.rotation.y = abertura * Math.PI * 0.46;
    this.agentes.forEach((agente, i) => {
      const guarda = i === 1;
      agente.visible = t >= BANCO.desembarque + (guarda ? 1 : 0) && t < BANCO.embarque - (guarda ? 1 : 0);
      const rota = guarda
        ? [{ x: -0.15, z: 9.58 }, { x: -0.15, z: 8.55 }]
        : [{ x: -0.15, z: 9.58 }, { x: -0.15, z: 9.15 }, { x: -1.3, z: 8.4 },
          { x: -1.3, z: 6.2 }, { x: CONFIG.acessoCaixa.x, z: 6.2 }, CONFIG.acessoCaixa];
      const voltando = guarda ? t >= BANCO.embarque - 3 : t >= BANCO.retirada;
      const progresso = guarda
        ? voltando ? (t - (BANCO.embarque - 3)) / 2 : (t - BANCO.desembarque - 1) / 2
        : voltando ? (t - BANCO.retirada) / (BANCO.embarque - BANCO.retirada)
          : (t - BANCO.desembarque) / (BANCO.coleta - BANCO.desembarque);
      const ponto = pontoRota(voltando ? [...rota].reverse() : rota, progresso);
      agente.position.set(ponto.x, ponto.z > 9.25 ? 0.04 : ponto.z > 6.7 ? 0.13 : 0.23, ponto.z);
      agente.rotation.y = ponto.angulo;
      const andando = progresso > 0 && progresso < 1;
      const passo = andando ? Math.sin(t * 11 + i) : 0;
      const d = agente.userData;
      d.corpo.position.y = Math.abs(passo) * 0.04;
      d.pernas.forEach((perna, j) => { perna.rotation.x = (j ? 1 : -1) * passo * 0.55; });
      const recolhendo = !guarda && t >= BANCO.coleta && !voltando;
      d.bracos.forEach((braco, j) => { braco.rotation.x = recolhendo ? -Math.sin((t - BANCO.coleta) / 3 * Math.PI) * 1.1 : (j ? -1 : 1) * passo * (voltando ? 0.15 : 0.4); });
      d.maleta.visible = !guarda && coleta.retirado;
    });
  }

  liberar() {
    this.cena.remove(this.grupo);
    this.grupo.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    this.textura?.dispose(); this.placaMaterial?.dispose();
    this.grupo = null;
  }
}
