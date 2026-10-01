import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao, validarEstado, distancia } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS, ALA_TRIGO } from '../src/jogo/configuracao.js';
import { construirBairro } from '../src/jogo/bairro.js';
import { ajudanteUsaCaixaMadeira } from '../src/jogo/cena.js';

function abrirTrigo() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = CONFIG.clientesPorNivel * 6;
  sim.estado.dinheiro = 400;
  assert.equal(sim.comprarMelhoria('alaTrigo').sucesso, true);
  return sim;
}

test('trigo custa R$ 400 no nível 7, já pode ser colhido e abastece a prateleira', () => {
  const sim = new Simulacao();
  sim.estado.dinheiro = 400;
  assert.match(sim.comprarMelhoria('alaTrigo').motivo, /nível 7/);
  const aberto = abrirTrigo();
  assert.equal(aberto.estado.dinheiro, 0);
  assert.equal(aberto.estado.estagioLoja, ALA_TRIGO.indice);
  assert.equal(PRODUTOS.trigo.preco, 5);
  assert.equal(aberto.estado.produtos.trigo.horta, PRODUTOS.trigo.capacidadeHorta);
  aberto.tempo = 10;
  Object.assign(aberto.estado.jogador, PRODUTOS.trigo.coleta);
  aberto.interagir();
  assert.deepEqual(aberto.estado.jogador.inventario, ['trigo']);
  assert.equal(aberto.missao().destino, 'prateleiraTrigo');
  aberto.tempo = 11;
  Object.assign(aberto.estado.jogador, PRODUTOS.trigo.reposicao);
  aberto.interagir();
  assert.equal(aberto.estado.produtos.trigo.prateleira, 1);
  const salvo = validarEstado(structuredClone(aberto.estado));
  assert.equal(salvo.estagioLoja, ALA_TRIGO.indice);
  assert.equal(salvo.produtos.trigo.prateleira, 1);
});

test('a ala do trigo se constrói com piso, paredes e andaime animados', () => {
  const cena = new THREE.Scene();
  const mesh = (grupo, x, y, z) => {
    const objeto = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    objeto.position.set(x, y, z); grupo.add(objeto); return objeto;
  };
  const bairro = construirBairro(cena, {
    caixa: (g, w, h, d, cor, x, y, z) => mesh(g, x, y, z),
    cilindro: (g, r1, r2, h, cor, x, y, z) => mesh(g, x, y, z),
    esfera: (g, r, cor, x, y, z) => mesh(g, x, y, z)
  });
  const ala = cena.getObjectByName('ala-trigo');
  const andaime = cena.getObjectByName('andaime-trigo');
  bairro.atualizarEstagio(2);
  assert.equal(ala.visible, false);
  assert.equal(bairro.atualizarEstagio(3), 0);
  bairro.atualizarEstagio(3, 1);
  assert.equal(ala.visible, true);
  assert.equal(andaime.visible, true);
  assert.ok(ala.scale.x > 0 && ala.scale.x < 1);
  bairro.atualizarEstagio(3, 3);
  assert.equal(ala.scale.x, 1);
  assert.equal(andaime.visible, false);
});

test('cliente alcança a nova prateleira e paga R$ 5 pelo trigo', () => {
  const sim = abrirTrigo();
  sim.estado.melhorias.caixa = 1;
  sim.estado.produtos.trigo.prateleira = 1;
  sim.proximoCliente = Infinity;
  sim.proximaId = 2;
  sim.aleatorio = () => 0;
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.clientes[0].produto, 'trigo');
  for (let i = 0; i < 6000 && sim.estado.estatisticas.clientes === CONFIG.clientesPorNivel * 6; i++) sim.atualizar(1 / 60);
  assert.equal(sim.estado.estatisticas.faturamento, 5);
  assert.equal(sim.estado.dinheiro, 5);
  assert.equal(sim.estado.produtos.trigo.prateleira, 0);
});

test('o repositor usa caixa de madeira e consegue levar trigo da fazenda à loja', () => {
  const sim = abrirTrigo();
  sim.estado.melhorias.ajudante = 1;
  sim.estado.produtos.trigo.horta = 2;
  for (const [id, estado] of Object.entries(sim.estado.produtos)) {
    if (id !== 'trigo') estado.prateleira = PRODUTOS[id].capacidadePrateleira;
  }
  for (let i = 0; i < 6000 && sim.estado.produtos.trigo.prateleira < 2; i++) {
    sim.tempo += 1 / 60;
    sim.atualizarAjudante(1 / 60);
    if (sim.ajudante.inventario.includes('trigo')) assert.equal(ajudanteUsaCaixaMadeira(sim.ajudante), true);
  }
  assert.equal(sim.estado.produtos.trigo.prateleira, 2);
  assert.ok(distancia(sim.ajudante, PRODUTOS.trigo.reposicao) < 1);
});
