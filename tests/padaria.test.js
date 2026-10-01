import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao, validarEstado } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS, ALA_PADARIA } from '../src/jogo/configuracao.js';
import { Cena, aplicarPaletaFuncionario } from '../src/jogo/cena.js';
import { PALETAS } from '../src/jogo/personalizacao.js';
import { construirBairro } from '../src/jogo/bairro.js';

function abrirPadaria() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = CONFIG.clientesPorNivel * (ALA_PADARIA.nivelMinimo - 1);
  sim.estado.melhorias.alaProducao = 1;
  sim.estado.melhorias.alaTrigo = 1;
  sim.estado.produtos.trigo.liberado = true;
  sim.estado.produtos.trigo.horta = 3;
  sim.estado.dinheiro = ALA_PADARIA.custo;
  assert.equal(sim.comprarMelhoria('alaPadaria').sucesso, true);
  return sim;
}

test('padaria exige nível 9, trigo e R$ 1.400; trigo entregue vira farinha e três pães', () => {
  const bloqueado = new Simulacao();
  bloqueado.estado.dinheiro = ALA_PADARIA.custo;
  assert.match(bloqueado.comprarMelhoria('alaPadaria').motivo, /nível 9/);
  const sim = abrirPadaria();
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(sim.estado.estagioLoja, ALA_PADARIA.indice);
  assert.equal(PRODUTOS.pao.preco, 10);
  sim.estado.jogador.inventario.push('trigo');
  Object.assign(sim.estado.jogador, PRODUTOS.pao.reposicao);
  assert.ok(sim.obstaculos().some(item => item.x === ALA_PADARIA.entrada.x && item.z === ALA_PADARIA.entrada.z));
  assert.ok(!sim.obstaculos().some(item => Math.abs(PRODUTOS.pao.reposicao.x - item.x) < item.w / 2 && Math.abs(PRODUTOS.pao.reposicao.z - item.z) < item.d / 2));
  sim.tempo = 1;
  sim.interagir();
  assert.equal(sim.estado.producao.trigoPadaria, 1);
  assert.deepEqual(sim.estado.jogador.inventario, []);
  sim.atualizarProducao(ALA_PADARIA.tempoMoagem);
  assert.equal(sim.estado.producao.farinha, 1);
  sim.atualizarProducao(ALA_PADARIA.tempoForno);
  assert.equal(sim.estado.produtos.pao.prateleira, 3);
  const retomado = validarEstado(structuredClone(sim.estado));
  assert.equal(retomado.produtos.pao.prateleira, 3);
  assert.equal(retomado.producao.paesProduzidos, 3);
});

test('todo cliente da padaria pede pelo menos três pães e consegue comprar e pagar', () => {
  const sim = abrirPadaria();
  sim.estado.melhorias.caixa = 1;
  sim.estado.produtos.pao.prateleira = 18;
  sim.proximoCliente = Infinity;
  sim.aleatorio = () => 0;
  assert.equal(sim.criarCliente(), true);
  const cliente = sim.clientes[0];
  assert.equal(cliente.compras[0].produto, 'pao');
  assert.ok(cliente.compras[0].desejado >= 3);
  for (let i = 0; i < 6000 && sim.estado.estatisticas.clientes === CONFIG.clientesPorNivel * 8; i++) sim.atualizar(1 / 60);
  assert.ok(sim.estado.estatisticas.clientes > CONFIG.clientesPorNivel * 8);
  assert.ok(sim.estado.estatisticas.faturamento >= 30);
  assert.equal(sim.estado.produtos.pao.prateleira, 15);
});

