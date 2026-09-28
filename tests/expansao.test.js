import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulacao, estadoInicial, validarEstado, distancia } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS, ALA_PRODUCAO, NIVEL_OVOS } from '../src/jogo/configuracao.js';

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
  assert.equal(sim.limitesMundo.minZ, ALA_PRODUCAO.limites.minZ);
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
  Object.assign(sim.estado.jogador, { x: ALA_PRODUCAO.moinho.x, z: -7.8 });
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
  assert.ok(sim.obstaculos().some(o => o.x === ALA_PRODUCAO.piso.x && o.z === ALA_PRODUCAO.piso.z));
  abrirAla(sim);
  assert.ok(!sim.obstaculos().some(o => o.x === ALA_PRODUCAO.piso.x && o.z === ALA_PRODUCAO.piso.z && o.w === ALA_PRODUCAO.piso.w));
  const ator = { x: 5.35, z: -5.1, andando: false };
  for (const alvo of [{ x: 5.55, z: -7.8 }, PRODUTOS.ovos.coleta, PRODUTOS.ovos.cliente, CONFIG.clienteCaixa]) {
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
