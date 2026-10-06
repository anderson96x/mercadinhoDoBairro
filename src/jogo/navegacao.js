// Interseção exata com retângulos: serve tanto para caminhos como para alcance.
export function segmentoLivre(inicio, fim, obstaculos, margem = 0) {
  const dx = fim.x - inicio.x, dz = fim.z - inicio.z;
  for (const o of obstaculos) {
    let entrada = 0, saida = 1;
    for (const [pos, delta, centro, metade] of [[inicio.x, dx, o.x, o.w / 2 + margem], [inicio.z, dz, o.z, o.d / 2 + margem]]) {
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
  for (let tentativas = 0; abertos.length && tentativas < 3000; tentativas++) {
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
      const proximo = { x: (Math.round(atual.x / passo) + dx) * passo, z: (Math.round(atual.z / passo) + dz) * passo };
      if (proximo.x < limites.minX || proximo.x > limites.maxX || proximo.z < limites.minZ || proximo.z > limites.maxZ) continue;
      const custo = atual.custo + distancia(atual, proximo), id = chave(proximo);
      if (custo >= (custos.get(id) ?? Infinity) || !livre(atual, proximo)) continue;
      custos.set(id, custo);
      abertos.push({ ...proximo, custo, estimativa: custo + distancia(proximo, destino), anterior: atual });
    }
  }
  return [];
}