test('vitrine fica em frente aos ovos e tem dois padeiros de avental e chapéu branco', () => {
  const visual = { cena: new THREE.Scene(), produtos: {}, sim: new Simulacao(), criarLabel() {} };
  Cena.prototype.construirPadaria.call(visual);
  const { grupo, padeiros, frutas } = visual.produtos.pao;
  assert.equal(grupo.name, 'padaria');
  assert.equal(padeiros.length, 2);
  assert.equal(frutas.length, PRODUTOS.pao.capacidadePrateleira);
  assert.ok(PRODUTOS.pao.prateleira.z > PRODUTOS.ovos.prateleira.z);
  const vitrine = grupo.getObjectByName('vitrine-paes');
  assert.ok(vitrine);
  assert.equal(vitrine.children.filter(item => item.name === 'tampo-paes').length, 1);
  const tampo = vitrine.getObjectByName('tampo-paes');
  assert.equal(tampo.material.transparent, true);
  assert.equal(vitrine.children.filter(item => item.geometry?.parameters?.width > 2 && item.geometry?.parameters?.depth > 1).length, 1);
  assert.ok(frutas.every(pao => pao.position.y > tampo.position.y + 0.02));
  assert.ok(grupo.getObjectByName('entrega-trigo-padaria').position.x < PRODUTOS.pao.prateleira.x);
  assert.equal(visual.produtos.pao.trigosRecebidos.length, ALA_PADARIA.capacidadeTrigo);
  assert.ok(grupo.getObjectByName('area-padeiros'));
  const triturador = grupo.getObjectByName('triturador-padaria');
  assert.ok(triturador.position.x < PRODUTOS.pao.prateleira.x);
  assert.ok(new THREE.Box3().setFromObject(triturador).max.y < 2);
  assert.equal(triturador.getObjectByName('corpo-triturador').material.color.getHex(), 0xadb7b9);
  assert.equal(triturador.getObjectByName('corpo-triturador').material.metalness, 0.58);
  const rotor = triturador.getObjectByName('rotor-metal-padaria');
  assert.equal(rotor, visual.produtos.pao.rotor);
  assert.equal(rotor.children.filter(item => item.geometry?.type === 'BoxGeometry').length, 3);
  assert.ok(rotor.children.some(item => item.position.x !== 0));
  assert.ok(triturador.children.every(item => !item.children.some(parte => parte.material?.color?.getHex() === 0xe4bc57)));
  assert.equal(grupo.getObjectByName('base-madeira-padaria').material.color.getHex(), 0x936238);
  assert.ok(grupo.getObjectByName('forno-padaria').position.x > PRODUTOS.pao.prateleira.x);
  assert.ok(frutas.every(pao => pao.position.y === frutas[0].position.y));
  assert.ok(frutas[12].position.z > frutas[0].position.z);
  for (const padeiro of padeiros) {
    const avental = padeiro.getObjectByName('avental-padaria');
    const chapeu = padeiro.getObjectByName('chapeu-padaria');
    assert.ok(avental.children.length >= 7);
    assert.ok(avental.children.every(item => [0xffffff, 0xfaf8f1].includes(item.material.color.getHex())));
    assert.ok(chapeu.children.every(item => item.material.color.getHex() === 0xffffff));
    aplicarPaletaFuncionario(padeiro, PALETAS[2]);
    assert.equal(padeiro.userData.torso.material.color.getHex(), new THREE.Color(PALETAS[2].principal).getHex());
    assert.equal(padeiro.userData.pernaE.material.color.getHex(), 0x17191b);
    assert.ok(avental.children.every(item => [0xffffff, 0xfaf8f1].includes(item.material.color.getHex())));
    assert.ok(chapeu.children.every(item => item.material.color.getHex() === 0xffffff));
  }
});

test('os dois padeiros caminham entre entrega, máquinas e vitrine', () => {
  const visual = { cena: new THREE.Scene(), produtos: {}, sim: new Simulacao(), criarLabel() {},
    animarPersonagem(modelo, ator) { modelo.position.set(ator.x, 0.23, ator.z); } };
  Cena.prototype.construirPadaria.call(visual);
  const padaria = visual.produtos.pao;
  const amostra = tempo => {
    Cena.prototype.animarPadeiros.call(visual, padaria, { trigoPadaria: 1, farinha: 1, paesProduzidos: 3 }, tempo, 1 / 60);
    return padaria.padeiros.map(padeiro => padeiro.position.clone());
  };
  const inicio = amostra(0);
  amostra(0.8);
  assert.equal(padaria.padeiros[0].userData.cargaPadaria.visible, true);
  assert.equal(padaria.padeiros[1].userData.cargaPadaria.visible, false);
  const maquinas = amostra(1.5);
  assert.equal(padaria.padeiros[0].userData.cargaPadaria.visible, true);
  const vitrine = amostra(3.8);
  assert.equal(padaria.padeiros[0].userData.cargaPadaria.visible, false);
  assert.equal(padaria.padeiros[1].userData.cargaPadaria.visible, true);
  assert.ok(padaria.padeiros[0].userData.cargaPadaria.children.length > 0);
  assert.ok(padaria.padeiros[1].userData.cargaPadaria.children.length > 0);
  assert.ok(maquinas[0].x > inicio[0].x);
  assert.ok(maquinas[1].x > inicio[1].x);
  assert.ok(vitrine[1].z < maquinas[1].z);
  assert.ok(vitrine[0].x > maquinas[0].x);
});

test('construir a padaria mantém a ala do trigo pronta durante a animação', () => {
  const cena = new THREE.Scene();
  const mesh = (grupo, x, y, z) => {
    const item = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    item.position.set(x, y, z); grupo.add(item); return item;
  };
  const bairro = construirBairro(cena, {
    caixa: (g, w, h, d, cor, x, y, z) => mesh(g, x, y, z),
    cilindro: (g, r1, r2, h, cor, x, y, z) => mesh(g, x, y, z),
    esfera: (g, r, cor, x, y, z) => mesh(g, x, y, z)
  });
  bairro.atualizarEstagio(3);
  bairro.atualizarEstagio(4);
  const trigo = cena.getObjectByName('ala-trigo');
  assert.equal(trigo.scale.x, 1);
  assert.equal(cena.getObjectByName('andaime-trigo').visible, false);
  assert.ok(bairro.atualizarEstagio(4, 3.5) > 0);
});
