const TAU = Math.PI * 2;
const misturar = (a, b, t) => a + (b - a) * t;

// A fase pertence ao personagem e acompanha o deslocamento, inclusive ao
// encostar numa parede. Pausas e reposicionamentos não geram passos extras.
export function atualizarMarcha(d, ator, dt) {
  const marcha = d.marcha ??= { x: ator.x, z: ator.z, fase: 0, velocidade: 0, intensidade: 0 };
  const distancia = Math.hypot(ator.x - marcha.x, ator.z - marcha.z);
  marcha.x = ator.x; marcha.z = ator.z;
  if (dt <= 0) return marcha;
  const deslocamento = !ator.sentado && distancia < Math.max(0.5, dt * 16) ? distancia : 0;
  const velocidade = deslocamento / dt;
  marcha.velocidade = misturar(marcha.velocidade, velocidade, 1 - Math.exp(-12 * dt));
  marcha.fase = (marcha.fase + deslocamento * TAU / 2.1) % TAU;
  const alvo = Math.min(1, Math.max(0, (marcha.velocidade - 0.06) / 1.8));
  marcha.intensidade = misturar(marcha.intensidade, alvo, 1 - Math.exp(-(alvo > marcha.intensidade ? 14 : 10) * dt));
  return marcha;
}

function posicionarSegmento(malha, inicioY, inicioZ, fimY, fimZ, altura) {
  malha.position.y = (inicioY + fimY) / 2;
  malha.position.z = (inicioZ + fimZ) / 2;
  malha.rotation.x = Math.atan2(inicioZ - fimZ, inicioY - fimY);
  malha.scale.y = Math.hypot(fimY - inicioY, fimZ - inicioZ) / altura;
}

export function animarPernas(d, sentado) {
  const intensidade = d.marcha.intensidade * (1 - sentado);
  for (const [indice, perna, pe] of [[0, d.pernaE, d.peE], [1, d.pernaD, d.peD]]) {
    const fase = (d.marcha.fase / TAU + indice * 0.5) % 1;
    // Apoio mais longo, retorno com aceleração suave e pé levantado.
    const apoio = fase < 0.6;
    const retorno = apoio ? 0 : (fase - 0.6) / 0.4;
    const arco = Math.sin(retorno * Math.PI);
    const frente = apoio ? 1 - 2 * fase / 0.6 : -Math.cos(retorno * Math.PI);
    pe.rotation.x = apoio ? 0 : Math.sin(retorno * TAU) * 0.22 * intensidade;
    const apoioSola = Math.abs(Math.sin(pe.rotation.x)) * 0.16 + Math.cos(pe.rotation.x) * 0.06 - 0.06;
    pe.position.y = misturar(0.09 + arco * arco * 0.105 * intensidade + apoioSola, 0.11, sentado);
    pe.position.z = misturar(0.06 + frente * 0.18 * intensidade, 0.36, sentado);

    const quadrilY = 0.47 + d.corpo.position.y;
    const tornozeloY = pe.position.y + 0.06, tornozeloZ = pe.position.z - 0.06;
    const dy = tornozeloY - quadrilY, dz = tornozeloZ;
    const comprimento = Math.hypot(dy, dz);
    // Dois segmentos iguais: o joelho flexiona para a frente durante o retorno.
    const flexao = Math.sqrt(Math.max(0, 0.19 ** 2 - (comprimento / 2) ** 2));
    const joelhoY = misturar((quadrilY + tornozeloY) / 2 + dz / comprimento * flexao, 0.49, sentado);
    const joelhoZ = misturar(tornozeloZ / 2 - dy / comprimento * flexao, 0.3, sentado);
    posicionarSegmento(perna, joelhoY, joelhoZ, tornozeloY, tornozeloZ, 0.36);
    const coxa = d.coxasMarcha[indice];
    posicionarSegmento(coxa, quadrilY, 0, joelhoY, joelhoZ, 0.19);
    coxa.visible = sentado < 1;
    coxa.scale.x = 1 - sentado;
  }
  d.coxas.forEach(coxa => { coxa.visible = sentado > 0; coxa.scale.z = sentado; });
}
