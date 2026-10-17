import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG } from '../src/jogo/configuracao.js';
import { PLANTA_ESTACIONAMENTO as P } from '../src/jogo/planta.js';
import { pontoPortaCarro, volumeCarro } from '../src/jogo/estacionamento-clientes.js';
import { construirEstacionamento } from '../src/jogo/estacionamento.js';
import { salvar } from '../src/jogo/salvamento.js';
import { MODELOS_CARROS, dimensoesCarro, Trafego } from '../src/jogo/trafego.js';

function preparar() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 15 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 10000; sim.comprarMelhoria('estacionamento');
  sim.estado.lojaAberta = true; sim.estado.melhorias.caixa = 1;
  sim.proximoCliente = Infinity; sim.definirAssaltosAtivos(false);
  sim.tempo = 5;
  return sim;
}
function passo(sim) {
  sim.tempo += 0.05;
  sim.estado.produtos.tomate.prateleira = 10;
  sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
}
function ate(sim, condicao, maximo = 6000) {
  for (let i = 0; i < maximo && !condicao(); i++) passo(sim);
  assert.ok(condicao(), JSON.stringify(sim.clientes.map(c => ({ fase: c.fase, x: c.x, z: c.z, carro: sim.estacionamento.carroCliente(c) }))));
}
function sobrepoeIlha(carro) {
  const { comprimento, largura } = dimensoesCarro(MODELOS_CARROS[carro.modelo]);
  const frente = { x: Math.cos(carro.angulo), z: -Math.sin(carro.angulo) };
  const lado = { x: -frente.z, z: frente.x };
  return [frente, lado, { x: 1, z: 0 }, { x: 0, z: 1 }].every(eixo => {
    const distancia = Math.abs((carro.x - P.ilha.x) * eixo.x + (carro.z - P.ilha.z) * eixo.z);
    const raioCarro = Math.abs(frente.x * eixo.x + frente.z * eixo.z) * comprimento / 2
      + Math.abs(lado.x * eixo.x + lado.z * eixo.z) * largura / 2;
    const raioIlha = Math.abs(eixo.x) * P.ilha.w / 2 + Math.abs(eixo.z) * P.ilha.d / 2;
    return distancia < raioCarro + raioIlha;
  });
}

test('construção fica vazia e espera a obra terminar antes da primeira chegada', () => {
  const sim = preparar(); sim.tempo = 0;
  assert.equal(sim.estacionamento.carros.length, 0);
  assert.equal(sim.criarCliente(), false);
  sim.tempo = 4;
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.clientes[0].noCarro, true);
  assert.equal(sim.estacionamento.carros[0].fase, 'aguardando');
  assert.equal(new Simulacao(sim.estado).estacionamento.carros.length, 0);
});

test('cliente dirige, estaciona, desembarca, compra, paga, volta ao próprio carro e vai embora', () => {
  const sim = preparar(); sim.criarCliente();
  const cliente = sim.clientes[0], carro = sim.estacionamento.carros[0];
  const fases = new Set(); let abriuPorta = false, saiuComSacola = false;
  const antes = sim.estado.estatisticas.clientes;
  for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
    passo(sim); fases.add(carro.fase);
    abriuPorta ||= carro.porta > 0.9;
    saiuComSacola ||= cliente.fase === 'saindo' && cliente.levaSacolas;
  }
  assert.equal(cliente.fase, 'fim');
  assert.equal(sim.estado.estatisticas.clientes, antes + 1);
  assert.ok(abriuPorta && saiuComSacola);
  for (const fase of ['chegando', 'desembarcando', 'estacionado', 'embarcando', 're', 'engatando', 'partindo', 'fim']) assert.ok(fases.has(fase), fase);
  assert.equal(sim.estacionamento.carros.length, 0);
  assert.equal(sim.cestasEmUso, 0);
});

test('todas as vagas têm rotas contínuas, carros dentro do asfalto e acesso de pedestres', () => {
  for (let vaga = 0; vaga < P.vagas.length; vaga++) {
    const sim = preparar(); sim.criarCliente();
    const cliente = sim.clientes[0], carro = sim.estacionamento.carros[0];
    carro.vaga = vaga;
    let anterior = { ...carro };
    const conferirRota = () => {
      assert.ok(Math.hypot(carro.x - anterior.x, carro.z - anterior.z) < 0.24, 'sem teletransporte');
      if (carro.z < 5) {
        const volume = volumeCarro(carro);
        assert.ok(volume.x - volume.w / 2 >= P.piso.x - P.piso.w / 2 - 0.05, 'borda esquerda');
        assert.ok(volume.x + volume.w / 2 <= P.piso.x + P.piso.w / 2 + 0.05, 'borda direita');
        assert.ok(volume.z - volume.d / 2 >= P.piso.z - P.piso.d / 2, 'borda do fundo');
        assert.equal(sobrepoeIlha(carro), false, `não atravessa a ilha: ${JSON.stringify(carro)}`);
      }
      const giro = Math.atan2(Math.sin(carro.angulo - anterior.angulo), Math.cos(carro.angulo - anterior.angulo));
      assert.ok(Math.abs(giro) < 0.25, 'orientação acompanha a curva sem saltos');
      anterior = { ...carro };
    };
    ate(sim, () => { conferirRota(); return carro.fase === 'estacionado'; });
    assert.ok(Math.hypot(carro.x - P.vagas[vaga].x, carro.z - P.vagas[vaga].z) < 0.01);
    assert.ok(Math.hypot(cliente.x - pontoPortaCarro(carro).x, cliente.z - pontoPortaCarro(carro).z) < 0.2);
    ate(sim, () => { conferirRota(); return cliente.fase === 'fim'; });
    assert.equal(cliente.embalado, true, `vaga ${vaga}: compra completa`);
  }
});

