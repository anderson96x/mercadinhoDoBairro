import { prepararLojaCompleta } from './helpers/loja-completa.js';
import { reativarImportadosParaTeste } from './helpers/importados-suspensos.js';
reativarImportadosParaTeste();

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS, MELHORIAS } from '../src/jogo/configuracao.js';
import { ROTAS_ENTREGA, ENTREGA, TEMPO_ESPERA_ENTREGA, LIMITES_ROTA_ENTREGA, amostrarEntrega, volumeCaminhao, obstaculoCaminhao, vagasDeposito, pacotesPendentes, posicaoPacote } from '../src/jogo/entregas.js';
import { criarCaminhaoEntrega, EntregasVisual, COR_ENTREGA_GERAL, ANGULO_PORTAS_BAU, ANGULO_PORTA_CABINE } from '../src/jogo/entregas-visual.js';
import { Cena, criarEntregador } from '../src/jogo/cena.js';
import { Trafego } from '../src/jogo/trafego.js';
import { OBSTACULOS_ESTACIONAMENTO, paredesDeposito, PLANTA_ESTACIONAMENTO, PLANTA_DEPOSITO, PLANTA_CARGA, PLANTA_EXPANSAO, obstaculosCarga } from '../src/jogo/planta.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function loja() {
  const sim = new Simulacao(); sim.estado.dinheiro = 100000; sim.proximoCliente = Infinity;
  sim.estado.estatisticas.clientes = 19 * CONFIG.clientesPorNivel;
  prepararLojaCompleta(sim);
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
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 3 }).sucesso, true);
  assert.match(sim.encomendarImportacoes({ importarProdutos: 1 }).motivo, /Aguarde o caminhão/);
  entregar(sim);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, true);
  entregar(sim);
  assert.equal(sim.estado.deposito.pacotes.length, 4);
  assert.equal(sim.estado.produtos.enlatado.horta, 36);
  assert.equal(sim.estado.produtos.enlatado.prateleira, 0);
  assert.equal(new Set(sim.estado.deposito.pacotes.map(p => p.slot)).size, 4);
  const eventos = sim.consumirEventos();
  assert.equal(eventos.filter(e => e.tipo === 'entregaChegou').length, 2);
  assert.equal(eventos.filter(e => e.tipo === 'entregaConcluida').length, 2);
});

test('novo pedido fica bloqueado até o caminhão concluir a entrega e sair do mapa', () => {
  const sim = loja();
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, true);
  assert.match(sim.disponibilidadeMelhoria('importarProdutos').motivo, /ir embora/);
  entregar(sim, () => sim.entregas.caminhao?.fase === 'partindo');
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, false);
  entregar(sim);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, true);
});

test('quatro caixas ocupam somente a estante da classe e só liberam posição quando esvaziadas', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 4 });
  entregar(sim);
  assert.equal(sim.estado.produtos.enlatado.horta, 36);
  assert.equal(sim.estado.deposito.pacotes.length, 4);
  assert.deepEqual(sim.estado.deposito.pacotes.map(p => p.slot), [0, 1, 2, 3]);
  assert.equal(vagasDeposito(sim.estado.deposito, 'doces'), 4, 'outra classe vazia não aumenta a capacidade de enlatados');
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
  sim.entregas.transitoLivre = true; sim.entregas.atualizar(sim, TEMPO_ESPERA_ENTREGA - 0.1);
  assert.equal(sim.entregas.caminhao.fase, 'aguardando', 'leva um minuto para chegar');
  sim.entregas.atualizar(sim, 0.1);
  assert.equal(sim.entregas.caminhao.fase, 'chegando');
  sim.pausado = true;
  const antes = structuredClone(sim.entregas.caminhao);
  sim.atualizar(0.05); assert.deepEqual(sim.entregas.caminhao, antes);
  sim.entregas.atualizar(sim, 0); assert.deepEqual(sim.entregas.caminhao, antes);
  const ocupado = loja(); ocupado.encomendarImportacoes({ importarProdutos: 1 });
  ocupado.estacionamento.carros.push({ fase: 'estacionado', modelo: 0, x: -13.95, z: -3.7, angulo: 0 });
  ocupado.entregas.atualizar(ocupado, TEMPO_ESPERA_ENTREGA);
  assert.equal(ocupado.entregas.caminhao.fase, 'chegando');
  entregar(ocupado);
  assert.equal(ocupado.estado.deposito.pacotes.length, 1);
});

