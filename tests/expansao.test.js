import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulacao, estadoInicial, validarEstado, distancia } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS, ALA_PRODUCAO, ALA_LEITE, NIVEL_OVOS } from '../src/jogo/configuracao.js';
import * as THREE from 'three';
import { construirBairro } from '../src/jogo/bairro.js';
import { Cena } from '../src/jogo/cena.js';

test('estações futuras não aparecem nem criam marcações antes da compra', () => {
  const sim = new Simulacao();
  const visual = { cena: new THREE.Scene(), sim, produtos: {}, alvosHorta: [], criarLabel() {} };
  for (const [id, produto] of Object.entries(PRODUTOS)) Cena.prototype.construirEstacao.call(visual, id, produto);

  assert.equal(visual.cena.children.length, Object.keys(PRODUTOS).length);
  assert.equal(visual.produtos.tomate.grupo.visible, true);
  for (const id of ['milho', 'ovos', 'leite']) assert.equal(visual.produtos[id].grupo.visible, false, id);

  // Mesmo se um estado antigo trouxer um produto liberado, a ala ainda exige a compra.
  sim.estado.produtos.ovos.liberado = true;
  sim.estado.produtos.leite.liberado = true;
  const visualSemAla = { cena: new THREE.Scene(), sim, produtos: {}, alvosHorta: [], criarLabel() {} };
  for (const id of ['ovos', 'leite']) Cena.prototype.construirEstacao.call(visualSemAla, id, PRODUTOS[id]);
  assert.equal(visualSemAla.produtos.ovos.grupo.visible, false);
  assert.equal(visualSemAla.produtos.leite.grupo.visible, false);
  sim.estado.estagioLoja = ALA_PRODUCAO.indice;
  const visualComOvos = { cena: new THREE.Scene(), sim, produtos: {}, alvosHorta: [], criarLabel() {} };
  for (const id of ['ovos', 'leite']) Cena.prototype.construirEstacao.call(visualComOvos, id, PRODUTOS[id]);
  assert.equal(visualComOvos.produtos.ovos.grupo.visible, true);
  assert.equal(visualComOvos.produtos.leite.grupo.visible, false);
  sim.estado.estagioLoja = ALA_LEITE.indice;
  const visualComLeite = { cena: new THREE.Scene(), sim, produtos: {}, alvosHorta: [], criarLabel() {} };
  Cena.prototype.construirEstacao.call(visualComLeite, 'leite', PRODUTOS.leite);
  assert.equal(visualComLeite.produtos.leite.grupo.visible, true);
});

test('refrigerador de leite fica junto à parede e mantém acesso pela frente', () => {
  const sim = new Simulacao();
  sim.estado.estagioLoja = ALA_LEITE.indice;
  sim.estado.melhorias.alaProducao = 1;
  sim.estado.melhorias.alaLeite = 1;
  sim.estado.produtos.ovos.liberado = true;
  sim.estado.produtos.leite.liberado = true;
  const visual = { cena: new THREE.Scene(), sim, produtos: {}, alvosHorta: [], criarLabel() {} };
  Cena.prototype.construirEstacao.call(visual, 'leite', PRODUTOS.leite);
  const { refrigerador, frutas } = visual.produtos.leite;
  assert.equal(refrigerador.portas.length, 2);
  const tamanho = new THREE.Box3().setFromObject(refrigerador.portas[0].parent).getSize(new THREE.Vector3());
  assert.ok(tamanho.y > tamanho.x && tamanho.y > tamanho.z);
  assert.ok(frutas[0].position.y > frutas[4].position.y, 'o primeiro leite abastecido aparece na prateleira superior');
  assert.ok(PRODUTOS.leite.prateleira.z < -5 && PRODUTOS.leite.reposicao.z > PRODUTOS.leite.prateleira.z);
  for (const ponto of [PRODUTOS.leite.reposicao, ...PRODUTOS.leite.pontosCompra]) {
    const ator = { x: -1.3, z: 4.9, andando: false };
    let chegou = false;
    for (let i = 0; i < 2400 && !chegou; i++) {
      sim.tempo += 0.05;
      chegou = sim.caminharCliente(ator, ponto, 0.05);
    }
    assert.equal(chegou, true, `sem rota para ${JSON.stringify(ponto)}`);
  }
});

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
  assert.equal(rodape.position.x, 6.15);
  assert.ok(Math.abs(rodape.scale.x - 11.9 / 8.9) < 1e-10);
});

