import * as THREE from 'three';
import { CONFIG } from './configuracao.js';
import { criarCarro } from './trafego.js';
import { pontoRota } from './coleta-banco.js';
import { RUA } from './bairro.js';
import { ASSALTO as A } from './assalto.js';

const suave = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const materiais = new Map();
function material(cor) {
  if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.9, flatShading: true }));
  return materiais.get(cor);
}
function malha(pai, geometria, cor, x, y, z) {
  const objeto = new THREE.Mesh(geometria, material(cor));
  objeto.position.set(x, y, z); objeto.castShadow = true; pai.add(objeto);
  return objeto;
}
function bloco(pai, w, h, d, cor, x, y, z) {
  return malha(pai, new THREE.BoxGeometry(w, h, d), cor, x, y, z);
}

// Silhueta pequena e angular: capuz grande, rosto coberto, jaqueta e pernas articuladas.
function criarAssaltante(pele) {
  const grupo = new THREE.Group(); grupo.name = 'assaltante-encapuzado';
  grupo.scale.setScalar(0.8);
  const corpo = new THREE.Group(); grupo.add(corpo);
  const jaqueta = malha(corpo, new THREE.DodecahedronGeometry(0.5, 0), 0x1e1e23, 0, 1.04, 0);
  jaqueta.scale.set(0.88, 0.88, 0.62);
  bloco(corpo, 0.39, 0.26, 0.08, 0x29292f, 0, 0.86, 0.23); // bolso frontal
  bloco(corpo, 0.025, 0.4, 0.025, 0x111115, 0, 1.02, 0.28); // zíper
  const capuz = malha(corpo, new THREE.DodecahedronGeometry(0.37, 0), 0x222228, 0, 1.54, -0.03);
  capuz.scale.set(0.93, 1.06, 0.85);
  const abertura = malha(corpo, new THREE.CircleGeometry(0.255, 8), 0x0c0c0f, 0, 1.51, 0.3);
  abertura.scale.y = 0.83;
  const borda = malha(corpo, new THREE.TorusGeometry(0.25, 0.045, 4, 8), 0x303036, 0, 1.51, 0.315);
  borda.scale.y = 0.87;
  bloco(corpo, 0.34, 0.13, 0.024, pele, 0, 1.56, 0.327); // somente os olhos ficam à mostra
  bloco(corpo, 0.36, 0.15, 0.04, 0x111115, 0, 1.39, 0.338); // máscara de tecido
  bloco(corpo, 0.4, 0.075, 0.07, 0x19191e, 0, 1.65, 0.33); // sombra do capuz
  for (const lado of [-1, 1]) {
    const olho = malha(corpo, new THREE.DodecahedronGeometry(0.05, 0), 0x241912, lado * 0.105, 1.555, 0.352);
    olho.scale.set(0.65, 1.5, 0.48);
  }
  const pernas = [], canelas = [], pes = [], bracos = [];
  for (const lado of [-1, 1]) {
    const braco = new THREE.Group(); braco.position.set(lado * 0.37, 1.22, 0); corpo.add(braco);
    bloco(braco, 0.2, 0.34, 0.23, 0x242429, 0, -0.18, 0.04);
    bloco(braco, 0.21, 0.17, 0.22, 0x151519, 0, -0.38, 0.16);
    bloco(braco, 0.16, 0.12, 0.17, 0x111114, 0, -0.47, 0.28); bracos.push(braco);
    const perna = new THREE.Group(); perna.position.set(lado * 0.18, 0.76, 0); grupo.add(perna);
    bloco(perna, 0.23, 0.37, 0.26, 0x1a1a1f, 0, -0.19, 0);
    const canela = new THREE.Group(); canela.position.y = -0.37; perna.add(canela);
    bloco(canela, 0.21, 0.33, 0.22, 0x202026, 0, -0.16, 0);
    const pe = bloco(canela, 0.25, 0.14, 0.38, 0x101013, 0, -0.37, 0.09);
    pernas.push(perna); canelas.push(canela); pes.push(pe);
  }
  // Acessório estilizado com silhueta simples, preso ao tronco para acompanhar a corrida.
  const acessorio = new THREE.Group(); corpo.add(acessorio);
  bloco(acessorio, 0.36, 0.13, 0.17, 0x6b4433, -0.41, 0.91, 0.39);
  bloco(acessorio, 0.55, 0.17, 0.18, 0x353338, 0.03, 0.94, 0.4);
  bloco(acessorio, 0.66, 0.12, 0.12, 0x514e4f, 0.62, 0.96, 0.4);
  const bocal = malha(acessorio, new THREE.CylinderGeometry(0.075, 0.075, 0.11, 8), 0x2c2b30, 0.99, 0.96, 0.4);
  bocal.rotation.z = Math.PI / 2;
  const maleta = new THREE.Group(); corpo.add(maleta);
  bloco(maleta, 0.37, 0.33, 0.22, 0x171719, -0.38, 0.68, 0.05);
  bloco(maleta, 0.4, 0.045, 0.24, 0x333339, -0.38, 0.87, 0.05);
  maleta.visible = false;
  grupo.userData = { corpo, pernas, canelas, pes, bracos, maleta, ultimaPosicao: null, distanciaPassos: 0 };
  return grupo;
}

