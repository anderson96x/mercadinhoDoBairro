import { writeFileSync } from 'node:fs';

// Concept drawing only: coordinates use the game's x/z units, not metres.
const S = 28, ox = 470, oy = 632;
const X = x => ox + x * S, Y = z => oy + z * S;
const fixtures = [
  { id: 'tomate', label: 'TOMATES', sub: 'N1', x: 2.8, z: 0, w: 2.2, d: 1.4, color: '#efab8c' },
  { id: 'milho', label: 'MILHO', sub: 'N3', x: 2.8, z: -3, w: 2.2, d: 1.4, color: '#e7d68b' },
  { id: 'ovos', label: 'OVOS', sub: 'N4', x: 7, z: 0, w: 2.2, d: 1.4, color: '#eee0bd' },
  { id: 'trigo', label: 'TRIGO', sub: 'N7', x: 11.2, z: 0, w: 2.2, d: 1.4, color: '#dfc084' },
  { id: 'pao', label: 'PADARIA', sub: 'produção + balcão · N9', x: 7.3, z: -3.2, w: 3.4, d: 2.2, color: '#dcb095' },
  { id: 'leite', label: 'LEITE', sub: 'ilha · N5', x: 13.6, z: -3, w: 1.2, d: 3.2, color: '#b8d9db', vertical: true },
  { id: 'morango', label: 'MORANGOS', sub: 'N11', x: 13.2, z: -8.2, w: 2.2, d: 1.4, color: '#dfa3a4' },
  { id: 'mel', label: 'MEL', sub: 'N12', x: 13.2, z: -12.8, w: 2.2, d: 1.4, color: '#e7c682' },
  { id: 'queijo', label: 'QUEIJOS', sub: 'ilha · N13', x: 15.9, z: -12.8, w: 1.2, d: 3, color: '#b8d9db', vertical: true },
  { id: 'geleia', label: 'GELEIAS', sub: 'ilha · N15', x: 15.9, z: -8.2, w: 1.2, d: 2.6, color: '#c5b0cb', vertical: true },
];

// Verify the design's rectangles, independently of the live game's navigation.
for (const f of fixtures) {
  const north = f.z < -6;
  if (f.x - f.w / 2 < (north ? 9.1 : -3.1) || f.x + f.w / 2 > 18.1 ||
      f.z - f.d / 2 < (north ? -15.5 : -6) || f.z + f.d / 2 > 6.7)
    throw new Error(`Fixture outside floor: ${f.id}`);
}
for (let i = 0; i < fixtures.length; i++) for (let j = i + 1; j < fixtures.length; j++) {
  const a = fixtures[i], b = fixtures[j];
  if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.z - b.z) < (a.d + b.d) / 2)
    throw new Error(`Overlapping fixtures: ${a.id}/${b.id}`);
}
const aisle = fixtures.find(f => f.id === 'tomate').z - 0.7 - (fixtures.find(f => f.id === 'milho').z + 0.7);
if (aisle < 1.6 - 1e-8) throw new Error('Produce cross-aisle too narrow');
for (const f of fixtures.filter(f => ['queijo', 'geleia'].includes(f.id))) {
  if (18.1 - (f.x + f.w / 2) < 1.6 - 1e-8) throw new Error(`Expansion corridor blocked by ${f.id}`);
}
const reservedApproaches = [
  { name: 'east main hall', minX: 14.5, maxX: 18.1, minZ: -1.6, maxZ: 1.6 },
  { name: 'east artisan hall', minX: 16.5, maxX: 18.1, minZ: -11.2, maxZ: -9.2 },
  { name: 'rear artisan hall', minX: 11.1, maxX: 14.7, minZ: -15.5, maxZ: -14.3 },
];
for (const r of reservedApproaches) for (const f of fixtures) {
  if (f.x + f.w / 2 > r.minX && f.x - f.w / 2 < r.maxX &&
      f.z + f.d / 2 > r.minZ && f.z - f.d / 2 < r.maxZ)
    throw new Error(`Expansion approach ${r.name} blocked by ${f.id}`);
}

