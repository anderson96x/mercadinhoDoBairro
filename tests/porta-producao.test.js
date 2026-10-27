import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { construirBairro } from '../src/jogo/bairro.js';
import { anguloPortaProducao, volumePortaProducao } from '../src/jogo/planta.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function loja(nivel = 1) {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  if (nivel >= 6) { sim.estado.dinheiro = 800; sim.comprarMelhoria('laranja'); }
  sim.proximoCliente = Infinity;
  return sim;
}

test('porta mantém apenas a metade direita e a antiga metade esquerda fica fechada por parede', () => {
  for (const nivel of [1, 6]) {
    const sim = loja(nivel), porta = sim.portaProducao;
    assert.equal(porta.w, 1.5);
    assert.equal(porta.x + porta.w / 2, 5.1);
    sim.aberturasPortasProducao[0] = 1;
    assert.ok(segmentoLivre({ x: porta.x, z: porta.z + 1 }, { x: porta.x, z: porta.z - 1 }, sim.obstaculos(), 0.32));
    assert.equal(segmentoLivre({ x: 2.85, z: porta.z + 1 }, { x: 2.85, z: porta.z - 1 }, sim.obstaculos(), 0.32), false);
  }
});

test('porta abre gradualmente por proximidade, mantém o vão livre, fecha ao afastar e congela na pausa', () => {
  const sim = loja(), porta = sim.portaProducao;
  const interior = { x: porta.x, z: porta.z + 1 }, exterior = { x: porta.x, z: porta.z - 1 };
  assert.equal(segmentoLivre(interior, exterior, sim.obstaculos(), 0.32), false);
  Object.assign(sim.estado.jogador, interior);
  sim.atualizar(0.05);
  assert.ok(sim.aberturasPortasProducao[0] > 0 && sim.aberturasPortasProducao[0] < 1);
  const parcial = sim.aberturasPortasProducao[0];
  sim.pausado = true; sim.atualizar(0.05);
  assert.equal(sim.aberturasPortasProducao[0], parcial);
  sim.pausado = false;
  for (let i = 0; i < 15; i++) sim.atualizar(0.05);
  assert.equal(sim.aberturasPortasProducao[0], 1);
  assert.ok(segmentoLivre(interior, exterior, sim.obstaculos(), 0.32));
  Object.assign(sim.estado.jogador, { x: porta.x, z: porta.z });
  for (let i = 0; i < 15; i++) sim.atualizar(0.05);
  assert.equal(sim.aberturasPortasProducao[0], 1, 'não fecha sobre quem está no vão');
  Object.assign(sim.estado.jogador, CONFIG.inicio);
  sim.atualizar(0.05);
  assert.ok(sim.aberturasPortasProducao[0] > 0 && sim.aberturasPortasProducao[0] < 1);
  for (let i = 0; i < 15; i++) sim.atualizar(0.05);
  assert.equal(sim.aberturasPortasProducao[0], 0);
});

test('clientes próximos ou navegando não abrem nem mantêm a porta dos fundos aberta', () => {
  for (const nivel of [1, 6]) {
    const sim = loja(nivel), porta = sim.portaProducao;
    const cliente = { x: porta.x, z: porta.z + 1, fase: 'comprando' };
    sim.clientes.push(cliente);
    const destino = { x: porta.x, z: porta.z - 2 };
    for (let i = 0; i < 20; i++) {
      sim.atualizarPortasProducao(0.05, cliente);
      sim.caminharCliente(cliente, destino, 0.05);
    }
    assert.equal(sim.aberturasPortasProducao[0], 0);
    assert.ok(cliente.z > porta.z);
    Object.assign(sim.estado.jogador, { x: porta.x, z: porta.z + 2 });
    for (let i = 0; i < 15; i++) sim.atualizarPortasProducao(0.05);
    assert.equal(sim.aberturasPortasProducao[0], 1);
    Object.assign(sim.estado.jogador, CONFIG.inicio);
    for (let i = 0; i < 15; i++) sim.atualizarPortasProducao(0.05);
    assert.equal(sim.aberturasPortasProducao[0], 0);
  }
});

