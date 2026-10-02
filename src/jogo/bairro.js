import * as THREE from 'three';
import { PALETAS } from './personalizacao.js';
import { ALA_PRODUCAO, ALA_LEITE, ALA_TRIGO, ALA_PADARIA, ALA_ARTESANAL } from './configuracao.js';

// As mesmas paredes orientam a geometria e as colisões. A fachada é cortada para revelar a loja.
export const PAREDES_LOJA = [
  { x: 3, z: -6, w: 12.2, d: 0.28, h: 2.8 },
  { x: 9.1, z: 0.35, w: 0.28, d: 12.7, h: 0.75, lateral: true },
  { x: -3.1, z: -3.4, w: 0.28, d: 5.2, h: 2.8 },
  { x: -3.1, z: 4.45, w: 0.28, d: 4.5, h: 2.8 },
  { x: 4.65, z: 6.7, w: 8.9, d: 0.28, h: 0.65 }
];

export const PAREDES_ESCRITORIO = [
  { x: 1.1, z: -4, w: 0.18, d: 4, h: 1.45 },
  { x: -2.25, z: -2, w: 1.7, d: 0.18, h: 1.45 },
  { x: 0.55, z: -2, w: 1.1, d: 0.18, h: 1.45 }
];
export const PORTA_ESCRITORIO = { x: -0.7, z: -2, w: 1.4, d: 0.12 };
export const POSICAO_PORTA_ESCRITORIO = { fechada: -1.4, aberta: -2.75 };
export const ANGULOS_PORTAS_ENTRADA = {
  fechadas: { esquerda: 0, direita: 0 },
  abertas: { esquerda: -Math.PI / 2, direita: Math.PI / 2 }
};

export function posicaoPortaEscritorio(abertura) {
  const t = THREE.MathUtils.smoothstep(abertura, 0, 1);
  return THREE.MathUtils.lerp(POSICAO_PORTA_ESCRITORIO.fechada, POSICAO_PORTA_ESCRITORIO.aberta, t);
}

export function angulosPortasEntrada(abertura) {
  const t = THREE.MathUtils.smoothstep(abertura, 0, 1);
  return {
    esquerda: THREE.MathUtils.lerp(ANGULOS_PORTAS_ENTRADA.fechadas.esquerda, ANGULOS_PORTAS_ENTRADA.abertas.esquerda, t),
    direita: THREE.MathUtils.lerp(ANGULOS_PORTAS_ENTRADA.fechadas.direita, ANGULOS_PORTAS_ENTRADA.abertas.direita, t)
  };
}

export const MOBILIARIO_LOJA = [
  { x: -0.8, z: -4.6, w: 2.7, d: 0.85 },
  { x: -2.65, z: -4.4, w: 0.45, d: 1.7 }
];

// Objetos baixos ou estreitos da calçada também precisam participar da
// navegação dos clientes, mesmo sem formarem paredes da loja.
export const MOBILIARIO_CALCADA = [
  ...[-7.8, 10.8].map(x => ({ x, z: 8.4, w: 0.18, d: 0.18 })),
  ...[1.4, 6.2, 10.5].map(x => ({ x, z: 7.4, w: 1.1, d: 0.55 }))
];

export const RUA = Object.freeze({
  minX: -15, maxX: 18,
  faixas: Object.freeze([
    Object.freeze({ z: 10.35, direcao: -1 }),
    Object.freeze({ z: 12.55, direcao: 1 })
  ])
});

