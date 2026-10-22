import { PLANTA_DEPOSITO, PLANTA_CARGA } from './planta.js';

export const CAPACIDADE_DEPOSITO = 27;
export const UNIDADES_PACOTE = 9;
export const ENTREGA = { comprimento: 5.2, largura: 2.12, velocidade: 2.6, velocidadeRe: 1.5,
  estacionamento: { x: PLANTA_CARGA.vaga.x, z: PLANTA_CARGA.vaga.z }, retirada: PLANTA_CARGA.retirada };
export const estadoDeposito = () => ({ pacotes: [], pedidos: [], proximoId: 1 });
export const pacotesPendentes = deposito => deposito.pedidos.reduce((total, pedido) => total + pedido.pacotes.length, 0);
export const vagasDeposito = deposito => CAPACIDADE_DEPOSITO - deposito.pacotes.length - pacotesPendentes(deposito);
export function posicaoPacote(slot) {
  const estante = PLANTA_DEPOSITO.estantes[Math.floor(slot / 9)];
  return { x: estante.x + (slot % 3 - 1) * 0.94, y: 0.23 + [0.195, 0.995, 1.795][Math.floor(slot % 9 / 3)], z: estante.z };
}
export function validarDeposito(dados, produtos) {
  const base = estadoDeposito();
  const valido = id => produtos[id]?.liberado && id === 'enlatado';
  for (const p of Array.isArray(dados?.pacotes) ? dados.pacotes.slice(0, 27) : []) {
    if (!p || !valido(p.produto) || !Number.isInteger(p.unidades) || p.unidades < 1 || p.unidades > 9) continue;
    const slot = Number.isInteger(p.slot) && p.slot >= 0 && p.slot < 27 && !base.pacotes.some(item => item.slot === p.slot)
      ? p.slot : Array.from({ length: 27 }, (_, i) => i).find(i => !base.pacotes.some(item => item.slot === i));
    base.pacotes.push({ produto: p.produto, unidades: p.unidades, slot });
  }
  for (const pedido of Array.isArray(dados?.pedidos) ? dados.pedidos.slice(0, 27) : []) {
    const pacotes = (Array.isArray(pedido?.pacotes) ? pedido.pacotes : []).filter(valido).slice(0, vagasDeposito(base));
    if (pacotes.length) base.pedidos.push({ id: base.proximoId++, pacotes });
  }
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
export const ROTAS_ENTREGA = {
  chegando: trajeto([
    { pontos: [[-33, 12.2], [-32, 12.2], [-30, 12.2], [-29, 12.2]] },
    { pontos: [[-29, 12.2], [xFaixa - 3.4, 12.2], [xFaixa + 0.6, 11.7], [xFaixa + 4, 11.7]] },
    { re: true, pontos: [[xFaixa + 4, 11.7], [xFaixa + 1.791, 11.7], [xFaixa, 9.909], [xFaixa, 7.7]] },
    { re: true, pontos: [[xFaixa, 7.7], [xFaixa, 3], [xFaixa, -2], [xFaixa, ENTREGA.estacionamento.z]] }
  ]),
  partindo: trajeto([
    { pontos: [[xFaixa, ENTREGA.estacionamento.z], [xFaixa, -2], [xFaixa, 3], [xFaixa, 7.7]] },
    { pontos: [[xFaixa, 7.7], [xFaixa, 9.909], [xFaixa + 1.791, 11.7], [xFaixa + 4, 11.7]] },
    { pontos: [[xFaixa + 4, 11.7], [xFaixa + 10.6, 11.7], [xFaixa + 16.6, 12.2], [xFaixa + 22.6, 12.2]] },
    { pontos: [[xFaixa + 22.6, 12.2], [10, 12.2], [20, 12.2], [29, 12.2]] }
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

export class Entregas {
  constructor() { this.caminhao = null; this.transitoLivre = true; }
  get reservaRua() { return !!this.caminhao && (['aguardando', 'chegando'].includes(this.caminhao.fase)
    || (this.caminhao.fase === 'partindo' && !!this.caminhao.partidaLiberada)); }
  atualizar(sim, dt) {
    if (!dt) return;
    const deposito = sim.estado.deposito;
    if (!this.caminhao && deposito.pedidos.length && sim.estado.melhorias.expansao && sim.estado.lojaAberta && !sim.estado.banco.coleta && !sim.estado.banco.assalto) {
      this.caminhao = { fase: 'aguardando', distancia: 0, rodas: 0, tempo: 0, ...amostrarEntrega(ROTAS_ENTREGA.chegando, 0), entregador: null };
    }
    const c = this.caminhao;
    if (!c) return;
    if (c.fase === 'aguardando') {
      if (!sim.estado.lojaAberta || sim.estacionamento.reservaRua || !this.transitoLivre || sim.estado.banco.coleta || sim.estado.banco.assalto) return;
      c.fase = 'chegando';
    }
    if (c.fase === 'chegando' || c.fase === 'partindo') {
      const rota = ROTAS_ENTREGA[c.fase];
      if (c.fase === 'partindo' && c.distancia === 0 && (!this.transitoLivre || sim.estacionamento.reservaRua || sim.estado.banco.coleta || sim.estado.banco.assalto)) return;
      if (c.fase === 'partindo') c.partidaLiberada = true;
      const distancia = Math.min(rota.comprimento, c.distancia + dt * (c.re ? ENTREGA.velocidadeRe : ENTREGA.velocidade));
      const proximo = amostrarEntrega(rota, distancia), volume = volumeCaminhao(proximo);
      if (proximo.re !== c.re) {
        c.tempo += dt;
        if (c.tempo < 0.7) return;
      }
      const pedestres = [sim.estado.jogador, ...(sim.ajudanteContratado ? [sim.ajudante] : []), ...sim.clientes.filter(p => !p.noCarro)];
      if (pedestres.some(p => Math.abs(p.x - volume.x) < volume.w / 2 + 0.32 && Math.abs(p.z - volume.z) < volume.d / 2 + 0.32)) return;
      c.tempo = 0;
      c.rodas -= (distancia - c.distancia) * (proximo.re ? -1 : 1) / 0.39;
      Object.assign(c, proximo, { distancia });
      if (distancia < rota.comprimento) return;
      if (c.fase === 'partindo') { this.caminhao = null; return; }
      c.fase = 'desembarcar'; c.tempo = 0;
      c.etapa = 0;
      c.entregador = { ...PLANTA_CARGA.cabine, angulo: 0, andando: false, carregando: false };
      sim.emitir('entregaChegou', { texto: 'O caminhão chegou! O entregador vai guardar as caixas no depósito.' });
    }
    const ator = c.entregador, pedido = deposito.pedidos[0];
    if (c.fase === 'desembarcar') {
      c.tempo += dt;
      if (c.tempo < 1.2) return;
      const pontos = [PLANTA_CARGA.contornoCabine, ENTREGA.retirada];
      if (!sim.caminharCliente(ator, pontos[c.etapa], dt, 2.5)) return;
      if (++c.etapa < pontos.length) return;
      c.fase = 'retirar'; c.tempo = 0;
    }
    if (c.fase === 'retirar') {
      c.tempo += dt;
      if (c.tempo < 0.7) return;
      c.slot = Array.from({ length: 27 }, (_, i) => i).find(i => !deposito.pacotes.some(p => p.slot === i));
      ator.carregando = true; c.fase = 'levar'; c.etapa = 0;
    }
    if (c.fase === 'levar' || c.fase === 'voltar') {
      const estante = PLANTA_DEPOSITO.estantes[Math.floor(c.slot / 9)];
      const pontos = [
        PLANTA_CARGA.contornoCabine, { x: PLANTA_CARGA.contornoCabine.x, z: -8.45 }, { x: PLANTA_DEPOSITO.porta.x, z: -8.45 },
        { x: PLANTA_DEPOSITO.porta.x, z: -10.3 }, { x: estante.x, z: -12.9 }
      ];
      const rota = c.fase === 'levar' ? pontos : [...pontos].reverse().slice(1).concat(ENTREGA.retirada);
      if (sim.caminharCliente(ator, rota[c.etapa], dt, 2.5)) {
        c.etapa++;
        if (c.etapa >= rota.length) { c.fase = c.fase === 'levar' ? 'guardar' : pedido.pacotes.length ? 'retirar' : 'embarcar'; c.tempo = 0; c.etapa = 0; }
      }
    } else if (c.fase === 'guardar') {
      c.tempo += dt;
      if (c.tempo < 0.8) return;
      const produto = pedido.pacotes.shift();
      deposito.pacotes.push({ produto, unidades: UNIDADES_PACOTE, slot: c.slot });
      sim.estado.produtos[produto].horta += UNIDADES_PACOTE;
      ator.carregando = false; c.fase = 'voltar'; c.etapa = 0;
      sim.emitir('pacoteEntregue', { produto, slot: c.slot });
    } else if (c.fase === 'embarcar') {
      const pontos = [PLANTA_CARGA.contornoCabine, PLANTA_CARGA.cabine];
      if (c.etapa < pontos.length) {
        if (sim.caminharCliente(ator, pontos[c.etapa], dt, 2.5)) c.etapa++;
        return;
      }
      c.tempo += dt;
      if (c.tempo < 1.2) return;
      deposito.pedidos.shift();
      c.entregador = null; c.fase = 'partindo'; c.distancia = 0; c.re = false;
      sim.emitir('entregaConcluida', { texto: 'Entrega concluída! Retire enlatados no depósito para abastecer a gôndola.' });
    }
  }
}
