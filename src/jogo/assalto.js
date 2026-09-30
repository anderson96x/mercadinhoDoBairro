export const ASSALTO = Object.freeze({ espera: import.meta.env?.DEV ? 5 : 60, chegada: 2, desembarque: 3, entrada: 3.9, coleta: 5.4, retirada: 7.4, saida: 8.9, embarque: 9.8, partida: 10.5, fim: 13.5 });

export function validarAssalto(dados) {
  if (!dados || !Number.isFinite(dados.tempo)) return null;
  return {
    tempo: Math.max(-1, Math.min(ASSALTO.fim, dados.tempo)),
    invadiu: dados.invadiu === true, roubado: dados.roubado === true, encerrado: dados.encerrado === true,
    valor: Number.isFinite(dados.valor) ? Math.max(0, Math.min(1e9, dados.valor)) : 0
  };
}

export function statusAssalto(assalto) {
  if (!assalto) return '';
  if (assalto.tempo < ASSALTO.entrada) return 'Um carro suspeito está chegando!';
  if (assalto.tempo < ASSALTO.retirada) return 'Assalto em andamento!';
  if (assalto.tempo < ASSALTO.saida) return 'O assaltante levou o dinheiro do caixa!';
  return 'O assaltante está fugindo!';
}
