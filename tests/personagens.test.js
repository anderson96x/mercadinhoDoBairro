import test from 'node:test';
import assert from 'node:assert/strict';
import { Cena, ajustarSacola, ajudanteUsaCaixaMadeira, aplicarPaletaFuncionario, criarSacola, personagem, posicaoProdutoSacola, usarCaixaMadeira } from '../src/jogo/cena.js';
import { PRODUTOS } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { APARENCIAS_CLIENTES } from '../src/jogo/aparencias-clientes.js';
import { PALETAS } from '../src/jogo/personalizacao.js';

test('sacola cresce com a compra e organiza os produtos em camadas internas', () => {
  const sacola = criarSacola();
  ajustarSacola(sacola, 1, 1);
  const escalaPequena = sacola.userData.papel.scale.clone();
  ajustarSacola(sacola, 5, 1);
  assert.ok(sacola.userData.papel.scale.x > escalaPequena.x);
  assert.ok(sacola.userData.papel.scale.y > escalaPequena.y);
  const posicoes = Array.from({ length: 5 }, (_, indice) => posicaoProdutoSacola(indice, 5));
  assert.ok(posicoes.slice(3).every(posicao => posicao.y > posicoes[0].y));
  assert.ok(posicoes.every(posicao => Math.abs(posicao.x) <= 0.2 && posicao.y < 0.7));
});

test('jogador e funcionários usam calça preta, camisa e chapéu na cor da loja', () => {
  const modelos = [
    personagem(0xffffff, 0xf2c49c, true),
    personagem(0xffffff, 0xf2c49c, false, [], null, 'caixa'),
    personagem(0xffffff, 0xf2c49c, false, [], null, 'ajudante')
  ];
  for (const modelo of modelos) {
    const { pernaE, pernaD, uniforme } = modelo.userData;
    assert.equal(pernaE.material.color.getHex(), 0x17191b);
    assert.equal(pernaD.material.color.getHex(), 0x17191b);
    assert.equal(uniforme.chapeu.length, 2);
    aplicarPaletaFuncionario(modelo, PALETAS[2]);
    assert.ok(uniforme.camisa.every(m => `#${m.material.color.getHexString()}` === PALETAS[2].principal));
    assert.ok(uniforme.chapeu.every(m => `#${m.material.color.getHexString()}` === PALETAS[2].principal));
  }
});

test('jogador sem produtos mantém os braços livres ao andar', () => {
  const modelo = personagem(0xffffff, 0xf2c49c, true);
  Cena.prototype.animarPersonagem(modelo, { x: 0, z: 0, andando: true }, 1 / 60, 0.12, []);
  const { bracoE, bracoD } = modelo.userData;
  assert.ok(bracoE.userData.mao.position.y < 0.5);
  assert.ok(bracoD.userData.mao.position.y < 0.5);
  assert.ok(bracoE.userData.mao.position.z * bracoD.userData.mao.position.z <= 0);
});

test('jogador sentado no escritorio digita no computador', () => {
  const modelo = personagem(0xffffff, 0xf2c49c, true);
  const ator = { x: 0, z: 0, andando: false, sentado: true, sentadoEscritorio: true };
  Cena.prototype.animarPersonagem(modelo, ator, 1 / 60, 0, []);
  Cena.prototype.animarComputador(modelo, 0, true);
  const maoE = modelo.userData.bracoE.userData.mao.position.clone();
  const maoD = modelo.userData.bracoD.userData.mao.position.clone();
  assert.ok(maoE.z > 0.7 && maoD.z > 0.7);
  assert.ok(modelo.userData.corpo.rotation.x < 0);
  Cena.prototype.animarComputador(modelo, Math.PI / 24, true);
  assert.ok(!maoE.equals(modelo.userData.bracoE.userData.mao.position)
    || !maoD.equals(modelo.userData.bracoD.userData.mao.position));
});

