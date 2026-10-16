// Nova planta: 2 unidades por cm anotado; x para a direita, z para a rua.
// O salão amplia no N9; N11 acrescenta apenas equipamentos.
export const PLANTA_INICIAL = {
  escala: 2,
  terreno: { x: 4, z: -5.5, w: 40, d: 40 },
  salao: { x: 3.9, z: -1.3, w: 14, d: 16 },
  limites: { minX: -3.1, maxX: 10.9, minZ: -9.3, maxZ: 6.7 },
  portaProducao: { x: 3.6, z: -9.3, w: 3, d: 0.12 },
  cercaFundos: { minX: -10.3, maxX: 3.6, z: -25 },
  // Painel N1: tomate na faixa posterior esquerda, acima da parede do fundo.
  // Referência visual: canteiro compacto, com oito plantas, atrás do escritório.
  fazendaTomate: {
    horta: { x: -9.2, z: -12.7 }, canteiro: { w: 3.6, d: 2.5 },
    coleta: { x: -9.2, z: -10.9 }
  }
};

// Painel N3: milho alinhado ao tomate, mais ao fundo (z menor).
// A coluna inteira fica atrás da loja; trigo reserva o próximo canteiro no N7.
export const FAZENDAS_HORTIFRUTI = Object.fromEntries(['tomate', 'milho', 'trigo'].map((id, indice) => {
  const tomate = PLANTA_INICIAL.fazendaTomate;
  return [id, {
    horta: { x: tomate.horta.x, z: tomate.horta.z - indice * 4.5 },
    canteiro: { ...tomate.canteiro },
    coleta: { x: tomate.coleta.x, z: tomate.coleta.z - indice * 4.5 }
  }];
}));

// Painel N11: estufa à direita do curral, na mesma faixa posterior.
export const PLANTA_MORANGO = {
  horta: { x: 8, z: -22.2 }, coleta: { x: 8, z: -20.4 },
  canteiro: { ...PLANTA_INICIAL.fazendaTomate.canteiro }
};

// N12: apiário à direita da estufa por ajuste solicitado; venda na frente direita.
// O conjunto de venda receberá a seção de geleia no N15.
export const PLANTA_MEL = {
  horta: { x: 13.2, z: -22.2 }, coleta: { x: 13.2, z: -19.8 },
  prateleira: { x: 17.6, z: 4.6, w: 3.2, d: 1.4 },
  reposicao: { x: 17.6, z: 3.3 }, cliente: { x: 17.6, z: 3.3 },
  pontosCompra: [-0.9, 0, 0.9].map(dx => ({ x: 17.6 + dx, z: 3.3 }))
};

export const PRODUTOS_HORTIFRUTI = ['tomate', 'milho', 'trigo', 'morango'];

export const PLANTA_AMPLIADA = {
  salao: { x: 8.9, z: -1.3, w: 24, d: 16 },
  limites: { ...PLANTA_INICIAL.limites, maxX: 20.9 },
  piso: { x: 15.9, z: -1.3, w: 10, d: 16 },
  camera: { x: 5, z: -1.3, alturaDesktop: 37 }
};

export function paredesAmpliacao(alturaBaixa) {
  return [
    { x: 15.9, z: -9.3, w: 10, d: 0.28, h: 2.8, passagemArtesanal: true },
    { x: 15.9, z: 6.7, w: 10, d: 0.28, h: alturaBaixa },
    { x: 20.9, z: -1.3, w: 0.28, d: 16, h: alturaBaixa }
  ];
}

// Coordenadas locais do conjunto; a frente +z gira para a esquerda (-x).
export const MODELO_PADARIA = {
  prateleira: { x: 7.6, z: -2, w: 3.4, d: 0.9 },
  entrada: { x: 4.75, z: -5.35, w: 0.65, d: 2.1 },
  moinho: { x: 5.9, z: -5.4, w: 0.85, d: 0.85 },
  forno: { x: 9.3, z: -5.4, w: 1.05, d: 1.15 },
  // Balcões de atendimento; a faixa junto à parede direita fica aberta.
  fechamento: [
    // Laterais terminam na borda interna da frente; os cantos ficam alinhados.
    { x: 10.45, z: -4.425, w: 0.65, d: 3.95, variedade: 1 },
    { x: 4.75, z: -3.375, w: 0.65, d: 1.85, decoracao: false },
    { x: 4.75, z: -5.35, w: 0.65, d: 2.1, decoracao: false, entregaTrigo: true },
    { x: 5.1625, z: -2, w: 1.475, d: 0.9, variedade: 4 },
    { x: 10.0375, z: -2, w: 1.475, d: 0.9, variedade: 5 }
  ]
};

export function pontoPadaria(p) {
  return { x: 14 - p.z, z: p.x - 11.6 };
}

export function volumePadaria(p) {
  return { ...pontoPadaria(p), w: p.d, d: p.w };
}

export const PLANTA_PADARIA = {
  horta: pontoPadaria(MODELO_PADARIA.entrada),
  coleta: pontoPadaria({ x: 3.85, z: -5.35 }),
  reposicao: pontoPadaria({ x: 3.85, z: -5.35 }),
  prateleira: volumePadaria(MODELO_PADARIA.prateleira),
  cliente: pontoPadaria({ x: 7.6, z: -0.95 }),
  pontosCompra: [7.6, 6.7, 8.5].map(x => pontoPadaria({ x, z: -0.95 }))
};

