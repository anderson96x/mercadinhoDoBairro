import { construirBairro } from './bairro.js';
import * as THREE from 'three';
import { CONFIG, PRODUTOS } from './configuracao.js';
import { RenderizadorCompativel } from './renderizador-compativel.js';
import { PALETAS } from './personalizacao.js';
import { APARENCIAS_CLIENTES } from './aparencias-clientes.js';
import { icone } from '../interface/icones.js';

const pontoNoBalcao = (x, y, z) => new THREE.Vector3(CONFIG.balcao.x + z, y, CONFIG.balcao.z - x);
const materiais = new Map();
const pertoDaEstacao = (ator, centro, largura, profundidade) => Math.hypot(
  Math.max(0, Math.abs(ator.x - centro.x) - largura / 2),
  Math.max(0, Math.abs(ator.z - centro.z) - profundidade / 2)
) < CONFIG.raioInteracao;
function material(cor) {
  if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, metalness: 0 }));
  return materiais.get(cor);
}
function objeto(geometria, cor, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometria, material(cor)); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function caixa(pai, w, h, d, cor, x, y, z) {
  const m = objeto(new THREE.BoxGeometry(w, h, d), cor, x, y, z); pai.add(m); return m;
}
function esfera(pai, r, cor, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = objeto(new THREE.SphereGeometry(r, 8, 6), cor, x, y, z); m.scale.set(sx, sy, sz); pai.add(m); return m;
}
function cilindro(pai, r1, r2, h, cor, x, y, z, lados = 12) {
  const m = objeto(new THREE.CylinderGeometry(r1, r2, h, lados), cor, x, y, z); pai.add(m); return m;
}
function placa(texto, fundo = '#1d664d', cor = '#fff7dc', largura = 3.4, altura = 0.72) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 160;
  const ctx = c.getContext('2d'); ctx.fillStyle = fundo; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = cor; ctx.font = '800 67px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(texto, 384, 82, 705);
  const textura = new THREE.CanvasTexture(c); textura.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), new THREE.MeshBasicMaterial({ map: textura, side: THREE.DoubleSide }));
  return m;
}

function liberarGeometrias(grupo) {
  grupo.traverse(m => { if (m.isMesh) m.geometry?.dispose(); });
  grupo.clear();
}

export function criarProduto(id, escala = 1) {
  const grupo = new THREE.Group();
  if (id === 'tomate') {
    esfera(grupo, 0.16, 0xff3f32, 0, 0, 0, 1, 0.86, 1);
    const folha = caixa(grupo, 0.2, 0.04, 0.09, 0x2a9b40, 0, 0.14, 0); folha.rotation.y = 0.7;
    caixa(grupo, 0.04, 0.09, 0.04, 0x2a9b40, 0, 0.18, 0);
  } else {
    esfera(grupo, 0.14, 0xffd22e, 0, 0, 0, 0.7, 1.5, 0.7);
    const folha = esfera(grupo, 0.12, 0x38a447, 0.07, -0.06, 0, 0.45, 1.6, 0.55); folha.rotation.z = -0.35;
  }
  grupo.scale.setScalar(escala); return grupo;
}

function braco(cor, pele, x) {
  const grupo = new THREE.Group();
  const superior = caixa(grupo, 0.16, 1, 0.18, cor, 0, 0, 0);
  const inferior = caixa(grupo, 0.13, 1, 0.14, pele, 0, 0, 0);
  const mao = esfera(grupo, 0.09, pele, 0, 0, 0);
  grupo.userData = { superior, inferior, mao, ombro: new THREE.Vector3(x, 0.89, 0) };
  return grupo;
}

function posicionarBraco(grupo, destino) {
  const { superior, inferior, mao, ombro } = grupo.userData;
  const cotovelo = ombro.clone().lerp(destino, 0.5);
  cotovelo.x += Math.sign(ombro.x) * 0.08;
  cotovelo.y -= 0.12;
  for (const [parte, inicio, fim] of [[superior, ombro, cotovelo], [inferior, cotovelo, destino]]) {
    const direcao = fim.clone().sub(inicio);
    parte.position.copy(inicio).lerp(fim, 0.5);
    parte.scale.y = direcao.length();
    parte.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao.normalize());
  }
  mao.position.copy(destino);
}

function contornoArredondado(caminho, w, h, r) {
  const x = -w / 2, y = -h / 2;
  caminho.moveTo(x + r, y);
  caminho.lineTo(x + w - r, y); caminho.quadraticCurveTo(x + w, y, x + w, y + r);
  caminho.lineTo(x + w, y + h - r); caminho.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  caminho.lineTo(x + r, y + h); caminho.quadraticCurveTo(x, y + h, x, y + h - r);
  caminho.lineTo(x, y + r); caminho.quadraticCurveTo(x, y, x + r, y);
  return caminho;
}

function criarCesta(cor = 0xe50918, corBorda = 0xff2933, corAlca = 0x17191b) {
  const cesta = new THREE.Group();
  // Base menor, paredes inclinadas e duas fileiras de aberturas verticais.
  const base = contornoArredondado(new THREE.Shape(), 0.8, 0.54, 0.08);
  const fundo = objeto(new THREE.ExtrudeGeometry(base, { depth: 0.045, bevelEnabled: false, curveSegments: 3 }), cor);
  fundo.rotation.x = -Math.PI / 2; cesta.add(fundo);
  for (const [y, w, h, espessura, corAro] of [
    [0.03, 0.81, 0.55, 0.06, cor],
    [0.23, 0.88, 0.62, 0.055, cor],
    [0.44, 0.97, 0.71, 0.065, corBorda]
  ]) {
    const aro = contornoArredondado(new THREE.Shape(), w, h, 0.09);
    aro.holes.push(contornoArredondado(new THREE.Path(), w - 0.09, h - 0.09, 0.045));
    const borda = objeto(new THREE.ExtrudeGeometry(aro, { depth: espessura, bevelEnabled: false, curveSegments: 3 }), corAro, 0, y, 0);
    borda.rotation.x = -Math.PI / 2; cesta.add(borda);
  }
  for (const lado of [-1, 1]) {
    for (let i = -3; i <= 3; i++) {
      const tira = caixa(cesta, 0.065, 0.44, 0.045, cor, i * 0.125, 0.25, lado * 0.292);
      tira.rotation.x = lado * 0.16;
    }
    for (let i = -2; i <= 2; i++) {
      const tira = caixa(cesta, 0.045, 0.44, 0.065, cor, lado * 0.422, 0.25, i * 0.123);
      tira.rotation.z = -lado * 0.16;
    }
  }
  // Alça única, alta e com cantos arredondados, presa às laterais longas.
  const alca = new THREE.Shape();
  alca.moveTo(-0.35, 0.44); alca.lineTo(-0.35, 0.82);
  alca.quadraticCurveTo(-0.35, 0.92, -0.25, 0.92);
  alca.lineTo(0.25, 0.92); alca.quadraticCurveTo(0.35, 0.92, 0.35, 0.82);
  alca.lineTo(0.35, 0.44); alca.lineTo(0.285, 0.44); alca.lineTo(0.285, 0.81);
  alca.quadraticCurveTo(0.285, 0.855, 0.24, 0.855);
  alca.lineTo(-0.24, 0.855); alca.quadraticCurveTo(-0.285, 0.855, -0.285, 0.81);
  alca.lineTo(-0.285, 0.44); alca.closePath();
  const pega = objeto(new THREE.ExtrudeGeometry(alca, { depth: 0.055, bevelEnabled: false, curveSegments: 4 }), corAlca, -0.0275, 0, 0);
  pega.rotation.y = Math.PI / 2; cesta.add(pega);
  cesta.userData.alca = pega;
  cesta.userData.pega = new THREE.Vector3(0, 0.89, 0);
  return cesta;
}

function criarCaixaMadeira() {
  const caixaMadeira = new THREE.Group();
  caixa(caixaMadeira, 0.82, 0.07, 0.58, 0x8b5a32, 0, 0.04, 0);
  for (const lado of [-1, 1]) {
    for (const y of [0.14, 0.3, 0.46]) {
      caixa(caixaMadeira, 0.86, 0.1, 0.055, y === 0.3 ? 0xb57a43 : 0xa66d3b, 0, y, lado * 0.29);
    }
    caixa(caixaMadeira, 0.07, 0.52, 0.07, 0x744725, lado * 0.37, 0.27, -0.29);
    caixa(caixaMadeira, 0.07, 0.52, 0.07, 0x744725, lado * 0.37, 0.27, 0.29);
  }
  for (const x of [-0.4, 0.4]) {
    for (const y of [0.14, 0.3, 0.46]) caixa(caixaMadeira, 0.055, 0.1, 0.58, 0x9b6336, x, y, 0);
  }
  return caixaMadeira;
}

