// Nova planta: 2 unidades por cm anotado; x para a direita, z para a rua.
// As etapas posteriores ainda conservam suas ampliações anteriores.
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

export const PRODUTOS_HORTIFRUTI = ['tomate', 'milho', 'trigo', 'morango'];

// Painel N4: galinheiro acima e à direita do milho; ovos na parede posterior,
// à direita da porta de produção. A compra mantém o salão inicial.
export const PLANTA_OVOS = {
  horta: { x: -2.4, z: -21.7 }, coleta: { x: -2.4, z: -20.05 },
  galinheiro: { w: 2.5, d: 2.2 },
  prateleira: { x: 7.1, z: -8.45, w: 2.2, d: 1.4 },
  reposicao: { x: 7.1, z: -7.15 }, cliente: { x: 7.1, z: -7.15 },
  pontosCompra: [-0.8, 0, 0.8].map(dx => ({ x: 7.1 + dx, z: -7.15 }))
};

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
