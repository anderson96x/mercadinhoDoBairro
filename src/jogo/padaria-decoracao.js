import { CONFEITARIA } from './confeitaria.js';
import { criarDoceConfeitaria } from './doces-confeitaria.js';
import * as THREE from 'three';

export function criarBandejaRecebimento(pai, { caixa }) {
  const bandeja = new THREE.Group(); pai.add(bandeja);
  caixa(bandeja, 1.06, 0.07, 1.6, 0x684429, 0, 0, 0);
  caixa(bandeja, 0.94, 0.025, 1.48, 0xe2bc7d, 0, 0.05, 0);
  for (const x of [-0.5, 0.5]) caixa(bandeja, 0.06, 0.16, 1.6, 0x936238, x, 0.1, 0);
  for (const z of [-0.77, 0.77]) caixa(bandeja, 1.06, 0.16, 0.06, 0x936238, 0, 0.1, z);
  bandeja.scale.set(0.5, 0.8, 0.5);
  return bandeja;
}

// Frente curva em +z, prateleiras internas e laterais de madeira.
export function criarVitrineCurva(pai, { w, d, base, altura, niveis }, { caixa }) {
  const grupo = new THREE.Group(); grupo.name = 'vitrine-curva'; pai.add(grupo);
  const vidro = new THREE.MeshPhysicalMaterial({ color: 0xb8dce9, transparent: true, opacity: 0.24, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide });
  const perfil = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    return { y: base + altura * t, z: d / 2 - 0.025 - d * 0.32 * t * t };
  });
  const vertices = [];
  for (let i = 0; i < perfil.length - 1; i++) {
    const a = perfil[i], b = perfil[i + 1], x = w / 2 - 0.04;
    vertices.push(-x,a.y,a.z, x,a.y,a.z, x,b.y,b.z, -x,a.y,a.z, x,b.y,b.z, -x,b.y,b.z);
  }
  const geometria = new THREE.BufferGeometry(); geometria.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometria.computeVertexNormals();
  const frente = new THREE.Mesh(geometria, vidro); frente.name = 'vidro-curvo'; grupo.add(frente);
  const topo = perfil.at(-1), fundo = -d / 2 + 0.025;
  const tampo = caixa(grupo, w - 0.08, 0.025, topo.z - fundo, 0xd9edf1, 0, topo.y, (topo.z + fundo) / 2);
  tampo.material = vidro; tampo.name = 'tampo-vitrine';
  const traseira = caixa(grupo, w - 0.08, altura, 0.018, 0xb8dce9, 0, base + altura / 2, fundo);
  traseira.material = vidro; traseira.name = 'vidro-traseiro';
  for (const [y, z] of [[base, perfil[0].z], [topo.y, topo.z], [topo.y, fundo]]) {
    caixa(grupo, w - 0.04, 0.035, 0.035, 0x83979e, 0, y, z);
  }
  for (const y of niveis) {
    const prateleira = caixa(grupo, w - 0.12, 0.035, d * 0.63, 0xe7e0cf, 0, y, -d * 0.08);
    prateleira.material = vidro;
    prateleira.name = 'prateleira-vitrine';
    caixa(grupo, w - 0.12, 0.025, 0.025, 0x9dabb0, 0, y + 0.01, d * 0.235);
  }
  const perfilMadeira = new THREE.Shape(); perfilMadeira.moveTo(fundo, base);
  for (const p of perfil) perfilMadeira.lineTo(p.z, p.y);
  perfilMadeira.lineTo(fundo, topo.y); perfilMadeira.closePath();
  const lateral = new THREE.ExtrudeGeometry(perfilMadeira, { depth: 0.045, bevelEnabled: false });
  for (const lado of [-1, 1]) {
    const painel = new THREE.Mesh(lateral, new THREE.MeshStandardMaterial({ color: 0x936238, roughness: 0.85 }));
    painel.rotation.y = -Math.PI / 2; painel.position.x = lado * (w / 2 - 0.03) + 0.0225; grupo.add(painel);
    const linha = new THREE.CatmullRomCurve3(perfil.map(p => new THREE.Vector3(lado * (w / 2 - 0.035), p.y, p.z)));
    grupo.add(new THREE.Mesh(new THREE.TubeGeometry(linha, 12, 0.018, 4, false), new THREE.MeshStandardMaterial({ color: 0x9dabb0 })));
  }
  return grupo;
}