function criarDetalhesGrama(grupo) {
  // Posicoes fixas deixam a paisagem igual em cada carregamento.
  let semente = 4187;
  const aleatorio = () => ((semente = (1664525 * semente + 1013904223) >>> 0) / 4294967296);
  const faixas = [
    { x: [-11.1, -10.3], z: [-9.3, 5.8], quantidade: 18 },
    { x: [-6.8, -4.3], z: [-9.2, 5.8], quantidade: 28 },
    { x: [-2.4, 11.5], z: [-9.4, -7.4], quantidade: 24 },
    { x: [-12.4, 16.5], z: [-16.2, -10.5], quantidade: 62 },
    { x: [9.4, 12.6], z: [-5.2, 5.5], quantidade: 30 },
    { x: [12.8, 14.8], z: [-8.7, 6.1], quantidade: 22 }
  ];
  const cores = [0x398f43, 0x84c85c, 0xa5d76c];
  const vertices = cores.map(() => []);
  for (const faixa of faixas) {
    for (let i = 0; i < faixa.quantidade; i++) {
      const x = faixa.x[0] + aleatorio() * (faixa.x[1] - faixa.x[0]);
      const z = faixa.z[0] + aleatorio() * (faixa.z[1] - faixa.z[0]);
      const altura = 0.16 + aleatorio() * 0.12;
      const pontos = vertices[Math.floor(aleatorio() * cores.length)];
      for (let folha = 0; folha < 3; folha++) {
        const angulo = folha * Math.PI * 2 / 3 + aleatorio() * 0.4;
        const dx = Math.cos(angulo), dz = Math.sin(angulo);
        const largura = 0.055 + aleatorio() * 0.025;
        pontos.push(
          x - dx * largura, -0.045, z - dz * largura,
          x + dx * largura, -0.045, z + dz * largura,
          x + dx * altura * 0.45, -0.045 + altura, z + dz * altura * 0.45
        );
      }
    }
  }
  vertices.forEach((pontos, i) => {
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(pontos, 3));
    geometria.computeVertexNormals();
    const malha = new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ color: cores[i], side: THREE.DoubleSide, roughness: 1 }));
    malha.receiveShadow = true;
    grupo.add(malha);
  });
}

