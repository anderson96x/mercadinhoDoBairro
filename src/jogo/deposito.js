import * as THREE from 'three';
import { PLANTA_DEPOSITO as P, paredesDeposito } from './planta.js';

export function construirDeposito(pai, { caixa, vincular }) {
  const grupo = new THREE.Group(); grupo.name = 'deposito'; pai.add(grupo);
  const bloco = (pai, nome, w, h, d, cor, x, y, z, papel) => {
    const mesh = caixa(pai, w, h, d, cor, x, y, z); mesh.name = nome;
    if (papel) vincular(mesh, papel);
    return mesh;
  };
  const piso = bloco(grupo, 'piso-deposito', P.piso.w, 0.2, P.piso.d,
    0xa5aaa6, P.piso.x, 0.13, P.piso.z);
  piso.userData.fundo = 4;
  for (const p of paredesDeposito()) {
    // Trechos curtos mantêm a profundidade correta das caixas no Canvas.
    const horizontal = p.w > p.d, trechos = Math.ceil(Math.max(p.w, p.d) / 1.2);
    for (let i = 0; i < trechos; i++) {
      const deslocamento = ((i + 0.5) / trechos - 0.5) * (horizontal ? p.w : p.d);
      const w = horizontal ? p.w / trechos : p.w, d = horizontal ? p.d : p.d / trechos;
      const x = p.x + (horizontal ? deslocamento : 0), z = p.z + (horizontal ? 0 : deslocamento);
      bloco(grupo, 'parede-deposito', w, p.h, d, 0xf1ead7, x, 0.23 + p.h / 2, z, 'parede');
      bloco(grupo, 'acabamento-deposito', w + 0.04, 0.1, d + 0.04,
        0x286750, x, 0.23 + p.h, z, 'principal');
      bloco(grupo, 'rodape-deposito', w + 0.025, 0.2, d + 0.025,
        0x286750, x, 0.33, z, 'principal');
    }
  }

  // Um único portão de enrolar recolhido deixa o vão e a rota livres.
  const porta = new THREE.Group(); porta.name = 'porta-deposito'; grupo.add(porta);
  const p = P.porta;
  for (const lado of [-1, 1]) {
    bloco(porta, 'trilho-portao-deposito', 0.12, 2.85, 0.32,
      0x4b585b, p.x + lado * p.w / 2, 1.655, p.z);
  }
  bloco(porta, 'caixa-portao-deposito', p.w + 0.38, 0.42, 0.48, 0x4b585b, p.x, 3.02, p.z);
  const laminas = [];
  const quantidadeLaminas = 18, alturaLamina = 0.135;
  for (let i = 0; i < quantidadeLaminas; i++) {
    const lamina = bloco(porta, 'lamina-portao-deposito', p.w - 0.12, alturaLamina - 0.012, 0.09,
      i % 2 ? 0xaebbbd : 0xc4cdcb, p.x, 0, p.z + 0.1);
    lamina.userData.indicePortao = i; laminas.push(lamina);
  }
  const soleira = bloco(grupo, 'soleira-deposito', p.w - 0.12, 0.1, 0.7,
    0x8c9693, p.x, 0.12, p.z + 0.35);
  soleira.userData.fundo = 5;

  function pacote(pai, x, base, z, w, h, d, indice) {
    const pacote = new THREE.Group(); pacote.name = 'caixa-papelao';
    pacote.position.set(x, base + h / 2, z); pai.add(pacote);
    const cor = [0xc59355, 0xd5a567, 0xb98548][indice % 3];
    bloco(pacote, 'papelao', w, h, d, cor, 0, 0, 0);
    bloco(pacote, 'fita-superior', 0.1, 0.012, d + 0.008, 0xefcf92, 0, h / 2 + 0.004, 0);
    bloco(pacote, 'fita-frontal', 0.1, h, 0.012, 0xefcf92, 0, 0, d / 2 + 0.004);
    bloco(pacote, 'etiqueta-caixa', w * 0.26, h * 0.27, 0.016,
      0xf1eada, w * 0.27, -h * 0.08, d / 2 + 0.01);
    bloco(pacote, 'codigo-caixa', w * 0.16, 0.035, 0.018,
      0x77736a, w * 0.27, -h * 0.08, d / 2 + 0.02);
  }

  for (const [indice, p] of P.estantes.entries()) {
    const estante = new THREE.Group(); estante.name = p.nome;
    estante.position.set(p.x, 0.23, p.z); grupo.add(estante);
    for (const x of [-p.w / 2 + 0.06, p.w / 2 - 0.06]) {
      for (const z of [-p.d / 2 + 0.04, p.d / 2 - 0.04]) {
        bloco(estante, 'montante-azul', 0.09, p.h, 0.09, 0x317c9d, x, p.h / 2, z);
      }
      for (const inclinacao of [-1, 1]) {
        const diagonal = bloco(estante, 'travessa-estante', 0.045, 1.38, 0.045,
          0x7e9caa, x, 1.2, 0);
        diagonal.rotation.x = inclinacao * 0.72;
      }
    }
    for (const [nivel, y] of [0.16, 0.96, 1.76].entries()) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * p.w / 3;
        bloco(estante, 'prateleira-metalica', p.w / 3, 0.07, p.d, 0xb9c6c7, x, y, 0);
        bloco(estante, 'borda-prateleira', p.w / 3, 0.1, 0.06, 0x7a9eae, x, y - 0.025, p.d / 2);
        const h = 0.43 + (indice + nivel + i) % 3 * 0.08;
        pacote(estante, (i - 1) * 0.94, y + 0.035, 0, 0.79, h, 0.78, indice + nivel + i);
      }
    }
  }

  let abertura = 1;
  const posicionarPortao = () => {
    for (const [indice, lamina] of laminas.entries()) {
      const fechada = 0.35 + alturaLamina / 2 + indice * alturaLamina;
      const recolhida = 2.57 + indice * 0.014;
      lamina.position.y = THREE.MathUtils.lerp(fechada, recolhida, abertura);
      lamina.scale.y = THREE.MathUtils.lerp(1, 0.72, abertura);
    }
  };
  posicionarPortao();
  return {
    grupo,
    get abertura() { return abertura; },
    atualizar(aberta, dt = 0) {
      const alvo = aberta ? 1 : 0;
      abertura = THREE.MathUtils.clamp(abertura + Math.sign(alvo - abertura) * dt * 0.85, 0, 1);
      if (Math.abs(alvo - abertura) < 1e-6) abertura = alvo;
      posicionarPortao();
    }
  };
}
