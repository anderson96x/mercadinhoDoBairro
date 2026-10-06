// Ajuste a economia e os pontos do mapa aqui, sem alterar os sistemas do jogo.
export const ALTURA_PAREDE_BAIXA = 0.75;

export const CONFIG = {
  chaveSalvamento: 'mercadinho-do-bairro-v1',
  versaoSalvamento: 1,
  versaoLayout: 3,
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
  cestasPorMelhoria: 5,
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
  limiteMundo: { minX: -13.8, maxX: 22.5, minZ: -21, maxZ: 9 },
  // Bordas do terreno visível (40 x 37, centrado em 4, -4).
  limiteCamera: { minX: -16, maxX: 24, minZ: -22.5, maxZ: 14.5 },
  inicio: { x: -1.8, z: 3.4 },
  caixa: { x: 3.45, z: 6.05 },
  balcao: { x: 3.45, z: 5.25 },
  acessoCaixa: { x: 1.55, z: 5.25 },
  clienteCaixa: { x: 2.2, z: 3.5 },
  cadeiraCaixa: { x: 3.45, z: 6.05 },
  cadeiraEscritorio: { x: -0.9, z: -3.5 },
  areaFuncionarioCaixa: { x: 3.45, z: 6.05, w: 0.8, d: 0.9 },
  anguloCaixa: Math.PI,
  anguloEscritorio: Math.PI,
  entrada: { x: -1.3, z: 8.4 },
  portaEntrada: { x: -1.3, z: 6.7 },
  cestas: { x: 0.8, z: 5.2 },
  pontoCestasCliente: { x: -0.05, z: 5.2 },
  extremosCalcada: [{ x: -10.3, z: 8.4 }, { x: 10.3, z: 8.4 }],
  anguloCamera: Math.PI / 4,
  cameraIsometrica: { x: 18, y: 18, z: 18 }
};

