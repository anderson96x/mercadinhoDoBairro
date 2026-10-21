import * as THREE from 'three';
import { criarAgente } from './coleta-banco.js';
import { posicaoPacote } from './entregas.js';

const materiais = new Map();
function bloco(pai, w, h, d, cor, x, y, z) {
  if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8 }));
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materiais.get(cor));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; pai.add(mesh); return mesh;
}
export function criarCaminhaoEntrega() {
  const grupo = new THREE.Group(); grupo.name = 'caminhao-entrega';
  const branco = 0xf4f4ef, cinza = 0xc7cccb, escuro = 0x303638, vidro = 0x17292f;
  bloco(grupo, 4.9, 0.22, 1.5, escuro, 0, 0.59, 0);
  bloco(grupo, 3.5, 2.08, 1.65, branco, -0.65, 1.85, 0);
  bloco(grupo, 3.5, 0.08, 1.69, cinza, -0.65, 0.82, 0);
  bloco(grupo, 1.3, 1.8, 1.6, branco, 1.75, 1.6, 0);
  bloco(grupo, 1.12, 0.08, 1.66, cinza, 1.7, 2.54, 0);
  bloco(grupo, 0.025, 0.61, 1.43, vidro, 2.411, 2.05, 0);
  bloco(grupo, 0.14, 0.22, 1.73, cinza, 2.48, 0.7, 0);
  bloco(grupo, 0.03, 0.29, 0.85, escuro, 2.56, 1.03, 0);
  for (const z of [-0.6, 0.6]) bloco(grupo, 0.035, 0.18, 0.28, 0xffefbc, 2.56, 1.05, z);
  const portas = [];
  for (const lado of [-1, 1]) {
    bloco(grupo, 0.88, 0.58, 0.025, vidro, 1.84, 2.04, lado * 0.813);
    bloco(grupo, 0.24, 0.045, 0.04, escuro, 1.54, 1.56, lado * 0.835);
    bloco(grupo, 0.12, 0.25, 0.13, cinza, 2.13, 1.97, lado * 0.99);
    bloco(grupo, 0.55, 0.12, 0.16, cinza, 1.54, 0.7, lado * 0.84);
    bloco(grupo, 1.85, 0.085, 0.02, 0x348461, -0.45, 1.12, lado * 0.837);
    bloco(grupo, 0.035, 0.13, 0.15, 0xd44d3d, -2.42, 0.87, lado * 0.68);
    const porta = new THREE.Group(); porta.position.set(-2.41, 0.91, lado * 0.8); grupo.add(porta); portas.push(porta);
    bloco(porta, 0.06, 1.93, 0.79, 0xe2e5e1, 0, 0.965, -lado * 0.395);
    bloco(porta, 0.08, 1.5, 0.025, cinza, -0.04, 0.98, -lado * 0.48);
    bloco(porta, 0.09, 0.22, 0.06, escuro, -0.045, 0.98, -lado * 0.43);
  }
  const rodas = [];
  for (const x of [-1.82, -0.85, 1.78]) for (const lado of [-1, 1]) {
    const roda = new THREE.Group(); roda.position.set(x, 0.41, lado * 0.78); grupo.add(roda); rodas.push(roda);
    const pneu = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12), materiais.get(escuro));
    pneu.rotation.x = Math.PI / 2; roda.add(pneu);
    const calota = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.025, 10), materiais.get(cinza));
    calota.rotation.x = Math.PI / 2; calota.position.z = lado * 0.115; roda.add(calota);
  }
  grupo.userData = { rodas, portas };
  return grupo;
}
export class EntregasVisual {
  constructor(cena) {
    this.grupo = new THREE.Group(); this.grupo.name = 'entrega-importacoes'; cena.add(this.grupo);
    this.caminhao = criarCaminhaoEntrega(); this.grupo.add(this.caminhao);
    this.entregador = criarAgente(0xd6a174); this.entregador.name = 'entregador-importacoes';
    this.entregador.userData.maleta.visible = false; this.grupo.add(this.entregador);
    this.caixa = new THREE.Group(); this.caixa.name = 'pacote-em-entrega'; this.entregador.userData.corpo.add(this.caixa);
    bloco(this.caixa, 0.65, 0.48, 0.56, 0xd5a567, 0, 0.77, 0.4);
    bloco(this.caixa, 0.1, 0.012, 0.57, 0xefcf92, 0, 1.015, 0.4);
    bloco(this.caixa, 0.1, 0.48, 0.012, 0xefcf92, 0, 0.77, 0.686);
    bloco(this.caixa, 0.16, 0.13, 0.015, 0xf1eada, 0.18, 0.77, 0.69);
    this.grupo.visible = false; this.tempo = 0;
  }
  atualizar(entregas, dt) {
    const c = entregas.caminhao;
    this.grupo.visible = !!c && c.fase !== 'aguardando';
    if (!c) return;
    this.tempo += dt;
    this.caminhao.position.set(c.x, 0.03, c.z); this.caminhao.rotation.y = c.angulo;
    this.caminhao.userData.rodas.forEach(roda => { roda.rotation.z = c.rodas; });
    this.caminhao.userData.portas.forEach((porta, i) => {
      const aberta = !['aguardando', 'chegando', 'partindo'].includes(c.fase);
      const alvo = aberta ? (i ? -1 : 1) * 1.5 : 0;
      porta.rotation.y += (alvo - porta.rotation.y) * Math.min(1, dt * 5);
    });
    const a = c.entregador;
    this.entregador.visible = !!a;
    if (!a) return;
    this.entregador.position.set(a.x, 0.23, a.z); this.entregador.rotation.y = a.angulo;
    const { pernas, bracos, corpo } = this.entregador.userData;
    const passo = a.andando ? Math.sin(this.tempo * 9) * 0.48 : 0;
    pernas.forEach((perna, i) => { perna.rotation.x = passo * (i ? -1 : 1); });
    bracos.forEach((braco, i) => { braco.rotation.x = a.carregando ? -0.95 : passo * (i ? 1 : -1); });
    corpo.position.y = a.andando ? Math.abs(Math.sin(this.tempo * 9)) * 0.035 : 0;
    this.caixa.visible = a.carregando;
    this.caixa.position.y = 0;
    if (c.fase === 'guardar') {
      const altura = posicaoPacote(c.slot).y;
      this.caixa.position.y = Math.max(0, altura - 0.77) * Math.min(1, c.tempo / 0.6);
    }
  }
}
