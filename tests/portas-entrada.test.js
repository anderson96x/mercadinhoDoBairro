import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { construirBairro, FOLHAS_PORTAS_ENTRADA, volumesPortasEntrada } from '../src/jogo/bairro.js';
import { CONFIG } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function malha(pai, w, h, d, cor, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: cor }));
  m.position.set(x, y, z); pai.add(m); return m;
}

test('pegas pertencem às folhas e acompanham a abertura sem mudar a dobradiça', () => {
  const cena = new THREE.Scene();
  const bairro = construirBairro(cena, { caixa: malha, esfera: malha, cilindro: malha });
  for (const p of FOLHAS_PORTAS_ENTRADA) {
    const folha = cena.getObjectByName('porta-entrada-' + p.nome);
    const pegas = folha.children.filter(m => m.name === 'pega-porta-entrada');
    assert.equal(pegas.length, 2);
    bairro.animarEntrada(0, true); cena.updateMatrixWorld(true);
    const dobradica = folha.getWorldPosition(new THREE.Vector3());
    const antes = pegas.map(m => m.getWorldPosition(new THREE.Vector3()));
    bairro.animarEntrada(1, true); cena.updateMatrixWorld(true);
    assert.ok(folha.getWorldPosition(new THREE.Vector3()).distanceTo(dobradica) < 1e-10);
    pegas.forEach((pega, i) => {
      assert.equal(pega.parent, folha);
      assert.ok(pega.getWorldPosition(new THREE.Vector3()).distanceTo(antes[i]) > 1);
      assert.ok(Math.abs(pega.position.x) > 1 && Math.abs(pega.position.x) < 1.43);
    });
  }
});

test('jogador não atravessa a entrada fechada nem as folhas abertas', () => {
  const sim = new Simulacao(), jogador = sim.estado.jogador;
  Object.assign(jogador, { x: CONFIG.portaEntrada.x, z: 7.5 });
  sim.mover(jogador, 0, -1, 1, 2);
  assert.equal(jogador.z, 7.5, 'nem um passo grande atravessa a porta fechada');
  sim.aberturaPortaEntrada = 1;
  Object.assign(jogador, { x: -2, z: 7.3 });
  sim.mover(jogador, -1, 0, 1, 1);
  assert.equal(jogador.x, -2, 'a folha aberta continua sólida');
  Object.assign(jogador, { x: CONFIG.portaEntrada.x, z: 8 });
  sim.mover(jogador, 0, -1, 1, 2.5);
  assert.equal(jogador.z, 5.5, 'o vão entre as folhas abertas permite passagem');
});

test('colisão acompanha os ângulos intermediários das duas folhas', () => {
  for (const abertura of [0.25, 0.5, 0.75]) for (const folha of volumesPortasEntrada(abertura)) {
    const normal = { x: Math.sin(folha.angulo), z: Math.cos(folha.angulo) };
    const inicio = { x: folha.x + normal.x, z: folha.z + normal.z };
    const fim = { x: folha.x - normal.x, z: folha.z - normal.z };
    assert.equal(segmentoLivre(inicio, fim, [folha], 0.27), false);
  }
});

test('entrada abre para o jogador e não anima durante a pausa', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity;
  Object.assign(sim.estado.jogador, CONFIG.entrada);
  for (let i = 0; i < 60; i++) sim.atualizar(1 / 60);
  assert.equal(sim.aberturaPortaEntrada, 1);
  sim.pausado = true; Object.assign(sim.estado.jogador, CONFIG.inicio);
  sim.atualizar(0.05);
  assert.equal(sim.aberturaPortaEntrada, 1);
});

test('folha para de fechar antes de atingir alguém na trajetória', () => {
  const sim = new Simulacao(); sim.proximoCliente = Infinity; sim.aberturaPortaEntrada = 1;
  const pessoa = { x: -2.2, z: 7.4, fase: 'passando', assustado: true };
  sim.clientes.push(pessoa);
  for (let i = 0; i < 120; i++) sim.atualizarClientes(1 / 60);
  assert.ok(sim.aberturaPortaEntrada > 0 && sim.aberturaPortaEntrada < 1);
  assert.ok(segmentoLivre(pessoa, pessoa, volumesPortasEntrada(sim.aberturaPortaEntrada), 0.32));
});
