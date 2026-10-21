import * as THREE from 'three';
import { construirDeposito } from './deposito.js';
import { construirPatioCarga } from './patio-carga.js';
import { PLANTA_DEPOSITO, PLANTA_EXPANSAO, paredesExpansao, paredesOficinas, PLANTA_OFICINAS, oficinasConstruidas, PLANTA_INICIAL, PLANTA_ESTACIONAMENTO, paredesPlantaInicial } from './planta.js';
import { PALETAS } from './personalizacao.js';
import { CONFIG, PRODUTOS, ALTURA_PAREDE_BAIXA, ALA_PRODUCAO, ALA_LEITE, ALA_TRIGO, ALA_PADARIA } from './configuracao.js';

// As mesmas paredes orientam a geometria e as colisões. A fachada é cortada para revelar a loja.
export const PAREDES_LOJA = paredesPlantaInicial(ALTURA_PAREDE_BAIXA);

export const ANGULOS_PORTAS_ENTRADA = {
  fechadas: { esquerda: 0, direita: 0 },
  abertas: { esquerda: -Math.PI / 2, direita: Math.PI / 2 }
};
export const FOLHAS_PORTAS_ENTRADA = [
  { nome: 'esquerda', x: -2.74, z: 6.71, direcao: 1 },
  { nome: 'direita', x: 0.15, z: 6.71, direcao: -1 }
];

export function volumesPortasEntrada(abertura) {
  const angulos = angulosPortasEntrada(abertura);
  return FOLHAS_PORTAS_ENTRADA.map(p => {
    const angulo = angulos[p.nome], centro = p.direcao * 0.715;
    return { x: p.x + centro * Math.cos(angulo), z: p.z - centro * Math.sin(angulo),
      w: 1.5, d: 0.08, angulo, portaEntrada: true };
  });
}

export function angulosPortasEntrada(abertura) {
  const t = THREE.MathUtils.smoothstep(abertura, 0, 1);
  return {
    esquerda: THREE.MathUtils.lerp(ANGULOS_PORTAS_ENTRADA.fechadas.esquerda, ANGULOS_PORTAS_ENTRADA.abertas.esquerda, t),
    direita: THREE.MathUtils.lerp(ANGULOS_PORTAS_ENTRADA.fechadas.direita, ANGULOS_PORTAS_ENTRADA.abertas.direita, t)
  };
}

export const MOBILIARIO_LOJA = [
  CONFIG.lixeira
];

// Objetos baixos ou estreitos da calçada também precisam participar da
// navegação dos clientes, mesmo sem formarem paredes da loja.
export const MOBILIARIO_CALCADA = [
  ...[-7.8, 10.8].map(x => ({ x, z: 8.4, w: 0.18, d: 0.18 })),
  ...[1.4, 6.2, 10.5].map(x => ({ x, z: 7.4, w: 1.1, d: 0.55 }))
];

export function mobiliarioCalcada(comEstacionamento = false) {
  return comEstacionamento ? [PLANTA_ESTACIONAMENTO.posteCalcada, ...MOBILIARIO_CALCADA.slice(1)] : MOBILIARIO_CALCADA;
}

export const RUA = Object.freeze({
  minX: -15, maxX: 23,
  faixas: Object.freeze([
    Object.freeze({ z: 10.35, direcao: -1 }),
    Object.freeze({ z: 12.55, direcao: 1 })
  ])
});

function criarDetalhesGrama(grupo, vegetacaoEstacionamento) {
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
  const verticesEstacionamento = cores.map(() => []);
  for (const faixa of faixas) {
    for (let i = 0; i < faixa.quantidade; i++) {
      const x = faixa.x[0] + aleatorio() * (faixa.x[1] - faixa.x[0]);
      const z = faixa.z[0] + aleatorio() * (faixa.z[1] - faixa.z[0]);
      const altura = 0.16 + aleatorio() * 0.12;
      const p = PLANTA_ESTACIONAMENTO.piso;
      const dentro = Math.abs(x - p.x) < p.w / 2 + 0.2 && Math.abs(z - p.z) < p.d / 2 + 0.2;
      const sala = PLANTA_OFICINAS.piso;
      if (Math.abs(x - sala.x) < sala.w / 2 + 0.2 && Math.abs(z - sala.z) < sala.d / 2 + 0.2) continue;
      const pontos = (dentro ? verticesEstacionamento : vertices)[Math.floor(aleatorio() * cores.length)];
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
  for (const [conjunto, destino] of [[vertices, grupo], [verticesEstacionamento, vegetacaoEstacionamento]]) conjunto.forEach((pontos, i) => {
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(pontos, 3));
    geometria.computeVertexNormals();
    const malha = new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ color: cores[i], side: THREE.DoubleSide, roughness: 1 }));
    malha.receiveShadow = true;
    // O Canvas desenha a vegetação antes dos pisos que passaram a cobri-la.
    malha.userData.fundo = 2;
    destino.add(malha);
  });
}