const parts = [];
const add = s => parts.push(s);
const text = (x, y, value, cls = 'label', extra = '') => add(`<text x="${x}" y="${y}" class="${cls}" ${extra}>${value}</text>`);
const rect = (x, z, w, d, fill, extra = '') => add(`<rect x="${X(x)}" y="${Y(z)}" width="${w*S}" height="${d*S}" fill="${fill}" ${extra}/>`);
const line = (x1, z1, x2, z2, extra = '') => add(`<line x1="${X(x1)}" y1="${Y(z1)}" x2="${X(x2)}" y2="${Y(z2)}" ${extra}/>`);
const path = (points, cls) => add(`<path d="${points.map(([x,z],i) => `${i ? 'L' : 'M'}${X(x)},${Y(z)}`).join(' ')}" class="${cls}"/>`);
const block = (x,z,w,d,label,sub,color) => {
  rect(x,z,w,d,color,'rx="5" stroke="#86978a" stroke-width="1"');
  text(X(x+w/2),Y(z+d/2)-3,label,'small','text-anchor="middle"');
  if (sub) text(X(x+w/2),Y(z+d/2)+12,sub,'tiny','text-anchor="middle"');
};

add(`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1160" viewBox="0 0 1440 1160" role="img" aria-labelledby="title desc">
<title id="title">Mercadinho do Bairro — nova planta conceitual</title>
<desc id="desc">Planta em vista superior na escala de 28 pixels por unidade do jogo. Preserva o salão principal e o anexo artesanal em L. Mostra dez produtos, escritório, fila de dez posições, entrada e saída compartilhadas, produção agrícola e rotas de clientes e reposição.</desc>
<defs>
  <pattern id="tiles" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#f4f0e5"/><path d="M28 0H0V28" fill="none" stroke="#e3ded1" stroke-width="0.65"/></pattern>
  <marker id="customerArrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#b16d36"/></marker>
  <marker id="staffArrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#397b78"/></marker>
</defs>
<style>
text{font-family:Arial,sans-serif;fill:#294439}.heading{font-size:36px;font-weight:700}.subtitle{font-size:16px;fill:#627568}.eyebrow{font-size:12px;font-weight:700;letter-spacing:2px}.label{font-size:14px;font-weight:700}.small{font-size:10px;font-weight:700}.tiny{font-size:9px;fill:#4d6157}.note{font-size:14px;fill:#51665a}.wall{fill:none;stroke:#315c49;stroke-width:6;stroke-linecap:square}.customer{fill:none;stroke:#b16d36;stroke-width:3;marker-end:url(#customerArrow);stroke-linejoin:round}.staff{fill:none;stroke:#397b78;stroke-width:3;stroke-dasharray:8 5;marker-end:url(#staffArrow)}.dimension{stroke:#809386;stroke-width:1}.dimtext{font-size:11px;fill:#64796b}
</style>
<rect width="1440" height="1160" fill="#faf9f5"/>
<rect x="42" y="40" width="7" height="83" fill="#315c49"/>`);
text(66,59,'ESTUDO DE LAYOUT / 02','eyebrow');
text(66,99,'Mercadinho do Bairro','heading');
text(66,126,'Uma loja de bairro com percurso claro, produção próxima e expansão por etapas.','subtitle');

// Existing site's orientation: street is at positive z, not geographic south.
rect(-13,-16,31.8,22.7,'#e5eddb','rx="10"');
rect(-13,6.7,31.8,2.5,'#e8deca');
rect(-13,9.2,31.8,4.4,'#78817e');
for (let x=-12; x<18; x+=3) line(x,11.4,x+1.2,11.4,'stroke="#f7f4e8" stroke-width="3"');
for (let z=9.5; z<13.5; z+=0.55) rect(-2.4,z,2.2,0.25,'#f7f4e8');
text(X(11),Y(8.35),'CALÇADA · ACESSO DO BAIRRO','small','text-anchor="middle"');
text(X(12),Y(11.9),'RUA','small','fill="#ffffff"');

