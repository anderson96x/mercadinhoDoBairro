import test from 'node:test';
import { prepararLojaCompleta } from './helpers/loja-completa.js';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { CONFEITARIA, estadoConfeitaria, ROTEIRO_CONFEITARIA, situacaoConfeiteiro, maquinaConfeitaria } from '../src/jogo/confeitaria.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { Cena } from '../src/jogo/cena.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';
import { resumoProducao } from '../src/interface/producao.js';

const ids = Object.keys(CONFEITARIA.produtos);
const TEMPO_LOTE = CONFEITARIA.segundos + ROTEIRO_CONFEITARIA.reduce((total, etapa) => total + etapa.duracao, 0);
function preparar(nivel = 19) {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
  sim.estado.dinheiro = 100000;
  prepararLojaCompleta(sim);
  for (const id of ['alaProducao', 'alaTrigo', 'alaPadaria', 'alaArtesanal', 'apiario', 'caixa']) assert.equal(sim.comprarMelhoria(id).sucesso, true, id);
  sim.proximoCliente = Infinity; sim.definirAssaltosAtivos(false);
  return sim;
}
function abrir() {
  const sim = preparar();
  assert.equal(sim.comprarMelhoria('confeitaria').sucesso, true);
  return sim;
}

test('confeitaria exige nível 19, padaria, apiário, ovos e R$ 1.000; compra única libera os três doces a R$ 15', () => {
  const sim = preparar(18);
  assert.match(sim.comprarMelhoria('confeitaria').motivo, /nível 19/);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  for (const id of ['alaPadaria', 'apiario', 'alaProducao']) {
    sim.estado.melhorias[id] = 0;
    assert.equal(sim.comprarMelhoria('confeitaria').sucesso, false, id);
    sim.estado.melhorias[id] = 1;
  }
  sim.estado.dinheiro = 999;
  assert.equal(sim.comprarMelhoria('confeitaria').sucesso, false);
  sim.estado.dinheiro = 1000;
  assert.equal(sim.comprarMelhoria('confeitaria').sucesso, true);
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(sim.comprarMelhoria('confeitaria').sucesso, false);
  for (const id of ids) {
    assert.equal(sim.estado.produtos[id].liberado, true);
    assert.equal(sim.estado.produtos[id].prateleira, 0);
    assert.equal(PRODUTOS[id].preco, 15);
  }
});

test('mel e ovos são entregues no balcão separado do trigo e viram um de cada doce nas vitrines', () => {
  const sim = abrir();
  Object.assign(sim.estado.jogador, CONFEITARIA.entrega, { inventario: ['mel', 'ovos', 'trigo'] });
  for (let i = 0; i < 2; i++) { sim.tempo += 1; sim.interagir(); }
  assert.deepEqual(sim.estado.jogador.inventario, ['trigo']);
  assert.equal(sim.estado.confeitaria.mel, 1);
  assert.equal(sim.estado.confeitaria.ovos, 1);
  assert.equal(sim.estado.producao.trigoPadaria, 0);
  sim.atualizarProducao(5.9);
  assert.ok(ids.every(id => sim.estado.produtos[id].prateleira === 0));
  sim.atualizarProducao(TEMPO_LOTE - 5.9 + 0.001);
  for (const id of ids) {
    assert.equal(sim.estado.produtos[id].prateleira, 1);
    assert.equal(sim.estado.produtos[id].apresentado, true);
  }
  assert.deepEqual(sim.estado.confeitaria, { ...estadoConfeitaria(), mel: 0, ovos: 0, progresso: 0, lotes: 1 });
});

