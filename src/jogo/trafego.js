import * as THREE from 'three';
import { RUA } from './bairro.js';

// Vinte modelos com silhuetas, dimensões, cores e acabamentos próprios.
export const MODELOS_CARROS = Object.freeze([
  { nome: 'Sedã vermelho', tipo: 'seda', cor: 0xd8443e, escala: 1, detalhe: 'cromado' },
  { nome: 'Sedã azul', tipo: 'seda', cor: 0x336caa, escala: 1.06, detalhe: 'escuro' },
  { nome: 'Sedã prata', tipo: 'seda', cor: 0xbac4c8, escala: 0.96, detalhe: 'cromado' },
  { nome: 'Sedã preto', tipo: 'seda', cor: 0x242a33, escala: 1.12, detalhe: 'escuro' },
  { nome: 'Hatch amarelo', tipo: 'hatch', cor: 0xf4bc37, escala: 0.94, detalhe: 'escuro' },
  { nome: 'Hatch verde', tipo: 'hatch', cor: 0x4d9a63, escala: 1, detalhe: 'branco' },
  { nome: 'Hatch branco', tipo: 'hatch', cor: 0xf0e9d9, escala: 1.05, detalhe: 'escuro' },
  { nome: 'Hatch laranja', tipo: 'hatch', cor: 0xe47d42, escala: 0.98, detalhe: 'cromado' },
  { nome: 'SUV azul escuro', tipo: 'suv', cor: 0x315476, escala: 1, detalhe: 'rack' },
  { nome: 'SUV bege', tipo: 'suv', cor: 0xc9a878, escala: 1.08, detalhe: 'cromado' },
  { nome: 'SUV vinho', tipo: 'suv', cor: 0x853d52, escala: 0.96, detalhe: 'rack' },
  { nome: 'SUV verde oliva', tipo: 'suv', cor: 0x647b54, escala: 1.04, detalhe: 'escuro' },
  { nome: 'Picape vermelha', tipo: 'picape', cor: 0xb9453b, escala: 1, detalhe: 'cacamba' },
  { nome: 'Picape azul', tipo: 'picape', cor: 0x4485aa, escala: 1.1, detalhe: 'rack' },
  { nome: 'Picape cinza', tipo: 'picape', cor: 0x919b9c, escala: 0.95, detalhe: 'cacamba' },
  { nome: 'Minivan roxa', tipo: 'minivan', cor: 0x79649d, escala: 1, detalhe: 'cromado' },
  { nome: 'Minivan turquesa', tipo: 'minivan', cor: 0x4eaaa6, escala: 1.06, detalhe: 'rack' },
  { nome: 'Minivan branca', tipo: 'minivan', cor: 0xe9e5dc, escala: 0.96, detalhe: 'escuro' },
  { nome: 'Van de entregas', tipo: 'van', cor: 0xe1d5b4, escala: 1, detalhe: 'faixa' },
  { nome: 'Van azul', tipo: 'van', cor: 0x6385b5, escala: 1.05, detalhe: 'branco' }
]);

const FORMATOS = {
  seda: { comprimento: 2.48, largura: 1.08, corpo: 0.43, teto: 1.51, baseTras: -0.83, topoTras: -0.48, topoFrente: 0.47, baseFrente: 0.86 },
  hatch: { comprimento: 2.16, largura: 1.04, corpo: 0.43, teto: 1.48, baseTras: -0.91, topoTras: -0.72, topoFrente: 0.33, baseFrente: 0.7 },
  suv: { comprimento: 2.62, largura: 1.18, corpo: 0.53, teto: 1.76, baseTras: -1.08, topoTras: -0.89, topoFrente: 0.62, baseFrente: 0.94 },
  picape: { comprimento: 2.78, largura: 1.16, corpo: 0.52, teto: 1.68, baseTras: -0.12, topoTras: 0.06, topoFrente: 0.73, baseFrente: 1.05 },
  minivan: { comprimento: 2.73, largura: 1.18, corpo: 0.52, teto: 1.72, baseTras: -1.17, topoTras: -0.98, topoFrente: 0.76, baseFrente: 1.05 },
  van: { comprimento: 2.91, largura: 1.2, corpo: 0.62, teto: 1.9, baseTras: -1.31, topoTras: -1.2, topoFrente: 1.03, baseFrente: 1.24 }
};

