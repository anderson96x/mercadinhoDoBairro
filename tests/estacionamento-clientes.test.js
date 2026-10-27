import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao } from '../src/jogo/simulacao.js';
import { CONFIG } from '../src/jogo/configuracao.js';
import { PLANTA_ESTACIONAMENTO as P } from '../src/jogo/planta.js';
import { pontoPortaCarro, volumeCarro } from '../src/jogo/estacionamento-clientes.js';
import { construirEstacionamento } from '../src/jogo/estacionamento.js';
import { salvar } from '../src/jogo/salvamento.js';
import { criarCarro, MODELOS_CARROS, dimensoesCarro, Trafego } from '../src/jogo/trafego.js';

function preparar() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 15 * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 10000; sim.comprarMelhoria('estacionamento');
  sim.estado.lojaAberta = true; sim.estado.melhorias.caixa = 1;
  sim.proximoCliente = Infinity; sim.definirAssaltosAtivos(false);
  sim.tempo = 5;
  sim.aleatorio = () => 0;
  return sim;
}
function passo(sim, dt = 0.05) {
  sim.tempo += dt;
  sim.estado.produtos.tomate.prateleira = 10;
  sim.atualizarClientes(dt); sim.atualizarCaixa(dt);
}
function ate(sim, condicao, maximo = 6000) {
  for (let i = 0; i < maximo && !condicao(); i++) passo(sim);
  assert.ok(condicao(), JSON.stringify(sim.clientes.map(c => ({ fase: c.fase, x: c.x, z: c.z, carro: sim.estacionamento.carroCliente(c) }))));
}
function sobrepoeIlha(carro, obstaculo = P.ilha) {
  const { comprimento, largura } = dimensoesCarro(MODELOS_CARROS[carro.modelo]);
  const frente = { x: Math.cos(carro.angulo), z: -Math.sin(carro.angulo) };
  const lado = { x: -frente.z, z: frente.x };
  return [frente, lado, { x: 1, z: 0 }, { x: 0, z: 1 }].every(eixo => {
    const distancia = Math.abs((carro.x - obstaculo.x) * eixo.x + (carro.z - obstaculo.z) * eixo.z);
    const raioCarro = Math.abs(frente.x * eixo.x + frente.z * eixo.z) * comprimento / 2
      + Math.abs(lado.x * eixo.x + lado.z * eixo.z) * largura / 2;
    const raioIlha = Math.abs(eixo.x) * obstaculo.w / 2 + Math.abs(eixo.z) * obstaculo.d / 2;
    return distancia < raioCarro + raioIlha;
  });
}

test('motoristas pedem uma cesta cheia com pouca variedade, pão e qualquer reputação', () => {
  for (const reputacao of [20, 60, 80, 100]) for (const produtos of [['tomate'], ['pao'], ['tomate', 'pao'], ['tomate', 'milho', 'morango', 'trigo', 'pao']]) {
    const sim = preparar();
    sim.estado.satisfacoesRecentes = Array.from({ length: CONFIG.tamanhoHistoricoReputacao }, (_, i) => i < reputacao / 10 ? 'feliz' : 'irritado');
    assert.equal(sim.reputacao, reputacao);
    for (const [id, estado] of Object.entries(sim.estado.produtos)) {
      estado.liberado = produtos.includes(id);
      estado.apresentado = estado.liberado;
    }
    assert.equal(sim.criarCliente(), true);
    const cliente = sim.clientes[0];
    assert.ok(cliente.carroId);
    assert.equal(cliente.compras.reduce((total, compra) => total + compra.desejado, 0), CONFIG.capacidadeCestaCliente);
    assert.ok(cliente.compras.every(compra => produtos.includes(compra.produto) && compra.desejado > 0));
  }
});

test('pedestres mantêm pedidos variáveis mesmo com estacionamento comprado', () => {
  const sim = preparar();
  sim.aleatorio = () => 0.8;
  assert.equal(sim.criarCliente(), true);
  const cliente = sim.clientes[0];
  assert.equal(cliente.carroId, undefined);
  assert.equal(cliente.compras.reduce((total, compra) => total + compra.desejado, 0), 1 + Math.floor(0.8 * sim.limitePedidoCliente));
});

test('motorista reage à falta de estoque pelo fluxo normal e paga somente o que encontrou', () => {
  for (const estoque of [0, 2]) {
    const sim = preparar();
    sim.estado.produtos.tomate.prateleira = estoque;
    sim.criarCliente();
    const cliente = sim.clientes[0];
    for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
      sim.tempo += 0.05;
      sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
    }
    assert.equal(cliente.fase, 'fim');
    assert.equal(cliente.quantidade, estoque);
    assert.equal(cliente.satisfacao, estoque ? 'neutro' : 'irritado');
    assert.equal(sim.estado.estatisticas.faturamento, estoque * sim.produtos.tomate.preco);
    assert.equal(sim.estado.produtos.tomate.prateleira, 0);
  }
});

