import { SODA, posicaoCaixaSoda } from './soda.js';
import { LATICINIOS, posicaoCaixaLaticinios } from './laticinios.js';
import { PLANTA_DEPOSITO, PLANTA_CARGA } from './planta.js';
import { PRODUTOS } from './configuracao.js';
import { segmentoLivre } from './navegacao.js';
import { CLASSES_PRODUTOS, PACOTES_POR_CLASSE, unidadesPacote } from './classes-produtos.js';

export { UNIDADES_PACOTE } from './classes-produtos.js';
export const CAPACIDADE_DEPOSITO = Object.keys(CLASSES_PRODUTOS).length * PACOTES_POR_CLASSE;
export const TEMPO_ESPERA_ENTREGA = 60;
export const ENTREGA = { comprimento: 5.2, largura: 2.12, velocidade: 2.6, velocidadeRe: 1.5,
  estacionamento: { x: PLANTA_CARGA.vaga.x, z: PLANTA_CARGA.vaga.z }, retirada: PLANTA_CARGA.retirada };
export const estadoDeposito = () => ({ pacotes: [], excedentes: [], pedidos: [], proximoId: 1 });
export const classeProduto = produto => PRODUTOS[produto]?.classe;
export const pacotesDaClasse = (deposito, classe) => deposito.pacotes.filter(p => classeProduto(p.produto) === classe).length;
export const pacotesPendentes = (deposito, classe) => deposito.pedidos.reduce((total, pedido) => total + pedido.pacotes.filter(p => !classe || classeProduto(p) === classe).length, 0);
export const excedentesDaClasse = (deposito, classe) => (deposito.excedentes || []).filter(p => classeProduto(p.produto) === classe).length;
export function vagasDeposito(deposito, classe) {
  if (!classe) return Object.keys(CLASSES_PRODUTOS).reduce((total, id) => total + vagasDeposito(deposito, id), 0);
  if (!CLASSES_PRODUTOS[classe]) return 0;
  return Math.max(0, PACOTES_POR_CLASSE - pacotesDaClasse(deposito, classe) - pacotesPendentes(deposito, classe) - excedentesDaClasse(deposito, classe));
}
export function slotLivre(deposito, produto) {
  const classe = CLASSES_PRODUTOS[classeProduto(produto)];
  if (!classe) return undefined;
  return Array.from({ length: PACOTES_POR_CLASSE }, (_, i) => classe.estante * PACOTES_POR_CLASSE + i)
    .find(slot => !deposito.pacotes.some(p => p.slot === slot));
}
export function acomodarExcedentes(deposito) {
  deposito.excedentes = (deposito.excedentes || []).filter(p => {
    const slot = slotLivre(deposito, p.produto);
    if (slot === undefined) return true;
    deposito.pacotes.push({ ...p, slot });
    return false;
  });
}
export function posicaoPacote(slot) {
  if (Math.floor(slot / PACOTES_POR_CLASSE) === CLASSES_PRODUTOS.laticinios.estante) {
    const p = posicaoCaixaLaticinios(slot % PACOTES_POR_CLASSE);
    return { ...p, y: p.y + LATICINIOS.alturaCaixa / 2 };
  }
  if (Math.floor(slot / PACOTES_POR_CLASSE) === CLASSES_PRODUTOS.soda.estante) {
    const p = posicaoCaixaSoda(slot % PACOTES_POR_CLASSE);
    return { ...p, y: p.y + 0.15 };
  }
  const estante = PLANTA_DEPOSITO.estantes[Math.floor(slot / PACOTES_POR_CLASSE)];
  return { x: estante.x + (slot % 2 - 0.5) * 0.94, y: 0.23 + [0.595, 1.595][Math.floor(slot % PACOTES_POR_CLASSE / 2)], z: estante.z };
}
export function validarDeposito(dados, produtos) {
  const base = estadoDeposito();
  const valido = id => produtos[id]?.liberado && PRODUTOS[id]?.origem === 'importado' && !!CLASSES_PRODUTOS[classeProduto(id)];
  // O formato antigo permitia 27 caixas. Preserve o excedente pago, sem ocupar outra classe.
  const limiteSalvo = Math.max(27, CAPACIDADE_DEPOSITO);
  const lista = valor => Array.isArray(valor) ? valor.slice(0, limiteSalvo) : [];
  let restantes = limiteSalvo;
  for (const p of [...lista(dados?.pacotes), ...lista(dados?.excedentes)]) {
    if (!restantes || !p || !valido(p.produto) || !Number.isInteger(p.unidades) || p.unidades < 1 || p.unidades > unidadesPacote(classeProduto(p.produto))) continue;
    const inicio = CLASSES_PRODUTOS[classeProduto(p.produto)].estante * PACOTES_POR_CLASSE;
    const slot = Number.isInteger(p.slot) && p.slot >= inicio && p.slot < inicio + PACOTES_POR_CLASSE && !base.pacotes.some(item => item.slot === p.slot)
      ? p.slot : slotLivre(base, p.produto);
    if (slot === undefined) base.excedentes.push({ produto: p.produto, unidades: p.unidades });
    else base.pacotes.push({ produto: p.produto, unidades: p.unidades, slot });
    restantes--;
  }
  for (const pedido of lista(dados?.pedidos)) {
    const pacotes = lista(pedido?.pacotes).filter(valido).slice(0, restantes);
    if (pacotes.length) base.pedidos.push({ id: base.proximoId++, pacotes });
    restantes -= pacotes.length;
  }
  // O arranjo anterior dos laticínios no chão podia deixar slots intermediários
  // vazios. Ao empilhar, preserve as unidades e apoie todas as caixas na base.
  base.pacotes.filter(p => classeProduto(p.produto) === 'laticinios')
    .sort((a, b) => a.slot - b.slot)
    .forEach((p, i) => { p.slot = CLASSES_PRODUTOS.laticinios.estante * PACOTES_POR_CLASSE + i; });
  return base;
}

