import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG } from '../src/jogo/configuracao.js';
import { PLANTA_DEPOSITO as P, PLANTA_ESTACIONAMENTO } from '../src/jogo/planta.js';
import { construirBairro } from '../src/jogo/bairro.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function loja(comEstacionamento = true) {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 17 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 100000;
  for (const id of ['milho', 'alaProducao', 'alaLeite', 'alaTrigo', 'alaPadaria', ...(comEstacionamento ? ['estacionamento'] : [])]) {
    assert.equal(sim.comprarMelhoria(id).sucesso, true, id);
  }
  return sim;
}

test('depósito e colisões aparecem apenas na compra da expansão e persistem no save', () => {
  const sim = loja(false);
  const passagem = () => segmentoLivre({ x: -7, z: -8.7 }, { x: -7, z: -10 }, sim.obstaculos(), 0.32);
  assert.equal(passagem(), true);
  const estoque = structuredClone(sim.estado.produtos);
  assert.equal(sim.comprarMelhoria('expansao').sucesso, true);
  assert.equal(passagem(), false);
  assert.deepEqual(sim.estado.produtos, estoque);
  const recarregada = new Simulacao(structuredClone(sim.estado));
  assert.equal(segmentoLivre({ x: -7, z: -8.7 }, { x: -7, z: -10 }, recarregada.obstaculos(), 0.32), false);
  const antigo = structuredClone(sim.estado); delete antigo.melhorias.expansao;
  assert.equal(new Simulacao(antigo).estado.melhorias.expansao, 0);
});

test('porta externa fica voltada ao estacionamento; paredes fora da passagem e mobiliário são sólidos', () => {
  const sim = loja(); sim.comprarMelhoria('expansao');
  assert.ok(P.piso.z + P.piso.d / 2 < PLANTA_ESTACIONAMENTO.piso.z - PLANTA_ESTACIONAMENTO.piso.d / 2);
  const caixas = sim.obstaculos();
  for (const x of [-14.5, -12, P.porta.x, -6.5, -4]) {
    assert.equal(segmentoLivre({ x, z: -8.7 }, { x, z: -10 }, caixas, 0.32), x === P.porta.x);
    assert.equal(segmentoLivre({ x, z: -14.7 }, { x, z: -16 }, caixas, 0.32), false);
  }
  for (const x of [-15.5, -3.1]) {
    assert.equal(segmentoLivre({ x: x - 0.6, z: -10 }, { x: x + 0.6, z: -10 }, caixas, 0.32), false);
  }
  for (const p of P.estantes) {
    assert.equal(segmentoLivre({ x: p.x, z: p.z - p.d }, { x: p.x, z: p.z + p.d }, caixas, 0.32), false, p.nome);
  }
  for (const produto of Object.values(sim.produtos)) {
    if (produto.canteiro) assert.ok(produto.horta.z + produto.canteiro.d / 2 < P.piso.z - P.piso.d / 2);
  }
});

test('passagem sem porta liga o depósito ao anexo nos dois sentidos e ao recarregar', () => {
  const sim = loja(); sim.comprarMelhoria('expansao');
  const p = P.passagem;
  const dentro = { x: p.x - 1.4, z: p.z }, fora = { x: p.x + 1.4, z: p.z };
  assert.equal(segmentoLivre(dentro, fora, sim.obstaculos(), 0.32), true);
  assert.equal(segmentoLivre(fora, dentro, sim.obstaculos(), 0.32), true);
  const ator = { x: -9.3, z: -12.9 };
  for (const destino of [fora, { x: -9.3, z: -12.9 }]) {
    let chegou = false;
    for (let tick = 0; tick < 2000 && !chegou; tick++) {
      sim.tempo += 0.05; chegou = sim.caminharCliente(ator, destino, 0.05);
    }
    assert.equal(chegou, true, JSON.stringify(destino));
  }
  const salvo = structuredClone(sim.estado); Object.assign(salvo.jogador, { x: p.x, z: p.z });
  const carregada = new Simulacao(salvo);
  assert.equal(segmentoLivre(dentro, fora, carregada.obstaculos(), 0.32), true);
  assert.equal(carregada.estado.jogador.x, p.x);
  assert.equal(carregada.estado.jogador.z, p.z);
});

test('jogador entra, alcança as estantes e retorna ao estacionamento pelo mesmo portão', () => {
  const sim = loja(); sim.comprarMelhoria('expansao');
  const ator = { x: P.porta.x, z: -7.5 };
  for (const destino of [{ x: P.porta.x, z: -12.3 }, ...P.estantes.map(p => ({ x: p.x, z: -12.9 })), { x: P.porta.x, z: -7.5 }]) {
    let chegou = false;
    for (let tick = 0; tick < 2000 && !chegou; tick++) {
      sim.tempo += 0.05; chegou = sim.caminharCliente(ator, destino, 0.05);
    }
    assert.equal(chegou, true, JSON.stringify(destino));
  }
});