// Farm sources stay close to their current locations.
block(-11,2.1,3.4,2.6,'MILHO','horta · N3','#cad79a');
block(-11,-4.2,3.4,2.6,'TOMATES','horta · N1','#c2d3a1');
block(-11,-8.5,3.4,2.6,'GALINHEIRO','ovos · N4','#e3d2ab');
block(-11,-14,3.4,3.2,'TRIGO','horta · N7','#d8d49e');
block(-4.1,-14.1,4.2,3.2,'CURRAL','leite · N5','#c4d5b5');
block(1.8,-14.1,3,3.2,'ESTUFA','morangos · N11','#c8debf');
block(5.5,-14.1,2.8,3.2,'APIÁRIO','mel · N12','#e1d5a1');
block(2,-8.8,2.6,1.6,'QUEIJARIA','N13','#d5d8bb');
block(5.6,-8.8,2.6,1.6,'GELEIAS','oficina · N15','#d9c7d3');
text(X(-12.1),Y(-15.05),'FAZENDA + OFICINAS','small');

// Exact current full floor footprint, drawn as one L-shaped hall.
add(`<path d="M${X(-3.1)},${Y(-6)}H${X(9.1)}V${Y(-15.5)}H${X(18.1)}V${Y(6.7)}H${X(-3.1)}Z" fill="url(#tiles)"/>`);
rect(-3.1,-2,2.2,4.2,'#d8e9e4');
rect(1.1,-6,10,1.6,'#d8e9e4');
rect(9.1,-15.5,2,11.1,'#d8e9e4');
rect(-2.8,3.55,3,3.15,'#e8e7d6','rx="4"');
rect(1.6,2.6,12.9,1.8,'#efe4d4','rx="6"');
rect(1.6,4.4,5,2.3,'#e7decd','rx="4"');

// Cut walls only where the doors/gates are intended.
path([[-3.1,-6],[9.1,-6],[9.1,-7.4]],'wall');
path([[9.1,-10],[9.1,-15.5],[11.1,-15.5]],'wall');
path([[14.7,-15.5],[18.1,-15.5],[18.1,-11.2]],'wall');
path([[18.1,-9.2],[18.1,-1.6]],'wall');
path([[18.1,1.6],[18.1,6.7],[0.2,6.7]],'wall');
// Closed removable panels until a future wing is actually purchased.
for (const [a,b] of [[[11.1,-15.5],[14.7,-15.5]],[[18.1,-11.2],[18.1,-9.2]],[[18.1,-1.6],[18.1,1.6]]])
  line(...a,...b,'stroke="#8d70a5" stroke-width="5" stroke-dasharray="7 4"');
text(X(12.9),Y(-15.8),'PAINEL REMOVÍVEL / FUNDO','tiny','text-anchor="middle"');
text(X(18.5),Y(0),'→','label');
path([[-2.8,6.7],[-3.1,6.7],[-3.1,2.2]],'wall');
path([[-3.1,-0.8],[-3.1,-6]],'wall');
// Office with opening to the west working passage.
rect(-3.1,-6,4.2,4,'#e2e2d8');
path([[-3.1,-6],[1.1,-6],[1.1,-2],[0,-2]],'wall');
path([[-1.4,-2],[-3.1,-2]],'wall');
block(-2.1,-5.2,2.1,0.9,'MESA','computador','#c8b999');
text(X(-1),Y(-3.2),'ESCRITÓRIO','small','text-anchor="middle"');
// Sliding door and artisan staff corridor partition, with shelf access openings.
line(-1.4,-2,0,-2,'stroke="#397b78" stroke-width="2" stroke-dasharray="4 3"');
for (const [a,b] of [[-15.5,-14.2],[-11.4,-9.5],[-6.9,-6]]) line(11.1,a,11.1,b,'stroke="#77988e" stroke-width="2"');

