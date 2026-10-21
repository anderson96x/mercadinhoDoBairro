// Ajuste a economia e os pontos do mapa aqui, sem alterar os sistemas do jogo.
import { PLANTA_EXPANSAO, PLANTA_GELEIA, PLANTA_QUEIJO, PLANTA_MEL, PLANTA_MORANGO, PLANTA_AMPLIADA, PLANTA_PADARIA, MODELO_PADARIA, volumePadaria, paredesAmpliacao, PLANTA_INICIAL, PLANTA_OVOS, PLANTA_LEITE, FAZENDAS_HORTIFRUTI, compartimentoHortifruti, PRATELEIRAS_IMPORTADOS } from './planta.js';
export const ALTURA_PAREDE_BAIXA = 0.75;
export const CONFIG = {
  chaveSalvamento: 'mercadinho-do-bairro-v1',
  versaoSalvamento: 1,
  versaoLayout: 22,
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
  proporcaoClientesCarro: 0.35,
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
  limiteMundo: { minX: -13.8, maxX: 22.5, minZ: -24.5, maxZ: 9 },
  limiteCamera: { minX: -16, maxX: 24, minZ: -25.5, maxZ: 14.5 },
  inicio: { x: 0.2, z: 3.4 },
  portaProducao: PLANTA_INICIAL.portaProducao,
  caixa: { x: 3.45, z: 6.05 },
  balcao: { x: 3.45, z: 4.65 },
  acessoCaixa: { x: 1.55, z: 4.65 },
  clienteCaixa: { x: 2.2, z: 3.5 },
  cadeiraCaixa: { x: 3.45, z: 6.05 },
  // Encostada na face interna da parede do fundo.
  lixeira: { x: 1.61, z: -8.75, w: 0.84, d: 0.82 },
  areaFuncionarioCaixa: { x: 3.45, z: 6.05, w: 0.8, d: 0.9 },
  anguloCaixa: Math.PI,
  entrada: { x: -1.3, z: 8.4 },
  portaEntrada: { x: -1.3, z: 6.7 },
  cestas: { x: 0.8, z: 5.2 },
  pontoCestasCliente: { x: -0.05, z: 5.2 },
  // Mantém o corpo dentro da calçada, junto às extremidades visíveis da rua.
  extremosCalcada: [
    { x: PLANTA_INICIAL.terreno.x - PLANTA_INICIAL.terreno.w / 2 + 0.5, z: 8.4 },
    { x: PLANTA_INICIAL.terreno.x + PLANTA_INICIAL.terreno.w / 2 - 0.5, z: 8.4 }
  ],
  anguloCamera: Math.PI / 4,
  cameraIsometrica: { x: 18, y: 18, z: 18 }
};

export const PRODUTOS = {
  tomate: {
    nome: 'Tomate', plural: 'Tomates', cor: 0xef5a42, preco: 5, origem: 'horta',
    tempoCrescimento: 1.8, capacidadeHorta: 8, capacidadePrateleira: 12,
    ...PLANTA_INICIAL.fazendaTomate,
    ...compartimentoHortifruti('tomate'), liberado: true
  },
  milho: {
    nome: 'Milho', plural: 'Milhos', cor: 0xf6c844, preco: 10, origem: 'horta',
    tempoCrescimento: 2.8, capacidadeHorta: 8, capacidadePrateleira: 12,
    ...FAZENDAS_HORTIFRUTI.milho,
    ...compartimentoHortifruti('milho'), liberado: false
  },
  ovos: {
    nome: 'Ovo', plural: 'Ovos', cor: 0xf8e6bf, preco: 15, origem: 'galinheiro',
    capacidadeHorta: 8, capacidadePrateleira: 12,
    ...PLANTA_OVOS, liberado: false
  },
  leite: {
    nome: 'Leite', plural: 'Garrafas de leite', cor: 0xf4f5e8, preco: 20, origem: 'curral',
    capacidadeHorta: 8, capacidadePrateleira: 12,
    ...PLANTA_LEITE, liberado: false
  },
  trigo: {
    nome: 'Trigo', plural: 'Espigas de trigo', cor: 0xe4bc57, preco: 5, origem: 'horta',
    tempoCrescimento: 3.2, capacidadeHorta: 8, capacidadePrateleira: 12,
    ...FAZENDAS_HORTIFRUTI.trigo,
    ...compartimentoHortifruti('trigo'), liberado: false
  },
  morango: {
    nome: 'Morango', plural: 'Morangos', cor: 0xe74769, preco: 16, origem: 'horta', nivelMinimo: 11,
    tempoCrescimento: 3.4, capacidadeHorta: 8, capacidadePrateleira: 12,
    ...PLANTA_MORANGO,
    ...compartimentoHortifruti('morango'), liberado: false
  },
  mel: {
    nome: 'Mel', plural: 'Garrafas de mel', cor: 0xe7a92b, preco: 24, origem: 'apiario', nivelMinimo: 12,
    tempoCrescimento: 5, capacidadeHorta: 8, capacidadePrateleira: 12,
    ...PLANTA_MEL, liberado: false
  },
  queijo: {
    nome: 'Queijo', plural: 'Queijos', cor: 0xf5cd61, preco: 18, origem: 'oficina', nivelMinimo: 13,
    capacidadeHorta: 8, capacidadePrateleira: 12,
    ...PLANTA_QUEIJO, liberado: false
  },
  geleia: {
    nome: 'Geleia', plural: 'Potes de geleia', cor: 0xb94470, preco: 30, origem: 'oficina', nivelMinimo: 15,
    capacidadeHorta: 9, capacidadePrateleira: 12,
    ...PLANTA_GELEIA, liberado: false
  },
  pao: {
    nome: 'Pão', plural: 'Pães', cor: 0xc87833, preco: 10, origem: 'padaria',
    capacidadeHorta: 0, capacidadePrateleira: 18,
    ...PLANTA_PADARIA, liberado: false
  },
  enlatado: {
    nome: 'Enlatado', plural: 'Enlatados', cor: 0xd85b45, preco: 30, origem: 'importado', nivelMinimo: 19,
    capacidadeHorta: 243, capacidadePrateleira: 36,
    horta: { x: -9.3, z: -14.35, w: 3.1, d: 1.1 }, coleta: { x: -9.3, z: -12.9 },
    prateleira: { ...PRATELEIRAS_IMPORTADOS[0], movel: 'importados' },
    reposicao: { x: 3.45, z: -2.5 }, cliente: { x: 3.45, z: -2.5 },
    pontosCompra: [-4.35, -3.1, -1.85, -0.6].map(z => ({ x: 3.45, z })), liberado: false
  }
};