test('somente o repositor contratado pode acionar a porta junto com o jogador', () => {
  const sim = loja(5), porta = sim.portaProducao;
  Object.assign(sim.ajudante, { x: porta.x, z: porta.z + 1 });
  for (let i = 0; i < 15; i++) sim.atualizarPortasProducao(0.05, sim.ajudante);
  assert.equal(sim.aberturasPortasProducao[0], 0);
  sim.estado.dinheiro = 900;
  assert.equal(sim.comprarMelhoria('ajudante').sucesso, true);
  for (let i = 0; i < 15; i++) sim.atualizarPortasProducao(0.05);
  assert.equal(sim.aberturasPortasProducao[0], 1);
});

test('jogador atravessa automaticamente a porta nos dois sentidos sem atravessar a folha', () => {
  for (const nivel of [1, 6]) for (const direcao of [-1, 1]) {
    const sim = loja(nivel), porta = sim.portaProducao, jogador = sim.estado.jogador;
    Object.assign(jogador, { x: porta.x, z: porta.z - direcao * 4 });
    for (let i = 0; i < 120; i++) {
      const anterior = { x: jogador.x, z: jogador.z };
      sim.mover(jogador, 0, direcao, 1 / 60, sim.velocidade);
      assert.ok(segmentoLivre(anterior, jogador, [volumePortaProducao(sim.aberturasPortasProducao[0], porta)], 0.27));
    }
    assert.ok((jogador.z - porta.z) * direcao > 1, JSON.stringify(jogador));
  }
});

test('lixeira fica fora da antiga metade esquerda e pode ser alcançada pela porta', () => {
  for (const nivel of [1, 6]) {
    const sim = loja(nivel), lixeira = sim.lixeira, porta = sim.portaProducao;
    assert.equal(lixeira.x, 2.85);
    assert.ok(lixeira.z + lixeira.d / 2 < porta.z - 0.14);
    const alvo = { x: lixeira.x, z: lixeira.z - 0.8 };
    let chegou = false;
    for (let i = 0; i < 2000 && !chegou; i++) {
      sim.tempo += 0.05;
      chegou = sim.caminharCliente(sim.estado.jogador, alvo, 0.05, sim.velocidade);
    }
    assert.ok(chegou);
    assert.ok(sim.pertoDaLixeira());
  }
});

test('modelo usa uma folha direita, acompanha a animação e apoia a lixeira no gramado', () => {
  const cena = new THREE.Scene();
  const mesh = (pai, w, h, d, cor, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: cor }));
    m.position.set(x, y, z); pai.add(m); return m;
  };
  const bairro = construirBairro(cena, { caixa: mesh,
    esfera: (p, r, c, x, y, z) => mesh(p, r, r, r, c, x, y, z),
    cilindro: (p, a, b, h, c, x, y, z) => mesh(p, a, h, b, c, x, y, z) });
  const entrada = cena.getObjectByName('entrada-producao');
  const folhas = entrada.children.filter(c => c.name.startsWith('porta-producao-'));
  assert.equal(folhas.length, 1);
  assert.equal(folhas[0].position.x, 5.1);
  const painel = folhas[0].getObjectByName('painel-porta-producao');
  const topoPainel = folhas[0].position.y + painel.position.y + painel.geometry.parameters.height / 2;
  const verga = entrada.children.find(c => c !== folhas[0] && c.geometry?.parameters.width > 1.5);
  const baseVerga = verga.position.y - verga.geometry.parameters.height / 2;
  assert.ok(baseVerga - topoPainel <= 0.02, 'folha encontra a verga sem vão superior');
  for (const abertura of [0, 0.5, 1]) {
    bairro.animarPortasProducao([abertura]);
    assert.equal(folhas[0].rotation.y, anguloPortaProducao(abertura));
  }
  assert.equal(cena.getObjectByName('lixeira').position.y, -0.045);
  assert.equal(cena.getObjectByName('lixeira').rotation.y, Math.PI);
});
