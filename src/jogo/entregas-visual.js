import * as THREE from 'three';
import { criarAgente } from './coleta-banco.js';
import { posicaoPacote } from './entregas.js';
import { CLASSES_PRODUTOS } from './classes-produtos.js';

const materiais = new Map();
export const ANGULO_PORTAS_BAU = 1.8;
export const ANGULO_PORTA_CABINE = 1.18;
function bloco(pai, w, h, d, cor, x, y, z) {
  if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8 }));
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materiais.get(cor));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; pai.add(mesh); return mesh;
}
export function criarCaminhaoEntrega() {
  const grupo = new THREE.Group(); grupo.name = 'caminhao-entrega';
  const branco = 0xf4f4ef, cinza = 0xc7cccb, escuro = 0x303638, vidro = 0x17292f;
  const corCategoria = CLASSES_PRODUTOS.enlatados.cor;
  bloco(grupo, 4.9, 0.22, 1.5, escuro, 0, 0.59, 0);
  // Casca aberta na traseira: nenhuma parede permanece atrás das portas.
  for (const lado of [-1, 1]) {
    const parede = bloco(grupo, 3.5, 2.08, 0.075, corCategoria, -0.65, 1.85, lado * 0.7875);
    parede.name = 'lateral-bau';
    // Pictograma de lata feito em geometria, legível em WebGL e Canvas.
    const logo = new THREE.Group(); logo.name = 'logo-enlatados-caminhao';
    logo.position.set(-0.65, 1.9, lado * 0.832);
    if (lado < 0) logo.rotation.y = Math.PI;
    grupo.add(logo);
    bloco(logo, 1.25, 1.35, 0.025, branco, 0, 0, 0);
    bloco(logo, 0.61, 0.72, 0.035, escuro, 0, -0.02, 0.025).name = 'silhueta-lata';
    bloco(logo, 0.53, 0.58, 0.04, corCategoria, 0, -0.02, 0.045);
    for (const y of [-0.38, 0.34]) {
      const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.055, 20), materiais.get(escuro));
      aro.scale.z = 0.28; aro.position.set(0, y, 0.05); logo.add(aro);
    }
    bloco(logo, 0.46, 0.035, 0.025, branco, 0, 0.23, 0.075);
    bloco(logo, 0.46, 0.035, 0.025, branco, 0, -0.27, 0.075);
    const tomate = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc64b35 }));
    tomate.scale.z = 0.23; tomate.position.set(0, -0.02, 0.09); logo.add(tomate);
    const folha = bloco(logo, 0.14, 0.05, 0.025, 0x32634a, 0.04, 0.12, 0.1);
    folha.rotation.z = 0.45;
    const cereal = new THREE.Group(); cereal.name = 'logo-cereais-caminhao';
    cereal.position.copy(logo.position); cereal.rotation.copy(logo.rotation);
    cereal.visible = false; grupo.add(cereal);
    bloco(cereal, 1.25, 1.35, 0.025, branco, 0, 0, 0);
    bloco(cereal, 0.66, 0.93, 0.035, escuro, 0, 0, 0.025);
    bloco(cereal, 0.58, 0.85, 0.04, CLASSES_PRODUTOS.cereais.cor, 0, 0, 0.045).name = 'embalagem-cereal-logo';
    bloco(cereal, 0.46, 0.08, 0.025, branco, 0, -0.31, 0.075);
    bloco(cereal, 0.48, 0.035, 0.025, branco, 0, 0.35, 0.075);
    const grao = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8), new THREE.MeshStandardMaterial({ color: 0x76472e }));
    grao.scale.set(1, 0.75, 0.15); grao.position.set(0, 0.04, 0.09); cereal.add(grao);
  }
  bloco(grupo, 0.075, 2.08, 1.65, corCategoria, 1.0625, 1.85, 0).name = 'frente-bau';
  bloco(grupo, 3.5, 0.075, 1.65, corCategoria, -0.65, 2.8525, 0).name = 'teto-bau';
  bloco(grupo, 3.35, 0.03, 1.5, 0x6b7472, -0.65, 0.875, 0).name = 'piso-interno-bau';
  bloco(grupo, 3.5, 0.08, 1.69, cinza, -0.65, 0.82, 0);
  // Cabine em peças deixa o interior realmente visível quando a porta abre.
  bloco(grupo, 1.3, 0.16, 1.6, branco, 1.75, 0.78, 0).name = 'piso-cabine-entrega';
  bloco(grupo, 1.3, 0.14, 1.6, branco, 1.75, 2.48, 0).name = 'teto-cabine-entrega';
  bloco(grupo, 0.12, 1.58, 1.6, branco, 1.13, 1.63, 0);
  for (const lado of [-1, 1]) bloco(grupo, 0.28, 1.66, 0.08, branco, 2.27, 1.62, lado * 0.78);
  bloco(grupo, 1.12, 0.08, 1.66, cinza, 1.7, 2.54, 0);
  bloco(grupo, 0.025, 0.61, 1.43, vidro, 2.411, 2.05, 0);
  bloco(grupo, 0.14, 0.22, 1.73, cinza, 2.48, 0.7, 0);
  bloco(grupo, 0.03, 0.29, 0.85, escuro, 2.56, 1.03, 0);
  for (const z of [-0.6, 0.6]) bloco(grupo, 0.035, 0.18, 0.28, 0xffefbc, 2.56, 1.05, z);
  const interior = new THREE.Group(); interior.name = 'interior-cabine-entrega'; grupo.add(interior);
  bloco(interior, 0.72, 0.1, 0.58, 0x596065, 1.62, 1.03, 0.36).name = 'banco-passageiro-entrega';
  bloco(interior, 0.14, 0.72, 0.58, 0x454c50, 1.25, 1.35, 0.36);
  bloco(interior, 0.72, 0.1, 0.58, 0x596065, 1.62, 1.03, -0.36).name = 'banco-motorista-entrega';
  bloco(interior, 0.14, 0.72, 0.58, 0x454c50, 1.25, 1.35, -0.36);
  bloco(interior, 0.18, 0.2, 1.25, escuro, 2.22, 1.46, 0).name = 'painel-cabine-entrega';
  const volante = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 6, 14), materiais.get(escuro));
  volante.name = 'volante-caminhao'; volante.position.set(2.08, 1.62, -0.39); volante.rotation.y = Math.PI / 2; interior.add(volante);
  const portaCabine = new THREE.Group(); portaCabine.name = 'porta-motorista-caminhao';
  portaCabine.position.set(2.2, 0.86, -0.82); grupo.add(portaCabine);
  bloco(portaCabine, 1.02, 0.72, 0.07, branco, -0.51, 0.37, 0);
  bloco(portaCabine, 0.93, 0.62, 0.035, vidro, -0.49, 1.04, 0);
  bloco(portaCabine, 0.18, 0.045, 0.04, escuro, -0.72, 0.65, -0.055);
  const portas = [];
  const piscas = [], freios = [], luzesRe = [];
  for (const lado of [-1, 1]) {
    if (lado > 0) {
      bloco(grupo, 1.02, 0.72, 0.07, branco, 1.69, 1.23, lado * 0.82);
      bloco(grupo, 0.88, 0.58, 0.025, vidro, 1.84, 2.04, lado * 0.813);
      bloco(grupo, 0.24, 0.045, 0.04, escuro, 1.54, 1.56, lado * 0.835);
    }
    bloco(grupo, 0.12, 0.25, 0.13, cinza, 2.13, 1.97, lado * 0.99);
    bloco(grupo, 0.55, 0.12, 0.16, cinza, 1.54, 0.7, lado * 0.84);
    bloco(grupo, 1.85, 0.085, 0.02, 0x348461, -0.45, 1.12, lado * 0.837);
    const freio = bloco(grupo, 0.04, 0.15, 0.18, 0xd44d3d, -2.43, 0.91, lado * 0.58);
    freio.name = 'luz-freio-caminhao'; freio.material = freio.material.clone(); freios.push(freio);
    const re = bloco(grupo, 0.04, 0.11, 0.15, 0xf2eee0, -2.43, 1.08, lado * 0.58);
    re.name = 'luz-re-caminhao'; re.material = re.material.clone(); luzesRe.push(re);
    for (const x of [-2.43, 2.57]) {
      const pisca = bloco(grupo, 0.045, 0.1, 0.13, 0xe89428, x, 0.93, lado * 0.72);
      pisca.name = 'pisca-caminhao'; pisca.userData.lado = lado > 0 ? 'esquerda' : 'direita';
      pisca.material = pisca.material.clone(); piscas.push(pisca);
    }
    const porta = new THREE.Group(); porta.name = 'porta-traseira-bau';
    porta.position.set(-2.41, 0.91, lado * 0.8); grupo.add(porta); portas.push(porta);
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
  grupo.userData = { rodas, portas, portaCabine, piscas, freios, luzesRe, corCategoria };
  return grupo;
}
export class EntregasVisual {
  constructor(cena, criarEntregador = () => criarAgente(0xd6a174), animarEntregador = null) {
    this.grupo = new THREE.Group(); this.grupo.name = 'entrega-importacoes'; cena.add(this.grupo);
    this.caminhao = criarCaminhaoEntrega(); this.grupo.add(this.caminhao);
    this.pintura = new THREE.MeshStandardMaterial({ color: CLASSES_PRODUTOS.enlatados.cor, roughness: 0.8 });
    this.caminhao.traverse(objeto => {
      if (['lateral-bau', 'frente-bau', 'teto-bau'].includes(objeto.name)) objeto.material = this.pintura;
    });
    this.entregador = criarEntregador(); this.entregador.name = 'entregador-importacoes';
    const uniforme = this.entregador.userData.uniforme;
    if (uniforme) for (const malha of [...uniforme.camisa, ...uniforme.chapeu]) {
      malha.material = malha.material.clone(); malha.material.color.set(CLASSES_PRODUTOS.enlatados.cor);
    }
    if (this.entregador.userData.maleta) this.entregador.userData.maleta.visible = false;
    if (this.entregador.userData.cesta) this.entregador.userData.cesta.visible = false;
    this.grupo.add(this.entregador);
    this.caixa = new THREE.Group(); this.caixa.name = 'pacote-em-entrega'; this.entregador.userData.corpo.add(this.caixa);
    bloco(this.caixa, 0.65, 0.48, 0.56, 0xd5a567, 0, 0.77, 0.4);
    bloco(this.caixa, 0.1, 0.012, 0.57, 0xefcf92, 0, 1.015, 0.4);
    bloco(this.caixa, 0.1, 0.48, 0.012, 0xefcf92, 0, 0.77, 0.686);
    bloco(this.caixa, 0.16, 0.13, 0.015, 0xf1eada, 0.18, 0.77, 0.69);
    this.grupo.visible = false; this.tempo = 0; this.animarEntregador = animarEntregador;
  }
  atualizar(entregas, dt) {
    const c = entregas.caminhao;
    this.grupo.visible = !!c && c.fase !== 'aguardando';
    if (!c) return;
    // Pedidos mistos usam a primeira classe durante toda a viagem, inclusive a saída.
    const classe = CLASSES_PRODUTOS[c.classe] ? c.classe : 'enlatados';
    if (this.classe !== classe) {
      this.classe = classe;
      const cor = CLASSES_PRODUTOS[classe].cor;
      this.pintura.color.setHex(cor); this.caminhao.userData.corCategoria = cor;
      this.caminhao.traverse(objeto => {
        if (objeto.name === 'logo-cereais-caminhao') objeto.visible = classe === 'cereais';
        if (objeto.name === 'logo-enlatados-caminhao') objeto.visible = classe !== 'cereais';
      });
      const uniforme = this.entregador.userData.uniforme;
      if (uniforme) for (const malha of [...uniforme.camisa, ...uniforme.chapeu]) malha.material.color.setHex(cor);
    }
    this.tempo += dt;
    this.caminhao.position.set(c.x, 0.03, c.z); this.caminhao.rotation.y = c.angulo;
    this.caminhao.userData.rodas.forEach(roda => { roda.rotation.z = c.rodas; });
    this.caminhao.userData.portas.forEach((porta, i) => {
      porta.rotation.y = (i ? 1 : -1) * ANGULO_PORTAS_BAU * (c.aberturaBau || 0);
    });
    this.caminhao.userData.portaCabine.rotation.y = -ANGULO_PORTA_CABINE * (c.aberturaCabine || 0);
    const pulso = Math.sin(this.tempo * 9) > 0;
    for (const pisca of this.caminhao.userData.piscas) {
      const ativo = pulso && (c.direcaoCurva === pisca.userData.lado || c.re);
      pisca.material.emissive.setHex(ativo ? 0xe89428 : 0x000000); pisca.material.emissiveIntensity = ativo ? 1.5 : 0;
    }
    for (const luz of this.caminhao.userData.freios) {
      luz.material.emissive.setHex(c.freando ? 0xd44d3d : 0x000000); luz.material.emissiveIntensity = c.freando ? 1.4 : 0;
    }
    for (const luz of this.caminhao.userData.luzesRe) {
      luz.material.emissive.setHex(c.re ? 0xfff8dc : 0x000000); luz.material.emissiveIntensity = c.re ? 1.2 : 0;
    }
    const a = c.entregador;
    this.entregador.visible = !!a && a.visible !== false;
    if (!a) return;
    this.entregador.position.set(a.x, 0.23, a.z); this.entregador.rotation.y = a.angulo;
    const d = this.entregador.userData;
    const pernas = d.pernas || [d.pernaE, d.pernaD];
    const corpo = d.corpo;
    const passo = a.andando ? Math.sin(this.tempo * 9) * 0.48 : 0;
    if (this.animarEntregador) this.animarEntregador(this.entregador, a, c, dt, this.tempo);
    else pernas.filter(Boolean).forEach((perna, i) => { perna.rotation.x = passo * (i ? -1 : 1); });
    if (!this.animarEntregador) {
      corpo.position.y = a.andando ? Math.abs(Math.sin(this.tempo * 9)) * 0.035 : 0;
      corpo.rotation.z = a.andando ? -Math.sin(this.tempo * 9) * 0.025 : 0;
    }
    const pegando = c.fase === 'retirar' && c.tempo >= 0.35;
    this.caixa.visible = a.carregando || pegando;
    this.caixa.position.y = 0;
    if (pegando) {
      const t = Math.min(1, (c.tempo - 0.35) / 0.35);
      this.caixa.position.y = -0.58 * (1 - t * t * (3 - 2 * t));
    } else if (c.fase === 'guardar') {
      const altura = posicaoPacote(c.slot).y;
      this.caixa.position.y = Math.max(0, altura - 0.77) * Math.min(1, c.tempo / 0.6);
    }
  }
}