test('ajudante usa caixa de madeira apenas quando carrega produtos da horta', () => {
  const modelo = personagem(0xffffff, 0xf2c49c, false, [], null, 'ajudante');
  const ajudante = { x: 0, z: 0, andando: false, destino: 'horta', inventario: [] };
  assert.equal(ajudanteUsaCaixaMadeira(ajudante), false);
  ajudante.inventario = ['tomate'];
  assert.equal(ajudanteUsaCaixaMadeira(ajudante), true);
  usarCaixaMadeira(modelo, true);
  assert.equal(modelo.userData.caixaMadeira.visible, true);
  assert.ok(modelo.userData.visualCestaNormal.every(parte => !parte.visible));
  Cena.prototype.animarPersonagem(modelo, ajudante, 0, 0, ajudante.inventario);
  assert.ok(modelo.userData.bracoE.userData.mao.position.x < -0.4);
  assert.ok(modelo.userData.bracoD.userData.mao.position.x > 0.4);

  modelo.userData.inventario = [];
  ajudante.destino = 'prateleira'; ajudante.inventario = [];
  assert.equal(ajudanteUsaCaixaMadeira(ajudante), false);
  ajudante.inventario = ['produto-futuro-nao-agricola'];
  assert.equal(ajudanteUsaCaixaMadeira(ajudante), false);
  usarCaixaMadeira(modelo, false);
  assert.equal(modelo.userData.caixaMadeira.visible, false);
  assert.ok(modelo.userData.visualCestaNormal.every(parte => parte.visible));
});

test('ajudante sem carga fica sem recipiente e com as mãos livres', () => {
  const modelo = personagem(0xffffff, 0xf2c49c, false, [], null, 'ajudante');
  const ajudante = { x: 0, z: 0, andando: true, destino: 'horta', inventario: [] };
  modelo.userData.cesta.visible = ajudante.inventario.length > 0;
  Cena.prototype.animarPersonagem(modelo, ajudante, 1 / 60, 0.12, ajudante.inventario);
  assert.equal(modelo.userData.cesta.visible, false);
  assert.ok(modelo.userData.bracoE.userData.mao.position.y < 0.5);
  assert.ok(modelo.userData.bracoD.userData.mao.position.y < 0.5);
});

test('clientes usam 144 aparências distintas em ordem aleatória sem repetição imediata', () => {
  assert.equal(APARENCIAS_CLIENTES.length, 144);
  const combinacoes = APARENCIAS_CLIENTES.map(({ genero, pele, cabelo, roupa }) => `${genero}-${pele}-${cabelo}-${roupa}`);
  assert.equal(new Set(combinacoes).size, 144);
  assert.equal(new Set(APARENCIAS_CLIENTES.map(a => a.pele)).size, 6);
  assert.ok(new Set(APARENCIAS_CLIENTES.map(a => a.cabelo)).size >= 12);
  assert.equal(new Set(APARENCIAS_CLIENTES.map(a => a.roupa)).size, 4);
  assert.ok(APARENCIAS_CLIENTES.some(a => a.oculos === 'grau'));
  assert.ok(APARENCIAS_CLIENTES.some(a => a.oculos === 'sol'));
  const homens = APARENCIAS_CLIENTES.filter(a => a.genero === 'homem');
  assert.ok(homens.some(a => a.barba));
  assert.ok(homens.some(a => !a.barba));
  assert.equal(APARENCIAS_CLIENTES.some(a => a.genero === 'mulher' && a.barba), false);

  const sim = new Simulacao(), sorteadas = [];
  for (let i = 0; i < 144; i++) {
    assert.equal(sim.criarCliente(), true);
    sorteadas.push(sim.clientes.pop().aparencia);
  }
  assert.equal(new Set(sorteadas).size, 144);
  assert.deepEqual([...sorteadas].sort((a, b) => a - b), Array.from(APARENCIAS_CLIENTES.keys()));
  sim.criarCliente();
  assert.ok(sim.clientes[0].aparencia >= 0 && sim.clientes[0].aparencia < 144);
  assert.notEqual(sim.clientes[0].aparencia, sorteadas.at(-1));
});

