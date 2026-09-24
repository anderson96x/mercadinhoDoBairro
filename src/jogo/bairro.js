import * as THREE from 'three';
import { PALETAS } from './personalizacao.js';

// As mesmas paredes orientam a geometria e as colisões. A fachada é cortada para revelar a loja.
export const PAREDES_LOJA = [
  { x: 3, z: -6, w: 12.4, d: 0.28, h: 2.8 },
  { x: 9.1, z: 0.35, w: 0.28, d: 12.7, h: 0.75 },
  { x: -3.1, z: -3.4, w: 0.28, d: 5.2, h: 2.8 },
  { x: -3.1, z: 4.45, w: 0.28, d: 4.5, h: 2.8 },
  { x: 4.65, z: 6.7, w: 8.9, d: 0.28, h: 0.65 }
];

export const PAREDES_ESCRITORIO = [
  { x: 1.1, z: -4, w: 0.18, d: 4, h: 2.8 },
  { x: -2.25, z: -2, w: 1.7, d: 0.18, h: 2.8 },
  { x: 0.55, z: -2, w: 1.1, d: 0.18, h: 2.8 }
];
export const PORTA_ESCRITORIO = { x: -0.7, z: -2, w: 1.4, d: 0.12 };

export const MOBILIARIO_LOJA = [
  { x: -0.8, z: -4.6, w: 2.7, d: 0.85 },
  { x: -2.65, z: -4.4, w: 0.45, d: 1.7 },
  { x: 7.75, z: -4.5, w: 1.8, d: 0.85 },
  { x: 7.65, z: 0.1, w: 1.5, d: 1.2 }
];

