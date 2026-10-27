// Nova planta: 2 unidades por cm anotado; x para a direita, z para a rua.
// A profundidade dobra no N6; a padaria amplia à direita no N13.
export const PLANTA_INICIAL = {
  escala: 2,
  terreno: { x: 4, z: -5.5, w: 40, d: 40 },
  salao: { x: 3.9, z: -1.3, w: 14, d: 16 },
  limites: { minX: -3.1, maxX: 10.9, minZ: -9.3, maxZ: 6.7 },
  portaProducao: { x: 4.35, z: -9.3, w: 1.5, d: 0.12 },
  cercaFundos: { minX: -10.3, maxX: 3.6, z: -25 },
  // Painel N1: tomate na faixa posterior esquerda, acima da parede do fundo.
  // Referência visual: canteiro compacto, com oito plantas, atrás da loja.
  fazendaTomate: {
    horta: { x: -9.2, z: -12.7 }, canteiro: { w: 3.6, d: 2.5 },
    coleta: { x: -9.2, z: -10.9 }
  }
};

// Área externa à esquerda da loja, sem ocupar a horta ou a calçada frontal.
export const PLANTA_ESTACIONAMENTO = {
  piso: { x: -9.9, z: -1.1, w: 11.8, d: 15 },
  ilha: { x: -9.9, z: -1.95, w: 0.5, d: 7.5 },
  acesso: { x: -9.9, z: 7.83, w: 6.4, d: 2.86 },
  faixas: [{ x: -11.5, direcao: 0 }, { x: -8.3, direcao: Math.PI }],
  posteCalcada: { x: -6.2, z: 8.4, w: 0.18, d: 0.18 },
  placa: { x: -14.8, z: 5.8 },
  vagas: [-13.95, -5.85].flatMap((x, lado) => [-3.7, -0.7, 2.3].map(z => ({ x, z, w: 3.4, d: 2.6, lado }))),
};

export const OBSTACULOS_ESTACIONAMENTO = [
  PLANTA_ESTACIONAMENTO.ilha,
  { ...PLANTA_ESTACIONAMENTO.placa, w: 0.12, d: 0.12 }
];

// Painel N3: milho alinhado ao tomate, mais ao fundo (z menor).
// A coluna inteira fica atrás da loja; trigo reserva o próximo canteiro no N4.
export const FAZENDAS_HORTIFRUTI = Object.fromEntries(['tomate', 'milho', 'trigo'].map((id, indice) => {
  const tomate = PLANTA_INICIAL.fazendaTomate;
  return [id, {
    horta: { x: tomate.horta.x, z: tomate.horta.z - indice * 4.5 },
    canteiro: { ...tomate.canteiro },
    coleta: { x: tomate.coleta.x, z: tomate.coleta.z - indice * 4.5 }
  }];
}));

// N9: estufa à direita do curral, na mesma faixa posterior.
export const PLANTA_MORANGO = {
  horta: { x: 8, z: -22.2 }, coleta: { x: 8, z: -20.4 },
  canteiro: { ...PLANTA_INICIAL.fazendaTomate.canteiro }
};

// N14: apiário à direita da estufa por ajuste solicitado; venda na frente direita.
// O conjunto de venda receberá a seção de geleia no N17.
export const PLANTA_MEL = {
  horta: { x: 13.2, z: -22.2 }, coleta: { x: 13.2, z: -19.8 },
  prateleira: { x: 17.6, z: 5.8, w: 3.2, d: 1.4, movel: 'doces' },
  reposicao: { x: 17.6, z: 4.5 }, cliente: { x: 17.6, z: 4.5 },
  pontosCompra: [-0.9, 0, 0.9].map(dx => ({ x: 17.6 + dx, z: 4.5 }))
};

// Sala compartilhada nos fundos direitos; entrada lateral aberta, sem porta.
export const PLANTA_OFICINAS = {
  piso: { x: 16.6, z: -11.8, w: 8.6, d: 5 },
  entrada: { x: 12.3, z: -10.5 },
  paredes: [
    { x: 16.6, z: -14.3, w: 8.6, d: 0.18, h: 1.45 },
    { x: 20.9, z: -11.8, w: 0.18, d: 5, h: 1.45 }
  ]
};

export const oficinasConstruidas = produtos => !!(produtos.queijo?.liberado || produtos.geleia?.liberado);

