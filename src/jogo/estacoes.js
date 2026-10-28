import { PRODUTOS, ALA_PADARIA } from './configuracao.js';
import { CLASSES_PRODUTOS } from './classes-produtos.js';
import { CONFEITARIA } from './confeitaria.js';
import { SUCOS } from './sucos.js';

// O alcance acompanha o móvel real, por qualquer lado, sem exigir uma marca no piso.
export function geometriaEstacao(id, tipo, produtos = PRODUTOS) {
  if (id === 'pao') return ALA_PADARIA.entrada;
  const p = produtos[id];
  if (p.origem === 'sucos' && tipo === 'coleta') return SUCOS.bancada;
  if (p.origem === 'confeitaria' && tipo === 'coleta') return CONFEITARIA.entrada;
  if (p.origem === 'importado' && tipo === 'coleta') return p.horta;
  if (p.origem === 'importado' && tipo === 'reposicao' && p.classe !== 'soda') {
    const lado = CLASSES_PRODUTOS[p.classe].lado;
    return { ...p.prateleira, x: p.prateleira.x + lado * p.prateleira.w / 4, w: p.prateleira.w / 2 };
  }
  return tipo === 'reposicao' ? p.prateleira : {
    ...p.horta, ...(p.galinheiro ?? p.canteiro ?? p.curral ?? { w: 2.5, d: 3.6 })
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

// Uma parede contínua pode separar alcances próximos em ambientes distintos.
// Deve cobrir toda a projeção compartilhada, não só a linha entre os centros;
// assim um vão de porta ou o fim da parede não concede uma exceção indevida.
export function estacoesSeparadasPorParede(a, b, paredes, raio) {
  return paredes.some(p => ['x', 'z'].some(eixo => {
    const transversal = eixo === 'x' ? 'z' : 'x';
    const tamanho = eixo === 'x' ? 'w' : 'd', largura = eixo === 'x' ? 'd' : 'w';
    if (p[tamanho] > 0.3) return false;
    const min = o => o[eixo] - o[tamanho] / 2, max = o => o[eixo] + o[tamanho] / 2;
    if (!((max(a) <= min(p) && min(b) >= max(p)) || (max(b) <= min(p) && min(a) >= max(p)))) return false;
    const inicio = Math.max(a[transversal] - a[largura] / 2 - raio, b[transversal] - b[largura] / 2 - raio);
    const fim = Math.min(a[transversal] + a[largura] / 2 + raio, b[transversal] + b[largura] / 2 + raio);
    return inicio <= fim && p[transversal] - p[largura] / 2 <= inicio + 1e-8 && p[transversal] + p[largura] / 2 >= fim - 1e-8;
  }));
}
