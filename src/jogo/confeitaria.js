import { MODELO_PADARIA, pontoPadaria, volumePadaria } from './planta.js';

export const CONFEITARIA = {
  nivel: 17, custo: 1000, segundos: 6, capacidadeIngredientes: 8,
  ingredientes: { mel: 1, ovos: 1 },
  entrada: volumePadaria(MODELO_PADARIA.fechamento[1]),
  entrega: pontoPadaria({ x: 3.85, z: -3.375 }),
  limiteEntregaX: pontoPadaria({ x: 4.75, z: -4.3 }).x,
  maquina: { x: 7.35, z: -5.65, w: 0.65, d: 0.75 },
  posto: pontoPadaria({ x: 7.35, z: -4.65 }),
  produtos: {
    bolo: { nome: 'Bolo', plural: 'Bolos', balcao: 3, capacidade: 6, cor: 0xf1bba3, cliente: { x: 5.1625, z: -0.95 } },
    donut: { nome: 'Donut', plural: 'Donuts', balcao: 0, capacidade: 12, cor: 0xe998b2, cliente: { x: 11.45, z: -4.425 } },
    eclair: { nome: 'Éclair', plural: 'Éclairs', balcao: 4, capacidade: 6, cor: 0x70402b, cliente: { x: 10.0375, z: -0.95 } }
  }
};

const posto = CONFEITARIA.posto;
const corredor = pontoPadaria({ x: 7.35, z: -3.2 });
const bolo = pontoPadaria({ x: 5.65, z: -2.95 });
const donut = pontoPadaria({ x: 9.5, z: -3.2 });
const eclair = pontoPadaria({ x: 9.5, z: -2.95 });
const andar = (de, para) => ({ de, para, duracao: Math.hypot(para.x - de.x, para.z - de.z) / 2.5 });
const entregar = (ponto, produto) => ({ de: ponto, para: ponto, duracao: 0.45, produto });
export const ROTEIRO_CONFEITARIA = [
  andar(posto, corredor), andar(corredor, bolo), entregar(bolo, 'bolo'),
  andar(bolo, corredor), andar(corredor, donut), entregar(donut, 'donut'),
  andar(donut, eclair), entregar(eclair, 'eclair'), andar(eclair, corredor), andar(corredor, posto)
];
export const maquinaConfeitaria = () => volumePadaria(CONFEITARIA.maquina);
export const estadoConfeitaria = () => ({ mel: 0, ovos: 0, progresso: 0, lotes: 0, etapaEntrega: -1, tempoEntrega: 0 });

export function validarConfeitaria(dados, liberada) {
  const estado = estadoConfeitaria();
  if (!liberada) return estado;
  for (const [campo, maximo] of [['mel', CONFEITARIA.capacidadeIngredientes], ['ovos', CONFEITARIA.capacidadeIngredientes], ['progresso', CONFEITARIA.segundos], ['lotes', 1e9]]) {
    const valor = dados?.[campo];
    estado[campo] = Number.isFinite(valor) ? Math.max(0, Math.min(maximo, campo === 'progresso' ? valor : Math.floor(valor))) : 0;
  }
  if (Number.isInteger(dados?.etapaEntrega) && dados.etapaEntrega >= 0 && dados.etapaEntrega < ROTEIRO_CONFEITARIA.length) {
    estado.etapaEntrega = dados.etapaEntrega;
    estado.tempoEntrega = Number.isFinite(dados.tempoEntrega) ? Math.max(0, Math.min(ROTEIRO_CONFEITARIA[estado.etapaEntrega].duracao, dados.tempoEntrega)) : 0;
    estado.progresso = 0;
  }
  return estado;
}

export function podeProduzirConfeitaria(estado) {
  return !!estado.melhorias.confeitaria
    && estado.confeitaria.etapaEntrega < 0
    && Object.entries(CONFEITARIA.ingredientes).every(([id, quantidade]) => estado.confeitaria[id] >= quantidade)
    && Object.entries(CONFEITARIA.produtos).every(([id, produto]) => estado.produtos[id].prateleira < produto.capacidade);
}

export function produzirConfeitaria(estado, dt) {
  if (dt <= 0 || !estado.melhorias.confeitaria) return 0;
  const producao = estado.confeitaria;
  let lotes = 0;
  while (dt > 0) {
    if (producao.etapaEntrega >= 0) {
      const etapa = ROTEIRO_CONFEITARIA[producao.etapaEntrega];
      const passo = Math.min(dt, Math.max(0, etapa.duracao - producao.tempoEntrega));
      producao.tempoEntrega += passo; dt -= passo;
      if (producao.tempoEntrega + 1e-9 < etapa.duracao) break;
      if (etapa.produto) {
        const estoque = estado.produtos[etapa.produto];
        if (estoque.prateleira >= CONFEITARIA.produtos[etapa.produto].capacidade) break;
        estoque.prateleira++; estoque.apresentado = true;
        if (etapa.produto === 'eclair') { producao.lotes++; lotes++; }
      }
      producao.etapaEntrega++; producao.tempoEntrega = 0;
      if (producao.etapaEntrega >= ROTEIRO_CONFEITARIA.length) producao.etapaEntrega = -1;
    } else {
      if (!podeProduzirConfeitaria(estado)) break;
      const passo = Math.min(dt, CONFEITARIA.segundos - producao.progresso);
      producao.progresso += passo; dt -= passo;
      if (producao.progresso + 1e-9 < CONFEITARIA.segundos) break;
      for (const [id, quantidade] of Object.entries(CONFEITARIA.ingredientes)) producao[id] -= quantidade;
      producao.progresso = 0; producao.etapaEntrega = 0; producao.tempoEntrega = 0;
    }
  }
  return lotes;
}

export function situacaoConfeiteiro(estado) {
  const producao = estado.confeitaria;
  const etapa = ROTEIRO_CONFEITARIA[producao.etapaEntrega];
  if (!etapa) return { ...posto, acao: podeProduzirConfeitaria(estado) ? 'misturar' : 'esperar', carga: [] };
  const t = Math.min(1, producao.tempoEntrega / etapa.duracao);
  return { x: etapa.de.x + (etapa.para.x - etapa.de.x) * t, z: etapa.de.z + (etapa.para.z - etapa.de.z) * t,
    acao: etapa.produto ? 'entregar' : 'andar', produto: etapa.produto,
    carga: Object.keys(CONFEITARIA.produtos).filter(id => ROTEIRO_CONFEITARIA.findIndex(e => e.produto === id) >= producao.etapaEntrega),
    angulo: Math.atan2(etapa.para.x - etapa.de.x, etapa.para.z - etapa.de.z) };
}
