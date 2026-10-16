import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/jogo/configuracao.js';
import { PLANTA_INICIAL } from '../src/jogo/planta.js';
import { Simulacao, distancia } from '../src/jogo/simulacao.js';
import { ASSALTO } from '../src/jogo/assalto.js';

test('pedestres nascem junto às extremidades com o corpo dentro da calçada', () => {
  const terreno = PLANTA_INICIAL.terreno;
  const bordas = [terreno.x - terreno.w / 2, terreno.x + terreno.w / 2];
  for (const lado of [0, 1]) {
    const sim = new Simulacao(); sim.proximoLadoEntrada = lado;
    assert.ok(sim.criarCliente());
    const cliente = sim.clientes[0];
    assert.equal(cliente.ladoEntrada, lado);
    assert.equal(cliente.x, bordas[lado] + (lado === 0 ? 0.5 : -0.5));
    assert.ok(cliente.x - 0.5 >= bordas[0] && cliente.x + 0.5 <= bordas[1]);
  }
});

test('passantes e clientes saem nas extremidades sem ultrapassar a calçada', () => {
  for (const fase of ['passando', 'saindo']) for (const ladoSaida of [0, 1]) {
    const sim = new Simulacao(); sim.proximoCliente = Infinity;
    sim.proximoLadoEntrada = 1 - ladoSaida;
    assert.ok(sim.criarCliente());
    const cliente = sim.clientes[0];
    Object.assign(cliente, { fase, ladoSaida, etapa: 1, cestaReservada: false });
    if (fase === 'saindo') Object.assign(cliente, CONFIG.entrada);
    const destino = CONFIG.extremosCalcada[ladoSaida];
    const minX = PLANTA_INICIAL.terreno.x - PLANTA_INICIAL.terreno.w / 2;
    const maxX = PLANTA_INICIAL.terreno.x + PLANTA_INICIAL.terreno.w / 2;
    for (let i = 0; i < 1000 && cliente.fase !== 'fim'; i++) {
      sim.tempo += 0.05;
      sim.atualizarClientes(0.05);
      assert.ok(cliente.z >= 6.7 && cliente.z + 0.32 <= 9.2,
        'o trajeto externo deve permanecer na calçada, sem dar a volta por trás da loja');
      assert.ok(cliente.x - 0.5 >= minX && cliente.x + 0.5 <= maxX);
      if (distancia(cliente, destino) >= 0.025) assert.ok(sim.clientes.includes(cliente), 'não deve sumir antes do fim da rua');
    }
    assert.equal(cliente.fase, 'fim');
    assert.ok(distancia(cliente, destino) < 0.025);
    assert.ok(!sim.clientes.includes(cliente));
  }
});

test('recarregar um assalto preserva clientes nas novas extremidades da calçada', () => {
  for (const lado of [0, 1]) {
    const sim = new Simulacao(); sim.proximoLadoEntrada = lado;
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
