// Ajuste a economia e os pontos do mapa aqui, sem alterar os sistemas do jogo.
export const CONFIG = {
  chaveSalvamento: 'mercadinho-do-bairro-v1',
  versaoSalvamento: 1,
  dinheiroInicial: 0,
  capacidadeInicial: 4,
  velocidadeInicial: 4.3,
  intervaloInteracao: 0.28,
  raioInteracao: 0.9,
  tempoCaixa: 1.15,
  bonusNivel: 100,
  intervaloClientesReputacao: { ruim: 20, media: 15, boa: 8 },
  quantidadeCestas: 5,
  capacidadeCestaCliente: 5,
  capacidadeAjudante: 8,
  multiplicadorVelocidadeAjudante: 1.2,
  multiplicadorCrescimentoMelhorado: 0.5,
  tempoEsperaCliente: 10,
  clientesPorNivel: 25,
  pontosSatisfacao: { feliz: 10, neutro: 5, irritado: 0 },
  reputacaoInicial: 60,
  tamanhoHistoricoReputacao: 10,
  valoresReputacao: { feliz: 100, neutro: 50, irritado: 0 },
  limitePedidoReputacao: { ruim: 2, media: 3, boa: 5 },
  tempoAnimacaoCesta: 0.75,
  maxClientes: 5,
  espacoClientes: 1.15,
  distanciaClientes: 1.05,
  limiteMundo: { minX: -10.5, maxX: 10.5, minZ: -8, maxZ: 9 },
  inicio: { x: -1.8, z: 3.4 },
  caixa: { x: 3.5, z: 5.1 },
  balcao: { x: 3.5, z: 4.1 },
  clienteCaixa: { x: 3.5, z: 2.5 },
  cadeiraCaixa: { x: 3.5, z: 5.7 },
  cadeiraEscritorio: { x: -0.9, z: -3.5 },
  areaFuncionarioCaixa: { x: 3.5, z: 5.7, w: 0.8, d: 1.9 },
  anguloCaixa: Math.PI,
  anguloEscritorio: Math.PI,
  entrada: { x: -1.3, z: 8.4 },
  portaEntrada: { x: -1.3, z: 6.7 },
  cestas: { x: 1.6, z: 4.9 },
  pontoCestasCliente: { x: 0.65, z: 4.9 },
  extremosCalcada: [{ x: -10.3, z: 8.4 }, { x: 10.3, z: 8.4 }],
  anguloCamera: Math.PI / 4,
  cameraIsometrica: { x: 18, y: 18, z: 18 }
};

export const PRODUTOS = {
  tomate: {
    nome: 'Tomate', plural: 'Tomates', cor: 0xef5a42, preco: 5, origem: 'horta',
    tempoCrescimento: 1.8, capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -6.6, z: -2.8 }, coleta: { x: -5.0, z: -1.7 },
    prateleira: { x: 3, z: -0.5 }, reposicao: { x: 2, z: 1.2 },
    cliente: { x: 4, z: 1.2 },
    pontosCompra: [{ x: 4, z: 1.2 }, { x: 3, z: 1.2 }, { x: 2, z: 1.2 }, { x: 4.6, z: -0.5 }, { x: 1.4, z: -0.5 }], liberado: true
  },
  milho: {
    nome: 'Milho', plural: 'Milhos', cor: 0xf6c844, preco: 10, origem: 'horta',
    tempoCrescimento: 2.8, capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -6.6, z: 3.4 }, coleta: { x: -5.0, z: 3.4 },
    prateleira: { x: 4.5, z: -3.8 }, reposicao: { x: 3.5, z: -2.1 },
    cliente: { x: 5.5, z: -2.1 },
    pontosCompra: [{ x: 5.5, z: -2.1 }, { x: 4.5, z: -2.1 }, { x: 3.5, z: -2.1 }, { x: 6, z: -3.8 }, { x: 3, z: -3.8 }], liberado: false
  },
  ovos: {
    nome: 'Ovo', plural: 'Ovos', cor: 0xf8e6bf, preco: 15, origem: 'galinheiro',
    capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: 3.3, z: -9.1 }, coleta: { x: 3.3, z: -7.55 },
    prateleira: { x: 7.75, z: -9.25 }, reposicao: { x: 7.75, z: -7.8 },
    cliente: { x: 7.75, z: -7.8 },
    pontosCompra: [{ x: 7.75, z: -7.8 }, { x: 6.9, z: -7.8 }, { x: 8.35, z: -7.8 }], liberado: false
  }
};