export const PRODUTOS = {
  tomate: {
    nome: 'Tomate', plural: 'Tomates', cor: 0xef5a42, preco: 5, origem: 'horta',
    tempoCrescimento: 1.8, capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -9, z: -2.8 }, coleta: { x: -7.4, z: -1.7 },
    prateleira: { x: 2.8, z: 0, w: 2.2, d: 1.4 }, reposicao: { x: 2.8, z: -1.3 },
    cliente: { x: 2.8, z: 1.3 },
    pontosCompra: [{ x: 2.8, z: 1.3 }, { x: 1.9, z: 1.3 }, { x: 3.7, z: 1.3 }, { x: 1.1, z: 0 }, { x: 4.5, z: 0 }], liberado: true
  },
  milho: {
    nome: 'Milho', plural: 'Milhos', cor: 0xf6c844, preco: 10, origem: 'horta',
    tempoCrescimento: 2.8, capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -9, z: 3.4 }, coleta: { x: -7.4, z: 3.4 },
    prateleira: { x: 2.8, z: -3.6, w: 2.2, d: 1.4 }, reposicao: { x: 4.5, z: -3.6 },
    cliente: { x: 2.8, z: -2.3 },
    pontosCompra: [{ x: 2.8, z: -2.3 }, { x: 1.9, z: -2.3 }, { x: 3.7, z: -2.3 }], liberado: false
  },
  ovos: {
    nome: 'Ovo', plural: 'Ovos', cor: 0xf8e6bf, preco: 15, origem: 'galinheiro',
    capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -9, z: -8.3 }, coleta: { x: -7.4, z: -7.8 },
    prateleira: { x: 7, z: 0, w: 2.2, d: 1.4 }, reposicao: { x: 7, z: -1.3 },
    cliente: { x: 7, z: 1.3 },
    pontosCompra: [{ x: 7, z: 1.3 }, { x: 6.1, z: 1.3 }, { x: 7.9, z: 1.3 }], liberado: false
  },
  leite: {
    nome: 'Leite', plural: 'Garrafas de leite', cor: 0xf4f5e8, preco: 20, origem: 'curral',
    capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -2.4, z: -17 }, coleta: { x: -2.2, z: -14.65 }, curral: { w: 4.2, d: 3.2 },
    prateleira: { x: 13.6, z: -4.2, w: 1.2, d: 3.2 }, reposicao: { x: 12.4, z: -4.2 },
    cliente: { x: 12.4, z: -4.2 },
    pontosCompra: [{ x: 12.4, z: -4.2 }, { x: 12.4, z: -5.2 }, { x: 12.4, z: -3.2 }], liberado: false
  },
  trigo: {
    nome: 'Trigo', plural: 'Espigas de trigo', cor: 0xe4bc57, preco: 5, origem: 'horta',
    tempoCrescimento: 3.2, capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -8.8, z: -14.3 }, coleta: { x: -7.25, z: -12 },
    prateleira: { x: 11.2, z: 0, w: 2.2, d: 1.4 }, reposicao: { x: 11.2, z: -1.3 },
    cliente: { x: 11.2, z: 1.3 },
    pontosCompra: [{ x: 11.2, z: 1.3 }, { x: 10.3, z: 1.3 }, { x: 12.1, z: 1.3 }], liberado: false
  },
  morango: {
    nome: 'Morango', plural: 'Morangos', cor: 0xe74769, preco: 16, origem: 'horta', nivelMinimo: 11,
    tempoCrescimento: 3.4, capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: 2.9, z: -17 }, coleta: { x: 2.9, z: -14.6 },
    prateleira: { x: 13.2, z: -10.9, w: 2.2, d: 1.4 }, reposicao: { x: 11.5, z: -10.9 },
    cliente: { x: 13.2, z: -9.6 },
    pontosCompra: [{ x: 13.2, z: -9.6 }, { x: 12.3, z: -9.6 }, { x: 14.1, z: -9.6 }], liberado: false
  },
  mel: {
    nome: 'Mel', plural: 'Potes de mel', cor: 0xe7a92b, preco: 24, origem: 'apiario', nivelMinimo: 12,
    tempoCrescimento: 5, capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: 7.3, z: -17 }, coleta: { x: 7.3, z: -14.6 },
    prateleira: { x: 13.2, z: -16, w: 2.2, d: 1.4 }, reposicao: { x: 11.5, z: -16 },
    cliente: { x: 13.2, z: -14.7 },
    pontosCompra: [{ x: 13.2, z: -14.7 }, { x: 12.3, z: -14.7 }, { x: 14.1, z: -14.7 }], liberado: false
  },
  queijo: {
    nome: 'Queijo', plural: 'Queijos', cor: 0xf5cd61, preco: 18, origem: 'oficina', nivelMinimo: 13,
    capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: 2.6, z: -11.4 }, coleta: { x: 2.6, z: -10.05 }, curral: { w: 2.65, d: 1.75 },
    prateleira: { x: 18, z: -16, w: 1.2, d: 3 }, reposicao: { x: 19.2, z: -16 },
    cliente: { x: 19.2, z: -16 },
    pontosCompra: [{ x: 19.2, z: -16 }, { x: 19.2, z: -16.9 }, { x: 19.2, z: -15.1 }], liberado: false
  },
  geleia: {
    nome: 'Geleia', plural: 'Potes de geleia', cor: 0xb94470, preco: 30, origem: 'oficina', nivelMinimo: 15,
    capacidadeHorta: 9, capacidadePrateleira: 12,
    horta: { x: 7.3, z: -11.4 }, coleta: { x: 7.3, z: -10.05 }, curral: { w: 2.65, d: 1.75 },
    prateleira: { x: 18, z: -10.9, w: 1.2, d: 2.6 }, reposicao: { x: 19.2, z: -10.9 },
    cliente: { x: 19.2, z: -10.9 },
    pontosCompra: [{ x: 19.2, z: -10.9 }, { x: 19.2, z: -11.7 }, { x: 19.2, z: -10.1 }], liberado: false
  },
  pao: {
    nome: 'Pão', plural: 'Pães', cor: 0xc87833, preco: 10, origem: 'padaria',
    capacidadeHorta: 0, capacidadePrateleira: 18,
    horta: { x: 6.2, z: -6.95 }, coleta: { x: 5.15, z: -6.95 },
    prateleira: { x: 7.6, z: -4.2, w: 3.4, d: 0.9 }, reposicao: { x: 5.15, z: -6.95 },
    cliente: { x: 7.6, z: -3.15 },
    pontosCompra: [{ x: 7.6, z: -3.15 }, { x: 6.7, z: -3.15 }, { x: 8.5, z: -3.15 }], liberado: false
  }
};

