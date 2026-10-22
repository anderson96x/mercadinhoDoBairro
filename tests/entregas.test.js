import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS, MELHORIAS } from '../src/jogo/configuracao.js';
import { ROTAS_ENTREGA, ENTREGA, amostrarEntrega, volumeCaminhao, vagasDeposito, pacotesPendentes, posicaoPacote } from '../src/jogo/entregas.js';
import { criarCaminhaoEntrega, EntregasVisual } from '../src/jogo/entregas-visual.js';
import { OBSTACULOS_ESTACIONAMENTO, paredesDeposito, PLANTA_ESTACIONAMENTO, PLANTA_DEPOSITO, PLANTA_CARGA, PLANTA_EXPANSAO, obstaculosCarga } from '../src/jogo/planta.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function loja() {
  const sim = new Simulacao(); sim.estado.dinheiro = 100000; sim.proximoCliente = Infinity;
  sim.estado.estatisticas.clientes = 18 * CONFIG.clientesPorNivel;
  for (const id of ['alaProducao', 'alaLeite', 'alaTrigo', 'alaPadaria', 'expansao', 'estacionamento', 'prateleirasImportados']) assert.equal(sim.comprarMelhoria(id).sucesso, true, id);
  sim.assaltosAtivos = false;
  return sim;
}
function entregar(sim, ate = () => !sim.estado.deposito.pedidos.length && !sim.entregas.caminhao) {
  for (let i = 0; i < 18000 && !ate(); i++) sim.entregas.atualizar(sim, 0.05);
  assert.ok(ate(), JSON.stringify(sim.entregas.caminhao));
}

test('pedido combinado cobra uma vez, reserva caixas e rejeita excesso sem compra parcial', () => {
  const sim = loja(), saldo = sim.estado.dinheiro;
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 5 }).sucesso, false);
  assert.equal(sim.estado.dinheiro, saldo);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 4 }).sucesso, true);
  assert.equal(sim.estado.dinheiro, saldo - 4 * 270);
  assert.equal(sim.estado.deposito.pedidos.length, 1);
  assert.equal(pacotesPendentes(sim.estado.deposito), 4);
  assert.equal(vagasDeposito(sim.estado.deposito, 'enlatados'), 0);
  const antes = structuredClone(sim.estado);
  for (const quantidade of [1, 5, -1, 1.5, NaN, Infinity]) assert.equal(sim.encomendarImportacoes({ importarProdutos: quantidade }).sucesso, false);
  assert.equal(sim.encomendarImportacoes({ inexistente: 1 }).sucesso, false);
  assert.deepEqual(sim.estado, antes);
});

test('caminhão estaciona e entregador guarda exatamente as caixas pedidas; cada pedido tem sua viagem', () => {
  const sim = loja();
  sim.encomendarImportacoes({ importarProdutos: 3 });
  sim.encomendarImportacoes({ importarProdutos: 1 });
  entregar(sim);
  assert.equal(sim.estado.deposito.pacotes.length, 4);
  assert.equal(sim.estado.produtos.enlatado.horta, 36);
  assert.equal(sim.estado.produtos.enlatado.prateleira, 0);
  assert.equal(new Set(sim.estado.deposito.pacotes.map(p => p.slot)).size, 4);
  const eventos = sim.consumirEventos();
  assert.equal(eventos.filter(e => e.tipo === 'entregaChegou').length, 2);
  assert.equal(eventos.filter(e => e.tipo === 'entregaConcluida').length, 2);
});

test('quatro caixas ocupam somente a estante da classe e só liberam posição quando esvaziadas', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 4 });
  entregar(sim);
  assert.equal(sim.estado.produtos.enlatado.horta, 36);
  assert.equal(sim.estado.deposito.pacotes.length, 4);
  assert.deepEqual(sim.estado.deposito.pacotes.map(p => p.slot), [0, 1, 2, 3]);
  assert.equal(vagasDeposito(sim.estado.deposito, 'higiene'), 4, 'outra classe vazia não aumenta a capacidade de enlatados');
  assert.equal(vagasDeposito(sim.estado.deposito, 'enlatados'), 0);
  for (let i = 0; i < 8; i++) sim.retirarProdutoDeposito('enlatado');
  assert.equal(vagasDeposito(sim.estado.deposito, 'enlatados'), 0);
  sim.retirarProdutoDeposito('enlatado');
  assert.equal(vagasDeposito(sim.estado.deposito, 'enlatados'), 1);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, true);
  entregar(sim);
  assert.equal(sim.estado.deposito.pacotes.length, 4);
  assert.equal(new Set(sim.estado.deposito.pacotes.map(p => p.slot)).size, 4);
});