// Catálogos independentes: comprar em uma partida não altera outras simulações.
const PRODUTOS_EXPANSAO = Object.fromEntries(Object.entries(PRODUTOS).map(([id, produto]) => {
  const p = { ...produto };
  const recuar = (ponto, distancia) => ({ ...ponto, z: ponto.z - distancia });
  if (['tomate', 'milho', 'trigo', 'ovos', 'leite', 'morango', 'mel'].includes(id)) {
    p.horta = recuar(p.horta, PLANTA_EXPANSAO.profundidade);
    p.coleta = recuar(p.coleta, PLANTA_EXPANSAO.profundidade);
  }
  const bancada = PLANTA_EXPANSAO.bancadas[id];
  if (bancada) {
    p.coleta = { ...p.coleta, x: p.coleta.x + bancada.x - p.horta.x, z: p.coleta.z + bancada.z - p.horta.z };
    p.horta = { ...bancada };
  }
  return [id, p];
}));

export const produtosDaLoja = estado => estado?.melhorias?.expansao ? PRODUTOS_EXPANSAO : PRODUTOS;

// As alas dos ovos, do leite e do trigo e o ajudante entram em marcos separados da progressão.
export const NIVEL_OVOS = 4;
export const NIVEL_LEITE = 5;
export const NIVEL_AJUDANTE = 6;
export const NIVEL_TRIGO = 7;
export const NIVEL_PADARIA = 9;
export const ALA_PRODUCAO = {
  id: 'alaProducao', indice: 1, nivelMinimo: NIVEL_OVOS, custo: 500, produtos: ['ovos'],
  limites: { ...CONFIG.limiteMundo },
  // Geometria histórica das faixas antigas, sem renderização ou colisão.
  piso: { x: 11.5, z: -1.3, w: 1.2, d: 16 },
  camera: { x: 0.8, z: -0.5, alturaDesktop: 28 },
  duracaoConstrucao: 4,
  paredes: [
    { x: 11.5, z: -9.3, w: 1.2, d: 0.28, h: 2.8, passagemArtesanal: true },
    { x: 11.5, z: 6.7, w: 1.2, d: 0.28, h: ALTURA_PAREDE_BAIXA },
    { x: 12.1, z: -1.3, w: 0.28, d: 16, h: ALTURA_PAREDE_BAIXA }
  ],
  estacoes: { galinheiro: PRODUTOS.ovos.horta, prateleira: PRODUTOS.ovos.prateleira },
  tempoOvo: 3.5
};
export const ALA_LEITE = {
  id: 'alaLeite', indice: 2, nivelMinimo: NIVEL_LEITE, custo: 800, produtos: ['leite'],
  limites: { ...CONFIG.limiteMundo },
  piso: { x: 13.6, z: -1.3, w: 3, d: 16 },
  camera: { x: 0.8, z: -0.5, alturaDesktop: 28 },
  duracaoConstrucao: 4,
  paredes: [
    { x: 13.6, z: -9.3, w: 3, d: 0.28, h: 2.8, passagemArtesanal: true },
    { x: 13.6, z: 6.7, w: 3, d: 0.28, h: ALTURA_PAREDE_BAIXA },
    { x: 15.1, z: -1.3, w: 0.28, d: 16, h: ALTURA_PAREDE_BAIXA }
  ],
  tempoLeite: 4.5
};
export const ALA_TRIGO = {
  id: 'alaTrigo', indice: 3, nivelMinimo: NIVEL_TRIGO, custo: 400, produtos: ['trigo'],
  limites: { ...CONFIG.limiteMundo },
  piso: { x: 18.1, z: -1.3, w: 6, d: 16 },
  camera: { x: 0.8, z: -0.5, alturaDesktop: 28 },
  duracaoConstrucao: 4,
  paredes: [
    { x: 18.1, z: -9.3, w: 6, d: 0.28, h: 2.8, passagemArtesanal: true },
    { x: 18.1, z: 6.7, w: 6, d: 0.28, h: ALTURA_PAREDE_BAIXA },
    { x: 21.1, z: -5.45, w: 0.28, d: 7.7, h: ALTURA_PAREDE_BAIXA },
    { x: 21.1, z: 0, w: 0.28, d: 3.2, h: ALTURA_PAREDE_BAIXA, painelExpansao: true },
    { x: 21.1, z: 4.15, w: 0.28, d: 5.1, h: ALTURA_PAREDE_BAIXA }
  ]
};
export const ALA_PADARIA = {
  id: 'alaPadaria', indice: 4, nivelMinimo: NIVEL_PADARIA, custo: 1400, produtos: ['pao'],
  piso: PLANTA_AMPLIADA.piso, camera: PLANTA_AMPLIADA.camera,
  duracaoConstrucao: 4, paredes: paredesAmpliacao(ALTURA_PAREDE_BAIXA),
  entrada: volumePadaria(MODELO_PADARIA.entrada),
  fechamento: MODELO_PADARIA.fechamento.filter(p => !p.entregaTrigo).map(volumePadaria),
  moinho: volumePadaria(MODELO_PADARIA.moinho),
  forno: volumePadaria(MODELO_PADARIA.forno), capacidadeTrigo: 12,
  tempoMoagem: 1.8, tempoForno: 2.3, paesPorTrigo: 3
};

