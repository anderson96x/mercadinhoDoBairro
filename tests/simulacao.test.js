import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulacao, validarEstado, distancia } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { MOBILIARIO_CALCADA } from '../src/jogo/bairro.js';

test('o nível aumenta a cada 100 pontos de satisfação', () => {
  const sim = new Simulacao();
  for (const [pontos, nivel] of [[0, 1], [99, 1], [100, 2], [199, 2], [200, 3]]) {
    sim.estado.estatisticas.satisfacao = pontos;
    assert.equal(sim.nivel, nivel);
    assert.equal(sim.missao().alvo, nivel * 100);
  }
});

test('clientes felizes, neutros e irritados rendem 10, 5 e 0 pontos', () => {
  const sim = new Simulacao();
  const clientes = [
    { compras: [{ produto: 'tomate', desejado: 2, quantidade: 2 }] },
    { compras: [{ produto: 'tomate', desejado: 2, quantidade: 1 }] },
    { compras: [{ produto: 'tomate', desejado: 2, quantidade: 0 }] }
  ];
  assert.deepEqual(clientes.map(cliente => sim.registrarSatisfacao(cliente)), ['feliz', 'neutro', 'irritado']);
  assert.equal(sim.estado.estatisticas.satisfacao, 15);
  assert.deepEqual(
    [sim.estado.estatisticas.clientesFelizes, sim.estado.estatisticas.clientesNeutros, sim.estado.estatisticas.clientesIrritados],
    [1, 1, 1]
  );
  sim.registrarSatisfacao(clientes[0]);
  assert.equal(sim.estado.estatisticas.satisfacao, 15, 'cada visita deve pontuar apenas uma vez');
  assert.deepEqual(sim.estado.satisfacoesRecentes, ['feliz', 'neutro', 'irritado']);
  assert.equal(sim.reputacao, 57);
});

test('reputação controla intervalo e tamanho máximo dos pedidos', () => {
  const cenarios = [
    { satisfacoes: Array(10).fill('irritado'), reputacao: 0, faixa: 'ruim', intervalo: 20, limite: 2 },
    { satisfacoes: Array(10).fill('neutro'), reputacao: 50, faixa: 'media', intervalo: 15, limite: 3 },
    { satisfacoes: [...Array(6).fill('feliz'), ...Array(3).fill('neutro'), 'irritado'], reputacao: 75, faixa: 'boa', intervalo: 5, limite: 5 }
  ];
  for (const cenario of cenarios) {
    const sim = new Simulacao();
    sim.estado.satisfacoesRecentes = cenario.satisfacoes;
    sim.aleatorio = () => 0.999;
    assert.equal(sim.reputacao, cenario.reputacao);
    assert.equal(sim.faixaReputacao, cenario.faixa);
    assert.equal(sim.intervaloClientes, cenario.intervalo);
    assert.equal(sim.limitePedidoCliente, cenario.limite);
    assert.equal(sim.criarCliente(), true);
    assert.equal(sim.clientes[0].compras.reduce((total, compra) => total + compra.desejado, 0), cenario.limite);
    Object.assign(sim.clientes[0], { x: 0, z: 0 });
    sim.proximoCliente = 0; sim.atualizarClientes(0);
    assert.equal(sim.proximoCliente, cenario.intervalo);
  }
});

test('reputação começa em 60 e usa somente as dez experiências mais recentes', () => {
  const sim = new Simulacao();
  assert.equal(sim.reputacao, 60);
  assert.equal(sim.faixaReputacao, 'media');
  sim.estado.satisfacoesRecentes = [...Array(10).fill('irritado'), ...Array(10).fill('feliz')];
  sim.estado = validarEstado(sim.estado);
  assert.deepEqual(sim.estado.satisfacoesRecentes, Array(10).fill('feliz'));
  assert.equal(sim.reputacao, 100);
  assert.equal(sim.faixaReputacao, 'boa');
});

