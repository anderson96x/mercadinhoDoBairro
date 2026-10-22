import * as THREE from 'three';
import { PLANTA_CARGA as P } from './planta.js';

export function construirPatioCarga(pai, caixa) {
  const grupo = new THREE.Group(); grupo.name = 'patio-carga'; pai.add(grupo);
  const bloco = (nome, w, h, d, cor, x, y, z, camada) => {
    const mesh = caixa(grupo, w, h, d, cor, x, y, z); mesh.name = nome;
    if (camada !== undefined) mesh.userData.fundo = camada;
    return mesh;
  };
  for (const [nome, p] of [['asfalto-carga', P.piso], ['acesso-exclusivo-carga', P.acesso], ['caminho-entregador', P.ligacao]]) {
    bloco(nome, p.w, 0.12, p.d, 0x48525a, p.x, 0, p.z, nome === 'acesso-exclusivo-carga' ? 5 : 3);
  }
  for (const p of P.guias) bloco('guia-patio-carga', p.w, 0.16, p.d, 0xc8d0c9, p.x, 0.1, p.z);
  const listras = Math.floor(P.travessia.w / 0.48);
  for (let i = 0; i < listras; i++) {
    bloco('travessia-carga', 0.2, 0.012, P.travessia.d, 0xf7f4df,
      P.travessia.x + (i - (listras - 1) / 2) * 0.48, 0.073, P.travessia.z, 6);
  }
  bloco('linha-vaga-carga', P.vaga.w, 0.015, 0.08, 0xe6bd54,
    P.vaga.x, 0.077, P.vaga.z - P.vaga.d / 2, 4);
  for (const lado of [-1, 1]) {
    bloco('linha-vaga-carga', 0.08, 0.015, P.vaga.d, 0xe6bd54, P.vaga.x + lado * P.vaga.w / 2, 0.077, P.vaga.z, 4);
  }
  // A faixa é compartilhada: ré para entrar, marcha à frente para sair.
  for (const [z, direcao] of [[0, 0], [3.8, Math.PI]]) {
    const forma = new THREE.Shape();
    forma.moveTo(-0.14, -0.65); forma.lineTo(0.14, -0.65); forma.lineTo(0.14, 0.1);
    forma.lineTo(0.42, 0.1); forma.lineTo(0, 0.7); forma.lineTo(-0.42, 0.1); forma.lineTo(-0.14, 0.1); forma.closePath();
    const seta = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({ color: 0xe6bd54, side: THREE.DoubleSide }));
    seta.name = 'seta-carga'; seta.rotation.set(-Math.PI / 2, 0, direcao); seta.position.set(P.vaga.x, 0.08, z); seta.userData.fundo = 4; grupo.add(seta);
  }
  bloco('poste-placa-carga', 0.09, 2.15, 0.09, 0x71817e, P.placa.x, 1.08, P.placa.z);
  bloco('placa-carga-exclusiva', 1.12, 0.86, 0.1, 0xd5aa42, P.placa.x, 2.05, P.placa.z);
  // Pictograma de caminhão em geometria, legível também no Canvas.
  const x = P.placa.x, z = P.placa.z + 0.065;
  bloco('icone-bau-carga', 0.57, 0.35, 0.018, 0x29433c, x - 0.15, 2.1, z);
  bloco('icone-cabine-carga', 0.22, 0.26, 0.018, 0x29433c, x + 0.28, 2.055, z);
  bloco('icone-vidro-carga', 0.12, 0.09, 0.022, 0xf5df9a, x + 0.28, 2.1, z + 0.01);
  for (const dx of [-0.3, 0.23]) bloco('icone-roda-carga', 0.13, 0.13, 0.025, 0x29433c, x + dx, 1.86, z);
  return grupo;
}