// N15: produção na sala dos fundos; refrigerador à direita do leite.
export const PLANTA_QUEIJO = {
  horta: { x: 14.1, z: -13.2 }, coleta: { x: 14.1, z: -11.75 },
  curral: { w: 2.65, d: 1.75 },
  prateleira: { x: 11.8, z: -8.45, w: 2.2, d: 1.4, movel: 'parede-frios' },
  reposicao: { x: 11.8, z: -7.15 }, cliente: { x: 11.8, z: -7.15 },
  pontosCompra: [-0.65, 0, 0.65].map(dx => ({ x: 11.8 + dx, z: -7.15 }))
};

// N17: cozinha ao lado da queijaria; geleia prolonga a banca de mel para a esquerda.
export const PLANTA_GELEIA = {
  horta: { x: 18.8, z: -13.2 }, coleta: { x: 18.8, z: -11.75 },
  curral: { w: 2.65, d: 1.75 },
  prateleira: { x: 14.4, z: 5.8, w: 3.2, d: 1.4, movel: 'doces' },
  reposicao: { x: 14.4, z: 4.5 }, cliente: { x: 14.4, z: 4.5 },
  pontosCompra: [-0.9, 0, 0.9].map(dx => ({ x: 14.4 + dx, z: 4.5 }))
};

const SECOES_DOCES = [['mel', PLANTA_MEL.prateleira], ['geleia', PLANTA_GELEIA.prateleira]];
export function volumesDoces(produtos) {
  const secoes = SECOES_DOCES.filter(([id]) => produtos[id]?.liberado).map(([, p]) => p);
  if (!secoes.length) return [];
  const minX = Math.min(...secoes.map(p => p.x - p.w / 2));
  const maxX = Math.max(...secoes.map(p => p.x + p.w / 2));
  return [{ ...secoes[0], x: (minX + maxX) / 2, w: maxX - minX }];
}
export function selecionarCompartimentoDoces(ator, produtos) {
  // Mel possui a borda comum; ambos atendem somente pelo corredor interno.
  return SECOES_DOCES.find(([id, p]) => produtos[id]?.liberado
    && ator.z <= p.z - p.d / 2 && ator.x >= p.x - p.w / 2 - 1e-8
    && ator.x <= p.x + p.w / 2 + 1e-8)?.[0];
}

export const PRODUTOS_HORTIFRUTI = ['tomate', 'milho', 'trigo', 'laranja', 'maca', 'morango'];

// N6: pomar ao lado do apiário, com acesso livre pela frente.
export const PLANTA_LARANJA = {
  horta: { x: 18.6, z: -22.2 }, coleta: { x: 18.6, z: -19.9 },
  canteiro: { w: 3.2, d: 3.2 }
};

// N7: ao lado da laranjeira, avançando pelo gramado em direção às oficinas.
// O volume menor em profundidade preserva os corredores entre as instalações.
export const PLANTA_MACA = {
  horta: { x: 18.6, z: -17.3 }, coleta: { x: 16.4, z: -17.3 },
  canteiro: { w: 3.2, d: 2.4 }
};

// As frentes acompanham o balcão da padaria; ambas terminam na mesma linha atrás.
export const LINHA_FRONTAL_PADARIA = 0.375;
export const LINHA_TRASEIRA_PRATELEIRAS_IMPORTADOS = -5.400;
const COMPRIMENTO_PRATELEIRAS_IMPORTADOS = LINHA_FRONTAL_PADARIA - LINHA_TRASEIRA_PRATELEIRAS_IMPORTADOS;
export const PRATELEIRAS_IMPORTADOS = [4.8, 10.4].map((x, indice) => ({
  nome: `prateleira-importados-${indice + 1}`, x,
  z: (LINHA_FRONTAL_PADARIA + LINHA_TRASEIRA_PRATELEIRAS_IMPORTADOS) / 2,
  w: 1.2, d: COMPRIMENTO_PRATELEIRAS_IMPORTADOS, h: 2.4
}));

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
  // Uma única máquina: moinho superior e forno na base, no antigo posto do trigo.
  moinho: { x: 5.9, z: -5.4, w: 1.35, d: 1.05 },
  forno: { x: 5.9, z: -5.4, w: 1.35, d: 1.05 },
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
  // Um ladrilho (1,2 u) em direção à frente da loja, à esquerda na vista isométrica.
  return { x: 14 - p.z, z: p.x - 10.4 };
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