test('construção acompanha a expansão, com estantes, embalagens e piso compatível com Canvas', () => {
  const cena = new THREE.Scene();
  const caixa = (pai, w, h, d, cor, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: cor }));
    mesh.position.set(x, y, z); pai.add(mesh); return mesh;
  };
  const bairro = construirBairro(cena, {
    caixa,
    cilindro: (pai, r1, r2, h, cor, x, y, z) => caixa(pai, r1 * 2, h, r2 * 2, cor, x, y, z),
    esfera: (pai, r, cor, x, y, z) => caixa(pai, r * 2, r * 2, r * 2, cor, x, y, z)
  });
  const deposito = cena.getObjectByName('deposito');
  const visivel = () => { let aparece = false; cena.traverseVisible(objeto => { if (objeto === deposito) aparece = true; }); return aparece; };
  assert.equal(visivel(), false);
  bairro.atualizarExpansao(true);
  assert.equal(visivel(), true);
  assert.ok(cena.getObjectByName('porta-deposito'));
  const passagem = cena.getObjectByName('passagem-deposito');
  assert.ok(passagem);
  const limitePassagem = new THREE.Box3().setFromObject(passagem);
  assert.ok(limitePassagem.min.y >= 0.23 + P.passagem.h - 1e-6, 'nenhuma folha ou rodapé bloqueia o vão');
  assert.equal(P.estantes.length, 4);
  for (const p of P.estantes) {
    const estante = deposito.getObjectByName(p.nome);
    assert.ok(estante);
    assert.equal(estante.children.filter(o => o.name === 'caixa-papelao').length, 4);
  }
  assert.equal(deposito.getObjectByName(P.estantes[0].nome).userData.classe, 'enlatados');
  assert.equal(deposito.getObjectByName('pallet-deposito-1'), undefined);
  assert.equal(deposito.getObjectByName('pallet-deposito-2'), undefined);
  let embalagens = 0;
  deposito.traverse(objeto => { if (objeto.name === 'caixa-papelao') embalagens++; });
  assert.equal(embalagens, 16);
  assert.equal(deposito.getObjectByName('piso-deposito').userData.fundo, 4);
  bairro.atualizarExpansao(false);
  assert.equal(visivel(), false);
});

test('portão desce ao fechar, sobe ao abrir e congela com dt zero', () => {
  const cena = new THREE.Scene();
  const caixa = (pai, w, h, d, cor, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: cor }));
    mesh.position.set(x, y, z); pai.add(mesh); return mesh;
  };
  const bairro = construirBairro(cena, {
    caixa,
    cilindro: (pai, r1, r2, h, cor, x, y, z) => caixa(pai, r1 * 2, h, r2 * 2, cor, x, y, z),
    esfera: (pai, r, cor, x, y, z) => caixa(pai, r * 2, r * 2, r * 2, cor, x, y, z)
  });
  const laminas = [];
  cena.getObjectByName('porta-deposito').traverse(objeto => {
    if (objeto.name === 'lamina-portao-deposito') laminas.push(objeto);
  });
  assert.equal(laminas.length, 18);
  const abertas = laminas.map(lamina => lamina.position.y);
  bairro.animarDeposito(false, 0.5);
  const descendo = laminas.map(lamina => lamina.position.y);
  assert.ok(descendo.every((y, i) => y < abertas[i]));
  bairro.animarDeposito(false, 0);
  assert.deepEqual(laminas.map(lamina => lamina.position.y), descendo, 'pausa congela o portão');
  bairro.animarDeposito(false, 2);
  const fechadas = laminas.map(lamina => lamina.position.y);
  assert.ok(Math.abs(laminas[0].position.y - 0.4175) < 1e-6);
  bairro.animarDeposito(true, 0.5);
  assert.ok(laminas.every((lamina, i) => lamina.position.y > fechadas[i]));
  bairro.animarDeposito(true, 2);
  assert.ok(laminas[0].position.y > 2.5);
});

test('portão fechado bloqueia o estacionamento e a passagem interna continua livre', () => {
  const sim = loja(); sim.comprarMelhoria('expansao');
  const p = P.porta;
  const externo = { x: p.x, z: p.z + 0.8 }, interno = { x: p.x, z: p.z - 0.8 };
  assert.equal(segmentoLivre(externo, interno, sim.obstaculos(), 0.32), true);
  sim.estado.lojaAberta = false;
  assert.equal(segmentoLivre(externo, interno, sim.obstaculos(), 0.32), false);
  const passagem = P.passagem;
  assert.equal(segmentoLivre(
    { x: passagem.x - 0.8, z: passagem.z },
    { x: passagem.x + 0.8, z: passagem.z }, sim.obstaculos(), 0.32), true);
  sim.estado.lojaAberta = true;
  assert.equal(segmentoLivre(externo, interno, sim.obstaculos(), 0.32), true);
});
