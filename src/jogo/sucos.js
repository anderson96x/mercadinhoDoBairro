// Regras independentes da cena e do DOM; cada sabor tem seu próprio progresso.
export const SUCOS = {
  maquina: { x: 8.85, z: -14.285, w: 1.15, d: 1.2 },
  bancada: { x: 9.5, z: -14.285, w: 2.6, d: 1.75 },
  entrega: { x: 9.5, z: -12.9 },
  geladeira: { x: 0.6, z: -8.45, w: 1.4, d: 1.2 },
  reservaGeladeira: { x: 2.2, z: -8.45, w: 1.4, d: 1.2 },
  cliente: { x: 0.6, z: -7.15 },
  capacidadeEntrada: 8, capacidadeSabor: 6, segundos: 5,
  sabores: {
    sucoLaranja: { nome: 'Suco de laranja', cor: 0xf79c22, ingredientes: { laranja: 1 }, rendimento: 1 },
    sucoMorango: { nome: 'Suco de morango', cor: 0xe74769, ingredientes: { morango: 1 }, rendimento: 1 },
    sucoMaca: { nome: 'Suco de maçã', cor: 0xc8b24b, ingredientes: { maca: 1 }, rendimento: 1 },
    sucoMisto: { nome: 'Suco misto', cor: 0xe97635, ingredientes: { laranja: 1, morango: 1, maca: 1 }, rendimento: 3 }
  }
};

export function estadoSucos() {
  return { ingredientes: { laranja: 0, morango: 0, maca: 0 }, progresso: Object.fromEntries(Object.keys(SUCOS.sabores).map(id => [id, 0])), proximo: 0 };
}

export function validarSucos(dados, comprado) {
  const base = estadoSucos();
  if (!comprado) return base;
  for (const id of Object.keys(base.ingredientes)) {
    const valor = dados?.ingredientes?.[id];
    base.ingredientes[id] = Number.isFinite(valor) ? Math.max(0, Math.min(SUCOS.capacidadeEntrada, Math.floor(valor))) : 0;
  }
  for (const id of Object.keys(base.progresso)) {
    const valor = dados?.progresso?.[id];
    base.progresso[id] = Number.isFinite(valor) ? Math.max(0, Math.min(SUCOS.segundos, valor)) : 0;
  }
  base.proximo = Number.isInteger(dados?.proximo) ? Math.max(0, Math.min(3, dados.proximo)) : 0;
  return base;
}

export function receitaDisponivelSucos(estado) {
  if (!estado.melhorias.sucos) return null;
  const producao = estado.sucos, sabores = Object.entries(SUCOS.sabores);
  // Alterna a prioridade para que os sabores simples não consumam sempre o mix.
  for (let i = 0; i < sabores.length; i++) {
    const indice = (producao.proximo + i) % sabores.length;
    const [id, receita] = sabores[indice], estoque = estado.produtos[id];
    if (estoque.horta + receita.rendimento > SUCOS.capacidadeSabor
      || Object.entries(receita.ingredientes).some(([fruta, quantidade]) => producao.ingredientes[fruta] < quantidade)) continue;
    return { id, receita, indice };
  }
  return null;
}

export function produzirSucos(estado, dt) {
  if (dt <= 0) return;
  const ativa = receitaDisponivelSucos(estado);
  if (!ativa) return;
  const { id, receita, indice } = ativa, producao = estado.sucos, estoque = estado.produtos[id];
  producao.progresso[id] += dt;
  if (producao.progresso[id] >= SUCOS.segundos) {
    for (const [fruta, quantidade] of Object.entries(receita.ingredientes)) producao.ingredientes[fruta] -= quantidade;
    estoque.horta += receita.rendimento;
    producao.progresso[id] = 0;
    producao.proximo = (indice + 1) % Object.keys(SUCOS.sabores).length;
  }
}
