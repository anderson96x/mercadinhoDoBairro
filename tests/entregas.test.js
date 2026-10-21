import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG } from '../src/jogo/configuracao.js';
import { ROTAS_ENTREGA, ENTREGA, volumeCaminhao, vagasDeposito, pacotesPendentes } from '../src/jogo/entregas.js';
import { criarCaminhaoEntrega, EntregasVisual } from '../src/jogo/entregas-visual.js';
import { OBSTACULOS_ESTACIONAMENTO, paredesDeposito, PLANTA_ESTACIONAMENTO, PLANTA_DEPOSITO } from '../src/jogo/planta.js';
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
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 27 }).sucesso, true);
  assert.equal(sim.estado.dinheiro, saldo - 27 * 270);
  assert.equal(sim.estado.deposito.pedidos.length, 1);
  assert.equal(pacotesPendentes(sim.estado.deposito), 27);
  assert.equal(vagasDeposito(sim.estado.deposito), 0);
  const antes = structuredClone(sim.estado);
  for (const quantidade of [1, 28, -1, 1.5, NaN, Infinity]) assert.equal(sim.encomendarImportacoes({ importarProdutos: quantidade }).sucesso, false);
  assert.equal(sim.encomendarImportacoes({ inexistente: 1 }).sucesso, false);
  assert.deepEqual(sim.estado, antes);
});

test('caminhão estaciona e entregador guarda exatamente as caixas pedidas; cada pedido tem sua viagem', () => {
  const sim = loja();
  sim.encomendarImportacoes({ importarProdutos: 3 });
  sim.encomendarImportacoes({ importarProdutos: 2 });
  entregar(sim);
  assert.equal(sim.estado.deposito.pacotes.length, 5);
  assert.equal(sim.estado.produtos.enlatado.horta, 45);
  assert.equal(sim.estado.produtos.enlatado.prateleira, 0);
  assert.equal(new Set(sim.estado.deposito.pacotes.map(p => p.slot)).size, 5);
  const eventos = sim.consumirEventos();
  assert.equal(eventos.filter(e => e.tipo === 'entregaChegou').length, 2);
  assert.equal(eventos.filter(e => e.tipo === 'entregaConcluida').length, 2);
});

test('27 caixas ocupam as três estantes e só liberam posição quando esvaziadas', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 27 });
  entregar(sim);
  assert.equal(sim.estado.produtos.enlatado.horta, 243);
  assert.equal(sim.estado.deposito.pacotes.length, 27);
  assert.equal(vagasDeposito(sim.estado.deposito), 0);
  for (let i = 0; i < 8; i++) sim.retirarProdutoDeposito('enlatado');
  assert.equal(vagasDeposito(sim.estado.deposito), 0);
  sim.retirarProdutoDeposito('enlatado');
  assert.equal(vagasDeposito(sim.estado.deposito), 1);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, true);
  entregar(sim);
  assert.equal(sim.estado.deposito.pacotes.length, 27);
  assert.equal(new Set(sim.estado.deposito.pacotes.map(p => p.slot)).size, 27);
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

test('pausa congela a entrega; loja fechada, tráfego e vagas ocupadas adiam chegada', () => {
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
  ocupado.estacionamento.carros.push({ fase: 'estacionado' });
  ocupado.entregas.atualizar(ocupado, 0.05);
  assert.equal(ocupado.entregas.caminhao, null);
});

test('jogador e repositor retiram produtos do depósito e abastecem a gôndola por caminhos livres', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 2 }); entregar(sim);
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

test('rotas do caminhão não atravessam ilha, paredes, postes ou meio-fio', () => {
  const obstaculos = [...OBSTACULOS_ESTACIONAMENTO, ...paredesDeposito(), { x: -3.1, z: -1.3, w: 0.28, d: 16 }, PLANTA_ESTACIONAMENTO.posteCalcada];
  for (const [fase, rota] of Object.entries(ROTAS_ENTREGA)) {
    for (let i = 1; i < rota.pontos.length; i++) {
      const a = rota.pontos[i - 1], p = rota.pontos[i];
      const angulo = Math.atan2(-(p.z - a.z), p.x - a.x);
      // Contorno real girado, incluindo as quatro arestas do baú.
      const cantos = [-1, 1].flatMap(lx => [-1, 1].map(lz => ({
        x: p.x + lx * ENTREGA.comprimento / 2 * Math.cos(angulo) + lz * ENTREGA.largura / 2 * Math.sin(angulo),
        z: p.z - lx * ENTREGA.comprimento / 2 * Math.sin(angulo) + lz * ENTREGA.largura / 2 * Math.cos(angulo)
      })));
      for (const canto of cantos) {
        const rua = canto.z >= 9.25;
        const acesso = canto.z >= 6.4 && canto.z <= 9.3 && canto.x >= -13.1 && canto.x <= -6.7;
        const estacionamento = canto.z >= -9.16 && canto.z <= 6.4 && canto.x >= -15.8 && canto.x <= -3.24;
        assert.ok(rua || acesso || estacionamento, `${fase} ${i}: fora do asfalto ${JSON.stringify(canto)}`);
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

test('simulação completa descarrega e libera estacionamento; clientes novos não reservam vagas durante entrega', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 2 });
  assert.equal(sim.estacionamento.reservar({ id: 999 }, sim.tempo), false);
  for (let i = 0; i < 8000 && (sim.estado.deposito.pedidos.length || sim.entregas.caminhao); i++) sim.atualizar(1 / 60);
  assert.equal(sim.estado.deposito.pacotes.length, 2);
  assert.equal(sim.entregas.caminhao, null);
  sim.atualizar(1 / 60);
  assert.equal(sim.estacionamento.bloqueadoEntrega, false);
  assert.equal(sim.estacionamento.reservar({ id: 999 }, sim.tempo), true);
});

test('save adulterado não cria mais de 27 posições nem caixas negativas, inválidas ou infinitas', () => {
  const sim = loja(); sim.estado.melhorias.importarProdutos = 1;
  sim.estado.produtos.enlatado.liberado = true;
  sim.estado.deposito = {
    pacotes: [null, { produto: 'tomate', unidades: 9 }, { produto: 'enlatado', unidades: -1 }, { produto: 'enlatado', unidades: Infinity },
      ...Array.from({ length: 30 }, () => ({ produto: 'enlatado', unidades: 9, slot: 0 }))],
    pedidos: [{ pacotes: Array(100).fill('enlatado') }]
  };
  const salvo = new Simulacao(structuredClone(sim.estado));
  assert.ok(salvo.estado.deposito.pacotes.length + pacotesPendentes(salvo.estado.deposito) <= 27);
  assert.equal(new Set(salvo.estado.deposito.pacotes.map(p => p.slot)).size, salvo.estado.deposito.pacotes.length);
  assert.equal(salvo.estado.produtos.enlatado.horta, salvo.estado.deposito.pacotes.length * 9);
});