test('produção respeita pausa, ingrediente faltante, capacidade de entrada e vitrines cheias', () => {
  const sim = abrir();
  sim.estado.confeitaria.mel = 8;
  sim.atualizarProducao(60);
  assert.equal(sim.estado.confeitaria.progresso, 0);
  Object.assign(sim.estado.jogador, CONFEITARIA.entrega, { inventario: ['mel'] });
  sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['mel']);
  sim.estado.confeitaria.ovos = 8;
  const antes = structuredClone(sim.estado.confeitaria);
  sim.atualizarProducao(0);
  assert.deepEqual(sim.estado.confeitaria, antes);
  for (const id of ids) sim.estado.produtos[id].prateleira = PRODUTOS[id].capacidadePrateleira;
  sim.atualizarProducao(60);
  assert.deepEqual(sim.estado.confeitaria, antes);
  sim.estado.produtos.bolo.prateleira--;
  sim.atualizarProducao(60);
  assert.equal(sim.estado.confeitaria.lotes, 1);
  assert.equal(sim.estado.confeitaria.mel, 7);
  assert.equal(sim.estado.produtos.bolo.prateleira, PRODUTOS.bolo.capacidadePrateleira);
});

test('balcão de trigo não recebe mel e ovos e doces não têm reposição manual', () => {
  const sim = abrir();
  Object.assign(sim.estado.jogador, PRODUTOS.pao.coleta, { inventario: ['mel', 'ovos', 'trigo'] });
  sim.tempo = 1; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['mel', 'ovos']);
  assert.equal(sim.estado.producao.trigoPadaria, 1);
  assert.equal(sim.estado.confeitaria.mel, 0);
  assert.equal(sim.estado.confeitaria.ovos, 0);
  for (const id of ids) {
    Object.assign(sim.estado.jogador, PRODUTOS[id].cliente, { inventario: [id] });
    sim.tempo++; sim.interagir();
    assert.deepEqual(sim.estado.jogador.inventario, [id]);
    assert.equal(sim.estado.produtos[id].prateleira, 0);
  }
});

test('recarga retoma ingredientes, lote parcial e estoque; partidas anteriores recebem estado vazio', () => {
  const sim = abrir();
  Object.assign(sim.estado.confeitaria, { mel: 2, ovos: 2 });
  sim.atualizarProducao(3);
  const retomado = new Simulacao(sim.estado);
  assert.equal(retomado.estado.confeitaria.progresso, 3);
  retomado.atualizarProducao(TEMPO_LOTE - 3 + 0.001);
  assert.equal(retomado.estado.confeitaria.lotes, 1);
  assert.equal(new Simulacao(retomado.estado).estado.produtos.eclair.prateleira, 1);
  const antigo = preparar().estado;
  delete antigo.confeitaria; delete antigo.melhorias.confeitaria;
  assert.deepEqual(new Simulacao(antigo).estado.confeitaria, estadoConfeitaria());
  Object.assign(sim.estado.confeitaria, { mel: Infinity, ovos: -1, progresso: NaN, lotes: 1.5 });
  assert.deepEqual(new Simulacao(sim.estado).estado.confeitaria, { ...estadoConfeitaria(), mel: 0, ovos: 0, progresso: 0, lotes: 1 });
});

test('doces só entram nos pedidos após a produção e são vendidos no caixa por R$ 15 cada', () => {
  const sim = abrir(); sim.aleatorio = () => 0.5;
  sim.criarCliente();
  assert.ok(sim.clientes[0].compras.every(c => !ids.includes(c.produto)));
  sim.clientes = [];
  Object.assign(sim.estado.confeitaria, { mel: 3, ovos: 3 });
  sim.atualizarProducao(TEMPO_LOTE * 3 + 0.001);
  for (const [id, estoque] of Object.entries(sim.estado.produtos)) estoque.liberado = ids.includes(id);
  sim.estado.satisfacoesRecentes = Array(CONFIG.tamanhoHistoricoReputacao).fill('feliz');
  sim.criarCliente();
  const cliente = sim.clientes[0];
  assert.deepEqual(new Set(cliente.compras.map(c => c.produto)), new Set(ids));
  for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
    sim.tempo += 0.05; sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
  }
  assert.equal(cliente.fase, 'fim');
  assert.equal(cliente.quantidade, 3);
  assert.equal(sim.estado.estatisticas.faturamento, 45);
});

