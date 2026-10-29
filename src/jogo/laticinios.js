import { PLANTA_QUEIJO } from './planta.js';

export const LATICINIOS = {
  geladeira: { ...PLANTA_QUEIJO.prateleira, x: 14.15, movel: 'geladeira-laticinios' },
  cliente: { x: 14.15, z: -7.15 },
  // Junto à parede esquerda, atrás da Soda e antes da primeira estante.
  deposito: { x: -14.35, z: -12.7, w: 1.2, d: 1.2 },
  coleta: { x: -13.05, z: -12.7 },
  alturaCaixa: 0.5,
  variedades: {
    manteiga: { nome: 'Manteiga', cor: 0xf1c86c },
    cremeLeite: { nome: 'Creme de leite', cor: 0x62a9bc },
    iogurte: { nome: 'Iogurte', cor: 0xef817b },
    requeijao: { nome: 'Requeijão', cor: 0x438aaf }
  }
};

export function posicaoCaixaLaticinios(indice) {
  return { x: LATICINIOS.deposito.x, y: 0.23 + indice * (LATICINIOS.alturaCaixa + 0.02), z: LATICINIOS.deposito.z };
}

// Consolida os identificadores da implementação provisória sem perder estoque pago.
export function migrarLaticinios(dados) {
  const antigos = Object.keys(LATICINIOS.variedades);
  if (!antigos.some(id => dados.produtos?.[id])) return dados;
  const copia = structuredClone(dados);
  const converter = id => antigos.includes(id) ? 'laticinio' : id;
  const estoques = [copia.produtos.laticinio, ...antigos.map(id => copia.produtos[id])].filter(Boolean);
  copia.produtos.laticinio = {
    prateleira: estoques.reduce((total, p) => total + (Number.isFinite(p.prateleira) ? Math.max(0, Math.floor(p.prateleira)) : 0), 0),
    apresentado: estoques.some(p => p.apresentado || p.prateleira > 0)
  };
  for (const id of antigos) delete copia.produtos[id];
  for (const lista of [copia.deposito?.pacotes, copia.deposito?.excedentes]) {
    if (Array.isArray(lista)) for (const pacote of lista) if (pacote) pacote.produto = converter(pacote.produto);
  }
  if (Array.isArray(copia.deposito?.pedidos)) for (const pedido of copia.deposito.pedidos) {
    if (Array.isArray(pedido?.pacotes)) pedido.pacotes = pedido.pacotes.map(converter);
  }
  for (const ator of [copia.jogador, copia.funcionarios?.ajudante]) {
    if (Array.isArray(ator?.inventario)) ator.inventario = ator.inventario.map(converter);
    if (ator?.produto) ator.produto = converter(ator.produto);
  }
  return copia;
}
