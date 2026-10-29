import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulacao, estadoInicial, validarEstado } from '../src/jogo/simulacao.js';
import { CAFETERIA, ASSENTOS_CAFETERIA, INSUMOS_CAFETERIA, porcoesCafeteria, criarPedidoCafe, pedidoCafeDisponivel, servirPedidoCafe } from '../src/jogo/cafeteria.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { prepararMelhoriasAnteriores } from './helpers/progressao.js';

function abrirCafe() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 26 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 100000;
  prepararMelhoriasAnteriores(sim, 'cafeteria');
  const saldo = sim.estado.dinheiro;
  sim.estado.dinheiro = 9999;
  assert.equal(sim.comprarMelhoria('cafeteria').sucesso, false);
  assert.equal(sim.estado.dinheiro, 9999);
  sim.estado.dinheiro = saldo;
  assert.equal(sim.comprarMelhoria('cafeteria').sucesso, true);
  assert.equal(saldo - sim.estado.dinheiro, 10000);
  sim.assaltosAtivos = false; sim.proximoCliente = Infinity; sim.proximoClienteCafe = Infinity;
  sim.temporizadorEntregaAtivo = false;
  return sim;
}

test('cafeteria exige nível 27, pré-requisitos e saldo, amplia o salão em 50%', () => {
  const sim = new Simulacao();
  sim.estado.dinheiro = 100000;
  assert.equal(sim.comprarMelhoria('cafeteria').sucesso, false);
  const cafe = abrirCafe();
  assert.equal(cafe.estado.produtos.cafe.liberado, true);
  assert.equal(CAFETERIA.piso.w, 24 / 2);
  assert.equal(CAFETERIA.piso.d, 16);
  assert.equal(cafe.limitesMundo.maxX, 34.5);
  assert.equal(cafe.obstaculos().some(p => p.lateralContinua), false);
  assert.equal(cafe.comprarMelhoria('cafeteria').sucesso, false);
});

test('quatro cafés de R$ 5 a R$ 10 aceitam combinações e consomem estoques reais uma vez', () => {
  assert.deepEqual(Object.values(CAFETERIA.cafes).map(c => c.preco), [5, 6, 8, 10]);
  const sim = abrirCafe();
  const estado = sim.estado;
  estado.cafeteria.ingredientes.cafe = 2;
  estado.cafeteria.ingredientes.leite = 1;
  estado.produtos.donut.prateleira = 1;
  const pedido = ['cappuccino', 'donut'];
  const saldo = estado.dinheiro;
  assert.equal(pedidoCafeDisponivel(estado, pedido), true);
  assert.equal(servirPedidoCafe(estado, pedido, PRODUTOS), 25);
  assert.equal(estado.dinheiro, saldo + 25);
  assert.equal(estado.cafeteria.ingredientes.cafe, 1);
  assert.equal(estado.cafeteria.ingredientes.leite, 0);
  assert.equal(estado.produtos.donut.prateleira, 0);
  assert.equal(servirPedidoCafe(estado, pedido, PRODUTOS), null);
  assert.equal(estado.dinheiro, saldo + 25);
  let semente = 17;
  const aleatorio = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };
  const pedidos = new Set(Array.from({ length: 200 }, () => criarPedidoCafe(aleatorio).join(',')));
  assert.ok(pedidos.size > 8);
});

test('jogador importa café pelo caminhão e abastece café, leite, ovos e sucos sem venda na gôndola', () => {
  const sim = abrirCafe();
  assert.equal(sim.encomendarImportacoes({ importarCafe: 4 }).quantidade, 96);
  assert.equal(sim.encomendarImportacoes({ importarCafe: 1 }).sucesso, false);
  let maiorXPartida = -Infinity;
  for (let i = 0; i < 30000 && (sim.estado.deposito.pedidos.length || sim.entregas.caminhao); i++) {
    sim.entregas.atualizar(sim, 0.05);
    if (sim.entregas.caminhao?.fase === 'partindo') maiorXPartida = Math.max(maiorXPartida, sim.entregas.caminhao.x);
  }
  assert.ok(maiorXPartida > 30, 'caminhão percorre a rua ampliada antes de desaparecer');
  assert.equal(sim.estado.produtos.cafe.horta, 96);
  Object.assign(sim.estado.jogador, CAFETERIA.coleta);
  sim.tempo++; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['cafe']);
  assert.equal(sim.estado.deposito.pacotes.find(p => p.slot === 27).unidades, 23);
  Object.assign(sim.estado.jogador, CAFETERIA.entrega);
  sim.estado.jogador.inventario = [...INSUMOS_CAFETERIA];
  for (let i = 0; i < INSUMOS_CAFETERIA.length; i++) { sim.tempo++; sim.interagir(); }
  assert.equal(sim.estado.jogador.inventario.length, 0);
  for (const id of INSUMOS_CAFETERIA) assert.equal(sim.estado.cafeteria.ingredientes[id], porcoesCafeteria(id), id);
  sim.estado.cafeteria.ingredientes.cafe = CAFETERIA.capacidade;
  sim.estado.jogador.inventario = ['cafe']; sim.tempo++; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['cafe']);
  sim.criarCliente();
  assert.ok(sim.clientes.every(c => c.compras.every(p => p.produto !== 'cafe')));
});