test('recarregar antes e durante descarga preserva o saldo e não duplica caixas entregues ou nas mãos', () => {
  for (const fase of ['aguardando', 'levar', 'guardar', 'voltar']) {
    const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 3 });
    if (fase !== 'aguardando') entregar(sim, () => sim.entregas.caminhao?.fase === fase);
    const saldo = sim.estado.dinheiro;
    const restaurado = new Simulacao(structuredClone(sim.estado));
    restaurado.proximoCliente = Infinity;
    entregar(restaurado);
    assert.equal(restaurado.estado.dinheiro, saldo);
    assert.equal(restaurado.estado.deposito.pacotes.length, 3);
    assert.equal(restaurado.estado.produtos.enlatado.horta, 27);
  }
});

test('pausa congela a entrega; loja fechada e tráfego adiam chegada, mas vagas ocupadas não bloqueiam o pátio', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 1 });
  sim.estado.lojaAberta = false; sim.entregas.atualizar(sim, 1);
  assert.equal(sim.entregas.caminhao, null);
  sim.estado.lojaAberta = true;
  sim.entregas.transitoLivre = false; sim.entregas.atualizar(sim, 0.05);
  assert.equal(sim.entregas.caminhao.fase, 'aguardando');
  sim.entregas.transitoLivre = true; sim.entregas.atualizar(sim, 0.05);
  sim.pausado = true;
  const antes = structuredClone(sim.entregas.caminhao);
  sim.atualizar(0.05); assert.deepEqual(sim.entregas.caminhao, antes);
  sim.entregas.atualizar(sim, 0); assert.deepEqual(sim.entregas.caminhao, antes);
  const ocupado = loja(); ocupado.encomendarImportacoes({ importarProdutos: 1 });
  ocupado.estacionamento.carros.push({ fase: 'estacionado', modelo: 0, x: -13.95, z: -3.7, angulo: 0 });
  ocupado.entregas.atualizar(ocupado, 0.05);
  assert.equal(ocupado.entregas.caminhao.fase, 'chegando');
  entregar(ocupado);
  assert.equal(ocupado.estado.deposito.pacotes.length, 1);
});

test('jogador e repositor retiram produtos do depósito e abastecem a gôndola por caminhos livres', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 2 }); entregar(sim);
  Object.assign(sim.estado.jogador, { x: PLANTA_DEPOSITO.estantes[1].x, z: -12.9 });
  sim.tempo = 9; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, [], 'estante de outra classe não fornece enlatados');
  Object.assign(sim.estado.jogador, sim.produtos.enlatado.coleta);
  sim.tempo = 10; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['enlatado']);
  assert.equal(sim.estado.produtos.enlatado.horta, 17);
  Object.assign(sim.estado.jogador, sim.produtos.enlatado.reposicao);
  sim.tempo += 1; sim.interagir();
  assert.equal(sim.estado.produtos.enlatado.prateleira, 1);
  assert.equal(sim.estado.produtos.enlatado.apresentado, true);
  sim.estado.melhorias.ajudante = 1;
  for (const [id, p] of Object.entries(sim.estado.produtos)) if (id !== 'enlatado') p.prateleira = sim.produtos[id].capacidadePrateleira;
  for (let i = 0; i < 20000 && sim.estado.produtos.enlatado.prateleira < 18; i++) { sim.tempo += 0.05; sim.atualizarAjudante(0.05); }
  assert.equal(sim.estado.produtos.enlatado.prateleira, 18, JSON.stringify(sim.ajudante));
  assert.equal(sim.estado.deposito.pacotes.length, 0);
});

