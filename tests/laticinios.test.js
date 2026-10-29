import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao, validarEstado } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS } from '../src/jogo/configuracao.js';
import { LATICINIOS, posicaoCaixaLaticinios } from '../src/jogo/laticinios.js';
import { criarCaixaLaticinios } from '../src/jogo/laticinios-visual.js';
import { SODA } from '../src/jogo/soda.js';
import { geometriaEstacao, intervaloEstacoes, distanciaEstacao } from '../src/jogo/estacoes.js';
import { Cena } from '../src/jogo/cena.js';
import { vagasDeposito } from '../src/jogo/entregas.js';
import { prepararMelhoriasAnteriores } from './helpers/progressao.js';

const pedido = { importarLaticinios: 4 };
function preparar() {
  const sim = new Simulacao(); sim.estado.dinheiro = 100000;
  sim.estado.estatisticas.clientes = 25 * CONFIG.clientesPorNivel;
  prepararMelhoriasAnteriores(sim, 'geladeiraLaticinios');
  sim.proximoCliente = Infinity; sim.assaltosAtivos = false; sim.temporizadorEntregaAtivo = false;
  return sim;
}
function entregar(sim) {
  for (let i = 0; i < 20000 && (sim.estado.deposito.pedidos.length || sim.entregas.caminhao); i++) sim.entregas.atualizar(sim, 0.05);
  assert.equal(sim.entregas.caminhao, null);
  assert.equal(sim.estado.deposito.pedidos.length, 0);
}

test('N26 instala uma geladeira vazia por 1000 e importa apenas a categoria de laticinios', () => {
  const sim = preparar();
  sim.estado.estatisticas.clientes -= CONFIG.clientesPorNivel;
  assert.equal(sim.comprarMelhoria('geladeiraLaticinios').sucesso, false);
  sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
  assert.equal(sim.encomendarImportacoes(pedido).sucesso, false);
  sim.estado.dinheiro = 999;
  assert.equal(sim.comprarMelhoria('geladeiraLaticinios').sucesso, false);
  sim.estado.dinheiro = 1000;
  assert.equal(sim.comprarMelhoria('geladeiraLaticinios').sucesso, true);
  assert.equal(sim.estado.dinheiro, 0);
  assert.equal(sim.comprarMelhoria('geladeiraLaticinios').sucesso, false);
  assert.equal(sim.estado.produtos.laticinio.horta, 0);
  assert.equal(PRODUTOS.laticinio.preco, 23);
  assert.equal(PRODUTOS.laticinio.capacidadePrateleira, 36);
  for (const id of Object.keys(LATICINIOS.variedades)) assert.equal(PRODUTOS[id], undefined);
});

test('quatro caixas mistas de nove chegam ao deposito; coleta, reposicao e save preservam o produto unico', () => {
  const sim = preparar(); sim.comprarMelhoria('geladeiraLaticinios');
  const saldo = sim.estado.dinheiro;
  assert.equal(sim.encomendarImportacoes(pedido).quantidade, 36);
  assert.equal(sim.estado.dinheiro, saldo - 432);
  assert.equal(vagasDeposito(sim.estado.deposito, 'laticinios'), 0);
  assert.deepEqual(validarEstado(sim.estado).deposito.pedidos[0].pacotes, Array(4).fill('laticinio'));
  entregar(sim);
  assert.deepEqual(sim.estado.deposito.pacotes.map(p => p.unidades), [9, 9, 9, 9]);
  assert.equal(sim.encomendarImportacoes({ importarLaticinios: 1 }).sucesso, false);
  Object.assign(sim.estado.jogador, LATICINIOS.coleta); sim.tempo++; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['laticinio']);
  Object.assign(sim.estado.jogador, LATICINIOS.cliente); sim.tempo++; sim.interagir();
  assert.equal(sim.estado.produtos.laticinio.prateleira, 1);
  const salvo = validarEstado(sim.estado);
  assert.equal(salvo.produtos.laticinio.horta, 35);
  assert.equal(salvo.produtos.laticinio.prateleira, 1);
  assert.equal(salvo.deposito.pacotes.find(p => p.slot === 23).unidades, 8);
});