test('ferramenta DEV permite desativar e reativar o temporizador das entregas', () => {
  const imediata = loja(); imediata.encomendarImportacoes({ importarProdutos: 1 });
  assert.equal(imediata.definirTemporizadorEntregaAtivo(false), false);
  imediata.entregas.atualizar(imediata, 0.05);
  assert.equal(imediata.entregas.caminhao.fase, 'chegando');

  const normal = loja(); normal.encomendarImportacoes({ importarProdutos: 1 });
  assert.equal(normal.definirTemporizadorEntregaAtivo(true), true);
  normal.entregas.atualizar(normal, 0.05);
  assert.equal(normal.entregas.caminhao.fase, 'aguardando');
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

test('caminhão surge e desaparece inteiro dentro da rua, para antes de engatar a ré e estaciona com a frente para a rua', () => {
  const rota = ROTAS_ENTREGA.chegando;
  const inicio = amostrarEntrega(rota, 0);
  assert.equal(inicio.x, LIMITES_ROTA_ENTREGA.minX);
  assert.ok(inicio.x - ENTREGA.comprimento / 2 > PLANTA_EXPANSAO.terreno.x - PLANTA_EXPANSAO.terreno.w / 2);
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
  const fim = amostrarEntrega(ROTAS_ENTREGA.partindo, ROTAS_ENTREGA.partindo.comprimento);
  assert.equal(fim.x, LIMITES_ROTA_ENTREGA.maxX);
  assert.ok(fim.x + ENTREGA.comprimento / 2 < 23);
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
  assert.ok(caminhao.userData.portaCabine);
  assert.equal(caminhao.userData.piscas.length, 4);
  assert.ok(caminhao.getObjectByName('interior-cabine-entrega'));
  assert.equal(caminhao.getObjectByName('logo-enlatados-caminhao'), undefined);
  assert.equal(caminhao.getObjectByName('logo-cereais-caminhao'), undefined);
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

test('entregador abre e fecha a porta da cabine ao desembarcar e embarcar', () => {
  const visual = new EntregasVisual(new THREE.Scene());
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 1 });
  entregar(sim, () => sim.entregas.caminhao?.fase === 'desembarcar' && sim.entregas.caminhao.tempo > 0.4);
  visual.atualizar(sim.entregas, 0.05);
  assert.ok(Math.abs(visual.caminhao.userData.portaCabine.rotation.y) > 0);
  assert.equal(visual.entregador.visible, false, 'motorista permanece dentro enquanto a porta abre');
  visual.caminhao.updateMatrixWorld(true);
  const porta = visual.caminhao.userData.portaCabine;
  const dobradica = porta.getWorldPosition(new THREE.Vector3());
  const ponta = porta.localToWorld(new THREE.Vector3(-1.02, 0, 0));
  assert.ok(dobradica.x > sim.entregas.caminhao.x, 'porta fica do lado da rota do entregador');
  assert.ok(ponta.x > dobradica.x, 'porta abre para fora da cabine');
  entregar(sim, () => sim.entregas.caminhao?.fase === 'desembarcar' && sim.entregas.caminhao.tempo > 0.8);
  visual.atualizar(sim.entregas, 0.05);
  assert.equal(visual.caminhao.userData.portaCabine.rotation.y, -ANGULO_PORTA_CABINE,
    'porta termina de abrir antes de o motorista sair');
  assert.equal(visual.entregador.visible, true);
  assert.equal(sim.entregas.caminhao.entregador.andando, true, 'motorista atravessa a porta aberta');
  assert.ok(Math.abs(visual.caminhao.userData.portaCabine.rotation.y) < ANGULO_PORTA_CABINE + 0.001);
  entregar(sim, () => sim.entregas.caminhao?.fase === 'embarcar' && sim.entregas.caminhao.etapa >= 2 && sim.entregas.caminhao.tempo > 0.3);
  visual.atualizar(sim.entregas, 0.05);
  assert.ok(Math.abs(visual.caminhao.userData.portaCabine.rotation.y) > 0);
  entregar(sim, () => sim.entregas.caminhao?.fase === 'partindo');
  visual.atualizar(sim.entregas, 0.05);
  assert.equal(Math.abs(visual.caminhao.userData.portaCabine.rotation.y), 0);
});

test('portas traseiras abrem antes da descarga e fecham antes de o caminhão sair', () => {
  const visual = new EntregasVisual(new THREE.Scene());
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 1 });
  entregar(sim, () => sim.entregas.caminhao?.fase === 'chegando' && sim.entregas.caminhao.distancia > 0);
  visual.atualizar(sim.entregas, 0.05);
  assert.ok(visual.caminhao.userData.portas.every(porta => porta.rotation.y === 0));
  entregar(sim, () => sim.entregas.caminhao?.fase === 'abrirBau');
  assert.ok(sim.entregas.caminhao.entregador, 'entregador chega à traseira antes de abrir');
  visual.atualizar(sim.entregas, 0.05);
  assert.ok(visual.caminhao.userData.portas.every(porta => Math.abs(porta.rotation.y) > 0 && Math.abs(porta.rotation.y) < ANGULO_PORTAS_BAU));
  entregar(sim, () => sim.entregas.caminhao?.fase === 'retirar');
  visual.atualizar(sim.entregas, 0.05);
  assert.ok(visual.caminhao.userData.portas.every(porta => Math.abs(porta.rotation.y) === ANGULO_PORTAS_BAU));
  entregar(sim, () => sim.entregas.caminhao?.fase === 'fecharBau');
  assert.ok(sim.entregas.caminhao.entregador, 'entregador permanece na traseira para fechar');
  const distancia = sim.entregas.caminhao.distancia;
  sim.entregas.atualizar(sim, 0.25); visual.atualizar(sim.entregas, 0.25);
  assert.equal(sim.entregas.caminhao.distancia, distancia, 'caminhão espera as portas fecharem');
  assert.ok(visual.caminhao.userData.portas.every(porta => Math.abs(porta.rotation.y) < ANGULO_PORTAS_BAU));
  entregar(sim, () => sim.entregas.caminhao?.fase === 'embarcar');
  assert.ok(sim.entregas.caminhao.entregador, 'entregador só retorna à cabine após fechar');
  entregar(sim, () => sim.entregas.caminhao?.fase === 'partindo');
  visual.atualizar(sim.entregas, 0.05);
  assert.ok(visual.caminhao.userData.portas.every(porta => porta.rotation.y === 0));
  entregar(sim);
  assert.equal(sim.entregas.caminhao, null);
});