test('caminhão surge à esquerda, para antes de engatar a ré e estaciona com a frente para a rua', () => {
  const rota = ROTAS_ENTREGA.chegando;
  const inicio = amostrarEntrega(rota, 0);
  assert.ok(inicio.x < PLANTA_EXPANSAO.terreno.x - PLANTA_EXPANSAO.terreno.w / 2 - ENTREGA.comprimento / 2);
  assert.ok(Math.abs(inicio.angulo) < 1e-8);
  assert.equal(inicio.re, false);
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 1 });
  entregar(sim, () => sim.entregas.caminhao?.tempo > 0 && sim.entregas.caminhao?.fase === 'chegando');
  const parado = structuredClone(sim.entregas.caminhao);
  sim.entregas.atualizar(sim, 0.2);
  assert.equal(sim.entregas.caminhao.distancia, parado.distancia);
  assert.equal(sim.entregas.caminhao.rodas, parado.rodas);
  entregar(sim, () => sim.entregas.caminhao?.re);
  const antes = structuredClone(sim.entregas.caminhao);
  sim.entregas.atualizar(sim, 0.05);
  const depois = sim.entregas.caminhao;
  assert.ok((depois.x - antes.x) * Math.cos(depois.angulo) - (depois.z - antes.z) * Math.sin(depois.angulo) < 0, 'ré desloca o caminhão para trás');
  assert.ok(depois.rodas > antes.rodas, 'rodas invertem o giro na ré');
  assert.ok(Math.abs(depois.distancia - antes.distancia - ENTREGA.velocidadeRe * 0.05) < 1e-8);
  entregar(sim, () => sim.entregas.caminhao?.fase === 'desembarcar');
  const estacionado = sim.entregas.caminhao;
  assert.equal(estacionado.x, PLANTA_CARGA.vaga.x);
  assert.equal(estacionado.z, PLANTA_CARGA.vaga.z);
  assert.ok(Math.abs(estacionado.angulo + Math.PI / 2) < 1e-8);
  const volume = volumeCaminhao(estacionado);
  assert.ok(volume.w <= PLANTA_CARGA.vaga.w && volume.d <= PLANTA_CARGA.vaga.d);
  const saida = amostrarEntrega(ROTAS_ENTREGA.partindo, 0);
  assert.equal(saida.re, false);
  assert.equal(saida.x, estacionado.x);
  assert.equal(saida.z, estacionado.z);
  assert.ok(Math.abs(saida.angulo - estacionado.angulo) < 1e-8);
});

test('rotas do caminhão não atravessam ilha, paredes, postes ou meio-fio', () => {
  const guiasCalcada = [[-28, PLANTA_CARGA.acesso.x - PLANTA_CARGA.acesso.w / 2], [PLANTA_CARGA.acesso.x + PLANTA_CARGA.acesso.w / 2, -16]]
    .filter(([inicio, fim]) => fim > inicio)
    .map(([inicio, fim]) => ({ x: (inicio + fim) / 2, z: 9.18, w: fim - inicio, d: 0.16 }));
  const obstaculos = [...OBSTACULOS_ESTACIONAMENTO, ...paredesDeposito(), ...obstaculosCarga(), ...guiasCalcada, { x: -3.1, z: -1.3, w: 0.28, d: 16 }, PLANTA_ESTACIONAMENTO.posteCalcada];
  for (const [fase, rota] of Object.entries(ROTAS_ENTREGA)) {
    for (let i = 1; i < rota.pontos.length; i++) {
      const p = rota.pontos[i];
      const { angulo } = amostrarEntrega(rota, p.distancia);
      // Contorno real girado, incluindo as quatro arestas do baú.
      const cantos = [-1, 1].flatMap(lx => [-1, 1].map(lz => ({
        x: p.x + lx * ENTREGA.comprimento / 2 * Math.cos(angulo) + lz * ENTREGA.largura / 2 * Math.sin(angulo),
        z: p.z - lx * ENTREGA.comprimento / 2 * Math.sin(angulo) + lz * ENTREGA.largura / 2 * Math.cos(angulo)
      })));
      for (const canto of cantos) {
        const rua = canto.z >= 9.25 && canto.z <= 13.5;
        const acesso = canto.z >= 6.4 && canto.z <= 9.3 && Math.abs(canto.x - PLANTA_CARGA.acesso.x) <= PLANTA_CARGA.acesso.w / 2;
        const patio = Math.abs(canto.z - PLANTA_CARGA.piso.z) <= PLANTA_CARGA.piso.d / 2 && Math.abs(canto.x - PLANTA_CARGA.piso.x) <= PLANTA_CARGA.piso.w / 2;
        assert.ok(rua || acesso || patio, `${fase} ${i}: fora do asfalto ${JSON.stringify(canto)}`);
        if (canto.z < 6.4) assert.ok(canto.x < PLANTA_ESTACIONAMENTO.piso.x - PLANTA_ESTACIONAMENTO.piso.w / 2, 'caminhão nunca invade as vagas de clientes');
      }
      for (const [a, b] of [[0, 1], [0, 2], [1, 3], [2, 3]]) assert.ok(segmentoLivre(cantos[a], cantos[b], obstaculos, 0), `${fase} ${i}: ${JSON.stringify(p)} obstáculo: ${JSON.stringify(obstaculos.find(o => !segmentoLivre(cantos[a], cantos[b], [o], 0)))}`);
    }
  }
});

