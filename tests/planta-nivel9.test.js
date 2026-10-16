import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CONFIG, PRODUTOS, ALA_PADARIA } from '../src/jogo/configuracao.js';
import { PLANTA_INICIAL, PLANTA_AMPLIADA } from '../src/jogo/planta.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { Cena } from '../src/jogo/cena.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function abrir() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 200; sim.estado.dinheiro = 2300;
  assert.ok(sim.comprarMelhoria('alaProducao').sucesso);
  sim.comprarMelhoria('alaTrigo'); assert.ok(sim.comprarMelhoria('alaPadaria').sucesso);
  sim.proximoCliente = Infinity;
  return sim;
}

test('N9 segue o SVG: ampliação à direita e padaria longitudinal na parede direita', () => {
  const svg = readFileSync(new URL('../docs/mercadinhoDoBairro.drawio.svg', import.meta.url), 'utf8');
  const modelo = svg.match(/\bcontent="([^"]*)"/)[1].replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  assert.match(modelo, /Level 9 - 10/);
  const bakery = modelo.match(/<mxCell[^>]*id="jz9tYpKwZjYspEhf_ZnR-191"[\s\S]*?<\/mxCell>/)[0];
  assert.match(bakery, /value="Bakery"/);
  assert.match(bakery, /height="60" width="47.06" x="457.2"/);
  assert.equal(PLANTA_AMPLIADA.salao.w, 24); assert.equal(PLANTA_AMPLIADA.salao.d, 16);
  assert.equal(PLANTA_AMPLIADA.limites.minX, PLANTA_INICIAL.limites.minX);
  assert.equal(PLANTA_AMPLIADA.limites.maxZ, PLANTA_INICIAL.limites.maxZ);
  const p = PRODUTOS.pao;
  assert.ok(p.prateleira.x > PLANTA_INICIAL.limites.maxX);
  assert.ok(p.prateleira.d > p.prateleira.w);
  assert.ok(p.pontosCompra.every(a => a.x < p.prateleira.x - p.prateleira.w / 2));
  assert.ok(ALA_PADARIA.forno.x > p.prateleira.x);
  const sim = abrir();
  assert.ok(!sim.obstaculos().some(o => o.lateral));
  assert.ok(sim.obstaculos().some(o => o.x === PLANTA_AMPLIADA.limites.maxX && o.d === 16));
});

test('padaria girada mantém modelos, pães e trajetos dos padeiros dentro do salão e livres', () => {
  const sim = abrir();
  const visual = { cena: new THREE.Scene(), produtos: {}, sim, criarLabel() {} };
  Cena.prototype.construirPadaria.call(visual);
  const padaria = visual.produtos.pao;
  const balcao = PRODUTOS.pao.prateleira;
  assert.ok(ALA_PADARIA.forno.x - ALA_PADARIA.forno.w / 2 - (balcao.x + balcao.w / 2) > 2);
  const paineis = padaria.grupo.children.filter(o => o.name === 'fechamento-madeira-padaria');
  assert.equal(paineis.length, ALA_PADARIA.fechamento.length + 1); // O balcão de entrega usa o volume da estação.
  for (const painel of paineis) assert.equal(painel.material.color.getHex(), padaria.grupo.getObjectByName('base-madeira-padaria').material.color.getHex());
  for (const painel of ALA_PADARIA.fechamento) assert.ok(sim.obstaculos().includes(painel));
  const pontosMoedor = padaria.roteiros[0].flatMap(e => [e.de, e.para]);
  const pontosForneiro = padaria.roteiros[1].flatMap(e => [e.de, e.para]);
  assert.ok(Math.min(...pontosForneiro.map(p => p.z)) - Math.max(...pontosMoedor.map(p => p.z)) >= 1.19);
  const bounds = new THREE.Box3().setFromObject(padaria.grupo);
  assert.ok(bounds.max.x < PLANTA_AMPLIADA.limites.maxX - 0.14);
  assert.ok(bounds.min.z > PLANTA_AMPLIADA.limites.minZ + 0.14);
  for (const fruta of padaria.frutas) {
    const p = PRODUTOS.pao.prateleira;
    assert.ok(Math.abs(fruta.position.x - p.x) < p.w / 2);
    assert.ok(Math.abs(fruta.position.z - p.z) < p.d / 2);
  }
  for (const roteiro of padaria.roteiros) for (const etapa of roteiro) {
    assert.ok(segmentoLivre(etapa.de, etapa.para, sim.obstaculos(), 0.3), JSON.stringify(etapa));
  }
});

test('save V9 conserva ingredientes, produção parcial, pães e cargas após mover a padaria', () => {
  const sim = abrir(); sim.estado.versaoLayout = 9;
  Object.assign(sim.estado.producao, { trigoPadaria: 4, farinha: 2, progressoMoagem: 0.7, progressoForno: 0.9, paesProduzidos: 12 });
  Object.assign(sim.estado.produtos.pao, { prateleira: 6, apresentado: true });
  Object.assign(sim.estado.jogador, { x: 19.9, z: -2.9, inventario: ['trigo'] });
  const migrado = new Simulacao(structuredClone(sim.estado));
  assert.equal(migrado.estado.versaoLayout, CONFIG.versaoLayout);
  assert.deepEqual(migrado.estado.producao, sim.estado.producao);
  assert.deepEqual(migrado.estado.produtos.pao, sim.estado.produtos.pao);
  assert.deepEqual(migrado.estado.jogador.inventario, ['trigo']);
  assert.ok(segmentoLivre(migrado.estado.jogador, migrado.estado.jogador, migrado.obstaculos(), 0.32));
  assert.deepEqual(new Simulacao(structuredClone(migrado.estado)).estado, migrado.estado);
});