test('entregador usa o modelo de NPC fornecido com uniforme próprio', () => {
  let criado = 0;
  const npc = criarEntregador();
  const visual = new EntregasVisual(new THREE.Scene(), () => { criado++; return npc; });
  assert.equal(criado, 1);
  assert.equal(visual.entregador, npc);
  assert.equal(visual.entregador.userData.funcao, 'entrega');
  assert.equal(npc.userData.aparencia.genero, 'homem');
  assert.equal(npc.userData.aparencia.porte, 'regular');
  assert.equal(npc.userData.aparencia.idoso, false);
  assert.equal(npc.userData.corpulento, false);
  assert.equal(npc.userData.barriga, null);
});

test('entregador sai da cabine com os braços livres durante a chegada', () => {
  const modelo = criarEntregador();
  const contexto = { sim: null, animarPersonagem: Cena.prototype.animarPersonagem };
  Cena.prototype.animarEntregador.call(contexto, modelo,
    { x: 0, z: 0, angulo: 0, andando: true, carregando: false },
    { fase: 'desembarcar', tempo: 0.9, aberturaCabine: 1 }, 0.05, 1);
  assert.ok(modelo.userData.bracoE.userData.mao.position.y < 0.6);
  assert.ok(modelo.userData.bracoD.userData.mao.position.y < 0.6);
});