test('trânsito e pedestres seguram a manobra; pausa não movimenta o carro', () => {
  const sim = preparar(); sim.criarCliente();
  const carro = sim.estacionamento.carros[0]; sim.estacionamento.transitoLivre = false;
  for (let i = 0; i < 100; i++) passo(sim);
  assert.equal(carro.fase, 'aguardando');
  sim.estacionamento.transitoLivre = true;
  ate(sim, () => carro.fase === 'chegando');
  Object.assign(sim.estado.jogador, { x: carro.x - 1.3, z: carro.z });
  const x = carro.x;
  for (let i = 0; i < 100; i++) passo(sim);
  assert.equal(carro.x, x);
  Object.assign(sim.estado.jogador, CONFIG.inicio);
  sim.pausado = true; sim.atualizar(0.05);
  assert.equal(carro.x, x);
  sim.pausado = false; passo(sim);
  assert.ok(carro.x < x);
});

test('modelos animam rodas e porta e são removidos quando a viagem termina', () => {
  const sim = preparar(); sim.criarCliente();
  const visual = construirEstacionamento(), carro = sim.estacionamento.carros[0];
  const trafego = new Trafego(new THREE.Scene());
  trafego.proximoModelo = () => MODELOS_CARROS[carro.modelo];
  trafego.criarNaFaixa(0);
  const existente = trafego.retirarParaEstacionar().grupo;
  const escala = existente.scale.clone();
  visual.receberCarro(carro.clienteId, existente);
  ate(sim, () => carro.fase === 'desembarcando' && carro.porta > 0.9);
  visual.atualizar(true, 0.05, sim.estacionamento.carros, sim.tempo);
  const modelo = visual.carros.get(carro.clienteId);
  assert.equal(modelo, existente, 'mesmo objeto que já circulava na rua');
  assert.deepEqual(modelo.scale, escala, 'sem redução de escala');
  assert.ok(modelo.userData.porta.rotation.y < -0.9);
  assert.ok(Math.abs(modelo.userData.rodas[0].rotation.z) > 1);
  modelo.updateMatrixWorld(true);
  assert.ok(new THREE.Box3().setFromObject(modelo).getSize(new THREE.Vector3()).x < 3.4);
  visual.atualizar(true, 0.05, []);
  assert.equal(visual.carros.size, 0);
  assert.equal(modelo.parent, null);
});

test('lotação reserva seis vagas únicas, impede sobreposição e libera as vagas após as compras', () => {
  const sim = preparar(); sim.estado.melhorias.cestasExtras = 1; sim.estado.melhorias.caixa = 0;
  for (let i = 0; i < 6; i++) {
    assert.equal(sim.criarCliente(), true);
    const cliente = sim.clientes.at(-1);
    ate(sim, () => cliente.fase === 'fila');
  }
  assert.equal(sim.estacionamento.carros.length, 6);
  assert.equal(new Set(sim.estacionamento.carros.map(c => c.vaga)).size, 6);
  assert.equal(sim.criarCliente(), false);
  sim.estado.melhorias.caixa = 1;
  ate(sim, () => sim.clientes.length === 0, 12000);
  assert.equal(sim.estacionamento.carros.length, 0);
  assert.equal(sim.estado.estatisticas.clientes, 15 * CONFIG.clientesPorNivel + 6);
  assert.equal(sim.criarCliente(), true);
});

test('loja fechada durante a chegada devolve o cliente ao carro sem venda', () => {
  const sim = preparar(); sim.criarCliente();
  const cliente = sim.clientes[0]; sim.estado.lojaAberta = false;
  ate(sim, () => cliente.fase === 'fim');
  assert.equal(sim.estado.estatisticas.clientes, 15 * CONFIG.clientesPorNivel);
  assert.equal(sim.estacionamento.carros.length, 0);
  assert.equal(sim.cestasEmUso, 0);
});

test('partida reserva a rua durante a troca de marcha e salvar não duplica compras pagas', () => {
  const sim = preparar(); sim.criarCliente();
  ate(sim, () => sim.estacionamento.carros[0]?.fase === 'engatando');
  assert.equal(sim.estacionamento.reservaRua, true);
  assert.equal(sim.clientes[0].embalado, true);
  sim.estado.produtos.tomate.prateleira = 0;
  const anterior = globalThis.localStorage; let salvo;
  globalThis.localStorage = { setItem: (_, valor) => { salvo = JSON.parse(valor); } };
  try {
    assert.equal(salvar(sim.estado, sim.clientes), true);
    assert.equal(salvo.produtos.tomate.prateleira, 0);
    const restaurada = new Simulacao(salvo);
    assert.equal(restaurada.estacionamento.carros.length, 0);
    assert.equal(restaurada.clientes.length, 0);
  } finally {
    if (anterior === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = anterior;
  }
});