export class AssaltoVisual {
  constructor(cena) { this.cena = cena; this.grupo = null; }
  criar() {
    this.grupo = new THREE.Group(); this.grupo.name = 'assalto'; this.cena.add(this.grupo);
    this.carro = criarCarro({ tipo: 'seda', cor: 0x16191d, escala: 1.12, detalhe: 'escuro' });
    this.carro.rotation.y = Math.PI; this.grupo.add(this.carro);
    const limites = new THREE.Box3().setFromObject(this.carro);
    this.inicio = RUA.maxX - limites.max.x - 0.08;
    this.fim = RUA.minX - limites.min.x + 0.08;
    this.carro.position.set(this.inicio, 0.04, RUA.faixas[0].z);
    this.porta = new THREE.Group(); this.porta.position.set(0.62, 0.77, 0.55); this.carro.add(this.porta);
    this.materialPorta = new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: 0.7 });
    const folha = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.47, 0.04), this.materialPorta);
    folha.position.x = -0.36; this.porta.add(folha);
    this.assaltante = criarAssaltante(0xd59d78); this.grupo.add(this.assaltante);
  }
  atualizar(assalto) {
    if (!assalto || assalto.tempo < 0) { if (this.grupo) this.liberar(); return; }
    if (!this.grupo) this.criar();
    const t = assalto.tempo, parada = -1.3;
    const x = t < A.chegada ? this.inicio + (parada - this.inicio) * suave(t / A.chegada)
      : t < A.partida ? parada : parada + (this.fim - parada) * suave((t - A.partida) / (A.fim - A.partida));
    this.carro.position.x = x;
    const emMovimento = t < A.chegada || t >= A.partida;
    this.carro.position.z = RUA.faixas[0].z + (emMovimento ? Math.sin(t * 9) * 0.18 : 0);
    this.carro.rotation.y = Math.PI + (emMovimento ? Math.sin(t * 9) * 0.045 : 0);
    this.carro.rotation.z = emMovimento ? Math.sin(t * 16) * 0.025 : 0;
    this.carro.userData.rodas.forEach(r => { r.rotation.z = (x - this.inicio) / (0.28 * 1.12); });
    const abertura = suave(t - A.chegada) * (1 - suave(t - A.embarque));
    this.porta.rotation.y = abertura * Math.PI * 0.43;
    const ator = this.assaltante;
    ator.visible = t >= A.desembarque && t < A.embarque;
    const porta = { x: -1.3, z: 6.7 };
    const fora = [{ x: -1.8, z: 9.65 }, { x: -1.8, z: 8.4 }, porta];
    const dentro = [porta, { x: porta.x, z: 6.2 }, { x: CONFIG.acessoCaixa.x, z: 6.2 }, CONFIG.acessoCaixa];
    let rota, progresso;
    if (t < A.entrada) { rota = fora; progresso = (t - A.desembarque) / (A.entrada - A.desembarque); }
    else if (t < A.retirada) { rota = dentro; progresso = (t - A.entrada) / (A.coleta - A.entrada); }
    else if (t < A.saida) { rota = [...dentro].reverse(); progresso = (t - A.retirada) / (A.saida - A.retirada); }
    else { rota = [...fora].reverse(); progresso = (t - A.saida) / (A.embarque - A.saida); }
    const ponto = pontoRota(rota, progresso);
    ator.position.set(ponto.x, ponto.z > 9.25 ? 0.04 : ponto.z > 6.7 ? 0.13 : 0.23, ponto.z);
    ator.rotation.y = ponto.angulo;
    const d = ator.userData;
    if (ator.visible && d.ultimaPosicao) d.distanciaPassos += Math.hypot(ponto.x - d.ultimaPosicao.x, ponto.z - d.ultimaPosicao.z);
    d.ultimaPosicao = ator.visible ? ponto : null;
    const correndo = ator.visible && progresso > 0 && progresso < 1;
    const passo = correndo ? Math.sin(d.distanciaPassos * 3.4) : 0;
    d.corpo.position.y = correndo ? 0.045 + Math.abs(passo) * 0.045 : 0;
    d.corpo.rotation.x = correndo ? -0.22 : 0;
    d.pernas.forEach((p, j) => {
      const fase = (j ? 1 : -1) * passo;
      p.rotation.x = fase * 0.82;
      d.canelas[j].rotation.x = Math.max(0, fase) * 1.15;
      d.pes[j].rotation.x = -d.canelas[j].rotation.x * 0.22;
    });
    d.bracos.forEach((b, j) => { b.rotation.x = correndo ? -0.38 + (j ? -1 : 1) * passo * 0.26 : -0.3; });
    d.maleta.visible = assalto.roubado;
  }
  liberar() {
    this.cena.remove(this.grupo);
    this.grupo.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    this.materialPorta.dispose(); this.grupo = null;
  }
}