test('caminhão e entregador mantêm identidade geral dourada sem logos', () => {
  const sim = loja(); sim.estado.estatisticas.clientes = 19 * CONFIG.clientesPorNivel;
  assert.equal(sim.comprarMelhoria('prateleirasImportados').sucesso, true);
  sim.encomendarImportacoes({ importarCereais: 1, importarProdutos: 1 });
  sim.entregas.atualizar(sim, 0.05);
  assert.equal(sim.entregas.caminhao.classe, 'cereais');
  const visual = new EntregasVisual(new THREE.Scene(), criarEntregador);
  visual.atualizar(sim.entregas, 0.05);
  for (const classe of ['cereais', 'enlatados', 'cereais']) {
    sim.entregas.caminhao.classe = classe;
    visual.atualizar(sim.entregas, 0.05);
    for (const nome of ['lateral-bau', 'frente-bau', 'teto-bau']) assert.equal(visual.caminhao.getObjectByName(nome).material.color.getHex(), COR_ENTREGA_GERAL);
    for (const malha of [...visual.entregador.userData.uniforme.camisa, ...visual.entregador.userData.uniforme.chapeu]) assert.equal(malha.material.color.getHex(), COR_ENTREGA_GERAL);
  }
  entregar(sim, () => sim.entregas.caminhao?.fase === 'partindo');
  assert.equal(sim.entregas.caminhao.classe, 'cereais');
  visual.atualizar(sim.entregas, 0.05);
  assert.equal(visual.caminhao.getObjectByName('logo-cereais-caminhao'), undefined);
});

test('portas deixam uma abertura real no baú e giram para fora durante a descarga', () => {
  const visual = new EntregasVisual(new THREE.Scene());
  const caminhao = visual.caminhao;
  const raio = new THREE.Raycaster(new THREE.Vector3(-3.4, 1.8, 0.2), new THREE.Vector3(1, 0, 0), 0, 1.4);
  const c = { fase: 'abrirBau', x: 0, z: 0, angulo: 0, rodas: 0, aberturaBau: 0, entregador: null };
  visual.atualizar({ caminhao: c }, 0.05); caminhao.updateMatrixWorld(true);
  assert.ok(raio.intersectObject(caminhao, true).length > 0, 'portas fechadas cobrem a traseira');
  c.aberturaBau = 0.5;
  visual.atualizar({ caminhao: c }, 0.05); caminhao.updateMatrixWorld(true);
  for (const porta of caminhao.userData.portas) {
    const centro = new THREE.Vector3(0, 1, -Math.sign(porta.position.z) * 0.395);
    porta.localToWorld(centro);
    assert.ok(centro.x < -2.41, 'folhas giram para trás, fora do volume do baú');
  }
  c.aberturaBau = 1;
  visual.atualizar({ caminhao: c }, 0.05); caminhao.updateMatrixWorld(true);
  assert.equal(raio.intersectObject(caminhao, true).length, 0, 'nenhum bloco ou folha permanece na abertura');
  const abertura = caminhao.userData.portas.map(p => p.rotation.y);
  visual.atualizar({ caminhao: c }, 0);
  assert.deepEqual(caminhao.userData.portas.map(p => p.rotation.y), abertura);
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

test('caminhão termina a entrega com tráfego contínuo nas duas faixas e libera a rua', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 1 });
  entregar(sim, () => sim.entregas.caminhao?.fase === 'partindo');
  const cena = { sim, trafego: new Trafego(new THREE.Scene(), () => 0.5) };
  cena.trafego.atualizarExpansao(true);
  for (const faixa of [0, 1]) cena.trafego.criarNaFaixa(faixa);
  Cena.prototype.atualizarTrafego.call(cena, 0.05);
  assert.equal(sim.entregas.transitoLivre, false);
  for (let i = 0; i < 6000 && sim.entregas.caminhao; i++) {
    sim.entregas.atualizar(sim, 0.05);
    Cena.prototype.atualizarTrafego.call(cena, 0.05);
  }
  assert.equal(sim.entregas.caminhao, null);
  assert.equal(sim.entregas.reservaRua, false);
  assert.equal(cena.trafego.faixasReservadas.size, 0);
  assert.equal(sim.estado.deposito.pacotes.length, 1);
});

