import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { PLANTA_INICIAL, PLANTA_ESTACIONAMENTO as P, PLANTA_DEPOSITO, OBSTACULOS_ESTACIONAMENTO } from '../src/jogo/planta.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { construirEstacionamento } from '../src/jogo/estacionamento.js';
import { construirBairro, mobiliarioCalcada } from '../src/jogo/bairro.js';
import { buscarCaminho, segmentoLivre } from '../src/jogo/navegacao.js';

function nivel(n) {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  sim.estado.estatisticas.clientes = (n - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 10000;
  return sim;
}

test('estacionamento exige nível 16 e R$ 10.000, cobra uma vez e não libera produtos', () => {
  const sim = nivel(15);
  assert.match(sim.comprarMelhoria('estacionamento').motivo, /nível 16/);
  assert.equal(sim.estado.dinheiro, 10000);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 9999;
  assert.equal(sim.comprarMelhoria('estacionamento').sucesso, false);
  assert.equal(sim.estado.dinheiro, 9999);
  sim.estado.dinheiro = 10000;
  const produtos = structuredClone(sim.estado.produtos);
  assert.ok(sim.comprarMelhoria('estacionamento').sucesso);
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(sim.estado.estagioLoja, 0, 'não modifica a etapa das outras construções');
  assert.deepEqual(sim.estado.produtos, produtos);
  sim.estado.dinheiro = 10000;
  assert.match(sim.comprarMelhoria('estacionamento').motivo, /completa/);
  assert.equal(sim.estado.dinheiro, 10000);
});

test('compra persiste e partidas antigas recebem estacionamento bloqueado sem perder saldo', () => {
  const sim = nivel(16); sim.comprarMelhoria('estacionamento');
  const salvo = structuredClone(sim.estado);
  assert.equal(new Simulacao(salvo).estado.melhorias.estacionamento, 1);
  delete salvo.melhorias.estacionamento; salvo.dinheiro = 12345;
  const migrado = new Simulacao(salvo);
  assert.equal(migrado.estado.melhorias.estacionamento, 0);
  assert.equal(migrado.estado.dinheiro, 12345);
  const adulterado = nivel(15).estado; adulterado.melhorias.estacionamento = 1;
  assert.equal(new Simulacao(adulterado).estado.melhorias.estacionamento, 0);
});

test('objetivo do nível 16 aponta para a compra no escritório', () => {
  const sim = nivel(16);
  assert.equal(sim.missao().destino, 'escritorio');
  assert.match(sim.missao().texto, /10\.000/);
  sim.comprarMelhoria('estacionamento');
  assert.notEqual(sim.missao().titulo, 'Um lugar para estacionar');
});

test('seis vagas vazias ocupam o terreno lateral sem ocupar hortas ou loja', () => {
  const estacionamento = construirEstacionamento();
  assert.equal(estacionamento.grupo.visible, false);
  estacionamento.atualizar(true);
  assert.equal(estacionamento.grupo.visible, true);
  assert.ok(P.piso.x + P.piso.w / 2 < PLANTA_INICIAL.limites.minX);
  assert.ok(P.piso.z - P.piso.d / 2 > PRODUTOS.tomate.coleta.z);
  const vagas = [], carros = [];
  estacionamento.grupo.traverse(o => {
    if (/^vaga-estacionamento-\d+$/.test(o.name)) vagas.push(o);
    if (/^carro-estacionado-\d+$/.test(o.name)) carros.push(o);
  });
  assert.equal(vagas.length, 6); assert.equal(carros.length, 0);
  assert.equal(estacionamento.carros.size, 0);
});

test('colisões só existem após a compra e deixam acesso ao estacionamento e à horta', () => {
  const sim = nivel(16);
  assert.ok(OBSTACULOS_ESTACIONAMENTO.every(o => !sim.obstaculos().includes(o)));
  sim.comprarMelhoria('estacionamento');
  assert.ok(OBSTACULOS_ESTACIONAMENTO.every(o => sim.obstaculos().includes(o)));
  const obstaculos = sim.obstaculosCliente({});
  const livre = (a, b) => segmentoLivre(a, b, obstaculos, 0.32);
  for (const [inicio, destino] of [[CONFIG.entrada, { x: -10, z: 4.5 }],
    [{ x: CONFIG.portaProducao.x, z: -10.2 }, PRODUTOS.tomate.coleta]]) {
    assert.ok(buscarCaminho(inicio, destino, livre, sim.limitesClientes).length, 'acesso deve continuar livre');
  }

});

test('asfalto chega à borda e o acesso contínuo fica centrado nas faixas de entrada e saída', () => {
  const bordaTerreno = PLANTA_INICIAL.terreno.x - PLANTA_INICIAL.terreno.w / 2;
  const bordaEstacionamento = P.piso.x - P.piso.w / 2;
  assert.ok(bordaEstacionamento >= bordaTerreno && bordaEstacionamento - bordaTerreno <= 0.25);
  assert.ok(Math.abs(P.acesso.x - (P.faixas[0].x + P.faixas[1].x) / 2) < 1e-6);
  const estacionamento = construirEstacionamento(); estacionamento.atualizar(true);
  const piso = estacionamento.grupo.getObjectByName('asfalto-estacionamento');
  const acesso = estacionamento.grupo.getObjectByName('acesso-estacionamento');
  assert.equal(piso.material, acesso.material);
  const inicio = P.acesso.z - P.acesso.d / 2;
  const fim = P.acesso.z + P.acesso.d / 2;
  assert.ok(Math.abs(inicio - (P.piso.z + P.piso.d / 2)) < 1e-6, 'sem lacuna entre os asfaltos');
  assert.ok(Math.abs(fim - 9.26) < 1e-6, 'acesso cobre a calçada e o meio-fio até a rua');
  const vertices = acesso.geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    if (vertices.getY(i) < 0) continue;
    const topo = vertices.getZ(i) < 0 ? 0.06 : 0.04;
    assert.ok(Math.abs(vertices.getY(i) - topo) < 1e-6, 'rampa une o piso do estacionamento ao da rua');
  }
  const setas = [];
  estacionamento.grupo.traverse(o => { if (o.name === 'seta-estacionamento') setas.push(o); });
  const sim = nivel(16); sim.comprarMelhoria('estacionamento');
  for (const [indice, faixa] of P.faixas.entries()) {
    assert.ok(faixa.x > P.acesso.x - P.acesso.w / 2 && faixa.x < P.acesso.x + P.acesso.w / 2);
    const marcas = setas.filter(s => s.position.x === faixa.x);
    assert.equal(marcas.length, 2);
    for (const marca of marcas) {
      const direcao = new THREE.Vector3(0, 1, 0).applyQuaternion(marca.quaternion);
      assert.ok(indice === 0 ? direcao.z < -0.99 : direcao.z > 0.99);
    }
    assert.ok(segmentoLivre({ x: faixa.x, z: 9 }, { x: faixa.x, z: 3 }, sim.obstaculosCliente({}), 0.4));
  }
  assert.ok(mobiliarioCalcada(true).every(o => o.z !== 8.4 || Math.abs(o.x - P.acesso.x) > P.acesso.w / 2 + o.w / 2));
});

