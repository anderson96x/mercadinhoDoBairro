import * as THREE from 'three';

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

// Somente cenário: estas peças não entram em estoque, receitas ou pedidos.
export function construirBalcoesDecorados(grupo, balcoes, { caixa, esfera }) {
  const subdividir = mesh => {
    if (mesh.geometry?.type !== 'BoxGeometry') return;
    const { width, height, depth } = mesh.geometry.parameters;
    if (Math.max(width, depth) < 0.7) return;
    // Faces menores mantêm os doces acima do tampo também no Canvas 2D.
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(width, height, depth, Math.ceil(width / 0.3), 1, Math.ceil(depth / 0.3));
  };
  const decoracao = new THREE.Group(); decoracao.name = 'decoracao-padaria';
  decoracao.userData.decorativo = true; grupo.add(decoracao);
  const massa = new THREE.MeshStandardMaterial({ color: 0xd99b4b, roughness: 0.88 });
  const coberturas = [0x573023, 0xe79bac, 0xf7e5b6].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.65 }));
  const anel = new THREE.TorusGeometry(0.105, 0.05, 6, 12);
  const cobertura = new THREE.TorusGeometry(0.105, 0.043, 6, 12);
  const meiaLua = new THREE.TorusGeometry(0.12, 0.065, 6, 10, Math.PI * 1.45);
  const doce = (pai, tipo, indice, x, z) => {
    const item = new THREE.Group(); item.position.set(x, 0.07, z); pai.add(item);
    item.name = ['donut-decorativo', 'croissant-decorativo', 'caracol-decorativo'][tipo];
    if (tipo === 0) {
      const base = new THREE.Mesh(anel, massa); base.rotation.x = Math.PI / 2; item.add(base);
      const glace = new THREE.Mesh(cobertura, coberturas[indice % 3]); glace.rotation.x = Math.PI / 2; glace.position.y = 0.035; item.add(glace);
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        const granulado = caixa(item, 0.035, 0.012, 0.014, i % 2 ? 0xfff1b7 : 0xb64f69, Math.cos(a) * 0.105, 0.08, Math.sin(a) * 0.105);
        granulado.rotation.y = a + 0.5;
      }
    } else if (tipo === 1) {
      const croissant = new THREE.Mesh(meiaLua, massa); croissant.rotation.x = Math.PI / 2; item.add(croissant);
      for (let i = 0; i < 3; i++) {
        const a = 0.65 + i * 0.8;
        const dobra = esfera(item, 0.06, 0xedbc75, Math.cos(a) * 0.12, 0.03, -Math.sin(a) * 0.12, 1, 0.7, 1.3);
        dobra.rotation.y = a;
      }
    } else {
      esfera(item, 0.145, 0xd99b4b, 0, 0, 0, 1, 0.5, 1);
      const curva = new THREE.CatmullRomCurve3(Array.from({ length: 25 }, (_, i) => {
        const a = i / 24 * Math.PI * 4, r = 0.01 + i / 24 * 0.11;
        return new THREE.Vector3(Math.cos(a) * r, 0.065, Math.sin(a) * r);
      }));
      item.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 24, 0.012, 4, false), coberturas[0]));
    }
  };
  balcoes.forEach((p, indice) => {
    const madeira = caixa(grupo, p.w, 0.9, p.d, 0x936238, p.x, 0.68, p.z);
    madeira.name = 'fechamento-madeira-padaria';
    caixa(grupo, p.w + 0.04, 0.1, p.d + 0.04, 0xf0e6d3, p.x, 1.18, p.z).name = 'tampo-balcao-padaria';
    caixa(grupo, p.w - 0.04, 0.08, p.d - 0.04, 0x684429, p.x, 0.27, p.z);
    const longitudinal = p.w >= p.d, comprimento = longitudinal ? p.w : p.d;
    const portas = Math.max(1, Math.floor(comprimento / 0.8));
    for (let i = 0; i < portas; i++) {
      const t = -comprimento / 2 + (i + 0.5) * comprimento / portas;
      for (const lado of [-1, 1]) {
        caixa(grupo, longitudinal ? comprimento / portas - 0.06 : 0.018, 0.69, longitudinal ? 0.018 : comprimento / portas - 0.06,
          0xa87545, p.x + (longitudinal ? t : lado * (p.w / 2 + 0.01)), 0.72, p.z + (longitudinal ? lado * (p.d / 2 + 0.01) : t));
      }
    }
    // Fundos e acesso ao trigo ficam livres de decoração.
    if (p.decoracao === false) return;
    const expositor = new THREE.Group(); expositor.name = 'expositor-doces';
    expositor.position.set(p.x, 0, p.z);
    if (!longitudinal) expositor.rotation.y = Math.PI / 2;
    decoracao.add(expositor);
    criarVitrineCurva(expositor, { w: comprimento - 0.08, d: (longitudinal ? p.d : p.w) - 0.04, base: 1.23, altura: 0.85, niveis: [1.27, 1.63] }, { caixa });
    const bandejas = Math.max(1, Math.floor((comprimento - 0.4) / 1.05));
    for (let nivel = 0; nivel < 2; nivel++) {
    for (let i = 0; i < bandejas; i++) {
      const t = (i - (bandejas - 1) / 2) * 1.05;
      const bandeja = new THREE.Group(); bandeja.name = 'bandeja-doces-decorativos';
      bandeja.position.set(t, 1.305 + nivel * 0.36, -0.025);
      bandeja.scale.set(0.9, 0.9, 0.72);
      expositor.add(bandeja);
      caixa(bandeja, 0.88, 0.035, 0.39, 0x665247, 0, 0, 0);
      caixa(bandeja, 0.83, 0.012, 0.35, 0xf6eedc, 0, 0.025, 0);
      for (let j = 0; j < 3; j++) doce(bandeja, ((p.variedade ?? indice) + i + nivel) % 3, j + i, (j - 1) * 0.27, 0);
    }
    }
  });
  grupo.traverse(subdividir);
  return decoracao;
}
