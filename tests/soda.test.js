import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao, validarEstado } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { SODA } from '../src/jogo/soda.js';
import { Cena } from '../src/jogo/cena.js';
import { vagasDeposito } from '../src/jogo/entregas.js';
import { construirDeposito } from '../src/jogo/deposito.js';
import { prepararMelhoriasAnteriores } from './helpers/progressao.js';

function preparar() {
  const sim = new Simulacao(); sim.estado.dinheiro = 100000;
  sim.estado.estatisticas.clientes = 24 * CONFIG.clientesPorNivel;
  prepararMelhoriasAnteriores(sim, 'geladeiraSoda');
  sim.proximoCliente = Infinity; sim.assaltosAtivos = false; sim.temporizadorEntregaAtivo = false;
  return sim;
}
function entregar(sim) {
  for (let i = 0; i < 20000 && (sim.estado.deposito.pedidos.length || sim.entregas.caminhao); i++) sim.entregas.atualizar(sim, 0.05);
  assert.equal(sim.entregas.caminhao, null, 'entregador conclui ida ao canto e retorno');
  assert.equal(sim.estado.deposito.pedidos.length, 0);
}

test('N25 instala Soda por R$ 1.000 uma vez e exige nível, sequência e saldo', () => {
  const sim = preparar();
  sim.estado.estatisticas.clientes -= CONFIG.clientesPorNivel;
  assert.equal(sim.comprarMelhoria('geladeiraSoda').sucesso, false);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 999;
  assert.equal(sim.comprarMelhoria('geladeiraSoda').sucesso, false);
  sim.estado.dinheiro = 1000;
  assert.equal(sim.encomendarImportacoes({ importarSoda: 1 }).sucesso, false);
  assert.equal(sim.comprarMelhoria('geladeiraSoda').sucesso, true);
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(sim.comprarMelhoria('geladeiraSoda').sucesso, false);
  assert.equal(PRODUTOS.soda.preco, 20);
});

test('quatro caixas entregam 96 latas no chão; caixa parcial mantém vaga ocupada e save preserva unidades', () => {
  const sim = preparar(); sim.comprarMelhoria('geladeiraSoda');
  assert.equal(sim.encomendarImportacoes({ importarSoda: 5 }).sucesso, false);
  const saldo = sim.estado.dinheiro;
  assert.equal(sim.encomendarImportacoes({ importarSoda: 4 }).quantidade, 96);
  assert.equal(sim.estado.dinheiro, saldo - 960);
  assert.equal(vagasDeposito(sim.estado.deposito, 'soda'), 0);
  entregar(sim);
  assert.deepEqual(sim.estado.deposito.pacotes.map(p => p.slot), [16, 17, 18, 19]);
  assert.equal(sim.estado.produtos.soda.horta, 96);
  for (let i = 0; i < 23; i++) assert.equal(sim.retirarProdutoDeposito('soda'), true);
  assert.equal(vagasDeposito(sim.estado.deposito, 'soda'), 0);
  const salvo = validarEstado(sim.estado);
  assert.equal(salvo.produtos.soda.horta, 73);
  assert.deepEqual(salvo.deposito.pacotes.map(p => p.unidades), [1, 24, 24, 24]);
  sim.retirarProdutoDeposito('soda');
  assert.equal(vagasDeposito(sim.estado.deposito, 'soda'), 1);
  assert.equal(sim.encomendarImportacoes({ importarSoda: 2 }).sucesso, false);
  assert.equal(sim.encomendarImportacoes({ importarSoda: 1 }).sucesso, true);
});

test('jogador recolhe no canto e abastece somente Soda; repositor abastece até 24', () => {
  const sim = preparar(); sim.comprarMelhoria('geladeiraSoda');
  sim.encomendarImportacoes({ importarSoda: 2 }); entregar(sim);
  Object.assign(sim.estado.jogador, SODA.coleta); sim.tempo++; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['soda']);
  Object.assign(sim.estado.jogador, SODA.cliente); sim.tempo++; sim.interagir();
  assert.equal(sim.estado.produtos.soda.prateleira, 1);
  assert.equal(sim.estado.produtos.soda.apresentado, true);
  Object.assign(sim.estado.jogador, CONFIG.inicio);
  for (let i = 0; i < 20000 && sim.estado.produtos.soda.prateleira < 24; i++) {
    sim.tempo += 0.05; sim.atualizarAjudante(0.05);
  }
  assert.equal(sim.estado.produtos.soda.prateleira, 24);
  assert.equal(sim.estado.produtos.sucoLaranja.prateleira, 0);
});

test('Soda entra nos pedidos após abastecer e cada lata paga R$ 20 no caixa', () => {
  const sim = preparar(); sim.comprarMelhoria('geladeiraSoda');
  for (const p of Object.values(sim.estado.produtos)) p.apresentado = false;
  Object.assign(sim.estado.produtos.soda, { prateleira: 1, apresentado: true });
  sim.estado.melhorias.carrinhos = 0;
  sim.criarCliente();
  const cliente = sim.clientes[0];
  assert.equal(cliente.compras[0].produto, 'soda');
  const antes = sim.estado.estatisticas.faturamento;
  for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
    sim.tempo += 0.05; sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
  }
  assert.equal(cliente.fase, 'fim');
  assert.equal(sim.estado.estatisticas.faturamento - antes, 20);
});

test('modelo reutiliza geladeira com quatro níveis compactos e caixas sem estante; saves antigos começam vazios', () => {
  const sim = preparar(); sim.comprarMelhoria('geladeiraSoda');
  const cena = { sim, cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  Cena.prototype.construirImportado.call(cena, 'soda', PRODUTOS.soda);
  assert.ok(cena.cena.getObjectByName('geladeira-soda'));
  const latas = cena.produtos.soda.frutas;
  assert.equal(latas.length, 24);
  assert.equal(new Set(latas.map(l => l.position.y)).size, 4);
  assert.ok(latas.every(l => l.getObjectByName('lacre-soda')));
  const deposito = construirDeposito(new THREE.Group(), {
    caixa(pai, w, h, d, cor, x, y, z) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: cor }));
      m.position.set(x, y, z); pai.add(m); return m;
    }, vincular() {}
  });
  deposito.atualizarPacotes([{ produto: 'soda', unidades: 24, slot: 16 }]);
  const caixas = deposito.grupo.children.filter(o => o.name === 'caixa-soda');
  assert.equal(caixas.length, 4);
  assert.equal(caixas.filter(o => o.visible).length, 1);
  assert.ok(caixas.every(o => o.position.y === 0.23));
  const antigo = new Simulacao().estado;
  delete antigo.melhorias.geladeiraSoda; delete antigo.produtos.soda;
  const migrado = validarEstado(antigo);
  assert.equal(migrado.melhorias.geladeiraSoda, 0);
  assert.equal(migrado.produtos.soda.liberado, false);
  assert.equal(migrado.produtos.soda.horta, 0);
});
