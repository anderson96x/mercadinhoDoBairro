import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulacao, estadoInicial, validarEstado, distancia } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS, ALA_PRODUCAO, NIVEL_OVOS } from '../src/jogo/configuracao.js';
import * as THREE from 'three';
import { construirBairro } from '../src/jogo/bairro.js';

function bairroVisual() {
  const cena = new THREE.Scene();
  const geometria = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial();
  const mesh = (grupo, x, y, z) => {
    const objeto = new THREE.Mesh(geometria, material);
    objeto.position.set(x, y, z); grupo.add(objeto); return objeto;
  };
  const bairro = construirBairro(cena, {
    caixa: (g, w, h, d, cor, x, y, z) => mesh(g, x, y, z),
    cilindro: (g, a, b, h, cor, x, y, z) => mesh(g, x, y, z),
    esfera: (g, r, cor, x, y, z) => mesh(g, x, y, z)
  });
  return { bairro, ala: cena.getObjectByName('ala-producao'), andaime: cena.getObjectByName('andaime'), rodape: cena.getObjectByName('rodape-frontal') };
}

test('a loja permanece intacta antes da compra e constrói a ala lateral em etapas', () => {
  const { bairro, ala, andaime, rodape } = bairroVisual();
  assert.equal(bairro.atualizarEstagio(0), 0);
  bairro.atualizarEstagio(0, 10);
  assert.equal(ala.visible, false);
  assert.equal(andaime.visible, false);
  assert.equal(rodape.position.x, 4.65);
  assert.equal(rodape.scale.x, 1);
  assert.equal(bairro.atualizarEstagio(1), 0);
  bairro.atualizarEstagio(1, 1);
  assert.equal(ala.visible, true);
  assert.equal(andaime.visible, true);
  assert.ok(ala.scale.x > 0 && ala.scale.x < 1);
  assert.equal(ala.scale.z, 1);
  assert.equal(bairro.atualizarEstagio(1, 3), 1);
  assert.equal(ala.scale.x, 1);
  assert.equal(ala.position.x, 0);
  assert.equal(andaime.visible, false);
  assert.equal(rodape.position.x, 8.15);
  assert.ok(Math.abs(rodape.scale.x - 15.9 / 8.9) < 1e-10);
});

test('carregar uma ala comprada mostra a construção pronta sem repetir a animação', () => {
  const { bairro, ala, andaime } = bairroVisual();
  assert.equal(bairro.atualizarEstagio(1), 1);
  assert.equal(ala.visible, true);
  assert.equal(ala.scale.x, 1);
  assert.equal(andaime.visible, false);
});

test('o ajudante salvo na antiga ala traseira retoma na lateral com sua carga', () => {
  const sim = new Simulacao(); abrirAla(sim);
  sim.estado.melhorias.ajudante = 1;
  Object.assign(sim.ajudante, { x: 3.3, z: -7.55, produto: 'ovos', destino: 'prateleira', inventario: ['ovos'] });
  const retomado = new Simulacao(structuredClone(sim.estado));
  assert.equal(retomado.ajudante.x, PRODUTOS.ovos.coleta.x);
  assert.equal(retomado.ajudante.z, PRODUTOS.ovos.coleta.z);
  assert.deepEqual(retomado.ajudante.inventario, ['ovos']);
  assert.equal(retomado.ajudante.destino, 'prateleira');
});

function abrirAla(sim) {
  sim.estado.estatisticas.clientes = CONFIG.clientesPorNivel * (NIVEL_OVOS - 1);
  sim.estado.dinheiro = 2000;
  assert.equal(sim.comprarMelhoria('milho').sucesso, true);
  assert.equal(sim.comprarMelhoria('alaProducao').sucesso, true);
}