test('salvamento antigo mantém o nível conquistado ao receber satisfação', () => {
  const antigo = new Simulacao().estado;
  antigo.estatisticas.clientes = 205;
  delete antigo.estatisticas.satisfacao;
  delete antigo.estatisticas.clientesFelizes;
  delete antigo.estatisticas.clientesNeutros;
  delete antigo.estatisticas.clientesIrritados;
  const sim = new Simulacao(antigo);
  assert.equal(sim.estado.estatisticas.satisfacao, 205);
  assert.equal(sim.nivel, 3);
});

test('jogador senta no escritorio e aciona o computador uma vez por visita', () => {
  const sim = new Simulacao();
  aproximar(sim, CONFIG.cadeiraEscritorio);
  sim.atualizar(0.05);
  assert.equal(sim.estado.jogador.sentado, true);
  assert.equal(sim.estado.jogador.sentadoEscritorio, true);
  assert.equal(sim.estado.jogador.sentadoCaixa, false);
  assert.equal(sim.estado.jogador.angulo, CONFIG.anguloEscritorio);
  assert.equal(sim.consumirEventos().filter(e => e.tipo === 'escritorio').length, 1);
  sim.atualizar(0.05);
  assert.equal(sim.consumirEventos().filter(e => e.tipo === 'escritorio').length, 0);
  sim.atualizar(0.05, { x: 1, y: 0 });
  assert.equal(sim.estado.jogador.sentadoEscritorio, false);
});

test('mercado fechado mantém clientes internos e manda os externos embora', () => {
  const sim = new Simulacao(); sim.estado.lojaAberta = false; sim.proximoCliente = Infinity;
  sim.estado.produtos.tomate.prateleira = 1;
  const externo = { id: 1, ...CONFIG.entrada, produto: 'tomate', quantidade: 0, desejado: 1, fase: 'chegando', etapa: 1, ladoEntrada: 0, ladoSaida: 1, pontoCompra: 0, andando: false };
  const interno = { id: 2, ...PRODUTOS.tomate.cliente, produto: 'tomate', quantidade: 0, desejado: 1, fase: 'comprando', etapa: 1, espera: 0, ladoEntrada: 1, ladoSaida: 0, pontoCompra: 0, andando: false };
  sim.clientes.push(externo, interno);
  sim.atualizarClientes(0.66);
  assert.equal(externo.fase, 'saindo');
  assert.equal(externo.ladoSaida, externo.ladoEntrada);
  assert.equal(externo.temCesta, false);
  assert.equal(interno.quantidade, 1);
  assert.equal(interno.fase, 'indoCaixa');
});

test('cliente criado com o mercado fechado dá meia-volta', () => {
  const sim = new Simulacao(); sim.estado.lojaAberta = false; sim.proximoCliente = 0;
  let virou = false;
  for (let i = 0; i < 600 && !virou; i++) {
    sim.atualizarClientes(1 / 60);
    virou = sim.clientes.some(c => c.fase === 'saindo' && c.ladoSaida === c.ladoEntrada);
  }
  assert.equal(virou, true);
});

function avancar(sim, segundos, entrada) {
  for (let i = 0; i < segundos * 60; i++) sim.atualizar(1 / 60, entrada);
}
function aproximar(sim, ponto) { Object.assign(sim.estado.jogador, ponto); }

