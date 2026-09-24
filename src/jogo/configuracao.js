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
  intervaloClientes: 5,
  maxClientes: 5,
  espacoClientes: 1.15,
  distanciaClientes: 1.05,
  limiteMundo: { minX: -10.5, maxX: 10.5, minZ: -8, maxZ: 9 },
  inicio: { x: -2.8, z: 3.4 },
  caixa: { x: 4.5, z: 4.1 },
  cadeiraCaixa: { x: 3.9, z: 4.1 },
  entrada: { x: 8.5, z: 8.4 },
  anguloCamera: Math.atan2(12, 18)
};

export const PRODUTOS = {
  tomate: {
    nome: 'Tomate', plural: 'Tomates', cor: 0xef5a42, preco: 8,
    tempoCrescimento: 1.8, capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -6.6, z: -2.8 }, coleta: { x: -5.3, z: -1.7 },
    prateleira: { x: 0.4, z: -1.8 }, reposicao: { x: -0.6, z: -0.1 },
    cliente: { x: 1.4, z: -0.1 }, liberado: true
  },
  milho: {
    nome: 'Milho', plural: 'Milhos', cor: 0xf6c844, preco: 14,
    tempoCrescimento: 2.8, capacidadeHorta: 8, capacidadePrateleira: 12,
    horta: { x: -6.6, z: 3.4 }, coleta: { x: -5.3, z: 3.4 },
    prateleira: { x: 4.5, z: -1.8 }, reposicao: { x: 3.5, z: -0.1 },
    cliente: { x: 5.5, z: -0.1 }, liberado: false
  }
};

// Uma melhoria pode liberar um produto ou ajustar um atributo. Novas regras
// entram em Simulacao.comprarMelhoria(), mantendo a interface desacoplada.
export const MELHORIAS = [
  { id: 'milho', titulo: 'Uma nova colheita', descricao: 'Abra a horta e a prateleira de milho. Cada unidade vale R$ 14.', custo: 80, icone: 'milho', max: 1, tipo: 'produto', categoria: 'mercado' },
  { id: 'mochila', titulo: 'Cabe mais um pouco', descricao: 'Leve mais 4 produtos por viagem.', custo: 60, multiplicador: 1.75, icone: 'mochila', max: 3, categoria: 'jogador' },
  { id: 'velocidade', titulo: 'Passo ligeiro', descricao: 'Ande 20% mais rápido pelo mercadinho.', custo: 90, multiplicador: 1.8, icone: 'raio', max: 3, categoria: 'jogador' },
  { id: 'caixa', titulo: 'Uma mão no caixa', descricao: 'Contrate alguém para atender a fila enquanto você cuida da loja.', custo: 140, icone: 'pessoa', max: 1, categoria: 'funcionarios' },
  { id: 'ajudante', titulo: 'Ajuda na reposição', descricao: 'Um ajudante colhe e abastece suas prateleiras.', custo: 220, icone: 'cesta', max: 1, categoria: 'funcionarios' }
];

export const MISSOES = [
  { titulo: 'Da horta para a loja', texto: 'Aproxime-se da horta vermelha para colher 3 tomates.', chave: 'colhidos', alvo: 3, destino: 'horta' },
  { titulo: 'Prateleiras cheias', texto: 'Leve os tomates até a prateleira dentro da loja.', chave: 'repostos', alvo: 3, destino: 'prateleira' },
  { titulo: 'A primeira venda', texto: 'Fique no círculo do caixa para atender um cliente.', chave: 'clientes', alvo: 1, destino: 'caixa' },
  { titulo: 'Hora de crescer', texto: 'Junte R$ 80 e libere o milho em Melhorias.', chave: 'milho', alvo: 1, destino: 'melhorias' },
  { titulo: 'Trabalho em equipe', texto: 'Contrate alguém para o caixa por R$ 140.', chave: 'caixa', alvo: 1, destino: 'melhorias' },
  { titulo: 'O queridinho do bairro', texto: 'Atenda 20 clientes e faça o bairro voltar sempre.', chave: 'clientes', alvo: 20, destino: 'caixa' }
];