// Aproximação pela esquerda; o caminhão passa do acesso antes de engatar a ré.
function curva(a, b, c, d) {
  return Array.from({ length: 81 }, (_, i) => {
    const t = i / 80, u = 1 - t;
    return { x: u ** 3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t ** 3 * d[0],
      z: u ** 3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t ** 3 * d[1] };
  });
}
function trajeto(segmentos) {
  let distancia = 0;
  const pontos = segmentos.flatMap((s, i) => curva(...s.pontos).slice(i ? 1 : 0).map(p => ({ ...p, re: !!s.re })));
  pontos.forEach((p, i) => {
    if (i) distancia += Math.hypot(p.x - pontos[i - 1].x, p.z - pontos[i - 1].z);
    p.distancia = distancia;
  });
  return { pontos, comprimento: distancia };
}
const xFaixa = ENTREGA.estacionamento.x;
export const LIMITES_ROTA_ENTREGA = Object.freeze({
  minX: -15 - 12 + ENTREGA.comprimento / 2 + 0.06,
  maxX: 23 - ENTREGA.comprimento / 2 - 0.06,
  z: 12.2
});
export const ROTAS_ENTREGA = {
  chegando: trajeto([
    { pontos: [[LIMITES_ROTA_ENTREGA.minX, LIMITES_ROTA_ENTREGA.z], [-23.8, 12.2], [-22.7, 12.2], [-22, 12.2]] },
    { pontos: [[-22, 12.2], [xFaixa - 3.4, 12.2], [xFaixa + 0.6, 11.7], [xFaixa + 4, 11.7]] },
    { re: true, pontos: [[xFaixa + 4, 11.7], [xFaixa + 1.791, 11.7], [xFaixa, 9.909], [xFaixa, 7.7]] },
    { re: true, pontos: [[xFaixa, 7.7], [xFaixa, 3], [xFaixa, -2], [xFaixa, ENTREGA.estacionamento.z]] }
  ]),
  partindo: trajeto([
    { pontos: [[xFaixa, ENTREGA.estacionamento.z], [xFaixa, -2], [xFaixa, 3], [xFaixa, 7.7]] },
    { pontos: [[xFaixa, 7.7], [xFaixa, 9.909], [xFaixa + 1.791, 11.7], [xFaixa + 4, 11.7]] },
    { pontos: [[xFaixa + 4, 11.7], [xFaixa + 10.6, 11.7], [xFaixa + 16.6, 12.2], [xFaixa + 22.6, 12.2]] },
    { pontos: [[xFaixa + 22.6, 12.2], [10, 12.2], [16, 12.2], [LIMITES_ROTA_ENTREGA.maxX, LIMITES_ROTA_ENTREGA.z]] }
  ])
};
export function amostrarEntrega(rota, distancia) {
  const indice = rota.pontos.findIndex(p => p.distancia >= distancia);
  const i = indice < 0 ? rota.pontos.length - 1 : Math.max(1, indice);
  const a = rota.pontos[i - 1], b = rota.pontos[i];
  const t = Math.min(1, Math.max(0, (distancia - a.distancia) / (b.distancia - a.distancia || 1)));
  const sentido = b.re ? -1 : 1;
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
    angulo: Math.atan2(-sentido * (b.z - a.z), sentido * (b.x - a.x)), re: b.re };
}
export function volumeCaminhao(caminhao) {
  const c = Math.abs(Math.cos(caminhao.angulo)), s = Math.abs(Math.sin(caminhao.angulo));
  return { x: caminhao.x, z: caminhao.z, w: c * ENTREGA.comprimento + s * ENTREGA.largura, d: s * ENTREGA.comprimento + c * ENTREGA.largura };
}
export function obstaculoCaminhao(caminhao) {
  return { x: caminhao.x, z: caminhao.z, w: ENTREGA.comprimento, d: ENTREGA.largura, angulo: caminhao.angulo };
}
function pontoLocalCaminhao(caminhao, x, z) {
  return { x: caminhao.x + x * Math.cos(caminhao.angulo) + z * Math.sin(caminhao.angulo),
    z: caminhao.z - x * Math.sin(caminhao.angulo) + z * Math.cos(caminhao.angulo) };
}

