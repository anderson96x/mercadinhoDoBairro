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

test('cada cesta de cliente comporta no maximo cinco itens', () => {
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
  assert.equal(sim.estado.produtos.tomate.prateleira, 12 - CONFIG.capacidadeCestaCliente);
  assert.equal(cliente.fase, 'indoCaixa');
});

test('cliente compra diferentes produtos em sequencia sem ultrapassar cinco itens', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  sim.estado.produtos.milho.liberado = true;
  sim.estado.produtos.tomate.prateleira = 3;
  sim.estado.produtos.milho.prateleira = 2;
  assert.equal(sim.criarCliente(), true);
  const cliente = sim.clientes[0];
  assert.deepEqual(cliente.compras.map(({ produto, desejado }) => ({ produto, desejado })), [
    { produto: 'tomate', desejado: 3 },
    { produto: 'milho', desejado: 2 }
  ]);

  Object.assign(cliente, PRODUTOS.tomate.pontosCompra[0], { fase: 'comprando', etapa: 2, temCesta: true });
  for (let i = 0; i < 3; i++) sim.atualizarClientes(0.66);
  assert.equal(cliente.fase, 'chegando');
  assert.equal(cliente.produto, 'milho');
  assert.deepEqual(cliente.itens, ['tomate', 'tomate', 'tomate']);

  for (let i = 0; i < 600 && cliente.fase !== 'comprando'; i++) sim.atualizarClientes(1 / 60);
  assert.equal(cliente.fase, 'comprando');
  for (let i = 0; i < 2; i++) sim.atualizarClientes(0.66);
  assert.equal(cliente.fase, 'indoCaixa');
  assert.deepEqual(cliente.itens, ['tomate', 'tomate', 'tomate', 'milho', 'milho']);
  assert.equal(cliente.quantidade, CONFIG.capacidadeCestaCliente);

  Object.assign(cliente, CONFIG.clienteCaixa, { fase: 'fila' });
  sim.estado.melhorias.caixa = 1;
  sim.atualizarCaixa(CONFIG.tempoCaixa);
  assert.equal(sim.estado.dinheiro, 52);
});

test('cliente espera dez segundos por uma prateleira vazia antes de desistir', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  const cliente = {
    id: 1, ...PRODUTOS.tomate.cliente, produto: 'tomate', pontoCompra: 0,
    quantidade: 0, desejado: 1, fase: 'comprando', espera: 0, andando: false,
    cestaReservada: true, temCesta: true
  };
  sim.clientes.push(cliente);

  sim.atualizarClientes(CONFIG.tempoEsperaCliente - 0.1);
  assert.equal(cliente.fase, 'comprando');
  assert.equal(cliente.esperaSemEstoque, CONFIG.tempoEsperaCliente - 0.1);
  sim.atualizarClientes(0.1);
  assert.equal(cliente.fase, 'saindo');
});