test('mulheres e homens têm penteados, roupas e acessórios próprios', () => {
  const estilos = {
    mulher: {
      cabelos: new Set(['chanel', 'afro_longo', 'coque', 'liso', 'rabo', 'ondas', 'afro_curto_feminino', 'afro_alto_feminino', 'coque_afro']),
      roupas: new Set(['vestido', 'blusa_saia']),
      acessorios: new Set(['nenhum', 'brincos', 'lenco', 'colar'])
    },
    homem: {
      cabelos: new Set(['raspado', 'curto', 'afro_curto', 'afro_alto', 'degrade', 'topete', 'cacheado']),
      roupas: new Set(['camisa', 'jaqueta']),
      acessorios: new Set(['nenhum', 'gravata', 'bolso'])
    }
  };
  for (const genero of ['mulher', 'homem']) {
    const perfis = APARENCIAS_CLIENTES.filter(a => a.genero === genero);
    assert.equal(perfis.length, 72);
    for (const visual of perfis) {
      assert.ok(estilos[genero].cabelos.has(visual.cabelo));
      assert.ok(estilos[genero].roupas.has(visual.roupa));
      assert.ok(estilos[genero].acessorios.has(visual.acessorio));
    }
    assert.equal(new Set(perfis.map(a => a.pele)).size, 6);
    assert.ok(perfis.some(a => a.oculos));
  }
  assert.equal(APARENCIAS_CLIENTES.some(a => a.cabelo === 'trancas'), false);
  const pelesNegras = new Set([0x75472f, 0x4c2f25]);
  const clientesNegros = APARENCIAS_CLIENTES.filter(a => pelesNegras.has(a.pele));
  assert.ok(clientesNegros.filter(a => a.cabelo.includes('afro') || a.cabelo === 'cacheado').length >= clientesNegros.length / 2);
});

test('cabelos usam cores naturais compatíveis com a pele e grisalhos representam idosos', () => {
  const coresNaturais = new Set([0x211d1b, 0x3e2c25, 0x6b452f, 0xa6532f, 0xc9a76b, 0x999a98]);
  const peles = [...new Set(APARENCIAS_CLIENTES.map(a => a.pele))];
  for (const visual of APARENCIAS_CLIENTES) {
    const tom = peles.indexOf(visual.pele);
    assert.ok(coresNaturais.has(visual.corCabelo));
    assert.equal(visual.idoso, visual.tomCabelo === 'grisalho');
    if (tom >= 2) assert.ok(!['loiro', 'ruivo'].includes(visual.tomCabelo));
    if (tom >= 4) assert.ok(['preto', 'castanho_escuro', 'grisalho'].includes(visual.tomCabelo));
  }
  for (const genero of ['mulher', 'homem']) {
    const perfis = APARENCIAS_CLIENTES.filter(a => a.genero === genero);
    for (const tom of ['preto', 'castanho_escuro', 'castanho', 'ruivo', 'loiro', 'grisalho']) {
      assert.ok(perfis.some(a => a.tomCabelo === tom), `${genero} precisa incluir cabelo ${tom}`);
    }
    for (const pele of peles) assert.ok(perfis.some(a => a.pele === pele && a.idoso));
  }
  const visual = APARENCIAS_CLIENTES.find(a => a.idoso);
  const modelo = personagem(visual.corRoupa, visual.pele, false, [], visual);
  const sobrancelhas = modelo.userData.corpo.children.filter(m => m.isMesh
    && m.material.color.getHex() === visual.corCabelo && Math.abs(m.position.y - 1.25) < 0.001);
  assert.equal(sobrancelhas.length, 2);
});

test('poucos clientes têm porte corpulento, distribuído entre gêneros e tons de pele', () => {
  const corpulentos = APARENCIAS_CLIENTES.filter(a => a.porte === 'corpulento');
  assert.equal(corpulentos.length, 18);
  assert.equal(corpulentos.filter(a => a.genero === 'mulher').length, 9);
  assert.equal(corpulentos.filter(a => a.genero === 'homem').length, 9);
  assert.equal(new Set(corpulentos.map(a => a.pele)).size, 6);

  const grande = corpulentos[0];
  const regular = APARENCIAS_CLIENTES.find(a => a.genero === grande.genero && a.porte === 'regular');
  const modeloGrande = personagem(grande.corRoupa, grande.pele, false, [], grande);
  const modeloRegular = personagem(regular.corRoupa, regular.pele, false, [], regular);
  assert.ok(modeloGrande.userData.torso.scale.x > modeloRegular.userData.torso.scale.x * 1.9);
  assert.ok(modeloGrande.userData.torso.scale.z > modeloRegular.userData.torso.scale.z * 1.5);
  assert.ok(modeloGrande.userData.barriga);
  assert.equal(modeloRegular.userData.barriga, null);
  assert.ok(modeloGrande.userData.cesta.position.z > modeloRegular.userData.cesta.position.z);
  const olhosGrandes = modeloGrande.userData.corpo.children.filter(m => m.isMesh
    && m.material.color.getHex() === 0x3e352c && Math.abs(m.position.y - 1.17) < 0.001);
  assert.equal(olhosGrandes.length, 2);
  assert.ok(olhosGrandes.every(olho => olho.position.z >= 0.3));
  Cena.prototype.animarPersonagem(modeloGrande, { x: 0, z: 0, andando: true }, 1 / 60, 1, []);
  assert.ok(Number.isFinite(modeloGrande.userData.pernaE.rotation.x));
});