test('cinco clientes formam fila espaçada e são atendidos na ordem sem se atravessar', () => {
  const sim = new Simulacao();
  aproximar(sim, { x: -9, z: 8 });
  const verificarEspaco = () => {
    for (let i = 0; i < sim.clientes.length; i++) for (let j = i + 1; j < sim.clientes.length; j++) {
      const emFila = c => c.fase === 'fila';
      if (!emFila(sim.clientes[i]) || !emFila(sim.clientes[j])) continue;
      assert.ok(distancia(sim.clientes[i], sim.clientes[j]) >= CONFIG.distanciaClientes - 1e-5, 'clientes não podem se sobrepor');
    }
  };
  for (let i = 0; i < 1800; i++) {
    sim.estado.produtos.tomate.prateleira = 12;
    sim.atualizar(0.05);
    for (const cliente of sim.clientes) if (cliente.fase === 'fila') cliente.esperaFila = -1e9;
    verificarEspaco();
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

test('clientes não passam pelo espaço reservado atrás do caixa', () => {
  const sim = new Simulacao();
  aproximar(sim, { x: -9, z: 8 });
  const area = CONFIG.areaFuncionarioCaixa;
  for (let i = 0; i < 1800; i++) {
    sim.estado.produtos.tomate.prateleira = 12;
    sim.atualizar(0.05);
    for (const cliente of sim.clientes) if (cliente.fase === 'fila') cliente.esperaFila = -1e9;
    for (const cliente of sim.clientes) {
      const dentroDaArea = Math.abs(cliente.x - area.x) < area.w / 2
        && Math.abs(cliente.z - area.z) < area.d / 2;
      assert.equal(dentroDaArea, false, 'clientes devem usar as laterais ou a frente do caixa');
    }
  }
  assert.equal(sim.clientes.filter(c => c.fase === 'fila').length, CONFIG.maxClientes);
});

test('cliente perde a paciência após dez segundos na fila e sai neutro', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  const cliente = {
    id: 1, ...CONFIG.clienteCaixa, produto: 'tomate', quantidade: 2, desejado: 2,
    compras: [{ produto: 'tomate', desejado: 2, quantidade: 2 }], itens: ['tomate', 'tomate'],
    fase: 'fila', esperaFila: 0, ordemFila: 1, andando: false, temCesta: true, cestaReservada: true
  };
  sim.clientes.push(cliente);
  sim.atualizarClientes(CONFIG.tempoEsperaFila - 0.1);
  assert.equal(cliente.fase, 'fila');
  sim.atualizarClientes(0.1);
  assert.equal(cliente.fase, 'saindo');
  assert.equal(cliente.satisfacao, 'neutro');
  assert.equal(sim.estado.estatisticas.satisfacao, 5);
  assert.equal(sim.estado.estatisticas.clientesNeutros, 1);
  assert.equal(sim.estado.produtos.tomate.prateleira, 2);
  assert.deepEqual(cliente.itens, []);
  assert.equal(cliente.cestaReservada, false);
});

test('paciência pausa enquanto o cliente está no processo de checkout', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity; sim.estado.melhorias.caixa = 1;
  const cliente = {
    id: 1, ...CONFIG.clienteCaixa, produto: 'tomate', quantidade: 1, desejado: 1,
    compras: [{ produto: 'tomate', desejado: 1, quantidade: 1 }], itens: ['tomate'],
    fase: 'fila', esperaFila: 9.9, ordemFila: 1, andando: false, temCesta: true, cestaReservada: true
  };
  sim.clientes.push(cliente);
  sim.atualizarClientes(1);
  assert.equal(cliente.fase, 'fila');
  assert.equal(cliente.esperaFila, 9.9);
  assert.equal(sim.clienteEmAtendimento, cliente);

  sim.estado.melhorias.caixa = 0;
  sim.atualizarClientes(0.1);
  assert.equal(cliente.fase, 'saindo');
  assert.equal(cliente.satisfacao, 'neutro');
});

test('clientes usam as duas pontas da calçada sem nascer sobrepostos', () => {
  const sim = new Simulacao();
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.criarCliente(), false);
  assert.equal(sim.clientes.length, 2);
  assert.deepEqual(new Set(sim.clientes.map(c => c.ladoEntrada)), new Set([0, 1]));
  for (const cliente of sim.clientes) assert.equal(distancia(cliente, CONFIG.extremosCalcada[cliente.ladoEntrada]), 0);
});