test('construção fica vazia e espera a obra terminar antes da primeira chegada', () => {
  const sim = preparar(); sim.tempo = 0;
  assert.equal(sim.estacionamento.carros.length, 0);
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.clientes[0].carroId, undefined, 'pedestres continuam chegando durante a obra');
  sim.clientes = [];
  sim.tempo = 4;
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.clientes[0].noCarro, true);
  assert.equal(sim.estacionamento.carros[0].fase, 'aguardando');
  assert.equal(new Simulacao(sim.estado).estacionamento.carros.length, 0);
});

test('a 60 FPS, cliente dirige, estaciona, desembarca, compra, paga, volta ao próprio carro e vai embora', () => {
  const sim = preparar(); sim.criarCliente();
  const cliente = sim.clientes[0], carro = sim.estacionamento.carros[0];
  const fases = new Set(), direcoes = new Set(); let abriuPorta = false, saiuComSacola = false, freou = false;
  const antes = sim.estado.estatisticas.clientes;
  for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
    passo(sim, 1 / 60); fases.add(carro.fase);
    if (carro.direcaoCurva) direcoes.add(carro.direcaoCurva);
    freou ||= carro.freando;
    abriuPorta ||= carro.porta > 0.9;
    saiuComSacola ||= cliente.fase === 'saindo' && cliente.levaSacolas;
  }
  assert.equal(cliente.fase, 'fim');
  assert.equal(sim.estado.estatisticas.clientes, antes + 1);
  assert.equal(cliente.quantidade, CONFIG.capacidadeCestaCliente, 'motorista compra a cesta cheia com estoque disponível');
  assert.equal(sim.estado.estatisticas.faturamento, CONFIG.capacidadeCestaCliente * sim.produtos.tomate.preco);
  assert.ok(abriuPorta && saiuComSacola);
  assert.deepEqual(direcoes, new Set(['direita', 'esquerda']));
  assert.equal(freou, true);
  for (const fase of ['chegando', 'desembarcando', 'estacionado', 'embarcando', 're', 'engatando', 'partindo', 'fim']) assert.ok(fases.has(fase), fase);
  assert.equal(sim.estacionamento.carros.length, 0);
  assert.equal(sim.cestasEmUso, 0);
});

