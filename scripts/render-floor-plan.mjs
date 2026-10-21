import { writeFileSync } from 'node:fs';
import { PLANTA_DEPOSITO, pisoEstacionamento, paredesDeposito } from '../src/jogo/planta.js';
import { produtosDaLoja, CONFIG, ALA_PADARIA } from '../src/jogo/configuracao.js';
import { PLANTA_EXPANSAO, paredesExpansao, paredesOficinas, PLANTA_INICIAL, PLANTA_AMPLIADA, PRODUTOS_HORTIFRUTI, PRATELEIRAS_IMPORTADOS } from '../src/jogo/planta.js';
import { PAREDES_LOJA } from '../src/jogo/bairro.js';
import { geometriaEstacao } from '../src/jogo/estacoes.js';

// Generate implemented new-plan milestones; V2 images stay historical.
function renderizarPlanta(nivel) {
const expandida = nivel >= 18;
const PRODUTOS = produtosDaLoja({ melhorias: { expansao: expandida } });
const portaProducao = expandida ? PLANTA_EXPANSAO.portaProducao : CONFIG.portaProducao;
const ativos = nivel >= 11 ? ['tomate', 'milho', 'trigo', 'morango'] : nivel >= 7 ? ['tomate', 'milho', 'trigo'] : nivel >= 3 ? ['tomate', 'milho'] : ['tomate'];
const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000" viewBox="0 0 1200 1000" role="img" aria-labelledby="title desc">
<title id="title">Nova planta — nível ${nivel}</title><desc id="desc">${expandida ? 'Terreno ampliado nos fundos' : 'Terreno quadrado'}, salão de ${nivel >= 9 ? 24 : 14} por ${expandida ? 22 : 16} unidades, banca modular de hortifruti, caixa frontal e porta posterior para os canteiros. ${nivel >= 3 ? 'Milho alinhado atrás do tomate, ambos inteiramente atrás da loja.' : 'Somente tomate disponível.'}</desc>
<style>text{font-family:Arial,sans-serif;fill:#294439}.title{font-size:30px;font-weight:bold}.label{font-size:13px;font-weight:bold}.note{font-size:15px}.small{font-size:11px}.wall{fill:#315c49}.route{fill:none;stroke:#bf743a;stroke-width:3;stroke-dasharray:7 5}</style>
<rect width="1200" height="1000" fill="#faf9f5"/>
<text x="48" y="54" class="title">Mercadinho do Bairro · nível ${nivel}</text>
<text x="48" y="85" class="note">Nova planta · 2 u por cm anotado · cresce somente após as compras</text>`];
const scale = expandida ? 16 : 19, X = x => 370 + x * scale, Y = z => (expandida ? 660 : 615) + z * scale;
const rect = (p, color, extra = '') => parts.push(`<rect x="${X(p.x - p.w / 2)}" y="${Y(p.z - p.d / 2)}" width="${p.w * scale}" height="${p.d * scale}" fill="${color}" ${extra}/>`);
const text = (x, z, value, cls = 'label') => parts.push(`<text x="${X(x)}" y="${Y(z)}" text-anchor="middle" class="${cls}">${value}</text>`);
const path = points => parts.push(`<path d="M${points.map(p => `${X(p.x)},${Y(p.z)}`).join('L')}" class="route"/>`);
rect(expandida ? PLANTA_EXPANSAO.terreno : PLANTA_INICIAL.terreno, '#dfebd4', 'stroke="#9cb88e"');
rect({ x: 4, z: 11.3, w: 40, d: 4.4 }, '#78817e');
rect({ x: 4, z: 7.95, w: 40, d: 2.5 }, '#e8deca');
text(13, 12, 'RUA');
if (expandida) rect(pisoEstacionamento(true), '#78817e');
if (expandida) {
  rect(PLANTA_DEPOSITO.piso, '#c5cbc6');
  for (const p of paredesDeposito()) rect(p, '#315c49');
  for (const p of PLANTA_DEPOSITO.estantes) rect(p, '#8aafbf', 'stroke="#317c9d"');
  rect(PLANTA_DEPOSITO.porta, '#aebbbd');
  text(-9.3, -12.4, 'DEPÓSITO', 'small');
  text(-9.3, -8.3, 'PORTÃO ÚNICO', 'small');
  const passagem = PLANTA_DEPOSITO.passagem;
  path([{ x: passagem.x - 1, z: passagem.z }, { x: passagem.x + 1, z: passagem.z }]);
  text(passagem.x + 3, passagem.z + 0.8, 'PASSAGEM LIVRE', 'small');
}
rect(expandida ? PLANTA_EXPANSAO.salao : nivel >= 9 ? PLANTA_AMPLIADA.salao : PLANTA_INICIAL.salao, '#f4f0e5');
for (const p of [...PAREDES_LOJA.filter(p => nivel < 9 || !p.lateral), ...(nivel >= 9 ? ALA_PADARIA.paredes.filter(p => !expandida || p.x !== 20.9) : []), ...(expandida ? [...paredesOficinas(true), ...paredesExpansao()] : [])]) rect(p, '#315c49');
rect(CONFIG.lixeira, '#387448');
rect({ ...CONFIG.cestas, w: 0.9, d: 1.25 }, '#739b72');
text(0.8, 6.3, 'CESTAS', 'small');
rect({ ...CONFIG.balcao, w: 2.9, d: 1.53 }, '#aeb9b5');
text(CONFIG.balcao.x, CONFIG.balcao.z, 'CAIXA', 'small');
rect({ ...CONFIG.cadeiraCaixa, w: 0.6, d: 0.6 }, '#74858d');
const tomate = PRODUTOS.tomate;
for (const id of ativos) {
  const p = PRODUTOS[id], cor = `#${p.cor.toString(16).padStart(6, '0')}`;
  rect(p.prateleira, '#cc9d78', 'stroke="#91603c"');
  for (let i = 0; i < 12; i++) parts.push(`<circle cx="${X(p.prateleira.x - 0.4 + i % 3 * 0.4)}" cy="${Y(p.prateleira.z - 0.75 + Math.floor(i / 3) * 0.5)}" r="3" fill="${cor}"/>`);
  text(p.prateleira.x + 2.1, p.prateleira.z, p.nome.toLocaleUpperCase('pt-BR'), 'small');
  rect(geometriaEstacao(id, 'coleta', PRODUTOS), '#b77e50', 'stroke="#805634"');
  for (let i = 0; i < 8; i++) parts.push(`<circle cx="${X(p.horta.x - 1.1 + i % 4 * 2.2 / 3)}" cy="${Y(p.horta.z - 0.55 + Math.floor(i / 4) * 1.1)}" r="4" fill="${cor}"/>`);
  text(p.horta.x, p.horta.z - p.canteiro.d / 2 - 0.4, p.nome.toLocaleUpperCase('pt-BR'), 'small');
}
path([{ x: 0.8, z: -1 }, { x: portaProducao.x, z: -8.4 }, { x: portaProducao.x, z: tomate.coleta.z }, tomate.coleta]);
if (nivel >= 7) path([{ x: -5.8, z: PRODUTOS.milho.coleta.z }, { x: -5.8, z: PRODUTOS.trigo.coleta.z }, PRODUTOS.trigo.coleta]);
if (nivel >= 3) path([{ x: -5.8, z: tomate.coleta.z }, { x: -5.8, z: PRODUTOS.milho.coleta.z }, PRODUTOS.milho.coleta]);
if (nivel >= 4) {
  const ovos = PRODUTOS.ovos;
  rect(ovos.prateleira, '#cc9d78', 'stroke="#91603c"');
  text(ovos.prateleira.x, ovos.prateleira.z + 1.2, 'OVOS', 'small');
  rect(geometriaEstacao('ovos', 'coleta', PRODUTOS), '#b99269', 'stroke="#805634"');
  text(ovos.horta.x, ovos.horta.z - 1.6, 'GALINHEIRO', 'small');
  path([{ x: portaProducao.x, z: tomate.coleta.z }, { x: portaProducao.x, z: ovos.coleta.z }, ovos.coleta]);
}
text(portaProducao.x, portaProducao.z - 1.95, 'PORTA DE PRODUÇÃO · 3 u', 'small');
if (nivel >= 5) {
  const leite = PRODUTOS.leite;
  rect(leite.prateleira, '#d3e6e3', 'stroke="#63868d"');
  text(leite.prateleira.x, leite.prateleira.z + 1.2, 'LEITE', 'small');
  rect(geometriaEstacao('leite', 'coleta', PRODUTOS), '#bed19d', 'stroke="#9b6a43"');
  text(leite.horta.x, leite.horta.z, 'CURRAL', 'small');
  path([{ x: portaProducao.x, z: tomate.coleta.z }, { x: portaProducao.x, z: leite.coleta.z }, leite.coleta]);
}
text(CONFIG.portaEntrada.x, 8.5, 'ENTRADA DUPLA', 'small');
for (let i = 0; i < 5; i++) parts.push(`<circle cx="${X(CONFIG.clienteCaixa.x + i * CONFIG.espacoClientes)}" cy="${Y(CONFIG.clienteCaixa.z)}" r="4" fill="#b79069"/>`);
for (const id of PRODUTOS_HORTIFRUTI.filter(id => !ativos.includes(id))) {
  rect(PRODUTOS[id].prateleira, 'none', 'stroke="#b6b9a9" stroke-dasharray="4 3"');
}
if (!expandida) text(13, -19, 'TERRENO RESERVADO', 'small');
text(nivel >= 9 ? 8.9 : 3.9, -1.3, expandida ? 'SALÃO · 24 × 22 u' : nivel >= 9 ? 'SALÃO · 24 × 16 u' : 'SALÃO · 14 × 16 u');
if (nivel >= 9) {
  for (const balcao of ALA_PADARIA.fechamento) rect(balcao, '#d7b58a', 'stroke="#936238"');
  rect(PRODUTOS.pao.prateleira, '#d3e6e3', 'stroke="#63868d"');
  for (const [id, nome] of [['entrada', 'TRIGO'], ['moinho', 'MOINHO'], ['forno', 'FORNO']]) {
    rect(ALA_PADARIA[id], '#acb3ad'); text(ALA_PADARIA[id].x, ALA_PADARIA[id].z, nome, 'small');
  }
  text(14.5, -4.5, 'PADARIA', 'small');
  path([PRODUTOS.pao.cliente, { x: 13, z: -4 }]);
}
if (nivel >= 15) {
  const geleia = PRODUTOS.geleia;
  rect(geometriaEstacao('geleia', 'coleta', PRODUTOS), '#b56d85', 'stroke="#805634"');
  text(geleia.horta.x, geleia.horta.z - 1.3, 'COZINHA', 'small');
  rect(geleia.prateleira, '#b94470', 'stroke="#805634"');
  text(geleia.prateleira.x, geleia.prateleira.z, 'GELEIA', 'small');
  path([geleia.coleta, { x: portaProducao.x, z: geleia.coleta.z }, portaProducao, { x: 8, z: 1 }, geleia.reposicao]);
}
if (nivel >= 13) {
  const queijo = PRODUTOS.queijo;
  rect(geometriaEstacao('queijo', 'coleta', PRODUTOS), '#73a9a5', 'stroke="#63868d"');
  text(queijo.horta.x, queijo.horta.z - 1.3, 'QUEIJARIA', 'small');
  rect(queijo.prateleira, '#d3e6e3', 'stroke="#63868d"');
  text(queijo.prateleira.x, queijo.prateleira.z, 'DELI', 'small');
  path([queijo.coleta, { x: portaProducao.x, z: queijo.coleta.z }, portaProducao, { x: 8, z: 0.7 }, queijo.reposicao]);
}
if (nivel >= 12) {
  const mel = PRODUTOS.mel;
  rect(geometriaEstacao('mel', 'coleta', PRODUTOS), '#dca66a', 'stroke="#805634"');
  text(mel.horta.x, mel.horta.z, 'APIÁRIO', 'small');
  rect(mel.prateleira, '#e7a92b', 'stroke="#805634"');
  text(mel.prateleira.x, mel.prateleira.z, 'MEL', 'small');
  path([mel.coleta, { x: portaProducao.x, z: mel.coleta.z }, portaProducao, { x: 8, z: 1 }, mel.reposicao]);
}
if (nivel >= 17) for (const [indice, p] of PRATELEIRAS_IMPORTADOS.entries()) {
  rect(p, '#d5dfe2', 'stroke="#71838d"');
  text(p.x, p.z, `P${indice + 1}`, 'small');
  text(p.x, p.z + p.d / 2 + 0.6, 'R$ 1.000', 'small');
}
parts.push('<path d="M860 140V900" stroke="#dedfd7"/>');
const notes = [
  `IMPLEMENTADO NO NÍVEL ${nivel}`,
  expandida ? 'Salão ampliado: 24 × 22 u.' : nivel >= 9 ? 'Salão ampliado: 24 × 16 u.' : 'Salão inicial: 7 × 8 cm → 14 × 16 u.',
  expandida ? 'Terreno: 40 × 46 u.' : 'Terreno: 20 × 20 cm → 40 × 40 u.',
  nivel >= 7 ? 'Tomate, milho e trigo na banca.' : nivel >= 3 ? 'Tomate + milho na mesma banca.' : 'Tomates na banca junto à esquerda.',
  nivel >= 5 ? 'Ovos + leite na parede do fundo.' : nivel >= 4 ? 'Ovos na parede do fundo.' : 'Lixeira ao fundo e área livre na loja.',
  'Entrada frontal e acesso posterior.',
  'Caixa com acesso livre à cadeira.',
  nivel >= 17 ? 'P1 e P2: prateleiras vazias.' : 'Cinco cestas e cinco lugares de fila.',
  '',
  'BANCA MODULAR',
  'Só tomates aparecem no início.',
  'Milho, trigo e morango acrescentam',
  'seções após as respectivas compras.',
  'Estoques e alvos são independentes.',
  'Pontilhado: reserva neste desenho,',
  'sem móvel ou colisão no jogo.',
  '',
  'ESCOPO DESTA ETAPA',
  expandida ? 'N18: expansão de R$ 10.000.' : 'Departamentos posteriores ainda',
  expandida ? 'Depósito atrás do estacionamento.' : 'mantêm as ampliações anteriores.',
  nivel >= 9 ? 'N9: padaria voltada ao hortifruti.' : nivel >= 7 ? 'N7: trigo atrás do milho.' : nivel >= 5 ? 'N5: curral ao lado do galinheiro.' : nivel >= 4 ? 'N4: galinheiro atrás da loja.' : nivel >= 3 ? 'N3: milho atrás dos tomates.' : 'O novo salão final fica para N9.',
  'u = unidade do jogo; rua em +z.'
];
notes.forEach((value, i) => parts.push(`<text x="885" y="${165 + i * 31}" class="${[0, 9, 17].includes(i) ? 'label' : 'note'}">${value}</text>`));
parts.push('<text x="48" y="966" class="small">Gerado da configuração do jogo · Traço laranja: percurso de produção · Círculos: posições de fila apenas na documentação</text></svg>');
writeFileSync(new URL(`../docs/PLANTA-LOJA-N${nivel}.svg`, import.meta.url), parts.join('\n'), 'utf8');
console.log(`Generated docs/PLANTA-LOJA-N${nivel}.svg from the implemented level ${nivel} geometry.`);
}
for (const nivel of [1, 3, 4, 5, 7, 9, 11, 12, 13, 15, 17, 18]) renderizarPlanta(nivel);