// Identificador preservado para compatibilidade com saves; não amplia o salão.
export const ALA_ARTESANAL = {
  id: 'alaArtesanal', indice: 5, nivelMinimo: 11, custo: 1200, produtos: ['morango'],
  paredes: [],
  camera: PLANTA_AMPLIADA.camera, duracaoConstrucao: 4
};

export const OFICINAS = {
  queijo: { melhoria: 'queijaria', nome: 'Queijaria', ingredientes: { leite: 1 }, rendimento: 2, segundos: 5, capacidadeEntrada: 8 },
  geleia: { melhoria: 'cozinhaGeleia', nome: 'Cozinha de geleias', ingredientes: { morango: 2, mel: 1 }, rendimento: 3, segundos: 6, capacidadeEntrada: 8 }
};

// Uma melhoria pode liberar um produto ou ajustar um atributo. Novas regras
// entram em Simulacao.comprarMelhoria(), mantendo a interface desacoplada.
export const MELHORIAS = [
  { id: 'importarProdutos', titulo: 'Enlatados', descricao: 'Cada caixa tem 9 enlatados. O caminhão entrega no depósito; leve os produtos à gôndola ou conte com o repositor. Cada unidade vale R$ 30.', custo: 270, icone: 'enlatado', max: 1000000000, tipo: 'importacao', produto: 'enlatado', categoria: 'importados', nivelMinimo: 19, requisitoMelhoria: 'prateleirasImportados', recorrente: true },
  { id: 'expansao', titulo: 'Expansão', descricao: 'Amplie os fundos da loja e da cozinha e ganhe um depósito atrás do estacionamento, com uma única porta externa, estantes e caixas. A fazenda recua e as bancadas da cozinha acompanham a nova parede dos fundos.', custo: 10000, icone: 'prateleira', max: 1, tipo: 'expansaoFundos', categoria: 'mercado', nivelMinimo: 18, requisitoMelhoria: 'alaPadaria' },
  { id: 'prateleirasImportados', titulo: 'Prateleiras de importados', descricao: 'Instale até duas prateleiras metálicas de dois lados no centro da loja. No nível 19, a primeira recebe produtos importados.', custo: 1000, icone: 'prateleira', max: 2, tipo: 'mobiliario', categoria: 'mercado', nivelMinimo: 17 },
  { id: 'estacionamento', titulo: 'Estacionamento', descricao: 'Construa seis vagas ao lado da loja. Clientes chegam de carro, estacionam e voltam ao veículo depois das compras.', custo: 10000, icone: 'estacionamento', max: 1, tipo: 'construcaoExterna', categoria: 'mercado', nivelMinimo: 16 },
  { id: 'logistica', titulo: 'Cesta de trabalho', descricao: 'Carregue 8 produtos e ande 15% mais rápido para cuidar de uma loja maior.', custo: 400, icone: 'cesta', max: 1, categoria: 'jogador', nivelMinimo: 10 },
  { id: 'alaArtesanal', titulo: 'Estufa de morangos', descricao: 'Construa uma estufa à direita do curral. Abasteça a nova seção do hortifruti junto à parede esquerda.', custo: ALA_ARTESANAL.custo, icone: 'morango', produto: 'morango', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: 11, requisitoMelhoria: 'alaPadaria' },
  { id: 'apiario', titulo: 'Apiário do bairro', descricao: 'Construa uma colmeia à direita da estufa. Recolha as garrafas de mel na bandeja e abasteça o expositor na frente direita da loja.', custo: 850, icone: 'mel', max: 1, tipo: 'construcao', produto: 'mel', categoria: 'mercado', nivelMinimo: 12, requisitoMelhoria: 'alaArtesanal' },
  { id: 'queijaria', titulo: 'Queijaria', descricao: 'Entregue leite à queijaria na sala dos fundos, pela entrada lateral aberta. Cada garrafa rende 2 queijos. Recolha os queijos e abasteça o refrigerador à direita do leite.', custo: 1600, icone: 'queijo', max: 1, tipo: 'construcao', produto: 'queijo', categoria: 'mercado', nivelMinimo: 13, requisitoMelhoria: 'alaArtesanal', requisitos: ['alaLeite'] },
  { id: 'irrigacao', titulo: 'Irrigação da fazenda', descricao: 'Instale irrigadores em todas as hortas: as colheitas crescem 25% mais rápido.', custo: 650, icone: 'folha', max: 1, categoria: 'mercado', nivelMinimo: 14, requisitoMelhoria: 'alaArtesanal' },
  { id: 'equipeAgil', titulo: 'Reposição ágil', descricao: 'O repositor anda 30% mais rápido e prioriza as bancas vazias da loja ampliada.', custo: 500, icone: 'raio', max: 1, categoria: 'funcionarios', nivelMinimo: 14, requisitoMelhoria: 'ajudante' },
  { id: 'cozinhaGeleia', titulo: 'Cozinha de geleias', descricao: 'Na cozinha ao lado da queijaria, na sala dos fundos, combine 2 morangos e 1 mel para fazer 3 geleias. Recolha os potes e abasteça a seção de geleias junto ao mel, na frente direita.', custo: 2200, icone: 'geleia', max: 1, tipo: 'construcao', produto: 'geleia', categoria: 'mercado', nivelMinimo: 15, requisitoMelhoria: 'apiario' },
  { id: 'milho', titulo: 'Uma nova colheita', descricao: 'Abra o canteiro de milho atrás dos tomates e acrescente sua seção à banca de hortifruti.', custo: 350, icone: 'milho', produto: 'milho', max: 1, tipo: 'produto', categoria: 'mercado', nivelMinimo: 3 },
  { id: 'alaProducao', titulo: 'Ala dos ovos', descricao: 'Construa o galinheiro atrás da loja e instale a estante de ovos na parede do fundo, à direita da porta de produção.', custo: ALA_PRODUCAO.custo, icone: 'ovos', produto: 'ovos', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_OVOS },
  { id: 'alaLeite', titulo: 'Ala do leite', descricao: 'Construa o curral atrás da loja, ao lado do galinheiro, e instale o refrigerador de leite junto aos ovos na parede do fundo.', custo: ALA_LEITE.custo, icone: 'leite', produto: 'leite', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_LEITE },
  { id: 'alaTrigo', titulo: 'Ala do trigo', descricao: 'Abra o canteiro de trigo atrás do milho e acrescente sua seção ao hortifruti, mantendo o salão inicial.', custo: ALA_TRIGO.custo, icone: 'trigo', produto: 'trigo', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_TRIGO },
  { id: 'alaPadaria', titulo: 'Padaria', descricao: 'Cada trigo rende 3 pães. Entregue trigo na caixa ao fundo da padaria, junto à parede direita.', custo: ALA_PADARIA.custo, icone: 'pao', produto: 'pao', max: 1, tipo: 'expansao', categoria: 'mercado', nivelMinimo: NIVEL_PADARIA, requisitoMelhoria: 'alaTrigo' },
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