// Painel N4: galinheiro acima e à direita do milho; ovos na parede posterior,
// à direita da porta de produção. A compra mantém o salão inicial.
export const PLANTA_OVOS = {
  horta: { x: -2.4, z: -21.7 }, coleta: { x: -2.4, z: -20.05 },
  galinheiro: { w: 2.5, d: 2.2 },
  prateleira: { x: 7.1, z: -8.45, w: 2.2, d: 1.4, movel: 'parede-frios' },
  reposicao: { x: 7.1, z: -7.15 }, cliente: { x: 7.1, z: -7.15 },
  pontosCompra: [-0.8, 0, 0.8].map(dx => ({ x: 7.1 + dx, z: -7.15 }))
};

// Painel N5–6: curral ao lado do galinheiro, ambos na mesma faixa posterior.
export const PLANTA_LEITE = {
  horta: { x: 2.6, z: -21.7 }, coleta: { x: 2.6, z: -19.45 },
  curral: { w: 3.4, d: 3.2 },
  prateleira: { x: 9.45, z: -8.45, w: 2.2, d: 1.4, movel: 'parede-frios' },
  reposicao: { x: 9.45, z: -7.15 }, cliente: { x: 9.45, z: -7.15 },
  pontosCompra: [-0.65, 0, 0.65].map(dx => ({ x: 9.45 + dx, z: -7.15 }))
};

export function selecionarExpositorPosterior(ator, produtos) {
  const ativos = [['ovos', PLANTA_OVOS.prateleira], ['leite', PLANTA_LEITE.prateleira]]
    .filter(([id]) => produtos[id]?.liberado);
  return ativos.find(([id, p], i) => {
    const anterior = ativos[i - 1]?.[1], proximo = ativos[i + 1]?.[1];
    const minX = anterior ? (anterior.x + anterior.w / 2 + p.x - p.w / 2) / 2 : p.x - p.w / 2;
    const maxX = proximo ? (p.x + p.w / 2 + proximo.x - proximo.w / 2) / 2 : p.x + p.w / 2;
    return ator.z >= p.z + p.d / 2 && ator.x >= minX - 1e-8 && ator.x <= maxX + 1e-8;
  })?.[0];
}

export function paredesPlantaInicial(alturaBaixa) {
  const l = PLANTA_INICIAL.limites, porta = PLANTA_INICIAL.portaProducao;
  const esquerdaPorta = porta.x - porta.w / 2, direitaPorta = porta.x + porta.w / 2;
  return [
    { x: (l.minX + esquerdaPorta) / 2, z: l.minZ, w: esquerdaPorta - l.minX, d: 0.28, h: 2.8 },
    { x: (direitaPorta + l.maxX) / 2, z: l.minZ, w: l.maxX - direitaPorta, d: 0.28, h: 2.8 },
    { x: l.maxX, z: PLANTA_INICIAL.salao.z, w: 0.28, d: PLANTA_INICIAL.salao.d, h: alturaBaixa, lateral: true },
    { x: l.minX, z: PLANTA_INICIAL.salao.z, w: 0.28, d: PLANTA_INICIAL.salao.d, h: 2.8 },
    { x: (l.minX - 2.8) / 2, z: l.maxZ, w: -2.8 - l.minX, d: 0.28, h: alturaBaixa },
    { x: (0.2 + l.maxX) / 2, z: l.maxZ, w: l.maxX - 0.2, d: 0.28, h: alturaBaixa, fachada: true }
  ];
}

export const FOLHAS_PORTA_PRODUCAO = [-1, 1].map(lado => ({
  x: PLANTA_INICIAL.portaProducao.x + lado * PLANTA_INICIAL.portaProducao.w / 2,
  z: PLANTA_INICIAL.portaProducao.z - 0.72, w: 0.12, d: 1.44
}));

export function compartimentoHortifruti(id) {
  const indice = PRODUTOS_HORTIFRUTI.indexOf(id);
  if (indice < 0) return null;
  const z = 2.7 - indice * 2.2;
  return {
    prateleira: { x: -2.1, z, w: 1.4, d: 2.2, movel: 'hortifruti' },
    reposicao: { x: -0.8, z },
    cliente: { x: -0.8, z },
    pontosCompra: [0, -0.8, 0.8, -0.4, 0.4].map(dz => ({ x: -0.8, z: z + dz }))
  };
}

// Mescla apenas seções contíguas compradas, sem ocupar lacunas bloqueadas.
export function volumesHortifruti(produtos) {
  const volumes = [];
  for (const id of PRODUTOS_HORTIFRUTI) {
    if (!produtos[id]?.liberado) continue;
    const secao = compartimentoHortifruti(id).prateleira;
    const anterior = volumes.at(-1);
    if (anterior && Math.abs(anterior.z - anterior.d / 2 - (secao.z + secao.d / 2)) < 1e-6) {
      anterior.z -= secao.d / 2;
      anterior.d += secao.d;
    } else volumes.push({ ...secao });
  }
  return volumes;
}

export function selecionarCompartimentoHortifruti(ator, produtos) {
  // Ordem da frente para o fundo resolve a borda comum sem depender de floats.
  return PRODUTOS_HORTIFRUTI.find(id => {
    if (!produtos[id]?.liberado) return false;
    const p = compartimentoHortifruti(id).prateleira;
    return ator.x >= p.x + p.w / 2 && ator.z >= p.z - p.d / 2 - 1e-8 && ator.z <= p.z + p.d / 2 + 1e-8;
  });
}