const materiais = new Map();
function material(cor, duplo = false) {
  const chave = `${cor}:${duplo}`;
  if (!materiais.has(chave)) materiais.set(chave, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.67, metalness: 0.08, side: duplo ? THREE.DoubleSide : THREE.FrontSide }));
  return materiais.get(chave);
}
function malha(grupo, geometria, cor, x = 0, y = 0, z = 0, duplo = false) {
  const m = new THREE.Mesh(geometria, material(cor, duplo));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  grupo.add(m); return m;
}
function caixa(grupo, w, h, d, cor, x, y, z) {
  return malha(grupo, new THREE.BoxGeometry(w, h, d), cor, x, y, z);
}
function painel(grupo, pontos, cor) {
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(pontos.flat(), 3));
  geometria.setIndex([0, 1, 2, 0, 2, 3]);
  geometria.computeVertexNormals();
  return malha(grupo, geometria, cor, 0, 0, 0, true);
}

// Recorta o vidro na própria face inclinada, sem enterrá-lo na carroceria.
function vidroNaFace(grupo, face, u0, u1, v0, v1, deslocamento) {
  const ponto = (u, v) => new THREE.Vector3(...face[0]).lerp(new THREE.Vector3(...face[1]), u)
    .lerp(new THREE.Vector3(...face[3]).lerp(new THREE.Vector3(...face[2]), u), v)
    .add(new THREE.Vector3(...deslocamento)).toArray();
  painel(grupo, [ponto(u0, v0), ponto(u1, v0), ponto(u1, v1), ponto(u0, v1)], 0x365464);
}