test('padaria mantém um padeiro; vitrines, estoque real e confeiteiro aparecem depois da compra', () => {
  const sim = preparar();
  const visual = { cena: new THREE.Scene(), produtos: {}, sim, criarLabel() {}, animarPersonagem: Cena.prototype.animarPersonagem };
  Cena.prototype.construirPadaria.call(visual);
  const objetos = visual.produtos.pao;
  Cena.prototype.animarConfeiteiro.call(visual, objetos, 0);
  assert.equal(objetos.vitrinesConfeitaria.visible, false);
  assert.equal(objetos.confeiteiro.visible, false);
  assert.ok(objetos.grupo.getObjectByName('tampo-balcao-padaria'));
  sim.comprarMelhoria('confeitaria');
  Cena.prototype.animarConfeiteiro.call(visual, objetos, 0);
  assert.equal(objetos.vitrinesConfeitaria.visible, true);
  assert.equal(objetos.confeiteiro.visible, true);
  assert.equal(objetos.padeiros.length, 1);
  for (const id of ids) assert.equal(visual.produtos[id].frutas.length, PRODUTOS[id].capacidadePrateleira);
  Object.assign(sim.estado.confeitaria, { mel: 8, ovos: 8 });
  let andou = false, trabalhou = false, levouBandeja = false;
  for (let i = 0; i < 720; i++) {
    const anterior = objetos.confeiteiro.position.clone();
    sim.atualizarProducao(1 / 60);
    Cena.prototype.animarConfeiteiro.call(visual, objetos, 1 / 60);
    const atual = objetos.confeiteiro.position;
    assert.ok(atual.distanceTo(anterior) <= 2.5 / 60 + 0.001);
    assert.ok(segmentoLivre({ x: anterior.x, z: anterior.z }, { x: atual.x, z: atual.z }, sim.obstaculos(), 0.12));
    andou ||= objetos.confeiteiro.userData.atorConfeitaria.andando;
    trabalhou ||= Math.abs(objetos.confeiteiro.userData.corpo.rotation.z) > 0.005;
    levouBandeja ||= objetos.confeiteiro.userData.cargaPadaria.visible;
  }
  assert.ok(andou && trabalhou && levouBandeja);
  // Pausar durante o deslocamento também preserva a direção e os gestos.
  for (let i = 0; i < 120; i++) {
    sim.atualizarProducao(1 / 60);
    Cena.prototype.animarConfeiteiro.call(visual, objetos, 1 / 60);
  }
  const posicao = objetos.confeiteiro.position.clone();
  const direcao = objetos.confeiteiro.quaternion.clone();
  const mao = objetos.confeiteiro.userData.bracoE.userData.mao.position.clone();
  Cena.prototype.animarConfeiteiro.call(visual, objetos, 0);
  assert.ok(objetos.confeiteiro.position.equals(posicao));
  assert.ok(objetos.confeiteiro.quaternion.equals(direcao));
  assert.ok(objetos.confeiteiro.userData.bracoE.userData.mao.position.equals(mao));
});

test('recebimento de mel e ovos usa a mesma bandeja do trigo e mostra as unidades entregues', () => {
  const sim = abrir();
  const visual = { cena: new THREE.Scene(), produtos: {}, sim, criarLabel() {}, animarPersonagem: Cena.prototype.animarPersonagem };
  Cena.prototype.construirPadaria.call(visual);
  const objetos = visual.produtos.pao;
  const trigo = objetos.grupo.getObjectByName('entrega-trigo-padaria');
  const bandeja = objetos.entregaConfeitaria;
  assert.deepEqual(bandeja.children.filter(o => o.isMesh).map(o => o.geometry.parameters), trigo.children.filter(o => o.isMesh).map(o => o.geometry.parameters));
  assert.ok(bandeja.scale.equals(trigo.scale));
  Object.assign(sim.estado.confeitaria, { mel: 3, ovos: 2 });
  Cena.prototype.animarConfeiteiro.call(visual, objetos, 0);
  assert.equal(objetos.ingredientesConfeitaria.mel.filter(o => o.visible).length, 3);
  assert.equal(objetos.ingredientesConfeitaria.ovos.filter(o => o.visible).length, 2);
  assert.ok(objetos.ingredientesConfeitaria.mel.every(o => o.parent === bandeja));
});