// A ala dos ovos e o ajudante acompanham o mesmo marco de progressão.
export const NIVEL_OVOS = 5;
export const ALA_PRODUCAO = {
  id: 'alaProducao', indice: 1, nivelMinimo: NIVEL_OVOS, custo: 500, produtos: ['ovos'],
  limites: { ...CONFIG.limiteMundo, minZ: -11.25 },
  piso: { x: 5.6, z: -8.55, w: 7, d: 5 },
  camera: { x: 0.5, z: -1.3, alturaDesktop: 28 },
  porta: { x: 5.35, z: -6, w: 2.3, d: 0.3 },
  paredes: [
    { x: 5.6, z: -11.1, w: 7.2, d: 0.28, h: 2.8 },
    { x: 2.1, z: -8.55, w: 0.28, d: 5.1, h: 2.8 },
    { x: 9.1, z: -8.55, w: 0.28, d: 5.1, h: 0.75 }
  ],
  moinho: { x: 5.55, z: -9.1, w: 1.3, d: 1.4 },
  estacoes: { galinheiro: PRODUTOS.ovos.horta, prateleira: PRODUTOS.ovos.prateleira },
  tempoRacao: 2.5, tempoOvo: 3.5, racaoPorMilho: 2,
  capacidadeMilho: 8, capacidadeRacao: 12
};

// Uma melhoria pode liberar um produto ou ajustar um atributo. Novas regras
// entram em Simulacao.comprarMelhoria(), mantendo a interface desacoplada.
export const MELHORIAS = [
  { id: 'milho', titulo: 'Uma nova colheita', descricao: 'Abra a horta e a prateleira de milho. Cada unidade vale R$ 10.', custo: 350, icone: 'milho', max: 1, tipo: 'produto', categoria: 'mercado', nivelMinimo: 4 },
  { id: 'alaProducao', titulo: 'Ala dos ovos', descricao: 'Amplie a loja. Leve milho ao moinho para fazer ração; o galinheiro usa a ração para produzir ovos.', custo: ALA_PRODUCAO.custo, icone: 'ovos', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_OVOS, requisitoMelhoria: 'milho' },
  { id: 'mochila', titulo: 'Cabe mais um pouco', descricao: 'Leve mais 4 produtos por viagem.', custo: 25, icone: 'mochila', max: 1, categoria: 'jogador', nivelMinimo: 1 },
  { id: 'velocidade', titulo: 'Passo ligeiro', descricao: 'Ande 20% mais rápido pelo mercadinho.', custo: 100, icone: 'raio', max: 1, categoria: 'jogador', nivelMinimo: 5 },
  { id: 'caixa', titulo: 'Uma mão no caixa', descricao: 'Contrate alguém para atender a fila enquanto você cuida da loja.', custo: 250, icone: 'pessoa', max: 1, categoria: 'funcionarios', nivelMinimo: 2 },
  { id: 'ajudante', titulo: 'Ajuda na reposição', descricao: 'Disponível no nível dos ovos, depois que você os liberar. O ajudante colhe e abastece as prateleiras.', custo: 300, icone: 'cesta', max: 1, categoria: 'funcionarios', nivelMinimo: NIVEL_OVOS, nivelMinimoLegado: 3, requisitoProduto: 'ovos' },
  { id: 'velocidadeAjudante', titulo: 'Ajudante ligeiro', descricao: 'O ajudante anda 20% mais rápido.', custo: 100, icone: 'raio', max: 1, categoria: 'funcionarios', nivelMinimo: NIVEL_OVOS, requisitoMelhoria: 'ajudante' },
  { id: 'fertilizante', titulo: 'Crescimento acelerado', descricao: 'Escolha uma horta para reduzir pela metade o tempo de crescimento. Uma vez por produto.', custo: 100, icone: 'folha', max: Object.values(PRODUTOS).filter(p => p.origem === 'horta').length, tipo: 'selecaoProduto', categoria: 'mercado', nivelMinimo: 5 }
];

export const MISSOES = [
  { titulo: 'Atenda o bairro', texto: 'Atenda 25 clientes para subir de nível.', chave: 'clientes', intervalo: CONFIG.clientesPorNivel, destino: 'caixa' }
];
