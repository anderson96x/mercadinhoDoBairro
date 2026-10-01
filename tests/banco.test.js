import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BANCO, atualizarBanco } from '../src/jogo/banco.js';
import { Simulacao, estadoInicial } from '../src/jogo/simulacao.js';
import { CONFIG } from '../src/jogo/configuracao.js';
import { Trafego } from '../src/jogo/trafego.js';
import { ColetaBancoVisual } from '../src/jogo/coleta-banco.js';
import { RUA } from '../src/jogo/bairro.js';
import { Interface } from '../src/interface/interface.js';

test('aviso bancário reduz a barra até o prazo e a oculta após solicitar depósito', () => {
  const sim = new Simulacao();
  sim.estado.banco.noCaixa = BANCO.limite;
  sim.estado.jogador.sentadoEscritorio = true;
  sim.definirTempoEsperaAssalto(60);
  const elementos = new Map();
  const el = id => {
    if (!elementos.has(id)) elementos.set(id, {
      hidden: false, textContent: '', style: {}, atributos: {},
      classList: { toggle() {} },
      setAttribute(nome, valor) { this.atributos[nome] = valor; }
    });
    return elementos.get(id);
  };
  const ui = { sim, el };
  Interface.prototype.atualizarBanco.call(ui);
  assert.equal(el('aviso-banco').hidden, false);
  assert.equal(el('aviso-banco-barra').style.width, '100%');
  assert.equal(el('aviso-banco-segundos').textContent, '60s');

  sim.atualizarAssalto(30);
  Interface.prototype.atualizarBanco.call(ui);
  assert.equal(el('aviso-banco-barra').style.width, '50%');
  assert.equal(el('aviso-banco-segundos').textContent, '30s');
  assert.equal(el('aviso-banco-progresso').atributos['aria-valuenow'], '30');

  sim.pausado = true;
  for (let i = 0; i < 200; i++) sim.atualizar(0.05);
  Interface.prototype.atualizarBanco.call(ui);
  assert.equal(el('aviso-banco-barra').style.width, '50%');
  assert.equal(el('aviso-banco-segundos').textContent, '30s');
  sim.pausado = false;

  assert.equal(sim.solicitarDeposito().sucesso, true);
  Interface.prototype.atualizarBanco.call(ui);
  assert.equal(el('aviso-banco-prazo').hidden, true);
  assert.equal(el('aviso-banco').hidden, false);
});

function vender(sim) {
  sim.estado.melhorias.caixa = 1;
  sim.clientes = [{ id: 1, ...CONFIG.clienteCaixa, fase: 'fila', ordemFila: 1, produto: 'tomate', quantidade: 1, itens: ['tomate'] }];
  sim.atualizarCaixa(CONFIG.tempoCaixa);
}

test('vendas acumulam caixa, coleta exige escritório e não altera o saldo', () => {
  const sim = new Simulacao();
  sim.estado.banco.noCaixa = 995;
  sim.estado.dinheiro = 230;
  assert.equal(sim.solicitarDeposito().sucesso, false);
  vender(sim);
  assert.equal(sim.estado.banco.noCaixa, 1000);
  assert.equal(sim.estado.dinheiro, 235);
  sim.estado.jogador.sentadoEscritorio = true;
  assert.equal(sim.solicitarDeposito().sucesso, true);
  assert.equal(sim.solicitarDeposito().sucesso, false);
  assert.equal(sim.estado.banco.noCaixa, 1000);
  // Vendas durante a coleta pertencem ao próximo depósito.
  vender(sim);
  const saldo = sim.estado.dinheiro;
  const banco = sim.estado.banco;
  atualizarBanco(banco, 50);
  assert.equal(banco.coleta.tempo, -1, 'aguarda a faixa ficar livre');
  banco.coleta.tempo = 0;
  atualizarBanco(banco, BANCO.retirada);
  assert.equal(banco.noCaixa, 5);
  assert.equal(banco.depositado, 0);
  assert.equal(atualizarBanco(banco, BANCO.fim), 1000);
  assert.equal(banco.depositado, 1000);
  assert.equal(banco.coleta, null);
  assert.equal(sim.estado.dinheiro, saldo);
});