test('modelo de caminhão tem seis rodas e portas de baú; entregador carrega uma caixa visível', () => {
  const caminhao = criarCaminhaoEntrega();
  assert.equal(caminhao.userData.rodas.length, 6);
  assert.equal(caminhao.userData.portas.length, 2);
  const visual = new EntregasVisual(new THREE.Scene());
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 1 });
  entregar(sim, () => sim.entregas.caminhao?.fase === 'levar');
  visual.atualizar(sim.entregas, 0.05);
  assert.equal(visual.entregador.visible, true);
  assert.equal(visual.caixa.visible, true);
  assert.equal(visual.caminhao.position.z, ENTREGA.estacionamento.z);
  const volume = volumeCaminhao(sim.entregas.caminhao);
  assert.ok(volume.z - volume.d / 2 > PLANTA_DEPOSITO.porta.z);
});

test('simulação completa descarrega sem reservar nem bloquear as vagas de clientes', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 2 });
  sim.estacionamento.prontoEm = 0;
  assert.equal(sim.estacionamento.reservar({ id: 999 }, sim.tempo), true);
  for (let i = 0; i < 12000 && (sim.estado.deposito.pedidos.length || sim.entregas.caminhao); i++) sim.atualizar(1 / 60);
  assert.equal(sim.estado.deposito.pacotes.length, 2);
  assert.equal(sim.entregas.caminhao, null);
  sim.atualizar(1 / 60);
  assert.equal(sim.estacionamento.reservar({ id: 999 }, sim.tempo), true);
});

test('acesso dedicado recebe entrega mesmo sem comprar estacionamento de clientes', () => {
  const sim = loja(); sim.estado.melhorias.estacionamento = 0;
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, true);
  entregar(sim);
  assert.equal(sim.estado.deposito.pacotes.length, 1);
});

test('saída aguarda manobra de clientes ou banco sem reservar a rua e impedir o serviço de terminar', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 1 });
  entregar(sim, () => sim.entregas.caminhao?.fase === 'partindo');
  sim.estado.banco.coleta = { tempo: -1 };
  sim.entregas.atualizar(sim, 0.05);
  assert.equal(sim.entregas.caminhao.distancia, 0);
  assert.equal(sim.entregas.reservaRua, false);
  sim.estado.banco.coleta = null;
  sim.estacionamento.carros.push({ fase: 'esperandoSaida' });
  sim.entregas.atualizar(sim, 0.05);
  assert.equal(sim.entregas.reservaRua, false);
  sim.estacionamento.carros = [];
  sim.entregas.atualizar(sim, 0.05);
  assert.equal(sim.entregas.reservaRua, true);
  entregar(sim);
});

test('save adulterado mantém no máximo quatro caixas na estante e limita o legado sem valores inválidos', () => {
  const sim = loja(); sim.estado.melhorias.importarProdutos = 1;
  sim.estado.produtos.enlatado.liberado = true;
  sim.estado.deposito = {
    pacotes: [null, { produto: 'tomate', unidades: 9 }, { produto: 'enlatado', unidades: -1 }, { produto: 'enlatado', unidades: Infinity },
      ...Array.from({ length: 30 }, () => ({ produto: 'enlatado', unidades: 9, slot: 0 }))],
    pedidos: [{ pacotes: Array(100).fill('enlatado') }]
  };
  const salvo = new Simulacao(structuredClone(sim.estado));
  assert.equal(salvo.estado.deposito.pacotes.length, 4);
  assert.ok(salvo.estado.deposito.pacotes.length + salvo.estado.deposito.excedentes.length + pacotesPendentes(salvo.estado.deposito) <= 27);
  assert.equal(new Set(salvo.estado.deposito.pacotes.map(p => p.slot)).size, salvo.estado.deposito.pacotes.length);
  assert.equal(salvo.estado.produtos.enlatado.horta, (salvo.estado.deposito.pacotes.length + salvo.estado.deposito.excedentes.length) * 9);
});

test('caixas guardadas e pedidos separados disputam as mesmas quatro vagas da classe', () => {
  const sim = loja();
  sim.encomendarImportacoes({ importarProdutos: 2 }); entregar(sim);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, true);
  const antes = structuredClone(sim.estado);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 2 }).sucesso, false);
  assert.deepEqual(sim.estado, antes);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, true);
  assert.equal(vagasDeposito(sim.estado.deposito, 'enlatados'), 0);
});

