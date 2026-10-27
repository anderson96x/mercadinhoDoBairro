import { pontoPadaria } from './planta.js';
import { ALA_PADARIA, PRODUTOS } from './configuracao.js';

export function trabalhoPadaria(estado) {
  const p = estado.producao;
  const prontos = estado.produtos.pao.prateleira;
  const reserva = p.paesReserva || 0;
  const pendentes = p.entregaPadaria?.paes || 0;
  const cheia = prontos >= PRODUTOS.pao.capacidadePrateleira;
  return {
    cheia,
    moendo: !cheia && p.trigoPadaria > 0 && p.farinha < 3
      && prontos + reserva + pendentes + p.farinha * ALA_PADARIA.paesPorTrigo < PRODUTOS.pao.capacidadePrateleira,
    assando: !cheia && reserva === 0 && pendentes === 0 && p.farinha > 0
  };
}

export function criarRoteirosPadaria() {
  const coletaTrigo = { x: 5.65, z: -4.4 };
  const corredorEsquerdo = { x: 6.8, z: -4.2 };
  const postoMoinho = { x: 7.05, z: -5.4 };
  const entregaForno = { x: 8.2, z: -4.2 };
  const postoForno = { x: 7.05, z: -5.4 };
  const postoVitrine = { x: 8.8, z: -2.85 };
  const roteiros = [
    [
      { de: coletaTrigo, para: corredorEsquerdo, duracao: 0.55, carga: 'trigo' },
      { de: corredorEsquerdo, para: postoMoinho, duracao: 1.15, carga: 'trigo' },
      { de: postoMoinho, para: postoMoinho, duracao: 1.7, acao: 'moer' },
      { de: postoMoinho, para: postoMoinho, duracao: 0.85, acao: 'receber', carga: 'farinha' },
      { de: postoMoinho, para: corredorEsquerdo, duracao: 0.65, carga: 'farinha' },
      { de: corredorEsquerdo, para: postoForno, duracao: 0.65, carga: 'farinha' },
      { de: postoForno, para: postoForno, duracao: 1, acao: 'colocar', carga: 'farinha' },
      { de: postoForno, para: postoForno, duracao: 1.5, acao: 'assar' },
      { de: postoForno, para: postoForno, duracao: 1, acao: 'retirar', carga: 'pao' },
      { de: postoForno, para: entregaForno, duracao: 1.1, carga: 'pao' },
      { de: entregaForno, para: postoVitrine, duracao: 0.75, carga: 'pao' },
      { de: postoVitrine, para: postoVitrine, duracao: 0.55, acao: 'expor', carga: 'pao' },
      { de: postoVitrine, para: corredorEsquerdo, duracao: 1.1 },
      { de: corredorEsquerdo, para: coletaTrigo, duracao: 0.55 },
      { de: coletaTrigo, para: coletaTrigo, duracao: 0.45, acao: 'buscar' }
    ]
  ];
  // Quando resta apenas farinha, o mesmo padeiro retoma diretamente no forno.
  const roteiroForno = [
    ...roteiros[0].slice(3, 12).map(etapa => ({ ...etapa })),
    { de: postoVitrine, para: corredorEsquerdo, duracao: 1.1 },
    { de: corredorEsquerdo, para: postoMoinho, duracao: 0.6 }
  ];
  const espera = { x: 6.4, z: -2.95 };
  roteiros[0].unshift({ de: espera, para: coletaTrigo, duracao: 0.9 });
  roteiros[0].push({ de: coletaTrigo, para: espera, duracao: 0.9 });
  roteiroForno.unshift({ de: espera, para: corredorEsquerdo, duracao: 0.75 }, { de: corredorEsquerdo, para: postoMoinho, duracao: 0.65 });
  roteiroForno.push({ de: postoMoinho, para: corredorEsquerdo, duracao: 0.65 }, { de: corredorEsquerdo, para: espera, duracao: 0.75 });
  for (const roteiro of [...roteiros, roteiroForno]) for (const etapa of roteiro) {
    etapa.de = pontoPadaria(etapa.de); etapa.para = pontoPadaria(etapa.para);
  }
  return { roteiros, roteiroForno };
}

export const estadoEntregaPadaria = () => ({ modo: '', tempo: 0, paes: 0, entregou: false });
const ROTEIROS = criarRoteirosPadaria();
export const roteiroEntregaPadaria = modo => modo === 'completo' ? ROTEIROS.roteiros[0] : ROTEIROS.roteiroForno;

export function validarEntregaPadaria(dados) {
  const entrega = estadoEntregaPadaria();
  if (!dados) return entrega;
  entrega.modo = ['completo', 'forno'].includes(dados.modo) ? dados.modo : '';
  const duracao = roteiroEntregaPadaria(entrega.modo).reduce((total, etapa) => total + etapa.duracao, 0);
  entrega.tempo = Number.isFinite(dados.tempo) && entrega.modo ? Math.max(0, Math.min(duracao, dados.tempo)) : 0;
  entrega.paes = Number.isFinite(dados.paes) ? Math.max(0, Math.min(3, Math.floor(dados.paes))) : 0;
  entrega.entregou = !!dados.entregou && !!entrega.modo;
  return entrega;
}

// O relógio da simulação governa a pose e a transferência real para a vitrine.
export function atualizarEntregaPadaria(estado, dt) {
  if (dt <= 0) return 0;
  const p = estado.producao, entrega = p.entregaPadaria;
  const trabalho = trabalhoPadaria(estado);
  if (!entrega.modo && (trabalho.moendo || trabalho.assando || entrega.paes > 0)) {
    entrega.modo = trabalho.moendo ? 'completo' : 'forno';
    entrega.tempo = 0; entrega.entregou = false;
  }
  if (!entrega.modo) return 0;
  const roteiro = roteiroEntregaPadaria(entrega.modo);
  let instante = 0, fimForno = 0, instanteEntrega = 0;
  for (const etapa of roteiro) {
    if (etapa.acao === 'assar') fimForno = instante + etapa.duracao;
    if (etapa.acao === 'expor') instanteEntrega = instante + etapa.duracao * 0.7;
    instante += etapa.duracao;
  }
  entrega.tempo = Math.min(instante, entrega.tempo + dt);
  if (!entrega.entregou && entrega.paes === 0) entrega.tempo = Math.min(entrega.tempo, fimForno - 1e-6);
  let quantidade = 0;
  if (!entrega.entregou && entrega.tempo >= instanteEntrega) {
    quantidade = Math.min(entrega.paes, PRODUTOS.pao.capacidadePrateleira - estado.produtos.pao.prateleira);
    if (quantidade > 0) {
      estado.produtos.pao.prateleira += quantidade;
      p.paesProduzidos += quantidade;
      p.paesReserva += entrega.paes - quantidade;
      entrega.paes = 0; entrega.entregou = true;
    } else entrega.tempo = instanteEntrega - 1e-6;
  }
  if (entrega.tempo >= instante) { entrega.modo = ''; entrega.tempo = 0; entrega.entregou = false; }
  return quantidade;
}