test('recarregar antes ou depois da retirada preserva o depósito sem duplicar dinheiro', () => {
  for (const tempo of [-1, 8, BANCO.retirada, 29]) {
    const sim = new Simulacao();
    sim.estado.dinheiro = 800;
    sim.estado.banco.noCaixa = 1230;
    sim.estado.jogador.sentadoEscritorio = true;
    sim.solicitarDeposito();
    if (tempo >= 0) { sim.estado.banco.coleta.tempo = 0; atualizarBanco(sim.estado.banco, tempo); }
    const retomado = new Simulacao(structuredClone(sim.estado));
    assert.deepEqual(retomado.estado.banco, sim.estado.banco);
    if (retomado.estado.banco.coleta.tempo < 0) retomado.estado.banco.coleta.tempo = 0;
    atualizarBanco(retomado.estado.banco, 60);
    atualizarBanco(retomado.estado.banco, 60);
    assert.equal(retomado.estado.banco.depositado, 1230);
    assert.equal(retomado.estado.banco.noCaixa, 0);
    assert.equal(retomado.estado.dinheiro, 800);
  }
  const antigo = estadoInicial(); antigo.dinheiro = 670; delete antigo.banco;
  assert.equal(new Simulacao(antigo).estado.banco.noCaixa, 670);
});

test('pausa congela a coleta e cada novo acúmulo permite outro depósito', () => {
  const sim = new Simulacao();
  sim.estado.banco.noCaixa = 1000; sim.estado.jogador.sentadoEscritorio = true;
  sim.solicitarDeposito(); sim.estado.banco.coleta.tempo = 9;
  sim.pausado = true; sim.atualizar(0.05);
  assert.equal(sim.estado.banco.coleta.tempo, 9);
  atualizarBanco(sim.estado.banco, 60);
  assert.equal(sim.solicitarDeposito().sucesso, false);
  sim.estado.banco.noCaixa = 1005;
  assert.equal(sim.solicitarDeposito().sucesso, true);
});

test('a faixa do banco esvazia sem interromper o tráfego no outro sentido', () => {
  const trafego = new Trafego(new THREE.Scene(), () => 0.5);
  trafego.criarNaFaixa(0); trafego.faixasReservadas.add(0);
  assert.equal(trafego.criarNaFaixa(0), false);
  assert.equal(trafego.criarNaFaixa(1), true);
  for (let i = 0; i < 200; i++) trafego.atualizar(0.1);
  assert.equal(trafego.carros.filter(c => c.faixa === 0).length, 0);
  trafego.faixasReservadas.delete(0);
  assert.equal(trafego.criarNaFaixa(0), true);
});

test('carro-forte fica na rua, um agente protege a van e o outro recolhe o dinheiro', () => {
  const anterior = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
  try {
    const cena = new THREE.Scene(), visual = new ColetaBancoVisual(cena), sim = new Simulacao();
    const obstaculos = sim.obstaculosCliente({});
    for (let tempo = 0; tempo < BANCO.fim; tempo += 0.1) {
      visual.atualizar({ tempo, retirado: tempo >= BANCO.retirada });
      const limites = new THREE.Box3().setFromObject(visual.van);
      assert.ok(limites.min.x >= RUA.minX && limites.max.x <= RUA.maxX);
      assert.equal(visual.van.name, 'carro-forte');
      if (tempo >= BANCO.desembarque && tempo < BANCO.embarque) {
        assert.equal(visual.portaLateral.name, 'porta-passageiro');
        assert.ok(visual.portaLateral.rotation.y > 1);
      }
      for (const [indice, agente] of visual.agentes.entries()) {
        if (!agente.visible) continue;
        assert.equal(agente.userData.maleta.visible, indice === 0 && tempo >= BANCO.retirada);
        assert.ok(agente.position.z <= 9.59, 'agentes saem pelo lado voltado à loja');
        assert.ok(!obstaculos.some(o => Math.abs(agente.position.x - o.x) < o.w / 2 + 0.22 && Math.abs(agente.position.z - o.z) < o.d / 2 + 0.22), `rota em ${tempo.toFixed(1)}s`);
      }
      if (tempo >= 10 && tempo <= 22) {
        assert.ok(Math.abs(visual.agentes[1].position.x + 0.15) < 0.01);
        assert.ok(Math.abs(visual.agentes[1].position.z - 8.55) < 0.01);
        const dobradica = visual.portaLateral.getWorldPosition(new THREE.Vector3());
        const ponta = visual.portaLateral.localToWorld(new THREE.Vector3(-0.8, 0, 0));
        assert.ok(ponta.x > dobradica.x && ponta.z < dobradica.z, 'a porta abre para fora, dobrando para trás');
        assert.ok(Math.hypot(visual.agentes[1].position.x - ponta.x, visual.agentes[1].position.z - ponta.z) < 0.5, 'o guarda espera ao lado da porta aberta');
      }
      if (tempo >= 14 && tempo < 17) assert.ok(visual.agentes[0].position.z <= 5.21);
    }
    visual.atualizar(null);
    assert.equal(cena.children.length, 0);
  } finally { globalThis.document = anterior; }
});