test('vinte modelos da rua, em tamanho original, percorrem todas as vagas sem atravessar asfalto ou canteiro', () => {
  for (let modelo = 0; modelo < MODELOS_CARROS.length; modelo++) for (let vaga = 0; vaga < P.vagas.length; vaga++) {
    const sim = preparar(); sim.criarCliente();
    const cliente = sim.clientes[0], carro = sim.estacionamento.carros[0];
    carro.vaga = vaga;
    carro.modelo = modelo;
    let anterior = { ...carro };
    const conferirRota = () => {
      assert.ok(Math.hypot(carro.x - anterior.x, carro.z - anterior.z) < 0.24, 'sem teletransporte');
      if (carro.z < 5) {
        const volume = volumeCarro(carro);
        assert.ok(volume.x - volume.w / 2 >= P.piso.x - P.piso.w / 2 - 0.05, 'borda esquerda');
        assert.ok(volume.x + volume.w / 2 <= P.piso.x + P.piso.w / 2 + 0.05, 'borda direita');
        assert.ok(volume.z - volume.d / 2 >= P.piso.z - P.piso.d / 2, 'borda do fundo');
        assert.equal(sobrepoeIlha(carro), false, `não atravessa a ilha: ${JSON.stringify(carro)}`);
        const maior = dimensoesCarro(MODELOS_CARROS[13]);
        for (const [i, outra] of P.vagas.entries()) if (i !== vaga) {
          assert.equal(sobrepoeIlha(carro, { ...outra, w: maior.comprimento, d: maior.largura }), false,
            `não atravessa carro na vaga ${i}: ${JSON.stringify(carro)}`);
        }
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

test('piscas acompanham o lado da curva e luzes de freio acendem apenas ao frear', () => {
  const visual = construirEstacionamento();
  const modelo = criarCarro(MODELOS_CARROS[0], true);
  visual.receberCarro(1, modelo);
  const estado = { clienteId: 1, x: 0, z: 0, angulo: 0, porta: 0, rodas: 0,
    velocidade: 1, fase: 'chegando', direcaoCurva: 'esquerda', freando: false };
  visual.atualizar(true, 0.05, [estado], 0.2);
  const piscas = modelo.userData.luzes.filter(luz => luz.name === 'pisca');
  const freios = modelo.userData.luzes.filter(luz => luz.name === 'luz-freio');
  assert.ok(piscas.filter(luz => luz.userData.lado === 'esquerda').every(luz => luz.material.emissiveIntensity > 0));
  assert.ok(piscas.filter(luz => luz.userData.lado === 'direita').every(luz => luz.material.emissiveIntensity === 0));
  assert.ok(freios.every(luz => luz.material.emissiveIntensity === 0));

  estado.direcaoCurva = 'direita'; estado.freando = true;
  visual.atualizar(true, 0.05, [estado], 0.2);
  assert.ok(piscas.filter(luz => luz.userData.lado === 'direita').every(luz => luz.material.emissiveIntensity > 0));
  assert.ok(piscas.filter(luz => luz.userData.lado === 'esquerda').every(luz => luz.material.emissiveIntensity === 0));
  assert.ok(freios.every(luz => luz.material.emissiveIntensity > 0));
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
  assert.equal(sim.criarCliente(), true);
  assert.equal(sim.clientes.at(-1).carroId, undefined, 'lotação não bloqueia clientes a pé');
  sim.estado.melhorias.caixa = 1;
  ate(sim, () => sim.clientes.length === 0, 12000);
  assert.equal(sim.estacionamento.carros.length, 0);
  assert.equal(sim.estado.estatisticas.clientes, 15 * CONFIG.clientesPorNivel + 7);
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

test('pedestres, compradores a pé e motoristas coexistem sem bloquear o fluxo da calçada', () => {
  const sim = preparar();
  sim.aleatorio = () => 0.8;
  sim.criarCliente(); const pedestre = sim.clientes.at(-1);
  assert.equal(pedestre.fase, 'chegando'); assert.equal(pedestre.carroId, undefined);
  sim.aleatorio = () => 0;
  sim.estacionamento.receberDoTrafego = () => null;
  sim.criarCliente(); const motorista = sim.clientes.at(-1);
  assert.equal(motorista.fase, 'dirigindo');
  sim.criarCliente(); const outroPedestre = sim.clientes.at(-1);
  assert.equal(outroPedestre.fase, 'chegando', 'manobra não interrompe chegada a pé');
  while (sim.cestasDisponiveis > 0) {
    for (const [i, c] of sim.clientes.entries()) if (!c.noCarro) Object.assign(c, { x: i, z: 8.4 });
    assert.equal(sim.criarCliente(), true);
  }
  for (const [i, c] of sim.clientes.entries()) if (!c.noCarro) Object.assign(c, { x: i, z: 8.4 });
  sim.criarCliente(); const passante = sim.clientes.at(-1);
  assert.equal(passante.fase, 'passando');
  assert.equal(passante.carroId, undefined);
  ate(sim, () => pedestre.embalado && outroPedestre.embalado && passante.fase === 'fim');
  assert.equal(sim.estacionamento.carroCliente(motorista).fase, 'aguardando', 'aguardar carro não congela pedestres');
});

test('estacionamento transfere o carro da rua com modelo, posição, escala e rodas intactos', () => {
  const sim = preparar(), cena = new THREE.Scene(), trafego = new Trafego(cena);
  const visual = construirEstacionamento(); cena.add(visual.grupo);
  sim.criarCliente(); const estado = sim.estacionamento.carros[0];
  sim.estacionamento.receberDoTrafego = id => {
    const carro = trafego.retirarParaEstacionar();
    if (!carro) return null;
    visual.receberCarro(id, carro.grupo);
    return { modelo: MODELOS_CARROS.indexOf(carro.modelo), x: carro.grupo.position.x,
      z: carro.grupo.position.z, angulo: carro.grupo.rotation.y,
      rodas: carro.grupo.userData.rodas[0].rotation.z, velocidade: carro.velocidade };
  };
  passo(sim);
  assert.equal(sim.estacionamento.reservaRua, false, 'rua continua gerando tráfego até existir um carro');
  assert.equal(visual.carros.size, 0, 'estacionamento não fabrica um modelo próprio');
  trafego.proximoModelo = () => MODELOS_CARROS[13];
  trafego.criarNaFaixa(0);
  const existente = trafego.carros[0].grupo;
  existente.position.x = 10; existente.userData.rodas[0].rotation.z = -7;
  const posicao = existente.position.clone(), escala = existente.scale.clone();
  sim.estacionamento.transitoLivre = false;
  passo(sim); visual.atualizar(true, 0.05, sim.estacionamento.carros, sim.tempo);
  assert.equal(visual.carros.get(estado.clienteId), existente);
  assert.equal(trafego.carros.length, 0);
  assert.deepEqual(existente.position, posicao); assert.deepEqual(existente.scale, escala);
  assert.equal(estado.modelo, 13); assert.equal(estado.rodas, -7);
  assert.equal(sim.estacionamento.reservaRua, true);
  sim.estacionamento.transitoLivre = true;
  passo(sim); passo(sim);
  assert.ok(Math.abs(estado.x - posicao.x) < 0.24, 'continua da mesma posição, sem reaparecer na borda');
  ate(sim, () => sim.clientes.length === 0);
  visual.atualizar(true, 0.05, sim.estacionamento.carros, sim.tempo);
  assert.equal(existente.parent, null);
});