test('penteados, roupas e óculos geram malhas visíveis sem alterar a animação', () => {
  for (const visual of [
    APARENCIAS_CLIENTES.find(a => a.cabelo === 'afro_longo' && a.roupa === 'vestido' && a.oculos),
    APARENCIAS_CLIENTES.find(a => a.cabelo === 'liso' && a.roupa === 'blusa_saia'),
    APARENCIAS_CLIENTES.find(a => a.cabelo === 'raspado' && a.roupa === 'jaqueta'),
    APARENCIAS_CLIENTES.find(a => a.cabelo === 'afro_curto' && a.roupa === 'camisa' && a.oculos)
  ]) {
    assert.ok(visual);
    const modelo = personagem(visual.corRoupa, visual.pele, false, [], visual);
    assert.ok(modelo.userData.corpo.children.length > 10);
    assert.equal(modelo.userData.bracoE.userData.mao.material.color.getHex(), visual.pele);
    assert.equal(modelo.userData.pernaE.material.color.getHex(), visual.genero === 'mulher' ? visual.pele : visual.corCalca);
    Cena.prototype.animarPersonagem(modelo, { x: 0, z: 0, andando: true }, 1 / 60, 1, []);
    assert.ok(Number.isFinite(modelo.userData.pernaE.rotation.x));
  }
});

test('cliente sem cesta nasce com os braços relaxados e ganha a pose de carga ao pegá-la', () => {
  const visual = APARENCIAS_CLIENTES.find(a => a.porte === 'regular');
  const modelo = personagem(visual.corRoupa, visual.pele, false, [], visual);
  const ator = { x: 0, z: 0, andando: true, temCesta: false, levaSacolas: false };
  Cena.prototype.animarPersonagem(modelo, ator, 1 / 60, 0.12, []);
  const d = modelo.userData;
  const pega = d.cesta.userData.pega.clone().add(d.cesta.position);
  assert.ok(d.bracoE.userData.mao.position.y < 0.5);
  assert.ok(d.bracoD.userData.mao.position.y < 0.5);
  assert.ok(d.bracoE.userData.mao.position.distanceTo(pega) > 0.3);
  assert.ok(d.bracoE.userData.mao.position.z * d.bracoD.userData.mao.position.z <= 0);

  ator.temCesta = true;
  Cena.prototype.animarPersonagem(modelo, ator, 1 / 60, 0.12, []);
  assert.ok(d.bracoE.userData.mao.position.distanceTo(pega) < 1e-8);
});

function preparar(origem = 'horta', duracao = 0.26) {
  const modelo = personagem(0x72a9bb);
  const ator = { x: -4.8, z: -1.7, andando: false };
  const animar = (inventario, dt = 0) => Cena.prototype.animarPersonagem(modelo, ator, dt, 0, inventario, origem, duracao);
  return { modelo, d: modelo.userData, animar };
}

test('sentar e levantar preserva os produtos nas mãos do jogador', () => {
  const modelo = personagem(0xffffff, 0xf2c49c, true);
  const ator = { x: 3.9, z: 4.1, angulo: Math.PI / 2, sentado: true, andando: false };
  const d = modelo.userData;
  const animar = dt => Cena.prototype.animarPersonagem(modelo, ator, dt, 0, ['tomate', 'milho']);
  animar(0.4);
  assert.equal(d.sentar, 1);
  assert.ok(d.coxas.every(c => c.visible));
  modelo.updateMatrixWorld(true);
  const cesta = d.cesta.getWorldPosition(d.cesta.position.clone());
  assert.ok(cesta.y > 0.23);
  assert.equal(d.cesta.children.filter(m => m.isMesh).length, 0);
  assert.equal(d.carga.children.length, 2);
  animar(0);
  assert.equal(d.sentar, 1);
  ator.sentado = false; ator.andando = true;
  animar(0.4);
  assert.equal(d.sentar, 0);
  assert.ok(d.coxas.every(c => !c.visible));
  assert.equal(d.cesta.position.x, 0);
  assert.equal(d.cesta.position.z, 0.5);
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
