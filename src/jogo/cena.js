import * as THREE from 'three';
import { CONFIG, PRODUTOS } from './configuracao.js';
import { RenderizadorCompativel } from './renderizador-compativel.js';

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

function personagem(cor, pele = 0xf2c49c, jogador = false) {
  const g = new THREE.Group();
  const corpo = new THREE.Group(); g.add(corpo);
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.38, 20), new THREE.MeshBasicMaterial({ color: 0x204c31, transparent: true, opacity: 0.13, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.014; g.add(sombra);
  const pernaE = caixa(corpo, 0.19, 0.36, 0.22, 0x344b58, -0.15, 0.28, 0);
  const pernaD = caixa(corpo, 0.19, 0.36, 0.22, 0x344b58, 0.15, 0.28, 0);
  caixa(corpo, 0.22, 0.12, 0.32, 0xf8f0dc, -0.15, 0.09, 0.06);
  caixa(corpo, 0.22, 0.12, 0.32, 0xf8f0dc, 0.15, 0.09, 0.06);
  const torso = objeto(new THREE.CapsuleGeometry(0.24, 0.22, 3, 8), cor, 0, 0.73, 0); torso.scale.x = 1.13; corpo.add(torso);
  const bracoE = caixa(corpo, 0.16, 0.44, 0.19, jogador ? 0xf9efda : cor, -0.34, 0.7, 0);
  const bracoD = caixa(corpo, 0.16, 0.44, 0.19, jogador ? 0xf9efda : cor, 0.34, 0.7, 0);
  esfera(corpo, 0.10, pele, -0.34, 0.45, 0); esfera(corpo, 0.10, pele, 0.34, 0.45, 0);
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
  const carga = new THREE.Group(); carga.position.set(0, 0.87, -0.35); g.add(carga);
  g.userData = { corpo, pernaE, pernaD, bracoE, bracoD, carga, chaveCarga: '' };
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
    this.jogador = personagem(0xf8ecd1, 0xe9b489, true); this.cena.add(this.jogador);
    this.clientes = new Map(); this.labels = [];
    this.produtos = {};
    for (const [id, p] of Object.entries(PRODUTOS)) this.construirEstacao(id, p);
    this.caixeiro = personagem(0x428b88, 0x9b6848); this.caixeiro.position.set(4.2, 0, 4.1); this.caixeiro.rotation.y = Math.PI / 2; this.cena.add(this.caixeiro);
    this.ajudante = personagem(0xf2b349, 0xdba271); this.cena.add(this.ajudante);
    this.criarLabel('caixa', CONFIG.caixa, 'CAIXA', 'Atenda aqui', 'verde');
    this.marcador = new THREE.Group();
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 6, 40), new THREE.MeshBasicMaterial({ color: 0xfff4b3 })); aro.rotation.x = Math.PI / 2; this.marcador.add(aro);
    this.seta = objeto(new THREE.ConeGeometry(0.2, 0.37, 4), 0xffdd6f, 0, 1.8, 0); this.seta.rotation.z = Math.PI; this.marcador.add(this.seta); this.cena.add(this.marcador);
    this.redimensionar(); window.addEventListener('resize', () => this.redimensionar());
  }
  construirMundo() {
    const c = this.cena;
    const chao = (camada, ...args) => { const m = caixa(c, ...args); m.userData.fundo = camada; return m; };
    chao(0, 120, 0.4, 120, 0xa9cb76, 0, -0.35, 0);
    chao(1, 23.4, 0.24, 20.7, 0x7fa660, -0.25, -0.16, 0.2);
    chao(2, 23, 0.2, 20.3, 0xb3d080, -0.25, -0.09, 0.2);
    chao(3, 12.4, 0.17, 13, 0xc7bfa2, 3, 0.01, 0.35);
    chao(4, 12.1, 0.18, 12.7, 0xf6e8c4, 3, 0.12, 0.35);
    // Rejunte discreto do piso: geometria real, sem imagens externas.
    for (let x = -3; x <= 9; x += 1.5) chao(5, 0.016, 0.008, 12.4, 0xe5d8b5, x, 0.214, 0.35);
    for (let z = -5.8; z <= 6.6; z += 1.5) chao(5, 12.0, 0.008, 0.016, 0xe5d8b5, 3, 0.216, z);
    caixa(c, 12.4, 0.9, 0.28, 0xf7f0d4, 3, 0.55, -6.0);
    caixa(c, 12.6, 0.16, 0.4, 0x3d8a65, 3, 1.05, -6.0);
    caixa(c, 0.28, 0.9, 8.2, 0xf7f0d4, 9.1, 0.55, -2);
    caixa(c, 0.4, 0.16, 8.3, 0x3d8a65, 9.1, 1.05, -2);
    for (let x = -2; x < 8; x += 1.1) {
      caixa(c, 0.62, 0.7, 0.16, x % 2 < 1 ? 0xf0bc56 : 0x4c926c, x, 1.5, -6.13);
    }
    const nome = placa('MERCADINHO', '#226749', '#fff7dc', 4.8, 0.8); nome.position.set(2.8, 2.3, -6); c.add(nome);
    // Caixa e esteira, com produtos e recibo visíveis de perto.
    caixa(c, 1.35, 0.95, 2.7, 0x297b61, 5.5, 0.65, 4.1);
    caixa(c, 1.53, 0.17, 2.9, 0xfaf3d7, 5.5, 1.2, 4.1);
    caixa(c, 1.0, 0.025, 1.5, 0x384d46, 5.5, 1.31, 4.5);
    caixa(c, 0.5, 0.13, 0.42, 0x274839, 5.5, 1.38, 3.28);
    const monitor = caixa(c, 0.47, 0.4, 0.1, 0x354d42, 5.5, 1.63, 3.25); monitor.rotation.x = -0.25;
    caixa(c, 0.36, 0.25, 0.02, 0xc4e4a5, 5.5, 1.65, 3.31);
    caixa(c, 0.17, 0.018, 0.45, 0xffffff, 5.12, 1.3, 3.55);
    const circulo = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.9, 48), new THREE.MeshBasicMaterial({ color: 0x318466, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    circulo.rotation.x = -Math.PI / 2; circulo.position.set(3.9, 0.225, 4.1); c.add(circulo);
    const tapete = caixa(c, 3.0, 0.025, 1.2, 0x3f8a66, 7.35, 0.226, 6.2);
    for (let x = -9.2; x < 7.8; x += 1.5) {
      caixa(c, 0.16, 0.7, 0.16, 0xe9d6a8, x, 0.25, -8.4);
      caixa(c, 1.55, 0.11, 0.13, 0xd7bd85, x + 0.75, 0.4, -8.4);
    }
    // Árvores simples e flores dão escala ao diorama sem atrapalhar os caminhos.
    const arvores = [[-9.1,-6.8],[-9.7,6.9],[10.4,-6.8],[10.4,1.0],[-1.2,8.2]];
    arvores.forEach(([x,z], i) => {
      cilindro(c, 0.12, 0.18, 1.7, 0xa58050, x, 0.8, z, 7);
      esfera(c, 0.9, i % 2 ? 0x4c9654 : 0x6ca557, x, 1.9, z, 1, 1.25, 1);
      esfera(c, 0.55, 0x84b665, x - 0.4, 2.3, z + 0.15);
    });
    for (let i = 0; i < 25; i++) {
      const x = -10.2 + (i * 7.17 % 20), z = i % 2 ? -7.4 : 8.5;
      esfera(c, 0.06, i % 3 ? 0xf7de81 : 0xfff5dc, x, 0.13, z);
      cilindro(c, 0.014, 0.02, 0.16, 0x659453, x, 0.07, z, 5);
    }
    // Pequeno banco e caixotes ao fundo.
    caixa(c, 2.0, 0.18, 0.7, 0xb28955, -1, 0.64, -4.8);
    caixa(c, 2.0, 0.5, 0.12, 0xca9d61, -1, 1.0, -5.12);
    for (const x of [-1.7,-0.3]) caixa(c, 0.12, 0.55, 0.6, 0x527254, x, 0.35, -4.8);
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
    const altura = this.mobile ? 18.8 : Math.max(22, 34 / proporcao);
    this.camera.left = -altura * proporcao / 2; this.camera.right = altura * proporcao / 2;
    this.camera.top = altura / 2; this.camera.bottom = -altura / 2; this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.w, this.h);
  }
  projetar(ponto) {
    const p = new THREE.Vector3(ponto.x, ponto.y ?? 1.5, ponto.z).project(this.camera);
    return { x: (p.x + 1) * this.w / 2, y: (1 - p.y) * this.h / 2 };
  }
  animarPersonagem(modelo, ator, dt, tempo, inventario = []) {
    modelo.position.set(ator.x, 0.23, ator.z);
    const alvo = ator.angulo ?? Math.PI / 4;
    const delta = Math.atan2(Math.sin(alvo - modelo.rotation.y), Math.cos(alvo - modelo.rotation.y));
    modelo.rotation.y += delta * Math.min(1, dt * 12);
    const d = modelo.userData;
    const balanco = ator.andando ? Math.sin(tempo * 13) : 0;
    d.corpo.position.y = ator.andando ? Math.abs(balanco) * 0.05 : Math.sin(tempo * 2) * 0.012;
    d.pernaE.rotation.x = balanco * 0.55; d.pernaD.rotation.x = -balanco * 0.55;
    d.bracoE.rotation.x = -balanco * 0.35; d.bracoD.rotation.x = balanco * 0.35;
    const chave = inventario.join(',');
    if (chave !== d.chaveCarga) {
      liberarGeometrias(d.carga);
      inventario.forEach((id, i) => {
        const fruta = criarProduto(id, 1.2); fruta.position.set(i % 2 * 0.25 - 0.12, Math.floor(i / 2) * 0.28, 0); d.carga.add(fruta);
      });
      d.chaveCarga = chave;
    }
  }
  atualizar(dt) {
    const sim = this.sim, e = sim.estado, tempo = sim.tempo;
    const alvo = this.mobile ? new THREE.Vector3(e.jogador.x, 0, e.jogador.z) : new THREE.Vector3(-0.7, 0, 0.5);
    this.alvoCamera.lerp(alvo, this.mobile ? Math.min(1, dt * 4) : 1);
    this.camera.position.copy(this.alvoCamera).add(new THREE.Vector3(12, 24, 18)); this.camera.lookAt(this.alvoCamera);
    this.animarPersonagem(this.jogador, e.jogador, dt, tempo, e.jogador.inventario);
    const cores = [0x72a9bb, 0xd7a35d, 0xa995c6, 0xd77c73, 0x6a9c7d];
    for (const c of sim.clientes) {
      if (!this.clientes.has(c.id)) { const m = personagem(cores[c.cor], c.id % 2 ? 0xebbe92 : 0x9a674b); this.clientes.set(c.id, m); this.cena.add(m); }
      this.animarPersonagem(this.clientes.get(c.id), c, dt, tempo + c.id, Array(c.quantidade).fill(c.produto));
    }
    for (const [id, m] of this.clientes) if (!sim.clientes.some(c => c.id === id)) { this.cena.remove(m); liberarGeometrias(m); this.clientes.delete(id); }
    this.caixeiro.visible = !!e.melhorias.caixa;
    this.ajudante.visible = !!e.melhorias.ajudante;
    if (this.ajudante.visible) this.animarPersonagem(this.ajudante, sim.ajudante, dt, tempo, sim.ajudante.inventario);
    for (const [id, objetos] of Object.entries(this.produtos)) {
      const estado = e.produtos[id]; objetos.grupo.visible = estado.liberado; objetos.bloqueio.visible = !estado.liberado;
      objetos.frutos.forEach((f, i) => { f.visible = i < estado.horta; f.position.y = 1 + Math.sin(tempo * 2 + i) * 0.025; });
      objetos.frutas.forEach((f, i) => { f.visible = i < estado.prateleira; });
    }
    const missao = sim.missao();
    let destino = missao.destino === 'horta' ? PRODUTOS.tomate.coleta : missao.destino === 'prateleira' ? PRODUTOS.tomate.reposicao : missao.destino === 'caixa' ? CONFIG.caixa : null;
    this.marcador.visible = !!destino;
    if (destino) { this.marcador.position.set(destino.x, 0.23, destino.z); this.seta.position.y = 2 + Math.sin(tempo * 3) * 0.16; }
    for (const { id, el, ponto } of this.labels) {
      const [tipo, produto] = id.split('-');
      if (produto && !e.produtos[produto].liberado) { el.hidden = true; continue; }
      const pos = this.projetar(ponto);
      el.hidden = pos.x < 25 || pos.x > this.w - 25 || pos.y < (this.mobile ? 200 : 120) || pos.y > this.h - 100;
      el.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-100%)`;
      const detalhe = el.lastElementChild;
      if (tipo === 'horta') detalhe.textContent = `${e.produtos[produto].horta} para colher`;
      else if (tipo === 'loja') detalhe.textContent = `${e.produtos[produto].prateleira} / ${PRODUTOS[produto].capacidadePrateleira}`;
      else detalhe.textContent = e.melhorias.caixa ? 'Atendimento automático' : sim.clientes.some(c => c.fase === 'fila') ? 'Cliente esperando' : 'Atenda aqui';
    }
    this.renderer.render(this.cena, this.camera);
  }
}
