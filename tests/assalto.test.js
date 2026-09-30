import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao } from '../src/jogo/simulacao.js';
import { ASSALTO } from '../src/jogo/assalto.js';
import { AssaltoVisual } from '../src/jogo/assalto-visual.js';
import { salvar, carregar } from '../src/jogo/salvamento.js';
import { RUA } from '../src/jogo/bairro.js';

test('o prazo escolhido para teste altera o gatilho sem zerar o tempo já decorrido', () => {
  const sim = new Simulacao();
  sim.estado.banco.noCaixa = 1000;
  assert.equal(sim.definirTempoEsperaAssalto(5), true);
  assert.equal(sim.definirTempoEsperaAssalto(0), false);
  assert.equal(sim.definirTempoEsperaAssalto(30), false);
  sim.atualizarAssalto(3);
  assert.equal(sim.estado.banco.assalto, null);
  assert.equal(sim.definirTempoEsperaAssalto(60), true);
  sim.atualizarAssalto(3);
  assert.equal(sim.estado.banco.assalto, null);
  assert.equal(sim.definirTempoEsperaAssalto(5), true);
  sim.atualizarAssalto(0.01);
  assert.ok(sim.estado.banco.assalto);
});

test('depósito cancela o risco; assalto interrompe clientes, rouba o caixa uma vez e zera a reputação', () => {
  const seguro = new Simulacao();
  seguro.estado.banco.noCaixa = 1000; seguro.estado.jogador.sentadoEscritorio = true;
  seguro.atualizarAssalto(ASSALTO.espera / 2);
  assert.equal(seguro.solicitarDeposito().sucesso, true);
  seguro.atualizarAssalto(ASSALTO.espera * 2);
  assert.equal(seguro.estado.banco.assalto, null);

  const sim = new Simulacao();
  sim.estado.banco.noCaixa = 1150; sim.estado.dinheiro = 1400;
  sim.criarCliente();
  const c = sim.clientes[0]; c.x = 2; c.z = 3; c.fase = 'comprando';
  c.itens = ['tomate']; c.quantidade = 1;
  const estoque = sim.estado.produtos.tomate.prateleira;
  sim.atualizarAssalto(ASSALTO.espera);
  assert.ok(sim.estado.banco.assalto);
  assert.equal(sim.criarCliente(), false);
  sim.estado.jogador.sentadoEscritorio = true;
  assert.equal(sim.solicitarDeposito().sucesso, false);
  sim.estado.banco.assalto.tempo = 0;
  sim.atualizarAssalto(ASSALTO.entrada);
  assert.equal(c.assustado, true);
  assert.equal(c.andando, false);
  assert.equal(sim.assaltoNaLoja, true);
  sim.atualizarClientes(1);
  assert.equal(c.x, 2);
  assert.equal(c.fase, 'comprando');
  sim.atualizarAssalto(ASSALTO.retirada - ASSALTO.entrada);
  assert.equal(sim.estado.banco.noCaixa, 0);
  assert.equal(sim.estado.dinheiro, 250);
  sim.atualizarAssalto(ASSALTO.saida - ASSALTO.retirada);
  assert.equal(c.assustado, false);
  assert.equal(c.satisfacao, 'neutro');
  assert.equal(c.fase, 'saindo');
  assert.equal(sim.estado.produtos.tomate.prateleira, estoque + 1);
  assert.equal(sim.reputacao, 0);
  sim.atualizarAssalto(ASSALTO.fim);
  assert.equal(sim.estado.banco.assalto, null);
  assert.equal(sim.estado.dinheiro, 250);
  assert.equal(sim.estado.estatisticas.clientesNeutros, 1);
});

test('recarregar durante o assalto preserva clientes assustados e não duplica o roubo', () => {
  const original = globalThis.localStorage;
  const dados = new Map();
  globalThis.localStorage = { getItem: chave => dados.get(chave), setItem: (chave, valor) => dados.set(chave, valor) };
  try {
    const sim = new Simulacao(); sim.estado.banco.noCaixa = 1200; sim.estado.dinheiro = 1300;
    sim.criarCliente(); sim.clientes[0].x = 2; sim.clientes[0].z = 3; sim.clientes[0].fase = 'comprando';
    sim.estado.banco.assalto = { tempo: ASSALTO.entrada, invadiu: true, roubado: false, encerrado: false, valor: 0 };
    sim.clientes[0].assustado = true;
    assert.equal(salvar(sim.estado, sim.clientes), true);
    const retomado = new Simulacao(carregar());
    assert.equal(retomado.clientes.length, 1);
    assert.equal(retomado.clientes[0].assustado, true);
    retomado.atualizarAssalto(ASSALTO.retirada - ASSALTO.entrada);
    assert.equal(salvar(retomado.estado, retomado.clientes), true);
    const aposRoubo = new Simulacao(carregar());
    assert.equal(aposRoubo.estado.dinheiro, 100);
    aposRoubo.atualizarAssalto(ASSALTO.saida - ASSALTO.retirada);
    aposRoubo.atualizarAssalto(ASSALTO.fim);
    assert.equal(aposRoubo.estado.dinheiro, 100);
    assert.equal(aposRoubo.reputacao, 0);
  } finally { globalThis.localStorage = original; }
});

test('carro preto acelera na rua e um assaltante corre até o caixa', () => {
  const cena = new THREE.Scene(), visual = new AssaltoVisual(cena), sim = new Simulacao();
  const obstaculos = sim.obstaculosCliente({});
  visual.atualizar({ tempo: ASSALTO.desembarque + 0.2, roubado: false });
  const assaltante = visual.assaltante;
  assert.equal(visual.grupo.children.filter(o => o.name === 'assaltante-encapuzado').length, 1);
  assert.equal(assaltante.name, 'assaltante-encapuzado');
  const posicaoInicial = assaltante.position.clone();
  const passoInicial = assaltante.userData.distanciaPassos;
  visual.atualizar({ tempo: ASSALTO.desembarque + 0.4, roubado: false });
  assert.ok(assaltante.position.distanceTo(posicaoInicial) > 0.2, 'o corpo realmente avança enquanto corre');
  assert.ok(assaltante.userData.distanciaPassos > passoInicial, 'a passada acompanha a distância percorrida');
  const passoParado = assaltante.userData.distanciaPassos;
  const pernaParada = assaltante.userData.pernas[0].rotation.x;
  visual.atualizar({ tempo: ASSALTO.desembarque + 0.4, roubado: false });
  assert.equal(assaltante.userData.distanciaPassos, passoParado, 'a passada não avança sem deslocamento');
  assert.equal(assaltante.userData.pernas[0].rotation.x, pernaParada);
  for (let tempo = 0; tempo < ASSALTO.fim; tempo += 0.1) {
    visual.atualizar({ tempo, roubado: tempo >= ASSALTO.retirada });
    const limites = new THREE.Box3().setFromObject(visual.carro);
    assert.ok(limites.min.x >= RUA.minX && limites.max.x <= RUA.maxX);
    if (assaltante.visible) {
      assert.ok(!obstaculos.some(o => Math.abs(assaltante.position.x - o.x) < o.w / 2 + 0.22 && Math.abs(assaltante.position.z - o.z) < o.d / 2 + 0.22), `rota em ${tempo.toFixed(1)}s`);
    }
    if (tempo >= ASSALTO.coleta && tempo < ASSALTO.retirada) assert.ok(assaltante.position.z <= 5.21);
  }
  assert.ok((visual.inicio + 1.3) / ASSALTO.chegada > 5, 'chegada é mais rápida que o trânsito normal');
  visual.atualizar(null);
  assert.equal(cena.children.length, 0);
});