export function criarCarro(modelo) {
  const formato = FORMATOS[modelo.tipo];
  const carro = new THREE.Group();
  carro.name = `carro-${modelo.tipo}`;
  const { comprimento: c, largura: l, corpo: h, teto, baseTras, topoTras, topoFrente, baseFrente } = formato;
  const topoCorpo = 0.5 + h;
  const borracha = 0x252b30;
  const acabamento = modelo.detalhe === 'cromado' ? 0xd7dce0 : borracha;
  const eixo = c / 2 - (modelo.tipo === 'van' ? 0.48 : 0.42);
  // Contorno facetado com quatro arcos de roda reais e capô rebaixado.
  const perfil = new THREE.Shape();
  perfil.moveTo(-c / 2, 0.43);
  for (const x of [-eixo, eixo]) {
    for (let i = 0; i <= 6; i++) {
      const angulo = Math.PI - 0.38 - i * (Math.PI - 0.76) / 6;
      perfil.lineTo(x + Math.cos(angulo) * 0.35, 0.3 + Math.sin(angulo) * 0.35);
    }
  }
  perfil.lineTo(c / 2 - 0.06, 0.43);
  perfil.lineTo(c / 2, 0.55);
  perfil.lineTo(c / 2, topoCorpo - 0.12);
  perfil.lineTo(c / 2 - 0.14, topoCorpo - 0.04);
  perfil.lineTo(baseFrente, topoCorpo);
  perfil.lineTo(baseTras, topoCorpo);
  perfil.lineTo(-c / 2 + 0.12, topoCorpo - 0.04);
  perfil.lineTo(-c / 2, topoCorpo - 0.12);
  perfil.closePath();
  malha(carro, new THREE.ExtrudeGeometry(perfil, { depth: l - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 1, steps: 1, curveSegments: 1 }), modelo.cor, 0, 0, -l / 2 + 0.03);
  caixa(carro, c * 0.73, 0.1, l * 0.63, borracha, 0, 0.43, 0);
  const meiaCabine = l * 0.44, meioTeto = l * 0.35;
  const alturaTeto = teto - (modelo.tipo === 'seda' ? 0.13 : 0.06);
  const frente = [[baseFrente, topoCorpo, -meiaCabine], [baseFrente, topoCorpo, meiaCabine], [topoFrente, alturaTeto, meioTeto], [topoFrente, alturaTeto, -meioTeto]];
  const traseira = [[baseTras, topoCorpo, meiaCabine], [baseTras, topoCorpo, -meiaCabine], [topoTras, alturaTeto, -meioTeto], [topoTras, alturaTeto, meioTeto]];
  painel(carro, frente, modelo.cor);
  painel(carro, traseira, modelo.cor);
  painel(carro, [[topoTras, alturaTeto, -meioTeto], [topoFrente, alturaTeto, -meioTeto], [topoFrente, alturaTeto, meioTeto], [topoTras, alturaTeto, meioTeto]], modelo.cor);
  vidroNaFace(carro, frente, 0.08, 0.92, 0.12, 0.87, [0.012, 0, 0]);
  if (modelo.tipo !== 'van') vidroNaFace(carro, traseira, 0.09, 0.91, 0.14, 0.84, [-0.012, 0, 0]);
  const divisao = (topoTras + topoFrente) / 2;
  for (const lado of [-1, 1]) {
    const face = [[baseTras, topoCorpo, lado * meiaCabine], [baseFrente, topoCorpo, lado * meiaCabine], [topoFrente, alturaTeto, lado * meioTeto], [topoTras, alturaTeto, lado * meioTeto]];
    painel(carro, face, modelo.cor);
    const janelas = modelo.tipo === 'van' ? [[0.66, 0.94]]
      : modelo.tipo === 'picape' ? [[0.08, 0.92]]
        : ['suv', 'minivan'].includes(modelo.tipo) ? [[0.07, 0.3], [0.34, 0.61], [0.65, 0.94]]
          : [[0.08, 0.46], [0.52, 0.93]];
    for (const [u0, u1] of janelas) vidroNaFace(carro, face, u0, u1, 0.13, 0.86, [0, 0, lado * 0.012]);
    caixa(carro, 0.15, 0.035, 0.025, acabamento, divisao + 0.12, topoCorpo - 0.12, lado * (l / 2 + 0.014));
    caixa(carro, 0.015, h * 0.6, 0.014, acabamento, divisao, topoCorpo - h * 0.36, lado * (l / 2 + 0.012));
    caixa(carro, 0.16, 0.1, 0.12, modelo.cor, baseFrente - 0.1, topoCorpo + 0.035, lado * (l / 2 + 0.055));
    caixa(carro, 0.07, 0.065, 0.08, 0xa5c0c9, baseFrente - 0.184, topoCorpo + 0.035, lado * (l / 2 + 0.055));
  }
  const rodas = [];
  for (const x of [-eixo, eixo]) for (const lado of [-1, 1]) {
    const roda = new THREE.Group();
    roda.position.set(x, 0.3, lado * (l / 2 - 0.035)); carro.add(roda); rodas.push(roda);
    const pneu = malha(roda, new THREE.CylinderGeometry(0.28, 0.28, 0.15, 10), borracha);
    pneu.rotation.x = Math.PI / 2;
    const calota = malha(roda, new THREE.CylinderGeometry(0.17, 0.17, 0.012, 8), 0xb8c3c7, 0, 0, lado * 0.083);
    calota.rotation.x = Math.PI / 2;
    caixa(roda, 0.21, 0.045, 0.015, 0x53616a, 0, 0, lado * 0.092);
    caixa(roda, 0.045, 0.21, 0.015, 0x53616a, 0, 0, lado * 0.092);
  }
  for (const lado of [-1, 1]) {
    caixa(carro, 0.055, 0.15, 0.22, 0xffefd2, c / 2 + 0.031, 0.77, lado * l * 0.33);
    caixa(carro, 0.055, 0.17, 0.23, 0xd94438, -c / 2 - 0.031, 0.78, lado * l * 0.33);
  }
  caixa(carro, 0.08, 0.12, l * 0.37, borracha, c / 2 + 0.04, 0.72, 0);
  caixa(carro, 0.095, 0.024, l * 0.31, acabamento, c / 2 + 0.04, 0.73, 0);
  caixa(carro, 0.09, 0.15, l * 0.86, acabamento, c / 2 + 0.04, 0.53, 0);
  caixa(carro, 0.09, 0.15, l * 0.86, acabamento, -c / 2 - 0.04, 0.53, 0);
  for (const lado of [-1, 1]) caixa(carro, 0.016, 0.09, 0.22, 0xefeee4, lado * (c / 2 + 0.094), 0.55, 0);

  if (modelo.tipo === 'picape') {
    caixa(carro, 1.12, 0.045, l * 0.8, 0x393b37, -0.76, topoCorpo + 0.01, 0);
    for (const lado of [-1, 1]) caixa(carro, 1.15, 0.19, 0.075, modelo.cor, -0.77, topoCorpo + 0.13, lado * (l / 2 - 0.06));
    caixa(carro, 0.075, 0.2, l, modelo.cor, -c / 2 + 0.05, topoCorpo + 0.13, 0);
  }
  if (modelo.detalhe === 'rack') {
    for (const lado of [-1, 1]) caixa(carro, topoFrente - topoTras - 0.14, 0.065, 0.055, borracha, divisao, alturaTeto + 0.06, lado * l * 0.27);
    for (const x of [topoTras + 0.16, topoFrente - 0.16]) caixa(carro, 0.055, 0.035, l * 0.6, acabamento, x, alturaTeto + 0.085, 0);
  }
  if (modelo.detalhe === 'faixa' || modelo.detalhe === 'branco') for (const lado of [-1, 1]) caixa(carro, c * 0.55, 0.12, 0.015, modelo.detalhe === 'faixa' ? 0xe59e43 : 0xf4f1e6, -0.1, 0.78, lado * (l / 2 + 0.013));

  carro.scale.setScalar(modelo.escala);
  carro.userData.rodas = rodas;
  return carro;
}