test('carregar uma ala comprada mostra a construção pronta sem repetir a animação', () => {
  const { bairro, ala, andaime } = bairroVisual();
  assert.equal(bairro.atualizarEstagio(1), 1);
  assert.equal(ala.visible, true);
  assert.equal(ala.scale.x, 1);
  assert.equal(andaime.visible, false);
});

test('o ajudante salvo na antiga ala traseira retoma na fazenda com sua carga', () => {
  const sim = new Simulacao(); abrirAla(sim);
  sim.estado.melhorias.ajudante = 1;
  Object.assign(sim.ajudante, { x: 3.3, z: -7.55, produto: 'ovos', destino: 'prateleira', inventario: ['ovos'] });
  const retomado = new Simulacao(structuredClone(sim.estado));
  assert.equal(retomado.ajudante.x, PRODUTOS.ovos.coleta.x);
  assert.equal(retomado.ajudante.z, PRODUTOS.ovos.coleta.z);
  assert.deepEqual(retomado.ajudante.inventario, ['ovos']);
  assert.equal(retomado.ajudante.destino, 'prateleira');
});

test('galinheiro respeita capacidade, retoma produção após coleta e preserva progresso salvo', () => {
  const sim = new Simulacao(); abrirAla(sim);
  for (let i = 0; i < 1000; i++) sim.atualizarProducao(0.1);
  assert.equal(sim.estado.produtos.ovos.horta, PRODUTOS.ovos.capacidadeHorta);
  assert.equal(sim.estado.producao.ovosProduzidos, PRODUTOS.ovos.capacidadeHorta);
  Object.assign(sim.estado.jogador, PRODUTOS.ovos.coleta);
  sim.interagir();
  sim.atualizarProducao(1);
  const retomado = new Simulacao(structuredClone(sim.estado));
  assert.equal(retomado.estado.producao.progressoOvo, 1);
  retomado.atualizarProducao(ALA_PRODUCAO.tempoOvo - 1);
  assert.equal(retomado.estado.produtos.ovos.horta, PRODUTOS.ovos.capacidadeHorta);
  assert.deepEqual(retomado.estado.jogador.inventario, ['ovos']);
});

test('save da antiga área lateral mantém ovos e compras e reposiciona ajudante', () => {
  const sim = new Simulacao(); abrirAla(sim);
  sim.estado.melhorias.ajudante = 1;
  sim.estado.produtos.ovos.horta = 3;
  sim.estado.produtos.ovos.prateleira = 4;
  // Campos legados são descartados; ovos e carga continuam disponíveis.
  Object.assign(sim.estado.producao, { milhoNoMoinho: 5, racao: 3, progressoRacao: 1 });
  Object.assign(sim.ajudante, { x: 14.3, z: -2.65, produto: 'ovos', destino: 'prateleira', inventario: ['ovos'] });
  const retomado = new Simulacao(structuredClone(sim.estado));
  assert.equal(retomado.estado.producao.progressoOvo, 0);
  assert.equal(retomado.estado.producao.ovosProduzidos, 0);
  assert.equal(retomado.estado.producao.progressoLeite, 0);
  assert.equal(retomado.estado.producao.leitesProduzidos, 0);
  assert.equal(retomado.estado.dinheiro, sim.estado.dinheiro);
  assert.equal(retomado.estado.produtos.ovos.horta, 3);
  assert.equal(retomado.estado.produtos.ovos.prateleira, 4);
  assert.equal(retomado.ajudante.x, PRODUTOS.ovos.coleta.x);
  assert.equal(retomado.ajudante.z, PRODUTOS.ovos.coleta.z);
  assert.deepEqual(retomado.ajudante.inventario, ['ovos']);
});

function abrirAla(sim) {
  sim.estado.estatisticas.clientes = CONFIG.clientesPorNivel * (NIVEL_OVOS - 1);
  sim.estado.dinheiro = 2000;
  assert.equal(sim.comprarMelhoria('milho').sucesso, true);
  assert.equal(sim.comprarMelhoria('alaProducao').sucesso, true);
}