// Os tampos existem desde o N9; somente as vitrines e os doces dependem da confeitaria.
export function construirBalcoesDecorados(grupo, balcoes, { caixa }) {
  const vitrines = new THREE.Group(); vitrines.name = 'vitrines-confeitaria';
  vitrines.visible = false; grupo.add(vitrines);
  const produtos = {};
  balcoes.forEach(p => {
    caixa(grupo, p.w, 0.9, p.d, 0x936238, p.x, 0.68, p.z).name = 'fechamento-madeira-padaria';
    const tampo = caixa(grupo, p.w + 0.04, 0.1, p.d + 0.04, 0xf0e6d3, p.x, 1.18, p.z);
    tampo.name = 'tampo-balcao-padaria';
    tampo.geometry.dispose();
    tampo.geometry = new THREE.BoxGeometry(p.w + 0.04, 0.1, p.d + 0.04, Math.ceil(p.w / 0.3), 1, Math.ceil(p.d / 0.3));
    caixa(grupo, p.w - 0.04, 0.08, p.d - 0.04, 0x684429, p.x, 0.27, p.z);
    const longitudinal = p.w >= p.d, comprimento = longitudinal ? p.w : p.d;
    const portas = Math.max(1, Math.floor(comprimento / 0.8));
    for (let i = 0; i < portas; i++) {
      const t = -comprimento / 2 + (i + 0.5) * comprimento / portas;
      for (const lado of [-1, 1]) caixa(grupo, longitudinal ? comprimento / portas - 0.06 : 0.018, 0.69,
        longitudinal ? 0.018 : comprimento / portas - 0.06, 0xa87545,
        p.x + (longitudinal ? t : lado * (p.w / 2 + 0.01)), 0.72, p.z + (longitudinal ? lado * (p.d / 2 + 0.01) : t));
    }
  });
  for (const [id, produto] of Object.entries(CONFEITARIA.produtos)) {
    const p = balcoes[produto.balcao];
    const expositor = new THREE.Group(); expositor.name = 'expositor-' + id;
    expositor.position.set(p.x, 0, p.z);
    const longitudinal = p.w >= p.d, comprimento = longitudinal ? p.w : p.d;
    if (!longitudinal) expositor.rotation.y = Math.PI / 2;
    vitrines.add(expositor);
    criarVitrineCurva(expositor, { w: comprimento - 0.08, d: (longitudinal ? p.d : p.w) - 0.04,
      base: 1.23, altura: 0.85, niveis: [1.27, 1.63] }, { caixa });
    const colunas = produto.capacidade / 2;
    for (const y of [1.305, 1.665]) {
      caixa(expositor, comprimento - 0.2, 0.035, 0.4, 0x665247, 0, y, -0.025);
      caixa(expositor, comprimento - 0.25, 0.012, 0.35, 0xf6eedc, 0, y + 0.025, -0.025);
    }
    const frutas = Array.from({ length: produto.capacidade }, (_, i) => {
      const doce = criarDoceConfeitaria(id, i);
      doce.position.set((i % colunas - (colunas - 1) / 2) * ((comprimento - 0.35) / colunas), 1.35 + Math.floor(i / colunas) * 0.36, -0.025);
      doce.visible = false; expositor.add(doce); return doce;
    });
    produtos[id] = { grupo: expositor, frutos: [], frutas, galinhas: [] };
  }
  vitrines.userData.produtos = produtos;
  return vitrines;
}
