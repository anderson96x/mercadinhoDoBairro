// Pedidos são transitórios; os insumos só são consumidos junto com o pagamento.
// Assim, recarregar durante o preparo não perde nem duplica mercadorias.
import { PLANTA_CAFETERIA } from './planta.js';
import { paredesCafeteria } from './planta.js';
export { paredesCafeteria } from './planta.js';

export const CAFETERIA = {
  ...PLANTA_CAFETERIA,
  nivel: 27, custo: 10000, capacidade: 24, preparo: 6, consumo: 18, espera: 75,
  cafes: {
    espresso: { nome: 'Espresso', preco: 5, ingredientes: { cafe: 1 } },
    americano: { nome: 'Americano', preco: 6, ingredientes: { cafe: 1 } },
    cafeLeite: { nome: 'Café com leite', preco: 8, ingredientes: { cafe: 1, leite: 1 } },
    cappuccino: { nome: 'Cappuccino', preco: 10, ingredientes: { cafe: 1, leite: 1 } }
  }
};
export const INSUMOS_CAFETERIA = ['cafe', 'leite', 'ovos', 'sucoLaranja', 'sucoMorango', 'sucoMaca', 'sucoMisto'];
export const porcoesCafeteria = id => id === 'leite' ? 6 : 1;
export const LANCHES_CAFETERIA = ['pao', 'bolo', 'donut', 'eclair'];
export const ASSENTOS_CAFETERIA = CAFETERIA.mesas.flatMap((mesa, indice) => [-1, 1].map(lado => {
  const giro = mesa.angulo || 0;
  return {
    x: mesa.x + lado * 1.15 * Math.cos(giro), z: mesa.z - lado * 1.15 * Math.sin(giro),
    angulo: giro - lado * Math.PI / 2, mesa: indice
  };
}));

export function obstaculosCafeteria() {
  return [...paredesCafeteria(), CAFETERIA.balcao, CAFETERIA.fechamento, CAFETERIA.fechamentoPosterior, CAFETERIA.abastecimento, CAFETERIA.deposito,
    ...CAFETERIA.mesas.map(p => ({ ...p, w: 1.35, d: 1.35 })),
    ...ASSENTOS_CAFETERIA.map((p, assento) => ({
      ...p, w: 0.55 * Math.abs(Math.cos(p.angulo)) + 0.65 * Math.abs(Math.sin(p.angulo)),
      d: 0.55 * Math.abs(Math.sin(p.angulo)) + 0.65 * Math.abs(Math.cos(p.angulo)), cadeiraCafe: true, assento
    }))];
}
export function estadoCafeteria() {
  return { ingredientes: Object.fromEntries(INSUMOS_CAFETERIA.map(id => [id, 0])), atendidos: 0 };
}
export function validarCafeteria(dados, comprada) {
  const base = estadoCafeteria();
  if (!comprada) return base;
  for (const id of INSUMOS_CAFETERIA) {
    const valor = dados?.ingredientes?.[id];
    base.ingredientes[id] = Number.isFinite(valor) ? Math.max(0, Math.min(CAFETERIA.capacidade, Math.floor(valor))) : 0;
  }
  base.atendidos = Number.isFinite(dados?.atendidos) ? Math.max(0, Math.min(1e9, Math.floor(dados.atendidos))) : 0;
  return base;
}
export function criarPedidoCafe(aleatorio = Math.random) {
  const escolher = lista => lista[Math.min(lista.length - 1, Math.floor(aleatorio() * lista.length))];
  const pedido = [];
  if (aleatorio() < 0.85) pedido.push(escolher(Object.keys(CAFETERIA.cafes)));
  if (!pedido.length || aleatorio() < 0.7) pedido.push(escolher(LANCHES_CAFETERIA));
  if (aleatorio() < 0.25) pedido.push(escolher(Object.keys(estadoCafeteria().ingredientes).filter(id => id.startsWith('suco'))));
  if (pedido.includes('pao') && aleatorio() < 0.3) pedido.push('ovos');
  return pedido;
}
export function ingredientesPedidoCafe(pedido) {
  const ingredientes = {};
  for (const id of pedido) for (const [item, quantidade] of Object.entries(CAFETERIA.cafes[id]?.ingredientes || { [id]: 1 })) {
    ingredientes[item] = (ingredientes[item] || 0) + quantidade;
  }
  return ingredientes;
}
export function pedidoCafeDisponivel(estado, pedido) {
  return Object.entries(ingredientesPedidoCafe(pedido)).every(([id, quantidade]) =>
    (LANCHES_CAFETERIA.includes(id) ? estado.produtos[id]?.prateleira : estado.cafeteria.ingredientes[id]) >= quantidade);
}
export function servirPedidoCafe(estado, pedido, produtos) {
  if (!pedidoCafeDisponivel(estado, pedido)) return null;
  for (const [id, quantidade] of Object.entries(ingredientesPedidoCafe(pedido))) {
    if (LANCHES_CAFETERIA.includes(id)) estado.produtos[id].prateleira -= quantidade;
    else estado.cafeteria.ingredientes[id] -= quantidade;
  }
  const valor = pedido.reduce((total, id) => total + (CAFETERIA.cafes[id]?.preco ?? produtos[id].preco), 0);
  estado.dinheiro += valor; estado.banco.noCaixa += valor;
  estado.estatisticas.faturamento += valor; estado.estatisticas.clientes++;
  estado.cafeteria.atendidos++;
  return valor;
}