export function usarCaixaMadeira(modelo, usar) {
  const d = modelo.userData;
  if (!d.caixaMadeira) return;
  d.caixaMadeira.visible = usar;
  d.visualCestaNormal.forEach(parte => { parte.visible = !usar; });
  d.usandoCaixaMadeira = usar;
}

export function ajudanteUsaCaixaMadeira(ajudante) {
  return ajudante.inventario.some(id => PRODUTOS[id]?.origem === 'horta');
}

function aplicarPaletaCesta(cesta, paleta) {
  if (cesta.userData.paletaAplicada === paleta.id) return;
  cesta.traverse(malha => {
    if (!malha.isMesh || malha === cesta.userData.alca) return;
    if (!malha.userData.materialPersonalizado) {
      malha.material = malha.material.clone();
      malha.userData.materialPersonalizado = true;
    }
    malha.material.color.set(paleta.principal);
  });
  cesta.userData.paletaAplicada = paleta.id;
}

export function aplicarPaletaFuncionario(modelo, paleta) {
  const uniforme = modelo.userData.uniforme;
  if (!uniforme || uniforme.paletaAplicada === paleta.id) return;
  for (const [malhas, cor] of [[uniforme.camisa, paleta.principal], [uniforme.chapeu, paleta.principal]]) {
    for (const malha of malhas) {
      if (!malha.userData.materialUniforme) {
        malha.material = malha.material.clone();
        malha.userData.materialUniforme = true;
      }
      malha.material.color.set(cor);
    }
  }
  uniforme.paletaAplicada = paleta.id;
}

export function criarSacola() {
  const sacola = new THREE.Group();
  const papel = new THREE.Group(); sacola.add(papel);
  // Uma casca aberta, com cantos unidos e laterais dobradas para dentro.
  const abertura = [
    [-0.4, 0.7, -0.26], [0.4, 0.72, -0.26], [0.35, 0.68, 0],
    [0.4, 0.73, 0.26], [-0.4, 0.71, 0.26], [-0.35, 0.67, 0]
  ];
  const base = abertura.map(([x, , z]) => [x * 0.84, 0.025, z * 0.84]);
  const interior = abertura.map(([x, y, z]) => [x * 0.94, y - 0.012, z * 0.94]);
  const fundo = base.map(([x, , z]) => [x * 0.94, 0.045, z * 0.94]);
  const face = (pontos, cor) => {
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(pontos.flat(), 3));
    geometria.setIndex([0, 1, 2, 0, 2, 3]); geometria.computeVertexNormals();
    papel.add(objeto(geometria, cor));
  };
  for (let i = 0; i < abertura.length; i++) {
    const j = (i + 1) % abertura.length;
    const dobra = abertura[i].map((v, eixo) => eixo === 1 ? v - 0.045 : v);
    const proximaDobra = abertura[j].map((v, eixo) => eixo === 1 ? v - 0.045 : v);
    const cor = [0xb38350, 0x95663e, 0xa37343, 0xbd8b54, 0x98693e, 0xaa7848][i];
    face([base[i], dobra, proximaDobra, base[j]], cor);
    face([dobra, abertura[i], abertura[j], proximaDobra], 0xc99a62);
    face([fundo[j], interior[j], interior[i], fundo[i]], 0xd0a16a);
    face([abertura[i], interior[i], interior[j], abertura[j]], 0xe0b984);
  }
  caixa(papel, 0.68, 0.04, 0.44, 0xb38350, 0, 0.02, 0);
  sacola.userData.conteudo = new THREE.Group(); sacola.add(sacola.userData.conteudo);
  sacola.userData.papel = papel;
  sacola.userData.aparicao = 0;
  return sacola;
}

export function posicaoProdutoSacola(indice, quantidade = 5) {
  const layouts = {
    1: [[0, 0.45, 0]],
    2: [[-0.14, 0.49, 0], [0.14, 0.49, 0]],
    3: [[-0.14, 0.38, 0.06], [0.14, 0.38, 0.06], [0, 0.55, -0.05]],
    4: [[-0.14, 0.4, 0.07], [0.14, 0.4, 0.07], [-0.14, 0.59, -0.06], [0.14, 0.59, -0.06]],
    5: [[-0.2, 0.43, 0.07], [0, 0.43, 0.07], [0.2, 0.43, 0.07], [-0.11, 0.63, -0.07], [0.11, 0.63, -0.07]]
  };
  const layout = layouts[Math.max(1, Math.min(5, quantidade))];
  return new THREE.Vector3(...(layout[indice] ?? layout.at(-1)));
}

export function ajustarSacola(sacola, quantidade, preenchimento = 1) {
  const total = Math.max(1, Math.min(5, quantidade));
  const cheio = (total - 1) / 4;
  const entrada = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(preenchimento, 0, 1), 0, 1);
  sacola.userData.papel.scale.set(
    (0.88 + cheio * 0.12) * (0.94 + entrada * 0.06),
    (0.8 + cheio * 0.23) * (0.82 + entrada * 0.18),
    (0.9 + cheio * 0.1) * (0.94 + entrada * 0.06)
  );
}

function cabeloCliente(corpo, visual) {
  const cor = visual.corCabelo;
  if (visual.cabelo === 'raspado') {
    esfera(corpo, 0.285, cor, 0, 1.28, -0.035, 1, 0.34, 0.95);
    return;
  }
  esfera(corpo, 0.285, cor, 0, 1.34, -0.04, 1, visual.genero === 'mulher' ? 0.6 : 0.48, 0.97);
  if (visual.genero === 'mulher') {
    if (visual.cabelo === 'chanel') {
      esfera(corpo, 0.24, cor, 0, 1.17, -0.14, 1.08, 1.2, 0.72);
    } else if (visual.cabelo === 'ondas') {
      esfera(corpo, 0.23, cor, 0, 1.13, -0.16, 1.08, 1.4, 0.65);
      for (const [x, y] of [[-0.18, 1.03], [-0.09, 0.98], [0, 1.02], [0.09, 0.98], [0.18, 1.03]]) {
        esfera(corpo, 0.1, cor, x, y, -0.17);
      }
    } else if (visual.cabelo === 'afro_longo') {
      esfera(corpo, 0.3, cor, 0, 1.31, -0.12, 1.22, 1.3, 0.98);
      for (const [x, y, z] of [[-0.21, 1.48, -0.05], [0, 1.57, -0.08], [0.21, 1.48, -0.05], [0, 1.36, -0.3]]) {
        esfera(corpo, 0.16, cor, x, y, z);
      }
    } else if (visual.cabelo === 'afro_curto_feminino' || visual.cabelo === 'afro_alto_feminino') {
      const alto = visual.cabelo === 'afro_alto_feminino';
      for (const [x, y, z] of [[-0.2, 1.42, 0], [0, 1.5, 0.04], [0.2, 1.42, 0], [-0.22, 1.29, -0.12], [0.22, 1.29, -0.12], [0, 1.42, -0.22]]) {
        esfera(corpo, alto ? 0.145 : 0.12, cor, x, y + (alto ? 0.07 : 0), z);
      }
    } else if (visual.cabelo === 'coque') {
      esfera(corpo, 0.18, cor, 0, 1.51, -0.16);
    } else if (visual.cabelo === 'coque_afro') {
      esfera(corpo, 0.24, cor, 0, 1.55, -0.13);
      for (const [x, y] of [[-0.12, 1.58], [0.12, 1.58], [0, 1.7]]) esfera(corpo, 0.13, cor, x, y, -0.13);
    } else if (visual.cabelo === 'liso') {
      esfera(corpo, 0.25, cor, 0, 1.12, -0.16, 1.06, 1.48, 0.62);
    } else if (visual.cabelo === 'rabo') {
      for (let i = 0; i < 4; i++) esfera(corpo, 0.11, cor, 0, 1.34 - i * 0.12, -0.29);
      esfera(corpo, 0.055, 0xe5b85e, 0, 1.36, -0.29);
    }
  } else {
    if (visual.cabelo === 'curto') {
      esfera(corpo, 0.16, cor, -0.11, 1.41, 0.12, 1, 0.45, 0.75);
    } else if (visual.cabelo === 'afro_curto' || visual.cabelo === 'afro_alto' || visual.cabelo === 'cacheado') {
      const volume = visual.cabelo === 'cacheado' ? 0.09 : visual.cabelo === 'afro_alto' ? 0.145 : 0.115;
      const altura = visual.cabelo === 'afro_alto' ? 0.08 : 0;
      for (const [x, y, z] of [[-0.17, 1.43, 0.05], [0, 1.48, 0.1], [0.17, 1.43, 0.05], [-0.19, 1.33, -0.12], [0.19, 1.33, -0.12]]) {
        esfera(corpo, volume, cor, x, y + altura, z);
      }
    } else if (visual.cabelo === 'degrade') {
      caixa(corpo, 0.32, 0.07, 0.3, cor, 0, 1.47, 0.04);
    } else if (visual.cabelo === 'topete') {
      esfera(corpo, 0.19, cor, 0, 1.48, 0.12, 1.15, 0.5, 0.8);
    }
  }
}