test('painel explica a receita e indica falta de ingredientes e vitrine cheia', () => {
  const sim = abrir();
  const resumo = () => resumoProducao(sim.estado).find(o => o.id === 'confeitaria');
  assert.match(resumo().status, /Aguardando mel e ovos/);
  Object.assign(sim.estado.confeitaria, { mel: 1, ovos: 1 });
  assert.equal(resumo().produzindo, true);
  sim.estado.produtos.bolo.prateleira = PRODUTOS.bolo.capacidadePrateleira;
  assert.equal(resumo().produzindo, true, 'uma vitrine cheia não bloqueia as demais');
  for (const id of ids) sim.estado.produtos[id].prateleira = PRODUTOS[id].capacidadePrateleira;
  assert.equal(resumo().status, 'Vitrine cheia');
});

test('confeitaria completa donuts e éclairs enquanto bolos já estão cheios e retoma depois de uma venda', () => {
  const sim = abrir();
  Object.assign(sim.estado.confeitaria, { mel: 3, ovos: 3 });
  sim.estado.produtos.bolo.prateleira = 6;
  sim.estado.produtos.donut.prateleira = 10;
  sim.estado.produtos.eclair.prateleira = 4;
  sim.atualizarProducao(TEMPO_LOTE * 3);
  assert.equal(sim.estado.produtos.bolo.prateleira, 6);
  assert.equal(sim.estado.produtos.donut.prateleira, 12);
  assert.equal(sim.estado.produtos.eclair.prateleira, 6);
  assert.equal(sim.estado.confeitaria.mel, 1);
  assert.equal(sim.estado.confeitaria.ovos, 1);
  sim.estado.produtos.donut.prateleira--;
  sim.atualizarProducao(6);
  assert.deepEqual(sim.estado.confeitaria.produtosLote, ['donut']);
  const retomado = new Simulacao(sim.estado);
  retomado.atualizarProducao(TEMPO_LOTE);
  assert.equal(retomado.estado.produtos.donut.prateleira, 12);
  assert.equal(retomado.estado.produtos.bolo.prateleira, 6);
  assert.equal(retomado.estado.produtos.eclair.prateleira, 6);
  assert.equal(retomado.estado.confeitaria.mel, 0);
});

test('confeiteiro descansa parado de frente para os donuts, movimenta só a cabeça e congela na pausa', () => {
  const sim = abrir();
  const visual = { cena: new THREE.Scene(), produtos: {}, sim, criarLabel() {}, animarPersonagem: Cena.prototype.animarPersonagem };
  Cena.prototype.construirPadaria.call(visual);
  const objetos = visual.produtos.pao;
  Cena.prototype.animarConfeiteiro.call(visual, objetos, 1 / 60);
  const trabalhador = objetos.confeiteiro, d = trabalhador.userData;
  const posicao = trabalhador.position.clone();
  const cabeca = d.cabecaPadaria.quaternion.clone();
  for (let i = 0; i < 120; i++) Cena.prototype.animarConfeiteiro.call(visual, objetos, 1 / 60);
  assert.ok(trabalhador.position.equals(posicao));
  assert.equal(d.atorConfeitaria.andando, false);
  const donuts = PRODUTOS.donut.prateleira;
  assert.equal(d.atorConfeitaria.angulo, Math.atan2(donuts.x - posicao.x, donuts.z - posicao.z));
  assert.equal(d.marcha.intensidade, 0);
  assert.equal(d.corpo.position.y, 0);
  assert.equal(d.corpo.rotation.z, 0);
  assert.equal(d.cargaPadaria.visible, false);
  assert.equal(d.cabecaPadaria.quaternion.equals(cabeca), false);
  const pausada = d.cabecaPadaria.quaternion.clone();
  Cena.prototype.animarConfeiteiro.call(visual, objetos, 0);
  assert.ok(d.cabecaPadaria.quaternion.equals(pausada));
});