fixtures.forEach(f => {
  rect(f.x-f.w/2,f.z-f.d/2,f.w,f.d,f.color,'rx="4" stroke="#8c9585" stroke-width="1.3"');
  if (f.vertical) {
    add(`<g transform="translate(${X(f.x)},${Y(f.z)}) rotate(-90)">`);
    text(0,-2,f.label,'small','text-anchor="middle"'); text(0,12,f.sub,'tiny','text-anchor="middle"'); add('</g>');
  } else {
    text(X(f.x),Y(f.z)-3,f.label,'small','text-anchor="middle"');
    text(X(f.x),Y(f.z)+12,f.sub,'tiny','text-anchor="middle"');
  }
});
// Bakery tools within the footprint; sales face south, replenishment north.
rect(5.7,-4.2,0.75,0.5,'#8b9a93'); rect(8.1,-4.2,0.75,0.5,'#8b9a93');
line(5.6,-2.1,9,-2.1,'stroke="#86725c" stroke-width="4"');
block(0.3,4.7,1,1,'CESTAS','','#c6c9af');
block(2.1,4.75,2.7,1,'CAIXA','atendimento','#c4c9be');
text(X(3.45),Y(6.3),'POSTO DO OPERADOR','tiny','text-anchor="middle"');
for (let i=0;i<10;i++) {
  add(`<circle cx="${X(2.2+i*1.15)}" cy="${Y(3.5)}" r="9" fill="#faf7f1" stroke="#c29d77"/>`);
  text(X(2.2+i*1.15),Y(3.5)+3,String(i+1),'tiny','text-anchor="middle"');
}
text(X(8),Y(2.95),'FILA CONTIDA · ATÉ 10 CLIENTES','small','text-anchor="middle"');
text(X(10.7),Y(5.8),'FRENTE LIVRE / RESERVA FUTURA','small','text-anchor="middle"');
text(X(14.5),Y(-14.65),'ALA ARTESANAL · N11–15','small','text-anchor="middle"');

// Customer loop leaves the entrance and queue independent of product approaches.
path([[-1.3,8.5],[-1.3,4.2],[-0.2,2],[0.3,1.4],[13.2,1.4],[17.2,1.4],[17.2,-14.5],[11.8,-14.5],[11.8,-5.8]],'customer');
path([[11.8,-5.8],[11.8,-1.2],[1.4,-1.2],[1.4,1.7]],'customer');
path([[17.2,1.4],[17.2,3.5],[14.3,3.5]],'customer');
path([[2.2,4.5],[1.5,6.1],[-1.3,6.1],[-1.3,8.5]],'customer');
// Farm-to-store spine plus controlled shared branches into the sales floor.
path([[-6.2,-12],[-6.2,0.8],[-2,0.8],[-2,-0.7]],'staff');
path([[-6.2,-9.8],[10.1,-9.8],[10.1,-14.7]],'staff');
path([[10.1,-9.8],[10.1,-5.2],[1.6,-5.2]],'staff');
path([[10.1,-5.2],[12.4,-5.2],[12.4,-3.4]],'staff');
path([[-2,0.8],[0.3,0.8],[0.3,-1.5],[7,-1.5]],'staff');
path([[10.1,-12.8],[11.7,-12.8]],'staff');
path([[10.1,-8.2],[11.7,-8.2]],'staff');
text(X(-5.4),Y(0.8),'ACESSO','tiny');
text(X(-5.4),Y(1.35),'DE SERVIÇO','tiny');
text(X(2.5),Y(-5.05),'FAIXA DE REPOSIÇÃO · 1,6 u','tiny');
text(X(-1.3),Y(7.6),'ENTRADA / SAÍDA · 3,0 u','small','text-anchor="middle"');

