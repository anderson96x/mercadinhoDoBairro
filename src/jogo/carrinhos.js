import { CONFIG } from './configuracao.js';

// Retirada na borda frontal do estacionamento, fora das vagas e das manobras.
export const CARRINHOS = {
  quantidade: 5,
  capacidade: 20,
  pedidoMinimo: 10,
  suporte: { x: -5.35, z: 5.25, w: 2.5, d: 0.92 },
  // Os carrinhos encaixados apontam para +x; a alça e a manobra ficam atrás, em -x.
  retirada: { x: -7.05, z: 5.25 },
  manobra: { x: -8.15, z: 5.25 }
};

export const capacidadeCompraCliente = cliente => cliente.usaCarrinho ? CARRINHOS.capacidade : CONFIG.capacidadeCestaCliente;