test('produtos da mesma classe compartilham vagas; outra classe entrega na própria estante', t => {
  // Produtos de teste exercitam a extensão do catálogo sem lançar conteúdo futuro.
  for (const [id, classe] of [['conservaTeste', 'enlatados'], ['saboneteTeste', 'higiene']]) {
    PRODUTOS[id] = { ...PRODUTOS.enlatado, classe };
    MELHORIAS.push({ ...MELHORIAS.find(m => m.id === 'importarProdutos'), id, produto: id });
    t.after(() => { delete PRODUTOS[id]; MELHORIAS.splice(MELHORIAS.findIndex(m => m.id === id), 1); });
  }
  const sim = loja();
  const antes = structuredClone(sim.estado);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 3, conservaTeste: 2, saboneteTeste: 1 }).sucesso, false);
  assert.deepEqual(sim.estado, antes, 'pedido misto inválido não cobra nem libera produtos');
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 2, conservaTeste: 2, saboneteTeste: 4 }).sucesso, true);
  assert.equal(vagasDeposito(sim.estado.deposito, 'enlatados'), 0);
  assert.equal(vagasDeposito(sim.estado.deposito, 'higiene'), 0);
  entregar(sim);
  const higiene = sim.estado.deposito.pacotes.filter(p => p.produto === 'saboneteTeste');
  assert.deepEqual(higiene.map(p => p.slot), [4, 5, 6, 7]);
  for (const pacote of higiene) {
    const ponto = posicaoPacote(pacote.slot), estante = PLANTA_DEPOSITO.estantes[1];
    assert.ok(Math.abs(ponto.x - estante.x) < estante.w / 2);
    assert.equal(ponto.z, estante.z);
  }
});

test('save antigo preserva caixas parciais, excedentes e pedidos pagos ao consumir e recarregar', () => {
  const original = loja();
  original.estado.produtos.enlatado.liberado = true;
  original.estado.melhorias.importarProdutos = 27;
  original.estado.deposito = {
    pacotes: Array.from({ length: 20 }, (_, slot) => ({ produto: 'enlatado', unidades: slot === 0 ? 3 : 9, slot })),
    pedidos: [{ id: 1, pacotes: Array(7).fill('enlatado') }], proximoId: 2
  };
  let sim = new Simulacao(structuredClone(original.estado));
  assert.equal(sim.estado.deposito.pacotes.length, 4);
  assert.equal(sim.estado.deposito.excedentes.length, 16);
  assert.equal(sim.estado.produtos.enlatado.horta, 174);
  assert.equal(pacotesPendentes(sim.estado.deposito), 7);
  const saldo = sim.estado.dinheiro;
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, false);
  let retiradas = 0;
  for (let i = 0; i < 30000; i++) {
    if (sim.retirarProdutoDeposito('enlatado')) retiradas++;
    sim.entregas.atualizar(sim, 0.05);
    if (i === 10) sim = new Simulacao(structuredClone(sim.estado));
    assert.ok(sim.estado.deposito.pacotes.length <= 4);
    assert.ok(sim.estado.deposito.pacotes.every(p => p.slot >= 0 && p.slot < 4));
    if (!sim.estado.produtos.enlatado.horta && !sim.estado.deposito.pedidos.length && !sim.entregas.caminhao) break;
  }
  assert.equal(retiradas, 237);
  assert.equal(sim.estado.dinheiro, saldo);
  assert.equal(sim.estado.deposito.pedidos.length, 0);
  assert.equal(sim.estado.deposito.excedentes.length, 0);
  assert.equal(vagasDeposito(sim.estado.deposito, 'enlatados'), 4);
});

test('pedido antigo aguarda vaga na classe sem ultrapassar quatro caixas nem perder a carga', () => {
  const original = loja();
  original.estado.produtos.enlatado.liberado = true;
  original.estado.melhorias.importarProdutos = 5;
  original.estado.deposito.pedidos = [{ id: 1, pacotes: Array(5).fill('enlatado') }];
  const sim = new Simulacao(structuredClone(original.estado));
  entregar(sim, () => sim.estado.deposito.pacotes.length === 4 && sim.entregas.caminhao?.fase === 'retirar');
  for (let i = 0; i < 100; i++) sim.entregas.atualizar(sim, 0.05);
  assert.equal(sim.estado.deposito.pacotes.length, 4);
  assert.equal(pacotesPendentes(sim.estado.deposito), 1);
  for (let i = 0; i < 9; i++) sim.retirarProdutoDeposito('enlatado');
  entregar(sim);
  assert.equal(sim.estado.deposito.pacotes.length, 4);
  assert.equal(sim.estado.produtos.enlatado.horta, 36);
});
