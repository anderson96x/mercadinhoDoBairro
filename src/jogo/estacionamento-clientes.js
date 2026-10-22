import { PLANTA_ESTACIONAMENTO as P } from './planta.js';
import { RUA } from './bairro.js';
import { MODELOS_CARROS, dimensoesCarro } from './trafego.js';

const suave = t => t * t * (3 - 2 * t);
const ponto = (x, z) => ({ x, z });
const entrada = P.faixas[0].x, saida = P.faixas[1].x;
const rua = RUA.faixas[0].z;
const rotas = new Map();

// Béziers tangentes, amostradas por distância: a velocidade não oscila nas curvas.
function rota(segmentos) {
  const pontos = []; let comprimento = 0;
  for (const [a, b, c, d] of segmentos) for (let i = pontos.length ? 1 : 0; i <= 60; i++) {
    const t = i / 60, u = 1 - t;
    const p = ponto(u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
      u ** 3 * a.z + 3 * u * u * t * b.z + 3 * u * t * t * c.z + t ** 3 * d.z);
    const anterior = pontos.at(-1);
    if (anterior) comprimento += Math.hypot(p.x - anterior.x, p.z - anterior.z);
    pontos.push({ ...p, distancia: comprimento });
  }
  return { pontos, comprimento };
}
const reta = (a, b) => [a, a, b, b];
const volta = () => [
  [ponto(entrada, -6.3), ponto(entrada, -7.3), ponto(saida, -7.3), ponto(saida, -6.3)]
];
function trajetos(indice) {
  if (rotas.has(indice)) return rotas.get(indice);
  const v = P.vagas[indice], x = v.lado ? saida : entrada, z = v.z + (v.lado ? -1.9 : 1.9);
  const curva = [ponto(x, z), ponto(x, v.z + (z - v.z) * 0.45),
    ponto(v.x + (x - v.x) * 0.55, v.z), ponto(v.x, v.z)];
  const chegada = [
    reta(ponto(RUA.maxX, rua), ponto(entrada + 2.2, rua)),
    [ponto(entrada + 2.2, rua), ponto(entrada, rua), ponto(entrada, 9.3), ponto(entrada, 8.1)],
    ...(v.lado ? [reta(ponto(entrada, 8.1), ponto(entrada, -6.3)), ...volta(), reta(ponto(saida, -6.3), ponto(x, z))]
      : [reta(ponto(entrada, 8.1), ponto(x, z))]), curva
  ];
  const partida = [
    ...(v.lado ? [] : [reta(ponto(x, z), ponto(entrada, -6.3)), ...volta()]),
    reta(v.lado ? ponto(x, z) : ponto(saida, -6.3), ponto(saida, 8.1)),
    [ponto(saida, 8.1), ponto(saida, rua), ponto(saida - 1, rua), ponto(saida - 2.2, rua)],
    reta(ponto(saida - 2.2, rua), ponto(RUA.minX + 1.7, rua))
  ];
  const resultado = { chegando: rota(chegada), re: rota([[...curva].reverse()]), partindo: rota(partida) };
  rotas.set(indice, resultado); return resultado;
}
function amostrar(r, distancia) {
  const i = Math.max(1, r.pontos.findIndex(p => p.distancia >= Math.min(distancia, r.comprimento)));
  const a = r.pontos[i - 1], b = r.pontos[i];
  const t = Math.min(1, Math.max(0, (distancia - a.distancia) / (b.distancia - a.distancia || 1)));
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, angulo: Math.atan2(-(b.z - a.z), b.x - a.x) };
}

export function pontoPortaCarro(carro) {
  const v = P.vagas[carro.vaga];
  const { largura } = dimensoesCarro(MODELOS_CARROS[carro.modelo]);
  return { x: v.x, z: v.z + (v.lado ? -1 : 1) * (largura / 2 + 0.42) };
}
export const SAIDA_PEDESTRES = { x: -5, z: 8.4 };
export function volumeCarro(carro) {
  const { comprimento, largura } = dimensoesCarro(MODELOS_CARROS[carro.modelo]);
  const cos = Math.abs(Math.cos(carro.angulo)), sin = Math.abs(Math.sin(carro.angulo));
  return { x: carro.x, z: carro.z, w: cos * comprimento + sin * largura, d: sin * comprimento + cos * largura };
}

