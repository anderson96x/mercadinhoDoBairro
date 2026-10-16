// Interseção exata com retângulos: serve tanto para caminhos como para alcance.
export function segmentoLivre(inicio, fim, obstaculos, margem = 0) {
  for (const o of obstaculos) {
    const cos = Math.cos(o.angulo ?? 0), sin = Math.sin(o.angulo ?? 0);
    // Testa portas giradas no espaço local da folha, preservando sua espessura.
    const ix = (inicio.x - o.x) * cos - (inicio.z - o.z) * sin;
    const iz = (inicio.x - o.x) * sin + (inicio.z - o.z) * cos;
    const fx = (fim.x - o.x) * cos - (fim.z - o.z) * sin;
    const fz = (fim.x - o.x) * sin + (fim.z - o.z) * cos;
    const dx = fx - ix, dz = fz - iz;
    let entrada = 0, saida = 1;
    for (const [pos, delta, centro, metade] of [[ix, dx, 0, o.w / 2 + margem], [iz, dz, 0, o.d / 2 + margem]]) {
      if (Math.abs(delta) < 1e-9) {
        if (Math.abs(pos - centro) >= metade) { entrada = 2; break; }
      } else {
        const a = (centro - metade - pos) / delta, b = (centro + metade - pos) / delta;
        entrada = Math.max(entrada, Math.min(a, b)); saida = Math.min(saida, Math.max(a, b));
      }
    }
    if (entrada <= saida) return false;
  }
  return true;
}

// Busca local em grade; cada segmento também respeita o espaço entre pessoas.
export function buscarCaminho(inicio, destino, livre, limites) {
  if (!livre(destino, destino)) return [];
  const passo = 0.4;
  const chave = p => `${Math.round(p.x / passo)},${Math.round(p.z / passo)}`;
  const distancia = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const primeiro = { ...inicio, custo: 0, estimativa: distancia(inicio, destino), anterior: null };
  const abertos = [primeiro], custos = new Map([[chave(inicio), 0]]);
  // A parede posterior exige contornar o salão para alcançar estações externas.
  // Cobrir toda a grade evita descartar rotas longas válidas.
  const limiteBusca = 2 * Math.ceil((limites.maxX - limites.minX) / passo + 1) * Math.ceil((limites.maxZ - limites.minZ) / passo + 1);
  for (let tentativas = 0; abertos.length && tentativas < limiteBusca; tentativas++) {
    abertos.sort((a, b) => b.estimativa - a.estimativa);
    const atual = abertos.pop();
    if (atual.custo > custos.get(chave(atual))) continue;
    if (distancia(atual, destino) < 0.8 && livre(atual, destino)) {
      const caminho = [destino];
      for (let no = atual; no.anterior; no = no.anterior) caminho.unshift({ x: no.x, z: no.z });
      return caminho;
    }
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      // Inclui a faixa junto à borda mesmo quando ela não coincide com a grade.
      const proximo = {
        x: Math.max(limites.minX, Math.min(limites.maxX, (Math.round(atual.x / passo) + dx) * passo)),
        z: Math.max(limites.minZ, Math.min(limites.maxZ, (Math.round(atual.z / passo) + dz) * passo))
      };
      const custo = atual.custo + distancia(atual, proximo), id = chave(proximo);
      if (custo >= (custos.get(id) ?? Infinity) || !livre(atual, proximo)) continue;
      custos.set(id, custo);
      abertos.push({ ...proximo, custo, estimativa: custo + distancia(proximo, destino), anterior: atual });
    }
  }
  return [];
}
