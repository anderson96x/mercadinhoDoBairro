import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, PRODUTOS, ESCRITORIO } from '../src/jogo/configuracao.js';
import { Simulacao } from '../src/jogo/simulacao.js';
import { geometriaEstacao, intervaloEstacoes, distanciaEstacao } from '../src/jogo/estacoes.js';
import { segmentoLivre } from '../src/jogo/navegacao.js';

function lojaCompleta() {
  const sim = new Simulacao();
  sim.estado.estatisticas.clientes = 350; sim.estado.dinheiro = 40000;
  for (const id of ['caixa','milho','alaProducao','alaLeite','ajudante','alaTrigo','cestasExtras','alaPadaria',
    'logistica','alaArtesanal','apiario','queijaria','cozinhaGeleia']) assert.equal(sim.comprarMelhoria(id).sucesso,true,id);
  sim.proximoCliente = Infinity;
  return sim;
}

test('áreas de interação de produtos diferentes não se sobrepõem', () => {
  const pontos = Object.entries(PRODUTOS).flatMap(([id,p]) => (id === 'pao' ? ['reposicao'] : ['coleta','reposicao'])
    .map(tipo => ({ id, tipo, ...geometriaEstacao(id, tipo) })));
  for(let i=0;i<pontos.length;i++) for(let j=i+1;j<pontos.length;j++) {
    assert.ok(intervaloEstacoes(pontos[i],pontos[j]) > CONFIG.raioInteracao * 2,
      `${pontos[i].id}/${pontos[i].tipo} e ${pontos[j].id}/${pontos[j].tipo}`);
  }
});

test('cada ponto de coleta pega somente seu produto com todas as construções abertas', () => {
  for (const [id,p] of Object.entries(PRODUTOS).filter(([id])=>id!=='pao')) {
    const sim = lojaCompleta();
    for(const e of Object.values(sim.estado.produtos)) e.horta = 8;
    Object.assign(sim.estado.jogador,p.coleta);
    sim.tempo=1; sim.interagir();
    assert.deepEqual(sim.estado.jogador.inventario,[id],id);
    for(const [outro,e] of Object.entries(sim.estado.produtos)) assert.equal(e.horta,outro===id?7:8,outro);
  }
});

test('inventário misto abastece apenas a banca visitada', () => {
  const ids = Object.keys(PRODUTOS).filter(id=>id!=='pao');
  for(const id of ids) {
    const sim=lojaCompleta();
    const outros=ids.filter(outro=>outro!==id).slice(0,3);
    sim.estado.jogador.inventario=[...outros,id];
    Object.assign(sim.estado.jogador,PRODUTOS[id].reposicao);
    sim.tempo=1; sim.interagir();
    assert.deepEqual(sim.estado.jogador.inventario,outros,id);
    for(const [outro,e] of Object.entries(sim.estado.produtos)) assert.equal(e.prateleira,outro===id?1:0,outro);
  }
});

test('escritório compacto fica separado do milho e devolve acesso ao salão', () => {
  const sim=lojaCompleta(); sim.estado.jogador.inventario=['milho'];
  Object.assign(sim.estado.jogador,{x:0.9,z:ESCRITORIO.limites.maxZ-0.35});
  assert.equal(segmentoLivre(sim.estado.jogador, PRODUTOS.milho.prateleira, sim.obstaculos()), false);
  assert.ok(distanciaEstacao(sim.estado.jogador, PRODUTOS.milho.prateleira) >= CONFIG.raioInteracao);
  sim.tempo=1; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario,['milho']);
  assert.equal(sim.estado.produtos.milho.prateleira,0);
  Object.assign(sim.estado.jogador,{x:0.9,z:PRODUTOS.milho.prateleira.z});
  assert.equal(segmentoLivre(sim.estado.jogador, sim.estado.jogador, sim.obstaculos(), 0.27), true);
  assert.ok(distanciaEstacao(sim.estado.jogador, PRODUTOS.milho.prateleira) < CONFIG.raioInteracao);
  sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario,[]);
  assert.equal(sim.estado.produtos.milho.prateleira,1);
});

test('passagem entre estufa e oficina não entrega ingredientes nem recolhe lotes', () => {
  const sim=lojaCompleta(); sim.estado.produtos.queijo.horta=2;
  sim.estado.jogador.inventario=['leite'];
  const norteOficina = PRODUTOS.queijo.horta.z - PRODUTOS.queijo.curral.d / 2;
  const sulEstufa = PRODUTOS.morango.horta.z + 1.8;
  Object.assign(sim.estado.jogador,{x:PRODUTOS.queijo.horta.x,z:(norteOficina + sulEstufa) / 2});
  sim.tempo=1; sim.interagir();
  assert.deepEqual(sim.estado.jogador.inventario,['leite']);
  assert.equal(sim.estado.oficinas.queijo.ingredientes.leite,0);
  assert.equal(sim.estado.produtos.queijo.horta,2);
});

test('coleta e reposição funcionam em todos os lados acessíveis dos objetos', () => {
  for (const id of Object.keys(PRODUTOS)) {
    for (const tipo of id === 'pao' ? ['reposicao'] : ['coleta', 'reposicao']) {
      const objeto = geometriaEstacao(id, tipo);
      let lados = 0;
      for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const sim = lojaCompleta();
        const ponto = { x: objeto.x + dx * (objeto.w / 2 + 0.5), z: objeto.z + dz * (objeto.d / 2 + 0.5) };
        if (!segmentoLivre(ponto,ponto,sim.obstaculos(),0.27)) continue;
        lados++;
        for (const estoque of Object.values(sim.estado.produtos)) estoque.horta = 8;
        sim.estado.jogador.inventario = tipo === 'reposicao' ? [id === 'pao' ? 'trigo' : id] : [];
        Object.assign(sim.estado.jogador,ponto); sim.tempo = 1; sim.interagir();
        assert.deepEqual(sim.estado.jogador.inventario,tipo === 'reposicao' ? [] : [id],`${id}/${tipo} lado ${dx},${dz}`);
        if (tipo === 'reposicao') assert.equal(id === 'pao' ? sim.estado.producao.trigoPadaria : sim.estado.produtos[id].prateleira,1,id);
      }
      assert.ok(lados >= 2,`${id}/${tipo}: acesso por pelo menos dois lados`);
    }
  }
});

test('migração mantém dinheiro, compras, receitas e cargas e libera atores presos', () => {
  const sim=lojaCompleta();
  sim.estado.jogador.inventario=['leite','tomate'];
  sim.estado.oficinas.queijo.ingredientes.leite=3;
  Object.assign(sim.ajudante,PRODUTOS.leite.prateleira,{produto:'leite',destino:'prateleira',inventario:['leite']});
  const salvo=structuredClone(sim.estado); delete salvo.versaoLayout;
  const migrado=new Simulacao(salvo);
  assert.equal(migrado.estado.dinheiro,sim.estado.dinheiro);
  assert.deepEqual(migrado.estado.melhorias,sim.estado.melhorias);
  assert.deepEqual(migrado.estado.jogador.inventario,['leite','tomate']);
  assert.deepEqual(migrado.ajudante.inventario,['leite']);
  assert.equal(migrado.estado.oficinas.queijo.ingredientes.leite,3);
  const atual=structuredClone(migrado.estado);
  Object.assign(atual.jogador,PRODUTOS.leite.prateleira);
  const recuperado=new Simulacao(atual);
  assert.ok(!recuperado.obstaculos().some(o=>Math.abs(recuperado.estado.jogador.x-o.x)<o.w/2+.27 && Math.abs(recuperado.estado.jogador.z-o.z)<o.d/2+.27));
});