test('pilhas têm alcances separados; jogador e repositor retiram laticínios do topo para a base', () => {
  const sim = preparar(); sim.comprarMelhoria('geladeiraLaticinios');
  const areaSoda = geometriaEstacao('soda', 'coleta'), areaLaticinios = geometriaEstacao('laticinio', 'coleta');
  assert.ok(intervaloEstacoes(areaSoda, areaLaticinios) > 2 * CONFIG.raioInteracao);
  assert.ok(distanciaEstacao(SODA.coleta, areaLaticinios) > CONFIG.raioInteracao);
  assert.ok(distanciaEstacao(LATICINIOS.coleta, areaSoda) > CONFIG.raioInteracao);
  assert.equal(LATICINIOS.deposito.x, SODA.deposito.x);
  assert.ok(LATICINIOS.deposito.z < SODA.deposito.z);
  const caixa = criarCaixaLaticinios();
  assert.equal(caixa.getObjectByName('caixa-refrigerada').geometry.parameters.height, 0.5);
  assert.ok(posicaoCaixaLaticinios(1).y - posicaoCaixaLaticinios(0).y > LATICINIOS.alturaCaixa);
  sim.encomendarImportacoes({ importarSoda: 1, importarLaticinios: 4 }); entregar(sim);
  Object.assign(sim.estado.jogador, SODA.coleta); sim.tempo++; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['soda']);
  sim.estado.jogador.inventario = [];
  Object.assign(sim.estado.jogador, LATICINIOS.coleta); sim.tempo++; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario, ['laticinio']);
  const caixas = () => sim.estado.deposito.pacotes.filter(p => p.produto === 'laticinio').sort((a, b) => a.slot - b.slot);
  assert.deepEqual(caixas().map(p => p.unidades), [9, 9, 9, 8]);
  Object.assign(sim.estado.jogador, CONFIG.inicio);
  for (let i = 0; i < 20000 && sim.estado.produtos.laticinio.horta === 35; i++) {
    sim.tempo += 0.05; sim.atualizarAjudante(0.05);
  }
  assert.deepEqual(caixas().map(p => p.unidades), [9, 9, 9, 7]);
  for (let i = 0; i < 7; i++) sim.retirarProdutoDeposito('laticinio');
  assert.deepEqual(caixas().map(p => p.slot), [20, 21, 22]);
  const salvo = validarEstado(sim.estado);
  assert.equal(salvo.produtos.laticinio.horta, 27);
  assert.deepEqual(salvo.deposito.pacotes.filter(p => p.produto === 'laticinio').map(p => p.unidades), [9, 9, 9]);
  sim.retirarProdutoDeposito('laticinio');
  assert.deepEqual(caixas().map(p => p.unidades), [9, 9, 8]);
  // Saves do arranjo anterior não deixam caixas flutuando sobre slots vazios.
  salvo.deposito.pacotes = [{ produto: 'laticinio', unidades: 5, slot: 23 }];
  const migrado = validarEstado(salvo);
  assert.deepEqual(migrado.deposito.pacotes, [{ produto: 'laticinio', unidades: 5, slot: 20 }]);
  assert.equal(migrado.produtos.laticinio.horta, 5);
});

test('repositor enche as 36 vagas; cliente pede laticinio e paga 23 por unidade', () => {
  const sim = preparar(); sim.comprarMelhoria('geladeiraLaticinios');
  sim.encomendarImportacoes(pedido); entregar(sim);
  for (let i = 0; i < 25000 && sim.estado.produtos.laticinio.prateleira < 36; i++) {
    sim.tempo += 0.05; sim.atualizarAjudante(0.05);
  }
  assert.equal(sim.estado.produtos.laticinio.prateleira, 36);
  sim.estado.melhorias.carrinhos = 0; sim.estacionamento.prontoEm = Infinity; sim.aleatorio = () => 0;
  for (const p of Object.values(sim.estado.produtos)) { p.apresentado = false; p.prateleira = 0; }
  sim.estado.produtos.laticinio.prateleira = 1;
  sim.criarCliente(); const cliente = sim.clientes.at(-1);
  assert.equal(cliente.compras[0].produto, 'laticinio');
  const antes = sim.estado.estatisticas.faturamento;
  for (let i = 0; i < 6000 && cliente.fase !== 'fim'; i++) {
    sim.tempo += 0.05; sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05);
  }
  assert.equal(cliente.fase, 'fim');
  assert.equal(sim.estado.estatisticas.faturamento - antes, 23);
});