// N11: galinheiro acima e à direita do milho; ovos na parede posterior,
// à direita da porta de produção. A compra mantém o salão inicial.
export const PLANTA_OVOS = {
  horta: { x: -2.4, z: -21.7 }, coleta: { x: -2.4, z: -20.05 },
  galinheiro: { w: 2.5, d: 2.2 },
  prateleira: { x: 7.1, z: -8.45, w: 2.2, d: 1.4, movel: 'parede-frios' },
  reposicao: { x: 7.1, z: -7.15 }, cliente: { x: 7.1, z: -7.15 },
  pontosCompra: [-0.8, 0, 0.8].map(dx => ({ x: 7.1 + dx, z: -7.15 }))
};

// N12: curral ao lado do galinheiro, ambos na mesma faixa posterior.
export const PLANTA_LEITE = {
  horta: { x: 2.6, z: -21.7 }, coleta: { x: 2.6, z: -19.45 },
  curral: { w: 3.4, d: 3.2 },
  prateleira: { x: 9.45, z: -8.45, w: 2.2, d: 1.4, movel: 'parede-frios' },
  reposicao: { x: 9.45, z: -7.15 }, cliente: { x: 9.45, z: -7.15 },
  pontosCompra: [-0.65, 0, 0.65].map(dx => ({ x: 9.45 + dx, z: -7.15 }))
};

export function selecionarExpositorPosterior(ator, produtos, catalogo = { ovos: PLANTA_OVOS, leite: PLANTA_LEITE, queijo: PLANTA_QUEIJO }) {
  const ativos = ['ovos', 'leite', 'queijo'].map(id => [id, catalogo[id].prateleira])
    .filter(([id]) => produtos[id]?.liberado);
  return ativos.find(([id, p], i) => {
    const anterior = ativos[i - 1]?.[1], proximo = ativos[i + 1]?.[1];
    const minX = anterior ? (anterior.x + anterior.w / 2 + p.x - p.w / 2) / 2 : p.x - p.w / 2;
    const maxX = proximo ? (p.x + p.w / 2 + proximo.x - proximo.w / 2) / 2 : p.x + p.w / 2;
    return ator.z >= p.z + p.d / 2 && ator.x >= minX - 1e-8 && ator.x <= maxX + 1e-8;
  })?.[0];
}

// Uma única faixa de carga: entrada de ré e saída de frente para a rua.
const EIXO_CARGA = PLANTA_INICIAL.terreno.x - PLANTA_INICIAL.terreno.w / 2 - 2;
const BORDA_ESQUERDA_DEPOSITO = -15.5;
const FUNDO_ESTACIONAMENTOS = -9.3;
export const PLANTA_CARGA = {
  piso: { x: EIXO_CARGA, z: -1.45, w: 4, d: 15.7 },
  acesso: { x: EIXO_CARGA, z: 7.83, w: 4, d: 2.86 },
  travessia: { x: EIXO_CARGA, z: 8.25, w: 4, d: 0.85 },
  ligacao: { x: -12.4, z: -8.48, w: 7.2, d: 1.7 },
  vaga: { x: EIXO_CARGA, z: -3.7, w: 2.6, d: 7.2 },
  retirada: { x: EIXO_CARGA, z: -7.2 },
  cabine: { x: EIXO_CARGA + 1.45, z: -1.95 },
  contornoCabine: { x: EIXO_CARGA + 1.45, z: -7.2 },
  placa: { x: EIXO_CARGA + 2.35, z: 5.4 },
  guias: [
    { x: EIXO_CARGA - 1.9, z: -1.45, w: 0.2, d: 15.7 },
    { x: (EIXO_CARGA - 2 + BORDA_ESQUERDA_DEPOSITO) / 2, z: FUNDO_ESTACIONAMENTOS + 0.1,
      w: BORDA_ESQUERDA_DEPOSITO - (EIXO_CARGA - 2), d: 0.2 },
    { x: EIXO_CARGA + 1.9, z: 0.1, w: 0.2, d: 12.6 }
  ]
};
export const obstaculosCarga = () => [...PLANTA_CARGA.guias, { ...PLANTA_CARGA.placa, w: 0.12, d: 0.12 }];