// Measurements use original wall centerlines; furniture widths are explicit.
line(-3.1,14.5,18.1,14.5,'class="dimension"');
for (const x of [-3.1,18.1]) line(x,14.2,x,14.8,'class="dimension"');
text(X(7.5),Y(15.1),'21,2 u · largura total da loja','dimtext','text-anchor="middle"');
line(19.6,-15.5,19.6,6.7,'class="dimension"');
for (const z of [-15.5,6.7]) line(19.3,z,19.9,z,'class="dimension"');
add(`<text transform="translate(${X(20.3)},${Y(-4.4)}) rotate(-90)" class="dimtext" text-anchor="middle">22,2 u · profundidade máxima</text>`);

// Editorial side panel, separate from the scale drawing.
add('<line x1="1080" y1="175" x2="1080" y2="1040" stroke="#dedfd7"/>');
text(1110,202,'O QUE MUDA','eyebrow');
const notes = [
  ['01','Móveis independentes',['Leite e queijo em ilhas frias.','Nenhum expositor depende','da parede de uma futura ala.']],
  ['02','Um percurso contínuo',['Dois corredores conectam o','anexo: o cliente entra, explora','e retorna sem um beco sem saída.']],
  ['03','Uma frente organizada',['Cestas fora do vão da porta.','Fila em faixa própria; caixa','próximo à entrada e à saída.']],
  ['04','Reposição mais legível',['Espinha de serviço na fazenda,','faixa de fundo e acesso lateral.','Trechos de venda são compartilhados.']],
  ['05','Crescimento aberto',['Painéis removíveis à direita','e ao fundo. Corredores livres','conectam as próximas alas.']],
];
notes.forEach(([n,title,lines],i) => {
  const y=250+i*133;
  text(1110,y,n,'eyebrow'); text(1110,y+25,title,'label');
  lines.forEach((v,j)=>text(1110,y+51+j*20,v,'note'));
});
text(1110,962,'ESQUEMA PARA O JOGO','eyebrow');
text(1110,987,'u = unidade de coordenada.','note');
text(1110,1009,'Sem conversão para metros.','note');
text(1110,1031,'Orientação: rua em +z.','note');

text(66,1072,'LEGENDA','eyebrow');
add('<path d="M66 1100H115" class="customer"/>');text(129,1105,'Percurso sugerido do cliente','note');
add('<path d="M405 1100H454" class="staff"/>');text(469,1105,'Reposição / serviço','note');
add('<rect x="714" y="1089" width="22" height="22" fill="#b8d9db"/>');text(747,1105,'Exposição refrigerada','note');
add('<rect x="1022" y="1089" width="22" height="22" fill="#efe4d4"/>');text(1055,1105,'Área de fila','note');
text(66,1137,'Escala do desenho: 28 px/u · Planta conceitual · O jogo atual permanece intacto · Ver notas e coordenadas em PLANTA-LOJA-V2.md','tiny');
add('</svg>');
writeFileSync(new URL('../docs/PLANTA-LOJA-V2.svg', import.meta.url), parts.join('\n'), 'utf8');
console.log(`Floor plan generated: ${fixtures.length} non-overlapping product fixtures; produce cross-aisle ${aisle.toFixed(1)} u.`);

