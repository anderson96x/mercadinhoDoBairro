import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulacao, estadoInicial, validarEstado } from '../src/jogo/simulacao.js';
import { CAFETERIA, ASSENTOS_CAFETERIA, INSUMOS_CAFETERIA, porcoesCafeteria, criarPedidoCafe, pedidoCafeDisponivel, servirPedidoCafe } from '../src/jogo/cafeteria.js';
import { MODELO_PADARIA, volumePadaria } from '../src/jogo/planta.js';
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

test('mantém somente duas mesas alinhadas ao balcão, com dois lugares cada', () => {
  assert.equal(CAFETERIA.mesas.length, 2);
  assert.equal(ASSENTOS_CAFETERIA.length, 4);
  assert.equal(CAFETERIA.mesas[0].x, CAFETERIA.mesas[1].x);
  const centros = CAFETERIA.mesas.map(m => m.z);
  assert.ok(Math.abs((Math.min(...centros) + Math.max(...centros)) / 2 - CAFETERIA.fechamento.z) < 1e-8);
  const margemSuperior = Math.min(...centros) - 0.675 - (CAFETERIA.fechamento.z - CAFETERIA.fechamento.d / 2);
  const margemInferior = CAFETERIA.fechamento.z + CAFETERIA.fechamento.d / 2 - Math.max(...centros) - 0.675;
  assert.ok(Math.abs(margemSuperior - margemInferior) < 1e-8);
  for (const mesa of CAFETERIA.mesas) {
    assert.equal(mesa.angulo || 0, 0);
    assert.ok(mesa.z - 0.675 >= CAFETERIA.fechamento.z - CAFETERIA.fechamento.d / 2);
    assert.ok(mesa.z + 0.675 <= CAFETERIA.fechamento.z + CAFETERIA.fechamento.d / 2);
  }
  for (const [indice, mesa] of CAFETERIA.mesas.entries()) {
    const assentos = ASSENTOS_CAFETERIA.filter(p => p.mesa === indice);
    assert.equal(assentos.length, 2);
    for (const p of assentos) {
      assert.ok(Math.abs(Math.hypot(p.x - mesa.x, p.z - mesa.z) - 1.15) < 1e-8);
      assert.ok(Math.abs(Math.sin(p.angulo) - (mesa.x - p.x) / 1.15) < 1e-8);
      assert.ok(Math.abs(Math.cos(p.angulo) - (mesa.z - p.z) / 1.15) < 1e-8);
    }
  }
});