test('ala dos ovos exige milho e nível 5; a construção muda limites, estoque e salvamento', () => {
  const sim = new Simulacao();
  sim.estado.dinheiro = 2000;
  assert.match(sim.comprarMelhoria('alaProducao').motivo, /nível 5/);
  sim.estado.estatisticas.clientes = CONFIG.clientesPorNivel * 4;
  assert.match(sim.comprarMelhoria('alaProducao').motivo, /milho/);
  assert.equal(sim.comprarMelhoria('milho').sucesso, true);
  assert.equal(sim.comprarMelhoria('alaProducao').sucesso, true);
  assert.equal(sim.estado.estagioLoja, 1);
  assert.equal(sim.estado.produtos.ovos.liberado, true);
  assert.equal(sim.estado.produtos.ovos.horta, 0);
  assert.equal(sim.limitesMundo.minZ, CONFIG.limiteMundo.minZ);
  assert.equal(sim.limitesMundo.maxX, ALA_PRODUCAO.limites.maxX);
  assert.ok(sim.limitesMundo.maxX > CONFIG.limiteMundo.maxX);
  assert.equal(sim.comprarMelhoria('ajudante').sucesso, true);
  assert.equal(sim.estado.dinheiro, 850);
  const salvo = validarEstado(structuredClone(sim.estado));
  assert.equal(salvo.estagioLoja, 1);
  assert.equal(salvo.produtos.ovos.liberado, true);
  assert.equal(salvo.melhorias.ajudante, 1);
});

test('milho alimenta moinho, ração alimenta galinhas e ovos chegam à prateleira', () => {
  const sim = new Simulacao();
  abrirAla(sim);
  sim.proximoCliente = Infinity;
  sim.estado.jogador.inventario.push('milho');
  assert.equal(sim.missao().destino, 'moinho');
  Object.assign(sim.estado.jogador, ALA_PRODUCAO.entregaMoinho);
  sim.interagir();
  assert.equal(sim.estado.producao.milhoNoMoinho, 1);
  assert.deepEqual(sim.estado.jogador.inventario, []);
  assert.equal(sim.missao().titulo, 'Espere os primeiros ovos');
  for (let i = 0; i < 140; i++) sim.atualizarProducao(0.05);
  assert.equal(sim.estado.producao.milhoNoMoinho, 0);
  assert.equal(sim.estado.producao.racao, 1);
  assert.equal(sim.estado.produtos.ovos.horta, 1);
  assert.equal(sim.estado.producao.ovosProduzidos, 1);
  assert.equal(sim.missao().destino, 'ovos');
  sim.tempo = 10;
  Object.assign(sim.estado.jogador, PRODUTOS.ovos.coleta);
  sim.interagir();
  assert.equal(sim.estado.produtos.ovos.horta, 0);
  assert.deepEqual(sim.estado.jogador.inventario, ['ovos']);
  assert.equal(sim.missao().destino, 'prateleiraOvos');
  sim.tempo = 11;
  Object.assign(sim.estado.jogador, PRODUTOS.ovos.reposicao);
  sim.interagir();
  assert.equal(sim.estado.produtos.ovos.prateleira, 1);
  assert.deepEqual(sim.estado.jogador.inventario, []);
  assert.equal(sim.missao().titulo, 'Contrate ajuda para repor');
  assert.equal(sim.comprarMelhoria('ajudante').sucesso, true);
  assert.equal(sim.missao().titulo, 'Mantenha a ala funcionando');
  const retomado = new Simulacao(structuredClone(sim.estado));
  assert.equal(retomado.estado.produtos.ovos.prateleira, 1);
  assert.equal(retomado.estado.producao.ovosProduzidos, 1);
});

test('pedidos de ovos aparecem gradualmente depois da primeira produção', () => {
  const sim = new Simulacao();
  abrirAla(sim);
  sim.aleatorio = () => 0;
  for (let i = 0; i < 3; i++) {
    assert.equal(sim.criarCliente(), true);
    assert.notEqual(sim.clientes.at(-1).produto, 'ovos');
    sim.clientes.length = 0;
  }
  sim.estado.producao.ovosProduzidos = 2;
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.clientes.at(-1).produto, 'ovos');
  sim.estado.estatisticas.ovosVendidos = 10;
  sim.clientes.length = 0;
  sim.proximaId = 6;
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.clientes.at(-1).produto, 'ovos');
});

