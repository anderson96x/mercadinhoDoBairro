import * as THREE from 'three';

// Cada produto recebe o mesmo acabamento desde seu próprio desbloqueio.
export function criarExpositorHortifruti(caixa, p) {
  const { w, d } = p;
  const grupo = new THREE.Group(); grupo.name = 'secao-hortifruti';
  grupo.position.set(p.x, 0, p.z);
  const madeira = [0xa86c36, 0xb77a40, 0xc18748, 0xb1763b];
  caixa(grupo, w - 0.08, 0.12, d - 0.08, 0x704522, 0, 0.2, 0);
  // Tábuas horizontais nas quatro faces, como o expositor de feira da referência.
  for (let i = 0; i < 6; i++) {
    const y = 0.3 + i * 0.125;
    for (const x of [-w / 2 + 0.045, w / 2 - 0.045])
      caixa(grupo, 0.09, 0.115, d, madeira[i % madeira.length], x, y, 0);
    for (const z of [-d / 2 + 0.045, d / 2 - 0.045])
      caixa(grupo, w - 0.18, 0.115, 0.09, madeira[(i + 1) % madeira.length], 0, y, z);
  }
  const inclinacao = -0.14;
  const altura = x => 1.04 + Math.tan(inclinacao) * x;
  const bandeja = caixa(grupo, w - 0.16, 0.08, d - 0.12, 0x684421, 0, 1.04, 0);
  bandeja.name = 'bandeja-inclinada'; bandeja.rotation.z = inclinacao;
  for (const z of [-d / 2 + 0.04, d / 2 - 0.04]) {
    const borda = caixa(grupo, w - 0.08, 0.19, 0.08, 0xd29a58, 0, 1.1, z);
    borda.rotation.z = inclinacao;
  }
  for (const x of [-w / 2 + 0.065, w / 2 - 0.065]) {
    caixa(grupo, 0.11, 0.3, d, 0xb77a40, x, altura(x) + 0.01, 0);
    caixa(grupo, 0.13, 0.065, d, 0xe0ad6b, x, altura(x) + 0.18, 0);
  }
  return grupo;
}