// As alas dos ovos, do leite e do trigo e o ajudante entram em marcos separados da progressão.
export const NIVEL_OVOS = 4;
export const NIVEL_LEITE = 5;
export const NIVEL_AJUDANTE = 6;
export const NIVEL_TRIGO = 7;
export const NIVEL_PADARIA = 9;
export const ALA_PRODUCAO = {
  id: 'alaProducao', indice: 1, nivelMinimo: NIVEL_OVOS, custo: 500, produtos: ['ovos'],
  limites: { ...CONFIG.limiteMundo },
  piso: { x: 10.6, z: -0.8, w: 3, d: 15 },
  camera: { x: 0.8, z: -0.5, alturaDesktop: 28 },
  duracaoConstrucao: 4,
  paredes: [
    { x: 10.6, z: -8.3, w: 3, d: 0.28, h: 2.8 },
    { x: 10.6, z: 6.7, w: 3, d: 0.28, h: ALTURA_PAREDE_BAIXA },
    { x: 12.1, z: -0.8, w: 0.28, d: 15, h: ALTURA_PAREDE_BAIXA }
  ],
  estacoes: { galinheiro: PRODUTOS.ovos.horta, prateleira: PRODUTOS.ovos.prateleira },
  tempoOvo: 3.5
};
export const ALA_LEITE = {
  id: 'alaLeite', indice: 2, nivelMinimo: NIVEL_LEITE, custo: 800, produtos: ['leite'],
  limites: { ...CONFIG.limiteMundo },
  piso: { x: 13.6, z: -0.8, w: 3, d: 15 },
  camera: { x: 2, z: -0.5, alturaDesktop: 31 },
  duracaoConstrucao: 4,
  paredes: [
    { x: 13.6, z: -8.3, w: 3, d: 0.28, h: 2.8, passagemArtesanal: true },
    { x: 13.6, z: 6.7, w: 3, d: 0.28, h: ALTURA_PAREDE_BAIXA },
    { x: 15.1, z: -0.8, w: 0.28, d: 15, h: ALTURA_PAREDE_BAIXA }
  ],
  tempoLeite: 4.5
};
export const ALA_TRIGO = {
  id: 'alaTrigo', indice: 3, nivelMinimo: NIVEL_TRIGO, custo: 400, produtos: ['trigo'],
  limites: { ...CONFIG.limiteMundo },
  piso: { x: 18.1, z: -0.8, w: 6, d: 15 },
  camera: { x: 4.2, z: -2, alturaDesktop: 37 },
  duracaoConstrucao: 4,
  paredes: [
    { x: 18.1, z: -8.3, w: 6, d: 0.28, h: 2.8, passagemArtesanal: true },
    { x: 18.1, z: 6.7, w: 6, d: 0.28, h: ALTURA_PAREDE_BAIXA },
    { x: 21.1, z: -4.95, w: 0.28, d: 6.7, h: ALTURA_PAREDE_BAIXA },
    { x: 21.1, z: 0, w: 0.28, d: 3.2, h: ALTURA_PAREDE_BAIXA, painelExpansao: true },
    { x: 21.1, z: 4.15, w: 0.28, d: 5.1, h: ALTURA_PAREDE_BAIXA }
  ]
};
export const ALA_PADARIA = {
  id: 'alaPadaria', indice: 4, nivelMinimo: NIVEL_PADARIA, custo: 1400, produtos: ['pao'],
  entrada: { ...PRODUTOS.pao.horta, w: 0.65, d: 0.6 },
  moinho: { x: 6.45, z: -5.9, w: 0.85, d: 0.85 },
  forno: { x: 8.7, z: -5.9, w: 1.05, d: 1.15 }, capacidadeTrigo: 12,
  tempoMoagem: 1.8, tempoForno: 2.3, paesPorTrigo: 3
};

// O anexo usa o terreno ao fundo; o vão substitui a parede dos ovos.
export const ALA_ARTESANAL = {
  id: 'alaArtesanal', indice: 5, nivelMinimo: 11, custo: 1200, produtos: ['morango'],
  piso: { x: 15.1, z: -13.9, w: 12, d: 11.2 },
  paredes: [
    { x: 10.1, z: -19.5, w: 2, d: 0.28, h: ALTURA_PAREDE_BAIXA },
    { x: 12.9, z: -19.5, w: 3.6, d: 0.28, h: ALTURA_PAREDE_BAIXA, painelExpansao: true },
    { x: 17.9, z: -19.5, w: 6.4, d: 0.28, h: ALTURA_PAREDE_BAIXA },
    { x: 9.1, z: -16.75, w: 0.28, d: 5.5, h: ALTURA_PAREDE_BAIXA },
    { x: 9.1, z: -9.5, w: 0.28, d: 2.4, h: ALTURA_PAREDE_BAIXA },
    { x: 21.1, z: -17.35, w: 0.28, d: 4.3, h: ALTURA_PAREDE_BAIXA },
    { x: 21.1, z: -14.2, w: 0.28, d: 2, h: ALTURA_PAREDE_BAIXA, painelExpansao: true },
    { x: 21.1, z: -10.75, w: 0.28, d: 4.9, h: ALTURA_PAREDE_BAIXA }
  ],
  camera: { x: 4.2, z: -5, alturaDesktop: 43 }, duracaoConstrucao: 4
};

export const OFICINAS = {
  queijo: { melhoria: 'queijaria', nome: 'Queijaria', ingredientes: { leite: 1 }, rendimento: 2, segundos: 5, capacidadeEntrada: 8 },
  geleia: { melhoria: 'cozinhaGeleia', nome: 'Cozinha de geleias', ingredientes: { morango: 2, mel: 1 }, rendimento: 3, segundos: 6, capacidadeEntrada: 8 }
};