test('clientes na calçada podem atravessar uns aos outros sem desviar', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  const a = { id: 1, x: -2, z: 8.4, fase: 'chegando', etapa: 0, andando: false };
  const b = { id: 2, x: 2, z: 8.4, fase: 'saindo', etapa: 1, andando: false };
  sim.clientes.push(a, b);
  let distanciaMinima = Infinity;
  for (let i = 0; i < 50; i++) {
    sim.caminharCliente(a, { x: 2, z: 8.4 }, 0.05);
    sim.caminharCliente(b, { x: -2, z: 8.4 }, 0.05);
    distanciaMinima = Math.min(distanciaMinima, distancia(a, b));
  }
  assert.ok(distanciaMinima < 0.2);
  assert.ok(a.x > 1.9 && b.x < -1.9);
});

test('clientes desviam dos objetos da calçada', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  const cliente = { id: 1, ...CONFIG.extremosCalcada[0], fase: 'chegando', etapa: 0, andando: false };
  sim.clientes.push(cliente);
  let desviou = false;

  for (let i = 0; i < 600 && distancia(cliente, CONFIG.entrada) > 0.025; i++) {
    sim.caminharCliente(cliente, CONFIG.entrada, 1 / 60);
    desviou ||= Math.abs(cliente.z - CONFIG.extremosCalcada[0].z) > 0.1;
    for (const objeto of MOBILIARIO_CALCADA) {
      const dentro = Math.abs(cliente.x - objeto.x) < objeto.w / 2 + 0.27
        && Math.abs(cliente.z - objeto.z) < objeto.d / 2 + 0.27;
      assert.equal(dentro, false, 'cliente não pode atravessar mobiliário da calçada');
    }
  }

  assert.equal(distancia(cliente, CONFIG.entrada) < 0.025, true);
  assert.equal(desviou, true);
});

test('clientes pegam produtos ao mesmo tempo e fazem fila apenas no caixa', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  const produto = PRODUTOS.tomate;
  sim.estado.produtos.tomate.prateleira = CONFIG.maxClientes;
  sim.clientes = produto.pontosCompra.map((ponto, indice) => ({
    id: indice + 1,
    ...ponto,
    produto: 'tomate',
    pontoCompra: indice,
    quantidade: 0,
    desejado: 2,
    fase: 'chegando',
    etapa: 1,
    espera: 0,
    andando: false
  }));

  sim.atualizarClientes(0);
  assert.equal(sim.clientes.filter(c => c.fase === 'comprando').length, CONFIG.maxClientes);

  sim.atualizarClientes(0.66);
  assert.deepEqual(sim.clientes.map(c => c.quantidade), Array(CONFIG.maxClientes).fill(1));
  assert.equal(sim.estado.produtos.tomate.prateleira, 0);
  assert.equal(sim.clientes.some(c => c.fase === 'fila' || c.fase === 'indoCaixa'), false);
});

test('jogador senta na cadeira, atende e levanta ao andar sem perder produtos', () => {
  const sim = new Simulacao();
  aproximar(sim, CONFIG.cadeiraCaixa);
  sim.estado.jogador.inventario = ['tomate'];
  sim.clientes.push({ id: 1, ...CONFIG.clienteCaixa, fase: 'fila', quantidade: 2, produto: 'tomate' });
  sim.atualizar(0.05);
  assert.equal(sim.estado.jogador.sentado, true);
  assert.equal(sim.estado.jogador.angulo, CONFIG.anguloCaixa);
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

test('jogador só atende o caixa sentado na cadeira', () => {
  const sim = new Simulacao();
  sim.clientes.push({ ...CONFIG.clienteCaixa, fase: 'fila', quantidade: 2, produto: 'tomate' });

  aproximar(sim, { x: CONFIG.balcao.x, z: CONFIG.balcao.z + 1.2 });
  sim.atualizarCaixa(CONFIG.tempoCaixa);
  assert.equal(sim.estado.dinheiro, 0);

  aproximar(sim, CONFIG.cadeiraCaixa);
  sim.atualizar(0.05);
  assert.equal(sim.estado.jogador.sentado, true);
  sim.atualizarCaixa(CONFIG.tempoCaixa);
  assert.equal(sim.estado.dinheiro, 16);
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
