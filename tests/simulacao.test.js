import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulacao, validarEstado, distancia } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';

function avancar(sim, segundos, entrada) {
  for (let i = 0; i < segundos * 60; i++) sim.atualizar(1 / 60, entrada);
}
function aproximar(sim, ponto) { Object.assign(sim.estado.jogador, ponto); }

test('cinco clientes formam fila espaçada e são atendidos na ordem sem se atravessar', () => {
  const sim = new Simulacao();
  aproximar(sim, { x: -9, z: 8 });
  const verificarEspaco = () => {
    for (let i = 0; i < sim.clientes.length; i++) for (let j = i + 1; j < sim.clientes.length; j++) {
      assert.ok(distancia(sim.clientes[i], sim.clientes[j]) >= CONFIG.distanciaClientes - 1e-5, 'clientes não podem se sobrepor');
    }
  };
  for (let i = 0; i < 1800; i++) {
    sim.estado.produtos.tomate.prateleira = 12;
    sim.atualizar(0.05); verificarEspaco();
  }
  const fila = sim.clientes.filter(c => c.fase === 'fila').sort((a, b) => a.ordemFila - b.ordemFila);
  assert.equal(fila.length, 5);
  fila.forEach((c, i) => {
    assert.ok(Math.abs(c.x - (CONFIG.clienteCaixa.x + i * CONFIG.espacoClientes)) < 0.025);
    assert.ok(Math.abs(c.z - CONFIG.clienteCaixa.z) < 0.025);
  });
  sim.proximoCliente = Infinity;
  sim.estado.melhorias.caixa = 1;
  const atendidos = [];
  for (let i = 0; i < 1800; i++) {
    const antes = sim.clientes.filter(c => c.fase === 'fila');
    sim.atualizar(0.05); verificarEspaco();
    atendidos.push(...antes.filter(c => c.fase === 'saindo').map(c => c.id));
  }
  assert.deepEqual(atendidos, fila.map(c => c.id));
  assert.equal(sim.clientes.length, 0);
});

test('entrada ocupada não cria clientes sobrepostos', () => {
  const sim = new Simulacao();
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.criarCliente(), false);
  assert.equal(sim.clientes.length, 1);
});

test('jogador senta na cadeira, atende e levanta ao andar sem perder produtos', () => {
  const sim = new Simulacao();
  aproximar(sim, CONFIG.cadeiraCaixa);
  sim.estado.jogador.inventario = ['tomate'];
  sim.clientes.push({ id: 1, ...CONFIG.clienteCaixa, fase: 'fila', quantidade: 2, produto: 'tomate' });
  sim.atualizar(0.05);
  assert.equal(sim.estado.jogador.sentado, true);
  assert.equal(sim.estado.jogador.angulo, Math.PI / 2);
  sim.atualizarCaixa(CONFIG.tempoCaixa);
  assert.equal(sim.estado.dinheiro, 16);
  sim.atualizar(0.05, { x: -1, y: 0 });
  assert.equal(sim.estado.jogador.sentado, false);
  assert.deepEqual(sim.estado.jogador.inventario, ['tomate']);
  aproximar(sim, { x: -3, z: 3 });
  sim.atualizar(0.05);
  assert.equal(sim.estado.jogador.sentado, false);
});

test('colheita e reposição funcionam em todos os lados das estações', () => {
  for (const id of ['tomate', 'milho']) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const sim = new Simulacao(), p = PRODUTOS[id];
      sim.estado.produtos[id].liberado = true;
      sim.estado.produtos[id].horta = 8;
      aproximar(sim, { x: p.horta.x + dx * 1.75, z: p.horta.z + dz * 2.3 });
      sim.interagir();
      assert.deepEqual(sim.estado.jogador.inventario, [id]);
      sim.tempo = 1;
      aproximar(sim, { x: p.prateleira.x + dx * 1.725, z: p.prateleira.z + dz * 1.4 });
      sim.interagir();
      assert.equal(sim.estado.produtos[id].prateleira, 1);
      assert.deepEqual(sim.estado.jogador.inventario, []);
    }
  }
});

test('caixa atende por qualquer lado, mas não quando o jogador está longe', () => {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const sim = new Simulacao();
    sim.clientes.push({ ...CONFIG.clienteCaixa, fase: 'fila', quantidade: 2, produto: 'tomate' });
    aproximar(sim, { x: -9, z: 8 });
    sim.atualizarCaixa(CONFIG.tempoCaixa);
    assert.equal(sim.estado.dinheiro, 0);
    aproximar(sim, { x: CONFIG.balcao.x + dx * 1.265, z: CONFIG.balcao.z + dz * 1.95 });
    sim.atualizarCaixa(CONFIG.tempoCaixa);
    assert.equal(sim.estado.dinheiro, 16);
  }
});

test('os quatro níveis da cesta comportam 4, 8, 12 e 16 produtos', () => {
  const sim = new Simulacao();
  sim.estado.dinheiro = 1000;
  aproximar(sim, PRODUTOS.tomate.coleta);
  for (const capacidade of [4, 8, 12, 16]) {
    assert.equal(sim.capacidade, capacidade);
    avancar(sim, 40);
    assert.equal(sim.estado.jogador.inventario.length, capacidade);
    const salvo = structuredClone(sim.estado);
    salvo.jogador.inventario = Array(30).fill('tomate');
    assert.equal(validarEstado(salvo).jogador.inventario.length, capacidade);
    if (capacidade < 16) assert.equal(sim.comprarMelhoria('mochila').sucesso, true);
  }
  assert.equal(sim.comprarMelhoria('mochila').sucesso, false);
  assert.equal(sim.capacidade, 16);
});