test('construção substitui a vegetação e partidas carregadas mostram o estacionamento pronto', () => {
  const cena = new THREE.Scene();
  const mesh = (pai, w, h, d, cor, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    m.position.set(x, y, z); pai.add(m); return m;
  };
  const bairro = construirBairro(cena, { caixa: mesh, esfera: mesh, cilindro: mesh });
  bairro.atualizarEstacionamento(false);
  assert.equal(cena.getObjectByName('vegetacao-estacionamento').visible, true);
  assert.equal(cena.getObjectByName('calcada-acesso-estacionamento').visible, true);
  assert.equal(cena.getObjectByName('poste-calcada-estacionamento').position.x, 0);
  bairro.atualizarEstacionamento(true);
  assert.equal(cena.getObjectByName('vegetacao-estacionamento').visible, false);
  assert.equal(cena.getObjectByName('calcada-acesso-estacionamento').visible, false);
  assert.ok(Math.abs(cena.getObjectByName('poste-calcada-estacionamento').position.x + mobiliarioCalcada(false)[0].x - mobiliarioCalcada(true)[0].x) < 1e-6);
  bairro.atualizarEstacionamento(false);
  assert.equal(cena.getObjectByName('calcada-acesso-estacionamento').visible, true);
  assert.equal(cena.getObjectByName('poste-calcada-estacionamento').position.x, 0);
  const novo = construirEstacionamento(); novo.atualizar(false); novo.atualizar(true);
  assert.ok(novo.grupo.getObjectByName('equipamentos-estacionamento').scale.y < 1);
  novo.atualizar(true, 4);
  assert.equal(novo.grupo.getObjectByName('equipamentos-estacionamento').scale.y, 1);
  const carregado = construirEstacionamento(); carregado.atualizar(true);
  assert.equal(carregado.grupo.getObjectByName('equipamentos-estacionamento').scale.y, 1);
});

test('expansão une o asfalto à fachada inteira do depósito sem meio-fio na porta', () => {
  const estacionamento = construirEstacionamento();
  estacionamento.atualizar(true);
  const piso = estacionamento.grupo.getObjectByName('asfalto-estacionamento');
  const antes = new THREE.Box3().setFromObject(piso);
  estacionamento.atualizar(true, 0, [], 0, true);
  const depois = new THREE.Box3().setFromObject(piso);
  assert.ok(Math.abs(depois.min.z - PLANTA_DEPOSITO.porta.z) < 1e-6);
  assert.ok(depois.min.x <= PLANTA_DEPOSITO.piso.x - PLANTA_DEPOSITO.piso.w / 2);
  assert.ok(Math.abs(depois.max.x - (PLANTA_DEPOSITO.piso.x + PLANTA_DEPOSITO.piso.w / 2)) < 1e-6);
  assert.ok(Math.abs(depois.max.z - antes.max.z) < 1e-6, 'entrada pela rua permanece na mesma posição');
  assert.equal(estacionamento.grupo.getObjectByName('guia-fundo-estacionamento').visible, false);
  assert.equal(piso.material, estacionamento.grupo.getObjectByName('acesso-estacionamento').material);
  estacionamento.atualizar(true);
  assert.deepEqual(new THREE.Box3().setFromObject(piso), antes);
  assert.equal(estacionamento.grupo.getObjectByName('guia-fundo-estacionamento').visible, true);
});