test('cliente visita a nova prateleira, paga pelos ovos e sai', () => {
  const sim = new Simulacao();
  abrirAla(sim);
  sim.proximoCliente = Infinity;
  sim.estado.melhorias.caixa = 1;
  sim.estado.producao.ovosProduzidos = 2;
  sim.estado.produtos.ovos.prateleira = 3;
  sim.aleatorio = () => 0;
  sim.proximaId = 4;
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.clientes[0].produto, 'ovos');
  for (let i = 0; i < 3600 && sim.estado.estatisticas.ovosVendidos === 0; i++) sim.atualizar(1 / 60);
  assert.equal(sim.estado.estatisticas.ovosVendidos, 1);
  assert.equal(sim.estado.produtos.ovos.prateleira, 2);
});

test('ajudante leva os ovos do galinheiro à prateleira enquanto o moinho espera pelo jogador', () => {
  const sim = new Simulacao();
  abrirAla(sim);
  sim.estado.melhorias.ajudante = 1;
  sim.estado.produtos.ovos.horta = 2;
  sim.estado.produtos.tomate.prateleira = PRODUTOS.tomate.capacidadePrateleira;
  sim.estado.produtos.milho.prateleira = PRODUTOS.milho.capacidadePrateleira;
  for (let i = 0; i < 3600 && sim.estado.produtos.ovos.prateleira < 2; i++) {
    sim.tempo += 1 / 60;
    sim.atualizarAjudante(1 / 60);
  }
  assert.equal(sim.estado.produtos.ovos.prateleira, 2);
  assert.equal(sim.estado.producao.milhoNoMoinho, 0);
  assert.equal(sim.estado.producao.racao, 0);
});

test('salvar durante a viagem preserva a carga e o destino do ajudante', () => {
  const sim = new Simulacao();
  abrirAla(sim);
  assert.equal(sim.comprarMelhoria('ajudante').sucesso, true);
  Object.assign(sim.ajudante, { ...PRODUTOS.ovos.coleta, produto: 'ovos', destino: 'prateleira', inventario: ['ovos', 'ovos'] });
  const retomado = new Simulacao(structuredClone(sim.estado));
  assert.deepEqual(retomado.ajudante.inventario, ['ovos', 'ovos']);
  assert.equal(retomado.ajudante.destino, 'prateleira');
  for (let i = 0; i < 2400 && retomado.estado.produtos.ovos.prateleira < 2; i++) {
    retomado.tempo += 1 / 60;
    retomado.atualizarAjudante(1 / 60);
  }
  assert.equal(retomado.estado.produtos.ovos.prateleira, 2);
  assert.deepEqual(retomado.ajudante.inventario, []);
});

test('a ala bloqueia acesso antes da construção e oferece rotas para moinho, ovos e caixa', () => {
  const sim = new Simulacao();
  assert.ok(sim.obstaculos().some(o => o.lateral));
  abrirAla(sim);
  assert.ok(!sim.obstaculos().some(o => o.x === ALA_PRODUCAO.piso.x && o.z === ALA_PRODUCAO.piso.z && o.w === ALA_PRODUCAO.piso.w));
  assert.ok(!sim.obstaculos().some(o => o.lateral));
  const ator = { x: 5.35, z: -5.1, andando: false };
  for (const alvo of [ALA_PRODUCAO.entregaMoinho, PRODUTOS.ovos.coleta, PRODUTOS.ovos.cliente, CONFIG.clienteCaixa]) {
    let chegou = false;
    for (let i = 0; i < 2400 && !chegou; i++) {
      sim.tempo += 1 / 60;
      chegou = sim.caminharCliente(ator, alvo, 1 / 60);
    }
    assert.ok(chegou && distancia(ator, alvo) < 0.03, `rota para ${JSON.stringify(alvo)}`);
  }
});

test('salvamentos antigos preservam compras e não liberam a ala nova', () => {
  const antigo = estadoInicial();
  delete antigo.estagioLoja;
  delete antigo.producao;
  delete antigo.produtos.ovos;
  antigo.estatisticas.clientes = 75;
  antigo.dinheiro = 690;
  antigo.melhorias.milho = 1;
  antigo.melhorias.ajudante = 1;
  const salvo = validarEstado(antigo);
  assert.equal(salvo.dinheiro, 690);
  assert.equal(salvo.estatisticas.clientes, 75);
  assert.equal(salvo.melhorias.milho, 1);
  assert.equal(salvo.melhorias.ajudante, 1);
  assert.equal(salvo.estagioLoja, 0);
  assert.equal(salvo.produtos.ovos.liberado, false);
});