test('controles de desenvolvimento elevam nível e reputação e persistem no salvamento', () => {
  const sim = new Simulacao();
  assert.equal(sim.aumentarNivelDev(), 2);
  assert.equal(sim.estado.estatisticas.clientes, CONFIG.clientesPorNivel);
  assert.equal(sim.estado.dinheiro, CONFIG.bonusNivel);
  assert.equal(sim.consumirEventos().at(-1).nivel, 2);
  assert.equal(sim.aumentarReputacaoDev(), 70);
  assert.equal(sim.aumentarReputacaoDev(), 80);
  const retomado = new Simulacao(structuredClone(sim.estado));
  assert.equal(retomado.nivel, 2);
  assert.equal(retomado.reputacao, 80);
  assert.equal(retomado.estado.dinheiro, CONFIG.bonusNivel);
  for (let i = 0; i < 2; i++) retomado.aumentarReputacaoDev();
  assert.equal(retomado.reputacao, 100);
  assert.equal(retomado.aumentarReputacaoDev(), 100);
});

test('galinheiro exige nível 5 sem depender de milho e preserva o terreno', () => {
  const sim = new Simulacao();
  sim.estado.dinheiro = 2000;
  assert.match(sim.comprarMelhoria('alaProducao').motivo, /nível 5/);
  sim.estado.estatisticas.clientes = CONFIG.clientesPorNivel * 4;

  assert.equal(sim.comprarMelhoria('alaProducao').sucesso, true);
  assert.equal(sim.estado.estagioLoja, 1);
  assert.equal(sim.estado.produtos.ovos.liberado, true);
  assert.equal(sim.estado.produtos.ovos.horta, 0);
  assert.equal(sim.limitesMundo.minZ, CONFIG.limiteMundo.minZ);
  assert.equal(sim.limitesMundo.maxX, ALA_PRODUCAO.limites.maxX);
  assert.deepEqual(sim.limitesMundo, CONFIG.limiteMundo);
  assert.equal(sim.comprarMelhoria('ajudante').sucesso, true);
  assert.equal(sim.estado.dinheiro, 1200);
  const salvo = validarEstado(structuredClone(sim.estado));
  assert.equal(salvo.estagioLoja, 1);
  assert.equal(salvo.produtos.ovos.liberado, true);
  assert.equal(salvo.melhorias.ajudante, 1);
});

test('galinhas produzem ovos sem insumos, que podem ser coletados e vendidos', () => {
  const sim = new Simulacao();
  abrirAla(sim);
  sim.proximoCliente = Infinity;
  for (let i = 0; i < 71; i++) sim.atualizarProducao(0.05);
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

test('ajudante leva os ovos do galinheiro à prateleira sem precisar de insumos', () => {
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

test('a ala bloqueia acesso antes da construção e oferece rotas entre fazenda, ovos e caixa', () => {
  const sim = new Simulacao();
  assert.ok(sim.obstaculos().some(o => o.lateral));
  abrirAla(sim);
  assert.ok(!sim.obstaculos().some(o => o.x === ALA_PRODUCAO.piso.x && o.z === ALA_PRODUCAO.piso.z && o.w === ALA_PRODUCAO.piso.w));
  assert.ok(!sim.obstaculos().some(o => o.lateral));
  const ator = { x: 5.35, z: -5.1, andando: false };
  for (const alvo of [PRODUTOS.ovos.coleta, PRODUTOS.ovos.cliente, CONFIG.clienteCaixa]) {
    let chegou = false;
    for (let i = 0; i < 2400 && !chegou; i++) {
      sim.tempo += 1 / 60;
      chegou = sim.caminharCliente(ator, alvo, 1 / 60);
    }
    assert.ok(chegou && distancia(ator, alvo) < 0.03, `rota para ${JSON.stringify(alvo)}`);
  }
});

test('hortas afastadas deixam um corredor livre e continuam acessíveis desde o início', () => {
  const sim = new Simulacao();
  const corredor = { x: -5.5, z: -1.7, andando: false };
  assert.ok(!sim.obstaculos().some(o => Math.abs(corredor.x - o.x) < o.w / 2 + 0.27 && Math.abs(corredor.z - o.z) < o.d / 2 + 0.27));
  const ator = { x: -3.8, z: 0.7, andando: false };
  for (const alvo of [PRODUTOS.tomate.coleta, PRODUTOS.milho.coleta]) {
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