// N18: amplia os fundos e a lateral esquerda sem deslocar a loja existente.
export const PLANTA_EXPANSAO = {
  profundidade: 6,
  salao: { x: 8.9, z: -4.3, w: 24, d: 22 },
  pisos: [
    { x: 4.6, z: -12.3, w: 15.4, d: 6 },
    // A cozinha já tem piso: acrescenta somente a faixa atrás dela.
    { x: 16.6, z: -14.8, w: 8.6, d: 1 }
  ],
  terreno: { x: -2, z: -8.5, w: 52, d: 46 },
  limites: { minX: -27.7, maxX: 22.5, minZ: -30.5, maxZ: 9 },
  limiteCamera: { minX: -28, maxX: 24, minZ: -31.5, maxZ: 14.5 },
  portaProducao: { ...PLANTA_INICIAL.portaProducao, z: -15.3 },
  bancadas: Object.fromEntries([['queijo', PLANTA_QUEIJO], ['geleia', PLANTA_GELEIA]].map(([id, p]) => [id, {
    x: p.horta.x,
    // Face posterior da bancada encostada na face interna da nova parede.
    z: -15.3 + 0.28 / 2 + p.curral.d / 2
  }])),
  camera: { x: 0, z: -4.3, alturaDesktop: 46 },
  portas: [
    { ...PLANTA_INICIAL.portaProducao, z: -15.3 }
  ]
};

export function paredesExpansao() {
  const paredes = [];
  let inicio = -3.1;
  for (const porta of PLANTA_EXPANSAO.portas) {
    const fim = porta.x - porta.w / 2;
    paredes.push({ x: (inicio + fim) / 2, z: porta.z, w: fim - inicio, d: 0.28, h: 2.8 });
    inicio = porta.x + porta.w / 2;
  }
  return [...paredes,
    { x: (inicio + 20.9) / 2, z: -15.3, w: 20.9 - inicio, d: 0.28, h: 2.8 },
    ...[[-15.3, PLANTA_DEPOSITO.passagem.z - PLANTA_DEPOSITO.passagem.d / 2],
      [PLANTA_DEPOSITO.passagem.z + PLANTA_DEPOSITO.passagem.d / 2, -9.3]].map(([inicio, fim]) => ({
      x: PLANTA_DEPOSITO.passagem.x, z: (inicio + fim) / 2, w: 0.28, d: fim - inicio, h: 2.8
    })),
    // Uma única lateral evita emendas de altura, espessura e acabamento.
    { x: 20.9, z: -4.3, w: 0.28, d: 22, h: 0.75, lateralContinua: true }
  ];
}

export function paredesOficinas(expandida = false) {
  if (!expandida) return PLANTA_OFICINAS.paredes;
  // A parede dos fundos e a lateral do prédio delimitam a cozinha ampliada.
  return [];
}

// Depósito N18: porta externa na face +z e passagem aberta para o anexo.
// A lateral direita compartilha a parede do anexo.
export const PLANTA_DEPOSITO = {
  piso: { x: -9.3, z: -12.3, w: 12.4, d: 6 },
  porta: { x: -9.3, z: -9.3, w: 2.8, d: 0.28 },
  passagem: { x: -3.1, z: -12.6, w: 0.28, d: 1.8, h: 2.3 },
  estantes: [-13.65, -10.75, -7.85, -4.95].map((x, i) => ({
    nome: `estante-deposito-${i + 1}`, x, z: -14.35, w: 2.1, d: 1.1, h: 2.5
  }))
};

export function paredesDeposito() {
  const { piso, porta } = PLANTA_DEPOSITO;
  const minX = piso.x - piso.w / 2, maxX = piso.x + piso.w / 2;
  return [
    { x: piso.x, z: piso.z - piso.d / 2, w: piso.w, d: 0.28, h: 2.8 },
    { x: minX, z: piso.z, w: 0.28, d: piso.d, h: 2.8 },
    // Fachada em corte, como no salão, para revelar as caixas e os corredores.
    ...[[minX, porta.x - porta.w / 2], [porta.x + porta.w / 2, maxX]].map(([inicio, fim]) => ({
      x: (inicio + fim) / 2, z: porta.z, w: fim - inicio, d: porta.d, h: 0.75
    }))
  ];
}

export function pisoEstacionamento(expandida = false) {
  const piso = PLANTA_ESTACIONAMENTO.piso;
  if (!expandida) return piso;
  const minX = PLANTA_CARGA.piso.x + PLANTA_CARGA.piso.w / 2, maxX = PLANTA_INICIAL.limites.minX;
  const minZ = PLANTA_DEPOSITO.porta.z, maxZ = piso.z + piso.d / 2;
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, w: maxX - minX, d: maxZ - minZ };
}

export function obstaculosDeposito() {
  return [...paredesDeposito(), ...PLANTA_DEPOSITO.estantes];
}