test('cliente parado na fila olha para o barista ao fazer o pedido', () => {
  const sim = abrirCafe();
  sim.criarClienteCafeteria();
  const cliente = sim.clientes[0];
  Object.assign(cliente, CAFETERIA.pedido, { fase: 'cafeFila', angulo: 0 });
  sim.atualizar(0.05);
  const esperado = Math.atan2(CAFETERIA.barista.x - cliente.x, CAFETERIA.barista.z - cliente.z);
  assert.equal(cliente.angulo, esperado);
  assert.equal(cliente.andando, false);
  assert.ok(cliente.preparoCafe > 0);
  assert.equal(cliente.fase, 'cafeFila');
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

test('cliente pede, espera sentado, retira e paga no balcão, volta à mesa e sai; barista fica no posto', () => {
  const sim = abrirCafe();
  for (const id of INSUMOS_CAFETERIA) sim.estado.cafeteria.ingredientes[id] = 24;
  for (const id of ['pao', 'bolo', 'donut', 'eclair']) sim.estado.produtos[id].prateleira = 12;
  assert.equal(sim.criarClienteCafeteria(), true);
  const cliente = sim.clientes[0]; cliente.pedidoCafe = ['cafeLeite', 'pao', 'ovos', 'sucoLaranja'];
  const fases = new Set();
  const dinheiro = sim.estado.dinheiro;
  for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
    const pagoAntes = cliente.pagoCafe;
    sim.atualizar(0.05); fases.add(cliente.fase);
    assert.equal(sim.barista.x, CAFETERIA.barista.x);
    assert.equal(sim.barista.z, CAFETERIA.barista.z);
    assert.equal(sim.barista.andando, false);
    if (['cafeEspera', 'cafeRetirada'].includes(cliente.fase)) {
      assert.equal(sim.estado.dinheiro, dinheiro, 'pedido pronto não é cobrado antes da retirada');
      assert.equal(sim.estado.cafeteria.ingredientes.leite, 24);
    }
    if (cliente.fase === 'cafeVoltando') {
      if (!pagoAntes) assert.ok(Math.hypot(cliente.x - CAFETERIA.retirada.x, cliente.z - CAFETERIA.retirada.z) < 0.2);
      assert.equal(cliente.pagoCafe, true);
      assert.equal(cliente.sentado, false);
    }
  }
  assert.ok(fases.has('cafeFila'));
  assert.ok(fases.has('cafeEspera'), JSON.stringify(cliente));
  assert.ok(fases.has('cafeRetirada'));
  assert.ok(fases.has('cafeVoltando'));
  assert.ok(fases.has('cafeConsumindo'), JSON.stringify({ cliente, barista: sim.barista }));
  assert.equal(cliente.fase, 'fim');
  assert.equal(cliente.temCesta, false); assert.equal(cliente.usaCarrinho, false);
  assert.equal(sim.barista.fase, 'livre');
  assert.equal(sim.barista.angulo, Math.PI / 2, 'barista retorna ao posto voltado para a direita');
  assert.equal(sim.estado.cafeteria.atendidos, 1);
  assert.equal(sim.estado.dinheiro - dinheiro, 8 + PRODUTOS.pao.preco + PRODUTOS.ovos.preco + PRODUTOS.sucoLaranja.preco);
});

test('pedido pronto respeita pausa e recarga sem cobrança e libera o preparo após desistência', () => {
  const sim = abrirCafe();
  sim.estado.cafeteria.ingredientes.cafe = 1;
  sim.criarClienteCafeteria();
  const cliente = sim.clientes[0];
  Object.assign(cliente, ASSENTOS_CAFETERIA[0], { fase: 'cafeEspera', sentado: true, pedidoCafe: ['espresso'] });
  for (let i = 0; i < 200 && cliente.fase !== 'cafeRetirada'; i++) sim.atualizar(0.05);
  assert.equal(sim.barista.fase, 'pronto');
  const antes = structuredClone({ estado: sim.estado, cliente, barista: sim.barista });
  sim.pausado = true; sim.atualizar(10);
  assert.deepEqual({ estado: sim.estado, cliente, barista: sim.barista }, antes);
  const recarregado = new Simulacao(sim.estado);
  assert.equal(recarregado.estado.dinheiro, antes.estado.dinheiro);
  assert.equal(recarregado.estado.cafeteria.ingredientes.cafe, 1);
  assert.equal(recarregado.clientes.length, 0);
  assert.equal(recarregado.barista.fase, 'livre');
  sim.pausado = false;
  cliente.esperaCafe = CAFETERIA.espera;
  sim.atualizar(0.05);
  assert.equal(cliente.fase, 'saindo');
  assert.equal(sim.barista.fase, 'livre');
  assert.equal(sim.estado.dinheiro, antes.estado.dinheiro);
  assert.equal(sim.estado.cafeteria.ingredientes.cafe, 1);
});

test('cada assento permite pedir, sentar, retirar no balcão, voltar à mesa e sair', () => {
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
    assert.ok(caminhar(cliente, CAFETERIA.retirada), `retirada ${assento}`);
    assert.ok(caminhar(cliente, ponto), `volta à mesa ${assento}`);
    assert.ok(caminhar(cliente, CONFIG.inicio), `saída ${assento}`);
  }
  for (let indice = 0; indice < ASSENTOS_CAFETERIA.length; indice++) {
    const cliente = { ...CONFIG.inicio, cafeteria: true, assento: indice };
    sim.clientes = [cliente];
    assert.ok(caminhar(cliente, {
      x: CAFETERIA.pedido.x + Math.min(indice, CAFETERIA.fila.porLinha - 1) * CAFETERIA.fila.x,
      z: CAFETERIA.pedido.z + Math.max(0, indice - CAFETERIA.fila.porLinha + 1) * CAFETERIA.fila.z
    }), `fila ${indice}`);
  }
  const jogador = Object.assign(sim.estado.jogador, CONFIG.inicio);
  assert.ok(caminhar(jogador, CAFETERIA.entrega), 'jogador abastece pela face externa do balcão fechado');
  assert.ok(caminhar(jogador, CONFIG.inicio), 'saída após abastecimento');
});

test('fechamento posterior liga a padaria à lateral da cafeteria sem vãos', () => {
  const posterior = CAFETERIA.fechamentoPosterior, lateral = CAFETERIA.fechamento;
  const padaria = volumePadaria(MODELO_PADARIA.fechamento.find(p => p.entregaTrigo));
  assert.equal(posterior.z, padaria.z);
  assert.ok(Math.abs(posterior.x - posterior.w / 2 - (padaria.x + padaria.w / 2)) < 1e-8);
  assert.ok(Math.abs(posterior.z + posterior.d / 2 - (lateral.z - lateral.d / 2)) < 1e-8);
  assert.equal(posterior.x + posterior.w / 2, lateral.x + lateral.w / 2);
});

test('quatro pedidos são preparados e retirados uma vez sem deslocar o barista', () => {
  const sim = abrirCafe();
  sim.estado.cafeteria.ingredientes.cafe = 4;
  for (let i = 0; i < ASSENTOS_CAFETERIA.length; i++) {
    sim.criarClienteCafeteria();
    Object.assign(sim.clientes[i], ASSENTOS_CAFETERIA[i], { fase: 'cafeEspera', sentado: true, pedidoCafe: ['espresso'] });
  }
  const saldo = sim.estado.dinheiro;
  const clientes = [...sim.clientes];
  for (let i = 0; i < 6000 && clientes.some(c => c.fase !== 'fim'); i++) sim.atualizar(0.05);
  assert.equal(sim.estado.cafeteria.atendidos, 4);
  assert.equal(sim.estado.cafeteria.ingredientes.cafe, 0);
  assert.equal(sim.estado.dinheiro - saldo, 20);
  assert.ok(clientes.every(c => c.fase === 'fim' && c.pagoCafe));
  assert.equal(sim.barista.x, CAFETERIA.barista.x);
  assert.equal(sim.barista.z, CAFETERIA.barista.z);
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
  for (let i = 0; i < ASSENTOS_CAFETERIA.length; i++) assert.equal(sim.criarClienteCafeteria(), true);
  assert.equal(sim.criarClienteCafeteria(), false);
  assert.equal(new Set(sim.clientes.map(c => c.assento)).size, ASSENTOS_CAFETERIA.length);
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