test('36 embalagens usam o gabinete dos queijos; cada grupo de nove mistura as quatro variedades visuais', () => {
  const sim = preparar(); sim.comprarMelhoria('geladeiraLaticinios');
  const cena = { sim, cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
  Cena.prototype.construirImportado.call(cena, 'laticinio', PRODUTOS.laticinio);
  const gabinete = cena.cena.getObjectByName('refrigerador-parede-laticinios');
  assert.ok(gabinete);
  assert.ok(Math.abs(gabinete.position.x - PRODUTOS.queijo.prateleira.x - 2.35) < 1e-8);
  const embalagens = cena.produtos.laticinio.frutas;
  assert.equal(embalagens.length, 36);
  assert.equal(new Set(embalagens.map(p => p.position.y)).size, 4);
  const prateleiras = [];
  gabinete.traverse(o => { if (o.name === 'prateleira-laticinios') prateleiras.push(o); });
  assert.equal(prateleiras.length, 4);
  for (let i = 0; i < 36; i += 9) assert.equal(new Set(embalagens.slice(i, i + 9).map(p => p.userData.variedade)).size, 4);
  const limites = PRODUTOS.laticinio.prateleira;
  const volumes = embalagens.map(embalagem => new THREE.Box3().setFromObject(embalagem));
  for (let i = 0; i < volumes.length; i++) for (let j = i + 1; j < volumes.length; j++) {
    assert.equal(volumes[i].intersectsBox(volumes[j]), false, `Embalagens ${i} e ${j} não se atravessam`);
  }
  for (const embalagem of embalagens) {
    const box = new THREE.Box3().setFromObject(embalagem);
    const suporte = prateleiras.find(p => Math.abs(p.position.y + 0.035 - box.min.y) < 1e-6);
    assert.ok(suporte, 'Embalagem apoiada em uma prateleira real');
    const proxima = prateleiras.find(p => p.position.y > box.min.y);
    assert.ok(box.max.y < (proxima ? proxima.position.y - 0.035 : 2.745), 'Embalagem cabe abaixo da próxima prateleira');
    embalagem.traverse(o => {
      if (o.geometry?.type === 'CircleGeometry' && o.material.map !== undefined) assert.equal(o.userData.texturaCurva, true);
    });
    assert.ok(box.min.x > limites.x - limites.w / 2 + 0.12 && box.max.x < limites.x + limites.w / 2 - 0.12);
    assert.ok(box.min.z > limites.z - limites.d / 2 && box.max.z < limites.z + limites.d / 2 - 0.08);
  }
  const antigo = new Simulacao().estado;
  delete antigo.produtos.laticinio; delete antigo.melhorias.geladeiraLaticinios;
  assert.equal(validarEstado(antigo).produtos.laticinio.liberado, false);
});

test('save provisorio consolida estoques, caixas, pedidos e inventarios sem alterar a entrada', () => {
  const sim = preparar(); sim.comprarMelhoria('geladeiraLaticinios');
  const dados = structuredClone(sim.estado);
  delete dados.produtos.laticinio;
  for (const id of Object.keys(LATICINIOS.variedades)) dados.produtos[id] = { prateleira: 3, apresentado: true };
  dados.jogador.inventario = ['manteiga', 'iogurte'];
  dados.deposito.pacotes = [{ produto: 'cremeLeite', unidades: 8, slot: 20 }];
  dados.deposito.pedidos = [{ id: 1, pacotes: ['requeijao'] }];
  const antes = structuredClone(dados), salvo = validarEstado(dados);
  assert.deepEqual(dados, antes);
  assert.equal(salvo.produtos.laticinio.prateleira, 12);
  assert.equal(salvo.produtos.laticinio.horta, 8);
  assert.deepEqual(salvo.jogador.inventario, ['laticinio', 'laticinio']);
  assert.equal(salvo.deposito.pacotes[0].produto, 'laticinio');
  assert.deepEqual(salvo.deposito.pedidos[0].pacotes, ['laticinio']);
  assert.deepEqual(validarEstado(salvo).produtos.laticinio, salvo.produtos.laticinio);
});
