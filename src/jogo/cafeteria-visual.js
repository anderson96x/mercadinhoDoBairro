import * as THREE from 'three';
import { CAFETERIA as C, ASSENTOS_CAFETERIA, paredesCafeteria } from './cafeteria.js';
import { construirBalcaoPadaria } from './padaria-decoracao.js';

export function criarXicara(pai, { cilindro, caixa }, x = 0, y = 0, z = 0, leite = false) {
  const grupo = new THREE.Group(); pai.add(grupo); grupo.position.set(x, y, z);
  cilindro(grupo, 0.2, 0.2, 0.025, 0xf4eee4, 0, 0, 0);
  cilindro(grupo, 0.13, 0.095, 0.19, 0xfdf7eb, 0, 0.11, 0);
  cilindro(grupo, 0.112, 0.112, 0.012, leite ? 0xc99b6b : 0x4c291b, 0, 0.209, 0);
  caixa(grupo, 0.085, 0.075, 0.055, 0xfdf7eb, 0.15, 0.13, 0);
  return grupo;
}

export function construirCafeteria(cena, { caixa, cilindro, personagem, criarProduto }) {
  const grupo = new THREE.Group(); grupo.name = 'cafeteria'; cena.add(grupo);
  const bloco = (nome, w, h, d, cor, x, y, z, fundo) => {
    const objeto = caixa(grupo, w, h, d, cor, x, y, z); objeto.name = nome;
    if (fundo !== undefined) objeto.userData.fundo = fundo;
    return objeto;
  };
  // O acréscimo de terreno continua a rua e a calçada até a nova lateral.
  bloco('terreno-cafeteria', 12, 0.3, 46, 0x62b94b, 30, -0.2, -8.5, 1);
  for (const [nome, p] of Object.entries(C.externo)) bloco(`${nome}-cafeteria`, p.w, p.h, p.d, p.cor, p.x, p.y, p.z, nome === 'rua' ? 2 : nome === 'guia' ? 4 : 3);
  for (let x = 26; x < 36; x += 2.5) bloco('faixa-rua-cafeteria', 1.2, 0.012, 0.1, 0xf2e7c9, x, 0.049, 11.6, 4);
  for (let x = 24.7; x < 36; x += 0.8) bloco('junta-calcada-cafeteria', 0.016, 0.01, 2.35, 0xbeb19a, x, 0.135, 7.95, 4);
  for (const z of [7.25, 7.95, 8.65]) bloco('junta-calcada-cafeteria', 12, 0.01, 0.015, 0xbeb19a, 30, 0.136, z, 4);
  bloco('piso-cafeteria', C.piso.w, 0.2, C.piso.d, 0xd8ccb5, C.piso.x, 0.13, C.piso.z, 4);
  for (let x = 21.5; x < 32.8; x += 1.2) bloco('junta-piso', 0.018, 0.008, 15.7, 0xbbae96, x, 0.235, -1.3, 5);
  for (let z = -9.1; z < 6.6; z += 1.2) bloco('junta-piso', 12, 0.008, 0.018, 0xbbae96, 26.9, 0.235, z, 5);
  const oficinas = C.oficinas;
  bloco('piso-maquinas-cafeteria', oficinas.w, 0.2, oficinas.d, 0xc4b9a5, oficinas.x, 0.06, oficinas.z, 3);
  bloco('acabamento-piso-maquinas', oficinas.w, 0.07, oficinas.d, 0xe3dcc8, oficinas.x, 0.19, oficinas.z, 4);
  for (let x = 21.5; x < 32.8; x += 1.2) bloco('junta-piso-maquinas', 0.018, 0.008, 5.7, 0xc8bfae, x, 0.23, oficinas.z, 5);
  for (let z = -15.1; z < -9.3; z += 1.2) bloco('junta-piso-maquinas', 12, 0.008, 0.018, 0xc8bfae, oficinas.x, 0.23, z, 5);
  for (const p of paredesCafeteria()) {
    bloco('parede-cafeteria', p.w, p.h, p.d, 0xf1ead7, p.x, 0.23 + p.h / 2, p.z);
    bloco('acabamento-cafeteria', p.w + 0.04, 0.1, p.d + 0.04, 0x286750, p.x, p.h + 0.23, p.z);
    bloco('rodape-cafeteria', p.w, 0.18, p.d + 0.04, 0x286750, p.x, 0.32, p.z);
  }
  for (const p of [C.balcao, C.fechamento]) {
    const balcao = new THREE.Group(); balcao.name = 'balcao-cafeteria'; grupo.add(balcao);
    construirBalcaoPadaria(balcao, p, { caixa });
  }
  // Máquina, moinho, louça e caixa compartilham a orientação da face direita.
  const equipamentos = new THREE.Group(); equipamentos.name = 'equipamentos-cafeteria'; grupo.add(equipamentos);
  equipamentos.position.set(C.equipamento.x, C.equipamento.y, C.equipamento.z);
  equipamentos.rotation.y = C.equipamento.angulo;
  const equipamento = (nome, w, h, d, cor, x, y, z) => {
    const objeto = caixa(equipamentos, w, h, d, cor, x, y, z); objeto.name = nome; return objeto;
  };
  equipamento('maquina-espresso', 1.3, 0.65, 0.64, 0xb8c5c5, 0, 1.62, 0);
  equipamento('painel-espresso', 1.14, 0.23, 0.08, 0x283c3b, 0, 1.71, 0.32);
  equipamento('bandeja-espresso', 1.25, 0.055, 0.4, 0x667574, 0, 1.32, 0.12);
  for (const x of [-0.3, 0.3]) {
    equipamento('grupo-espresso', 0.12, 0.2, 0.12, 0x495859, x, 1.48, 0.15);
    criarXicara(equipamentos, { cilindro, caixa }, x, 1.32, 0.12);
  }
  equipamento('moinho-cafe', 0.4, 0.45, 0.4, 0x364643, 1.25, 1.51, 0);
  cilindro(equipamentos, 0.19, 0.12, 0.4, 0x674a32, 1.25, 1.94, 0);
  equipamento('caixa-cafeteria', 0.38, 0.35, 0.35, 0x344843, -1.25, 1.47, 0);
  for (let i = 0; i < 4; i++) criarXicara(equipamentos, { cilindro, caixa }, -1.9, 1.31 + i * 0.07, 0);
  const recebimento = C.abastecimento;
  bloco('recebimento-cafeteria', recebimento.w, 0.8, recebimento.d, 0x7c9e8b, recebimento.x, 0.63, recebimento.z);
  bloco('tampo-recebimento', recebimento.w + 0.08, 0.08, recebimento.d + 0.08, 0xe3d4b9, recebimento.x, 1.07, recebimento.z);
  for (const mesa of C.mesas) {
    cilindro(grupo, 0.34, 0.4, 0.08, 0x3c4946, mesa.x, 0.27, mesa.z);
    cilindro(grupo, 0.065, 0.065, 0.9, 0x3c4946, mesa.x, 0.7, mesa.z);
    const tampo = cilindro(grupo, 0.68, 0.68, 0.1, 0xc89860, mesa.x, 1.17, mesa.z); tampo.name = 'mesa-cafeteria';
    cilindro(grupo, 0.1, 0.08, 0.18, 0xf0d9ab, mesa.x, 1.3, mesa.z);
    cilindro(grupo, 0.16, 0.06, 0.25, 0x558456, mesa.x, 1.49, mesa.z);
  }
  for (const p of ASSENTOS_CAFETERIA) {
    const cadeira = new THREE.Group(); cadeira.name = 'cadeira-cafeteria'; grupo.add(cadeira);
    cadeira.position.set(p.x, 0, p.z); cadeira.rotation.y = p.angulo;
    caixa(cadeira, 0.55, 0.1, 0.6, 0xe3b35f, 0, 0.76, 0);
    caixa(cadeira, 0.55, 0.65, 0.08, 0xe3b35f, 0, 1.06, -0.29);
    for (const x of [-0.22, 0.22]) for (const z of [-0.23, 0.23]) caixa(cadeira, 0.055, 0.5, 0.055, 0x485852, x, 0.48, z);
  }
  const barista = personagem(0x32674e, 0xdba271, false, [0x858b91, 0xaeb4ba], null, 'ajudante');
  barista.name = 'barista'; grupo.add(barista);
  barista.rotation.y = C.barista.angulo;
  const avental = caixa(barista.userData.corpo, 0.6, 0.65, 0.07, 0x795337, 0, 0.65, 0.26); avental.name = 'avental-barista';
  const bandeja = new THREE.Group(); barista.add(bandeja); bandeja.position.set(0, 1.2, 0.6);
  caixa(bandeja, 0.85, 0.045, 0.55, 0x73533d, 0, 0, 0);
  const itensMesas = new THREE.Group(); grupo.add(itensMesas);
  let assinatura = '';
  return {
    grupo, barista, bandeja,
    atualizar(sim, dt, animar) {
      grupo.visible = !!sim.estado.melhorias.cafeteria;
      if (!grupo.visible) return;
      animar(barista, sim.barista, dt, sim.tempo);
      barista.userData.cesta.visible = false;
      bandeja.visible = sim.barista.fase === 'entregando';
      const clientes = sim.clientes.filter(c => c.cafeteria && c.fase === 'cafeConsumindo');
      const novaAssinatura = clientes.map(c => c.id).join(',') + ':' + (sim.barista.cliente ?? '');
      if (assinatura === novaAssinatura) return;
      assinatura = novaAssinatura;
      for (const pai of [itensMesas, bandeja]) {
        const remover = pai === bandeja ? pai.children.slice(1) : [...pai.children];
        for (const filho of remover) { filho.traverse(o => o.geometry?.dispose()); pai.remove(filho); }
      }
      const adicionar = (pai, pedido, x, y, z) => pedido.forEach((id, i) => {
        const dx = (i - (pedido.length - 1) / 2) * 0.32;
        if (C.cafes[id]) criarXicara(pai, { cilindro, caixa }, x + dx, y, z, Boolean(C.cafes[id].ingredientes.leite));
        else {
          cilindro(pai, 0.2, 0.2, 0.025, 0xf4eee4, x + dx, y, z);
          const item = criarProduto(id, 0.5); item.position.set(x + dx, y + 0.08, z); pai.add(item);
        }
      });
      for (const c of clientes) {
        const p = ASSENTOS_CAFETERIA[c.assento], mesa = C.mesas[p.mesa];
        adicionar(itensMesas, c.pedidoCafe, mesa.x + Math.sign(p.x - mesa.x) * 0.3, 1.24, mesa.z);
      }
      const cliente = sim.clientes.find(c => c.id === sim.barista.cliente);
      if (cliente) adicionar(bandeja, cliente.pedidoCafe, 0, 0.04, 0);
    }
  };
}