// Same drawing scale across all cards makes physical growth directly comparable.
const stages = [
  { title: '01 / NÍVEIS 1–2', level: 2, right: 9.1, lines: ['Loja inicial · 12,2 × 12,7 u', 'Tomates; contratação do caixa no N2.', 'Cinco cestas. Escritório e entrada fixos.'] },
  { title: '02 / NÍVEL 3', level: 3, right: 9.1, lines: ['Mesmo piso · sem ampliação', 'Milho: horta e segunda banca.', 'Corredores já preparados para crescer.'] },
  { title: '03 / NÍVEL 4', level: 4, right: 12.1, lines: ['Primeira extensão · +3 u à direita', 'Ala dos ovos + galinheiro.', 'A banca de ovos prolonga a linha de venda.'] },
  { title: '04 / NÍVEIS 5–6', level: 6, right: 15.1, lines: ['Segunda extensão · +3 u à direita', 'Leite no N5; repositor no N6.', 'Ilha fria independente da parede.'] },
  { title: '05 / NÍVEIS 7–10', level: 10, right: 18.1, lines: ['Terceira extensão · +3 u à direita', 'N7 trigo · N8 dez cestas · N9 padaria.', 'N10 cesta de trabalho; leite permanece.'] },
  { title: '06 / NÍVEIS 11–15', level: 15, right: 18.1, annex: true, lines: ['Anexo ao fundo · +9 × 9,5 u', 'N11 morango · N12 mel · N13 queijo.', 'N14 irrigação/equipe ágil · N15 geleia.'] },
];
const unlock = { tomate: 1, milho: 3, ovos: 4, leite: 5, trigo: 7, pao: 9, morango: 11, mel: 12, queijo: 13, geleia: 15 };
const stageParts = [`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1190" viewBox="0 0 1440 1190" role="img" aria-labelledby="title desc">
<title id="title">Mercadinho do Bairro — planta por etapas de expansão</title>
<desc id="desc">Seis plantas na mesma escala mostram a loja inicial pequena, milho sem expansão, três alas laterais sucessivas e o anexo artesanal final. O contorno pontilhado representa apenas a futura área na documentação.</desc>
<style>text{font-family:Arial,sans-serif;fill:#294439}.h{font-size:32px;font-weight:bold}.sub{font-size:15px;fill:#63766b}.t{font-size:14px;font-weight:bold;letter-spacing:1px}.n{font-size:14px;fill:#51665a}.f{font-size:8px;font-weight:bold}.mini{font-size:7px}</style>
<rect width="1440" height="1190" fill="#faf9f5"/>
<text x="42" y="60" class="h">Começa pequeno. Cresce por nível.</text>
<text x="42" y="91" class="sub">Mesma escala nas seis plantas · Uma expansão só aparece no jogo após a compra correspondente.</text>`];
for (let i=0;i<stages.length;i++) {
  const stage=stages[i], cx=42+(i%3)*462, cy=126+Math.floor(i/3)*493;
  const sx=x=>cx+86+(x+3.1)*12, sy=z=>cy+66+(z+15.5)*12;
  const box=(x,z,w,d,color,extra='') => stageParts.push(`<rect x="${sx(x)}" y="${sy(z)}" width="${w*12}" height="${d*12}" fill="${color}" ${extra}/>`);
  stageParts.push(`<rect x="${cx}" y="${cy}" width="438" height="471" rx="12" fill="#fff" stroke="#e1e3d9"/><text x="${cx+22}" y="${cy+33}" class="t">${stage.title}</text>`);
  const full=`M${sx(-3.1)},${sy(-6)}H${sx(9.1)}V${sy(-15.5)}H${sx(18.1)}V${sy(6.7)}H${sx(-3.1)}Z`;
  stageParts.push(`<path d="${full}" fill="#f6f7f2" stroke="#d8dfd2" stroke-dasharray="4 4"/>`);
  box(-3.1,-6,stage.right+3.1,12.7,'#f4f0e5','stroke="#315c49" stroke-width="2"');
  if(stage.annex) box(9.1,-15.5,9,9.5,'#f4f0e5','stroke="#315c49" stroke-width="2"');
  box(-3.1,-6,4.2,4,'#d8ddd1','stroke="#8b9c8d"');
  stageParts.push(`<text x="${sx(-2.7)}" y="${sy(-3.7)}" class="mini">ESCRITÓRIO</text>`);
  if(stage.annex) box(9.1,-15.5,2,11.1,'#d8e9e4');
  for (const fixture of fixtures.filter(f=>unlock[f.id]<=stage.level)) {
    const f=fixture;
    const north=f.z< -6;
    if(f.x+f.w/2>stage.right||f.x-f.w/2<(north?9.1:-3.1)||f.z-f.d/2<(north?-15.5:-6)||f.z+f.d/2>6.7)
      throw new Error(`Fixture outside stage ${stage.level}: ${f.id}`);
    box(f.x-f.w/2,f.z-f.d/2,f.w,f.d,f.color,'stroke="#8b9585" stroke-width="0.6"');
    stageParts.push(`<text transform="translate(${sx(f.x)},${sy(f.z)})${f.vertical?' rotate(-90)':''}" text-anchor="middle" dominant-baseline="middle" class="f">${f.label}</text>`);
  }
  box(1.6,2.6,stage.level>=8?12.9:6.4,1.8,'#efe4d4');
  box(2.1,4.75,2.7,1,'#c4c9be'); box(0.3,4.7,1,1,'#c6c9af');
  const count=stage.level>=8?10:5;
  for(let q=0;q<count;q++) stageParts.push(`<circle cx="${sx(2.2+q*1.15)}" cy="${sy(3.5)}" r="2.5" fill="#b79069"/>`);
  box(-2.8,6.58,3,0.24,'#fff');
  stageParts.push(`<path d="M${sx(-1.3)},${sy(8.3)}V${sy(4)}" stroke="#b16d36" stroke-width="2"/><text x="${sx(-2.8)}" y="${sy(9.3)}" class="mini">ENTRADA FIXA</text>`);
  stage.lines.forEach((value,j)=>stageParts.push(`<text x="${cx+22}" y="${cy+386+j*25}" class="n">${value}</text>`));
}
stageParts.push('<text x="42" y="1155" class="sub">Pontilhado = envelope futuro apenas neste estudo. Níveis e compras seguem DESBLOQUEIOS-POR-NIVEL.md.</text></svg>');
writeFileSync(new URL('../docs/PLANTA-LOJA-ETAPAS.svg', import.meta.url), stageParts.join('\n'),'utf8');
console.log('Growth plan generated: every unlocked product fits its purchase stage; milk stays in place from level 5.');