test('saída do caminhão permite concluir a travessia e recebe novos pedestres', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 1 });
  entregar(sim, () => sim.entregas.caminhao?.fase === 'partindo');
  sim.entregas.atualizar(sim, 0.05);
  assert.equal(sim.entregas.reservaRua, true);

  const faixa = PLANTA_CARGA.travessia;
  const inicio = faixa.x - faixa.w / 2 - 0.5;
  const destino = sim.extremosCalcada[1];
  const cruzando = { id: 901, x: faixa.x, z: CONFIG.entrada.z, fase: 'saindo', andando: false };
  const aguardando = { id: 902, x: inicio - 0.4, z: CONFIG.entrada.z, fase: 'saindo', andando: false };
  sim.clientes = [cruzando, aguardando];
  for (let i = 0; i < 1200 && sim.entregas.caminhao; i++) {
    sim.tempo += 0.05;
    sim.caminharCalcada(cruzando, destino, 0.05);
    sim.caminharCalcada(aguardando, destino, 0.05);
    sim.entregas.atualizar(sim, 0.05);
  }
  assert.equal(sim.entregas.caminhao, null, 'o pedestre na faixa não prende o caminhão');
  assert.ok(cruzando.x > faixa.x + faixa.w / 2, 'quem já cruzava termina de sair da faixa');
  for (let i = 0; i < 60; i++) sim.caminharCalcada(aguardando, destino, 0.05);
  assert.ok(aguardando.x > inicio, 'a travessia volta a fluir depois da saída');
});

test('caminhão sai com clientes esperando nas duas bordas da travessia', () => {
  const sim = loja(); sim.encomendarImportacoes({ importarProdutos: 1 });
  entregar(sim, () => sim.entregas.caminhao?.fase === 'partindo');
  // Posição em que a caixa alinhada aos eixos prendia o caminhão na curva.
  Object.assign(sim.entregas.caminhao, amostrarEntrega(ROTAS_ENTREGA.partindo, 12.826666666666608),
    { distancia: 12.826666666666608, reservaPartida: true, partidaLiberada: true });
  const faixa = PLANTA_CARGA.travessia;
  const esquerda = { id: 991, x: faixa.x - faixa.w / 2 - 0.5, z: CONFIG.entrada.z, fase: 'passando', ladoSaida: 1 };
  const direita = { id: 992, x: faixa.x + faixa.w / 2 + 0.5, z: CONFIG.entrada.z, fase: 'passando', ladoSaida: 0 };
  sim.clientes = [esquerda, direita];
  const cena = { sim, trafego: new Trafego(new THREE.Scene(), () => 0.5) };
  const cruzou = cliente => cliente.ladoSaida ? cliente.x > faixa.x + 3 : cliente.x < faixa.x - 3;
  for (let i = 0; i < 2400; i++) {
    if (i < 600 && i % 60 === 0) for (const lado of [0, 1]) {
      sim.clientes.push({ id: 1000 + i + lado, x: faixa.x + (lado ? 5 : -5), z: CONFIG.entrada.z, fase: 'passando', ladoSaida: 1 - lado });
    }
    sim.tempo += 1 / 60;
    Cena.prototype.atualizarTrafego.call(cena, 1 / 60);
    sim.entregas.atualizar(sim, 1 / 60);
    for (const cliente of sim.clientes) {
      sim.caminharCalcada(cliente, sim.extremosCalcada[cliente.ladoSaida], 1 / 60);
      if (sim.entregas.caminhao) assert.ok(segmentoLivre(cliente, cliente, [obstaculoCaminhao(sim.entregas.caminhao)], 0.32), 'pedestre permanece fora do caminhão');
    }
    if (i >= 600 && !sim.entregas.caminhao && sim.clientes.every(cruzou)) break;
  }
  assert.equal(sim.entregas.caminhao, null, JSON.stringify({ caminhao: sim.entregas.caminhao, clientes: sim.clientes }));
  assert.ok(sim.clientes.every(cruzou), 'o fluxo contínuo dos dois lados termina de cruzar');
});

test('pedestres dos dois lados contornam por trás um caminhão parado na travessia', () => {
  for (const sentido of [-1, 1]) {
    const sim = loja(), faixa = PLANTA_CARGA.travessia;
    sim.entregas.caminhao = { fase: 'partindo', x: faixa.x, z: 10, angulo: -Math.PI / 2, partidaLiberada: true };
    const cliente = { x: faixa.x - sentido * 2.5, z: CONFIG.entrada.z, fase: 'passando' };
    sim.clientes = [cliente];
    const destino = { x: faixa.x + sentido * 3, z: CONFIG.entrada.z };
    const obstaculo = obstaculoCaminhao(sim.entregas.caminhao);
    let passouAtras = false;
    for (let i = 0; i < 600 && Math.hypot(cliente.x - destino.x, cliente.z - destino.z) > 0.025; i++) {
      const antes = { x: cliente.x, z: cliente.z };
      sim.tempo += 1 / 60;
      sim.caminharCalcada(cliente, destino, 1 / 60);
      passouAtras ||= cliente.z < 10 - ENTREGA.comprimento / 2;
      assert.ok(segmentoLivre(antes, cliente, [obstaculo], 0.32), 'desvio não atravessa o veículo');
    }
    assert.ok(passouAtras, 'usa espaço atrás do baú');
    assert.ok(Math.hypot(cliente.x - destino.x, cliente.z - destino.z) < 0.025, JSON.stringify(cliente));
  }
});

