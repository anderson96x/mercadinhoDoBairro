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
  intervaloClientesReputacao: [
    { reputacao: 0, segundos: 25 },
    { reputacao: 20, segundos: 20 },
    { reputacao: 50, segundos: 15 },
    { reputacao: 70, segundos: 10 },
    { reputacao: 90, segundos: 5 },
    { reputacao: 100, segundos: 2.5 }
  ],
  quantidadeCestas: 5,
  capacidadeCestaCliente: 5,
  capacidadeAjudante: 8,
  multiplicadorVelocidadeAjudante: 1.2,
  multiplicadorCrescimentoMelhorado: 0.4,
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
  limiteMundo: { minX: -13.8, maxX: 17.5, minZ: -16, maxZ: 9 },
  // Bordas do terreno visível (35 x 32, centrado em 1.5, -1.5).
  limiteCamera: { minX: -16, maxX: 19, minZ: -17.5, maxZ: 14.5 },
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
    horta: { x: -9, z: -2.8 }, coleta: { x: -7.4, z: -1.7 },
    prateleira: { x: 3, z: -0.5 }, reposicao: { x: 2, z: 1.2 },
    cliente: { x: 4, z: 1.2 },
    pontosCompra: [{ x: 4, z: 1.2 }, { x: 3, z: 1.2 }, { x: 2, z: 1.2 }, { x: 4.6, z: -0.5 }, { x: 1.4, z: -0.5 }], liberado: true
  },
  milho: {
    nome: 'Milho', plural: 'Milhos', cor: 0xf6c844, preco: 10, origem: 'horta',
    tempoCrescimento: 2.8, capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -9, z: 3.4 }, coleta: { x: -7.4, z: 3.4 },
    prateleira: { x: 6.5, z: -3.8 }, reposicao: { x: 5.5, z: -2.1 },
    cliente: { x: 7.5, z: -2.1 },
    pontosCompra: [{ x: 7.5, z: -2.1 }, { x: 6.5, z: -2.1 }, { x: 5.5, z: -2.1 }, { x: 8, z: -3.8 }, { x: 5, z: -3.8 }], liberado: false
  },
  ovos: {
    nome: 'Ovo', plural: 'Ovos', cor: 0xf8e6bf, preco: 15, origem: 'galinheiro',
    capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -9, z: -7.2 }, coleta: { x: -7.4, z: -6.7 },
    prateleira: { x: 10, z: -0.5 }, reposicao: { x: 10, z: 1.2 },
    cliente: { x: 10, z: 1.2 },
    pontosCompra: [{ x: 10, z: 1.2 }, { x: 9.1, z: 1.2 }, { x: 10.9, z: 1.2 }], liberado: false
  },
  leite: {
    nome: 'Leite', plural: 'Garrafas de leite', cor: 0xf4f5e8, preco: 20, origem: 'curral',
    capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -2, z: -12.5 }, coleta: { x: -1.8, z: -10.15 }, curral: { w: 4.2, d: 3.2 },
    prateleira: { x: 13.55, z: 3.3 }, reposicao: { x: 13.55, z: 5.0 },
    cliente: { x: 13.55, z: 1.8 },
    pontosCompra: [{ x: 13.55, z: 1.8 }, { x: 12.7, z: 1.8 }, { x: 14.35, z: 1.8 }], liberado: false
  },
  trigo: {
    nome: 'Trigo', plural: 'Espigas de trigo', cor: 0xe4bc57, preco: 5, origem: 'horta',
    tempoCrescimento: 3.2, capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -8.8, z: -12.4 }, coleta: { x: -7.25, z: -10.1 },
    prateleira: { x: 16.55, z: -0.5 }, reposicao: { x: 16.55, z: 1.2 },
    cliente: { x: 16.55, z: 1.2 },
    pontosCompra: [{ x: 16.55, z: 1.2 }, { x: 15.7, z: 1.2 }, { x: 17.3, z: 1.2 }], liberado: false
  }
};