function detalhesCliente(corpo, visual, frenteRosto = 0.255) {
  const tecido = visual.corRoupa;
  const detalhe = 0xf7e9d0;
  const largura = visual.porte === 'corpulento' ? 1.55 : 1;
  if (visual.roupa === 'camisa') {
    caixa(corpo, 0.12, 0.035, 0.025, detalhe, 0, 0.96, 0.25);
    caixa(corpo, 0.035, 0.32, 0.025, detalhe, 0, 0.76, 0.255);
    for (const y of [0.85, 0.73, 0.61]) esfera(corpo, 0.018, 0x374449, 0, y, 0.28);
  } else if (visual.roupa === 'jaqueta') {
    caixa(corpo, 0.035, 0.38, 0.025, detalhe, 0, 0.72, 0.27);
    for (const lado of [-1, 1]) caixa(corpo, 0.1, 0.05, 0.03, 0x374449, lado * 0.15, 0.73, 0.27);
    caixa(corpo, 0.38 * largura, 0.06, 0.23, 0x374449, 0, 0.52, 0);
  } else if (visual.roupa === 'vestido') {
    cilindro(corpo, 0.23 * largura, 0.35 * largura, 0.36, tecido, 0, 0.51, 0, 12);
    caixa(corpo, 0.45 * largura, 0.055, 0.31, detalhe, 0, 0.69, 0);
  } else if (visual.roupa === 'blusa_saia') {
    cilindro(corpo, 0.22 * largura, 0.37 * largura, 0.28, visual.corCalca, 0, 0.46, 0, 12);
    caixa(corpo, 0.42 * largura, 0.05, 0.31, detalhe, 0, 0.66, 0);
    caixa(corpo, 0.2, 0.055, 0.025, detalhe, 0, 0.93, 0.25);
  }
  if (visual.oculos) {
    const armacao = visual.oculos === 'sol' ? 0x242a30 : 0xc7ae79;
    for (const lado of [-1, 1]) {
      const aro = objeto(new THREE.TorusGeometry(0.069, 0.012, 5, 12), armacao, lado * 0.095, 1.19, frenteRosto + 0.013);
      corpo.add(aro);
      if (visual.oculos === 'sol') esfera(corpo, 0.062, 0x3d4c52, lado * 0.095, 1.19, frenteRosto + 0.012, 1, 0.7, 0.12);
    }
    caixa(corpo, 0.055, 0.016, 0.02, armacao, 0, 1.2, frenteRosto + 0.012);
  }
  if (visual.acessorio === 'brincos') {
    for (const lado of [-1, 1]) esfera(corpo, 0.04, 0xe9bd69, lado * 0.275, 1.05, 0.01);
  } else if (visual.acessorio === 'lenco') {
    cilindro(corpo, 0.185, 0.205, 0.075, 0xeac77b, 0, 1.015, 0);
    caixa(corpo, 0.075, 0.2, 0.04, 0xeac77b, 0.13, 0.9, 0.19);
  } else if (visual.acessorio === 'colar') {
    esfera(corpo, 0.045, 0xe9bd69, 0, 0.97, 0.24);
  } else if (visual.acessorio === 'gravata') {
    caixa(corpo, 0.065, 0.2, 0.03, 0x9b4045, 0, 0.86, 0.27);
  } else if (visual.acessorio === 'bolso') {
    caixa(corpo, 0.12, 0.08, 0.025, detalhe, -0.12, 0.78, 0.26);
  }
}

