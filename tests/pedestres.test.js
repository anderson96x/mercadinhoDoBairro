import { prepararLojaCompleta } from './helpers/loja-completa.js';
import { reativarImportadosParaTeste } from './helpers/importados-suspensos.js';
reativarImportadosParaTeste();

import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/jogo/configuracao.js';
import { PLANTA_INICIAL, PLANTA_EXPANSAO, PLANTA_CARGA } from '../src/jogo/planta.js';
import { Simulacao, distancia } from '../src/jogo/simulacao.js';
import { ASSALTO } from '../src/jogo/assalto.js';

function expandir(sim) {
  sim.estado.dinheiro = 100000;
  sim.estado.estatisticas.clientes = 17 * CONFIG.clientesPorNivel;
  prepararLojaCompleta(sim);
  for (const id of ['alaProducao', 'alaLeite', 'alaTrigo', 'alaPadaria', 'expansao']) assert.equal(sim.comprarMelhoria(id).sucesso, true, id);
}

test('pedestres nascem junto às extremidades com o corpo dentro da calçada', () => {
  for (const expandida of [false, true]) for (const lado of [0, 1]) {
    const terreno = expandida ? PLANTA_EXPANSAO.terreno : PLANTA_INICIAL.terreno;
    const bordas = [terreno.x - terreno.w / 2, terreno.x + terreno.w / 2];
    const sim = new Simulacao(); sim.proximoLadoEntrada = lado;
    if (expandida) expandir(sim);
    assert.ok(sim.criarCliente());
    const cliente = sim.clientes[0];
    assert.equal(cliente.ladoEntrada, lado);
    assert.equal(cliente.x, bordas[lado] + (lado === 0 ? 0.5 : -0.5));
    assert.ok(cliente.x - 0.5 >= bordas[0] && cliente.x + 0.5 <= bordas[1]);
    assert.ok(sim.limitesClientes.minX <= cliente.x && sim.limitesClientes.maxX >= cliente.x);
  }
});

test('passantes e clientes saem nas extremidades sem ultrapassar a calçada', () => {
  for (const expandida of [false, true]) for (const fase of ['passando', 'saindo']) for (const ladoSaida of [0, 1]) {
    const sim = new Simulacao(); sim.proximoCliente = Infinity;
    if (expandida) expandir(sim);
    sim.proximoLadoEntrada = 1 - ladoSaida;
    assert.ok(sim.criarCliente());
    const cliente = sim.clientes[0];
    Object.assign(cliente, { fase, ladoSaida, etapa: 1, cestaReservada: false });
    if (fase === 'saindo') Object.assign(cliente, CONFIG.entrada);
    const destino = sim.extremosCalcada[ladoSaida];
    const terreno = expandida ? PLANTA_EXPANSAO.terreno : PLANTA_INICIAL.terreno;
    const minX = terreno.x - terreno.w / 2;
    const maxX = terreno.x + terreno.w / 2;
    let cruzouCarga = false;
    for (let i = 0; i < 1000 && cliente.fase !== 'fim'; i++) {
      const xAnterior = cliente.x;
      sim.tempo += 0.05;
      sim.atualizarClientes(0.05);
      if (expandida && (xAnterior - PLANTA_CARGA.travessia.x) * (cliente.x - PLANTA_CARGA.travessia.x) <= 0) {
        cruzouCarga = true;
        assert.ok(Math.abs(cliente.z - PLANTA_CARGA.travessia.z) + 0.1 <= PLANTA_CARGA.travessia.d / 2, `pedestre cruza dentro da faixa de carga: ${fase}, saída ${ladoSaida}, ${JSON.stringify({ x: cliente.x, z: cliente.z })}`);
      }
      assert.ok(cliente.z >= 6.7 && cliente.z + 0.32 <= 9.2,
        'o trajeto externo deve permanecer na calçada, sem dar a volta por trás da loja');
      assert.ok(cliente.x - 0.5 >= minX && cliente.x + 0.5 <= maxX);
      if (distancia(cliente, destino) >= 0.025) assert.ok(sim.clientes.includes(cliente), 'não deve sumir antes do fim da rua');
    }
    assert.equal(cliente.fase, 'fim');
    assert.ok(distancia(cliente, destino) < 0.025);
    assert.ok(!sim.clientes.includes(cliente));
    if (expandida && (fase === 'passando' || ladoSaida === 0)) assert.ok(cruzouCarga, 'entrada e saída à esquerda passam pela faixa de carga');
  }
});

test('cliente vindo da nova borda esquerda atravessa a faixa de carga antes de entrar na loja', () => {
  const sim = new Simulacao(); expandir(sim);
  sim.proximoLadoEntrada = 0; sim.proximoCliente = Infinity;
  assert.equal(sim.criarCliente(), true);
  const cliente = sim.clientes[0];
  let cruzouCarga = false;
  for (let i = 0; i < 1000 && cliente.fase !== 'pegandoCesta'; i++) {
    const xAnterior = cliente.x;
    sim.tempo += 0.05; sim.atualizarClientes(0.05);
    if ((xAnterior - PLANTA_CARGA.travessia.x) * (cliente.x - PLANTA_CARGA.travessia.x) <= 0) {
      cruzouCarga = true;
      assert.equal(cliente.z, CONFIG.entrada.z);
    }
  }
  assert.ok(cruzouCarga);
  assert.equal(cliente.fase, 'pegandoCesta');
});

test('expansão muda o nascimento sem alterar outra partida e evita sobreposição nas novas extremidades', () => {
  const sim = new Simulacao(), outra = new Simulacao();
  expandir(sim);
  assert.equal(outra.extremosCalcada[0].x, -15.5);
  assert.equal(CONFIG.extremosCalcada[0].x, -15.5);
  assert.equal(sim.extremosCalcada[0].x, -27.5);
  for (let i = 0; i < 2; i++) {
    sim.proximoLadoEntrada = 0;
    assert.equal(sim.criarCliente(), true);
  }
  assert.equal(sim.criarCliente(), false);
  assert.deepEqual(new Set(sim.clientes.map(c => c.x)), new Set([-27.5, 23.5]));
  assert.equal(new Simulacao(structuredClone(sim.estado)).extremosCalcada[0].x, -27.5);
});

test('recarregar um assalto preserva clientes nas novas extremidades da calçada', () => {
  for (const expandida of [false, true]) for (const lado of [0, 1]) {
    const sim = new Simulacao(); sim.proximoLadoEntrada = lado;
    if (expandida) expandir(sim);
    assert.ok(sim.criarCliente());
    sim.estado.banco.noCaixa = 1000;
    sim.atualizarAssalto(ASSALTO.espera);
    assert.ok(sim.estado.banco.assalto);
    const salvo = structuredClone({ ...sim.estado, clientesAssalto: sim.clientes });
    const carregado = new Simulacao(salvo);
    assert.equal(carregado.clientes.length, 1);
    assert.equal(carregado.clientes[0].x, sim.clientes[0].x);
    assert.equal(carregado.clientes[0].z, sim.clientes[0].z);
  }
});