// As alas dos ovos, do leite e do trigo e o ajudante entram em marcos separados da progressão.
export const NIVEL_OVOS = 4;
export const NIVEL_LEITE = 5;
export const NIVEL_AJUDANTE = 6;
export const NIVEL_TRIGO = 7;
export const ALA_PRODUCAO = {
  id: 'alaProducao', indice: 1, nivelMinimo: NIVEL_OVOS, custo: 500, produtos: ['ovos'],
  limites: { ...CONFIG.limiteMundo },
  piso: { x: 10.6, z: 0.35, w: 3, d: 12.7 },
  camera: { x: 0.8, z: -0.5, alturaDesktop: 28 },
  duracaoConstrucao: 4,
  paredes: [
    { x: 10.6, z: -6, w: 3, d: 0.28, h: 2.8 },
    { x: 10.6, z: 6.7, w: 3, d: 0.28, h: 0.65 },
    { x: 12.1, z: 0.35, w: 0.28, d: 12.7, h: 0.75 }
  ],
  estacoes: { galinheiro: PRODUTOS.ovos.horta, prateleira: PRODUTOS.ovos.prateleira },
  tempoOvo: 3.5
};
export const ALA_LEITE = {
  id: 'alaLeite', indice: 2, nivelMinimo: NIVEL_LEITE, custo: 800, produtos: ['leite'],
  limites: { ...CONFIG.limiteMundo },
  piso: { x: 13.6, z: 0.35, w: 3, d: 12.7 },
  camera: { x: 2, z: -0.5, alturaDesktop: 31 },
  duracaoConstrucao: 4,
  paredes: [
    { x: 13.6, z: -6, w: 3, d: 0.28, h: 2.8 },
    { x: 13.6, z: 6.7, w: 3, d: 0.28, h: 0.65 },
    { x: 15.1, z: 0.35, w: 0.28, d: 12.7, h: 0.75 }
  ],
  tempoLeite: 4.5
};
export const ALA_TRIGO = {
  id: 'alaTrigo', indice: 3, nivelMinimo: NIVEL_TRIGO, custo: 400, produtos: ['trigo'],
  limites: { ...CONFIG.limiteMundo },
  piso: { x: 16.6, z: 0.35, w: 3, d: 12.7 },
  camera: { x: 3.2, z: -0.5, alturaDesktop: 34 },
  duracaoConstrucao: 4,
  paredes: [
    { x: 16.6, z: -6, w: 3, d: 0.28, h: 2.8 },
    { x: 16.6, z: 6.7, w: 3, d: 0.28, h: 0.65 },
    { x: 18.1, z: 0.35, w: 0.28, d: 12.7, h: 0.75 }
  ]
};

// Uma melhoria pode liberar um produto ou ajustar um atributo. Novas regras
// entram em Simulacao.comprarMelhoria(), mantendo a interface desacoplada.
export const MELHORIAS = [
  { id: 'milho', titulo: 'Uma nova colheita', descricao: 'Abra a horta e a prateleira de milho. Cada unidade vale R$ 10.', custo: 350, icone: 'milho', max: 1, tipo: 'produto', categoria: 'mercado', nivelMinimo: 3 },
  { id: 'alaProducao', titulo: 'Ala dos ovos', descricao: 'Construa um galinheiro na fazenda e amplie a loja para a prateleira de ovos. Colete os ovos e abasteça a prateleira.', custo: ALA_PRODUCAO.custo, icone: 'ovos', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_OVOS },
  { id: 'alaLeite', titulo: 'Ala do leite', descricao: 'Construa um curral com vaca na fazenda e amplie a loja para a prateleira de leite em garrafas de vidro.', custo: ALA_LEITE.custo, icone: 'leite', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_LEITE },
  { id: 'alaTrigo', titulo: 'Ala do trigo', descricao: 'Abra a plantação ao lado dos ovos e do leite e amplie a loja com uma prateleira de trigo. Cada unidade vale R$ 5.', custo: ALA_TRIGO.custo, icone: 'trigo', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_TRIGO },
  { id: 'mochila', titulo: 'Mais capacidade', descricao: 'Carregue mais 4 produtos por viagem.', custo: 25, icone: 'cesta', max: 1, categoria: 'jogador', nivelMinimo: 1, ativa: false },
  { id: 'velocidade', titulo: 'Passo ligeiro', descricao: 'Ande 20% mais rápido pelo mercadinho.', custo: 100, icone: 'raio', max: 1, categoria: 'jogador', nivelMinimo: 5, ativa: false },
  { id: 'caixa', titulo: 'Uma mão no caixa', descricao: 'Contrate alguém para atender a fila enquanto você cuida da loja.', custo: 250, icone: 'pessoa', max: 1, categoria: 'funcionarios', nivelMinimo: 2 },
  { id: 'ajudante', titulo: 'Repositor', descricao: 'Colhe e abastece as prateleiras de todos os produtos liberados.', custo: 900, icone: 'cesta', max: 1, categoria: 'funcionarios', nivelMinimo: NIVEL_AJUDANTE, nivelMinimoLegado: 3 },
  { id: 'velocidadeAjudante', titulo: 'Repositor ligeiro', descricao: 'O repositor anda 20% mais rápido.', custo: 100, icone: 'raio', max: 1, categoria: 'funcionarios', nivelMinimo: NIVEL_AJUDANTE, nivelMinimoLegado: 5, requisitoMelhoria: 'ajudante', ativa: false },
  { id: 'fertilizante', titulo: 'Crescimento acelerado', descricao: 'Escolha uma horta para reduzir a 40% o tempo de crescimento. Uma vez por produto.', custo: 250, icone: 'folha', max: Object.values(PRODUTOS).filter(p => p.origem === 'horta').length, tipo: 'selecaoProduto', categoria: 'mercado', nivelMinimo: 4, ativa: false }
];

export const MISSOES = [
  { titulo: 'Atenda o bairro', texto: 'Atenda 25 clientes para subir de nível.', chave: 'clientes', intervalo: CONFIG.clientesPorNivel, destino: 'caixa' }
];
