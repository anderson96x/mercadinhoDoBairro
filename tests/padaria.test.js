import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulacao, validarEstado } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS, ALA_PADARIA } from '../src/jogo/configuracao.js';
import { Cena, aplicarPaletaFuncionario } from '../src/jogo/cena.js';
import { PALETAS } from '../src/jogo/personalizacao.js';
import { construirBairro } from '../src/jogo/bairro.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

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

test('pão entra na demanda normal e clientes que o pedem levam pelo menos três', () => {
  const sim = abrirPadaria();
  sim.estado.melhorias.caixa = 1;
  sim.estado.produtos.pao.prateleira = 18;
  sim.proximoCliente = Infinity;
  sim.aleatorio = () => 0;
  const demandas = [];
  for (let id = 1; id <= 8; id++) {
    sim.clientes = [];
    sim.proximoId = id;
    assert.equal(sim.criarCliente(), true);
    demandas.push(sim.clientes[0].produto);
    const pedidoPao = sim.clientes[0].compras.find(compra => compra.produto === 'pao');
    if (pedidoPao) assert.ok(pedidoPao.desejado >= 3);
  }
  const frequencias = [...new Set(demandas)].map(id => demandas.filter(produto => produto === id).length);
  assert.ok(Math.max(...frequencias) - Math.min(...frequencias) <= 1);
  assert.ok(demandas.includes('pao'));

  sim.clientes = [];
  sim.proximoId = demandas.indexOf('pao') + 1;
  assert.equal(sim.criarCliente(), true);
  const cliente = sim.clientes[0];
  assert.equal(cliente.compras[0].produto, 'pao');
  assert.equal(cliente.compras[0].desejado, 3);
  for (let i = 0; i < 6000 && sim.estado.estatisticas.clientes === CONFIG.clientesPorNivel * 8; i++) sim.atualizar(1 / 60);
  assert.ok(sim.estado.estatisticas.clientes > CONFIG.clientesPorNivel * 8);
  assert.ok(sim.estado.estatisticas.faturamento >= 30);
  assert.equal(sim.estado.produtos.pao.prateleira, 15);
});