test('acesso dedicado recebe entrega mesmo sem comprar estacionamento de clientes', () => {
  const sim = loja(); sim.estado.melhorias.estacionamento = 0;
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, true);
  entregar(sim);
  assert.equal(sim.estado.deposito.pacotes.length, 1);
});

test('entrega chega quando um cliente quer sair e outro ainda aguarda carro do tráfego', () => {
  const sim = loja();
  sim.estado.estatisticas.clientes = 19 * CONFIG.clientesPorNivel;
  assert.equal(sim.comprarMelhoria('prateleirasImportados').sucesso, true);
  sim.encomendarImportacoes({ importarCereais: 1 });
  sim.clientes = [{ id: 901, noCarro: true }, { id: 902, noCarro: true }];
  sim.estacionamento.carros = [
    { clienteId: 901, vaga: 0, modelo: 0, fase: 'esperandoSaida', x: -13.95, z: -3.7, angulo: 0, velocidade: 0, rodas: 0 },
    { clienteId: 902, vaga: 1, modelo: 0, fase: 'aguardando', x: 20, z: 10.7, angulo: 0, velocidade: 0, rodas: 0 }
  ];
  sim.estacionamento.receberDoTrafego = () => null;
  const cena = { sim, trafego: new Trafego(new THREE.Scene(), () => 0.5) };
  let chegou = false;
  for (let i = 0; i < 6000 && !chegou; i++) {
    sim.entregas.atualizar(sim, 0.05);
    sim.estacionamento.atualizar(sim, 0.05);
    Cena.prototype.atualizarTrafego.call(cena, 0.05);
    chegou = sim.entregas.caminhao?.fase === 'chegando';
  }
  assert.ok(chegou, 'carro sem veículo recebido não pode impedir a saída e a chegada do caminhão');
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
  entregar(sim);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 2 }).sucesso, false);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 1 }).sucesso, true);
  assert.equal(vagasDeposito(sim.estado.deposito, 'enlatados'), 0);
});

test('produtos da mesma classe compartilham vagas; outra classe entrega na própria estante', t => {
  // Produtos de teste exercitam a extensão do catálogo sem lançar conteúdo futuro.
  for (const [id, classe] of [['conservaTeste', 'enlatados'], ['doceTeste', 'doces']]) {
    PRODUTOS[id] = { ...PRODUTOS.enlatado, classe };
    MELHORIAS.push({ ...MELHORIAS.find(m => m.id === 'importarProdutos'), id, produto: id });
    t.after(() => { delete PRODUTOS[id]; MELHORIAS.splice(MELHORIAS.findIndex(m => m.id === id), 1); });
  }
  const sim = loja();
  assert.equal(sim.comprarMelhoria('prateleirasImportados').sucesso, true);
  const antes = structuredClone(sim.estado);
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 3, conservaTeste: 2, doceTeste: 1 }).sucesso, false);
  assert.deepEqual(sim.estado, antes, 'pedido misto inválido não cobra nem libera produtos');
  assert.equal(sim.encomendarImportacoes({ importarProdutos: 2, conservaTeste: 2, doceTeste: 4 }).sucesso, true);
  assert.equal(vagasDeposito(sim.estado.deposito, 'enlatados'), 0);
  assert.equal(vagasDeposito(sim.estado.deposito, 'doces'), 0);
  entregar(sim);
  const doces = sim.estado.deposito.pacotes.filter(p => p.produto === 'doceTeste');
  assert.deepEqual(doces.map(p => p.slot), [4, 5, 6, 7]);
  for (const pacote of doces) {
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