test('cliente entra sem cesta, pede, senta, recebe do barista, consome e sai', () => {
  const sim = abrirCafe();
  for (const id of INSUMOS_CAFETERIA) sim.estado.cafeteria.ingredientes[id] = 24;
  for (const id of ['pao', 'bolo', 'donut', 'eclair']) sim.estado.produtos[id].prateleira = 12;
  assert.equal(sim.criarClienteCafeteria(), true);
  const cliente = sim.clientes[0]; cliente.pedidoCafe = ['cafeLeite', 'pao', 'ovos', 'sucoLaranja'];
  const fases = new Set();
  const dinheiro = sim.estado.dinheiro;
  for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
    sim.atualizar(0.05); fases.add(cliente.fase);
  }
  assert.ok(fases.has('cafeFila'));
  assert.ok(fases.has('cafeEspera'), JSON.stringify(cliente));
  assert.ok(fases.has('cafeConsumindo'), JSON.stringify({ cliente, barista: sim.barista }));
  assert.equal(cliente.fase, 'fim');
  assert.equal(cliente.temCesta, false); assert.equal(cliente.usaCarrinho, false);
  assert.equal(sim.barista.fase, 'livre');
  assert.equal(sim.barista.angulo, Math.PI / 2, 'barista retorna ao posto voltado para a direita');
  assert.equal(sim.estado.cafeteria.atendidos, 1);
  assert.equal(sim.estado.dinheiro - dinheiro, 8 + PRODUTOS.pao.preco + PRODUTOS.ovos.preco + PRODUTOS.sucoLaranja.preco);
});

test('cada assento tem rota de ida e saída e o barista alcança todas as mesas', () => {
  const sim = abrirCafe(); sim.estado.lojaAberta = false;
  const caminhar = (ator, ponto) => {
    for (let i = 0; i < 3500; i++) { sim.tempo += 0.05; if (sim.caminharCliente(ator, ponto, 0.05)) return true; }
    return false;
  };
  for (const [assento, ponto] of ASSENTOS_CAFETERIA.entries()) {
    const cliente = { ...CONFIG.inicio, cafeteria: true, assento };
    sim.clientes = [cliente];
    assert.ok(caminhar(cliente, CAFETERIA.pedido), `balcão ${assento}`);
    assert.ok(caminhar(cliente, ponto), `assento ${assento}: ${JSON.stringify(cliente)}`);
    assert.ok(caminhar(cliente, CONFIG.inicio), `saída ${assento}`);
    assert.ok(caminhar(sim.barista, { x: ponto.x, z: ponto.z + 1 }), `entrega ${assento}`);
    assert.ok(caminhar(sim.barista, CAFETERIA.barista), `volta ${assento}`);
  }
});

test('ala das máquinas se prolonga até a lateral nova com passagem livre e paredes externas', () => {
  const sim = abrirCafe();
  const ator = { x: 19.8, z: -11.5 };
  const destino = { x: 31.5, z: -12.3 };
  let chegou = false;
  for (let i = 0; i < 2000 && !chegou; i++) { sim.tempo += 0.05; chegou = sim.caminharCliente(ator, destino, 0.05); }
  assert.ok(chegou, JSON.stringify(ator));
  assert.equal(CAFETERIA.oficinas.w, 12);
  assert.ok(sim.obstaculos().some(o => o.x === 26.9 && o.z === -15.3 && o.w === 12));
  assert.ok(!sim.obstaculos().some(o => o.x === 20.9 && o.z === -12.3 && o.d === 6));
  assert.equal(CAFETERIA.externo.rua.z, 11.3);
  assert.equal(CAFETERIA.externo.rua.d, 4.4);
  assert.equal(CAFETERIA.externo.rua.y, 0);
});

test('pausa, falta de insumos, mesas cheias e recarga preservam ingredientes e dinheiro', () => {
  const sim = abrirCafe();
  for (let i = 0; i < 8; i++) assert.equal(sim.criarClienteCafeteria(), true);
  assert.equal(sim.criarClienteCafeteria(), false);
  assert.equal(new Set(sim.clientes.map(c => c.assento)).size, 8);
  sim.pausado = true;
  const antes = structuredClone(sim.estado);
  sim.atualizar(0.05);
  assert.deepEqual(sim.estado, antes);
  sim.pausado = false;
  sim.clientes = [sim.clientes[0]];
  const cliente = sim.clientes[0]; Object.assign(cliente, ASSENTOS_CAFETERIA[cliente.assento], { fase: 'cafeEspera', sentado: true });
  for (let i = 0; i < 1600; i++) sim.atualizar(0.05);
  assert.equal(cliente.fase, 'saindo');
  assert.equal(sim.estado.cafeteria.atendidos, 0);
  assert.equal(sim.estado.dinheiro, antes.dinheiro);
  sim.estado.cafeteria.ingredientes.cafe = 7;
  assert.equal(validarEstado(sim.estado).cafeteria.ingredientes.cafe, 7);
  const invalido = structuredClone(sim.estado);
  invalido.cafeteria.ingredientes.cafe = Infinity; invalido.cafeteria.ingredientes.ovos = -5;
  assert.equal(validarEstado(invalido).cafeteria.ingredientes.cafe, 0);
  assert.equal(validarEstado(invalido).cafeteria.ingredientes.ovos, 0);
  const antigo = estadoInicial(); delete antigo.cafeteria;
  assert.equal(validarEstado(antigo).cafeteria.ingredientes.cafe, 0);
});