// Future land is a design option, outside the current world bounds.
const future = [`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1000" viewBox="0 0 1440 1000" role="img" aria-labelledby="title desc">
<title id="title">Mercadinho — plano de crescimento aberto</title><desc id="desc">O núcleo até o nível 15 pode crescer à direita por dois módulos e ao fundo por outro. As ligações ficam alinhadas a corredores livres, com painéis removíveis e expositores independentes.</desc>
<style>text{font-family:Arial,sans-serif;fill:#294439}.h{font-size:32px;font-weight:bold}.sub{font-size:15px;fill:#63766b}.label{font-size:15px;font-weight:bold}.note{font-size:14px}.tiny{font-size:11px}</style>
<rect width="1440" height="1000" fill="#faf9f5"/>
<text x="42" y="60" class="h">Uma base para continuar crescendo</text>
<text x="42" y="92" class="sub">Reservas conceituais de terreno · Sem níveis, preços ou produtos novos definidos.</text>`];
const fx=x=>118+(x+3.1)*24, fy=z=>155+(z+25)*24;
const fb=(x,z,w,d,fill,extra='')=>future.push(`<rect x="${fx(x)}" y="${fy(z)}" width="${w*24}" height="${d*24}" fill="${fill}" ${extra}/>`);
const ft=(x,z,value,cls='label')=>future.push(`<text x="${fx(x)}" y="${fy(z)}" class="${cls}" text-anchor="middle">${value}</text>`);
const fl=(a,b,extra)=>future.push(`<path d="M${fx(a[0])},${fy(a[1])}L${fx(b[0])},${fy(b[1])}" fill="none" ${extra}/>`);
fb(-3.1,-6,21.2,12.7,'#f4f0e5','stroke="#315c49" stroke-width="3"');
fb(9.1,-15.5,9,9.5,'#f4f0e5','stroke="#315c49" stroke-width="3"');
fb(18.1,-6,9,12.7,'#e5eddb','stroke="#8d70a5" stroke-width="2" stroke-dasharray="8 5"');
fb(18.1,-15.5,9,9.5,'#e5eddb','stroke="#8d70a5" stroke-width="2" stroke-dasharray="8 5"');
fb(9.1,-25,9,9.5,'#e5eddb','stroke="#8d70a5" stroke-width="2" stroke-dasharray="8 5"');
fb(16.5,-15.5,1.6,18.1,'#d8e9e4');
fb(-3.1,-6,4.2,4,'#d8ddd1');
for(const f of fixtures) fb(f.x-f.w/2,f.z-f.d/2,f.w,f.d,f.color,'stroke="#819385" stroke-width="1"');
for(const [a,b] of [[[18.1,-1.6],[18.1,1.6]],[[18.1,-11.2],[18.1,-9.2]],[[11.1,-15.5],[14.7,-15.5]]])
  fl(a,b,'stroke="#8d70a5" stroke-width="6" stroke-dasharray="7 4"');
