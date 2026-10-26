import { ALA_PADARIA, PRODUTOS } from './configuracao.js';

export function trabalhoPadaria(estado) {
  const p = estado.producao;
  const prontos = estado.produtos.pao.prateleira;
  const reserva = p.paesReserva || 0;
  const cheia = prontos >= PRODUTOS.pao.capacidadePrateleira;
  return {
    cheia,
    moendo: !cheia && p.trigoPadaria > 0 && p.farinha < 3
      && prontos + reserva + p.farinha * ALA_PADARIA.paesPorTrigo < PRODUTOS.pao.capacidadePrateleira,
    assando: !cheia && reserva === 0 && p.farinha > 0
  };
}
