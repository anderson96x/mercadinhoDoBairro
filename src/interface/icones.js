const caminhos = {
  loja: '<path d="M3 10h18l-2-6H5l-2 6Zm2 0v10h14V10M9 20v-6h6v6M8 4l-1 6m9-6 1 6"/>',
  moeda: '<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',
  pessoa: '<circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M9 16l3 3 3-3"/>',
  cesta: '<path d="m3 10 2 10h14l2-10H3Zm4 0 5-7 5 7m-9 4v3m4-3v3m4-3v3"/>',
  milho: '<path d="M12 21c-5-3-6-9-5-13 3 0 5 3 5 7 0-4 2-7 5-7 1 4 0 10-5 13ZM9 9V6a3 3 0 0 1 6 0v3m-3-4v7"/>',
  tomate: '<path d="M12 7c-7-4-12 7-6 12 3 2 9 2 12-1 5-6 0-14-6-11Z"/><path d="m7 6 5 2 4-3m-4 3 1-5"/>',
  mochila: '<path d="M5 10a7 7 0 0 1 14 0v10H5V10ZM9 4V2h6v2M8 13h8v5H8v-5Z"/>',
  raio: '<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
  melhorar: '<path d="M4 18h4v3H4v-3Zm6-5h4v8h-4v-8Zm6-6h4v14h-4V7ZM3 11l6-6 4 2 6-5m-5 0h5v5"/>',
  som: '<path d="m4 9 4 0 5-4v14l-5-4H4V9Zm12-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  mudo: '<path d="m4 9 4 0 5-4v14l-5-4H4V9Zm12 0 5 6m0-6-5 6"/>',
  pausa: '<path d="M8 5v14M16 5v14"/>',
  jogar: '<path d="m8 4 12 8-12 8V4Z"/>',
  ajuda: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v.1"/>',
  fechar: '<path d="m6 6 12 12M6 18 18 6"/>',
  certo: '<path d="m5 12 4 4L19 6"/>',
  seta: '<path d="m9 5 7 7-7 7"/>',
  alvo: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3"/>',
  toque: '<path d="M9 12V5a2 2 0 0 1 4 0v6l3-1 5 3-2 8h-9l-6-8a2 2 0 0 1 3-2l2 3"/>',
  folha: '<path d="M20 3C5 1 1 13 8 17c6 5 15-1 12-14ZM4 21 16 8"/>',
  reiniciar: '<path d="M4 10a8 8 0 1 1 1 8M4 3v7h7"/>',
  tela: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'
  ,dev: '<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14"/>'
};
export const icone = (nome, classe = '') => `<svg class="icone ${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${caminhos[nome] || caminhos.loja}</svg>`;
