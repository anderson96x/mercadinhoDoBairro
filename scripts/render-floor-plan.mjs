import { writeFileSync } from 'node:fs';
import { CONFIG, PRODUTOS, ESCRITORIO } from '../src/jogo/configuracao.js';
import { PLANTA_INICIAL, PRODUTOS_HORTIFRUTI } from '../src/jogo/planta.js';
import { PAREDES_LOJA, PAREDES_ESCRITORIO, PORTA_ESCRITORIO } from '../src/jogo/bairro.js';
import { geometriaEstacao } from '../src/jogo/estacoes.js';

// Only the implemented new-plan milestone is generated. V2 images stay historical.
const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000" viewBox="0 0 1200 1000" role="img" aria-labelledby="title desc">
<title id="title">Nova planta — nível 1</title><desc id="desc">Terreno quadrado, salão inicial de 14 por 16 unidades, escritório ao fundo, banca de tomates na esquerda, caixa frontal e porta posterior para a horta.</desc>
<style>text{font-family:Arial,sans-serif;fill:#294439}.title{font-size:30px;font-weight:bold}.label{font-size:13px;font-weight:bold}.note{font-size:15px}.small{font-size:11px}.wall{fill:#315c49}.route{fill:none;stroke:#bf743a;stroke-width:3;stroke-dasharray:7 5}</style>
<rect width="1200" height="1000" fill="#faf9f5"/>
<text x="48" y="54" class="title">Mercadinho do Bairro · nível 1</text>
<text x="48" y="85" class="note">Nova planta · 2 u por cm anotado · cresce somente após as compras</text>`];
const scale = 19, X = x => 370 + x * scale, Y = z => 615 + z * scale;
const rect = (p, color, extra = '') => parts.push(`<rect x="${X(p.x - p.w / 2)}" y="${Y(p.z - p.d / 2)}" width="${p.w * scale}" height="${p.d * scale}" fill="${color}" ${extra}/>`);
const text = (x, z, value, cls = 'label') => parts.push(`<text x="${X(x)}" y="${Y(z)}" text-anchor="middle" class="${cls}">${value}</text>`);
const path = points => parts.push(`<path d="M${points.map(p => `${X(p.x)},${Y(p.z)}`).join('L')}" class="route"/>`);
rect(PLANTA_INICIAL.terreno, '#dfebd4', 'stroke="#9cb88e"');
rect({ x: 4, z: 11.3, w: 40, d: 4.4 }, '#78817e');
rect({ x: 4, z: 7.95, w: 40, d: 2.5 }, '#e8deca');
text(13, 12, 'RUA');
rect(PLANTA_INICIAL.salao, '#f4f0e5');
const office = ESCRITORIO.limites;
rect({ x: (office.minX + office.maxX) / 2, z: (office.minZ + office.maxZ) / 2, w: office.maxX - office.minX, d: office.maxZ - office.minZ }, '#dfd5df');
for (const p of [...PAREDES_LOJA, ...PAREDES_ESCRITORIO]) rect(p, '#315c49');
for (const p of [ESCRITORIO.mesa, ESCRITORIO.estante]) rect(p, '#b99269');
rect(PORTA_ESCRITORIO, '#94b7b5');
text(-0.8, -6.3, 'ESCRITÓRIO', 'small');
rect(CONFIG.lixeira, '#387448');
rect({ ...CONFIG.cestas, w: 0.9, d: 1.25 }, '#739b72');
text(0.8, 6.3, 'CESTAS', 'small');
rect({ ...CONFIG.balcao, w: 2.9, d: 1.53 }, '#aeb9b5');
text(CONFIG.balcao.x, CONFIG.balcao.z, 'CAIXA', 'small');
rect({ ...CONFIG.cadeiraCaixa, w: 0.6, d: 0.6 }, '#74858d');
const tomate = PRODUTOS.tomate;
rect(tomate.prateleira, '#cc9d78', 'stroke="#91603c"');
for (let i = 0; i < 12; i++) parts.push(`<circle cx="${X(tomate.prateleira.x - 0.4 + i % 3 * 0.4)}" cy="${Y(tomate.prateleira.z - 0.75 + Math.floor(i / 3) * 0.5)}" r="3" fill="#ef5a42"/>`);
text(-2.1, 1.15, 'TOMATES', 'small');
rect(geometriaEstacao('tomate', 'coleta'), '#b77e50', 'stroke="#805634"');
text(tomate.horta.x, tomate.horta.z, 'HORTA', 'small');
path([{ x: 0.8, z: -1 }, { x: CONFIG.portaProducao.x, z: -8.4 }, { x: CONFIG.portaProducao.x, z: tomate.coleta.z }, tomate.coleta]);
text(CONFIG.portaProducao.x, -11.25, 'PORTA DE PRODUÇÃO · 3 u', 'small');
text(CONFIG.portaEntrada.x, 8.5, 'ENTRADA DUPLA', 'small');
for (let i = 0; i < 5; i++) parts.push(`<circle cx="${X(CONFIG.clienteCaixa.x + i * CONFIG.espacoClientes)}" cy="${Y(CONFIG.clienteCaixa.z)}" r="4" fill="#b79069"/>`);
for (const id of PRODUTOS_HORTIFRUTI.slice(1)) {
  rect(PRODUTOS[id].prateleira, 'none', 'stroke="#b6b9a9" stroke-dasharray="4 3"');
}
text(13, -19, 'TERRENO RESERVADO', 'small');
text(3.9, -1.3, 'SALÃO · 14 × 16 u');
parts.push('<path d="M860 140V900" stroke="#dedfd7"/>');
const notes = [
  'IMPLEMENTADO NO NÍVEL 1',
  'Salão inicial: 7 × 8 cm → 14 × 16 u.',
  'Terreno: 20 × 20 cm → 40 × 40 u.',
  'Tomates na banca junto à esquerda.',
  'Escritório e lixeira ao fundo.',
  'Entrada frontal e acesso posterior.',
  'Caixa com acesso livre à cadeira.',
  'Cinco cestas e cinco lugares de fila.',
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
  'Departamentos posteriores ainda',
  'mantêm as ampliações anteriores.',
  'O novo salão final fica para N9.',
  'u = unidade do jogo; rua em +z.'
];
notes.forEach((value, i) => parts.push(`<text x="885" y="${165 + i * 31}" class="${[0, 9, 17].includes(i) ? 'label' : 'note'}">${value}</text>`));
parts.push('<text x="48" y="966" class="small">Gerado da configuração do jogo · Traço laranja: percurso de produção · Círculos: posições de fila apenas na documentação</text></svg>');
writeFileSync(new URL('../docs/PLANTA-LOJA-N1.svg', import.meta.url), parts.join('\n'), 'utf8');
console.log('Generated docs/PLANTA-LOJA-N1.svg from the implemented level 1 geometry.');
