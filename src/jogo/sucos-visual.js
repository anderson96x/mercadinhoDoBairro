import * as THREE from 'three';
import { SUCOS, receitaDisponivelSucos } from './sucos.js';

const materiais = new Map();
export const GELADEIRA_SUCOS = { alturas: [0.72, 1.22, 1.72, 2.22], escalaGarrafa: 0.8 };
function material(cor) {
  if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.32 }));
  return materiais.get(cor);
}
function malha(pai, geometria, cor, x, y, z, nome) {
  const m = new THREE.Mesh(geometria, material(cor));
  m.position.set(x, y, z); m.name = nome; m.castShadow = true; m.receiveShadow = true;
  pai.add(m); return m;
}
function cilindro(pai, topo, base, altura, cor, x, y, z, nome) {
  return malha(pai, new THREE.CylinderGeometry(topo, base, altura, 16), cor, x, y, z, nome);
}

export function posicaoGarrafaGeladeira(id, ponto, indice) {
  const sabor = Object.keys(SUCOS.sabores).indexOf(id), largura = ponto.w - 0.26;
  return new THREE.Vector3(ponto.x - largura / 2 + (indice + 0.5) * largura / SUCOS.capacidadeSabor,
    GELADEIRA_SUCOS.alturas[sabor] + 0.035 + 0.13 * GELADEIRA_SUCOS.escalaGarrafa, ponto.z + ponto.d / 2 - 0.24);
}

export function criarGeladeiraSucos(pai) {
  const grupo = new THREE.Group(); grupo.name = 'geladeira-sucos';
  const { x, z, w, d } = SUCOS.geladeira;
  grupo.position.set(x, 0, z); pai.add(grupo);
  const bloco = (largura, altura, profundidade, cor, px, py, pz, nome) =>
    malha(grupo, new THREE.BoxGeometry(largura, altura, profundidade), cor, px, py, pz, nome);
  bloco(w, 0.18, d, 0x263b40, 0, 0.25, 0, 'rodape-geladeira-sucos');
  bloco(w, 0.36, d, 0xe5eaed, 0, 0.52, 0, 'base-geladeira-sucos');
  // O gabinete começa sobre a base e termina sob o teto, sem faces externas
  // coplanares entre painéis de cores diferentes.
  bloco(w - 0.18, 2.19, 0.1, 0xbccbd1, 0, 1.795, -d / 2 + 0.05, 'fundo-geladeira-sucos');
  for (const lado of [-1, 1]) bloco(0.09, 2.19, d, 0xe5eaed, lado * (w / 2 - 0.045), 1.795, 0, 'lateral-geladeira-sucos');
  bloco(w, 0.12, d, 0xe5eaed, 0, 2.95, 0, 'teto-geladeira-sucos');
  bloco(w - 0.18, 0.19, 0.1, 0xe74735, 0, 2.795, d / 2 - 0.04, 'faixa-vermelha-sucos');
  for (const [indice, [id, sabor]] of Object.entries(SUCOS.sabores).entries()) {
    const y = GELADEIRA_SUCOS.alturas[indice];
    const prateleira = bloco(w - 0.18, 0.07, d - 0.16, 0xa5b6bd, 0, y, 0, `prateleira-sucos-${id}`);
    prateleira.userData.sabor = id;
    bloco(w - 0.18, 0.045, 0.025, sabor.cor, 0, y, d / 2 - 0.09, 'identificacao-sabor-sucos');
  }
  const porta = bloco(w - 0.12, 2.02, 0.018, 0xdae7ee, 0, 1.685, d / 2 - 0.04, 'porta-vidro-sucos');
  porta.material = new THREE.MeshPhysicalMaterial({ color: 0xdae7ee, transparent: true, opacity: 0.1, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide });
  porta.castShadow = false;
  for (const lado of [-1, 1]) bloco(0.045, 2.08, 0.045, 0x263b40, lado * (w / 2 - 0.045), 1.685, d / 2 - 0.025, 'moldura-vertical-sucos');
  for (const y of [0.65, 2.725]) bloco(w, 0.045, 0.045, 0x263b40, 0, y, d / 2 - 0.025, 'moldura-horizontal-sucos');
  bloco(0.045, 0.42, 0.07, 0x263b40, w / 2 - 0.16, 1.65, d / 2 + 0.005, 'puxador-geladeira-sucos');
  bloco(w - 0.12, 0.3, 0.03, 0x263b40, 0, 0.48, d / 2 + 0.02, 'grade-geladeira-sucos');
  for (let i = 0; i < 6; i++) bloco(w - 0.18, 0.016, 0.018, 0x829394, 0, 0.36 + i * 0.045, d / 2 + 0.05, 'lamina-grade-sucos');
  return grupo;
}

export function criarGarrafaSuco(id) {
  const grupo = new THREE.Group(); grupo.name = `garrafa-suco-${id}`;
  const cor = SUCOS.sabores[id].cor;
  cilindro(grupo, 0.112, 0.112, 0.26, cor, 0, 0.02, 0, 'corpo-garrafa-suco');
  cilindro(grupo, 0.06, 0.112, 0.17, cor, 0, 0.235, 0, 'ombros-garrafa-suco');
  cilindro(grupo, 0.06, 0.06, 0.035, cor, 0, 0.3375, 0, 'gargalo-garrafa-suco');
  cilindro(grupo, 0.073, 0.073, 0.045, 0x30464b, 0, 0.3775, 0, 'tampa-garrafa-suco');
  cilindro(grupo, 0.112, 0.1, 0.025, new THREE.Color(cor).multiplyScalar(0.82).getHex(), 0, -0.1175, 0, 'base-garrafa-suco');
  cilindro(grupo, 0.115, 0.115, 0.15, 0x68ae4f, 0, 0.025, 0, 'rotulo-verde-suco');
  for (const [y, arco] of [[0.055, 1.9], [0.005, 1.3]]) {
    malha(grupo, new THREE.CylinderGeometry(0.116, 0.116, 0.025, 12, 1, true, -arco / 2, arco), 0xfff9e8, 0, y, 0, 'faixa-rotulo-suco');
  }
  const brilho = malha(grupo, new THREE.BoxGeometry(0.018, 0.13, 0.008), 0xffefbe, -0.065, 0.155, 0.084, 'reflexo-garrafa-suco');
  brilho.rotation.z = -0.25;
  return grupo;
}