export class EstacionamentoClientes {
  constructor() { this.carros = []; this.transitoLivre = true; this.prontoEm = 0; }
  get manobrando() { return this.carros.some(c => !['estacionado', 'esperandoSaida'].includes(c.fase)); }
  get reservaRua() { return this.carros.some(c => (c.fase === 'aguardando' && c.recebido)
    || ['chegando', 'esperandoSaida', 're', 'engatando', 'partindo'].includes(c.fase)); }
  reservar(cliente, tempo) {
    if (tempo < this.prontoEm || this.manobrando || this.carros.some(c => c.fase === 'esperandoSaida')) return false;
    const vaga = P.vagas.findIndex((_, i) => !this.carros.some(c => c.vaga === i));
    if (vaga < 0) return false;
    const carro = { clienteId: cliente.id, vaga, modelo: cliente.id % MODELOS_CARROS.length, fase: 'aguardando',
      ...amostrar(trajetos(vaga).chegando, 1.7), distancia: 1.7, velocidade: 0, rodas: 0, porta: 0, tempo: 0 };
    this.carros.push(carro); cliente.carroId = cliente.id; cliente.noCarro = true;
    cliente.fase = 'dirigindo'; cliente.x = carro.x; cliente.z = carro.z;
    return true;
  }
  carroCliente(cliente) { return this.carros.find(c => c.clienteId === cliente.carroId); }
  embarcar(cliente) {
    const carro = this.carroCliente(cliente);
    if (!carro) return;
    carro.fase = 'embarcando'; carro.tempo = 0; cliente.fase = 'embarcando'; cliente.andando = false;
  }
  atualizar(sim, dt) {
    for (const carro of this.carros) {
      const cliente = sim.clientes.find(c => c.id === carro.clienteId);
      if (!cliente) { carro.fase = 'fim'; continue; }
      const fase = carro.fase;
      carro.freando = false; carro.direcaoCurva = null;
      if (fase === 'aguardando' || fase === 'esperandoSaida') {
        const entregaNaRua = sim.entregas?.reservaRua && sim.entregas.caminhao.fase !== 'aguardando';
        const servico = sim.estado.banco.coleta || sim.estado.banco.assalto || (entregaNaRua ? { tempo: 0 } : null);
        if (fase === 'aguardando' && this.receberDoTrafego && !carro.recebido) {
          if (servico) continue;
          const existente = this.receberDoTrafego(carro.clienteId);
          if (!existente) continue;
          Object.assign(carro, existente, { recebido: true, distancia: RUA.maxX - existente.x });
          cliente.x = carro.x; cliente.z = carro.z;
        }
        if (!this.transitoLivre || (servico && !(carro.recebido && fase === 'aguardando' && servico.tempo < 0))) continue;
        // Uma reserva ainda sem carro não ocupa a rua. Deixe a saída liberar
        // a entrega, que suspende o tráfego necessário para atender essa reserva.
        if (fase === 'esperandoSaida' && this.carros.some(outro =>
          !['estacionado', 'esperandoSaida'].includes(outro.fase)
          && !(outro.fase === 'aguardando' && this.receberDoTrafego && !outro.recebido))) continue;
        carro.fase = fase === 'aguardando' ? 'chegando' : 're';
        if (fase === 'esperandoSaida') { carro.distancia = 0; carro.velocidade = 0; }
      } else if (['chegando', 're', 'partindo'].includes(fase)) {
        const r = trajetos(carro.vaga)[fase];
        const restante = r.comprimento - carro.distancia;
        let maxima = fase === 're' ? 1.1 : carro.z > 9.5 && carro.x > entrada + 3 ? 4.4
          : 1 + 1.1 * Math.min(1, Math.max(0, (carro.z + 6.8) / 1.6));
        if (fase === 'chegando' && restante < 4) maxima = Math.min(maxima, 1.1 + Math.max(0, (restante - 2.5) / 1.5));
        const velocidade = Math.min(maxima, carro.velocidade + dt * 1.4, Math.sqrt(2 * 1.2 * restante));
        const distancia = Math.min(r.comprimento, carro.distancia + Math.max(0.08, velocidade) * dt);
        const p = amostrar(r, distancia);
        if (fase === 're') p.angulo += Math.PI;
        const volume = volumeCarro({ ...carro, ...p });
        const pedestres = [sim.estado.jogador, ...sim.clientes.filter(c => !c.noCarro)];
        if (pedestres.some(c => Math.abs(c.x - volume.x) < volume.w / 2 + 0.4 && Math.abs(c.z - volume.z) < volume.d / 2 + 0.4)) {
          carro.freando = carro.velocidade > 0; carro.velocidade = 0; continue;
        }
        const giro = Math.atan2(Math.sin(p.angulo - carro.angulo), Math.cos(p.angulo - carro.angulo));
        carro.direcaoCurva = giro > 0.002 ? 'esquerda' : giro < -0.002 ? 'direita' : null;
        carro.freando = velocidade < carro.velocidade - 0.000001;
        carro.rodas -= (distancia - carro.distancia) / (0.28 * MODELOS_CARROS[carro.modelo].escala) * (fase === 're' ? -1 : 1);
        Object.assign(carro, p, { distancia, velocidade });
        cliente.x = carro.x; cliente.z = carro.z;
        if (distancia >= r.comprimento) {
          carro.velocidade = 0; carro.distancia = 0; carro.tempo = 0;
          carro.fase = fase === 'chegando' ? 'desembarcando' : fase === 're' ? 'engatando' : 'fim';
          if (carro.fase === 'fim') cliente.fase = 'fim';
        }
      } else if (fase === 'engatando') {
        carro.tempo += dt;
        if (carro.tempo >= 0.5) carro.fase = 'partindo';
      } else if (fase === 'desembarcando' || fase === 'embarcando') {
        carro.tempo += dt;
        const t = Math.min(1, carro.tempo / 2.2);
        carro.porta = suave(Math.min(1, t / 0.22)) * (1 - suave(Math.max(0, (t - 0.78) / 0.22)));
        const porta = pontoPortaCarro(carro), v = P.vagas[carro.vaga];
        const caminhada = suave(Math.min(1, Math.max(0, (t - 0.22) / 0.56)));
        const fora = fase === 'desembarcando' ? caminhada : 1 - caminhada;
        cliente.noCarro = fora < 0.12;
        cliente.x = v.x; cliente.z = v.z + (porta.z - v.z) * (0.45 + 0.55 * fora);
        cliente.angulo = (porta.z > v.z ? 0 : Math.PI) + (fase === 'embarcando' ? Math.PI : 0);
        cliente.andando = t > 0.22 && t < 0.78;
        if (t === 1) {
          carro.porta = 0;
          carro.fase = fase === 'desembarcando' ? 'estacionado' : 'esperandoSaida';
          cliente.fase = fase === 'desembarcando' ? 'chegando' : 'dirigindo';
          cliente.etapa = -1; cliente.noCarro = fase === 'embarcando'; cliente.andando = false;
        }
      }
    }
    this.carros = this.carros.filter(c => c.fase !== 'fim');
  }
}