export function construirBairro(cena, { caixa, cilindro, esfera, placa }) {
  const grupo = new THREE.Group(); cena.add(grupo);
  let destino = grupo;
  const materiais = [];
  const bloco = (w, h, d, cor, x, y, z, papel) => {
    const m = caixa(destino, w, h, d, cor, x, y, z);
    if (papel) { m.material = m.material.clone(); materiais.push({ material: m.material, papel }); }
    return m;
  };
  const chao = (camada, ...args) => { const m = bloco(...args); m.userData.fundo = camada; return m; };
  chao(0, 120, 0.3, 120, 0xe4e7de, 0, -0.5, 0);
  chao(1, 24, 0.3, 25, 0xabbf89, 0, -0.2, 2);
  chao(2, 24, 0.08, 4.4, 0x59616b, 0, 0, 11.3);
  chao(3, 24, 0.18, 2.5, 0xdacbb4, 0, 0.04, 7.95);
  bloco(24, 0.22, 0.16, 0xf3e5ce, 0, 0.07, 9.18);
  for (let x = -11; x < 12; x += 2.5) chao(4, 1.2, 0.012, 0.1, 0xf2e7c9, x, 0.049, 11.6);
  for (let z = 9.5; z < 11; z += 0.35) chao(4, 2.2, 0.012, 0.18, 0xf7eddb, -1.3, 0.052, z);
  for (let x = -11.5; x < 12; x += 0.8) chao(4, 0.016, 0.01, 2.35, 0xbeb19a, x, 0.135, 7.95);
  for (const z of [7.25, 7.95, 8.65]) chao(4, 24, 0.01, 0.015, 0xbeb19a, 0, 0.136, z);
  chao(3, 12.4, 0.2, 12.7, 0xc4b9a5, 3, 0.06, 0.35);
  chao(4, 12.1, 0.07, 12.4, 0xe3dcc8, 3, 0.19, 0.35, 'piso');
  for (let x = -2.8; x < 9; x += 1.2) chao(5, 0.018, 0.008, 12.35, 0xc8bfae, x, 0.23, 0.35);
  for (let z = -5.8; z < 6.6; z += 1.2) chao(5, 12, 0.008, 0.018, 0xc8bfae, 3, 0.23, z);
  for (const p of [...PAREDES_LOJA, ...PAREDES_ESCRITORIO]) {
    bloco(p.w, p.h, p.d, 0xf1ead7, p.x, 0.23 + p.h / 2, p.z, 'parede');
    bloco(p.w + 0.04, 0.1, p.d + 0.04, 0x286750, p.x, p.h + 0.23, p.z, 'principal');
    bloco(p.w, 0.22, p.d + 0.035, 0x286750, p.x, 0.34, p.z, 'principal');
  }
  // Porta de serviço aberta para a horta lateral.
  for (const z of [-0.8, 2.2]) bloco(0.34, 2.9, 0.14, 0x286750, -3.1, 1.68, z, 'principal');
  bloco(0.34, 0.22, 3.15, 0x286750, -3.1, 3.02, 0.7, 'principal');
  for (let x = -5; x < -3.3; x += 0.55) chao(3, 0.43, 0.06, 1.6, 0xd6c7ac, x, 0.16, 0.7);
  const acesso = placa('HORTA · EQUIPE', '#286750', '#fff5df', 1.8, 0.32);
  acesso.rotation.y = Math.PI / 2; acesso.position.set(-2.89, 2.83, 0.7); grupo.add(acesso);
  // Escritório no canto esquerdo, separado do salão por uma divisória baixa.
  chao(6, 3.85, 0.012, 3.8, 0xd5c2d5, -1, 0.241, -3.95);
  for (const x of [-1.4, 0]) bloco(0.09, 2.5, 0.23, 0x286750, x, 1.48, -2, 'principal');
  bloco(1.5, 0.35, 0.2, 0xf1ead7, -0.7, 2.86, -2, 'parede');
  bloco(1.5, 0.12, 0.23, 0x286750, -0.7, 2.67, -2, 'principal');
  const porta = new THREE.Group(); porta.position.set(-1.4, 0.23, -2); grupo.add(porta); destino = porta;
  bloco(1.32, 2.37, 0.09, 0x286750, 0.7, 1.2, 0, 'principal');
  bloco(1.1, 0.98, 0.015, 0xa8c7c9, 0.7, 1.57, 0.053);
  bloco(1.1, 0.98, 0.015, 0xa8c7c9, 0.7, 1.57, -0.053);
  for (const z of [-0.1, 0.1]) bloco(0.18, 0.045, 0.08, 0xe7b65a, 1.14, 1.05, z, 'destaque');
  destino = grupo;
  const nomeEscritorio = placa('ESCRIT?RIO', '#286750', '#fff5df', 1.15, 0.19);
  nomeEscritorio.position.set(-0.7, 2.87, -1.885); grupo.add(nomeEscritorio);
  bloco(2.7, 0.14, 0.85, 0xbc8752, -0.8, 1.02, -4.6);
  for (const x of [-1.9, 0.3]) bloco(0.35, 0.72, 0.65, 0xa87244, x, 0.6, -4.6);
  bloco(0.68, 0.5, 0.07, 0x414846, -0.7, 1.4, -4.72);
  bloco(0.57, 0.37, 0.015, 0x94b7b5, -0.7, 1.42, -4.675);
  bloco(0.1, 0.2, 0.12, 0x414846, -0.7, 1.16, -4.72);
  bloco(0.6, 0.035, 0.2, 0x606b67, -0.7, 1.11, -4.34);
  bloco(0.55, 0.12, 0.55, 0x779c96, -0.9, 0.63, -3.5);
  bloco(0.55, 0.55, 0.1, 0x779c96, -0.9, 0.95, -3.24);
  cilindro(grupo, 0.07, 0.12, 0.4, 0x56645e, -0.9, 0.42, -3.5);
  bloco(0.45, 1.6, 1.7, 0x8c613d, -2.65, 1.03, -4.4);
  for (let i = 0; i < 3; i++) {
    bloco(0.045, 0.07, 1.6, 0xc79765, -2.4, 0.55 + i * 0.49, -4.4);
    for (let j = 0; j < 5; j++) bloco(0.13, 0.3, 0.17, [0x78998a,0xd8b57d,0xc67e64][j % 3], -2.39, 0.75 + i * 0.49, -5.05 + j * 0.28);
  }
  // Balcão de apoio ao fundo e estante vazia na lateral direita.
  bloco(1.8, 0.85, 0.85, 0xf1ead7, 7.75, 0.65, -4.5, 'parede');
  bloco(1.9, 0.1, 0.95, 0x286750, 7.75, 1.12, -4.5, 'principal');
  bloco(0.65, 0.12, 0.48, 0xd5d7c7, 8.1, 1.23, -4.5);
  for (const x of [6.97, 8.33]) bloco(0.12, 1.6, 1.2, 0xa97845, x, 1.03, 0.1);
  for (const y of [0.35, 0.99, 1.65]) bloco(1.5, 0.1, 1.2, 0xd5a96b, 7.65, y, 0.1);
  for (const [x,z] of [[-2.3,-2.3],[0.2,-4.6],[8.2,-2.8]]) {
    cilindro(grupo, 0.15, 0.11, 0.25, 0xbb8356, x, z === -4.6 ? 1.22 : 0.36, z);
    esfera(grupo, 0.25, 0x72965a, x, z === -4.6 ? 1.5 : 0.65, z, 0.8, 1.3, 0.8);
  }
  // Vitrine e portas de correr recolhidas nas laterais do vão.
  const entrada = new THREE.Group(); entrada.position.x = -8.82; grupo.add(entrada); destino = entrada;
  for (const x of [6, 9.05]) {
    bloco(0.12, 2.6, 0.18, 0x286750, x, 1.53, 6.7, 'principal');
    bloco(0.45, 2.2, 0.055, 0xb5d6d9, x + (x === 6 ? 0.28 : -0.28), 1.43, 6.72);
    bloco(0.03, 0.7, 0.06, 0xf5eddc, x + (x === 6 ? 0.48 : -0.48), 1.4, 6.77);
  }
  bloco(3.22, 0.2, 0.3, 0x286750, 7.52, 2.9, 6.7, 'principal');
  bloco(3.35, 0.68, 0.22, 0x286750, 7.52, 3.42, 6.7, 'principal');
  bloco(3, 0.025, 0.9, 0x286750, 7.5, 0.24, 6.25, 'principal');
  // Toldo listrado e floreiras na fachada baixa.
  for (let i = 0; i < 10; i++) {
    const toldo = bloco(0.31, 0.075, 1.05, i % 2 ? 0xfaf0d9 : 0xe7b65a, 6.12 + i * 0.31, 3.02, 7.0, i % 2 ? null : 'destaque');
    toldo.rotation.x = 0.12;
  }
  destino = grupo;
  for (const x of [1.4, 6.2, 10.5]) {
    bloco(1.1, 0.45, 0.55, 0x286750, x, 0.36, 7.4, 'principal');
    for (let i = 0; i < 3; i++) {
      esfera(grupo, 0.24, 0x66864e, x - 0.32 + i * 0.32, 0.68, 7.4);
      esfera(grupo, 0.085, 0xf0be6c, x - 0.32 + i * 0.32, 0.89, 7.4);
    }
  }
  // Cerca e árvores enquadram a área de cultivo.
  for (let z = -7; z <= 6; z += 1.3) {
    bloco(0.13, 0.9, 0.13, 0xb3966b, -9.2, 0.5, z);
    bloco(0.1, 0.12, 1.35, 0xd4bd94, -9.2, 0.7, z + 0.62);
  }
  for (const [x,z] of [[-10,-6.2],[-10,4.7],[10.6,-5.4]]) {
    cilindro(grupo, 0.13, 0.2, 1.8, 0x9a7950, x, 0.9, z);
    esfera(grupo, 1, 0x648859, x, 2.15, z, 1, 1.2, 1);
    esfera(grupo, 0.65, 0x87a567, x - 0.45, 2.5, z + 0.25);
  }
  for (const x of [-7.8, 10.8]) {
    cilindro(grupo, 0.055, 0.075, 2.8, 0x45544e, x, 1.55, 8.4);
    bloco(0.35, 0.3, 0.35, 0xffe1a0, x, 3, 8.4);
    bloco(0.45, 0.09, 0.45, 0x45544e, x, 3.2, 8.4);
  }
  const letreiros = new THREE.Group(); grupo.add(letreiros);
  let anterior;
  return {
    animarPorta(abertura) {
      const t = THREE.MathUtils.smoothstep(abertura, 0, 1);
      porta.rotation.y = t * Math.PI / 2;
    },
    vincular(mesh, papel) {
      mesh.material = mesh.material.clone(); materiais.push({ material: mesh.material, papel }); anterior = undefined;
    },
    aplicar(dados) {
      const chave = JSON.stringify(dados); if (chave === anterior) return; anterior = chave;
      const paleta = PALETAS.find(p => p.id === dados.paleta) || PALETAS[0];
      for (const { material, papel } of materiais) material.color.set(paleta[papel]);
      letreiros.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.map?.dispose(); m.material.dispose(); } });
      letreiros.clear();
      const nome = placa(dados.nome, paleta.principal, '#fff5df', 5.5, 0.72); nome.position.set(2.8, 2.25, -5.82); letreiros.add(nome);
      const slogan = placa(dados.slogan, paleta.parede, paleta.principal, 5.5, 0.38); slogan.position.set(2.8, 1.61, -5.82); letreiros.add(slogan);
      const fachada = placa(dados.nome, paleta.principal, '#fff5df', 3.15, 0.4); fachada.position.set(-1.3, 3.55, 6.83); letreiros.add(fachada);
      const lema = placa(dados.slogan, paleta.principal, '#fff5df', 3.15, 0.2); lema.position.set(-1.3, 3.22, 6.83); letreiros.add(lema);
    }
  };
}