export function criarMaquinaSucos(pai) {
  const grupo = new THREE.Group(); grupo.name = 'maquina-sucos';
  grupo.position.set(SUCOS.maquina.x, 0, SUCOS.maquina.z); pai.add(grupo);
  const escuro = 0x34494e, metal = 0xb7c5d1;
  cilindro(grupo, 0.43, 0.43, 0.065, metal, 0, 1.2125, 0, 'anel-base-sucos');
  cilindro(grupo, 0.4, 0.4, 0.36, escuro, 0, 1.425, 0, 'motor-sucos');
  cilindro(grupo, 0.435, 0.435, 0.09, 0x263b40, 0, 1.65, 0, 'suporte-cuba-sucos');
  const vidro = new THREE.MeshPhysicalMaterial({ color: 0xdae7ff, transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const cuba = malha(grupo, new THREE.CylinderGeometry(0.435, 0.435, 0.61, 20, 1, true), 0xdae7ff, 0, 2, 0, 'cuba-transparente-sucos');
  cuba.material = vidro; cuba.castShadow = false;
  const cupula = malha(grupo, new THREE.SphereGeometry(0.435, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xdae7ff, 0, 2.305, 0, 'cupula-sucos');
  cupula.material = vidro; cupula.castShadow = false;
  cilindro(grupo, 0.15, 0.15, 0.53, escuro, 0, 2.72, 0, 'alimentador-sucos');
  cilindro(grupo, 0.18, 0.18, 0.09, 0x59737d, 0, 3.03, 0, 'tampa-alimentador-sucos');
  const bico = cilindro(grupo, 0.065, 0.065, 0.25, metal, 0, 1.48, 0.46, 'bico-sucos');
  bico.rotation.x = Math.PI / 2;
  const alavanca = malha(grupo, new THREE.BoxGeometry(0.14, 0.035, 0.07), escuro, 0, 1.61, 0.47, 'alavanca-sucos');
  alavanca.rotation.x = -0.15;
  const seletor = cilindro(grupo, 0.085, 0.085, 0.04, metal, 0.37, 1.42, 0.15, 'seletor-sucos');
  seletor.rotation.z = Math.PI / 2;
  const luz = cilindro(grupo, 0.022, 0.022, 0.012, 0x71868b, 0.18, 1.43, 0.36, 'luz-sucos');
  luz.rotation.x = Math.PI / 2; luz.material = luz.material.clone();
  const liquido = cilindro(grupo, 0.392, 0.392, 0.35, SUCOS.sabores.sucoLaranja.cor, 0, 1.875, 0, 'liquido-sucos');
  liquido.material = liquido.material.clone();
  liquido.material.side = THREE.DoubleSide;
  const perfil = [[0, -0.09], [0.09, -0.07], [0.2, -0.025], [0.3, 0.008], [0.392, 0.025]].map(([x, y]) => new THREE.Vector2(x, y));
  const superficie = malha(grupo, new THREE.LatheGeometry(perfil, 24), SUCOS.sabores.sucoLaranja.cor, 0, 2.14, 0, 'superficie-suco');
  superficie.material = liquido.material;
  const giro = new THREE.Group(); giro.name = 'redemoinho-suco'; giro.position.y = 2.14; grupo.add(giro);
  const espuma = new THREE.MeshStandardMaterial({ color: 0xffd774, roughness: 0.65, side: THREE.DoubleSide });
  for (const [i, raio] of [0.14, 0.25, 0.35].entries()) {
    const curva = new THREE.Mesh(new THREE.TorusGeometry(raio, 0.009, 4, 16, Math.PI * 0.8), espuma);
    curva.name = 'espiral-suco'; curva.rotation.set(Math.PI / 2, 0, i * 2.1); curva.position.y = -0.06 + i * 0.035;
    giro.add(curva);
  }
  grupo.userData.sucos = { liquido, superficie, giro, espuma, luz, sabor: 'sucoLaranja' };
  liquido.visible = superficie.visible = giro.visible = false;
  return grupo;
}

export function animarMaquinaSucos(grupo, estado, dt) {
  const modelo = grupo.userData.sucos, ativa = receitaDisponivelSucos(estado);
  const processando = !!ativa && estado.sucos.progresso[ativa.id] > 0;
  modelo.liquido.visible = modelo.superficie.visible = modelo.giro.visible = processando;
  if (ativa) modelo.sabor = ativa.id;
  const cor = SUCOS.sabores[modelo.sabor].cor;
  modelo.liquido.material.color.setHex(cor);
  modelo.espuma.color.setHex(cor).lerp(new THREE.Color(0xfff8dc), 0.5);
  modelo.luz.material.color.setHex(processando ? 0x8bdd70 : 0x71868b);
  if (processando && dt > 0) {
    modelo.giro.rotation.y += dt * 4.8;
    modelo.superficie.rotation.y = modelo.giro.rotation.y;
    modelo.superficie.rotation.x = Math.sin(modelo.giro.rotation.y) * 0.025;
  }
}