// Connecting both eastern modules creates a return loop once both are built.
future.push(`<path d="M${fx(17.2)},${fy(0)}H${fx(22.6)}V${fy(-10.2)}H${fx(17.2)}" fill="none" stroke="#b16d36" stroke-width="3" stroke-dasharray="6 4"/>`);
fl([12.9,-14.5],[12.9,-21],'stroke="#b16d36" stroke-width="3" stroke-dasharray="6 4"');
ft(22.6,4.4,'MÓDULO A · 9 × 12,7 u');
ft(22.6,5.5,'Novos departamentos','note');
ft(22.6,-13.2,'MÓDULO B · 9 × 9,5 u');
ft(22.6,-12,'Ligação com A e com o anexo','note');
ft(13.6,-23,'MÓDULO C · 9 × 9,5 u');
ft(13.6,-21.9,'Expansão posterior','note');
ft(6.5,3.2,'NÚCLEO ATUAL · N1–15');
ft(6.5,4.5,'Entrada, escritório e caixa estáveis','note');
ft(4,-10.8,'FAZENDA E OFICINAS','label');
ft(4,-9.5,'Permanecem a oeste','note');
future.push(`<text x="1020" y="180" class="label">REGRAS DE CRESCIMENTO</text>`);
const futureNotes=[
  '1. Corredor antes dos móveis.',
  '2. Ilhas frias sem parede de apoio.',
  '3. Fechamentos removíveis.',
  '4. Novos módulos de 3 u de largura.',
  '5. Ampliar por compras futuras.',
  '6. Repetir conexões nas novas bordas.',
];
futureNotes.forEach((v,i)=>future.push(`<text x="1020" y="${218+i*36}" class="note">${v}</text>`));
future.push(`<text x="1020" y="480" class="label">TERRENO TAMBÉM CRESCE</text>
<text x="1020" y="513" class="note">A e B ultrapassam o limite x atual.</text>
<text x="1020" y="539" class="note">C ultrapassa o limite z atual.</text>
<text x="1020" y="579" class="note">Exigem ampliar terreno, câmera,</text>
<text x="1020" y="605" class="note">calçada, navegação e salvamento.</text>
<text x="42" y="953" class="sub">Verde claro = reserva futura · Roxo = painel removível · Azul = corredor reservado · Escala 24 px/u</text></svg>`);
writeFileSync(new URL('../docs/PLANTA-LOJA-CRESCIMENTO.svg',import.meta.url),future.join('\n'),'utf8');
console.log('Future growth plan generated: eastern corridor 1.6 u; three clear expansion approaches; three reserved modules beyond current land.');