test('padaria fica na parede direita e tem dois padeiros de avental e chapéu branco', () => {
  const visual = { cena: new THREE.Scene(), produtos: {}, sim: new Simulacao(), criarLabel() {} };
  Cena.prototype.construirPadaria.call(visual);
  const { grupo, padeiros, frutas } = visual.produtos.pao;
  assert.equal(grupo.name, 'padaria');
  assert.equal(padeiros.length, 2);
  assert.equal(frutas.length, PRODUTOS.pao.capacidadePrateleira);
  assert.ok(PRODUTOS.ovos.prateleira.z < PRODUTOS.pao.prateleira.z, 'ovos ocupam a parede do fundo; padaria mantém sua área legada');
  const vitrine = grupo.getObjectByName('vitrine-paes');
  assert.ok(vitrine);
  assert.equal(vitrine.children.filter(item => item.name === 'tampo-paes').length, 1);
  const tampo = vitrine.getObjectByName('tampo-paes');
  assert.equal(tampo.material.transparent, true);
  assert.equal(vitrine.children.filter(item => item.name === 'tampo-paes').length, 1);
  const bounds = new THREE.Box3().setFromObject(vitrine);
  assert.ok(bounds.max.x - bounds.min.x <= PRODUTOS.pao.prateleira.w);
  assert.ok(bounds.max.z - bounds.min.z <= PRODUTOS.pao.prateleira.d);
  assert.ok(frutas.every(pao => pao.position.y < tampo.position.y - 0.02));
  assert.equal(vitrine.children.filter(o => o.name === 'prateleira-vitrine').length, 3);
  assert.ok(grupo.getObjectByName('entrega-trigo-padaria').position.z < PRODUTOS.pao.prateleira.z);
  assert.equal(visual.produtos.pao.trigosRecebidos.length, ALA_PADARIA.capacidadeTrigo);
  const triturador = grupo.getObjectByName('triturador-padaria');
  assert.ok(triturador.position.x > PRODUTOS.pao.prateleira.x);
  assert.ok(new THREE.Box3().setFromObject(triturador).max.y < 2);
  assert.equal(triturador.getObjectByName('corpo-triturador').material.color.getHex(), 0xadb7b9);
  assert.equal(triturador.getObjectByName('corpo-triturador').material.metalness, 0.58);
  const bandejaFarinha = triturador.getObjectByName('bandeja-farinha-padaria');
  assert.ok(bandejaFarinha);
  assert.equal(bandejaFarinha.children.filter(item => item.geometry?.type === 'BoxGeometry').length, 4);
  assert.ok(bandejaFarinha.getObjectByName('farinha-na-bandeja'));
  assert.ok(bandejaFarinha.children.filter(item => item.geometry?.type === 'BoxGeometry').every(item => item.material.metalness === 0.68));
  assert.ok(triturador.getObjectByName('bica-farinha-padaria').rotation.x < 0);
  const rotor = triturador.getObjectByName('rotor-metal-padaria');
  assert.equal(rotor, visual.produtos.pao.rotor);
  assert.equal(rotor.children.filter(item => item.geometry?.type === 'BoxGeometry').length, 3);
  assert.ok(rotor.children.some(item => item.position.x !== 0));
  assert.ok(triturador.children.every(item => !item.children.some(parte => parte.material?.color?.getHex() === 0xe4bc57)));
  assert.equal(grupo.getObjectByName('base-madeira-padaria').material.color.getHex(), 0x936238);
  assert.ok(grupo.getObjectByName('forno-padaria').position.x > PRODUTOS.pao.prateleira.x);
  assert.equal(new Set(frutas.map(pao => pao.position.y)).size, 3);
  assert.ok(frutas[12].position.y > frutas[0].position.y);
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

function visualPadaria() {
  const visual = { cena: new THREE.Scene(), produtos: {}, sim: abrirPadaria(), criarLabel() {},
    animarPersonagem: Cena.prototype.animarPersonagem };
  Cena.prototype.construirPadaria.call(visual);
  return visual;
}

test('os dois padeiros seguem os movimentos originais durante o trabalho', () => {
  const visual = visualPadaria();
  const padaria = visual.produtos.pao, forno = padaria.padeiros[1].userData;
  const cargas = [false, false], maos = [new Set(), new Set()];
  let levouFarinha = false, levouPao = false;
  for (let quadro = 0; quadro < 900; quadro++) {
    Cena.prototype.animarPadeiros.call(visual, padaria, { trigoPadaria: 1, farinha: 1, paesProduzidos: 3 }, quadro / 60, 1 / 60);
    levouFarinha ||= forno.cargaFarinha.visible;
    levouPao ||= forno.cargaPao.visible;
    if (forno.cargaFarinha.visible) assert.equal(padaria.farinha.visible, false, 'a farinha sai da bandeja quando aparece no saco');
    padaria.padeiros.forEach((padeiro, i) => {
      cargas[i] ||= padeiro.userData.cargaPadaria.visible;
      maos[i].add(padeiro.userData.bracoE.userData.mao.position.y.toFixed(2));
      assert.equal(padeiro.userData.alertaTrigo.visible, false);
      if (quadro === 150) {
        const d = padeiro.userData;
        assert.ok(Math.abs(d.bracoE.userData.mao.position.y - (0.83 - Math.sin(2.5 * (i ? 7 : 10)) * 0.17)) < 0.001);
        assert.ok(Math.abs(d.corpo.rotation.z - Math.sin(2.5 * 4) * 0.045) < 0.001);
        assert.equal(d.cabecaPadaria.rotation.x, 0);
      }
    });
  }
  assert.deepEqual(cargas, [true, true]);
  assert.equal(levouFarinha, true, 'o padeiro do forno coleta farinha no moinho');
  assert.equal(levouPao, true, 'depois ele transporta os pães prontos');
  assert.ok(forno.cargaFarinha.children.length >= 3);
  assert.equal(padaria.roteiros[1][0].acao, 'receber');
  assert.equal(padaria.roteiros[1][1].carga, 'farinha');
  assert.ok(maos[0].size > 10 && maos[1].size > 10);
  assert.ok(padaria.padeiros.every(p => p.userData.tempoPadaria > 6));
});

test('exclamação dos padeiros exige trigo e vitrine vazios ao mesmo tempo', () => {
  const visual = visualPadaria(), padaria = visual.produtos.pao;
  for (const [trigo, paes, alerta] of [[0, 0, true], [0, 1, false], [0, 18, false], [1, 0, false], [0, 0, true]]) {
    visual.sim.estado.produtos.pao.prateleira = paes;
    Cena.prototype.animarPadeiros.call(visual, padaria, { trigoPadaria: trigo, farinha: 0 }, 0, 1 / 60);
    assert.ok(padaria.padeiros.every(p => p.userData.alertaTrigo.visible === alerta), `trigo ${trigo}, pães ${paes}`);
  }
});

test('sem trigo os padeiros esperam dentro da padaria voltados ao centro e movem apenas a cabeça', () => {
  const visual = visualPadaria(), padaria = visual.produtos.pao;
  const producao = { trigoPadaria: 0, farinha: 0 };
  Cena.prototype.animarPadeiros.call(visual, padaria, producao, 0, 1 / 60);
  const cabecas = padaria.padeiros.map(p => p.userData.cabecaPadaria.rotation.y);
  for (let quadro = 1; quadro < 120; quadro++) Cena.prototype.animarPadeiros.call(visual, padaria, producao, quadro / 60, 1 / 60);
  padaria.padeiros.forEach((p, i) => {
    const d = p.userData;
    assert.equal(p.position.x, padaria.postosEspera[i].x);
    assert.equal(p.position.z, padaria.postosEspera[i].z);
    assert.ok(p.position.x > PRODUTOS.pao.prateleira.x + PRODUTOS.pao.prateleira.w / 2 + 0.3, 'fica dentro da padaria, atrás da vitrine');
    assert.ok(segmentoLivre({ x: p.position.x, z: p.position.z }, { x: p.position.x, z: p.position.z }, visual.sim.obstaculos(), 0.3));
    assert.ok(Math.abs(p.rotation.y + Math.PI / 2) < 0.001);
    assert.equal(d.alertaTrigo.visible, true);
    assert.equal(d.cargaPadaria.visible, false);
    assert.equal(d.corpo.position.y, 0);
    assert.deepEqual(d.corpo.rotation.toArray().slice(0, 3), [0, 0, 0]);
    assert.equal(d.marcha.intensidade, 0);
    assert.notEqual(d.cabecaPadaria.rotation.y, cabecas[i]);
    assert.equal(p.getObjectByName('chapeu-padaria').parent, d.cabecaPadaria);
  });
});

test('vitrine sem espaço interrompe os dois padeiros; farinha restante pode terminar sem trigo', () => {
  const visual = visualPadaria(), padaria = visual.produtos.pao;
  visual.sim.estado.produtos.pao.prateleira = 18;
  Cena.prototype.animarPadeiros.call(visual, padaria, { trigoPadaria: 4, farinha: 1 }, 0, 1 / 60);
  assert.ok(padaria.padeiros.every(p => !p.userData.ativoPadaria && !p.userData.alertaTrigo.visible && !p.userData.cargaPadaria.visible));
  visual.sim.estado.produtos.pao.prateleira = 16;
  Cena.prototype.animarPadeiros.call(visual, padaria, { trigoPadaria: 4, farinha: 1 }, 0.5, 1 / 60);
  assert.equal(padaria.padeiros[1].userData.ativoPadaria, true);
  visual.sim.estado.produtos.pao.prateleira = 0;
  Cena.prototype.animarPadeiros.call(visual, padaria, { trigoPadaria: 0, farinha: 1 }, 1, 1 / 60);
  assert.equal(padaria.padeiros[0].userData.ativoPadaria, false);
  assert.equal(padaria.padeiros[1].userData.ativoPadaria, true);
  assert.ok(padaria.padeiros.every(p => p.userData.alertaTrigo.visible));
});

test('padaria completa 16/18 e 17/18 com trigo, preserva os pães restantes e repõe sem gastar outro ingrediente', () => {
  for (const estoque of [16, 17]) {
    const sim = abrirPadaria();
    sim.estado.produtos.pao.prateleira = estoque;
    sim.estado.producao.trigoPadaria = 8;
    for (let i = 0; i < 100; i++) sim.atualizarProducao(0.1);
    assert.equal(sim.estado.produtos.pao.prateleira, 18);
    assert.equal(sim.estado.producao.trigoPadaria, 7);
    assert.equal(sim.estado.producao.paesReserva, estoque - 15);
    const retomado = new Simulacao(sim.estado);
    assert.equal(retomado.estado.producao.paesReserva, estoque - 15);
    retomado.estado.produtos.pao.prateleira--;
    retomado.atualizarProducao(0.1);
    assert.equal(retomado.estado.produtos.pao.prateleira, 18);
    assert.equal(retomado.estado.producao.paesReserva, estoque - 16);
    assert.equal(retomado.estado.producao.trigoPadaria, 7);
  }
});

test('retomar, parar e pausar os padeiros mantém deslocamento contínuo sem atravessar balcões', () => {
  const visual = visualPadaria(), padaria = visual.produtos.pao;
  const obstaculos = visual.sim.obstaculos();
  const producao = { trigoPadaria: 0, farinha: 0 };
  Cena.prototype.animarPadeiros.call(visual, padaria, producao, 0, 1 / 60);
  for (let quadro = 1; quadro < 2400; quadro++) {
    if (quadro === 60) Object.assign(producao, { trigoPadaria: 2, farinha: 1 });
    if (quadro === 1200) Object.assign(producao, { trigoPadaria: 0, farinha: 0 });
    const anteriores = padaria.padeiros.map(p => p.position.clone());
    Cena.prototype.animarPadeiros.call(visual, padaria, producao, quadro / 60, 1 / 60);
    padaria.padeiros.forEach((p, i) => {
      const deslocamento = p.position.distanceTo(anteriores[i]);
      assert.ok(deslocamento <= 3.5 / 60 + 0.001, `quadro ${quadro}, padeiro ${i}, distância ${deslocamento}`);
      assert.ok(segmentoLivre({ x: anteriores[i].x, z: anteriores[i].z }, { x: p.position.x, z: p.position.z }, obstaculos, 0.12), `quadro ${quadro}, padeiro ${i}: ${p.position.toArray()}`);
      if (deslocamento > 0.0001) {
        const anguloMovimento = Math.atan2(p.position.x - anteriores[i].x, p.position.z - anteriores[i].z);
        const anguloPadeiro = p.userData.atorPadaria.angulo;
        const diferenca = Math.atan2(Math.sin(anguloPadeiro - anguloMovimento), Math.cos(anguloPadeiro - anguloMovimento));
        assert.ok(Math.abs(diferenca) < 0.001, `quadro ${quadro}, padeiro ${i}: direção acompanha o deslocamento`);
        assert.equal(p.userData.atorPadaria.andando, true);
      }
    });
  }
  padaria.padeiros.forEach((p, i) => {
    assert.ok(Math.hypot(p.position.x - padaria.postosEspera[i].x, p.position.z - padaria.postosEspera[i].z) < 0.03);
    const posicao = p.position.clone(), fase = p.userData.tempoPadaria;
    Cena.prototype.animarPadeiros.call(visual, padaria, producao, 40, 0);
    assert.ok(p.position.equals(posicao));
    assert.equal(p.userData.tempoPadaria, fase);
  });
});

test('construir a padaria abre o piso inteiro e anima equipamentos', () => {
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
  const trigo = cena.getObjectByName('ampliacao-padaria');
  assert.equal(trigo.scale.x, 1);
  assert.equal(cena.getObjectByName('andaime-padaria').visible, false);
  assert.ok(bairro.atualizarEstagio(4, 3.5) > 0);
});