export function personagem(cor, pele = 0xf2c49c, jogador = false, coresCesta = [], visual = null, funcao = null) {
  const g = new THREE.Group();
  const corpo = new THREE.Group(); g.add(corpo);
  const corpulento = visual?.porte === 'corpulento';
  const funcionario = funcao === 'caixa' || funcao === 'ajudante';
  const uniformizado = jogador || funcionario;
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.38, 20), new THREE.MeshBasicMaterial({ color: 0x204c31, transparent: true, opacity: 0.13, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.014; sombra.scale.setScalar(corpulento ? 1.5 : 1); g.add(sombra);
  const corCalca = uniformizado ? 0x17191b : visual?.genero === 'mulher' ? pele : (visual?.corCalca ?? 0x344b58);
  const corSapato = uniformizado ? 0x242628 : (visual?.corSapato ?? 0xf8f0dc);
  const afastamentoPernas = corpulento ? 0.24 : 0.15;
  const larguraPerna = corpulento ? 0.27 : 0.19;
  const pernaE = caixa(corpo, larguraPerna, 0.36, 0.22, corCalca, -afastamentoPernas, 0.28, 0);
  const pernaD = caixa(corpo, larguraPerna, 0.36, 0.22, corCalca, afastamentoPernas, 0.28, 0);
  const peE = caixa(corpo, 0.22, 0.12, 0.32, corSapato, -afastamentoPernas, 0.09, 0.06);
  const peD = caixa(corpo, 0.22, 0.12, 0.32, corSapato, afastamentoPernas, 0.09, 0.06);
  const coxas = [-afastamentoPernas, afastamentoPernas].map(x => caixa(corpo, larguraPerna, 0.19, 0.34, corCalca, x, 0.43, 0.13));
  coxas.forEach(coxa => { coxa.visible = false; });
  const torso = objeto(new THREE.CapsuleGeometry(0.24, 0.22, 3, 8), cor, 0, 0.73, 0);
  torso.scale.x = corpulento ? (visual.genero === 'mulher' ? 2.25 : 2.35) : (visual?.genero === 'mulher' ? 1.03 : 1.13);
  torso.scale.z = corpulento ? 1.55 : 1;
  corpo.add(torso);
  const barriga = corpulento ? esfera(corpo, 0.37, cor, 0, 0.66, 0.09, 1.55, 1.08, 1.35) : null;
  const ombro = corpulento ? 0.59 : 0.34;
  const bracoE = braco(cor, pele, -ombro);
  const bracoD = braco(cor, pele, ombro);
  corpo.add(bracoE, bracoD);
  esfera(corpo, 0.28, pele, 0, 1.16, 0, corpulento ? 1.22 : 1, 1.05, corpulento ? 1.08 : 0.92);
  if (visual) cabeloCliente(corpo, visual);
  else esfera(corpo, 0.285, 0x49362d, 0, 1.29, -0.04, 1, 0.64, 0.95);
  const chapeu = [];
  if (uniformizado) {
    chapeu.push(cilindro(corpo, 0.22, 0.26, 0.2, cor, 0, 1.48, -0.01));
    chapeu.push(caixa(corpo, 0.52, 0.045, 0.34, cor, 0, 1.4, 0.08));
  }
  const frenteRosto = corpulento ? 0.3 : 0.255;
  esfera(corpo, 0.025, 0x3e352c, -0.09, 1.17, frenteRosto);
  esfera(corpo, 0.025, 0x3e352c, 0.09, 1.17, frenteRosto);
  if (visual?.barba) {
    const corBarba = visual.corCabelo;
    const cheia = visual.barba === 'cheia';
    if (visual.barba !== 'cavanhaque') {
      esfera(corpo, cheia ? 0.19 : 0.16, corBarba, 0, 1.055, frenteRosto - 0.002, 1.35, cheia ? 0.58 : 0.38, 0.13);
    }
    esfera(corpo, visual.barba === 'cavanhaque' ? 0.085 : 0.07, corBarba, 0, 1.005, frenteRosto + 0.008, 0.72, 1, 0.14);
  }
  if (visual?.idoso) {
    const corLinha = new THREE.Color(pele).multiplyScalar(0.7).getHex();
    for (const lado of [-1, 1]) {
      caixa(corpo, 0.07, 0.014, 0.016, visual.corCabelo, lado * 0.09, 1.25, 0.242);
      caixa(corpo, 0.045, 0.008, 0.012, corLinha, lado * 0.215, 1.13, 0.15);
    }
  }
  if (visual) detalhesCliente(corpo, visual, frenteRosto);
  const cesta = jogador ? new THREE.Group() : criarCesta(...coresCesta);
  cesta.position.set(0, jogador ? 0.42 : corpulento ? 0.2 : 0.26, jogador ? 0.5 : corpulento ? 0.72 : 0.58); corpo.add(cesta);
  cesta.userData.pega ??= new THREE.Vector3(0, 0.89, 0);
  const visualCestaNormal = [...cesta.children];
  const caixaMadeira = funcao === 'ajudante' ? criarCaixaMadeira() : null;
  if (caixaMadeira) { caixaMadeira.visible = false; cesta.add(caixaMadeira); }
  const carga = new THREE.Group(); cesta.add(carga);
  const produtoNaMao = new THREE.Group(); corpo.add(produtoNaMao);
  const uniforme = uniformizado ? { camisa: [torso, bracoE.userData.superior, bracoD.userData.superior, ...(barriga ? [barriga] : [])], chapeu, paletaAplicada: null } : null;
  g.userData = { corpo, torso, barriga, corpulento, pernaE, pernaD, peE, peD, coxas, bracoE, bracoD, cesta, visualCestaNormal, caixaMadeira, usandoCaixaMadeira: false, carga, produtoNaMao, inventario: null, coleta: null, sentar: 0, jogador, funcao, uniforme };
  posicionarBraco(bracoE, cesta.userData.pega.clone().add(cesta.position));
  posicionarBraco(bracoD, new THREE.Vector3(0.4, 0.65, 0.32));
  return g;
}

export class Cena {
  constructor(container, simulacao) {
    this.sim = simulacao; this.container = container;
    this.tempoVisual = 0;
    this.cena = new THREE.Scene(); this.cena.background = new THREE.Color(0x78c85a);
    this.camera = new THREE.OrthographicCamera(-18, 18, 12, -12, 0.1, 100);
    const superficie = document.createElement('canvas');
    const contexto = superficie.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer = contexto
      ? new THREE.WebGLRenderer({ canvas: superficie, context: contexto, antialias: true, alpha: false })
      : new RenderizadorCompativel();
    this.modoCompativel = !contexto;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.5;
    this.renderer.domElement.setAttribute('aria-label', 'Mercadinho em 3D. Arraste para andar ou use as setas e as teclas W, A, S e D.');
    container.prepend(this.renderer.domElement);
    this.cena.add(new THREE.HemisphereLight(0xfff4dc, 0x70a85d, 2.55));
    const sol = new THREE.DirectionalLight(0xffebc9, 2.8); sol.position.set(-8, 22, 13); sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024); sol.shadow.camera.left = -18; sol.shadow.camera.right = 18;
    sol.shadow.camera.top = 18; sol.shadow.camera.bottom = -18; sol.shadow.normalBias = 0.035; sol.shadow.bias = -0.0002;
    this.cena.add(sol);
    this.alvoCamera = new THREE.Vector3(-0.5, 0, 0.8);
    this.construirMundo();
    this.aberturaLojaVisual = 0;
    this.sacolaEmbalagem = criarSacola(); this.sacolaEmbalagem.position.copy(pontoNoBalcao(-0.35, 1.31, -0.72)); this.sacolaEmbalagem.rotation.y = Math.PI / 2; this.sacolaEmbalagem.visible = false; this.cena.add(this.sacolaEmbalagem);
    this.itensEmbalagem = new THREE.Group(); this.cena.add(this.itensEmbalagem); this.clienteEmbalandoId = null;
    this.jogador = personagem(0xf8ecd1, 0xe9b489, true); this.cena.add(this.jogador);
    this.clientes = new Map(); this.labels = []; this.alvosHorta = []; this.efeitosCrescimento = [];
    this.raycaster = new THREE.Raycaster(); this.ponteiroRaycast = new THREE.Vector2();
    this.produtos = {};
    for (const [id, p] of Object.entries(PRODUTOS)) this.construirEstacao(id, p);
    this.caixeiro = personagem(0x428b88, 0x9b6848, false, [], null, 'caixa'); this.caixeiro.position.set(CONFIG.cadeiraCaixa.x, 0.23, CONFIG.cadeiraCaixa.z); this.caixeiro.rotation.y = CONFIG.anguloCaixa; this.cena.add(this.caixeiro);
    this.caixeiro.userData.cesta.visible = false;
    posicionarBraco(this.caixeiro.userData.bracoE, new THREE.Vector3(-0.34, 0.45, 0));
    posicionarBraco(this.caixeiro.userData.bracoD, new THREE.Vector3(0.34, 0.45, 0));
    this.ajudante = personagem(0xf2b349, 0xdba271, false, [0x858b91, 0xaeb4ba], null, 'ajudante'); this.cena.add(this.ajudante);
    this.redimensionar(); window.addEventListener('resize', () => this.redimensionar());
  }
  construirMundo() {
    const suporte = new THREE.Group(); suporte.position.set(CONFIG.balcao.x, 0, CONFIG.balcao.z); suporte.rotation.y = Math.PI / 2; this.cena.add(suporte);
    const c = new THREE.Group(); c.position.set(-5.5, 0, -4.1); suporte.add(c);
    this.bairro = construirBairro(this.cena, { caixa, cilindro, esfera, placa });
    this.bairro.aplicar(this.sim.estado.personalizacao);
    const suporteCestas = new THREE.Group();
    suporteCestas.position.set(CONFIG.cestas.x, 0, CONFIG.cestas.z); this.cena.add(suporteCestas);
    caixa(suporteCestas, 0.78, 0.08, 1.12, 0x545c5b, 0, 0.27, 0);
    for (const z of [-0.48, 0.48]) {
      caixa(suporteCestas, 0.08, 0.52, 0.08, 0x545c5b, -0.33, 0.28, z);
      caixa(suporteCestas, 0.08, 0.52, 0.08, 0x545c5b, 0.33, 0.28, z);
    }
    this.cestasEntrada = Array.from({ length: CONFIG.quantidadeCestas }, (_, i) => {
      const cesta = criarCesta(0x1d654b, 0x3d8a65, 0x254233);
      cesta.position.set(0, 0.31 + i * 0.055, (i - 2) * 0.075);
      cesta.scale.setScalar(0.78); suporteCestas.add(cesta); return cesta;
    });
    // Caixa e esteira, com produtos e recibo visíveis de perto.
    caixa(c, 1.35, 0.95, 2.7, 0x747b80, 5.5, 0.65, 4.1);
    caixa(c, 1.53, 0.17, 2.9, 0xc9cdcf, 5.5, 1.2, 4.1);
    caixa(c, 1.0, 0.025, 1.5, 0x454b4f, 5.5, 1.31, 4.5);
    // Computador do caixa: base, coluna, monitor e tela.
    caixa(c, 0.62, 0.13, 0.48, 0x4b5155, 5.12, 1.38, 4.1);
    caixa(c, 0.1, 0.18, 0.1, 0x5b6267, 5.12, 1.52, 4.1);
    const monitor = caixa(c, 0.68, 0.58, 0.12, 0x555c61, 5.12, 1.72, 4.1); monitor.rotation.x = -0.25; monitor.rotation.y = -Math.PI / 2;
    const tela = caixa(c, 0.56, 0.44, 0.02, 0x94aeb5, 5.05, 1.73, 4.1); tela.rotation.y = -Math.PI / 2;
    // Teclado compacto na frente do monitor.
    const teclado = caixa(c, 0.52, 0.035, 0.2, 0x555c61, 4.83, 1.315, 4.1); teclado.rotation.y = Math.PI / 2;
    for (let linha = 0; linha < 2; linha++) for (let tecla = 0; tecla < 6; tecla++) {
      const teclaMesh = caixa(c, 0.045, 0.012, 0.035, 0xaeb4b7, 4.78 + linha * 0.07, 1.339, 3.89 + tecla * 0.084); teclaMesh.rotation.y = Math.PI / 2;
    }
    // Leitor de código de barras com janela vermelha.
    caixa(c, 0.3, 0.065, 0.24, 0x555c61, 5.05, 1.34, 4.0);
    caixa(c, 0.2, 0.012, 0.11, 0xe86b55, 5.05, 1.379, 4.0);
    // Maquininha de cartão com tela e teclas.
    caixa(c, 0.27, 0.09, 0.3, 0x344b58, 5.96, 1.36, 3.75);
    caixa(c, 0.19, 0.018, 0.1, 0x9eacb0, 5.96, 1.414, 3.68);
    for (let linha = 0; linha < 2; linha++) for (let tecla = 0; tecla < 3; tecla++) {
      caixa(c, 0.035, 0.012, 0.03, 0xe8d9b6, 5.91 + tecla * 0.05, 1.414, 3.75 + linha * 0.045);
    }
    // Impressora de recibos e papel saindo pela abertura.
    caixa(c, 0.38, 0.19, 0.32, 0x52616b, 5.85, 1.38, 3.03);
    caixa(c, 0.24, 0.012, 0.035, 0x263b37, 5.85, 1.482, 3.03);
    caixa(c, 0.16, 0.012, 0.2, 0xffffff, 5.85, 1.49, 2.91);
    // Gaveta de dinheiro na face voltada para o caixa.
    caixa(c, 0.45, 0.16, 0.62, 0x555c61, 4.94, 1.04, 4.95);
    caixa(c, 0.025, 0.1, 0.56, 0x52616b, 4.70, 1.07, 4.95);
    caixa(c, 0.03, 0.025, 0.13, 0xaeb4b7, 4.68, 1.08, 4.95);
    // Papel extra e pequeno suporte para sacolas.
    caixa(c, 0.17, 0.018, 0.36, 0xffffff, 5.12, 1.3, 3.48);
    caixa(c, 0.09, 0.018, 0.14, 0xd9d2b9, 5.5, 1.3, 3.98);
    const cadeira = new THREE.Group();
    cadeira.position.set(CONFIG.cadeiraCaixa.x, 0.23, CONFIG.cadeiraCaixa.z);
    cadeira.rotation.y = CONFIG.anguloCaixa; this.cena.add(cadeira);
    // Base giratória de cinco raios, com rodízios e coluna central.
    for (let i = 0; i < 5; i++) {
      const raio = new THREE.Group(); raio.rotation.y = i * Math.PI * 2 / 5; cadeira.add(raio);
      caixa(raio, 0.11, 0.07, 0.47, 0x52616b, 0, 0.12, 0.2);
      const roda = cilindro(raio, 0.08, 0.08, 0.075, 0x353e45, 0, 0.08, 0.41);
      roda.rotation.z = Math.PI / 2;
      const eixo = cilindro(raio, 0.047, 0.047, 0.08, 0x74818b, 0, 0.08, 0.41);
      eixo.rotation.z = Math.PI / 2;
    }
    cilindro(cadeira, 0.09, 0.1, 0.26, 0x3c464e, 0, 0.24, 0);
    cilindro(cadeira, 0.065, 0.065, 0.18, 0x74818b, 0, 0.4, 0);
    const assento = objeto(new THREE.ExtrudeGeometry(
      contornoArredondado(new THREE.Shape(), 0.72, 0.68, 0.14),
      { depth: 0.1, bevelEnabled: false, curveSegments: 5 }
    ), 0x63717e, 0, 0.48, 0);
    assento.rotation.x = -Math.PI / 2; cadeira.add(assento);
    caixa(cadeira, 0.1, 0.36, 0.08, 0x3c464e, 0, 0.6, -0.28);
    const encosto = objeto(new THREE.ExtrudeGeometry(
      contornoArredondado(new THREE.Shape(), 0.64, 0.98, 0.28),
      { depth: 0.1, bevelEnabled: false, curveSegments: 6 }
    ), 0x3c464e, 0, 1.04, -0.36);
    cadeira.add(encosto);
    // Apoios tubulares lavanda, com curvas suaves como na referência.
    for (const x of [-0.36, 0.36]) {
      const curva = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 0.55, -0.23), new THREE.Vector3(x, 0.82, -0.23),
        new THREE.Vector3(x, 0.84, -0.15), new THREE.Vector3(x, 0.84, 0.16),
        new THREE.Vector3(x, 0.78, 0.25), new THREE.Vector3(x, 0.55, 0.25)
      ]);
      cadeira.add(objeto(new THREE.TubeGeometry(curva, 16, 0.026, 6, false), 0xb2acf0));
    }
  }
  construirEstacao(id, p) {
    const grupo = new THREE.Group(); this.cena.add(grupo);
    const h = p.horta;
    caixa(grupo, 2.5, 0.35, 3.6, 0xbd7545, h.x, 0.22, h.z);
    caixa(grupo, 2.23, 0.05, 3.32, 0x70401f, h.x, 0.42, h.z);
    const alvoHorta = caixa(grupo, 2.5, 1.5, 3.6, 0xffffff, h.x, 0.9, h.z);
    alvoHorta.material.transparent = true; alvoHorta.material.opacity = 0; alvoHorta.material.depthWrite = false;
    alvoHorta.userData.produtoHorta = id; this.alvosHorta.push(alvoHorta);
    const frutos = [];
    for (let i = 0; i < 8; i++) {
      const x = h.x - 0.65 + i % 2 * 1.25, z = h.z - 1.18 + Math.floor(i / 2) * 0.78;
      cilindro(grupo, 0.035, 0.035, 0.6, 0x35a84a, x, 0.72, z, 6);
      const f1 = esfera(grupo, 0.22, 0x65c158, x - 0.12, 0.67, z, 1.5, 0.35, 0.8); f1.rotation.z = -0.25;
      const f2 = esfera(grupo, 0.22, 0x3cad4b, x + 0.12, 0.83, z, 1.5, 0.35, 0.8); f2.rotation.z = 0.3;
      const fruto = criarProduto(id, 1.6); fruto.position.set(x, 1, z); grupo.add(fruto); frutos.push(fruto);
    }
    const s = p.prateleira;
    caixa(grupo, 2.3, 0.65, 1.65, 0xd98b43, s.x, 0.53, s.z);
    caixa(grupo, 2.45, 0.13, 1.8, 0xffc96f, s.x, 0.91, s.z);
    caixa(grupo, 2.42, 0.23, 0.14, 0xb96a32, s.x, 1.07, s.z + 0.8);
    caixa(grupo, 2.42, 0.23, 0.14, 0xb96a32, s.x, 1.07, s.z - 0.8);
    for (const x of [-1.15, 1.15]) caixa(grupo, 0.14, 0.23, 1.65, 0xb96a32, s.x + x, 1.07, s.z);
    const frutas = [];
    for (let i = 0; i < 12; i++) {
      const f = criarProduto(id, 1.7); f.position.set(s.x - 0.83 + i % 4 * 0.56, 1.11, s.z - 0.5 + Math.floor(i / 4) * 0.49); grupo.add(f); frutas.push(f);
    }
    const preco = placa(`R$ ${p.preco}`, '#fff5d8', '#2d6243', 0.85, 0.32); preco.position.set(s.x, 0.6, s.z + 0.835); grupo.add(preco);
    const bloqueio = new THREE.Group(); this.cena.add(bloqueio);
    caixa(bloqueio, 2.55, 0.03, 3.65, 0x70b74b, h.x, 0.065, h.z);
    for (const d of [-1,1]) {
      caixa(bloqueio, 2.55, 0.035, 0.055, 0xb8df65, h.x, 0.09, h.z + d * 1.8);
      caixa(bloqueio, 0.055, 0.035, 3.65, 0xb8df65, h.x + d * 1.26, 0.09, h.z);
    }
    this.produtos[id] = { grupo, bloqueio, frutos, frutas };
    this.criarLabel(`horta-${id}`, { ...p.horta, y: 1.6 }, p.plural.toLocaleUpperCase('pt-BR'), 'Pronto para colher', id);
    this.criarLabel(`loja-${id}`, { ...p.prateleira, y: 1.7 }, p.nome.toLocaleUpperCase('pt-BR'), '0 / 12', 'loja');
  }
  criarLabel(id, ponto, titulo, detalhe, classe) {
    const el = document.createElement('div'); el.className = `etiqueta etiqueta-${classe}`;
    el.hidden = true;
    el.innerHTML = `<b>${titulo}</b><span>${detalhe}</span>`;
    document.getElementById('etiquetas').append(el);
    this.labels.push({ id, el, ponto });
  }
  redimensionar() {
    this.w = this.container.clientWidth; this.h = this.container.clientHeight;
    const proporcao = this.w / this.h;
    this.mobile = proporcao < 0.92;
    const altura = this.mobile ? 18.8 : Math.max(25, 37 / proporcao);
    this.camera.left = -altura * proporcao / 2; this.camera.right = altura * proporcao / 2;
    this.camera.top = altura / 2; this.camera.bottom = -altura / 2; this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.w, this.h);
  }
  projetar(ponto) {
    const p = new THREE.Vector3(ponto.x, ponto.y ?? 1.5, ponto.z).project(this.camera);
    return { x: (p.x + 1) * this.w / 2, y: (1 - p.y) * this.h / 2 };
  }
  selecionarHorta(clientX, clientY) {
    const retangulo = this.renderer.domElement.getBoundingClientRect();
    this.ponteiroRaycast.set(
      ((clientX - retangulo.left) / retangulo.width) * 2 - 1,
      -((clientY - retangulo.top) / retangulo.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.ponteiroRaycast, this.camera);
    return this.raycaster.intersectObjects(this.alvosHorta, false)[0]?.object.userData.produtoHorta ?? null;
  }
  animarMelhoriaHorta(id) {
    const horta = PRODUTOS[id]?.horta;
    if (!horta) return;
    const grupo = new THREE.Group(); grupo.position.set(horta.x, 0.48, horta.z); this.cena.add(grupo);
    const material = new THREE.MeshBasicMaterial({ color: 0xf4d35e, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const anel = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.82, 32), material); anel.rotation.x = -Math.PI / 2; grupo.add(anel);
    const particulas = Array.from({ length: 14 }, (_, i) => {
      const particula = esfera(grupo, 0.07, i % 2 ? 0x7fbd55 : 0xf4d35e);
      particula.userData.angulo = i / 14 * Math.PI * 2;
      return particula;
    });
    this.efeitosCrescimento.push({ grupo, anel, particulas, inicio: this.tempoVisual, duracao: 1.8 });
  }
  animarPersonagem(modelo, ator, dt, tempo, inventario = [], origem = 'horta', duracao = 0.26) {
    modelo.position.set(ator.x, 0.23, ator.z);
    const d = modelo.userData;
    const evento = this.sim?.reposicoes.get(ator);
    if (evento && evento !== d.ultimaReposicao) {
      d.ultimaReposicao = evento;
      const inicio = d.carga.children[evento.indice]?.position.clone() ?? new THREE.Vector3(0, 0.13, 0);
      d.reposicao = { ...evento, inicio: inicio.add(d.cesta.position), decorrido: 0, duracao: Math.min(duracao, 0.36) };
      d.coleta = null;
      liberarGeometrias(d.produtoNaMao);
      d.produtoNaMao.add(criarProduto(evento.id, 0.75));
    }
    if (d.inventario?.join(',') !== inventario.join(',')) {
      const anteriores = [...(d.inventario ?? [])];
      const novos = [];
      inventario.forEach((id, indice) => {
        const encontrado = anteriores.indexOf(id);
        if (encontrado >= 0) anteriores.splice(encontrado, 1);
        else novos.push({ id, indice });
      });
      // Ao carregar um jogo, os produtos já estão guardados na cesta.
      if (d.inventario !== null && novos.length) {
        d.reposicao = null;
        const { id, indice } = novos[novos.length - 1];
        d.coleta = { decorrido: 0, duracao, indice, fonte: PRODUTOS[id][origem] };
        liberarGeometrias(d.produtoNaMao);
        d.produtoNaMao.add(criarProduto(id, 0.75));
      } else d.coleta = null;
      liberarGeometrias(d.carga);
      inventario.forEach((id, i) => {
        const fruta = criarProduto(id, 0.75);
        if (d.jogador) fruta.position.set(i % 2 ? 0.14 : -0.14, 0.16 + Math.floor(i / 2) * 0.18, 0.08);
        else fruta.position.set((i % 3 - 1) * 0.25, 0.13 + Math.floor(i / 9) * 0.18, (Math.floor(i / 3) % 3 - 1) * 0.17);
        d.carga.add(fruta);
      });
      d.inventario = [...inventario];
    }
    const coleta = d.coleta;
    const reposicao = d.reposicao;
    const fonte = reposicao ? PRODUTOS[reposicao.id].prateleira : coleta?.fonte;
    const alvo = fonte && !ator.andando
      ? Math.atan2(fonte.x - ator.x, fonte.z - ator.z)
      : ator.angulo ?? Math.PI / 4;
    const delta = Math.atan2(Math.sin(alvo - modelo.rotation.y), Math.cos(alvo - modelo.rotation.y));
    modelo.rotation.y += delta * Math.min(1, dt * 12);
    const balanco = ator.andando ? Math.sin(tempo * 13) : 0;
    const dtPose = ator.sentadoEscritorio && dt === 0 ? 1 / 60 : dt;
    d.sentar = THREE.MathUtils.clamp(d.sentar + (ator.sentado ? 1 : -1) * dtPose * 3, 0, 1);
    const sentado = d.sentar * d.sentar * (3 - 2 * d.sentar);
    d.corpo.position.y = (ator.andando ? Math.abs(balanco) * 0.05 : Math.sin(tempo * 2) * 0.012) * (1 - sentado) + 0.08 * sentado;
    d.pernaE.rotation.x = balanco * 0.55 * (1 - sentado); d.pernaD.rotation.x = -balanco * 0.55 * (1 - sentado);
    for (const perna of [d.pernaE, d.pernaD]) {
      perna.position.y = 0.28 - 0.05 * sentado; perna.position.z = 0.3 * sentado;
    }
    for (const pe of [d.peE, d.peD]) { pe.position.y = 0.09 - 0.06 * sentado; pe.position.z = 0.06 + 0.3 * sentado; }
    d.coxas.forEach(coxa => { coxa.visible = sentado > 0; coxa.scale.z = sentado; });
    if (d.jogador) d.cesta.position.set(0, 0.42, 0.5);
    else {
      const posicaoCarregada = new THREE.Vector3(0, d.corpulento ? 0.2 : 0.26, d.corpulento ? 0.72 : 0.58)
        .lerp(new THREE.Vector3(-1, -d.corpo.position.y, 0), sentado);
      if (ator.acaoCesta) {
        const t = THREE.MathUtils.smoothstep(ator.progressoCesta ?? 0, 0, 1);
        const posicaoSuporte = new THREE.Vector3(0, 0.31 - d.corpo.position.y, 1.05);
        d.cesta.position.copy(posicaoSuporte).lerp(posicaoCarregada, t);
        d.cesta.position.y += Math.sin(t * Math.PI) * 0.13;
        d.cesta.rotation.z = Math.sin(t * Math.PI) * -0.12;
      } else {
        d.cesta.position.copy(posicaoCarregada);
        d.cesta.rotation.z = 0;
      }
    }
    const repouso = d.usandoCaixaMadeira
      ? new THREE.Vector3(0.43, d.cesta.position.y + 0.32, d.cesta.position.z)
      : new THREE.Vector3(0.4, 0.65, 0.32);
    const mao = repouso.clone();
    d.produtoNaMao.visible = false;
    d.carga.children.forEach(f => { f.visible = true; });
    if (coleta) {
      coleta.decorrido += dt;
      const t = Math.min(1, coleta.decorrido / coleta.duracao);
      const alcance = new THREE.Vector3(0.34, 1.03, 0.98);
      const fruta = d.carga.children[coleta.indice];
      const destino = fruta.position.clone().add(d.cesta.position);
      const suave = v => v * v * (3 - 2 * v);
      if (t < 0.28) mao.lerp(alcance, suave(t / 0.28));
      else if (t < 0.85) {
        const p = (t - 0.28) / 0.57;
        mao.copy(alcance).lerp(destino, suave(p));
        mao.y += Math.sin(p * Math.PI) * 0.4;
      } else mao.copy(destino).lerp(repouso, suave((t - 0.85) / 0.15));
      fruta.visible = t >= 0.85;
      d.produtoNaMao.visible = t >= 0.28 && t < 0.85;
      d.produtoNaMao.position.copy(mao);
      if (t >= 1) d.coleta = null;
    }
    if (reposicao) {
      reposicao.decorrido += dt;
      const t = Math.min(1, reposicao.decorrido / reposicao.duracao);
      const p = PRODUTOS[reposicao.id].prateleira, i = reposicao.lugar;
      // O destino usa exatamente a posição do produto desenhado na prateleira.
      d.corpo.updateWorldMatrix(true, false);
      const destino = d.corpo.worldToLocal(new THREE.Vector3(p.x - 0.83 + i % 4 * 0.56, 1.11, p.z - 0.5 + Math.floor(i / 4) * 0.49));
      const suave = v => v * v * (3 - 2 * v);
      if (t < 0.22) mao.lerp(reposicao.inicio, suave(t / 0.22));
      else if (t < 0.85) {
        const progresso = (t - 0.22) / 0.63;
        mao.copy(reposicao.inicio).lerp(destino, suave(progresso));
        mao.y += Math.sin(progresso * Math.PI) * 0.55;
      } else mao.copy(destino).lerp(repouso, suave((t - 0.85) / 0.15));
      d.produtoNaMao.visible = t < 0.85;
      d.produtoNaMao.position.copy(t < 0.22 ? reposicao.inicio : mao);
      d.produtoNaMao.children[0].scale.setScalar(0.75 + 0.95 * suave(Math.max(0, Math.min(1, (t - 0.22) / 0.63))));
      if (t >= 1) d.reposicao = null;
    }
    const semCarga = !coleta && !reposicao && inventario.length === 0 && (
      d.jogador || d.funcao === 'caixa' || (ator.temCesta === false && !ator.levaSacolas)
      || d.funcao === 'ajudante'
    );
    if (semCarga) {
      const oscilacaoBraco = balanco * 0.16;
      const maoLivreE = new THREE.Vector3(d.bracoE.userData.ombro.x, 0.46, oscilacaoBraco);
      const maoLivreD = new THREE.Vector3(d.bracoD.userData.ombro.x, 0.46, -oscilacaoBraco);
      posicionarBraco(d.bracoE, maoLivreE);
      posicionarBraco(d.bracoD, maoLivreD);
      return;
    }
    const carregandoNasMaos = d.jogador && inventario.length > 0;
    const maoE = carregandoNasMaos
      ? new THREE.Vector3(-0.3, 0.62, 0.5)
      : d.usandoCaixaMadeira
        ? new THREE.Vector3(-0.43, d.cesta.position.y + 0.32, d.cesta.position.z)
        : d.cesta.userData.pega.clone().add(d.cesta.position);
    const soltar = THREE.MathUtils.smoothstep(sentado, 0.65, 1);
    if (!carregandoNasMaos) maoE.lerp(new THREE.Vector3(-0.3, 0.87, 0.7), soltar);
    if (carregandoNasMaos) mao.set(0.3, 0.62, 0.5);
    else mao.lerp(new THREE.Vector3(0.3, 0.87, 0.7), sentado);
    posicionarBraco(d.bracoE, maoE);
    posicionarBraco(d.bracoD, mao);
  }
  animarComputador(modelo, tempo, ativo) {
    const d = modelo.userData;
    d.corpo.rotation.x = ativo ? -0.06 : 0;
    if (!ativo) return;
    const teclaE = Math.max(0, Math.sin(tempo * 12)) * 0.055;
    const teclaD = Math.max(0, Math.sin(tempo * 12 + Math.PI)) * 0.055;
    posicionarBraco(d.bracoE, new THREE.Vector3(-0.25, 0.69 - teclaE, 0.76 + teclaE));
    posicionarBraco(d.bracoD, new THREE.Vector3(0.25, 0.69 - teclaD, 0.76 + teclaD));
  }
  animarAtendimento(modelo, tempo, ativo, progresso = 0) {
    if (!ativo) return;
    const fase = tempo * 8;
    if (progresso > 0.52) {
      const alcancando = Math.sin(fase) > 0;
      posicionarBraco(modelo.userData.bracoE, alcancando
        ? new THREE.Vector3(-0.42, 0.58, 1.02)
        : new THREE.Vector3(-0.3, 0.84, 0.72));
      posicionarBraco(modelo.userData.bracoD, !alcancando
        ? new THREE.Vector3(0.42, 0.58, 1.02)
        : new THREE.Vector3(0.3, 0.84, 0.72));
      return;
    }
    const toque = Math.max(0, Math.sin(fase)) * 0.22;
    posicionarBraco(modelo.userData.bracoD, new THREE.Vector3(0.3, 0.86 - toque, 0.82));
    posicionarBraco(modelo.userData.bracoE, new THREE.Vector3(-0.3, 0.86 - Math.max(0, Math.sin(fase + Math.PI)) * 0.16, 0.76));
  }
  atualizarEmbalagem(sim) {
    const cliente = sim.clientes.filter(c => c.fase === 'fila').sort((a, b) => (a.ordemFila ?? 0) - (b.ordemFila ?? 0))[0];
    if (!cliente || sim.progressoCaixa <= 0) {
      this.sacolaEmbalagem.visible = false; this.itensEmbalagem.visible = false;
      this.clienteEmbalandoId = null;
      return null;
    }
    if (this.clienteEmbalandoId !== cliente.id) {
      liberarGeometrias(this.itensEmbalagem);
      this.clienteEmbalandoId = cliente.id;
      const itens = cliente.itens ?? Array(cliente.quantidade).fill(cliente.produto);
      for (const id of itens) this.itensEmbalagem.add(criarProduto(id, 0.82));
    }
    const progresso = THREE.MathUtils.clamp(sim.progressoCaixa / CONFIG.tempoCaixa, 0, 1);
    this.sacolaEmbalagem.visible = true; this.itensEmbalagem.visible = true;
    let preenchimento = 0, embalados = 0;
    this.itensEmbalagem.children.forEach((item, i) => {
      const intervalo = cliente.quantidade > 1 ? 0.5 / (cliente.quantidade - 1) : 0;
      const inicio = 0.05 + i * intervalo;
      const t = THREE.MathUtils.clamp((progresso - inicio) / 0.38, 0, 1);
      const origem = pontoNoBalcao(0, 1.39, 0.4 + (i - (cliente.quantidade - 1) / 2) * 0.13);
      const destino = posicaoProdutoSacola(i, cliente.quantidade).applyQuaternion(this.sacolaEmbalagem.quaternion).add(this.sacolaEmbalagem.position);
      item.position.copy(origem).lerp(destino, t);
      if (t < 1) item.position.y += Math.sin(t * Math.PI) * 0.32;
      item.rotation.z = (1 - t) * (i % 2 ? 0.45 : -0.45);
      preenchimento += t;
      if (t > 0) embalados++;
    });
    ajustarSacola(this.sacolaEmbalagem, cliente.quantidade, preenchimento / Math.max(1, cliente.quantidade));
    return { cliente, progresso, embalados };
  }
  atualizar(dt) {
    const sim = this.sim, e = sim.estado;
    const dtVisual = dt || (e.jogador.sentadoEscritorio ? 1 / 60 : 0);
    this.tempoVisual += dtVisual;
    const tempo = this.tempoVisual;
    for (let i = this.efeitosCrescimento.length - 1; i >= 0; i--) {
      const efeito = this.efeitosCrescimento[i], progresso = (tempo - efeito.inicio) / efeito.duracao;
      if (progresso >= 1) {
        this.cena.remove(efeito.grupo); liberarGeometrias(efeito.grupo); this.efeitosCrescimento.splice(i, 1); continue;
      }
      const pulso = 1 + progresso * 2.4;
      efeito.anel.scale.setScalar(pulso); efeito.anel.material.opacity = 0.9 * (1 - progresso);
      efeito.particulas.forEach((particula, indice) => {
        const raio = 0.45 + progresso * 1.35;
        particula.position.set(Math.cos(particula.userData.angulo) * raio, progresso * 2 + Math.sin(progresso * Math.PI * 3 + indice) * 0.12, Math.sin(particula.userData.angulo) * raio);
        particula.scale.setScalar(1 - progresso * 0.65);
      });
    }
    this.bairro.aplicar(e.personalizacao);
    this.bairro.animarPorta(sim.aberturaPortaEscritorio);
    const aberturaAlvo = sim.portaEntradaDeveAbrir() ? 1 : 0;
    this.aberturaLojaVisual = THREE.MathUtils.clamp(
      this.aberturaLojaVisual + Math.sign(aberturaAlvo - this.aberturaLojaVisual) * dtVisual * 1.8,
      Math.min(this.aberturaLojaVisual, aberturaAlvo), Math.max(this.aberturaLojaVisual, aberturaAlvo)
    );
    this.bairro.animarEntrada(this.aberturaLojaVisual, e.lojaAberta);
    this.bairro.animarComputador(!!e.jogador.sentadoEscritorio, tempo);
    const alvo = this.mobile ? new THREE.Vector3(e.jogador.x, 0, e.jogador.z) : new THREE.Vector3(-0.7, 0, 0.5);
    this.alvoCamera.lerp(alvo, this.mobile ? Math.min(1, dt * 4) : 1);
    this.camera.position.copy(this.alvoCamera).add(new THREE.Vector3(CONFIG.cameraIsometrica.x, CONFIG.cameraIsometrica.y, CONFIG.cameraIsometrica.z)); this.camera.lookAt(this.alvoCamera);
    this.animarPersonagem(this.jogador, e.jogador, dt, tempo, e.jogador.inventario);
    const atendendoNoCaixa = sim.progressoCaixa > 0;
    const progressoCaixa = sim.progressoCaixa / CONFIG.tempoCaixa;
    this.animarAtendimento(this.jogador, tempo, atendendoNoCaixa && !e.melhorias.caixa && e.jogador.sentado, progressoCaixa);
    this.animarComputador(this.jogador, tempo, !!e.jogador.sentadoEscritorio);
    const embalagem = this.atualizarEmbalagem(sim);
    const paletaAtual = PALETAS.find(p => p.id === e.personalizacao.paleta) || PALETAS[0];
    this.cestasEntrada.forEach((cesta, i) => {
      cesta.visible = i < sim.cestasNoSuporte;
      aplicarPaletaCesta(cesta, paletaAtual);
    });
    aplicarPaletaFuncionario(this.jogador, paletaAtual);
    aplicarPaletaFuncionario(this.caixeiro, paletaAtual);
    aplicarPaletaFuncionario(this.ajudante, paletaAtual);
    for (const c of sim.clientes) {
      if (!this.clientes.has(c.id)) {
        const visual = APARENCIAS_CLIENTES[c.aparencia] ?? APARENCIAS_CLIENTES[0];
        const m = personagem(visual.corRoupa, visual.pele, false, [0x1d654b, 0x3d8a65, 0x254233], visual);
        m.userData.sacolas = new THREE.Group(); m.userData.corpo.add(m.userData.sacolas);
        const sacola = criarSacola(); sacola.position.set(0, 0.18, 0.58); sacola.visible = false; m.userData.sacolas.add(sacola);
        const balao = document.createElement('div'); balao.className = 'balao-compra'; balao.hidden = true;
        document.getElementById('etiquetas').append(balao); m.userData.balao = balao;
        this.clientes.set(c.id, m); this.cena.add(m);
      }
      const modelo = this.clientes.get(c.id);
      const itens = c.itens ?? Array(c.quantidade).fill(c.produto);
      if (c.temCesta && !c.levaSacolas) aplicarPaletaCesta(modelo.userData.cesta, paletaAtual);
      this.animarPersonagem(modelo, c, dt, tempo + c.id, itens, 'prateleira', 0.55);
      const compra = c.compras?.[c.compraAtual ?? 0];
      const mostrarCompra = compra && ['chegando', 'pegandoCesta', 'comprando'].includes(c.fase) && !c.recusado;
      const mostrarReacao = c.satisfacao && c.fase === 'saindo' && !c.recusado;
      const mostrarBalao = mostrarCompra || mostrarReacao;
      const balao = modelo.userData.balao;
      balao.hidden = !mostrarBalao;
      if (mostrarBalao) {
        if (mostrarReacao) {
          const reacoes = {
            feliz: 'sorriso',
            neutro: 'neutro',
            irritado: 'irritado'
          };
          const reacao = reacoes[c.satisfacao];
          const chave = `reacao:${c.satisfacao}`;
          if (balao.dataset.conteudo !== chave) {
            balao.dataset.conteudo = chave;
            balao.className = `balao-compra balao-reacao ${c.satisfacao}`;
            balao.innerHTML = icone(reacao);
          }
        } else {
          const chave = `compra:${compra.produto}:${compra.desejado}`;
          if (balao.dataset.conteudo !== chave) {
            balao.dataset.conteudo = chave;
            balao.className = 'balao-compra';
            balao.innerHTML = `${icone(compra.produto)}<b>${compra.desejado}</b><span class="balao-espera" hidden>${icone('relogio')}<b></b></span>`;
          }
          const espera = c.esperaSemEstoque ?? 0;
          const esperando = c.fase === 'comprando' && e.produtos[compra.produto].prateleira === 0 && compra.quantidade < compra.desejado;
          const relogio = balao.querySelector('.balao-espera');
          relogio.hidden = !esperando;
          if (esperando) {
            relogio.lastElementChild.textContent = `${Math.max(0, Math.ceil(CONFIG.tempoEsperaCliente - espera))}s`;
            relogio.style.setProperty('--progresso-espera', `${Math.min(1, espera / CONFIG.tempoEsperaCliente) * 360}deg`);
          }
        }
        const pos = this.projetar({ x: c.x, y: 3.15, z: c.z });
        balao.hidden = pos.x < 20 || pos.x > this.w - 20 || pos.y < 20 || pos.y > this.h - 90;
        balao.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-100%)`;
      }
      modelo.userData.cesta.visible = !!c.temCesta && !c.levaSacolas;
      modelo.userData.sacolas.children.forEach((sacola, i) => {
        sacola.visible = !!c.levaSacolas;
        const assinaturaItens = itens.join(',');
        if (c.levaSacolas && sacola.userData.assinaturaItens !== assinaturaItens) {
          liberarGeometrias(sacola.userData.conteudo);
          sacola.userData.assinaturaItens = assinaturaItens;
          sacola.userData.aparicao = 0;
          itens.forEach((id, indice) => {
            const produto = criarProduto(id, 0.72);
            produto.userData.destinoSacola = posicaoProdutoSacola(indice, itens.length);
            produto.position.copy(produto.userData.destinoSacola).add(new THREE.Vector3(0, 0.2 + indice * 0.025, 0));
            produto.rotation.z = indice % 2 ? 0.35 : -0.35;
            sacola.userData.conteudo.add(produto);
          });
        }
        if (c.levaSacolas) {
          sacola.userData.aparicao = Math.min(1, (sacola.userData.aparicao ?? 0) + dt * 4.5);
          const entrada = THREE.MathUtils.smoothstep(sacola.userData.aparicao, 0, 1);
          ajustarSacola(sacola, itens.length, entrada);
          sacola.position.set(0, 0.18 + Math.sin(entrada * Math.PI) * 0.07, 0.58);
          sacola.scale.setScalar(0.86 + entrada * 0.14);
          sacola.userData.conteudo.children.forEach((produto, indice) => {
            const t = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(entrada * 1.35 - indice * 0.09, 0, 1), 0, 1);
            produto.position.copy(produto.userData.destinoSacola).add(new THREE.Vector3(0, (1 - t) * 0.2, 0));
            produto.rotation.z = (1 - t) * (indice % 2 ? 0.35 : -0.35);
          });
        }
        sacola.rotation.z = c.andando ? Math.sin(tempo * 8 + i) * 0.025 : 0;
        if (c.levaSacolas) {
          // As duas mãos apoiam a mesma sacola junto ao corpo.
          for (const [braco, lado] of [[modelo.userData.bracoE, -1], [modelo.userData.bracoD, 1]]) {
            const apoio = new THREE.Vector3(lado * 0.37, 0.25, 0.03).applyQuaternion(sacola.quaternion).add(sacola.position);
            posicionarBraco(braco, apoio);
          }
        }
      });
      if (embalagem?.cliente === c) {
        modelo.userData.carga.children.forEach((produto, i) => { if (i < embalagem.embalados) produto.visible = false; });
      }
    }
    for (const [id, m] of this.clientes) if (!sim.clientes.some(c => c.id === id)) { m.userData.balao?.remove(); this.cena.remove(m); liberarGeometrias(m); this.clientes.delete(id); }
    this.caixeiro.visible = !!e.melhorias.caixa;
    if (this.caixeiro.visible) {
      this.animarPersonagem(this.caixeiro, { x: CONFIG.cadeiraCaixa.x, z: CONFIG.cadeiraCaixa.z, angulo: CONFIG.anguloCaixa, andando: false, sentado: true }, dt, tempo);
      this.animarAtendimento(this.caixeiro, tempo, atendendoNoCaixa, progressoCaixa);
      this.caixeiro.userData.corpo.rotation.z = Math.sin(tempo * 1.8) * 0.018;
    }
    this.ajudante.visible = !!e.melhorias.ajudante;
    if (this.ajudante.visible) {
      this.ajudante.userData.cesta.visible = sim.ajudante.inventario.length > 0;
      usarCaixaMadeira(this.ajudante, ajudanteUsaCaixaMadeira(sim.ajudante));
      this.animarPersonagem(this.ajudante, sim.ajudante, dt, tempo, sim.ajudante.inventario, 'horta', 0.44);
    }
    for (const [id, objetos] of Object.entries(this.produtos)) {
      const estado = e.produtos[id]; objetos.grupo.visible = estado.liberado; objetos.bloqueio.visible = !estado.liberado;
      objetos.frutos.forEach((f, i) => { f.visible = i < estado.horta; f.position.y = 1 + Math.sin(tempo * 2 + i) * 0.025; });
      const emTransito = [this.jogador, this.ajudante].map(m => m.userData.reposicao)
        .filter(r => r?.id === id && r.decorrido / r.duracao < 0.85);
      objetos.frutas.forEach((f, i) => { f.visible = i < estado.prateleira && !emTransito.some(r => r.lugar === i); });
    }
    for (const { id, el, ponto } of this.labels) {
      const [tipo, produto] = id.split('-');
      if (produto && !e.produtos[produto].liberado) { el.hidden = true; continue; }
      const estacao = PRODUTOS[produto]?.[tipo === 'horta' ? 'horta' : 'prateleira'];
      const perto = tipo === 'horta'
        ? pertoDaEstacao(e.jogador, estacao, 2.5, 3.6)
        : pertoDaEstacao(e.jogador, estacao, 2.45, 1.8);
      if (!perto) { el.hidden = true; continue; }
      const pos = this.projetar(ponto);
      el.hidden = pos.x < 25 || pos.x > this.w - 25 || pos.y < (this.mobile ? 200 : 120) || pos.y > this.h - 100;
      el.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-100%)`;
      const detalhe = el.lastElementChild;
      if (tipo === 'horta') detalhe.textContent = `${e.produtos[produto].horta} para colher`;
      else if (tipo === 'loja') detalhe.textContent = `${e.produtos[produto].prateleira} / ${PRODUTOS[produto].capacidadePrateleira}`;
    }
    this.renderer.render(this.cena, this.camera);
  }
}