export function volumePortaoDeposito() {
  const p = PLANTA_DEPOSITO.porta;
  return { x: p.x, z: p.z, w: p.w - 0.12, d: 0.12 };
}

export function folhasPortasExpansao() {
  return PLANTA_EXPANSAO.portas.map(porta => volumePortaProducao(1, porta));
}

export const PLANTA_COMPACTA = {
  salao: { ...PLANTA_INICIAL.salao, z: 2.7, d: 8 },
  limites: { ...PLANTA_INICIAL.limites, minZ: -1.3 },
  portaProducao: { ...PLANTA_INICIAL.portaProducao, z: -1.3 },
  deslocamentoFundos: 8
};

export function paredesPlantaInicial(alturaBaixa, planta = PLANTA_INICIAL) {
  const l = planta.limites, porta = planta.portaProducao;
  const esquerdaPorta = porta.x - porta.w / 2, direitaPorta = porta.x + porta.w / 2;
  return [
    { x: (l.minX + esquerdaPorta) / 2, z: l.minZ, w: esquerdaPorta - l.minX, d: 0.28, h: 2.8 },
    { x: (direitaPorta + l.maxX) / 2, z: l.minZ, w: l.maxX - direitaPorta, d: 0.28, h: 2.8 },
    { x: l.maxX, z: planta.salao.z, w: 0.28, d: planta.salao.d, h: alturaBaixa, lateral: true },
    { x: l.minX, z: planta.salao.z, w: 0.28, d: planta.salao.d, h: 2.8 },
    { x: (l.minX - 2.8) / 2, z: l.maxZ, w: -2.8 - l.minX, d: 0.28, h: alturaBaixa },
    { x: (0.2 + l.maxX) / 2, z: l.maxZ, w: l.maxX - 0.2, d: 0.28, h: alturaBaixa, fachada: true }
  ];
}

export function anguloPortaProducao(abertura) {
  const t = Math.max(0, Math.min(1, abertura));
  return -Math.PI / 2 * t * t * (3 - 2 * t);
}

export function volumePortaProducao(abertura, porta = PLANTA_INICIAL.portaProducao) {
  const angulo = anguloPortaProducao(abertura), centro = -porta.w / 2;
  return { x: porta.x + porta.w / 2 + centro * Math.cos(angulo),
    z: porta.z - centro * Math.sin(angulo), w: porta.w - 0.06, d: 0.12,
    angulo, portaProducao: true };
}

export const FOLHAS_PORTA_PRODUCAO = [volumePortaProducao(1)];

export function compartimentoHortifruti(id) {
  const indice = PRODUTOS_HORTIFRUTI.indexOf(id);
  if (indice < 0) return null;
  // Seis seções cabem na parede, incluindo laranja e maçã.
  const z = 3.6 - indice * 2.2;
  return {
    prateleira: { x: -2.1, z, w: 1.4, d: 2.2, movel: 'hortifruti' },
    reposicao: { x: -0.8, z },
    cliente: { x: -0.8, z },
    pontosCompra: [0, -0.8, 0.8, -0.4, 0.4].map(dz => ({ x: -0.8, z: z + dz }))
  };
}

// Mescla apenas seções contíguas compradas, sem ocupar lacunas bloqueadas.
export function volumesHortifruti(produtos, catalogo) {
  const volumes = [];
  for (const id of PRODUTOS_HORTIFRUTI) {
    if (!produtos[id]?.liberado) continue;
    const secao = catalogo?.[id].prateleira ?? compartimentoHortifruti(id).prateleira;
    const anterior = volumes.at(-1);
    if (anterior && Math.abs(anterior.z - anterior.d / 2 - (secao.z + secao.d / 2)) < 1e-6) {
      anterior.z -= secao.d / 2;
      anterior.d += secao.d;
    } else volumes.push({ ...secao });
  }
  return volumes;
}

export function selecionarCompartimentoHortifruti(ator, produtos, catalogo) {
  // Ordem da frente para o fundo resolve a borda comum sem depender de floats.
  return PRODUTOS_HORTIFRUTI.find(id => {
    if (!produtos[id]?.liberado) return false;
    const p = catalogo?.[id].prateleira ?? compartimentoHortifruti(id).prateleira;
    return ator.x >= p.x + p.w / 2 && ator.z >= p.z - p.d / 2 - 1e-8 && ator.z <= p.z + p.d / 2 + 1e-8;
  });
}