test('colher, repor, atender e receber o valor exato da compra', () => {
  const sim = new Simulacao();
  aproximar(sim, { x: -4.8, z: -1.7 });
  avancar(sim, 3);
  assert.equal(sim.estado.jogador.inventario.length, 4);
  assert.equal(sim.estado.estatisticas.colhidos, 4);
  aproximar(sim, PRODUTOS.tomate.reposicao);
  avancar(sim, 3);
  assert.equal(sim.estado.jogador.inventario.length, 0);
  assert.equal(sim.estado.estatisticas.repostos, 4);
  aproximar(sim, CONFIG.caixa);
  avancar(sim, 30);
  assert.ok(sim.estado.estatisticas.clientes >= 1);
  assert.ok(sim.estado.dinheiro > 0);
  assert.equal(sim.estado.dinheiro, sim.estado.estatisticas.faturamento);
  assert.equal(sim.estado.dinheiro % PRODUTOS.tomate.preco, 0);
  const vendidos = sim.estado.dinheiro / PRODUTOS.tomate.preco;
  const carregados = sim.clientes.filter(c => !['saindo','fim'].includes(c.fase)).reduce((s,c) => s+c.quantidade,0);
  assert.equal(vendidos + carregados + sim.estado.produtos.tomate.prateleira, 4);
});

test('a cesta tem limite, e uma prateleira cheia não consome produtos', () => {
  const sim = new Simulacao();
  aproximar(sim, { x: -4.8, z: -1.7 }); avancar(sim, 12);
  assert.equal(sim.estado.jogador.inventario.length, sim.capacidade);
  sim.estado.produtos.tomate.prateleira = 12;
  aproximar(sim, PRODUTOS.tomate.reposicao); sim.interagir();
  assert.equal(sim.estado.jogador.inventario.length, 4);
  assert.equal(sim.estado.produtos.tomate.prateleira, 12);
});

test('melhorias respeitam o saldo, o limite e o desbloqueio de produtos', () => {
  const sim = new Simulacao();
  assert.equal(sim.comprarMelhoria('milho').sucesso, false);
  assert.equal(sim.comprarMelhoria('inexistente').sucesso, false);
  assert.equal(sim.estado.dinheiro, 0);
  sim.estado.dinheiro = 500;
  assert.equal(sim.comprarMelhoria('milho').sucesso, true);
  assert.equal(sim.estado.dinheiro, 420);
  assert.equal(sim.estado.produtos.milho.liberado, true);
  assert.equal(sim.comprarMelhoria('milho').sucesso, false);
  assert.equal(sim.estado.dinheiro, 420);
  assert.equal(sim.comprarMelhoria('mochila').sucesso, true);
  assert.equal(sim.capacidade, 8);
  assert.equal(sim.custoMelhoria('mochila'), 105);
});

test('funcionários conseguem produzir e vender com o jogador distante', () => {
  const sim = new Simulacao();
  sim.estado.dinheiro = 440;
  sim.comprarMelhoria('milho'); sim.comprarMelhoria('caixa'); sim.comprarMelhoria('ajudante');
  aproximar(sim, { x: -9, z: 8 });
  avancar(sim, 240);
  assert.ok(sim.estado.estatisticas.clientes >= 5);
  assert.ok(sim.estado.dinheiro > 0);
  assert.ok(sim.estado.produtos.milho.horta <= 8);
  for (const p of Object.values(sim.estado.produtos)) { assert.ok(p.prateleira >= 0 && p.prateleira <= 12); assert.ok(p.horta >= 0 && p.horta <= 8); }
});

test('movimento respeita obstáculos e limites do mapa; pausa congela o mundo', () => {
  const sim = new Simulacao();
  aproximar(sim, { x: PRODUTOS.tomate.prateleira.x, z: PRODUTOS.tomate.prateleira.z + 2.3 });
  for (let i=0;i<120;i++) sim.mover(sim.estado.jogador,0,-1,1/60,4);
  assert.ok(sim.estado.jogador.z >= PRODUTOS.tomate.prateleira.z + 1.1);
  aproximar(sim, { x: -10, z: 8 });
  for (let i=0;i<100;i++) sim.mover(sim.estado.jogador,-1,0,1/60,4);
  assert.ok(sim.estado.jogador.x >= CONFIG.limiteMundo.minX);
  sim.pausado = true;
  const anterior = JSON.stringify(sim.estado);
  avancar(sim, 10, { x: 1, y: 1 });
  assert.equal(JSON.stringify(sim.estado), anterior);
});

test('salvamento incompleto ou adulterado não gera dinheiro negativo nem estoques inválidos', () => {
  assert.equal(validarEstado(null).dinheiro, 0);
  const estado = validarEstado({ versao: 1, dinheiro: -10, melhorias: { mochila: 99, milho: 1 }, produtos: { tomate: { horta: 999, prateleira: -2 }, milho: { horta: 7, prateleira: 4 } }, jogador: { inventario: ['tomate','milho','desconhecido'] }, estatisticas: { clientes: NaN } });
  assert.equal(estado.dinheiro, 0); assert.equal(estado.melhorias.mochila, 3);
  assert.equal(estado.produtos.tomate.horta, 8); assert.equal(estado.produtos.tomate.prateleira, 0);
  assert.deepEqual(estado.jogador.inventario, ['tomate','milho']);
  assert.equal(estado.estatisticas.clientes, 0);
});
