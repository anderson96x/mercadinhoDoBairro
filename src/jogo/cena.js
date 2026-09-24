import { construirBairro } from './bairro.js';
import * as THREE from 'three';
import { CONFIG, PRODUTOS } from './configuracao.js';
import { RenderizadorCompativel } from './renderizador-compativel.js';
import { PALETAS } from './personalizacao.js';

const materiais = new Map();
function material(cor) {
  if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.92, metalness: 0 }));
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
    esfera(grupo, 0.16, 0xef5943, 0, 0, 0, 1, 0.86, 1);
    const folha = caixa(grupo, 0.2, 0.04, 0.09, 0x397a3a, 0, 0.14, 0); folha.rotation.y = 0.7;
    caixa(grupo, 0.04, 0.09, 0.04, 0x397a3a, 0, 0.18, 0);
  } else {
    esfera(grupo, 0.14, 0xf7c843, 0, 0, 0, 0.7, 1.5, 0.7);
    const folha = esfera(grupo, 0.12, 0x589547, 0.07, -0.06, 0, 0.45, 1.6, 0.55); folha.rotation.z = -0.35;
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

function criarSacola() {
  const sacola = new THREE.Group();
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
    sacola.add(objeto(geometria, cor));
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
  caixa(sacola, 0.68, 0.04, 0.44, 0xb38350, 0, 0.02, 0);
  sacola.userData.conteudo = new THREE.Group(); sacola.add(sacola.userData.conteudo);
  return sacola;
}

function posicaoProdutoSacola(indice) {
  return new THREE.Vector3(indice % 2 ? 0.16 : -0.16, 0.69 + Math.floor(indice / 2) * 0.08, indice % 2 ? 0.09 : -0.09);
}

export function personagem(cor, pele = 0xf2c49c, jogador = false, coresCesta = []) {
  const g = new THREE.Group();
  const corpo = new THREE.Group(); g.add(corpo);
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.38, 20), new THREE.MeshBasicMaterial({ color: 0x204c31, transparent: true, opacity: 0.13, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.014; g.add(sombra);
  const pernaE = caixa(corpo, 0.19, 0.36, 0.22, 0x344b58, -0.15, 0.28, 0);
  const pernaD = caixa(corpo, 0.19, 0.36, 0.22, 0x344b58, 0.15, 0.28, 0);
  const peE = caixa(corpo, 0.22, 0.12, 0.32, 0xf8f0dc, -0.15, 0.09, 0.06);
  const peD = caixa(corpo, 0.22, 0.12, 0.32, 0xf8f0dc, 0.15, 0.09, 0.06);
  const coxas = [-0.15, 0.15].map(x => caixa(corpo, 0.19, 0.19, 0.34, 0x344b58, x, 0.43, 0.13));
  coxas.forEach(coxa => { coxa.visible = false; });
  const torso = objeto(new THREE.CapsuleGeometry(0.24, 0.22, 3, 8), cor, 0, 0.73, 0); torso.scale.x = 1.13; corpo.add(torso);
  const bracoE = braco(jogador ? 0xf9efda : cor, pele, -0.34);
  const bracoD = braco(jogador ? 0xf9efda : cor, pele, 0.34);
  corpo.add(bracoE, bracoD);
  esfera(corpo, 0.28, pele, 0, 1.16, 0, 1, 1.05, 0.92);
  esfera(corpo, 0.285, 0x49362d, 0, 1.29, -0.04, 1, 0.64, 0.95);
  esfera(corpo, 0.025, 0x3e352c, -0.09, 1.17, 0.235);
  esfera(corpo, 0.025, 0x3e352c, 0.09, 1.17, 0.235);
  if (jogador) {
    caixa(corpo, 0.42, 0.48, 0.09, 0xd85c40, 0, 0.64, 0.24);
    caixa(corpo, 0.23, 0.13, 0.025, 0xf4af65, 0, 0.6, 0.3);
    cilindro(corpo, 0.29, 0.3, 0.12, 0x1e7155, 0, 1.46, 0);
    caixa(corpo, 0.45, 0.05, 0.27, 0x1e7155, 0, 1.45, 0.18);
  }
  const cesta = jogador ? new THREE.Group() : criarCesta(...coresCesta);
  cesta.position.set(0, jogador ? 0.42 : 0.26, jogador ? 0.5 : 0.58); corpo.add(cesta);
  cesta.userData.pega ??= new THREE.Vector3(0, 0.89, 0);
  const carga = new THREE.Group(); cesta.add(carga);
  const produtoNaMao = new THREE.Group(); corpo.add(produtoNaMao);
  g.userData = { corpo, pernaE, pernaD, peE, peD, coxas, bracoE, bracoD, cesta, carga, produtoNaMao, inventario: null, coleta: null, sentar: 0, jogador };
  posicionarBraco(bracoE, cesta.userData.pega.clone().add(cesta.position));
  posicionarBraco(bracoD, new THREE.Vector3(0.4, 0.65, 0.32));
  return g;
}

export class Cena {
  constructor(container, simulacao) {
    this.sim = simulacao; this.container = container;
    this.cena = new THREE.Scene(); this.cena.background = new THREE.Color(0xa9cb76);
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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.setAttribute('aria-label', 'Mercadinho em 3D. Arraste para andar ou use as setas e as teclas W, A, S e D.');
    container.prepend(this.renderer.domElement);
    this.cena.add(new THREE.HemisphereLight(0xfff5d9, 0x8ea86d, 2.7));
    const sol = new THREE.DirectionalLight(0xffebcf, 3); sol.position.set(-8, 22, 13); sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024); sol.shadow.camera.left = -18; sol.shadow.camera.right = 18;
    sol.shadow.camera.top = 18; sol.shadow.camera.bottom = -18; sol.shadow.normalBias = 0.035; sol.shadow.bias = -0.0002;
    this.cena.add(sol);
    this.alvoCamera = new THREE.Vector3(-0.5, 0, 0.8);
    this.construirMundo();
    this.sacolaEmbalagem = criarSacola(); this.sacolaEmbalagem.position.set(CONFIG.balcao.x - 0.35, 1.31, CONFIG.balcao.z + 0.72); this.sacolaEmbalagem.visible = false; this.cena.add(this.sacolaEmbalagem);
    this.itensEmbalagem = new THREE.Group(); this.cena.add(this.itensEmbalagem); this.clienteEmbalandoId = null;
    this.jogador = personagem(0xf8ecd1, 0xe9b489, true); this.cena.add(this.jogador);
    this.clientes = new Map(); this.labels = [];
    this.produtos = {};
    for (const [id, p] of Object.entries(PRODUTOS)) this.construirEstacao(id, p);
    this.caixeiro = personagem(0x428b88, 0x9b6848); this.caixeiro.position.set(CONFIG.cadeiraCaixa.x, 0.23, CONFIG.cadeiraCaixa.z); this.caixeiro.rotation.y = Math.PI / 2; this.cena.add(this.caixeiro);
    this.caixeiro.userData.cesta.visible = false;
    posicionarBraco(this.caixeiro.userData.bracoE, new THREE.Vector3(-0.34, 0.45, 0));
    posicionarBraco(this.caixeiro.userData.bracoD, new THREE.Vector3(0.34, 0.45, 0));
    this.ajudante = personagem(0xf2b349, 0xdba271, false, [0x858b91, 0xaeb4ba]); this.cena.add(this.ajudante);
    this.redimensionar(); window.addEventListener('resize', () => this.redimensionar());
  }
  construirMundo() {
    const c = new THREE.Group(); c.position.x = CONFIG.balcao.x - 5.5; this.cena.add(c);
    this.bairro = construirBairro(this.cena, { caixa, cilindro, esfera, placa });
    this.bairro.aplicar(this.sim.estado.personalizacao);
    // Caixa e esteira, com produtos e recibo visíveis de perto.
    this.bairro.vincular(caixa(c, 1.35, 0.95, 2.7, 0x297b61, 5.5, 0.65, 4.1), 'principal');
    caixa(c, 1.53, 0.17, 2.9, 0xfaf3d7, 5.5, 1.2, 4.1);
    caixa(c, 1.0, 0.025, 1.5, 0x384d46, 5.5, 1.31, 4.5);
    // Computador do caixa: base, coluna, monitor e tela.
    caixa(c, 0.5, 0.13, 0.42, 0x274839, 5.12, 1.38, 4.1);
    caixa(c, 0.08, 0.13, 0.08, 0x354d42, 5.12, 1.5, 4.1);
    const monitor = caixa(c, 0.47, 0.4, 0.1, 0x354d42, 5.12, 1.63, 4.1); monitor.rotation.x = -0.25; monitor.rotation.y = -Math.PI / 2;
    const tela = caixa(c, 0.36, 0.25, 0.02, 0xc4e4a5, 5.06, 1.65, 4.1); tela.rotation.y = -Math.PI / 2;
    // Teclado compacto na frente do monitor.
    const teclado = caixa(c, 0.52, 0.035, 0.2, 0x354d42, 4.83, 1.315, 4.1); teclado.rotation.y = Math.PI / 2;
    for (let linha = 0; linha < 2; linha++) for (let tecla = 0; tecla < 6; tecla++) {
      const teclaMesh = caixa(c, 0.045, 0.012, 0.035, 0xb6c7a0, 4.78 + linha * 0.07, 1.339, 3.89 + tecla * 0.084); teclaMesh.rotation.y = Math.PI / 2;
    }
    // Leitor de código de barras com janela vermelha.
    caixa(c, 0.3, 0.065, 0.24, 0x354d42, 5.05, 1.34, 4.0);
    caixa(c, 0.2, 0.012, 0.11, 0xe86b55, 5.05, 1.379, 4.0);
    // Maquininha de cartão com tela e teclas.
    caixa(c, 0.27, 0.09, 0.3, 0x344b58, 5.96, 1.36, 3.75);
    caixa(c, 0.19, 0.018, 0.1, 0xb9d9a2, 5.96, 1.414, 3.68);
    for (let linha = 0; linha < 2; linha++) for (let tecla = 0; tecla < 3; tecla++) {
      caixa(c, 0.035, 0.012, 0.03, 0xe8d9b6, 5.91 + tecla * 0.05, 1.414, 3.75 + linha * 0.045);
    }
    // Impressora de recibos e papel saindo pela abertura.
    caixa(c, 0.38, 0.19, 0.32, 0x52616b, 5.85, 1.38, 3.03);
    caixa(c, 0.24, 0.012, 0.035, 0x263b37, 5.85, 1.482, 3.03);
    caixa(c, 0.16, 0.012, 0.2, 0xffffff, 5.85, 1.49, 2.91);
    // Gaveta de dinheiro na face voltada para o caixa.
    caixa(c, 0.45, 0.16, 0.62, 0x354d42, 4.94, 1.04, 4.95);
    caixa(c, 0.025, 0.1, 0.56, 0x52616b, 4.70, 1.07, 4.95);
    caixa(c, 0.03, 0.025, 0.13, 0xb6c7a0, 4.68, 1.08, 4.95);
    // Papel extra e pequeno suporte para sacolas.
    caixa(c, 0.17, 0.018, 0.36, 0xffffff, 5.12, 1.3, 3.48);
    caixa(c, 0.09, 0.018, 0.14, 0xd9d2b9, 5.5, 1.3, 3.98);
    this.marcaCaixa = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.9, 48), new THREE.MeshBasicMaterial({ color: 0x318466, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    this.marcaCaixa.rotation.x = -Math.PI / 2; this.marcaCaixa.position.set(CONFIG.cadeiraCaixa.x, 0.225, CONFIG.cadeiraCaixa.z); this.cena.add(this.marcaCaixa);
    const cadeira = new THREE.Group();
    cadeira.position.set(CONFIG.cadeiraCaixa.x, 0.23, CONFIG.cadeiraCaixa.z);
    cadeira.rotation.y = Math.PI / 2; this.cena.add(cadeira);
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
    caixa(grupo, 2.5, 0.35, 3.6, 0xb58a58, h.x, 0.22, h.z);
    caixa(grupo, 2.23, 0.05, 3.32, 0x79593c, h.x, 0.42, h.z);
    const frutos = [];
    for (let i = 0; i < 8; i++) {
      const x = h.x - 0.65 + i % 2 * 1.25, z = h.z - 1.18 + Math.floor(i / 2) * 0.78;
      cilindro(grupo, 0.035, 0.035, 0.6, 0x579340, x, 0.72, z, 6);
      const f1 = esfera(grupo, 0.22, 0x689e43, x - 0.12, 0.67, z, 1.5, 0.35, 0.8); f1.rotation.z = -0.25;
      const f2 = esfera(grupo, 0.22, 0x488b40, x + 0.12, 0.83, z, 1.5, 0.35, 0.8); f2.rotation.z = 0.3;
      const fruto = criarProduto(id, 1.6); fruto.position.set(x, 1, z); grupo.add(fruto); frutos.push(fruto);
    }
    const s = p.prateleira;
    caixa(grupo, 2.3, 0.65, 1.65, 0xd4a46c, s.x, 0.53, s.z);
    caixa(grupo, 2.45, 0.13, 1.8, 0xf4d59a, s.x, 0.91, s.z);
    caixa(grupo, 2.42, 0.23, 0.14, 0xb58750, s.x, 1.07, s.z + 0.8);
    caixa(grupo, 2.42, 0.23, 0.14, 0xb58750, s.x, 1.07, s.z - 0.8);
    for (const x of [-1.15, 1.15]) caixa(grupo, 0.14, 0.23, 1.65, 0xb58750, s.x + x, 1.07, s.z);
    const frutas = [];
    for (let i = 0; i < 12; i++) {
      const f = criarProduto(id, 1.7); f.position.set(s.x - 0.83 + i % 4 * 0.56, 1.11, s.z - 0.5 + Math.floor(i / 4) * 0.49); grupo.add(f); frutas.push(f);
    }
    const preco = placa(`R$ ${p.preco}`, '#fff5d8', '#2d6243', 0.85, 0.32); preco.position.set(s.x, 0.6, s.z + 0.835); grupo.add(preco);
    const bloqueio = new THREE.Group(); this.cena.add(bloqueio);
    caixa(bloqueio, 2.55, 0.03, 3.65, 0x8fb46a, h.x, 0.065, h.z);
    for (const d of [-1,1]) {
      caixa(bloqueio, 2.55, 0.035, 0.055, 0xd3e5a3, h.x, 0.09, h.z + d * 1.8);
      caixa(bloqueio, 0.055, 0.035, 3.65, 0xd3e5a3, h.x + d * 1.26, 0.09, h.z);
    }
    const placaFutura = placa('EM BREVE', '#639653', '#eaf2cc', 1.9, 0.45); placaFutura.position.set(h.x, 0.85, h.z); bloqueio.add(placaFutura);
    caixa(bloqueio, 0.1, 0.65, 0.1, 0x8f754a, h.x, 0.36, h.z);
    this.produtos[id] = { grupo, bloqueio, frutos, frutas };
    this.criarLabel(`horta-${id}`, { ...p.horta, y: 1.6 }, p.plural.toLocaleUpperCase('pt-BR'), 'Pronto para colher', id);
    this.criarLabel(`loja-${id}`, { ...p.prateleira, y: 1.7 }, p.nome.toLocaleUpperCase('pt-BR'), '0 / 12', 'loja');
  }
  criarLabel(id, ponto, titulo, detalhe, classe) {
    const el = document.createElement('div'); el.className = `etiqueta etiqueta-${classe}`;
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
    d.sentar = THREE.MathUtils.clamp(d.sentar + (ator.sentado ? 1 : -1) * dt * 3, 0, 1);
    const sentado = d.sentar * d.sentar * (3 - 2 * d.sentar);
    d.corpo.position.y = (ator.andando ? Math.abs(balanco) * 0.05 : Math.sin(tempo * 2) * 0.012) * (1 - sentado) + 0.08 * sentado;
    d.pernaE.rotation.x = balanco * 0.55 * (1 - sentado); d.pernaD.rotation.x = -balanco * 0.55 * (1 - sentado);
    for (const perna of [d.pernaE, d.pernaD]) {
      perna.position.y = 0.28 - 0.05 * sentado; perna.position.z = 0.3 * sentado;
    }
    for (const pe of [d.peE, d.peD]) { pe.position.y = 0.09 - 0.06 * sentado; pe.position.z = 0.06 + 0.3 * sentado; }
    d.coxas.forEach(coxa => { coxa.visible = sentado > 0; coxa.scale.z = sentado; });
    if (d.jogador) d.cesta.position.set(0, 0.42, 0.5);
    else d.cesta.position.set(0, 0.26, 0.58).lerp(new THREE.Vector3(-1, -d.corpo.position.y, 0), sentado);
    const repouso = new THREE.Vector3(0.4, 0.65, 0.32);
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
    const carregandoNasMaos = d.jogador && inventario.length > 0;
    const maoE = carregandoNasMaos ? new THREE.Vector3(-0.3, 0.62, 0.5) : d.cesta.userData.pega.clone().add(d.cesta.position);
    const soltar = THREE.MathUtils.smoothstep(sentado, 0.65, 1);
    if (!carregandoNasMaos) maoE.lerp(new THREE.Vector3(-0.3, 0.87, 0.7), soltar);
    if (carregandoNasMaos) mao.set(0.3, 0.62, 0.5);
    else mao.lerp(new THREE.Vector3(0.3, 0.87, 0.7), sentado);
    posicionarBraco(d.bracoE, maoE);
    posicionarBraco(d.bracoD, mao);
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
      for (let i = 0; i < cliente.quantidade; i++) this.itensEmbalagem.add(criarProduto(cliente.produto, 0.82));
    }
    const progresso = THREE.MathUtils.clamp(sim.progressoCaixa / CONFIG.tempoCaixa, 0, 1);
    this.sacolaEmbalagem.visible = true; this.itensEmbalagem.visible = true;
    this.itensEmbalagem.children.forEach((item, i) => {
      const inicio = 0.08 + i * 0.22;
      const t = THREE.MathUtils.clamp((progresso - inicio) / 0.34, 0, 1);
      const origem = new THREE.Vector3(CONFIG.balcao.x, 1.39, CONFIG.balcao.z + 0.4 + (i - (cliente.quantidade - 1) / 2) * 0.13);
      const destino = posicaoProdutoSacola(i).add(this.sacolaEmbalagem.position);
      item.position.copy(origem).lerp(destino, t);
      if (t < 1) item.position.y += Math.sin(t * Math.PI) * 0.32;
    });
    return { cliente, progresso };
  }
  atualizar(dt) {
    const sim = this.sim, e = sim.estado, tempo = sim.tempo;
    this.bairro.aplicar(e.personalizacao);
    const alvo = this.mobile ? new THREE.Vector3(e.jogador.x, 0, e.jogador.z) : new THREE.Vector3(-0.7, 0, 0.5);
    this.alvoCamera.lerp(alvo, this.mobile ? Math.min(1, dt * 4) : 1);
    this.camera.position.copy(this.alvoCamera).add(new THREE.Vector3(CONFIG.cameraIsometrica.x, CONFIG.cameraIsometrica.y, CONFIG.cameraIsometrica.z)); this.camera.lookAt(this.alvoCamera);
    this.animarPersonagem(this.jogador, e.jogador, dt, tempo, e.jogador.inventario);
    const atendendoNoCaixa = sim.progressoCaixa > 0;
    const progressoCaixa = sim.progressoCaixa / CONFIG.tempoCaixa;
    this.animarAtendimento(this.jogador, tempo, atendendoNoCaixa && !e.melhorias.caixa && e.jogador.sentado, progressoCaixa);
    const embalagem = this.atualizarEmbalagem(sim);
    const cores = [0x72a9bb, 0xd7a35d, 0xa995c6, 0xd77c73, 0x6a9c7d];
    const paletaCesta = PALETAS.find(p => p.id === e.personalizacao.paleta) || PALETAS[0];
    for (const c of sim.clientes) {
      if (!this.clientes.has(c.id)) {
        const m = personagem(cores[c.cor], c.id % 2 ? 0xebbe92 : 0x9a674b, false, [0x1d654b, 0x3d8a65, 0x254233]);
        m.userData.sacolas = new THREE.Group(); m.userData.corpo.add(m.userData.sacolas);
        const sacola = criarSacola(); sacola.position.set(0, 0.18, 0.58); sacola.visible = false; m.userData.sacolas.add(sacola);
        this.clientes.set(c.id, m); this.cena.add(m);
      }
      const modelo = this.clientes.get(c.id);
      if (c.temCesta && !c.levaSacolas) aplicarPaletaCesta(modelo.userData.cesta, paletaCesta);
      this.animarPersonagem(modelo, c, dt, tempo + c.id, Array(c.quantidade).fill(c.produto), 'prateleira', 0.55);
      modelo.userData.cesta.visible = !!c.temCesta && !c.levaSacolas;
      modelo.userData.sacolas.children.forEach((sacola, i) => {
        sacola.visible = !!c.levaSacolas;
        sacola.rotation.z = c.andando ? Math.sin(tempo * 8 + i) * 0.025 : 0;
        if (c.levaSacolas) {
          // As duas mãos apoiam a mesma sacola junto ao corpo.
          for (const [braco, lado] of [[modelo.userData.bracoE, -1], [modelo.userData.bracoD, 1]]) {
            const apoio = new THREE.Vector3(lado * 0.37, 0.25, 0.03).applyQuaternion(sacola.quaternion).add(sacola.position);
            posicionarBraco(braco, apoio);
          }
        }
        if (c.levaSacolas && !sacola.userData.cheia) {
          for (let indice = 0; indice < c.quantidade; indice++) {
            const produto = criarProduto(c.produto, 0.82);
            produto.position.copy(posicaoProdutoSacola(indice));
            sacola.userData.conteudo.add(produto);
          }
          sacola.userData.cheia = true;
        }
      });
      if (embalagem?.cliente === c) {
        const embalados = Math.floor(embalagem.progresso * c.quantidade);
        modelo.userData.carga.children.forEach((produto, i) => { if (i < embalados) produto.visible = false; });
      }
    }
    for (const [id, m] of this.clientes) if (!sim.clientes.some(c => c.id === id)) { this.cena.remove(m); liberarGeometrias(m); this.clientes.delete(id); }
    this.caixeiro.visible = !!e.melhorias.caixa;
    this.marcaCaixa.visible = !this.caixeiro.visible;
    if (this.caixeiro.visible) {
      this.animarPersonagem(this.caixeiro, { x: CONFIG.cadeiraCaixa.x, z: CONFIG.cadeiraCaixa.z, angulo: Math.PI / 2, andando: false, sentado: true }, dt, tempo);
      this.animarAtendimento(this.caixeiro, tempo, atendendoNoCaixa, progressoCaixa);
      this.caixeiro.userData.corpo.rotation.z = Math.sin(tempo * 1.8) * 0.018;
    }
    this.ajudante.visible = !!e.melhorias.ajudante;
    if (this.ajudante.visible) this.animarPersonagem(this.ajudante, sim.ajudante, dt, tempo, sim.ajudante.inventario, 'horta', 0.44);
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