export class Trafego {
  constructor(cena, aleatorio = Math.random) {
    this.cena = cena;
    this.aleatorio = aleatorio;
    this.carros = [];
    this.sacola = [];
    this.proximos = RUA.faixas.map((_, indice) => 2 + indice * 4 + aleatorio() * 4);
  }

  proximoModelo() {
    if (this.sacola.length === 0) {
      this.sacola = MODELOS_CARROS.map((_, indice) => indice);
      for (let i = this.sacola.length - 1; i > 0; i--) {
        const j = Math.floor(this.aleatorio() * (i + 1));
        [this.sacola[i], this.sacola[j]] = [this.sacola[j], this.sacola[i]];
      }
    }
    return MODELOS_CARROS[this.sacola.pop()];
  }

  criarNaFaixa(indice) {
    if (this.carros.length >= 3) return false;
    const faixa = RUA.faixas[indice];
    const borda = faixa.direcao > 0 ? RUA.minX : RUA.maxX;
    if (this.carros.some(c => c.faixa === indice && Math.abs(c.grupo.position.x - borda) < 6)) return false;
    const modelo = this.proximoModelo();
    const grupo = criarCarro(modelo);
    grupo.rotation.y = faixa.direcao > 0 ? 0 : Math.PI;
    // Inclui para-choques, escala e orientação: nenhuma parte sai do asfalto.
    const tamanho = new THREE.Box3().setFromObject(grupo);
    const minX = RUA.minX - tamanho.min.x + 0.06;
    const maxX = RUA.maxX - tamanho.max.x - 0.06;
    grupo.position.set(faixa.direcao > 0 ? minX : maxX, 0.04, faixa.z);
    this.cena.add(grupo);
    this.carros.push({ grupo, faixa: indice, direcao: faixa.direcao, velocidade: indice === 0 ? 3.5 : 3.8, modelo, minX, maxX });
    return true;
  }

  atualizar(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.carros.length - 1; i >= 0; i--) {
      const carro = this.carros[i];
      const proximoX = carro.grupo.position.x + carro.direcao * carro.velocidade * dt;
      if (proximoX > carro.maxX || proximoX < carro.minX) {
        this.cena.remove(carro.grupo);
        carro.grupo.traverse(objeto => { if (objeto.isMesh) objeto.geometry.dispose(); });
        this.carros.splice(i, 1);
        continue;
      }
      carro.grupo.position.x = proximoX;
      for (const roda of carro.grupo.userData.rodas) roda.rotation.z -= carro.velocidade * dt / (0.28 * carro.modelo.escala);
    }
    for (let faixa = 0; faixa < RUA.faixas.length; faixa++) {
      this.proximos[faixa] -= dt;
      if (this.proximos[faixa] > 0) continue;
      this.proximos[faixa] = this.criarNaFaixa(faixa) ? 9 + this.aleatorio() * 8 : 1;
    }
  }
}