export class Entregas {
  constructor() { this.caminhao = null; this.transitoLivre = true; }
  get reservaRua() { return !!this.caminhao && (['aguardando', 'chegando'].includes(this.caminhao.fase)
    || (this.caminhao.fase === 'partindo' && (this.caminhao.reservaPartida || !!this.caminhao.partidaLiberada))); }
  atualizar(sim, dt) {
    if (!dt) return;
    const deposito = sim.estado.deposito;
    if (!this.caminhao && deposito.pedidos.length && sim.estado.melhorias.expansao && sim.estado.lojaAberta && !sim.estado.banco.coleta && !sim.estado.banco.assalto) {
      this.caminhao = { classe: classeProduto(deposito.pedidos[0].pacotes[0]), fase: 'aguardando', distancia: 0, rodas: 0, tempo: 0, tempoEspera: 0, aberturaBau: 0, aberturaCabine: 0,
        ...amostrarEntrega(ROTAS_ENTREGA.chegando, 0), entregador: null };
    }
    const c = this.caminhao;
    if (!c) return;
    if (c.fase === 'aguardando') {
      const tempoEspera = sim.temporizadorEntregaAtivo === false ? 0 : TEMPO_ESPERA_ENTREGA;
      c.tempoEspera = Math.min(tempoEspera, c.tempoEspera + dt);
      if (c.tempoEspera < tempoEspera) return;
      if (!sim.estado.lojaAberta || sim.estacionamento.reservaRua || !this.transitoLivre || sim.estado.banco.coleta || sim.estado.banco.assalto) return;
      c.fase = 'chegando';
      return;
    }
    if (c.fase === 'chegando' || c.fase === 'partindo') {
      const rota = ROTAS_ENTREGA[c.fase];
      if (c.fase === 'partindo' && c.distancia === 0) {
        // Serviços já em espera terminam primeiro. Depois, impeça novos carros
        // de nascer enquanto o tráfego existente esvazia as duas faixas.
        c.reservaPartida = !sim.estacionamento.reservaRua && !sim.estado.banco.coleta && !sim.estado.banco.assalto;
        if (!c.reservaPartida || !this.transitoLivre) return;
      }
      if (c.fase === 'partindo') c.partidaLiberada = true;
      const distancia = Math.min(rota.comprimento, c.distancia + dt * (c.re ? ENTREGA.velocidadeRe : ENTREGA.velocidade));
      const proximo = amostrarEntrega(rota, distancia), obstaculo = obstaculoCaminhao(proximo);
      if (proximo.re !== c.re) {
        c.tempo += dt;
        if (c.tempo < 0.7) return;
      }
      const pedestres = [sim.estado.jogador, ...(sim.ajudanteContratado ? [sim.ajudante] : []), ...sim.clientes.filter(p => !p.noCarro)];
      if (pedestres.some(p => !segmentoLivre(p, p, [obstaculo], 0.32))) return;
      const giro = Math.atan2(Math.sin(proximo.angulo - c.angulo), Math.cos(proximo.angulo - c.angulo));
      c.direcaoCurva = giro > 0.002 ? 'esquerda' : giro < -0.002 ? 'direita' : null;
      c.freando = distancia >= rota.comprimento || proximo.re !== c.re;
      c.tempo = 0;
      c.rodas -= (distancia - c.distancia) * (proximo.re ? -1 : 1) / 0.39;
      Object.assign(c, proximo, { distancia });
      if (distancia < rota.comprimento) return;
      if (c.fase === 'partindo') { this.caminhao = null; return; }
      c.fase = 'desembarcar'; c.tempo = 0; c.etapa = 0; c.aberturaBau = 0; c.aberturaCabine = 0;
      c.re = false; c.direcaoCurva = null; c.freando = false;
      c.entregador = { ...PLANTA_CARGA.cabine, angulo: 0, andando: false, carregando: false };
      sim.emitir('entregaChegou', { texto: 'O caminhão chegou! O entregador vai guardar as caixas no depósito.' });
    }
    const ator = c.entregador, pedido = deposito.pedidos[0];
    if (c.fase === 'desembarcar') {
      if (!c.saidaCabineConcluida) {
        c.tempo += dt;
        const abrindo = Math.min(1, c.tempo / 0.65);
        const fechando = Math.min(1, Math.max(0, (c.tempo - 1.3) / 0.55));
        c.aberturaCabine = abrindo * (1 - fechando);
        ator.visible = c.tempo >= 0.65;
        if (ator.visible && c.tempo < 1.3) {
          const t = Math.min(1, (c.tempo - 0.65) / 0.65);
          const suave = t * t * (3 - 2 * t);
          const dentro = pontoLocalCaminhao(c, 1.62, -0.36);
          ator.x = dentro.x + (PLANTA_CARGA.cabine.x - dentro.x) * suave;
          ator.z = dentro.z + (PLANTA_CARGA.cabine.z - dentro.z) * suave;
          ator.andando = t > 0 && t < 1;
        }
        if (c.tempo < 1.85) return;
        ator.visible = true; ator.x = PLANTA_CARGA.cabine.x; ator.z = PLANTA_CARGA.cabine.z; ator.andando = false;
        c.saidaCabineConcluida = true; c.tempo = 0;
      }
      const pontos = [PLANTA_CARGA.contornoCabine, ENTREGA.retirada];
      if (!sim.caminharCliente(ator, pontos[c.etapa], dt, 2.5)) return;
      if (++c.etapa < pontos.length) return;
      c.fase = 'abrirBau'; c.tempo = 0; ator.andando = false; ator.angulo = 0;
    }
    if (c.fase === 'abrirBau') {
      ator.andando = false; ator.angulo = 0;
      c.aberturaBau = Math.min(1, c.aberturaBau + dt * 1.25);
      if (c.aberturaBau < 1) return;
      c.fase = 'retirar'; c.tempo = 0;
    }
    if (c.fase === 'retirar') {
      c.produto = pedido.pacotes[0];
      c.tempo += dt;
      if (c.tempo < 0.7) return;
      c.slot = slotLivre(deposito, c.produto);
      // Pedidos de saves antigos podem exceder o limite novo: aguardam uma vaga da classe.
      if (c.slot === undefined) return;
      ator.carregando = true; c.fase = 'levar'; c.etapa = 0;
    }
    if (c.fase === 'levar' || c.fase === 'voltar') {
      const soda = Math.floor(c.slot / PACOTES_POR_CLASSE) === CLASSES_PRODUTOS.soda.estante;
      const laticinios = Math.floor(c.slot / PACOTES_POR_CLASSE) === CLASSES_PRODUTOS.laticinios.estante;
      const estante = soda ? SODA.deposito : laticinios ? LATICINIOS.deposito : PLANTA_DEPOSITO.estantes[Math.floor(c.slot / PACOTES_POR_CLASSE)];
      const pontos = [
        PLANTA_CARGA.contornoCabine, { x: PLANTA_CARGA.contornoCabine.x, z: -8.45 }, { x: PLANTA_DEPOSITO.porta.x, z: -8.45 },
        { x: PLANTA_DEPOSITO.porta.x, z: -10.3 }, soda ? SODA.coleta : laticinios ? LATICINIOS.coleta : { x: estante.x, z: -12.9 }
      ];
      const rota = c.fase === 'levar' ? pontos : [...pontos].reverse().slice(1).concat(ENTREGA.retirada);
      if (sim.caminharCliente(ator, rota[c.etapa], dt, 2.5)) {
        c.etapa++;
        if (c.etapa >= rota.length) { c.fase = c.fase === 'levar' ? 'guardar' : pedido.pacotes.length ? 'retirar' : 'fecharBau'; c.tempo = 0; c.etapa = 0; }
      }
    } else if (c.fase === 'guardar') {
      c.tempo += dt;
      if (c.tempo < 0.8) return;
      const produto = pedido.pacotes.shift();
      const unidades = unidadesPacote(classeProduto(produto));
      deposito.pacotes.push({ produto, unidades, slot: c.slot });
      sim.estado.produtos[produto].horta += unidades;
      ator.carregando = false; c.fase = 'voltar'; c.etapa = 0;
      sim.emitir('pacoteEntregue', { produto, slot: c.slot });
    } else if (c.fase === 'fecharBau') {
      ator.andando = false; ator.angulo = 0;
      c.aberturaBau = Math.max(0, c.aberturaBau - dt * 1.25);
      if (c.aberturaBau > 0) return;
      c.fase = 'embarcar'; c.tempo = 0; c.etapa = 0;
    } else if (c.fase === 'embarcar') {
      const pontos = [PLANTA_CARGA.contornoCabine, PLANTA_CARGA.cabine];
      if (c.etapa < pontos.length) {
        if (sim.caminharCliente(ator, pontos[c.etapa], dt, 2.5)) c.etapa++;
        return;
      }
      c.tempo += dt;
      c.aberturaCabine = Math.min(1, c.tempo / 0.55) * (1 - Math.min(1, Math.max(0, (c.tempo - 0.9) / 0.55)));
      if (c.tempo >= 0.72) ator.visible = false;
      if (c.tempo < 1.5) return;
      deposito.pedidos.shift();
      c.entregador = null; c.fase = 'partindo'; c.distancia = 0; c.re = false; c.tempo = 0; c.aberturaCabine = 0;
      sim.emitir('entregaConcluida', { texto: 'Entrega concluída! Retire os produtos na estante da classe para abastecer a gôndola.' });
    }
  }
}