test('batedeira trabalha no antigo posto do forno; cada doce é entregue na vitrine correta e o retorno é vazio', () => {
  const sim = abrir();
  const visual = { cena: new THREE.Scene(), produtos: {}, sim, criarLabel() {}, animarPersonagem: Cena.prototype.animarPersonagem };
  Cena.prototype.construirPadaria.call(visual);
  const objetos = visual.produtos.pao;
  Object.assign(sim.estado.confeitaria, { mel: 1, ovos: 1 });
  Cena.prototype.animarConfeiteiro.call(visual, objetos, 0);
  const preparo = objetos.confeiteiro.position.clone();
  const rotor = objetos.batedeira.rotor.rotation.y;
  sim.atualizarProducao(1);
  Cena.prototype.animarConfeiteiro.call(visual, objetos, 1);
  assert.ok(objetos.batedeira.grupo.visible);
  assert.ok(Math.abs(objetos.batedeira.grupo.position.x - 19.4) < 1e-9);
  assert.ok(Math.abs(objetos.batedeira.grupo.position.z + 1.1) < 1e-9);
  const frentePao = objetos.forno.getWorldDirection(new THREE.Vector3());
  const frenteDoces = objetos.batedeira.grupo.getWorldDirection(new THREE.Vector3());
  const entreMaquinas = objetos.batedeira.grupo.position.clone().sub(objetos.forno.position).normalize();
  assert.ok(frentePao.dot(entreMaquinas) > 0.999, 'porta do forno aponta para a máquina de doces');
  assert.ok(frenteDoces.dot(entreMaquinas) < -0.999, 'frente da batedeira aponta para o forno');
  const acessoDoces = new THREE.Vector3(CONFEITARIA.posto.x, 0, CONFEITARIA.posto.z).sub(objetos.batedeira.grupo.position).normalize();
  assert.ok(frenteDoces.dot(acessoDoces) > 0.999, 'confeiteiro trabalha diante da cuba');
  for (const etapa of objetos.roteiros[0].filter(etapa => ['colocar', 'retirar'].includes(etapa.acao))) {
    const acessoPao = new THREE.Vector3(etapa.de.x, 0, etapa.de.z).sub(objetos.forno.position).normalize();
    assert.ok(frentePao.dot(acessoPao) > 0.999, 'padeiro carrega e descarrega pela porta do forno');
  }
  const volumeDoces = maquinaConfeitaria(), limitesDoces = new THREE.Box3().setFromObject(objetos.batedeira.grupo);
  assert.ok(limitesDoces.min.x >= volumeDoces.x - volumeDoces.w / 2 && limitesDoces.max.x <= volumeDoces.x + volumeDoces.w / 2);
  assert.ok(limitesDoces.min.z >= volumeDoces.z - volumeDoces.d / 2 && limitesDoces.max.z <= volumeDoces.z + volumeDoces.d / 2);
  for (const etapa of ROTEIRO_CONFEITARIA) {
    assert.ok(segmentoLivre(etapa.de, etapa.para, sim.obstaculos(), 0.12), 'confeiteiro deve contornar as duas máquinas e os balcões');
  }
  for (const roteiro of [...objetos.roteiros, objetos.roteiroForno]) for (const etapa of roteiro) {
    assert.ok(segmentoLivre(etapa.de, etapa.para, [maquinaConfeitaria()], 0.12), 'batedeira deve preservar o trajeto do padeiro');
  }
  assert.ok(objetos.batedeira.rotor.rotation.y > rotor);
  assert.equal(situacaoConfeiteiro(sim.estado).acao, 'misturar');
  assert.ok(objetos.confeiteiro.position.equals(preparo));
  sim.atualizarProducao(5);
  assert.ok(ids.every(id => sim.estado.produtos[id].prateleira === 0));
  const entregues = new Set();
  for (let i = 0; i < 800 && sim.estado.confeitaria.etapaEntrega >= 0; i++) {
    const antes = situacaoConfeiteiro(sim.estado);
    const estoques = Object.fromEntries(ids.map(id => [id, sim.estado.produtos[id].prateleira]));
    sim.atualizarProducao(1 / 120);
    Cena.prototype.animarConfeiteiro.call(visual, objetos, 1 / 120);
    for (const id of ids) if (sim.estado.produtos[id].prateleira > estoques[id]) {
      assert.equal(antes.produto, id);
      entregues.add(id);
      assert.equal(objetos.docesNaBandeja.find(o => o.name === id).visible, false);
    }
    if (entregues.size === 3 && sim.estado.confeitaria.etapaEntrega >= 0) {
      assert.ok(objetos.docesNaBandeja.every(o => !o.visible));
      assert.ok(objetos.confeiteiro.userData.cargaPadaria.visible);
    }
  }
  assert.deepEqual(entregues, new Set(ids));
  assert.ok(objetos.confeiteiro.position.distanceTo(preparo) < 0.01);
  assert.equal(sim.estado.confeitaria.lotes, 1);
});