// Uma melhoria pode liberar um produto ou ajustar um atributo. Novas regras
// entram em Simulacao.comprarMelhoria(), mantendo a interface desacoplada.
export const MELHORIAS = [
  { id: 'logistica', titulo: 'Cesta de trabalho', descricao: 'Carregue 8 produtos e ande 15% mais rápido para cuidar de uma loja maior.', custo: 400, icone: 'cesta', max: 1, categoria: 'jogador', nivelMinimo: 10 },
  { id: 'alaArtesanal', titulo: 'Ala artesanal e estufa', descricao: 'Amplie a loja para o terreno ao fundo e construa uma estufa de morangos. Colha e abasteça a nova banca: R$ 16 por morango.', custo: ALA_ARTESANAL.custo, icone: 'morango', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: 11, requisitoMelhoria: 'alaPadaria' },
  { id: 'apiario', titulo: 'Apiário do bairro', descricao: 'Construa colmeias ao lado da estufa. Colete potes de mel e abasteça a banca: R$ 24 por pote.', custo: 850, icone: 'mel', max: 1, tipo: 'construcao', produto: 'mel', categoria: 'mercado', nivelMinimo: 12, requisitoMelhoria: 'alaArtesanal' },
  { id: 'queijaria', titulo: 'Queijaria', descricao: 'Entregue leite à queijaria perto da estufa. Cada garrafa rende 2 queijos de R$ 18. Recolha os queijos e abasteça a banca.', custo: 1600, icone: 'queijo', max: 1, tipo: 'construcao', produto: 'queijo', categoria: 'mercado', nivelMinimo: 13, requisitoMelhoria: 'alaArtesanal', requisitos: ['alaLeite'] },
  { id: 'irrigacao', titulo: 'Irrigação da fazenda', descricao: 'Instale irrigadores em todas as hortas: as colheitas crescem 25% mais rápido.', custo: 650, icone: 'folha', max: 1, categoria: 'mercado', nivelMinimo: 14, requisitoMelhoria: 'alaArtesanal' },
  { id: 'equipeAgil', titulo: 'Reposição ágil', descricao: 'O repositor anda 30% mais rápido e prioriza as bancas vazias da loja ampliada.', custo: 500, icone: 'raio', max: 1, categoria: 'funcionarios', nivelMinimo: 14, requisitoMelhoria: 'ajudante' },
  { id: 'cozinhaGeleia', titulo: 'Cozinha de geleias', descricao: 'Combine 2 morangos e 1 mel para fazer 3 geleias de R$ 30. Entregue os ingredientes, recolha os potes e abasteça a banca.', custo: 2200, icone: 'geleia', max: 1, tipo: 'construcao', produto: 'geleia', categoria: 'mercado', nivelMinimo: 15, requisitoMelhoria: 'apiario' },
  { id: 'milho', titulo: 'Uma nova colheita', descricao: 'Abra a horta e a prateleira de milho. Cada unidade vale R$ 10.', custo: 350, icone: 'milho', max: 1, tipo: 'produto', categoria: 'mercado', nivelMinimo: 3 },
  { id: 'alaProducao', titulo: 'Ala dos ovos', descricao: 'Construa um galinheiro na fazenda e amplie a loja para a prateleira de ovos. Colete os ovos e abasteça a prateleira.', custo: ALA_PRODUCAO.custo, icone: 'ovos', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_OVOS },
  { id: 'alaLeite', titulo: 'Ala do leite', descricao: 'Construa um curral com vaca na fazenda e amplie a loja com um refrigerador de leite em garrafas de vidro.', custo: ALA_LEITE.custo, icone: 'leite', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_LEITE },
  { id: 'alaTrigo', titulo: 'Ala do trigo', descricao: 'Abra a plantação ao lado dos ovos e do leite e amplie a loja com uma prateleira de trigo. Cada unidade vale R$ 5.', custo: ALA_TRIGO.custo, icone: 'trigo', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_TRIGO },
  { id: 'alaPadaria', titulo: 'Padaria', descricao: 'Cada trigo rende 3 pães, vendidos por R$ 10 cada. Deixe o trigo na caixa à esquerda do balcão.', custo: ALA_PADARIA.custo, icone: 'pao', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_PADARIA, requisitoMelhoria: 'alaTrigo' },
  { id: 'cestasExtras', titulo: 'Mais cestas para clientes', descricao: 'Adicione 5 cestas para receber mais 5 clientes na loja ao mesmo tempo.', custo: 100, icone: 'cesta', max: 1, categoria: 'mercado', nivelMinimo: 8 },
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
