import test from 'node:test';
import assert from 'node:assert/strict';
import { Cena, personagem } from '../src/jogo/cena.js';
import { PRODUTOS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';

function preparar(origem = 'horta', duracao = 0.26) {
  const modelo = personagem(0x72a9bb);
  const ator = { x: -4.8, z: -1.7, andando: false };
  const animar = (inventario, dt = 0) => Cena.prototype.animarPersonagem(modelo, ator, dt, 0, inventario, origem, duracao);
  return { modelo, d: modelo.userData, animar };
}

test('sentar coloca a cesta no chão e levantar recupera a cesta e a postura', () => {
  const modelo = personagem(0xffffff, 0xf2c49c, true);
  const ator = { x: 3.9, z: 4.1, angulo: Math.PI / 2, sentado: true, andando: false };
  const d = modelo.userData;
  const animar = dt => Cena.prototype.animarPersonagem(modelo, ator, dt, 0, ['tomate', 'milho']);
  animar(0.4);
  assert.equal(d.sentar, 1);
  assert.ok(d.coxas.every(c => c.visible));
  modelo.updateMatrixWorld(true);
  const cesta = d.cesta.getWorldPosition(d.cesta.position.clone());
  assert.ok(Math.abs(cesta.y - 0.23) < 1e-8);
  assert.ok(Math.abs(cesta.z - 5.1) < 1e-8);
  assert.equal(d.carga.children.length, 2);
  animar(0);
  assert.equal(d.sentar, 1);
  ator.sentado = false; ator.andando = true;
  animar(0.4);
  assert.equal(d.sentar, 0);
  assert.ok(d.coxas.every(c => !c.visible));
  assert.equal(d.cesta.position.x, 0);
  assert.equal(d.cesta.position.z, 0.58);
  assert.equal(d.carga.children.length, 2);
});

for (const [nome, origem, duracao] of [['jogador', 'horta', 0.26], ['cliente', 'prateleira', 0.55], ['ajudante', 'horta', 0.44]]) {
  test(`${nome}: leva o produto na mão e depois o deposita na cesta à frente`, () => {
    const { d, animar } = preparar(origem, duracao);
    animar([]);
    animar(['tomate'], duracao * 0.1);
    assert.equal(d.coleta.fonte, PRODUTOS.tomate[origem]);
    assert.equal(d.carga.children[0].visible, false);
    assert.equal(d.produtoNaMao.visible, false);
    animar(['tomate'], duracao * 0.4);
    assert.equal(d.produtoNaMao.visible, true);
    assert.equal(d.carga.children[0].visible, false);
    assert.ok(d.produtoNaMao.position.distanceTo(d.bracoD.userData.mao.position) < 1e-8);
    assert.ok(d.produtoNaMao.position.z > 0);
    animar(['tomate'], duracao * 0.4);
    assert.equal(d.produtoNaMao.visible, false);
    assert.equal(d.carga.children[0].visible, true);
    assert.ok(d.carga.children[0].position.clone().add(d.cesta.position).z > 0);
    animar(['tomate'], duracao * 0.2);
    assert.equal(d.coleta, null);
  });
}

test('inventário salvo ocupa a cesta, inclusive na capacidade máxima', () => {
  const { d, animar } = preparar();
  const inventario = Array.from({ length: 16 }, (_, i) => i % 2 ? 'milho' : 'tomate');
  animar(inventario);
  assert.equal(d.coleta, null);
  assert.equal(d.carga.children.length, 16);
  for (const fruta of d.carga.children) {
    assert.ok(Math.abs(fruta.position.x) < 0.3);
    assert.ok(Math.abs(fruta.position.z) < 0.2);
    assert.ok(fruta.position.y < 0.33);
    assert.equal(fruta.visible, true);
  }
  assert.deepEqual(d.inventario, inventario);
});

test('pausa congela a coleta e reposição remove o produto sem deixar cópia na mão', () => {
  const { d, animar } = preparar();
  animar([]);
  animar(['milho'], 0.13);
  const mao = d.produtoNaMao.position.clone();
  animar(['milho'], 0);
  assert.equal(d.coleta.decorrido, 0.13);
  assert.ok(mao.equals(d.produtoNaMao.position));
  animar([]);
  assert.equal(d.coleta, null);
  assert.equal(d.produtoNaMao.visible, false);
  assert.equal(d.carga.children.length, 0);
});

for (const ajudante of [false, true]) {
  test(`${ajudante ? 'ajudante' : 'jogador'}: reposição leva o tomate da cesta até a posição real da prateleira`, () => {
    const sim = new Simulacao();
    const ator = ajudante ? sim.ajudante : sim.estado.jogador;
    Object.assign(ator, PRODUTOS.tomate.reposicao, { inventario: ['tomate'], destino: 'prateleira' });
    const modelo = personagem(0x72a9bb);
    const d = modelo.userData;
    const duracao = ajudante ? 0.36 : 0.26;
    const animar = dt => Cena.prototype.animarPersonagem.call({ sim }, modelo, ator, dt, 0, ator.inventario, 'horta', duracao);
    animar(0);
    if (ajudante) sim.atualizarAjudante(0.01);
    else sim.interagir();
    assert.equal(sim.estado.produtos.tomate.prateleira, 1);
    assert.equal(ator.inventario.length, 0);
    animar(0);
    assert.ok(d.reposicao);
    assert.equal(d.produtoNaMao.visible, true);
    assert.ok(d.produtoNaMao.position.equals(d.reposicao.inicio));
    animar(duracao * 0.5);
    assert.ok(d.produtoNaMao.position.equals(d.bracoD.userData.mao.position));
    const posicao = d.produtoNaMao.position.clone();
    animar(0);
    assert.ok(posicao.equals(d.produtoNaMao.position));
    animar(duracao * 0.34999);
    modelo.updateMatrixWorld(true);
    const mundo = d.produtoNaMao.getWorldPosition(posicao.clone());
    assert.ok(Math.abs(mundo.x - (PRODUTOS.tomate.prateleira.x - 0.83)) < 0.001);
    assert.ok(Math.abs(mundo.y - 1.11) < 0.001);
    assert.ok(Math.abs(mundo.z - (PRODUTOS.tomate.prateleira.z - 0.5)) < 0.001);
    animar(duracao * 0.16);
    assert.equal(d.produtoNaMao.visible, false);
    assert.equal(d.reposicao, null);
    animar(0.1);
    assert.equal(d.reposicao, null, 'não repete uma reposição já concluída');
    assert.equal(sim.estado.produtos.tomate.prateleira, 1);
  });
}