export function criarClienteCafeteria(sim) {
  if (!sim.estado.melhorias.cafeteria || !sim.estado.lojaAberta || sim.estado.banco.assalto) return false;
  const ocupados = new Set(sim.clientes.filter(c => c.cafeteria && !['saindo', 'fim'].includes(c.fase)).map(c => c.assento));
  const assento = ASSENTOS_CAFETERIA.findIndex((_, i) => !ocupados.has(i));
  if (assento < 0) return false;
  const lado = sim.proximoLadoEntrada;
  sim.proximoLadoEntrada = 1 - lado;
  sim.clientes.push({ id: sim.proximaId++, ...sim.extremosCalcada[lado], cafeteria: true,
    assento, pedidoCafe: criarPedidoCafe(sim.aleatorio), produto: 'pao', compras: [], itens: [], quantidade: 0,
    fase: 'chegando', etapa: 0, esperaCafe: 0, preparoCafe: 0, consumoCafe: 0,
    aparencia: Math.floor(sim.aleatorio() * sim.quantidadeAparenciasCafe), ladoEntrada: lado, ladoSaida: 1 - lado,
    andando: false, temCesta: false, cestaReservada: false, usaCarrinho: false, temCarrinho: false });
  return true;
}

export function atualizarCafeteria(sim, dt, config) {
  if (!sim.estado.melhorias.cafeteria || dt <= 0) return;
  const barista = sim.barista;
  if (sim.assaltoNaLoja) { barista.andando = false; return; }
  sim.proximoClienteCafe -= dt;
  if (sim.proximoClienteCafe <= 0 && criarClienteCafeteria(sim)) sim.proximoClienteCafe = 12;
  const clientes = sim.clientes.filter(c => c.cafeteria);
  const fila = clientes.filter(c => c.fase === 'cafeFila');
  const sair = c => { c.fase = 'saindo'; c.etapa = 0; c.sentado = false; };
  for (const c of clientes) {
    c.andando = false;
    if (c.assustado) continue;
    if (c.fase === 'chegando') {
      if (!sim.estado.lojaAberta && c.z > config.portaEntrada.z) { c.recusado = true; sair(c); continue; }
      const destino = c.etapa === 0 ? config.entrada : { x: config.portaEntrada.x, z: 5.4 };
      const chegou = c.etapa === 0 ? sim.caminharCalcada(c, destino, dt) : sim.caminharCliente(c, destino, dt);
      if (chegou && ++c.etapa > 1) c.fase = 'cafeFila';
    } else if (c.fase === 'cafeFila') {
      c.esperaCafe += dt;
      const indice = fila.indexOf(c);
      if (indice < 0) continue;
      const chegou = sim.caminharCliente(c, {
        x: CAFETERIA.pedido.x + Math.min(indice, CAFETERIA.fila.porLinha - 1) * CAFETERIA.fila.x,
        z: CAFETERIA.pedido.z + Math.max(0, indice - CAFETERIA.fila.porLinha + 1) * CAFETERIA.fila.z
      }, dt);
      if (chegou) {
        c.andando = false;
        c.angulo = Math.atan2(barista.x - c.x, barista.z - c.z);
      }
      if (chegou && indice === 0) {
        c.preparoCafe += dt;
        if (c.preparoCafe >= 1.5) { c.fase = 'cafeMesa'; c.preparoCafe = 0; }
      }
    } else if (['cafeMesa', 'cafeVoltando'].includes(c.fase)) {
      const assento = ASSENTOS_CAFETERIA[c.assento];
      if (sim.caminharCliente(c, assento, dt)) {
        Object.assign(c, assento); c.fase = c.pagoCafe ? 'cafeConsumindo' : 'cafeEspera'; c.sentado = true;
      }
    } else if (c.fase === 'cafeEspera') {
      c.esperaCafe += dt;
    } else if (c.fase === 'cafeRetirada') {
      c.sentado = false;
      c.esperaCafe += dt;
      if (sim.caminharCliente(c, CAFETERIA.retirada, dt)) {
        const nivelAnterior = sim.nivel;
        const valor = servirPedidoCafe(sim.estado, c.pedidoCafe, sim.produtos);
        if (valor !== null) {
          c.pagoCafe = true; c.fase = 'cafeVoltando';
          sim.registrarSatisfacao(c, 'feliz'); sim.emitir('venda', { valor, ponto: CAFETERIA.bandejaRetirada });
          if (sim.nivel > nivelAnterior) { sim.estado.dinheiro += config.bonusNivel; sim.emitir('nivel', { nivel: sim.nivel }); }
        } else {
          c.preparoCafe = 0; c.fase = 'cafeMesa';
        }
        barista.cliente = null; barista.fase = 'livre';
      }
    } else if (c.fase === 'cafeConsumindo') {
      c.consumoCafe += dt;
      if (c.consumoCafe >= CAFETERIA.consumo) sair(c);
    } else if (c.fase === 'saindo') {
      c.sentado = false;
      if (c.etapa === 0) {
        if (sim.caminharCliente(c, config.entrada, dt)) c.etapa = 1;
      } else if (sim.caminharCalcada(c, sim.extremosCalcada[c.ladoSaida], dt)) c.fase = 'fim';
    }
    if (['cafeFila', 'cafeMesa', 'cafeEspera', 'cafeRetirada'].includes(c.fase) && c.esperaCafe >= CAFETERIA.espera) {
      sim.registrarSatisfacao(c, 'irritado'); sair(c);
    }
  }
  barista.andando = false;
  barista.angulo = CAFETERIA.barista.angulo;
  let cliente = clientes.find(c => c.id === barista.cliente && ['cafeEspera', 'cafeRetirada'].includes(c.fase));
  if (!cliente) { barista.cliente = null; barista.fase = 'livre'; }
  if (barista.fase === 'livre') {
    barista.angulo = CAFETERIA.barista.angulo;
    cliente = clientes.find(c => c.fase === 'cafeEspera' && pedidoCafeDisponivel(sim.estado, c.pedidoCafe));
    barista.cliente = cliente?.id ?? null;
    if (!cliente) { barista.andando = false; return; }
    barista.fase = 'preparando';
  }
  if (barista.fase === 'preparando') {
    barista.andando = false;
    barista.angulo = CAFETERIA.barista.angulo;
    if (!pedidoCafeDisponivel(sim.estado, cliente.pedidoCafe)) { barista.cliente = null; barista.fase = 'livre'; return; }
    cliente.preparoCafe += dt;
    if (cliente.preparoCafe >= CAFETERIA.preparo) {
      barista.fase = 'pronto'; cliente.fase = 'cafeRetirada'; cliente.sentado = false;
    }
  }
}
