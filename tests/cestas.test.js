import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';

test('a quantidade de cestas limita quantos clientes podem entrar', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  for (let i = 0; i < CONFIG.quantidadeCestas; i++) {
    assert.equal(sim.criarCliente(), true);
    Object.assign(sim.clientes.at(-1), { x: i - 2, z: 7.2 });
  }
  assert.equal(sim.cestasEmUso, CONFIG.quantidadeCestas);
  assert.equal(sim.cestasDisponiveis, 0);
  assert.equal(sim.cestasNoSuporte, CONFIG.quantidadeCestas, 'reservar não remove a cesta do suporte');
  assert.equal(sim.criarCliente(), false);

  sim.clientes[0].cestaReservada = false;
  assert.equal(sim.cestasDisponiveis, 1);
});

test('cliente pega a cesta ao entrar e ela volta ao suporte no checkout', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  sim.estado.produtos.tomate.prateleira = 10;
  sim.estado.melhorias.caixa = 1;
  assert.equal(sim.criarCliente(), true);
  const cliente = sim.clientes[0];
  let pegou = false, devolveu = false;
  for (let i = 0; i < 2400 && cliente.fase !== 'fim'; i++) {
    sim.atualizar(1 / 60);
    const atravessouSuporte = Math.abs(cliente.x - CONFIG.cestas.x) < 0.45
      && Math.abs(cliente.z - CONFIG.cestas.z) < 0.625;
    assert.equal(atravessouSuporte, false);
    pegou ||= cliente.temCesta === true;
    if (cliente.temCesta) assert.equal(sim.cestasNoSuporte, CONFIG.quantidadeCestas - 1);
    devolveu ||= pegou && cliente.temCesta === false && cliente.levaSacolas === true;
  }
  assert.equal(pegou, true);
  assert.equal(devolveu, true);
  assert.equal(cliente.cestaReservada, false);
  assert.equal(sim.cestasDisponiveis, CONFIG.quantidadeCestas);
  assert.equal(sim.cestasNoSuporte, CONFIG.quantidadeCestas);
});

test('cada cesta de cliente comporta no maximo dez itens', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  sim.estado.produtos.tomate.prateleira = 12;
  const cliente = {
    id: 1, ...PRODUTOS.tomate.cliente, produto: 'tomate', pontoCompra: 0,
    quantidade: 0, desejado: 99, fase: 'comprando', espera: 0, andando: false,
    cestaReservada: true, temCesta: true
  };
  sim.clientes.push(cliente);
  for (let i = 0; i < 20 && cliente.fase === 'comprando'; i++) sim.atualizarClientes(0.66);
  assert.equal(cliente.quantidade, CONFIG.capacidadeCestaCliente);
  assert.equal(sim.estado.produtos.tomate.prateleira, 2);
  assert.equal(cliente.fase, 'indoCaixa');
});
