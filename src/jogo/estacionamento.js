import * as THREE from 'three';
import { PLANTA_ESTACIONAMENTO as P, pisoEstacionamento } from './planta.js';
import { CARRINHOS } from './carrinhos.js';
import { aplicarPaletaCarrinho, criarCarrinho } from './carrinhos-visual.js';

export function construirEstacionamento() {
  const grupo = new THREE.Group(); grupo.name = 'estacionamento'; grupo.visible = false;
  const detalhes = new THREE.Group(); detalhes.name = 'equipamentos-estacionamento'; grupo.add(detalhes);
  const suporteCarrinhos = new THREE.Group(); suporteCarrinhos.name = 'carrinhos-estacionamento';
  suporteCarrinhos.position.set(CARRINHOS.suporte.x, 0.07, CARRINHOS.suporte.z);
  suporteCarrinhos.visible = false; detalhes.add(suporteCarrinhos);
  const carrinhos = Array.from({ length: CARRINHOS.quantidade }, (_, i) => {
    const carrinho = criarCarrinho(); carrinho.rotation.y = Math.PI / 2;
    carrinho.position.x = (i - 2) * 0.3; suporteCarrinhos.add(carrinho); return carrinho;
  });
  const materiais = new Map();
  const caixa = (pai, nome, w, h, d, cor, x, y, z, camada) => {
    if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.9 }));
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materiais.get(cor));
    m.name = nome; m.position.set(x, y, z); m.receiveShadow = true;
    m.castShadow = camada === undefined;
    if (camada !== undefined) m.userData.fundo = camada;
    pai.add(m); return m;
  };
  const asfalto = caixa(grupo, 'asfalto-estacionamento', P.piso.w, 0.12, P.piso.d, 0x48525a, P.piso.x, 0, P.piso.z, 3);
  // Asfalto contínuo entre as duas faixas e a rua, com a calçada recortada no bairro.
  const acesso = caixa(grupo, 'acesso-estacionamento', P.acesso.w, 0.12, P.acesso.d,
    0x48525a, P.acesso.x, 0, P.acesso.z, 5);
  const vertices = acesso.geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    if (vertices.getY(i) > 0) {
      const t = (vertices.getZ(i) + P.acesso.d / 2) / P.acesso.d;
      vertices.setY(i, 0.06 - t * 0.02);
    }
  }
  vertices.needsUpdate = true; acesso.geometry.computeVertexNormals();
  const travessiaZ = 8.25;
  const alturaTravessia = 0.06 - (travessiaZ - (P.acesso.z - P.acesso.d / 2)) / P.acesso.d * 0.02;
  const listras = Math.floor(P.acesso.w / 0.48);
  for (let i = 0; i < listras; i++) {
    const listra = caixa(grupo, 'travessia-estacionamento', 0.2, 0.012, 0.85,
      0xf7f4df, P.acesso.x + (i - (listras - 1) / 2) * 0.48, alturaTravessia + 0.007, travessiaZ, 6);
    listra.rotation.x = Math.atan(0.02 / P.acesso.d);
  }
  const minX = P.piso.x - P.piso.w / 2, maxX = P.piso.x + P.piso.w / 2;
  const minZ = P.piso.z - P.piso.d / 2, maxZ = P.piso.z + P.piso.d / 2;
  const guiasLaterais = [minX + 0.08, maxX - 0.08].map(x => caixa(detalhes, 'guia-lateral-estacionamento', 0.16, 0.16, P.piso.d,
    0xc8d0c9, x, 0.1, P.piso.z));
  const guiaFundos = caixa(detalhes, 'guia-fundo-estacionamento', P.piso.w, 0.16, 0.16, 0xc8d0c9, P.piso.x, 0.1, minZ + 0.08);
  const guiasFrente = [[minX, P.acesso.x - P.acesso.w / 2], [P.acesso.x + P.acesso.w / 2, maxX]].map(([inicio, fim]) =>
    caixa(detalhes, 'guia-frente-estacionamento', fim - inicio, 0.16, 0.16, 0xc8d0c9, (inicio + fim) / 2, 0.1, maxZ - 0.08));
  for (const [i, vaga] of P.vagas.entries()) {
    const marcacao = new THREE.Group(); marcacao.name = `vaga-estacionamento-${i + 1}`; detalhes.add(marcacao);
    for (const z of [vaga.z - vaga.d / 2, vaga.z + vaga.d / 2]) caixa(marcacao, 'linha-vaga', vaga.w, 0.012, 0.055,
      0xf3efd8, vaga.x, 0.073, z, 4);
    caixa(marcacao, 'fundo-vaga', 0.055, 0.012, vaga.d, 0xf3efd8,
      vaga.x + (vaga.lado ? 1 : -1) * vaga.w / 2, 0.073, vaga.z, 4);
    caixa(marcacao, 'limitador-vaga', 0.16, 0.12, 0.9, 0xd6ba5b,
      vaga.x + (vaga.lado ? 1 : -1) * 1.48, 0.12, vaga.z);
  }
  caixa(detalhes, 'canteiro-central-estacionamento', P.ilha.w, 0.2, P.ilha.d,
    0xd3d8c8, P.ilha.x, 0.14, P.ilha.z);
  caixa(detalhes, 'grama-central-estacionamento', P.ilha.w - 0.12, 0.025, P.ilha.d - 0.14,
    0x65b957, P.ilha.x, 0.253, P.ilha.z, 4);
  for (const z of [-4.6, -2.8, -1]) {
    const arbusto = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3e9e52, roughness: 1 }));
    arbusto.name = 'arbusto-estacionamento'; arbusto.position.set(P.ilha.x, 0.48, z);
    arbusto.scale.set(0.85, 0.7, 1.2); arbusto.castShadow = true; detalhes.add(arbusto);
  }
  for (const z of [-5.6, 0.5]) {
    caixa(detalhes, 'poste-estacionamento', 0.07, 3.1, 0.07, 0x71817e, P.ilha.x, 1.75, z);
    caixa(detalhes, 'braco-poste-estacionamento', 1.45, 0.075, 0.075, 0x71817e, P.ilha.x, 3.25, z);
    for (const lado of [-1, 1]) {
      caixa(detalhes, 'luminaria-estacionamento', 0.45, 0.12, 0.24, 0x495956, P.ilha.x + lado * 0.65, 3.22, z);
      caixa(detalhes, 'lente-luminaria-estacionamento', 0.32, 0.025, 0.18, 0xffebba, P.ilha.x + lado * 0.65, 3.147, z);
    }
  }
  const seta = (x, z, direcao) => {
    const forma = new THREE.Shape();
    forma.moveTo(-0.1, -0.5); forma.lineTo(0.1, -0.5); forma.lineTo(0.1, 0.1);
    forma.lineTo(0.32, 0.1); forma.lineTo(0, 0.5); forma.lineTo(-0.32, 0.1); forma.lineTo(-0.1, 0.1); forma.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({ color: 0xf3efd8, side: THREE.DoubleSide }));
    m.name = 'seta-estacionamento'; m.rotation.x = -Math.PI / 2; m.rotation.z = direcao;
    m.position.set(x, 0.082, z); m.userData.fundo = 4; detalhes.add(m);
  };
  for (const z of [-3.8, 3.5]) for (const faixa of P.faixas) seta(faixa.x, z, faixa.direcao);
  const carros = new Map();
  const placa = new THREE.Group(); placa.name = 'placa-estacionamento';
  placa.position.set(P.placa.x, 0, P.placa.z); detalhes.add(placa);
  caixa(placa, 'poste-placa', 0.07, 1.7, 0.07, 0x71817e, 0, 0.9, 0);
  caixa(placa, 'placa-azul', 0.65, 0.75, 0.08, 0x23669c, 0, 1.7, 0);
  // Letra P em geometria: legível nos dois renderizadores, sem imagem externa.
  caixa(placa, 'letra-P', 0.085, 0.47, 0.02, 0xfff9df, -0.12, 1.7, 0.055);
  for (const y of [1.9, 1.7]) caixa(placa, 'letra-P', 0.29, 0.08, 0.02, 0xfff9df, 0, y, 0.055);
  caixa(placa, 'letra-P', 0.08, 0.2, 0.02, 0xfff9df, 0.12, 1.8, 0.055);
  let compradoAntes, expansaoAnterior, progresso = 1;
  return { grupo, carros, aplicarPaleta(paleta) {
    carrinhos.forEach(carrinho => aplicarPaletaCarrinho(carrinho, paleta));
  }, receberCarro(id, carro) {
    carro.userData.luzes = [];
    carro.traverse(o => { if (['pisca', 'luz-freio', 'luz-re'].includes(o.name)) carro.userData.luzes.push(o); });
    carros.set(id, carro); grupo.add(carro);
  }, atualizar(comprado, dt = 0, veiculos = [], tempo = 0, expandida = false, carrinhosLivres = 0, carrinhosComprados = false) {
    suporteCarrinhos.visible = comprado && carrinhosComprados;
    carrinhos.forEach((carrinho, i) => { carrinho.visible = i < carrinhosLivres; });
    if (expandida !== expansaoAnterior) {
      expansaoAnterior = expandida;
      const piso = pisoEstacionamento(expandida), esquerda = piso.x - piso.w / 2, direita = piso.x + piso.w / 2;
      asfalto.scale.set(piso.w / P.piso.w, 1, piso.d / P.piso.d);
      asfalto.position.set(piso.x, 0, piso.z);
      for (const [indice, guia] of guiasLaterais.entries()) {
        guia.scale.z = piso.d / P.piso.d;
        guia.position.set(indice ? direita - 0.08 : esquerda + 0.08, 0.1, piso.z);
      }
      // O asfalto encosta no depósito e na loja, sem meio-fio no portão.
      guiaFundos.visible = !expandida;
      guiasLaterais[1].visible = !expandida;
      const inicio = P.acesso.x + P.acesso.w / 2;
      guiasFrente[1].scale.x = (direita - inicio) / (maxX - inicio);
      guiasFrente[1].position.x = (inicio + direita) / 2;
    }
    if (comprado && compradoAntes === false) progresso = 0;
    compradoAntes = comprado; grupo.visible = comprado;
    if (comprado) progresso = Math.min(1, progresso + dt / 4);
    detalhes.scale.y = Math.max(0.001, THREE.MathUtils.smoothstep(progresso, 0, 1));
    for (const estado of veiculos) {
      if (!carros.has(estado.clienteId)) continue;
      const carro = carros.get(estado.clienteId);
      const giro = Math.atan2(Math.sin(estado.angulo - carro.rotation.y), Math.cos(estado.angulo - carro.rotation.y));
      carro.position.set(estado.x, estado.z > 9.26 ? 0.04 : 0.06, estado.z);
      carro.rotation.y = estado.angulo;
      carro.visible = true;
      carro.userData.porta.rotation.y = -estado.porta * 1.1;
      for (const roda of carro.userData.rodas) roda.rotation.z = estado.rodas;
      for (const suporte of carro.userData.direcaoRodas) suporte.rotation.y = THREE.MathUtils.lerp(suporte.rotation.y,
        estado.velocidade > 0.1 && dt > 0 ? THREE.MathUtils.clamp(giro / dt * 0.65 * (estado.fase === 're' ? -1 : 1), -0.48, 0.48) : 0, Math.min(1, dt * 8));
      for (const luz of carro.userData.luzes) {
        if (luz.name === 'luz-re') luz.visible = estado.fase === 're';
        else {
          const acesa = luz.name === 'pisca' ? luz.userData.lado === estado.direcaoCurva && Math.sin(tempo * 9) > 0
            : estado.freando;
          luz.material.emissive.setHex(acesa ? (luz.name === 'pisca' ? 0xff8a15 : 0xff2515) : 0);
          luz.material.emissiveIntensity = acesa ? 0.9 : 0;
        }
      }
    }
    for (const [id, carro] of carros) if (!veiculos.some(c => c.clienteId === id)) {
      carro.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (['pisca', 'luz-freio'].includes(o.name)) o.material.dispose(); } });
      grupo.remove(carro); carros.delete(id);
    }
  } };
}
