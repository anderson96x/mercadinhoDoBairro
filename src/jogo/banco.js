import { ASSALTO, validarAssalto } from './assalto.js';

export const BANCO = Object.freeze({ limite: 1000, chegada: 5, desembarque: 6, coleta: 14, retirada: 17, embarque: 25, partida: 27, fim: 33 });

export function estadoBanco() { return { noCaixa: 0, depositado: 0, coleta: null, tempoRisco: 0, assalto: null }; }

export function validarBanco(dados) {
  const numero = v => Number.isFinite(v) ? Math.max(0, Math.min(1e9, Math.floor(v))) : 0;
  const banco = { ...estadoBanco(), noCaixa: numero(dados?.noCaixa), depositado: numero(dados?.depositado),
    tempoRisco: Number.isFinite(dados?.tempoRisco) ? Math.max(0, Math.min(ASSALTO.espera, dados.tempoRisco)) : 0,
    assalto: validarAssalto(dados?.assalto) };
  const coleta = dados?.coleta;
  if (coleta && numero(coleta.valor) > 0) {
    const retirado = coleta.retirado === true;
    const valor = retirado ? numero(coleta.valor) : Math.min(numero(coleta.valor), banco.noCaixa);
    let tempo = Number.isFinite(coleta.tempo) ? Math.max(-1, Math.min(BANCO.fim, coleta.tempo)) : -1;
    if (retirado) tempo = Math.max(BANCO.retirada, tempo);
    else tempo = Math.min(BANCO.retirada, tempo);
    if (valor) banco.coleta = { valor, tempo, retirado };
  }
  if (banco.coleta) { banco.assalto = null; banco.tempoRisco = 0; }
  return banco;
}

export function atualizarBanco(banco, dt) {
  const coleta = banco.coleta;
  if (!coleta || coleta.tempo < 0 || dt <= 0) return null;
  coleta.tempo += dt;
  if (!coleta.retirado && coleta.tempo >= BANCO.retirada) {
    banco.noCaixa = Math.max(0, banco.noCaixa - coleta.valor);
    coleta.retirado = true;
  }
  if (coleta.tempo >= BANCO.fim) {
    banco.depositado += coleta.valor;
    banco.coleta = null;
    return coleta.valor;
  }
  return null;
}

export function statusColeta(coleta) {
  if (!coleta) return '';
  if (coleta.tempo < BANCO.chegada) return 'O carro-forte está a caminho';
  if (coleta.tempo < BANCO.coleta) return 'Um agente está indo ao caixa';
  if (coleta.tempo < BANCO.retirada) return 'O agente está recolhendo o dinheiro';
  if (coleta.tempo < BANCO.embarque) return 'O agente está voltando ao carro-forte';
  return 'O carro-forte está levando o depósito ao banco';
}