export function construirBairro(cena, { caixa, cilindro, esfera }) {
  const grupo = new THREE.Group(); cena.add(grupo);
  const vegetacaoEstacionamento = new THREE.Group(); vegetacaoEstacionamento.name = 'vegetacao-estacionamento'; grupo.add(vegetacaoEstacionamento);
  const calcadaAcesso = new THREE.Group(); calcadaAcesso.name = 'calcada-acesso-estacionamento'; grupo.add(calcadaAcesso);
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
  const terreno = PLANTA_INICIAL.terreno;
  const pisoTerreno = chao(1, terreno.w, 0.3, terreno.d, 0x62b94b, terreno.x, -0.2, terreno.z);
  pisoTerreno.name = 'terreno-principal';
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
  criarDetalhesGrama(grupo, vegetacaoEstacionamento);
  chao(2, 40, 0.08, 4.4, 0x48525e, 4, 0, 11.3);
  // Só a faixa de calçada sob o acesso desaparece após a compra.
  const pisoCalcada = (camada, w, h, d, cor, x, y, z) => {
    const acesso = PLANTA_ESTACIONAMENTO.acesso;
    const inicio = x - w / 2, fim = x + w / 2;
    const cortes = [inicio, acesso.x - acesso.w / 2, acesso.x + acesso.w / 2, fim]
      .filter(p => p >= inicio && p <= fim).sort((a, b) => a - b);
    for (let i = 1; i < cortes.length; i++) {
      const largura = cortes[i] - cortes[i - 1];
      if (largura <= 0) continue;
      const centro = (cortes[i] + cortes[i - 1]) / 2;
      destino = Math.abs(centro - acesso.x) < acesso.w / 2 ? calcadaAcesso : grupo;
      chao(camada, largura, h, d, cor, centro, y, z);
    }
    destino = grupo;
  };
  pisoCalcada(3, 40, 0.18, 2.5, 0xe0bc8c, 4, 0.04, 7.95);
  pisoCalcada(4, 40, 0.22, 0.16, 0xf3e5ce, 4, 0.07, 9.18);
  for (let x = -14; x < 24; x += 2.5) chao(4, 1.2, 0.012, 0.1, 0xf2e7c9, x, 0.049, 11.6);
  // A faixa atravessa a rua inteira, de uma calçada à outra.
  for (let z = 9.5; z < 13.5; z += 0.35) chao(4, 2.2, 0.012, 0.18, 0xf7eddb, -1.3, 0.052, z);
  for (let x = -14.5; x < 24; x += 0.8) pisoCalcada(4, 0.016, 0.01, 2.35, 0xbeb19a, x, 0.135, 7.95);
  for (const z of [7.25, 7.95, 8.65]) pisoCalcada(4, 40, 0.01, 0.015, 0xbeb19a, 4, 0.136, z);
  for (let i = 0; i < 48; i++) {
    if (i % 3 !== 1) continue;
    const x = -14.7 + i * 0.8;
    for (const z of [7.6, 8.3]) pisoCalcada(4, 0.77, 0.004, 0.67, 0xe7c89e, x, 0.133, z);
  }
  const decorarPiso = (primeiraColuna, colunas) => {
    for (let i = 0; i < colunas; i++) {
      for (let j = 0; j < 12; j++) {
        if ((i + j * 2) % 3 === 0) {
          chao(4, 1.16, 0.004, 1.16, 0xe7dfcd, primeiraColuna + i * 1.2, 0.227, -7.5 + j * 1.2, { nome: 'piso', tom: 0.025 });
        }
      }
    }
  };
  // O salão inicial vem da mesma planta usada pela navegação e documentação.
  const salao = PLANTA_INICIAL.salao;
  chao(3, salao.w, 0.2, salao.d, 0xc4b9a5, salao.x, 0.06, salao.z);
  chao(4, salao.w, 0.07, salao.d - 0.3, 0xe3dcc8, salao.x, 0.19, salao.z, 'piso');
  decorarPiso(-2.2, 10);
  for (let x = -2.8; x < 10.9; x += 1.2) chao(5, 0.018, 0.008, salao.d - 0.35, 0xc8bfae, x, 0.23, salao.z);
  for (let z = -9.1; z < 6.6; z += 1.2) chao(5, salao.w, 0.008, 0.018, 0xc8bfae, salao.x, 0.23, z);
  const area = ALA_PADARIA.piso;
  const ampliacao = new THREE.Group(); grupo.add(ampliacao); destino = ampliacao;
  ampliacao.name = 'ampliacao-padaria'; ampliacao.visible = false;
  chao(3, area.w, 0.2, area.d, 0xc4b9a5, area.x, 0.06, area.z);
  chao(4, area.w, 0.07, area.d - 0.3, 0xe3dcc8, area.x, 0.19, area.z, 'piso');
  decorarPiso(11.4, 8);
  for (let x = 11.6; x < 20.8; x += 1.2) chao(5, 0.018, 0.008, area.d - 0.35, 0xc8bfae, x, 0.23, area.z);
  for (let z = -9.1; z < 6.6; z += 1.2) chao(5, area.w, 0.008, 0.018, 0xc8bfae, area.x, 0.23, z);
  const paredesAmpliacao = new THREE.Group(); ampliacao.add(paredesAmpliacao);
  const passagemArtesanal = new THREE.Group(); paredesAmpliacao.add(passagemArtesanal);
  const lateralPadaria = new THREE.Group(); paredesAmpliacao.add(lateralPadaria);
  lateralPadaria.name = 'parede-lateral-padaria';
  passagemArtesanal.name = 'parede-passagem-artesanal';
  for (const p of ALA_PADARIA.paredes) {
    destino = p.passagemArtesanal ? passagemArtesanal : p.x === 20.9 ? lateralPadaria : paredesAmpliacao;
    bloco(p.w, p.h, p.d, 0xf1ead7, p.x, 0.23 + p.h / 2, p.z, 'parede');
    bloco(p.w + 0.04, 0.1, p.d + 0.04, 0x286750, p.x, p.h + 0.23, p.z, 'principal');
    if (p.z !== 6.7) rodape(p);
  }
  const oficinas = new THREE.Group(); grupo.add(oficinas); destino = oficinas;
  oficinas.name = 'sala-oficinas'; oficinas.visible = false;
  const pisoOficinas = PLANTA_OFICINAS.piso;
  chao(3, pisoOficinas.w, 0.2, pisoOficinas.d, 0xc4b9a5, pisoOficinas.x, 0.06, pisoOficinas.z);
  chao(4, pisoOficinas.w, 0.07, pisoOficinas.d, 0xe3dcc8, pisoOficinas.x, 0.19, pisoOficinas.z, 'piso');
  for (let x = 12.5; x < 20.9; x += 1.2) chao(5, 0.018, 0.008, pisoOficinas.d, 0xc8bfae, x, 0.23, pisoOficinas.z);
  for (let z = -14.1; z < -9.3; z += 1.2) chao(5, pisoOficinas.w, 0.008, 0.018, 0xc8bfae, pisoOficinas.x, 0.23, z);
  const paredesCozinha = [];
  for (const expandida of [false, true]) {
    const paredes = new THREE.Group(); oficinas.add(paredes); destino = paredes;
    paredes.name = expandida ? 'paredes-cozinha-expansao' : 'paredes-cozinha-originais';
    paredes.visible = !expandida; paredesCozinha.push(paredes);
    for (const p of paredesOficinas(expandida)) {
      bloco(p.w, p.h, p.d, 0xf1ead7, p.x, 0.23 + p.h / 2, p.z, 'parede');
      bloco(p.w + 0.04, 0.1, p.d + 0.04, 0x286750, p.x, p.h + 0.23, p.z, 'principal');
      rodape(p);
    }
  }
  const expansaoFundos = new THREE.Group(); grupo.add(expansaoFundos); destino = expansaoFundos;
  expansaoFundos.name = 'expansao-fundos'; expansaoFundos.visible = false;
  construirPatioCarga(expansaoFundos, caixa);
  // A rua e a calçada crescem junto com a faixa de terreno comprada à esquerda.
  destino = expansaoFundos;
  chao(2, 12, 0.08, 4.4, 0x48525e, -22, 0, 11.3);
  for (const [inicio, fim] of [[-28, -26.7], [-17.3, -16]]) {
    chao(3, fim - inicio, 0.18, 2.5, 0xe0bc8c, (inicio + fim) / 2, 0.04, 7.95);
    chao(4, fim - inicio, 0.22, 0.16, 0xf3e5ce, (inicio + fim) / 2, 0.07, 9.18);
  }
  for (let x = -26.5; x < -16; x += 2.5) chao(4, 1.2, 0.012, 0.1, 0xf2e7c9, x, 0.049, 11.6);
  for (const piso of PLANTA_EXPANSAO.pisos) {
    chao(3, piso.w, 0.2, piso.d, 0xc4b9a5, piso.x, 0.06, piso.z);
    chao(4, piso.w, 0.07, piso.d, 0xe3dcc8, piso.x, 0.19, piso.z, 'piso');
    for (let x = piso.x - piso.w / 2 + 0.3; x < piso.x + piso.w / 2; x += 1.2) chao(5, 0.018, 0.008, piso.d, 0xc8bfae, x, 0.23, piso.z);
    for (let z = piso.z - piso.d / 2 + 0.2; z < piso.z + piso.d / 2; z += 1.2) chao(5, piso.w, 0.008, 0.018, 0xc8bfae, piso.x, 0.23, z);
  }
  for (const p of paredesExpansao()) {
    const parede = bloco(p.w, p.h, p.d, 0xf1ead7, p.x, 0.23 + p.h / 2, p.z, 'parede');
    if (p.lateralContinua) parede.name = 'parede-lateral-continua';
    bloco(p.w + 0.04, 0.1, p.d + 0.04, 0x286750, p.x, p.h + 0.23, p.z, 'principal');
    rodape(p);
  }
  // A verga fica acima da passagem e não entra nas colisões do piso.
  const passagemDeposito = new THREE.Group(); expansaoFundos.add(passagemDeposito); destino = passagemDeposito;
  passagemDeposito.name = 'passagem-deposito';
  const passagem = PLANTA_DEPOSITO.passagem, alturaVerga = 2.8 - passagem.h;
  bloco(passagem.w, alturaVerga, passagem.d, 0xf1ead7,
    passagem.x, 0.23 + passagem.h + alturaVerga / 2, passagem.z, 'parede');
  bloco(passagem.w + 0.04, 0.1, passagem.d + 0.04, 0x286750,
    passagem.x, 3.03, passagem.z, 'principal');
  destino = expansaoFundos;
  for (const porta of PLANTA_EXPANSAO.portas) {
    for (const lado of [-1, 1]) {
      const x = porta.x + lado * porta.w / 2;
      bloco(0.12, 2.9, 0.2, 0x286750, x, 1.68, porta.z, 'principal');
      bloco(0.08, 2.3, 1.38, 0x286750, x, 1.43, porta.z - 0.72, 'principal');
      bloco(0.09, 1.3, 1.16, 0xa8c7c9, x, 1.68, porta.z - 0.72);
    }
    bloco(porta.w + 0.2, 0.22, 0.2, 0x286750, porta.x, 3.02, porta.z, 'principal');
  }
  const deposito = construirDeposito(expansaoFundos, { caixa, vincular(mesh, papel) {
    mesh.material = mesh.material.clone(); materiais.push({ material: mesh.material, papel });
  } });
  const fundosAntigos = new THREE.Group(); grupo.add(fundosAntigos);
  fundosAntigos.name = 'parede-fundos-antiga';
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
  andaimeTrigo.name = 'andaime-padaria'; andaimeTrigo.position.x = 9; andaimeTrigo.visible = false;
  destino = grupo;
  for (const p of PAREDES_LOJA) {
    destino = p.lateral ? lateral : p.z === -9.3 && PAREDES_LOJA.includes(p) ? fundosAntigos : grupo;
    bloco(p.w, p.h, p.d, 0xf1ead7, p.x, 0.23 + p.h / 2, p.z, 'parede');
    bloco(p.w + 0.04, 0.1, p.d + 0.04, 0x286750, p.x, p.h + 0.23, p.z, 'principal');
    if (p.z !== 6.7) rodape(p);
  }
  destino = grupo;
  // Um único rodapé acompanha a fachada durante a expansão, sem emenda em x = 9.1.
  const rodapeFrontal = rodape(PAREDES_LOJA.find(p => p.fachada));
  rodapeFrontal.name = 'rodape-frontal';
  // Porta dupla de produção: folhas recolhidas para fora, com vão real livre.
  const portaProducao = new THREE.Group(); grupo.add(portaProducao); destino = portaProducao;
  portaProducao.name = 'entrada-producao';
  const servico = CONFIG.portaProducao;
  for (const lado of [-1, 1]) {
    const x = servico.x + lado * servico.w / 2;
    bloco(0.12, 2.9, 0.2, 0x286750, x, 1.68, servico.z, 'principal');
    const folha = new THREE.Group(); portaProducao.add(folha);
    folha.name = `porta-producao-${lado}`;
    folha.position.set(x, 0.23, servico.z);
    folha.rotation.y = -lado * Math.PI / 2;
    destino = folha;
    bloco(1.38, 2.3, 0.08, 0x286750, -lado * 0.72, 1.2, 0, 'principal');
    bloco(1.16, 1.3, 0.09, 0xa8c7c9, -lado * 0.72, 1.45, 0);
    destino = portaProducao;
  }
  bloco(servico.w + 0.2, 0.22, 0.2, 0x286750, servico.x, 3.02, servico.z, 'principal');
  const caminhoHorta = new THREE.Group(); grupo.add(caminhoHorta); destino = caminhoHorta;
  // A horta está atrás da loja; o caminho permanece inteiro na faixa posterior.
  const coletaTomate = PRODUTOS.tomate.coleta;
  for (let x = coletaTomate.x; x <= servico.x; x += 0.65) chao(3, 0.5, 0.06, 0.65, 0xd6c7ac, x, 0.08, coletaTomate.z);
  destino = grupo;
  // Contentor verde com tampa, pega e duas rodas junto à parede do fundo.
  const lixeira = new THREE.Group(); lixeira.name = 'lixeira';
  lixeira.position.set(CONFIG.lixeira.x, 0.23, CONFIG.lixeira.z); grupo.add(lixeira);
  const corpoLixeira = new THREE.BoxGeometry(0.7, 1.02, 0.68);
  const verticesLixeira = corpoLixeira.attributes.position;
  for (let i = 0; i < verticesLixeira.count; i++) {
    if (verticesLixeira.getY(i) < 0) {
      verticesLixeira.setX(i, verticesLixeira.getX(i) * 0.78);
      verticesLixeira.setZ(i, verticesLixeira.getZ(i) * 0.78);
    }
  }
  corpoLixeira.computeVertexNormals();
  const corpo = new THREE.Mesh(corpoLixeira, new THREE.MeshStandardMaterial({ color: 0x285b32, roughness: 0.72 }));
  corpo.position.y = 0.69; corpo.castShadow = true; corpo.receiveShadow = true; lixeira.add(corpo);
  caixa(lixeira, 0.78, 0.09, 0.76, 0x29372c, 0, 1.2, 0);
  const contornoTampa = new THREE.Shape();
  contornoTampa.moveTo(-0.35, -0.34); contornoTampa.lineTo(0.35, -0.34);
  contornoTampa.lineTo(0.35, 0.34); contornoTampa.lineTo(-0.35, 0.34); contornoTampa.closePath();
  const tampa = new THREE.Mesh(new THREE.ExtrudeGeometry(contornoTampa, {
    depth: 0.035, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2, steps: 1
  }), new THREE.MeshStandardMaterial({ color: 0x32673c, roughness: 0.68 }));
  tampa.rotation.x = -Math.PI / 2; tampa.position.y = 1.29;
  tampa.castShadow = true; tampa.receiveShadow = true; lixeira.add(tampa);
  for (const x of [-0.24, 0.24]) {
    caixa(lixeira, 0.12, 0.07, 0.13, 0x285b32, x, 1.27, -0.32);
    caixa(lixeira, 0.045, 0.08, 0.075, 0x285b32, x, 1.38, -0.23);
  }
  caixa(lixeira, 0.52, 0.045, 0.075, 0x285b32, 0, 1.42, -0.23);
  const eixo = cilindro(lixeira, 0.035, 0.035, 0.73, 0x424740, 0, 0.16, -0.23);
  eixo.rotation.z = Math.PI / 2;
  for (const x of [-0.36, 0.36]) {
    const roda = cilindro(lixeira, 0.16, 0.16, 0.12, 0x29302b, x, 0.16, -0.23);
    roda.rotation.z = Math.PI / 2;
    const cubo = cilindro(lixeira, 0.065, 0.065, 0.125, 0x51594f, x, 0.16, -0.23);
    cubo.rotation.z = Math.PI / 2;
  }
  for (const x of [-0.2, 0.2]) caixa(lixeira, 0.13, 0.12, 0.16, 0x285b32, x, 0.12, 0.23);
  // Vitrine e portas duplas que abrem quando um cliente atravessa o vão.
  const entrada = new THREE.Group(); entrada.position.x = -8.82; grupo.add(entrada); destino = entrada;
  for (const x of [6, 9.05]) {
    bloco(0.12, 2.6, 0.18, 0x286750, x, 1.53, 6.7, 'principal');
    bloco(0.45, 2.2, 0.055, 0xb5d6d9, x + (x === 6 ? 0.28 : -0.28), 1.43, 6.72);
  }
  const criarPortaEntrada = ({ nome, x, z, direcao }) => {
    const folha = new THREE.Group(); folha.name = `porta-entrada-${nome}`;
    folha.position.set(x - entrada.position.x, 0, z); entrada.add(folha); destino = folha;
    const centro = direcao * 0.715;
    bloco(1.38, 2.3, 0.035, 0xa8c7c9, centro, 1.43, 0);
    for (const borda of [0, direcao * 1.43]) bloco(0.07, 2.4, 0.08, 0x286750, borda, 1.43, 0, 'principal');
    for (const y of [0.25, 2.61]) bloco(1.45, 0.08, 0.08, 0x286750, centro, y, 0, 'principal');
    // As pegas pertencem à folha e giram com ela, perto da borda sem dobradiça.
    for (const lado of [-1, 1]) {
      const pega = bloco(0.045, 0.65, 0.065, 0xf5eddc, direcao * 1.2, 1.4, lado * 0.08);
      pega.name = 'pega-porta-entrada';
    }
    destino = entrada; return folha;
  };
  const [portaEntradaEsquerda, portaEntradaDireita] = FOLHAS_PORTAS_ENTRADA.map(criarPortaEntrada);
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
  const cercaFazenda = new THREE.Group(); grupo.add(cercaFazenda); destino = cercaFazenda;
  cercaFazenda.name = 'cerca-fazenda';
  const cerca = PLANTA_INICIAL.cercaFundos;
  const zCerca = cerca.z;
  for (let x = cerca.minX; x <= cerca.maxX; x += 1.3) {
    bloco(0.13, 0.9, 0.13, 0xa8733f, x, 0.5, zCerca);
    bloco(1.35, 0.12, 0.1, 0xd29a5b, x + 0.62, 0.7, zCerca);
  }
  destino = grupo;
  const arvoreLateral = new THREE.Group(); grupo.add(arvoreLateral);
  for (const [indice, [x,z]] of [[-12.4,-6.2],[-12.4,4.7],[13.8,-5.4]].entries()) {
    const arvores = x > 0 ? arvoreLateral : vegetacaoEstacionamento;
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
  const postesCalcada = new THREE.Group(); postesCalcada.name = 'poste-calcada-estacionamento'; grupo.add(postesCalcada);
  for (const x of [-7.8, 10.8]) {
    destino = x < 0 ? postesCalcada : grupo;
    cilindro(destino, 0.055, 0.075, 2.8, 0x45544e, x, 1.55, 8.4);
    bloco(0.35, 0.3, 0.35, 0xffe1a0, x, 3, 8.4);
    bloco(0.45, 0.09, 0.45, 0x45544e, x, 3.2, 8.4);
  }
  destino = grupo;
  let expandida = false;
  let anterior;
  let estagioAnterior, progresso = 1;
  return {
    atualizarExpansao(comprada) {
      expandida = !!comprada;
      expansaoFundos.visible = expandida;
      lateralPadaria.visible = !expandida;
      paredesCozinha[0].visible = !expandida;
      paredesCozinha[1].visible = expandida;
      const recuo = expandida ? -PLANTA_EXPANSAO.profundidade : 0;
      caminhoHorta.position.z = recuo;
      cercaFazenda.position.z = recuo;
      pisoTerreno.scale.z = expandida ? PLANTA_EXPANSAO.terreno.d / terreno.d : 1;
      pisoTerreno.position.z = expandida ? PLANTA_EXPANSAO.terreno.z : terreno.z;
      pisoTerreno.scale.x = expandida ? PLANTA_EXPANSAO.terreno.w / terreno.w : 1;
      pisoTerreno.position.x = expandida ? PLANTA_EXPANSAO.terreno.x : terreno.x;
    },
    atualizarOficinas(produtos) {
      oficinas.visible = expandida || oficinasConstruidas(produtos);
    },
    atualizarEstacionamento(comprado) {
      vegetacaoEstacionamento.visible = !comprado;
      calcadaAcesso.visible = !comprado;
      postesCalcada.position.x = comprado ? PLANTA_ESTACIONAMENTO.posteCalcada.x - MOBILIARIO_CALCADA[0].x : 0;
    },
    atualizarEstagio(estagio, dt = 0) {
      if (estagioAnterior !== undefined && estagio > estagioAnterior) progresso = 0;
      estagioAnterior = estagio;
      const duracao = estagio >= ALA_PADARIA.indice ? ALA_PADARIA.duracaoConstrucao : estagio >= ALA_TRIGO.indice ? ALA_TRIGO.duracaoConstrucao : estagio >= ALA_LEITE.indice ? ALA_LEITE.duracaoConstrucao : ALA_PRODUCAO.duracaoConstrucao;
      progresso = Math.min(1, progresso + dt / duracao);
      const ampliada = estagio >= ALA_PADARIA.indice;
      const progressoAmpliacao = estagio > ALA_PADARIA.indice ? 1 : progresso;
      const equipamentos = THREE.MathUtils.smoothstep(progresso, 0.7, 1);
      ampliacao.visible = ampliada;
      // A área caminhável fica disponível inteira na compra; paredes e equipamentos sobem.
      paredesAmpliacao.scale.y = Math.max(0.001, THREE.MathUtils.smoothstep(progressoAmpliacao, 0, 0.7));
      lateral.visible = !ampliada;
      lateral.position.x = 0;
      const largura = ampliada ? area.w : 0;
      const fachada = PAREDES_LOJA.find(p => p.fachada);
      rodapeFrontal.scale.x = 1 + largura / fachada.w;
      rodapeFrontal.position.x = fachada.x + largura / 2;
      andaime.visible = false;
      andaimeLeite.visible = false;
      andaimeTrigo.visible = ampliada && progressoAmpliacao > 0 && progressoAmpliacao < 0.95;
      andaimeTrigo.position.x = 20.9 - 12.35;
      andaimeTrigo.scale.y = 1 - THREE.MathUtils.smoothstep(progressoAmpliacao, 0.8, 0.95);
      arvoreLateral.visible = !ampliada;
      return estagio ? equipamentos : 0;
    },
    animarEntrada(abertura, lojaAberta) {
      const angulos = angulosPortasEntrada(abertura);
      portaEntradaEsquerda.rotation.y = angulos.esquerda;
      portaEntradaDireita.rotation.y = angulos.direita;
    },
    animarDeposito(lojaAberta, dt) {
      deposito.atualizar(lojaAberta, dt);
    },
    atualizarPacotesDeposito(pacotes) { deposito.atualizarPacotes(pacotes); },
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