export function construirBairro(cena, { caixa, cilindro, esfera }) {
  const grupo = new THREE.Group(); cena.add(grupo);
  let destino = grupo;
  const materiais = [];
  const bloco = (w, h, d, cor, x, y, z, papel) => {
    const m = caixa(destino, w, h, d, cor, x, y, z);
    if (papel) {
      m.material = m.material.clone();
      materiais.push({ material: m.material, papel: typeof papel === 'string' ? papel : papel.nome, tom: papel.tom || 0 });
    }
    return m;
  };
  const chao = (camada, ...args) => { const m = bloco(...args); m.userData.fundo = camada; return m; };
  const rodape = p => bloco(
    p.w + (p.d > p.w ? 0.035 : 0), 0.22,
    p.d + (p.w >= p.d ? 0.035 : 0),
    0x286750, p.x, 0.34, p.z, 'principal'
  );
  chao(0, 120, 0.3, 120, 0x78c85a, 0, -0.5, 0);
  // O terreno inteiro existe desde o início; as construções ocupam espaço nele depois.
  chao(1, 35, 0.3, 32, 0x62b94b, 1.5, -0.2, -1.5);
  // Manchas suaves quebram o tapete verde sem criar obstaculos no terreno.
  for (const [x, z, rx, rz, cor] of [
    [-10.8, -8.4, 1.2, 0.7, 0x69bd4f], [-5.3, -4.8, 1.1, 0.6, 0x67b94d],
    [-10.7, 0.4, 1.1, 0.6, 0x6abe50], [-5.2, 4.8, 1.2, 0.65, 0x63b64b],
    [12.9, -8.3, 1.1, 0.6, 0x6abe50], [13.6, 3.1, 1, 0.65, 0x63b64b],
    [1.1, -8.4, 1.4, 0.55, 0x6abe50], [8.1, -8.5, 1.4, 0.55, 0x63b64b],
    [-5.5, -13.5, 1.4, 0.7, 0x69bd4f], [10.4, -13.2, 1.5, 0.65, 0x67b94d]
  ]) {
    const mancha = new THREE.Mesh(new THREE.CircleGeometry(1, 9), new THREE.MeshStandardMaterial({ color: cor, roughness: 1, side: THREE.DoubleSide }));
    mancha.rotation.x = -Math.PI / 2;
    mancha.rotation.z = x * 0.2;
    mancha.scale.set(rx, rz, 1);
    mancha.position.set(x, -0.046, z);
    mancha.userData.fundo = 2;
    grupo.add(mancha);
  }
  criarDetalhesGrama(grupo);
  chao(2, 35, 0.08, 4.4, 0x48525e, 1.5, 0, 11.3);
  chao(3, 35, 0.18, 2.5, 0xe0bc8c, 1.5, 0.04, 7.95);
  bloco(35, 0.22, 0.16, 0xf3e5ce, 1.5, 0.07, 9.18);
  for (let x = -14; x < 18; x += 2.5) chao(4, 1.2, 0.012, 0.1, 0xf2e7c9, x, 0.049, 11.6);
  // A faixa atravessa a rua inteira, de uma calçada à outra.
  for (let z = 9.5; z < 13.5; z += 0.35) chao(4, 2.2, 0.012, 0.18, 0xf7eddb, -1.3, 0.052, z);
  for (let x = -14.5; x < 18; x += 0.8) chao(4, 0.016, 0.01, 2.35, 0xbeb19a, x, 0.135, 7.95);
  for (const z of [7.25, 7.95, 8.65]) chao(4, 35, 0.01, 0.015, 0xbeb19a, 1.5, 0.136, z);
  for (let i = 0; i < 38; i++) {
    if (i % 3 !== 1) continue;
    const x = -14.7 + i * 0.8;
    for (const z of [7.6, 8.3]) chao(4, 0.77, 0.004, 0.67, 0xe7c89e, x, 0.133, z);
  }
  const decorarPiso = (primeiraColuna, colunas) => {
    for (let i = 0; i < colunas; i++) {
      for (let j = 0; j < 10; j++) {
        if ((i + j * 2) % 3 === 0) {
          chao(4, 1.16, 0.004, 1.16, 0xe7dfcd, primeiraColuna + i * 1.2, 0.227, -5.2 + j * 1.2, { nome: 'piso', tom: 0.025 });
        }
      }
    }
  };
  // Os pisos se encontram em x = 9.1, com a mesma altura e malha de azulejos.
  chao(3, 12.2, 0.2, 12.7, 0xc4b9a5, 3, 0.06, 0.35);
  chao(4, 12.2, 0.07, 12.4, 0xe3dcc8, 3, 0.19, 0.35, 'piso');
  decorarPiso(-2.2, 9);
  for (let x = -2.8; x < 9; x += 1.2) chao(5, 0.018, 0.008, 12.35, 0xc8bfae, x, 0.23, 0.35);
  for (let z = -5.8; z < 6.6; z += 1.2) chao(5, 12.2, 0.008, 0.018, 0xc8bfae, 3, 0.23, z);
  const area = ALA_PRODUCAO.piso;
  const ala = new THREE.Group(); grupo.add(ala); destino = ala;
  ala.name = 'ala-producao';
  ala.visible = false;
  chao(3, area.w, 0.2, area.d, 0xc4b9a5, area.x, 0.06, area.z);
  chao(4, area.w, 0.07, 12.4, 0xe3dcc8, area.x, 0.19, area.z, 'piso');
  decorarPiso(9.8, 2);
  for (let x = 9.2; x < 12.1; x += 1.2) chao(5, 0.018, 0.008, 12.35, 0xc8bfae, x, 0.23, area.z);
  for (let z = -5.8; z < 6.6; z += 1.2) chao(5, area.w, 0.008, 0.018, 0xc8bfae, area.x, 0.23, z);
  const paredesAla = new THREE.Group(); ala.add(paredesAla); destino = paredesAla;
  const paredeLateralOvos = new THREE.Group(); paredesAla.add(paredeLateralOvos);
  const passagemArtesanal = new THREE.Group(); paredesAla.add(passagemArtesanal);
  passagemArtesanal.name = 'parede-passagem-artesanal';
  for (const p of ALA_PRODUCAO.paredes) {
    destino = p.z === -6 ? passagemArtesanal : p.x === 12.1 ? paredeLateralOvos : paredesAla;
    bloco(p.w, p.h, p.d, 0xf1ead7, p.x, 0.23 + p.h / 2, p.z, 'parede');
    bloco(p.w + 0.04, 0.1, p.d + 0.04, 0x286750, p.x, p.h + 0.23, p.z, 'principal');
    if (p.z !== 6.7) rodape(p);
  }
  const areaLeite = ALA_LEITE.piso;
  const alaLeite = new THREE.Group(); grupo.add(alaLeite); destino = alaLeite;
  alaLeite.name = 'ala-leite'; alaLeite.visible = false;
  chao(3, areaLeite.w, 0.2, areaLeite.d, 0xc4b9a5, areaLeite.x, 0.06, areaLeite.z);
  chao(4, areaLeite.w, 0.07, 12.4, 0xe3dcc8, areaLeite.x, 0.19, areaLeite.z, 'piso');
  decorarPiso(12.8, 2);
  for (let x = 12.2; x < 15.1; x += 1.2) chao(5, 0.018, 0.008, 12.35, 0xc8bfae, x, 0.23, areaLeite.z);
  for (let z = -5.8; z < 6.6; z += 1.2) chao(5, areaLeite.w, 0.008, 0.018, 0xc8bfae, areaLeite.x, 0.23, z);
  const paredesAlaLeite = new THREE.Group(); alaLeite.add(paredesAlaLeite); destino = paredesAlaLeite;
  const paredeLateralLeite = new THREE.Group(); paredesAlaLeite.add(paredeLateralLeite);
  for (const p of ALA_LEITE.paredes) {
    destino = p.x === 15.1 ? paredeLateralLeite : paredesAlaLeite;
    bloco(p.w, p.h, p.d, 0xf1ead7, p.x, 0.23 + p.h / 2, p.z, 'parede');
    bloco(p.w + 0.04, 0.1, p.d + 0.04, 0x286750, p.x, p.h + 0.23, p.z, 'principal');
    if (p.z !== 6.7) rodape(p);
  }
  const areaTrigo = ALA_TRIGO.piso;
  const alaTrigo = new THREE.Group(); grupo.add(alaTrigo); destino = alaTrigo;
  alaTrigo.name = 'ala-trigo'; alaTrigo.visible = false;
  chao(3, areaTrigo.w, 0.2, areaTrigo.d, 0xc4b9a5, areaTrigo.x, 0.06, areaTrigo.z);
  chao(4, areaTrigo.w, 0.07, 12.4, 0xe3dcc8, areaTrigo.x, 0.19, areaTrigo.z, 'piso');
  decorarPiso(15.8, 2);
  for (let x = 15.2; x < 18.1; x += 1.2) chao(5, 0.018, 0.008, 12.35, 0xc8bfae, x, 0.23, areaTrigo.z);
  for (let z = -5.8; z < 6.6; z += 1.2) chao(5, areaTrigo.w, 0.008, 0.018, 0xc8bfae, areaTrigo.x, 0.23, z);
  const paredesAlaTrigo = new THREE.Group(); alaTrigo.add(paredesAlaTrigo); destino = paredesAlaTrigo;
  for (const p of ALA_TRIGO.paredes) {
    bloco(p.w, p.h, p.d, 0xf1ead7, p.x, 0.23 + p.h / 2, p.z, 'parede');
    bloco(p.w + 0.04, 0.1, p.d + 0.04, 0x286750, p.x, p.h + 0.23, p.z, 'principal');
    if (p.z !== 6.7) rodape(p);
  }
  const artesanal = new THREE.Group(); grupo.add(artesanal); destino = artesanal;
  artesanal.name = 'ala-artesanal'; artesanal.visible = false;
  const areaArtesanal = ALA_ARTESANAL.piso;
  chao(3, areaArtesanal.w, 0.2, areaArtesanal.d, 0xc4b9a5, areaArtesanal.x, 0.06, areaArtesanal.z);
  chao(4, areaArtesanal.w, 0.07, areaArtesanal.d, 0xe9e2ce, areaArtesanal.x, 0.19, areaArtesanal.z, 'piso');
  for (let x = 9.2; x < 18; x += 1.2) chao(5, 0.018, 0.008, 9.4, 0xc8bfae, x, 0.23, areaArtesanal.z);
  for (let z = -15.4; z < -6; z += 1.2) chao(5, 8.9, 0.008, 0.018, 0xc8bfae, areaArtesanal.x, 0.23, z);
  for (const p of ALA_ARTESANAL.paredes) {
    bloco(p.w, p.h, p.d, 0xf1ead7, p.x, 0.23 + p.h / 2, p.z, 'parede');
    bloco(p.w + 0.04, 0.1, p.d + 0.04, 0x286750, p.x, p.h + 0.23, p.z, 'principal');
  }
  for (const x of [9.25, 11.95]) bloco(0.12, 2.3, 0.2, 0x286750, x, 1.38, -6, 'principal');
  bloco(2.82, 0.28, 0.22, 0xe7b65a, 10.6, 2.6, -6, 'destaque');
  const lateral = new THREE.Group(); grupo.add(lateral);
  const andaime = new THREE.Group(); grupo.add(andaime); destino = andaime;
  andaime.name = 'andaime';
  andaime.visible = false;
  for (const z of [-5.5, -1.5, 2.5, 6.3]) {
    bloco(0.09, 3.2, 0.09, 0x849296, 12.35, 1.8, z);
    bloco(0.65, 0.08, 0.5, 0xc79765, 12.35, 1.3, z);
  }
  for (const y of [1.25, 2.65]) bloco(0.08, 0.08, 11.8, 0xe7b65a, 12.35, y, 0.4);
  const andaimeLeite = andaime.clone(); grupo.add(andaimeLeite);
  andaimeLeite.name = 'andaime-leite'; andaimeLeite.position.x = 3; andaimeLeite.visible = false;
  const andaimeTrigo = andaime.clone(); grupo.add(andaimeTrigo);
  andaimeTrigo.name = 'andaime-trigo'; andaimeTrigo.position.x = 6; andaimeTrigo.visible = false;
  destino = grupo;
  for (const p of [...PAREDES_LOJA, ...PAREDES_ESCRITORIO]) {
    destino = p.lateral ? lateral : grupo;
    bloco(p.w, p.h, p.d, 0xf1ead7, p.x, 0.23 + p.h / 2, p.z, 'parede');
    bloco(p.w + 0.04, 0.1, p.d + 0.04, 0x286750, p.x, p.h + 0.23, p.z, 'principal');
    if (p.z !== 6.7) rodape(p);
  }
  destino = grupo;
  // Um único rodapé acompanha a fachada durante a expansão, sem emenda em x = 9.1.
  const rodapeFrontal = rodape(PAREDES_LOJA.find(p => p.z === 6.7));
  rodapeFrontal.name = 'rodape-frontal';
  // Porta de serviço aberta para a horta lateral.
  for (const z of [-0.8, 2.2]) bloco(0.34, 2.9, 0.14, 0x286750, -3.1, 1.68, z, 'principal');
  bloco(0.34, 0.22, 3.15, 0x286750, -3.1, 3.02, 0.7, 'principal');
  for (let x = -5; x < -3.3; x += 0.55) chao(3, 0.43, 0.06, 1.6, 0xd6c7ac, x, 0.16, 0.7);
  // Escritório no canto esquerdo, com paredes e porta à meia altura para manter o interior visível.
  chao(6, 3.85, 0.012, 3.8, 0xd5c2d5, -1, 0.241, -3.95);
  for (const x of [-1.4, 0]) bloco(0.09, 1.25, 0.23, 0x286750, x, 0.855, -2, 'principal');
  const porta = new THREE.Group(); porta.position.set(POSICAO_PORTA_ESCRITORIO.fechada, 0.23, -2); grupo.add(porta); destino = porta;
  bloco(1.32, 1.22, 0.09, 0x286750, 0.7, 0.61, 0, 'principal');
  bloco(1.1, 0.72, 0.015, 0xa8c7c9, 0.7, 0.72, 0.053);
  bloco(1.1, 0.72, 0.015, 0xa8c7c9, 0.7, 0.72, -0.053);
  for (const z of [-0.1, 0.1]) bloco(0.18, 0.045, 0.08, 0xe7b65a, 1.14, 0.55, z, 'destaque');
  destino = grupo;
  bloco(2.7, 0.14, 0.85, 0xbc8752, -0.8, 1.02, -4.6);
  for (const x of [-1.9, 0.3]) bloco(0.35, 0.72, 0.65, 0xa87244, x, 0.6, -4.6);
  bloco(1.02, 0.72, 0.08, 0x414846, -0.7, 1.48, -4.72);
  const telaComputador = bloco(0.88, 0.57, 0.015, 0x94b7b5, -0.7, 1.5, -4.675);
  telaComputador.material = telaComputador.material.clone();
  bloco(0.1, 0.2, 0.12, 0x414846, -0.7, 1.16, -4.72);
  bloco(0.6, 0.035, 0.2, 0x606b67, -0.7, 1.11, -4.34);
  bloco(0.55, 0.12, 0.55, 0x777d82, -0.9, 0.63, -3.5);
  bloco(0.55, 0.55, 0.1, 0x777d82, -0.9, 0.95, -3.24);
  cilindro(grupo, 0.07, 0.12, 0.4, 0x555b60, -0.9, 0.42, -3.5);
  bloco(0.45, 1.6, 1.7, 0x8c613d, -2.65, 1.03, -4.4);
  for (let i = 0; i < 3; i++) {
    bloco(0.045, 0.07, 1.6, 0xc79765, -2.4, 0.55 + i * 0.49, -4.4);
    for (let j = 0; j < 5; j++) bloco(0.13, 0.3, 0.17, [0x78998a,0xd8b57d,0xc67e64][j % 3], -2.39, 0.75 + i * 0.49, -5.05 + j * 0.28);
  }
  for (const [x,z] of [[-2.3,-2.3],[0.2,-4.6]]) {
    cilindro(grupo, 0.15, 0.11, 0.25, 0xc07a42, x, z === -4.6 ? 1.22 : 0.36, z);
    esfera(grupo, 0.25, 0x4bb356, x, z === -4.6 ? 1.5 : 0.65, z, 0.8, 1.3, 0.8);
  }
  // Vitrine e portas duplas que abrem quando um cliente atravessa o vão.
  const entrada = new THREE.Group(); entrada.position.x = -8.82; grupo.add(entrada); destino = entrada;
  for (const x of [6, 9.05]) {
    bloco(0.12, 2.6, 0.18, 0x286750, x, 1.53, 6.7, 'principal');
    bloco(0.45, 2.2, 0.055, 0xb5d6d9, x + (x === 6 ? 0.28 : -0.28), 1.43, 6.72);
    bloco(0.03, 0.7, 0.06, 0xf5eddc, x + (x === 6 ? 0.48 : -0.48), 1.4, 6.77);
  }
  const criarPortaEntrada = (x, direcao) => {
    const folha = new THREE.Group(); folha.position.set(x, 0, 6.71); entrada.add(folha); destino = folha;
    const centro = direcao * 0.715;
    bloco(1.38, 2.3, 0.035, 0xa8c7c9, centro, 1.43, 0);
    for (const borda of [0, direcao * 1.43]) bloco(0.07, 2.4, 0.08, 0x286750, borda, 1.43, 0, 'principal');
    for (const y of [0.25, 2.61]) bloco(1.45, 0.08, 0.08, 0x286750, centro, y, 0, 'principal');
    destino = entrada; return folha;
  };
  const portaEntradaEsquerda = criarPortaEntrada(6.08, 1);
  const portaEntradaDireita = criarPortaEntrada(8.97, -1);
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
      esfera(grupo, 0.24, 0x47b452, x - 0.32 + i * 0.32, 0.68, 7.4);
      esfera(grupo, 0.085, 0xffbd35, x - 0.32 + i * 0.32, 0.89, 7.4);
    }
  }
  // Cerca e árvores enquadram a área de cultivo.
  for (let z = -15.8; z <= 6; z += 1.3) {
    bloco(0.13, 0.9, 0.13, 0xa8733f, -11.6, 0.5, z);
    bloco(0.1, 0.12, 1.35, 0xd29a5b, -11.6, 0.7, z + 0.62);
  }
  const arvoreLateral = new THREE.Group(); grupo.add(arvoreLateral);
  for (const [indice, [x,z]] of [[-12.4,-6.2],[-12.4,4.7],[13.8,-5.4]].entries()) {
    const arvores = x > 0 ? arvoreLateral : grupo;
    const arvore = new THREE.Group(); arvore.position.set(x, 0, z); arvores.add(arvore);
    const escala = [1, 0.91, 1.06][indice]; arvore.scale.setScalar(escala);
    cilindro(arvore, 0.16, 0.27, 1.76, 0x865834, 0, 0.84, 0, 9);
    cilindro(arvore, 0.12, 0.17, 1.1, 0xa37143, -0.055, 0.99, 0.13, 8);
    for (const [lado, frente] of [[-1, 0.2], [1, -0.16]]) {
      const galho = cilindro(arvore, 0.07, 0.12, 1.05, 0x865834, lado * 0.31, 1.55, frente, 7);
      galho.rotation.z = lado * 0.72;
    }
    esfera(arvore, 0.98, 0x2f8840, 0, 2.06, 0, 1.22, 0.78, 1.08);
    for (const [px, py, pz, raio, cor] of [
      [-0.61, 2.24, 0.04, 0.73, 0x389b49],
      [0.57, 2.22, -0.12, 0.78, 0x43a64d],
      [-0.13, 2.59, -0.37, 0.79, 0x51b456],
      [0.15, 2.56, 0.37, 0.75, 0x49a94b],
      [-0.43, 2.78, 0.27, 0.49, 0x6fc762],
      [0.45, 2.78, 0.03, 0.46, 0x79ca65]
    ]) esfera(arvore, raio, cor, px, py, pz, 1, 0.82, 0.92);
  }
  for (const x of [-7.8, 10.8]) {
    cilindro(grupo, 0.055, 0.075, 2.8, 0x45544e, x, 1.55, 8.4);
    bloco(0.35, 0.3, 0.35, 0xffe1a0, x, 3, 8.4);
    bloco(0.45, 0.09, 0.45, 0x45544e, x, 3.2, 8.4);
  }
  let anterior;
  let estagioAnterior, progresso = 1;
  return {
    atualizarEstagio(estagio, dt = 0) {
      if (estagioAnterior !== undefined && estagio > estagioAnterior) progresso = 0;
      estagioAnterior = estagio;
      const duracao = estagio >= ALA_TRIGO.indice ? ALA_TRIGO.duracaoConstrucao : estagio >= ALA_LEITE.indice ? ALA_LEITE.duracaoConstrucao : ALA_PRODUCAO.duracaoConstrucao;
      progresso = Math.min(1, progresso + dt / duracao);
      const progressoOvos = estagio >= ALA_LEITE.indice ? 1 : progresso;
      const piso = THREE.MathUtils.smoothstep(progressoOvos, 0, 0.5);
      const paredes = THREE.MathUtils.smoothstep(progressoOvos, 0.35, 0.8);
      const equipamentos = THREE.MathUtils.smoothstep(progresso, 0.7, 1);
      const progressoLeite = estagio >= ALA_TRIGO.indice ? 1 : progresso;
      const pisoLeite = THREE.MathUtils.smoothstep(progressoLeite, 0, 0.5);
      const progressoTrigo = estagio >= ALA_PADARIA.indice ? 1 : progresso;
      const pisoTrigo = THREE.MathUtils.smoothstep(progressoTrigo, 0, 0.5);
      artesanal.visible = estagio >= ALA_ARTESANAL.indice;
      artesanal.scale.y = Math.max(0.001, THREE.MathUtils.smoothstep(progresso, 0, 0.8));
      passagemArtesanal.visible = estagio < ALA_ARTESANAL.indice;
      ala.visible = !!estagio;
      ala.scale.x = Math.max(0.001, piso);
      ala.position.x = 9.1 * (1 - ala.scale.x);
      paredesAla.scale.y = Math.max(0.001, paredes);
      paredeLateralOvos.visible = estagio === ALA_PRODUCAO.indice || (estagio === ALA_LEITE.indice && progresso < 0.8);
      paredeLateralOvos.position.x = estagio >= ALA_LEITE.indice ? areaLeite.w * pisoLeite : 0;
      alaLeite.visible = estagio >= ALA_LEITE.indice;
      alaLeite.scale.x = Math.max(0.001, pisoLeite);
      alaLeite.position.x = 12.1 * (1 - alaLeite.scale.x);
      paredesAlaLeite.scale.y = Math.max(0.001, THREE.MathUtils.smoothstep(progressoLeite, 0.35, 0.8));
      paredeLateralLeite.visible = estagio === ALA_LEITE.indice || (estagio === ALA_TRIGO.indice && progresso < 0.8);
      paredeLateralLeite.position.x = estagio >= ALA_TRIGO.indice ? areaTrigo.w * pisoTrigo : 0;
      alaTrigo.visible = estagio >= ALA_TRIGO.indice;
      alaTrigo.scale.x = Math.max(0.001, pisoTrigo);
      alaTrigo.position.x = 15.1 * (1 - alaTrigo.scale.x);
      paredesAlaTrigo.scale.y = Math.max(0.001, THREE.MathUtils.smoothstep(progressoTrigo, 0.35, 0.8));
      lateral.visible = !estagio || (estagio === ALA_PRODUCAO.indice && progresso < 0.8);
      lateral.position.x = estagio ? area.w * piso : 0;
      const largura = (estagio ? area.w * piso : 0) + (estagio >= ALA_LEITE.indice ? areaLeite.w * pisoLeite : 0) + (estagio >= ALA_TRIGO.indice ? areaTrigo.w * pisoTrigo : 0);
      rodapeFrontal.scale.x = 1 + largura / 8.9;
      rodapeFrontal.position.x = 4.65 + largura / 2;
      andaime.visible = estagio === ALA_PRODUCAO.indice && progresso > 0 && progresso < 0.95;
      andaime.position.x = -area.w * (1 - piso);
      andaime.scale.y = 1 - THREE.MathUtils.smoothstep(progresso, 0.8, 0.95);
      andaimeLeite.visible = estagio === ALA_LEITE.indice && progresso > 0 && progresso < 0.95;
      andaimeLeite.position.x = 3 - areaLeite.w * (1 - pisoLeite);
      andaimeLeite.scale.y = 1 - THREE.MathUtils.smoothstep(progresso, 0.8, 0.95);
      andaimeTrigo.visible = estagio === ALA_TRIGO.indice && progresso > 0 && progresso < 0.95;
      andaimeTrigo.position.x = 6 - areaTrigo.w * (1 - pisoTrigo);
      andaimeTrigo.scale.y = 1 - THREE.MathUtils.smoothstep(progresso, 0.8, 0.95);
      arvoreLateral.position.x = estagio >= ALA_LEITE.indice ? 3 * pisoLeite : 0;
      arvoreLateral.visible = estagio < ALA_TRIGO.indice;
      return estagio ? equipamentos : 0;
    },
    animarPorta(abertura) {
      porta.position.x = posicaoPortaEscritorio(abertura);
    },
    animarEntrada(abertura, lojaAberta) {
      const angulos = angulosPortasEntrada(abertura);
      portaEntradaEsquerda.rotation.y = angulos.esquerda;
      portaEntradaDireita.rotation.y = angulos.direita;
    },
    animarComputador(ativo, tempo) {
      telaComputador.material.emissive.set(ativo ? 0x5c9d91 : 0x000000);
      telaComputador.material.emissiveIntensity = ativo ? 0.45 + Math.sin(tempo * 3) * 0.08 : 0;
    },
    vincular(mesh, papel) {
      mesh.material = mesh.material.clone(); materiais.push({ material: mesh.material, papel }); anterior = undefined;
    },
    aplicar(dados) {
      const chave = dados.paleta; if (chave === anterior) return; anterior = chave;
      const paleta = PALETAS.find(p => p.id === dados.paleta) || PALETAS[0];
      for (const { material, papel, tom = 0 } of materiais) material.color.set(paleta[papel]).offsetHSL(0, 0, tom);
    }
  };
}