test('exclamação exige vitrine vazia e ingrediente faltante, sem alertar durante entregas', () => {
  const sim = abrir();
  const visual = { cena: new THREE.Scene(), produtos: {}, sim, criarLabel() {}, animarPersonagem: Cena.prototype.animarPersonagem };
  Cena.prototype.construirPadaria.call(visual);
  const objetos = visual.produtos.pao;
  const alerta = () => { Cena.prototype.animarConfeiteiro.call(visual, objetos, 0); return objetos.confeiteiro.userData.alertaTrigo.visible; };
  assert.equal(alerta(), true);
  sim.estado.confeitaria.mel = 1;
  assert.equal(alerta(), true);
  sim.estado.confeitaria.ovos = 1;
  assert.equal(alerta(), false);
  sim.atualizarProducao(6);
  assert.equal(alerta(), false);
  sim.atualizarProducao(TEMPO_LOTE);
  assert.equal(alerta(), false);
  sim.estado.produtos.bolo.prateleira = 0;
  assert.equal(alerta(), true);
  sim.estado.melhorias.confeitaria = 0;
  assert.equal(alerta(), false);
});

test('salvar no meio das entregas retoma o doce pendente sem duplicar os já expostos', () => {
  const sim = abrir();
  Object.assign(sim.estado.confeitaria, { mel: 1, ovos: 1 });
  sim.atualizarProducao(6 + ROTEIRO_CONFEITARIA.slice(0, 3).reduce((total, e) => total + e.duracao, 0) + 0.01);
  assert.equal(sim.estado.produtos.bolo.prateleira, 1);
  assert.equal(sim.estado.produtos.donut.prateleira, 0);
  const retomado = new Simulacao(sim.estado);
  retomado.atualizarProducao(TEMPO_LOTE);
  for (const id of ids) assert.equal(retomado.estado.produtos[id].prateleira, 1);
  assert.equal(retomado.estado.confeitaria.lotes, 1);
});

test('entrega já preparada aguarda vaga na vitrine sem perder o doce nem consumir outro lote', () => {
  const sim = abrir();
  Object.assign(sim.estado.confeitaria, { mel: 1, ovos: 1 });
  sim.atualizarProducao(6);
  sim.estado.produtos.bolo.prateleira = PRODUTOS.bolo.capacidadePrateleira;
  sim.atualizarProducao(60);
  assert.equal(sim.estado.confeitaria.etapaEntrega, 2);
  assert.ok(situacaoConfeiteiro(sim.estado).carga.includes('bolo'));
  assert.equal(sim.estado.confeitaria.mel, 0);
  const retomado = new Simulacao(sim.estado);
  retomado.estado.produtos.bolo.prateleira--;
  retomado.atualizarProducao(TEMPO_LOTE);
  assert.equal(retomado.estado.produtos.bolo.prateleira, PRODUTOS.bolo.capacidadePrateleira);
  assert.equal(retomado.estado.produtos.donut.prateleira, 1);
  assert.equal(retomado.estado.confeitaria.lotes, 1);
});
