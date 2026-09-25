import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETAS, PERSONALIZACAO_PADRAO, validarPersonalizacao } from '../src/jogo/personalizacao.js';
import { estadoInicial, validarEstado, Simulacao } from '../src/jogo/simulacao.js';

test('jogos antigos recebem identidade padrão sem perder progresso', () => {
  const salvo = estadoInicial(); delete salvo.personalizacao; salvo.dinheiro = 456;
  const carregado = validarEstado(salvo);
  assert.deepEqual(carregado.personalizacao, PERSONALIZACAO_PADRAO);
  assert.equal(carregado.dinheiro, 456);
});

test('estado aberto ou fechado do mercado é preservado', () => {
  const estado = estadoInicial(); estado.lojaAberta = false;
  assert.equal(validarEstado(JSON.parse(JSON.stringify(estado))).lojaAberta, false);
  delete estado.lojaAberta;
  assert.equal(validarEstado(JSON.parse(JSON.stringify(estado))).lojaAberta, true);
});

test('nome, slogan e as oito paletas sobrevivem ao salvamento', () => {
  assert.equal(PALETAS.length, 8);
  assert.equal(new Set(PALETAS.map(p => p.id)).size, 8);
  for (const paleta of PALETAS) {
    const estado = estadoInicial();
    estado.personalizacao = { nome: 'Armazém da Praça', slogan: 'Fresco & feito com carinho', paleta: paleta.id };
    assert.deepEqual(validarEstado(JSON.parse(JSON.stringify(estado))).personalizacao, estado.personalizacao);
  }
  const invalido = validarPersonalizacao({ nome: ' ', slogan: 'x'.repeat(100), paleta: 'inexistente' });
  assert.equal(invalido.nome, PERSONALIZACAO_PADRAO.nome);
  assert.equal(invalido.slogan.length, 60);
  assert.equal(invalido.paleta, 'horta');
});

test('funcionário usa o vão de serviço em ambos os sentidos', () => {
  const sim = new Simulacao(); sim.estado.melhorias.ajudante = 1;
  sim.proximoCliente = 999; sim.estado.jogador.x = -9;
  let paraHorta = 0, paraLoja = 0;
  for (let i = 0; i < 60 * 40; i++) {
    const antes = { x: sim.ajudante.x, z: sim.ajudante.z };
    sim.atualizar(1 / 60);
    const depois = sim.ajudante;
    if ((antes.x + 3.1) * (depois.x + 3.1) < 0) {
      assert.ok(depois.z > -0.8 && depois.z < 2.2, 'travessia precisa estar na porta');
      if (depois.x < antes.x) paraHorta++; else paraLoja++;
    }
  }
  assert.ok(paraHorta > 0 && paraLoja > 0);
  assert.ok(sim.estado.produtos.tomate.prateleira > 0);
});
