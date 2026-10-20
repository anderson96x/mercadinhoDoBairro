import * as THREE from 'three';
import { PRATELEIRAS_IMPORTADOS } from './planta.js';

// Geometria simples e opaca, compartilhada por WebGL e Canvas 2D.
export function construirPrateleirasImportados(caixa) {
  const grupo = new THREE.Group(); grupo.name = 'prateleiras-importados';
  const prateleiras = PRATELEIRAS_IMPORTADOS.map(p => {
    const estante = new THREE.Group(); estante.name = p.nome;
    estante.visible = false;
    estante.position.set(p.x, 0.2, p.z); grupo.add(estante);
    const metal = 0xc4ced2, borda = 0xe4e9e9, suporte = 0x929fa7;
    // Painel central e três montantes: ambas as faces ficam abertas ao corredor.
    caixa(estante, 0.08, p.h - 0.18, p.d - 0.12, metal, 0, (p.h + 0.18) / 2, 0);
    for (const z of [-p.d / 2 + 0.09, 0, p.d / 2 - 0.09]) {
      caixa(estante, 0.12, p.h, 0.12, suporte, 0, p.h / 2, z);
      caixa(estante, p.w - 0.04, 0.12, 0.16, suporte, 0, 0.06, z);
      for (const x of [-p.w / 2 + 0.12, p.w / 2 - 0.12])
        caixa(estante, 0.15, 0.06, 0.18, 0x606b72, x, 0.03, z);
    }
    // Quatro níveis duplos, sem produtos nem etiquetas de venda.
    for (const y of [0.25, 0.88, 1.51, 2.14]) {
      const nivel = caixa(estante, p.w, 0.07, p.d, borda, 0, y, 0);
      nivel.name = 'nivel-prateleira-importados';
      for (const x of [-p.w / 2 + 0.025, p.w / 2 - 0.025])
        caixa(estante, 0.05, 0.11, p.d, metal, x, y - 0.03, 0);
    }
    return estante;
  });
  return {
    grupo,
    atualizar(melhorias) {
      prateleiras.forEach((p, i) => { p.visible = i < melhorias.prateleirasImportados; });
    }
  };
}
