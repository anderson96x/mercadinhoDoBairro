import { PRODUTOS, ALA_PADARIA } from './configuracao.js';

// O alcance acompanha o móvel real, por qualquer lado, sem exigir uma marca no piso.
export function geometriaEstacao(id, tipo) {
  if (id === 'pao') return ALA_PADARIA.entrada;
  const p = PRODUTOS[id];
  return tipo === 'reposicao' ? p.prateleira : {
    ...p.horta, ...(id === 'ovos' ? { w: 2.5, d: 2.2 } : p.curral ?? { w: 2.5, d: 3.6 })
  };
}

export function pontoMaisProximo(ator, objeto) {
  return {
    x: Math.max(objeto.x - objeto.w / 2, Math.min(objeto.x + objeto.w / 2, ator.x)),
    z: Math.max(objeto.z - objeto.d / 2, Math.min(objeto.z + objeto.d / 2, ator.z))
  };
}

export function distanciaEstacao(ator, objeto) {
  const ponto = pontoMaisProximo(ator, objeto);
  return Math.hypot(ator.x - ponto.x, ator.z - ponto.z);
}

export function intervaloEstacoes(a, b) {
  return Math.hypot(Math.max(0, Math.abs(a.x - b.x) - (a.w + b.w) / 2),
    Math.max(0, Math.abs(a.z - b.z) - (a.d + b.d) / 2));
}
