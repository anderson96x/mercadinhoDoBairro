import { trabalhoPadaria, criarRoteirosPadaria } from './producao-padaria.js';
import { criarLataSoda, criarGeladeiraSoda, posicaoLataSoda } from './soda-visual.js';
import { SUCOS } from './sucos.js';
import { criarLaticinio, posicaoLaticinio, GELADEIRA_LATICINIOS } from './laticinios-visual.js';
import { aplicarPaletaCarrinho, CARRINHO_CLIENTE, criarCarrinho } from './carrinhos-visual.js';
import { criarMaquinaSucos, animarMaquinaSucos, criarGarrafaSuco, criarGeladeiraSucos, posicaoGarrafaGeladeira, GELADEIRA_SUCOS } from './sucos-visual.js';
import { construirBatedeira } from './batedeira.js';
import { construirBalcoesDecorados, criarVitrineCurva, criarBandejaRecebimento } from './padaria-decoracao.js';
import { CONFEITARIA, podeProduzirConfeitaria, situacaoConfeiteiro, maquinaConfeitaria } from './confeitaria.js';
import { criarDoceConfeitaria } from './doces-confeitaria.js';
import { criarExpositorHortifruti } from './hortifruti.js';
import { PLANTA_EXPANSAO, MODELO_PADARIA, pontoPadaria } from './planta.js';
import { construirBairro } from './bairro.js';
import { geometriaEstacao, distanciaEstacao } from './estacoes.js';
import { Trafego, MODELOS_CARROS } from './trafego.js';
import { ColetaBancoVisual } from './coleta-banco.js';
import { AssaltoVisual } from './assalto-visual.js';
import { BANCO } from './banco.js';
import * as THREE from 'three';
import { CLASSES_PRODUTOS, PACOTES_POR_CLASSE } from './classes-produtos.js';
import { pacotesDaClasse } from './entregas.js';
import { produtosDaLoja, CONFIG, PRODUTOS, ALA_PRODUCAO, ALA_LEITE, ALA_TRIGO, ALA_PADARIA, ALA_ARTESANAL, OFICINAS } from './configuracao.js';
import { RenderizadorCompativel } from './renderizador-compativel.js';
import { PALETAS } from './personalizacao.js';
import { APARENCIAS_CLIENTES } from './aparencias-clientes.js';
import { ALTURA_BANDEJA_MEL, construirColmeia, animarAbelhas } from './colmeia.js';
import { atualizarMarcha, animarPernas } from './marcha.js';
import { icone } from '../interface/icones.js';
import { criarSol } from './iluminacao.js';
import { criarArvore } from './arvores.js';
import { criarPlacaProduto } from './placas-produtos.js';
import { construirEstacionamento } from './estacionamento.js';
import { construirPrateleirasImportados, alturaPrateleiraImportados } from './prateleiras-importados.js';
import { EntregasVisual } from './entregas-visual.js';
import { buscarCaminho, segmentoLivre } from './navegacao.js';
import { criarIrrigador, animarIrrigador } from './irrigador.js';
import { criarEnlatado } from './enlatados.js';
import { criarCereal } from './cereais.js';
import { criarGuloseima } from './guloseimas.js';
import { criarMantimento } from './mantimentos.js';

const ZOOM_MINIMO = 0.7;
const ZOOM_MAXIMO = 2;
const pontoNoBalcao = (x, y, z) => new THREE.Vector3(CONFIG.balcao.x + z, y, CONFIG.balcao.z - x);
const materiais = new Map();
const vidroLeite = new THREE.MeshPhysicalMaterial({ color: 0xd8eeed, transparent: true, opacity: 0.48, roughness: 0.08, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
const leiteVitrine = new THREE.MeshBasicMaterial({ color: 0xfafcf3 });
const vidroMel = new THREE.MeshStandardMaterial({ color: 0xffe3a0, transparent: true, opacity: 0.24, roughness: 0.22, depthWrite: false });
const verdeLeiteVitrine = new THREE.MeshBasicMaterial({ color: 0x087e64 });
function estacaoDesbloqueada(id, estado) {
  if (id === 'soda') return !!estado.melhorias.geladeiraSoda;
  if (PRODUTOS[id]?.origem === 'pomar') return !!estado.produtos[id]?.liberado;
  const estagioNecessario = PRODUTOS[id]?.origem === 'confeitaria' ? ALA_PADARIA.indice : id === 'morango' ? ALA_ARTESANAL.indice : id === 'ovos' ? ALA_PRODUCAO.indice : id === 'leite' ? ALA_LEITE.indice : id === 'trigo' ? ALA_TRIGO.indice : id === 'pao' ? ALA_PADARIA.indice : 0;
  return !!estado.produtos[id]?.liberado && estado.estagioLoja >= estagioNecessario;
}
function material(cor) {
  if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, metalness: 0 }));
  return materiais.get(cor);
}
function objeto(geometria, cor, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometria, material(cor)); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function caixa(pai, w, h, d, cor, x, y, z) {
  const m = objeto(new THREE.BoxGeometry(w, h, d), cor, x, y, z); pai.add(m); return m;
}
function esfera(pai, r, cor, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = objeto(new THREE.SphereGeometry(r, 8, 6), cor, x, y, z); m.scale.set(sx, sy, sz); pai.add(m); return m;
}
function cilindro(pai, r1, r2, h, cor, x, y, z, lados = 12) {
  const m = objeto(new THREE.CylinderGeometry(r1, r2, h, lados), cor, x, y, z); pai.add(m); return m;
}
function liberarGeometrias(grupo) {
  grupo.traverse(m => { if (m.isMesh) m.geometry?.dispose(); });
  grupo.clear();
}

function posicaoProdutoPrateleira(id, p, i) {
  if (id === 'laticinio') return posicaoLaticinio(p, i);
  if (id === 'soda') return posicaoLataSoda(p, i);
  if (SUCOS.sabores[id]) {
    return posicaoGarrafaGeladeira(id, p, i);
  }
  if (id === 'ovos') {
    const nivel = Math.floor(i / 3);
    return new THREE.Vector3(p.x - 0.65 + i % 3 * 0.65, 0.79 + nivel * 0.58, p.z + 0.49);
  }
  if (p.movel === 'hortifruti') {
    const x = -0.4 + i % 3 * 0.4;
    return new THREE.Vector3(p.x + x, 1.2 - x * 0.14, p.z - 0.75 + Math.floor(i / 3) * 0.5);
  }
  if (id === 'leite') return new THREE.Vector3(p.x - 0.75 + i % 4 * 0.5, 0.98 + Math.floor(i / 4) * 0.65, p.z + 0.48);
  if (id === 'queijo') {
    return new THREE.Vector3(p.x - 0.75 + i % 4 * 0.5, 0.93 + Math.floor(i / 4) * 0.65, p.z + 0.32);
  }
  if (id === 'pao') return new THREE.Vector3(p.x + 0.07, 0.98 + Math.floor(i / 6) * 0.4, p.z - 1.15 + i % 6 * 0.46);
  if (p.movel === 'doces') return new THREE.Vector3(p.x - 0.78 + i % 4 * 0.52, 1.27, p.z - 0.43 + Math.floor(i / 4) * 0.43);
  return new THREE.Vector3(p.x - 0.78 + i % 4 * 0.52, 1.11, p.z - 0.43 + Math.floor(i / 4) * 0.43);
}

function criarImportadoNaPrateleira(id, p, indice) {
  if (id === 'laticinio') {
    const produto = criarLaticinio(indice); produto.scale.setScalar(GELADEIRA_LATICINIOS.escala); produto.position.copy(posicaoLaticinio(p.prateleira, indice)); return produto;
  }
  if (id === 'soda') {
    const lata = criarLataSoda(); lata.position.copy(posicaoLataSoda(p.prateleira, indice)); return lata;
  }
  const nivel = Math.floor(indice / 9), coluna = indice % 9;
  const produto = criarProduto(id, 0.82, nivel * 3);
  produto.rotation.y = CLASSES_PRODUTOS[p.classe].lado * Math.PI / 2;
  const limite = new THREE.Box3().setFromObject(produto);
  const lado = CLASSES_PRODUTOS[p.classe].lado;
  // Margens iguais nas pontas e frentes alinhadas, independentemente da embalagem.
  const margem = 0.38, passo = (p.prateleira.d - margem * 2) / 8;
  produto.position.set(p.prateleira.x + lado * (p.prateleira.w / 2 - 0.06) - (lado < 0 ? limite.min.x : limite.max.x),
    alturaPrateleiraImportados(nivel) - limite.min.y, p.prateleira.z - p.prateleira.d / 2 + margem + coluna * passo);
  return produto;
}

function organizarImportadosCarregados(carga) {
  const camadas = [];
  carga.children.forEach((produto, i) => {
    produto.position.set(0, 0, 0);
    produto.scale.setScalar(1);
    const limite = new THREE.Box3().setFromObject(produto), tamanho = limite.getSize(new THREE.Vector3());
    const alturaMaxima = produto.name.startsWith('cereal-') ? 0.28 : 0.24;
    const escala = Math.min(0.65, 0.2 / tamanho.x, 0.2 / tamanho.z, alturaMaxima / tamanho.y);
    produto.scale.setScalar(escala);
    const camada = Math.floor(i / 4);
    camadas[camada] = Math.max(camadas[camada] ?? 0, tamanho.y * escala);
    produto.position.set((i % 2 - 0.5) * 0.23,
      0.06 + camadas.slice(0, camada).reduce((total, h) => total + h + 0.025, 0) - limite.min.y * escala,
      (Math.floor(i / 2) % 2 - 0.5) * 0.23 + 0.02);
  });
}

function percorrerRoteiro(etapas, tempo) {
  const ciclo = etapas.reduce((total, etapa) => total + etapa.duracao, 0);
  let momento = tempo % ciclo;
  for (const etapa of etapas) {
    if (momento <= etapa.duracao) {
      const t = THREE.MathUtils.smoothstep(momento / etapa.duracao, 0, 1);
      return {
        x: THREE.MathUtils.lerp(etapa.de.x, etapa.para.x, t),
        z: THREE.MathUtils.lerp(etapa.de.z, etapa.para.z, t),
        andando: Math.hypot(etapa.de.x - etapa.para.x, etapa.de.z - etapa.para.z) > 0.001 && t > 0 && t < 1,
        destino: etapa.para,
        acao: etapa.acao,
        carga: etapa.carga,
        fase: momento / etapa.duracao
      };
    }
    momento -= etapa.duracao;
  }
  return { ...etapas[0].de, andando: false, destino: etapas[0].para };
}

function criarRefrigerador(pai, ponto, id = 'leite') {
  if (id === 'leite' || id === 'queijo') return criarRefrigeradorParede(pai, ponto, id);
  const refrigerador = new THREE.Group();
  refrigerador.name = `ilha-fria-${id}`;
  refrigerador.position.set(ponto.x, 0, ponto.z); pai.add(refrigerador);
  const { w, d } = ponto;
  // Ilha baixa acabada nas quatro faces, com bandeja fria e guarda de vidro.
  caixa(refrigerador, w, 0.78, d, 0xf2f5f2, 0, 0.64, 0);
  caixa(refrigerador, w - 0.12, 0.1, d - 0.12, 0x63868d, 0, 1.08, 0);
  for (const x of [-w / 2 + 0.035, w / 2 - 0.035]) {
    const vidro = caixa(refrigerador, 0.04, 0.38, d - 0.1, 0xd8eeed, x, 1.28, 0); vidro.material = vidroLeite;
    caixa(refrigerador, 0.055, 0.05, d, 0x61a9b5, x, 1.49, 0);
    for (let z = -d / 2 + 0.25; z < d / 2 - 0.2; z += 0.3)
      caixa(refrigerador, 0.018, 0.12, 0.12, 0x8fa4a7, x, 0.5, z);
  }
  for (const z of [-d / 2 + 0.035, d / 2 - 0.035]) {
    const vidro = caixa(refrigerador, w - 0.1, 0.38, 0.04, 0xd8eeed, 0, 1.28, z); vidro.material = vidroLeite;
    caixa(refrigerador, w, 0.05, 0.055, 0x61a9b5, 0, 1.49, z);
  }
  return { grupo: refrigerador };
}

function criarRefrigeradorParede(pai, p, id = 'leite', alturas = [0.79, 1.44, 2.09]) {
  const grupo = new THREE.Group(); grupo.name = `refrigerador-parede-${id}`;
  grupo.position.set(p.x, 0, p.z); pai.add(grupo);
  const { w, d } = p, frente = d / 2;
  const base = caixa(grupo, w, 0.42, d - 0.06, 0xe0e8e5, 0, 0.44, -0.03);
  base.name = `base-refrigerador-${id}`;
  caixa(grupo, w - 0.14, 2.26, 0.1, 0xcbdedb, 0, 1.75, -d / 2 + 0.05);
  for (const x of [-w / 2 + 0.06, w / 2 - 0.06]) {
    caixa(grupo, 0.12, 2.28, d, 0xeaf1f0, x, 1.74, 0);
    caixa(grupo, 0.035, 1.98, 0.035, 0xd4fff5, x * 0.91, 1.7, frente - 0.14);
  }
  for (const y of alturas) {
    const prateleira = caixa(grupo, w - 0.24, 0.07, d - 0.18, 0x9bbab9, 0, y, 0);
    prateleira.name = `prateleira-${id}`;
  }
  const vidro = vidroLeite.clone(); vidro.opacity = 0.18;
  for (const lado of [-1, 1]) {
    const porta = caixa(grupo, w / 2 - 0.1, 1.96, 0.018, 0xd8eeed, lado * w / 4, 1.71, frente - 0.08);
    porta.name = `porta-vidro-${id}`; porta.material = vidro;
    caixa(grupo, 0.045, 0.32, 0.06, 0x526c69, lado * 0.1, 1.5, frente - 0.04);
  }
  for (const x of [-w / 2 + 0.055, 0, w / 2 - 0.055])
    caixa(grupo, 0.055, 2.05, 0.045, 0x718985, x, 1.72, frente - 0.05);
  for (const y of [0.695, 2.745]) caixa(grupo, w, 0.055, 0.06, 0x718985, 0, y, frente - 0.04);
  caixa(grupo, w, 0.12, d, 0xeaf1f0, 0, 2.95, 0);
  caixa(grupo, w, 0.23, 0.14, id === 'queijo' ? 0xfc9d03 : 0x3498db, 0, 2.815, frente - 0.08);
  const grade = caixa(grupo, w - 0.14, 0.28, 0.025, 0x344b4c, 0, 0.44, frente - 0.025);
  grade.name = `grade-refrigerador-${id}`;
  for (let i = 0; i < 7; i++) caixa(grupo, w - 0.18, 0.014, 0.018, 0x8d9f9c, 0, 0.335 + i * 0.035, frente - 0.02);
  return { grupo };
}

function criarBanca(pai, p, cor = 0xd98b43) {
  if (p.movel === 'hortifruti') return criarSecaoHortifruti(pai, p);
  if (p.movel === 'doces') {
    const banca = criarExpositorHortifruti(caixa, p, { inclinacao: 0, nome: 'secao-doces' });
    pai.add(banca); return banca;
  }
  caixa(pai, p.movel === 'doces' ? p.w : p.w - 0.12, 0.65, p.d - 0.12, cor, p.x, 0.53, p.z);
  caixa(pai, p.w, 0.13, p.d, 0xffd98a, p.x, 0.91, p.z);
  for (const z of [-p.d / 2 + 0.04, p.d / 2 - 0.04]) caixa(pai, p.w, 0.18, 0.08, cor, p.x, 1.04, p.z + z);
  for (const x of [-p.w / 2 + 0.04, p.w / 2 - 0.04]) caixa(pai, 0.08, 0.18, p.d, cor, p.x + x, 1.04, p.z);
}

function criarEstanteOvos(pai, p) {
  const estante = new THREE.Group(); estante.name = 'estante-ovos';
  estante.position.set(p.x, 0, p.z); pai.add(estante);
  // Gabinete branco aberto, com fundo fechado e prateleiras planas de metal.
  caixa(estante, p.w - 0.1, 0.18, p.d - 0.08, 0xadb8bb, 0, 0.23, 0);
  caixa(estante, p.w, 0.16, p.d, 0xe7edef, 0, 0.4, 0);
  caixa(estante, p.w - 0.16, 2.38, 0.08, 0xc4d0d3, 0, 1.63, -p.d / 2 + 0.04);
  for (const x of [-p.w / 2 + 0.06, p.w / 2 - 0.06]) {
    caixa(estante, 0.12, 2.5, p.d, 0xe7edef, x, 1.63, 0);
    caixa(estante, 0.035, 2.37, 0.035, 0xf8faf9, x, 1.63, p.d / 2 - 0.025);
  }
  const teto = caixa(estante, p.w, 0.16, p.d, 0xf0f3f3, 0, 2.85, 0);
  teto.name = 'teto-estante-ovos';
  for (let nivel = 0; nivel < 4; nivel++) {
    const prateleira = new THREE.Group(); prateleira.name = 'prateleira-ovos';
    prateleira.position.set(0, 0.48 + nivel * 0.58, 0); estante.add(prateleira);
    caixa(prateleira, p.w - 0.24, 0.07, p.d - 0.18, 0x91adb4, 0, 0, 0.02);
    caixa(prateleira, p.w - 0.24, 0.09, 0.045, 0xc8dbdf, 0, 0, p.d / 2 - 0.065);
    for (const x of [-0.65, 0, 0.65]) {
      caixa(prateleira, 0.4, 0.045, 0.46, 0xe2d9be, x, 0.055, 0.44);
      caixa(prateleira, 0.24, 0.055, 0.012, 0xfff7df, x, 0, p.d / 2 - 0.035);
    }
  }
  return estante;
}

function criarSecaoHortifruti(pai, p) {
  const grupo = criarExpositorHortifruti(caixa, p); pai.add(grupo);
  return grupo;
}

export function criarProduto(id, escala = 1, variante = 0) {
  if (id === 'laticinio') { const produto = criarLaticinio(variante); produto.scale.setScalar(escala); return produto; }
  if (id === 'soda') { const lata = criarLataSoda(); lata.scale.setScalar(escala); return lata; }
  if (SUCOS.sabores[id]) {
    const garrafa = criarGarrafaSuco(id); garrafa.scale.setScalar(escala); return garrafa;
  }
  if (CONFEITARIA.produtos[id]) {
    const doce = criarDoceConfeitaria(id, variante); doce.scale.setScalar(escala); return doce;
  }
  if (id === 'guloseima') {
    const guloseima = criarGuloseima(variante); guloseima.scale.setScalar(escala); return guloseima;
  }
  if (id === 'mantimento') {
    const mantimento = criarMantimento(variante); mantimento.scale.setScalar(escala); return mantimento;
  }
  if (id === 'enlatado') {
    const enlatado = criarEnlatado(variante); enlatado.scale.setScalar(escala); return enlatado;
  }
  if (id === 'cereal') {
    const cereal = criarCereal(variante); cereal.scale.setScalar(escala); return cereal;
  }
  const grupo = new THREE.Group();
  if (id === 'tomate') {
    esfera(grupo, 0.16, 0xff3f32, 0, 0, 0, 1, 0.86, 1);
    const folha = caixa(grupo, 0.2, 0.04, 0.09, 0x2a9b40, 0, 0.14, 0); folha.rotation.y = 0.7;
    caixa(grupo, 0.04, 0.09, 0.04, 0x2a9b40, 0, 0.18, 0);
  } else if (id === 'maca') {
    esfera(grupo, 0.16, 0xb52b3a, -0.065, 0, 0, 0.9, 1, 1);
    esfera(grupo, 0.16, 0xce3a49, 0.065, 0, 0, 0.9, 1, 1);
    cilindro(grupo, 0.025, 0.03, 0.12, 0x795335, 0, 0.19, 0, 5);
    const folha = esfera(grupo, 0.11, 0x4b962e, 0.09, 0.22, 0, 1, 0.22, 0.45);
    folha.rotation.z = 0.3;
  } else if (id === 'laranja') {
    esfera(grupo, 0.18, 0xf79520, 0, 0, 0, 1, 0.96, 1);
    cilindro(grupo, 0.025, 0.03, 0.07, 0x795335, 0, 0.19, 0, 5);
    const folha = esfera(grupo, 0.09, 0x4b962e, 0.07, 0.19, 0, 1, 0.22, 0.45);
    folha.rotation.z = 0.3;
  } else if (id === 'morango') {
    esfera(grupo, 0.17, 0xe74769, 0, 0, 0, 0.9, 1.1, 0.85);
    for (const x of [-0.07, 0.07]) for (const y of [-0.06, 0.05]) esfera(grupo, 0.018, 0xffe9a5, x, y, 0.135);
    for (const angulo of [0, 1, 2]) {
      const folha = caixa(grupo, 0.26, 0.035, 0.07, 0x38964b, 0, 0.16, 0); folha.rotation.y = angulo;
    }
  } else if (id === 'mel') {
    cilindro(grupo, 0.125, 0.125, 0.28, 0xe8a72f, 0, 0, 0);
    const garrafa = cilindro(grupo, 0.14, 0.14, 0.34, 0xffe3a0, 0, 0.02, 0); garrafa.material = vidroMel;
    const ombros = cilindro(grupo, 0.073, 0.14, 0.09, 0xffe3a0, 0, 0.235, 0); ombros.material = vidroMel;
    const gargalo = cilindro(grupo, 0.073, 0.073, 0.08, 0xffe3a0, 0, 0.31, 0); gargalo.material = vidroMel;
    cilindro(grupo, 0.081, 0.081, 0.045, 0x9b642f, 0, 0.365, 0);
    caixa(grupo, 0.22, 0.13, 0.018, 0xfff3dc, 0, 0.035, 0.14);
    esfera(grupo, 0.035, 0xc98919, 0, 0.035, 0.158, 0.8, 1.1, 0.3);
  } else if (id === 'geleia') {
    cilindro(grupo, 0.14, 0.14, 0.28, 0xb94470, 0, 0, 0);
    cilindro(grupo, 0.15, 0.15, 0.06, 0xf1d3c9, 0, 0.17, 0);
    caixa(grupo, 0.22, 0.12, 0.015, 0xfff3dc, 0, 0, 0.14);
    esfera(grupo, 0.035, 0xe74769, 0, 0, 0.16);
  } else if (id === 'queijo') {
    cilindro(grupo, 0.21, 0.21, 0.16, 0xf5cd61, 0, 0, 0, 10);
    for (const [x, z] of [[-0.08, 0.02], [0.06, 0.08], [0.05, -0.09]]) cilindro(grupo, 0.03, 0.03, 0.008, 0xdca43e, x, 0.084, z, 7);
  } else if (id === 'ovos') {
    esfera(grupo, 0.16, 0xf8e6bf, 0, 0, 0, 0.82, 1.16, 0.82);
  } else if (id === 'leite') {
    cilindro(grupo, 0.115, 0.115, 0.31, 0xfaf9ec, 0, -0.02, 0);
    const corpo = cilindro(grupo, 0.135, 0.135, 0.38, 0xd8e8e4, 0, 0, 0); corpo.material = vidroLeite;
    const gargalo = cilindro(grupo, 0.075, 0.09, 0.14, 0xd8e8e4, 0, 0.25, 0); gargalo.material = vidroLeite;
    cilindro(grupo, 0.08, 0.08, 0.045, 0x478e6a, 0, 0.34, 0);
    caixa(grupo, 0.27, 0.1, 0.018, 0x267b64, 0, 0.02, 0.14);
    caixa(grupo, 0.17, 0.018, 0.02, 0xfaf8df, 0, 0.02, 0.153);
  } else if (id === 'trigo') {
    for (const [x, z, altura] of [[-0.09, 0, 0.5], [0.06, -0.06, 0.57], [0.14, 0.07, 0.46]]) {
      cilindro(grupo, 0.018, 0.025, altura, 0x78963e, x, -0.12, z, 5);
      grupo.add(objeto(new THREE.ConeGeometry(0.105, 0.31, 6), 0xe4bc57, x, altura / 2 + 0.01, z));
      for (const lado of [-1, 1]) {
        const folha = esfera(grupo, 0.1, 0x86a64a, x + lado * 0.08, -0.19, z, 1.1, 0.17, 0.33);
        folha.rotation.z = lado * 0.55;
      }
    }
  } else if (id === 'pao') {
    const pao = esfera(grupo, 0.21, 0xc67a36, 0, 0, 0, 1.12, 0.66, 0.78);
    pao.rotation.z = -0.12;
    for (const x of [-0.09, 0.03, 0.14]) {
      const corte = caixa(grupo, 0.025, 0.012, 0.22, 0xf5d89b, x, 0.135, 0);
      corte.rotation.z = 0.3;
    }
  } else {
    esfera(grupo, 0.14, 0xffd22e, 0, 0, 0, 0.7, 1.5, 0.7);
    const folha = esfera(grupo, 0.12, 0x38a447, 0.07, -0.06, 0, 0.45, 1.6, 0.55); folha.rotation.z = -0.35;
  }
  grupo.scale.setScalar(escala); return grupo;
}

function criarVaca(pai, x, z) {
  const vaca = new THREE.Group(); vaca.position.set(x, 0, z); pai.add(vaca);
  const pelo = 0xf3f2ec, peloEscuro = 0xdededa, mancha = 0x252827;
  const tronco = new THREE.Group(); tronco.position.y = 1.35; vaca.add(tronco);
  esfera(tronco, 1, pelo, 0, 0, 0, 1.15, 0.61, 0.53);
  for (const lado of [-1, 1]) {
    esfera(tronco, 0.38, mancha, -0.48, 0.09, lado * 0.46, 0.9, 0.78, 0.3);
    esfera(tronco, 0.27, mancha, 0.4, -0.08, lado * 0.49, 0.9, 0.86, 0.25);
  }
  esfera(tronco, 0.3, 0xd9b2b4, -0.1, -0.57, 0, 0.88, 0.48, 0.76);
  for (const px of [-0.24, 0.04]) for (const pz of [-0.13, 0.13]) {
    cilindro(tronco, 0.045, 0.06, 0.17, 0xd09fa5, px, -0.77, pz, 6);
  }
  for (const px of [-0.7, 0.7]) for (const pz of [-0.28, 0.28]) {
    esfera(vaca, 0.27, pelo, px, 1.05, pz, 1, 1.15, 0.85);
    const perna = cilindro(vaca, 0.19, 0.105, 1.04, peloEscuro, px, 0.69, pz, 8);
    perna.rotation.z = px > 0 ? -0.13 : 0.11;
    esfera(vaca, 0.17, 0x282b29, px + (px > 0 ? 0.06 : -0.04), 0.13, pz, 1.06, 0.45, 0.85);
  }
  const cabeca = new THREE.Group(); cabeca.position.set(0.96, 1.56, 0); vaca.add(cabeca);
  const pescoco = esfera(cabeca, 0.45, pelo, 0.1, -0.25, 0, 0.89, 1.12, 0.88);
  pescoco.rotation.z = -0.28;
  const rosto = esfera(cabeca, 0.4, pelo, 0.57, -0.2, 0, 1.2, 0.74, 0.77);
  rosto.rotation.z = -0.23;
  const testa = esfera(cabeca, 0.35, peloEscuro, 0.48, -0.06, 0, 0.99, 0.42, 0.82);
  testa.rotation.z = -0.23;
  esfera(cabeca, 0.28, 0xc79099, 1.01, -0.47, 0, 0.76, 0.45, 1.06);
  for (const lado of [-1, 1]) {
    const orelha = esfera(cabeca, 0.17, pelo, 0.31, 0.07, lado * 0.39, 1.25, 0.48, 0.75);
    orelha.rotation.x = lado * 0.25;
    cilindro(cabeca, 0.055, 0.09, 0.2, peloEscuro, 0.34, 0.22, lado * 0.2, 6);
    esfera(cabeca, 0.043, 0xf5f2e9, 0.75, -0.12, lado * 0.29);
    esfera(cabeca, 0.019, 0x171a19, 0.765, -0.12, lado * 0.32);
  }
  const cauda = new THREE.Group(); cauda.position.set(-1.05, 1.56, 0); vaca.add(cauda);
  const haste = cilindro(cauda, 0.055, 0.065, 0.62, peloEscuro, -0.12, -0.27, 0, 7);
  haste.rotation.z = -0.3;
  esfera(cauda, 0.11, mancha, -0.23, -0.57, 0, 0.75, 1.3, 0.75);
  vaca.userData = { tronco, cabeca, cauda, baseY: vaca.position.y };
  return vaca;
}

function animarVaca(vaca, tempo) {
  const { tronco, cabeca, cauda, baseY } = vaca.userData;
  vaca.position.y = baseY + Math.sin(tempo * 1.5) * 0.018;
  tronco.scale.y = 1 + Math.sin(tempo * 1.5) * 0.025;
  cabeca.rotation.z = Math.sin(tempo * 0.9) * 0.075 - 0.04;
  cauda.rotation.x = Math.sin(tempo * 2.2) * 0.26;
  cauda.rotation.z = Math.sin(tempo * 1.25) * 0.18;
}

function criarGalinha(pai, x, y, z, corCorpo, corAsa, fase) {
  const galinha = new THREE.Group(); galinha.position.set(x, y, z); pai.add(galinha);
  esfera(galinha, 0.29, corCorpo, 0, 0.34, 0, 1, 0.92, 1.18);
  esfera(galinha, 0.18, corCorpo, 0, 0.51, 0.18, 0.9, 1.1, 0.9);
  const asas = [];
  for (const lado of [-1, 1]) {
    const asa = new THREE.Group(); asa.position.set(lado * 0.23, 0.39, -0.03); galinha.add(asa);
    esfera(asa, 0.19, corAsa, lado * 0.07, 0, 0, 0.54, 0.75, 1.15);
    asas.push(asa);
    cilindro(galinha, 0.04, 0.045, 0.16, 0xd69839, lado * 0.12, 0.12, 0.08);
    caixa(galinha, 0.11, 0.035, 0.19, 0xd69839, lado * 0.12, 0.045, 0.17);
  }
  const cauda = objeto(new THREE.ConeGeometry(0.18, 0.42, 5), corAsa, 0, 0.56, -0.34);
  cauda.rotation.x = -0.55; galinha.add(cauda);
  const cabeca = new THREE.Group(); cabeca.position.set(0, 0.58, 0.24); galinha.add(cabeca);
  esfera(cabeca, 0.19, corCorpo, 0, 0, 0);
  for (const [zPena, altura] of [[-0.1, 0.18], [0, 0.23], [0.1, 0.17]]) {
    esfera(cabeca, 0.075, 0xd94b36, 0, altura, zPena, 0.85, 1.1, 0.8);
  }
  const bico = objeto(new THREE.ConeGeometry(0.085, 0.17, 4), 0xeab13e, 0, -0.045, 0.23);
  bico.rotation.x = Math.PI / 2; cabeca.add(bico);
  esfera(cabeca, 0.06, 0xd94b36, 0, -0.15, 0.16, 0.7, 1.25, 0.75);
  for (const lado of [-1, 1]) {
    esfera(cabeca, 0.037, 0x272a25, lado * 0.165, 0.025, 0.075, 0.7, 1, 1);
  }
  galinha.userData = { cabeca, asas, baseY: y, fase };
  return galinha;
}

function animarGalinha(galinha, tempo) {
  const { cabeca, asas, baseY, fase } = galinha.userData;
  const bicada = Math.max(0, Math.sin(tempo * 1.7 + fase)) ** 10;
  galinha.position.y = baseY + Math.sin(tempo * 3 + fase) * 0.018;
  galinha.rotation.y = Math.sin(tempo * 0.9 + fase) * 0.08;
  cabeca.rotation.x = bicada * 0.48;
  asas.forEach((asa, i) => { asa.rotation.z = (i ? -1 : 1) * (0.12 + Math.sin(tempo * 4.5 + fase) * 0.055); });
}

function braco(cor, pele, x) {
  const grupo = new THREE.Group();
  const superior = caixa(grupo, 0.16, 1, 0.18, cor, 0, 0, 0);
  const inferior = caixa(grupo, 0.13, 1, 0.14, pele, 0, 0, 0);
  const mao = esfera(grupo, 0.09, pele, 0, 0, 0);
  grupo.userData = { superior, inferior, mao, ombro: new THREE.Vector3(x, 0.89, 0) };
  return grupo;
}

function posicionarBraco(grupo, destino) {
  const { superior, inferior, mao, ombro } = grupo.userData;
  const cotovelo = ombro.clone().lerp(destino, 0.5);
  cotovelo.x += Math.sign(ombro.x) * 0.08;
  cotovelo.y -= 0.12;
  for (const [parte, inicio, fim] of [[superior, ombro, cotovelo], [inferior, cotovelo, destino]]) {
    const direcao = fim.clone().sub(inicio);
    parte.position.copy(inicio).lerp(fim, 0.5);
    parte.scale.y = direcao.length();
    parte.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao.normalize());
  }
  mao.position.copy(destino);
}

function contornoArredondado(caminho, w, h, r) {
  const x = -w / 2, y = -h / 2;
  caminho.moveTo(x + r, y);
  caminho.lineTo(x + w - r, y); caminho.quadraticCurveTo(x + w, y, x + w, y + r);
  caminho.lineTo(x + w, y + h - r); caminho.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  caminho.lineTo(x + r, y + h); caminho.quadraticCurveTo(x, y + h, x, y + h - r);
  caminho.lineTo(x, y + r); caminho.quadraticCurveTo(x, y, x + r, y);
  return caminho;
}

function criarCesta(cor = 0xe50918, corBorda = 0xff2933, corAlca = 0x17191b) {
  const cesta = new THREE.Group();
  // Base menor, paredes inclinadas e duas fileiras de aberturas verticais.
  const base = contornoArredondado(new THREE.Shape(), 0.8, 0.54, 0.08);
  const fundo = objeto(new THREE.ExtrudeGeometry(base, { depth: 0.045, bevelEnabled: false, curveSegments: 3 }), cor);
  fundo.rotation.x = -Math.PI / 2; cesta.add(fundo);
  for (const [y, w, h, espessura, corAro] of [
    [0.03, 0.81, 0.55, 0.06, cor],
    [0.23, 0.88, 0.62, 0.055, cor],
    [0.44, 0.97, 0.71, 0.065, corBorda]
  ]) {
    const aro = contornoArredondado(new THREE.Shape(), w, h, 0.09);
    aro.holes.push(contornoArredondado(new THREE.Path(), w - 0.09, h - 0.09, 0.045));
    const borda = objeto(new THREE.ExtrudeGeometry(aro, { depth: espessura, bevelEnabled: false, curveSegments: 3 }), corAro, 0, y, 0);
    borda.rotation.x = -Math.PI / 2; cesta.add(borda);
  }
  for (const lado of [-1, 1]) {
    for (let i = -3; i <= 3; i++) {
      const tira = caixa(cesta, 0.065, 0.44, 0.045, cor, i * 0.125, 0.25, lado * 0.292);
      tira.rotation.x = lado * 0.16;
    }
    for (let i = -2; i <= 2; i++) {
      const tira = caixa(cesta, 0.045, 0.44, 0.065, cor, lado * 0.422, 0.25, i * 0.123);
      tira.rotation.z = -lado * 0.16;
    }
  }
  // Alça única, alta e com cantos arredondados, presa às laterais longas.
  const alca = new THREE.Shape();
  alca.moveTo(-0.35, 0.44); alca.lineTo(-0.35, 0.82);
  alca.quadraticCurveTo(-0.35, 0.92, -0.25, 0.92);
  alca.lineTo(0.25, 0.92); alca.quadraticCurveTo(0.35, 0.92, 0.35, 0.82);
  alca.lineTo(0.35, 0.44); alca.lineTo(0.285, 0.44); alca.lineTo(0.285, 0.81);
  alca.quadraticCurveTo(0.285, 0.855, 0.24, 0.855);
  alca.lineTo(-0.24, 0.855); alca.quadraticCurveTo(-0.285, 0.855, -0.285, 0.81);
  alca.lineTo(-0.285, 0.44); alca.closePath();
  const pega = objeto(new THREE.ExtrudeGeometry(alca, { depth: 0.055, bevelEnabled: false, curveSegments: 4 }), corAlca, -0.0275, 0, 0);
  pega.rotation.y = Math.PI / 2; cesta.add(pega);
  cesta.userData.alca = pega;
  cesta.userData.pega = new THREE.Vector3(0, 0.89, 0);
  return cesta;
}

function criarCaixaMadeira() {
  const caixaMadeira = new THREE.Group();
  caixa(caixaMadeira, 0.82, 0.07, 0.58, 0x8b5a32, 0, 0.04, 0);
  for (const lado of [-1, 1]) {
    for (const y of [0.14, 0.3, 0.46]) {
      caixa(caixaMadeira, 0.86, 0.1, 0.055, y === 0.3 ? 0xb57a43 : 0xa66d3b, 0, y, lado * 0.29);
    }
    caixa(caixaMadeira, 0.07, 0.52, 0.07, 0x744725, lado * 0.37, 0.27, -0.29);
    caixa(caixaMadeira, 0.07, 0.52, 0.07, 0x744725, lado * 0.37, 0.27, 0.29);
  }
  for (const x of [-0.4, 0.4]) {
    for (const y of [0.14, 0.3, 0.46]) caixa(caixaMadeira, 0.055, 0.1, 0.58, 0x9b6336, x, y, 0);
  }
  return caixaMadeira;
}

export function usarCaixaMadeira(modelo, usar) {
  const d = modelo.userData;
  if (!d.caixaMadeira) return;
  d.caixaMadeira.visible = usar;
  d.visualCestaNormal.forEach(parte => { parte.visible = !usar; });
  d.usandoCaixaMadeira = usar;
}

export function ajudanteUsaCaixaMadeira(ajudante) {
  return ajudante.inventario.some(id => PRODUTOS[id]?.origem === 'horta');
}

function aplicarPaletaCesta(cesta, paleta) {
  if (cesta.userData.paletaAplicada === paleta.id) return;
  cesta.traverse(malha => {
    if (!malha.isMesh || malha === cesta.userData.alca) return;
    if (!malha.userData.materialPersonalizado) {
      malha.material = malha.material.clone();
      malha.userData.materialPersonalizado = true;
    }
    malha.material.color.set(paleta.principal);
  });
  cesta.userData.paletaAplicada = paleta.id;
}

export function aplicarPaletaFuncionario(modelo, paleta) {
  const uniforme = modelo.userData.uniforme;
  if (!uniforme || uniforme.paletaAplicada === paleta.id) return;
  for (const [malhas, cor] of [[uniforme.camisa, paleta.principal], [uniforme.chapeu, paleta.principal]]) {
    for (const malha of malhas) {
      if (!malha.userData.materialUniforme) {
        malha.material = malha.material.clone();
        malha.userData.materialUniforme = true;
      }
      malha.material.color.set(cor);
    }
  }
  uniforme.paletaAplicada = paleta.id;
}

export function criarSacola() {
  const sacola = new THREE.Group();
  const papel = new THREE.Group(); sacola.add(papel);
  // Uma casca aberta, com cantos unidos e laterais dobradas para dentro.
  const abertura = [
    [-0.4, 0.7, -0.26], [0.4, 0.72, -0.26], [0.35, 0.68, 0],
    [0.4, 0.73, 0.26], [-0.4, 0.71, 0.26], [-0.35, 0.67, 0]
  ];
  const base = abertura.map(([x, , z]) => [x * 0.84, 0.025, z * 0.84]);
  const interior = abertura.map(([x, y, z]) => [x * 0.94, y - 0.012, z * 0.94]);
  const fundo = base.map(([x, , z]) => [x * 0.94, 0.045, z * 0.94]);
  const face = (pontos, cor) => {
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(pontos.flat(), 3));
    geometria.setIndex([0, 1, 2, 0, 2, 3]); geometria.computeVertexNormals();
    papel.add(objeto(geometria, cor));
  };
  for (let i = 0; i < abertura.length; i++) {
    const j = (i + 1) % abertura.length;
    const dobra = abertura[i].map((v, eixo) => eixo === 1 ? v - 0.045 : v);
    const proximaDobra = abertura[j].map((v, eixo) => eixo === 1 ? v - 0.045 : v);
    const cor = [0xb38350, 0x95663e, 0xa37343, 0xbd8b54, 0x98693e, 0xaa7848][i];
    face([base[i], dobra, proximaDobra, base[j]], cor);
    face([dobra, abertura[i], abertura[j], proximaDobra], 0xc99a62);
    face([fundo[j], interior[j], interior[i], fundo[i]], 0xd0a16a);
    face([abertura[i], interior[i], interior[j], abertura[j]], 0xe0b984);
  }
  caixa(papel, 0.68, 0.04, 0.44, 0xb38350, 0, 0.02, 0);
  sacola.userData.conteudo = new THREE.Group(); sacola.add(sacola.userData.conteudo);
  sacola.userData.papel = papel;
  sacola.userData.aparicao = 0;
  return sacola;
}

export function posicaoProdutoSacola(indice, quantidade = 5) {
  const layouts = {
    1: [[0, 0.45, 0]],
    2: [[-0.14, 0.49, 0], [0.14, 0.49, 0]],
    3: [[-0.14, 0.38, 0.06], [0.14, 0.38, 0.06], [0, 0.55, -0.05]],
    4: [[-0.14, 0.4, 0.07], [0.14, 0.4, 0.07], [-0.14, 0.59, -0.06], [0.14, 0.59, -0.06]],
    5: [[-0.2, 0.43, 0.07], [0, 0.43, 0.07], [0.2, 0.43, 0.07], [-0.11, 0.63, -0.07], [0.11, 0.63, -0.07]]
  };
  const layout = layouts[Math.max(1, Math.min(5, quantidade))];
  return new THREE.Vector3(...(layout[indice] ?? layout.at(-1)));
}

export function ajustarSacola(sacola, quantidade, preenchimento = 1) {
  const total = Math.max(1, Math.min(5, quantidade));
  const cheio = (total - 1) / 4;
  const entrada = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(preenchimento, 0, 1), 0, 1);
  sacola.userData.papel.scale.set(
    (0.88 + cheio * 0.12) * (0.94 + entrada * 0.06),
    (0.8 + cheio * 0.23) * (0.82 + entrada * 0.18),
    (0.9 + cheio * 0.1) * (0.94 + entrada * 0.06)
  );
}

function cabeloCliente(corpo, visual) {
  const cor = visual.corCabelo;
  if (visual.cabelo === 'raspado') {
    esfera(corpo, 0.285, cor, 0, 1.28, -0.035, 1, 0.34, 0.95);
    return;
  }
  esfera(corpo, 0.285, cor, 0, 1.34, -0.04, 1, visual.genero === 'mulher' ? 0.6 : 0.48, 0.97);
  if (visual.genero === 'mulher') {
    if (visual.cabelo === 'chanel') {
      esfera(corpo, 0.24, cor, 0, 1.17, -0.14, 1.08, 1.2, 0.72);
    } else if (visual.cabelo === 'ondas') {
      esfera(corpo, 0.23, cor, 0, 1.13, -0.16, 1.08, 1.4, 0.65);
      for (const [x, y] of [[-0.18, 1.03], [-0.09, 0.98], [0, 1.02], [0.09, 0.98], [0.18, 1.03]]) {
        esfera(corpo, 0.1, cor, x, y, -0.17);
      }
    } else if (visual.cabelo === 'afro_longo') {
      esfera(corpo, 0.3, cor, 0, 1.31, -0.12, 1.22, 1.3, 0.98);
      for (const [x, y, z] of [[-0.21, 1.48, -0.05], [0, 1.57, -0.08], [0.21, 1.48, -0.05], [0, 1.36, -0.3]]) {
        esfera(corpo, 0.16, cor, x, y, z);
      }
    } else if (visual.cabelo === 'afro_curto_feminino' || visual.cabelo === 'afro_alto_feminino') {
      const alto = visual.cabelo === 'afro_alto_feminino';
      for (const [x, y, z] of [[-0.2, 1.42, 0], [0, 1.5, 0.04], [0.2, 1.42, 0], [-0.22, 1.29, -0.12], [0.22, 1.29, -0.12], [0, 1.42, -0.22]]) {
        esfera(corpo, alto ? 0.145 : 0.12, cor, x, y + (alto ? 0.07 : 0), z);
      }
    } else if (visual.cabelo === 'coque') {
      esfera(corpo, 0.18, cor, 0, 1.51, -0.16);
    } else if (visual.cabelo === 'coque_afro') {
      esfera(corpo, 0.24, cor, 0, 1.55, -0.13);
      for (const [x, y] of [[-0.12, 1.58], [0.12, 1.58], [0, 1.7]]) esfera(corpo, 0.13, cor, x, y, -0.13);
    } else if (visual.cabelo === 'liso') {
      esfera(corpo, 0.25, cor, 0, 1.12, -0.16, 1.06, 1.48, 0.62);
    } else if (visual.cabelo === 'rabo') {
      for (let i = 0; i < 4; i++) esfera(corpo, 0.11, cor, 0, 1.34 - i * 0.12, -0.29);
      esfera(corpo, 0.055, 0xe5b85e, 0, 1.36, -0.29);
    }
  } else {
    if (visual.cabelo === 'curto') {
      esfera(corpo, 0.16, cor, -0.11, 1.41, 0.12, 1, 0.45, 0.75);
    } else if (visual.cabelo === 'afro_curto' || visual.cabelo === 'afro_alto' || visual.cabelo === 'cacheado') {
      const volume = visual.cabelo === 'cacheado' ? 0.09 : visual.cabelo === 'afro_alto' ? 0.145 : 0.115;
      const altura = visual.cabelo === 'afro_alto' ? 0.08 : 0;
      for (const [x, y, z] of [[-0.17, 1.43, 0.05], [0, 1.48, 0.1], [0.17, 1.43, 0.05], [-0.19, 1.33, -0.12], [0.19, 1.33, -0.12]]) {
        esfera(corpo, volume, cor, x, y + altura, z);
      }
    } else if (visual.cabelo === 'degrade') {
      caixa(corpo, 0.32, 0.07, 0.3, cor, 0, 1.47, 0.04);
    } else if (visual.cabelo === 'topete') {
      esfera(corpo, 0.19, cor, 0, 1.48, 0.12, 1.15, 0.5, 0.8);
    }
  }
}

function detalhesCliente(corpo, visual, frenteRosto = 0.255) {
  const tecido = visual.corRoupa;
  const detalhe = 0xf7e9d0;
  const largura = visual.porte === 'corpulento' ? 1.55 : 1;
  if (visual.roupa === 'camisa') {
    caixa(corpo, 0.12, 0.035, 0.025, detalhe, 0, 0.96, 0.25);
    caixa(corpo, 0.035, 0.32, 0.025, detalhe, 0, 0.76, 0.255);
    for (const y of [0.85, 0.73, 0.61]) esfera(corpo, 0.018, 0x374449, 0, y, 0.28);
  } else if (visual.roupa === 'jaqueta') {
    caixa(corpo, 0.035, 0.38, 0.025, detalhe, 0, 0.72, 0.27);
    for (const lado of [-1, 1]) caixa(corpo, 0.1, 0.05, 0.03, 0x374449, lado * 0.15, 0.73, 0.27);
    caixa(corpo, 0.38 * largura, 0.06, 0.23, 0x374449, 0, 0.52, 0);
  } else if (visual.roupa === 'vestido') {
    cilindro(corpo, 0.23 * largura, 0.35 * largura, 0.36, tecido, 0, 0.51, 0, 12);
    caixa(corpo, 0.45 * largura, 0.055, 0.31, detalhe, 0, 0.69, 0);
  } else if (visual.roupa === 'blusa_saia') {
    cilindro(corpo, 0.22 * largura, 0.37 * largura, 0.28, visual.corCalca, 0, 0.46, 0, 12);
    caixa(corpo, 0.42 * largura, 0.05, 0.31, detalhe, 0, 0.66, 0);
    caixa(corpo, 0.2, 0.055, 0.025, detalhe, 0, 0.93, 0.25);
  }
  if (visual.oculos) {
    const armacao = visual.oculos === 'sol' ? 0x242a30 : 0xc7ae79;
    for (const lado of [-1, 1]) {
      const aro = objeto(new THREE.TorusGeometry(0.069, 0.012, 5, 12), armacao, lado * 0.095, 1.19, frenteRosto + 0.013);
      corpo.add(aro);
      if (visual.oculos === 'sol') esfera(corpo, 0.062, 0x3d4c52, lado * 0.095, 1.19, frenteRosto + 0.012, 1, 0.7, 0.12);
    }
    caixa(corpo, 0.055, 0.016, 0.02, armacao, 0, 1.2, frenteRosto + 0.012);
  }
  if (visual.acessorio === 'brincos') {
    for (const lado of [-1, 1]) esfera(corpo, 0.04, 0xe9bd69, lado * 0.275, 1.05, 0.01);
  } else if (visual.acessorio === 'lenco') {
    cilindro(corpo, 0.185, 0.205, 0.075, 0xeac77b, 0, 1.015, 0);
    caixa(corpo, 0.075, 0.2, 0.04, 0xeac77b, 0.13, 0.9, 0.19);
  } else if (visual.acessorio === 'colar') {
    esfera(corpo, 0.045, 0xe9bd69, 0, 0.97, 0.24);
  } else if (visual.acessorio === 'gravata') {
    caixa(corpo, 0.065, 0.2, 0.03, 0x9b4045, 0, 0.86, 0.27);
  } else if (visual.acessorio === 'bolso') {
    caixa(corpo, 0.12, 0.08, 0.025, detalhe, -0.12, 0.78, 0.26);
  }
}

export function personagem(cor, pele = 0xf2c49c, jogador = false, coresCesta = [], visual = null, funcao = null) {
  const g = new THREE.Group();
  const corpo = new THREE.Group(); g.add(corpo);
  const corpulento = visual?.porte === 'corpulento';
  const funcionario = ['caixa', 'ajudante', 'padaria', 'entrega'].includes(funcao);
  const uniformizado = jogador || funcionario;
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.38, 20), new THREE.MeshBasicMaterial({ color: 0x204c31, transparent: true, opacity: 0.13, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.014; sombra.scale.setScalar(corpulento ? 1.5 : 1); g.add(sombra);
  const corCalca = uniformizado ? 0x17191b : visual?.genero === 'mulher' ? pele : (visual?.corCalca ?? 0x344b58);
  const corSapato = uniformizado ? 0x242628 : (visual?.corSapato ?? 0xf8f0dc);
  const afastamentoPernas = corpulento ? 0.24 : 0.15;
  const larguraPerna = corpulento ? 0.27 : 0.19;
  const pernaE = caixa(g, larguraPerna, 0.36, 0.22, corCalca, -afastamentoPernas, 0.28, 0);
  const pernaD = caixa(g, larguraPerna, 0.36, 0.22, corCalca, afastamentoPernas, 0.28, 0);
  const peE = caixa(g, 0.22, 0.12, 0.32, corSapato, -afastamentoPernas, 0.09, 0.06);
  const peD = caixa(g, 0.22, 0.12, 0.32, corSapato, afastamentoPernas, 0.09, 0.06);
  const coxasMarcha = [-afastamentoPernas, afastamentoPernas].map(x => caixa(g, larguraPerna, 0.19, 0.22, corCalca, x, 0.39, 0));
  const coxas = [-afastamentoPernas, afastamentoPernas].map(x => caixa(corpo, larguraPerna, 0.19, 0.34, corCalca, x, 0.43, 0.13));
  coxas.forEach(coxa => { coxa.visible = false; });
  const torso = objeto(new THREE.CapsuleGeometry(0.24, 0.22, 3, 8), cor, 0, 0.73, 0);
  torso.scale.x = corpulento ? (visual.genero === 'mulher' ? 2.25 : 2.35) : (visual?.genero === 'mulher' ? 1.03 : 1.13);
  torso.scale.z = corpulento ? 1.55 : 1;
  corpo.add(torso);
  const barriga = corpulento ? esfera(corpo, 0.37, cor, 0, 0.66, 0.09, 1.55, 1.08, 1.35) : null;
  const ombro = corpulento ? 0.59 : 0.34;
  const bracoE = braco(cor, pele, -ombro);
  const bracoD = braco(cor, pele, ombro);
  corpo.add(bracoE, bracoD);
  esfera(corpo, 0.28, pele, 0, 1.16, 0, corpulento ? 1.22 : 1, 1.05, corpulento ? 1.08 : 0.92);
  if (visual) cabeloCliente(corpo, visual);
  else esfera(corpo, 0.285, 0x49362d, 0, 1.29, -0.04, 1, 0.64, 0.95);
  const chapeu = [];
  if (uniformizado && funcao !== 'padaria') {
    chapeu.push(cilindro(corpo, 0.22, 0.26, 0.2, cor, 0, 1.48, -0.01));
    chapeu.push(caixa(corpo, 0.52, 0.045, 0.34, cor, 0, 1.4, 0.08));
  }
  const frenteRosto = corpulento ? 0.3 : 0.255;
  esfera(corpo, 0.025, 0x3e352c, -0.09, 1.17, frenteRosto);
  esfera(corpo, 0.025, 0x3e352c, 0.09, 1.17, frenteRosto);
  if (visual?.barba) {
    const corBarba = visual.corCabelo;
    const cheia = visual.barba === 'cheia';
    if (visual.barba !== 'cavanhaque') {
      esfera(corpo, cheia ? 0.19 : 0.16, corBarba, 0, 1.055, frenteRosto - 0.002, 1.35, cheia ? 0.58 : 0.38, 0.13);
    }
    esfera(corpo, visual.barba === 'cavanhaque' ? 0.085 : 0.07, corBarba, 0, 1.005, frenteRosto + 0.008, 0.72, 1, 0.14);
  }
  if (visual?.idoso) {
    const corLinha = new THREE.Color(pele).multiplyScalar(0.7).getHex();
    for (const lado of [-1, 1]) {
      caixa(corpo, 0.07, 0.014, 0.016, visual.corCabelo, lado * 0.09, 1.25, 0.242);
      caixa(corpo, 0.045, 0.008, 0.012, corLinha, lado * 0.215, 1.13, 0.15);
    }
  }
  if (visual) detalhesCliente(corpo, visual, frenteRosto);
  const cesta = jogador ? new THREE.Group() : criarCesta(...coresCesta);
  cesta.position.set(0, jogador ? 0.42 : corpulento ? 0.2 : 0.26, jogador ? 0.5 : corpulento ? 0.72 : 0.58); corpo.add(cesta);
  cesta.userData.pega ??= new THREE.Vector3(0, 0.89, 0);
  const visualCestaNormal = [...cesta.children];
  const caixaMadeira = funcao === 'ajudante' || jogador ? criarCaixaMadeira() : null;
  if (caixaMadeira) {
    caixaMadeira.visible = false;
    if (jogador) caixaMadeira.scale.setScalar(0.58);
    cesta.add(caixaMadeira);
  }
  const carga = new THREE.Group(); cesta.add(carga);
  const produtoNaMao = new THREE.Group(); corpo.add(produtoNaMao);
  const uniforme = uniformizado ? { camisa: [torso, bracoE.userData.superior, bracoD.userData.superior, ...(barriga ? [barriga] : [])], chapeu, paletaAplicada: null } : null;
  g.userData = { corpo, torso, barriga, corpulento, pernaE, pernaD, peE, peD, coxas, coxasMarcha, bracoE, bracoD, cesta, visualCestaNormal, caixaMadeira, usandoCaixaMadeira: false, carga, produtoNaMao, inventario: null, coleta: null, sentar: 0, jogador, funcao, uniforme };
  posicionarBraco(bracoE, cesta.userData.pega.clone().add(cesta.position));
  posicionarBraco(bracoD, new THREE.Vector3(0.4, 0.65, 0.32));
  return g;
}

export function criarEntregador() {
  const aparencia = { ...APARENCIAS_CLIENTES.find(p => p.genero === 'homem' && p.porte === 'regular' && !p.idoso),
    roupa: 'camisa', corRoupa: 0x28705c, corCalca: 0x263d49, corSapato: 0x20282b, acessorio: 'bolso' };
  const modelo = personagem(aparencia.corRoupa, aparencia.pele, false, [], aparencia, 'entrega');
  modelo.userData.aparencia = aparencia;
  return modelo;
}

export class Cena {
  constructor(container, simulacao) {
    this.sim = simulacao; this.container = container;
    this.tempoVisual = 0;
    this.cena = new THREE.Scene(); this.cena.background = new THREE.Color(0x78c85a);
    this.camera = new THREE.OrthographicCamera(-18, 18, 12, -12, 0.1, 100);
    this.camera.zoom = ZOOM_MAXIMO;
    const superficie = document.createElement('canvas');
    const contexto = superficie.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer = contexto
      ? new THREE.WebGLRenderer({ canvas: superficie, context: contexto, antialias: true, alpha: false })
      : new RenderizadorCompativel();
    this.modoCompativel = !contexto;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.5;
    this.renderer.domElement.setAttribute('aria-label', 'Mercadinho em 3D. Arraste para andar; use o botão direito, Shift e arraste, ou dois dedos para mover o mapa. Use a roda do mouse ou pinça para ajustar o zoom.');
    container.prepend(this.renderer.domElement);
    this.cena.add(new THREE.HemisphereLight(0xfff4dc, 0x70a85d, 2.55));
    const sol = criarSol();
    this.cena.add(sol, sol.target);
    this.alvoCamera = new THREE.Vector3(-0.5, 0, 0.8);
    this.deslocamentoCamera = new THREE.Vector3();
    this.construirMundo();
    this.trafego = new Trafego(this.cena);
    this.sim.estacionamento.receberDoTrafego = id => {
      const carro = this.trafego.retirarParaEstacionar();
      if (!carro) return null;
      this.estacionamento.receberCarro(id, carro.grupo);
      return { modelo: MODELOS_CARROS.indexOf(carro.modelo), x: carro.grupo.position.x,
        z: carro.grupo.position.z, angulo: carro.grupo.rotation.y,
        rodas: carro.grupo.userData.rodas[0].rotation.z, velocidade: carro.velocidade };
    };
    this.coletaBanco = new ColetaBancoVisual(this.cena);
    this.entregasVisual = new EntregasVisual(this.cena, criarEntregador,
      (modelo, ator, caminhao, dt, tempo) => this.animarEntregador(modelo, ator, caminhao, dt, tempo));
    this.assaltoVisual = new AssaltoVisual(this.cena);
    this.alertaCaixa = new THREE.Group();
    const fundoAlerta = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), new THREE.MeshBasicMaterial({ color: 0xc34f32, side: THREE.DoubleSide }));
    this.alertaCaixa.add(fundoAlerta);
    caixa(this.alertaCaixa, 0.065, 0.23, 0.025, 0xfff9e9, 0, 0.07, 0.02);
    esfera(this.alertaCaixa, 0.04, 0xfff9e9, 0, -0.13, 0.025);
    this.alertaCaixa.name = 'alerta-dinheiro-caixa'; this.cena.add(this.alertaCaixa);
    this.alertaCaixeiro = this.alertaCaixa.clone();
    this.alertaCaixeiro.name = 'alerta-caixeiro-assalto'; this.cena.add(this.alertaCaixeiro);
    this.notasCaixa = Array.from({ length: 4 }, (_, i) => caixa(this.cena, 0.26, 0.045, 0.13, i % 2 ? 0x91b578 : 0xb6c68e, CONFIG.balcao.x - 0.3, 1.42 + i * 0.047, CONFIG.balcao.z + 0.15));
    this.sacolaEmbalagem = criarSacola(); this.sacolaEmbalagem.position.copy(pontoNoBalcao(-0.35, 1.31, -0.72)); this.sacolaEmbalagem.rotation.y = Math.PI / 2; this.sacolaEmbalagem.visible = false; this.cena.add(this.sacolaEmbalagem);
    this.itensEmbalagem = new THREE.Group(); this.cena.add(this.itensEmbalagem); this.clienteEmbalandoId = null;
    this.jogador = personagem(0xf8ecd1, 0xe9b489, true); this.cena.add(this.jogador);
    // Triângulo voltado para a câmera, exclusivo do jogador e legível em qualquer zoom.
    this.marcadorJogador = new THREE.Group();
    this.marcadorJogador.name = 'marcador-jogador';
    const triangulo = new THREE.Shape();
    triangulo.moveTo(-0.5, 0.3); triangulo.lineTo(0.5, 0.3); triangulo.lineTo(0, -0.5); triangulo.closePath();
    const geometriaMarcador = new THREE.ShapeGeometry(triangulo);
    for (const [cor, escala, ordem] of [[0x173f32, 1, 200], [0xffd45a, 0.74, 201]]) {
      const parte = new THREE.Mesh(geometriaMarcador, new THREE.MeshBasicMaterial({ color: cor, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      parte.scale.setScalar(escala); parte.renderOrder = ordem; parte.userData.fundo = ordem;
      this.marcadorJogador.add(parte);
    }
    this.cena.add(this.marcadorJogador);
    this.clientes = new Map(); this.retratosClientes = new Map(); this.labels = []; this.alvosHorta = []; this.efeitosCrescimento = [];
    this.raycaster = new THREE.Raycaster(); this.ponteiroRaycast = new THREE.Vector2();
    const PRODUTOS = produtosDaLoja(this.sim.estado);
    this.expansaoConstruida = !!this.sim.estado.melhorias.expansao;
    this.lojaCompactaConstruida = this.sim.compacta;
    this.produtos = {};
    for (const [id, p] of Object.entries(PRODUTOS)) {
      if (id === 'pao') this.construirPadaria();
      else if (p.origem === 'confeitaria') continue;
      else if (p.origem === 'importado') this.construirImportado(id, p);
      else this.construirEstacao(id, p);
    }
    this.caixeiro = personagem(0x428b88, 0x9b6848, false, [], null, 'caixa'); this.caixeiro.position.set(CONFIG.cadeiraCaixa.x, 0.23, CONFIG.cadeiraCaixa.z); this.caixeiro.rotation.y = CONFIG.anguloCaixa; this.cena.add(this.caixeiro);
    this.caixeiro.userData.cesta.visible = false;
    posicionarBraco(this.caixeiro.userData.bracoE, new THREE.Vector3(-0.34, 0.45, 0));
    posicionarBraco(this.caixeiro.userData.bracoD, new THREE.Vector3(0.34, 0.45, 0));
    this.ajudante = personagem(0xf2b349, 0xdba271, false, [0x858b91, 0xaeb4ba], null, 'ajudante'); this.cena.add(this.ajudante);
    this.ultimoEstagioCamera = simulacao.estado.estagioLoja;
    this.redimensionar();
    const baseInicial = this.baseCamera();
    this.alvoCamera.set(baseInicial.x, 0, baseInicial.z);
    window.addEventListener('resize', () => this.redimensionar());
  }
  construirMundo() {
    const suporte = new THREE.Group(); suporte.position.set(CONFIG.balcao.x, 0, CONFIG.balcao.z); suporte.rotation.y = Math.PI / 2; this.cena.add(suporte);
    const c = new THREE.Group(); c.position.set(-5.5, 0, -4.1); suporte.add(c);
    this.bairro = construirBairro(this.cena, { caixa, cilindro, esfera });
    this.bairro.atualizarEstagio(this.sim.estado.estagioLoja);
    this.bairro.atualizarProfundidade(this.sim.compacta);
    this.bairro.atualizarExpansao(this.sim.estado.melhorias.expansao);
    this.estacionamento = construirEstacionamento(); this.cena.add(this.estacionamento.grupo);
    this.estacionamento.atualizar(!!this.sim.estado.melhorias.estacionamento, 0, [], 0, !!this.sim.estado.melhorias.expansao, this.sim.carrinhosNoSuporte, !!this.sim.estado.melhorias.carrinhos);
    this.bairro.atualizarEstacionamento(!!this.sim.estado.melhorias.estacionamento);
    this.bairro.atualizarOficinas(this.sim.estado.produtos);
    this.prateleirasImportados = construirPrateleirasImportados(caixa);
    this.cena.add(this.prateleirasImportados.grupo);
    this.prateleirasImportados.atualizar(this.sim.estado.melhorias);
    this.bairro.aplicar(this.sim.estado.personalizacao);
    const suporteCestas = new THREE.Group();
    suporteCestas.position.set(CONFIG.cestas.x, 0, CONFIG.cestas.z); this.cena.add(suporteCestas);
    caixa(suporteCestas, 0.78, 0.08, 1.12, 0x545c5b, 0, 0.27, 0);
    for (const z of [-0.48, 0.48]) {
      caixa(suporteCestas, 0.08, 0.52, 0.08, 0x545c5b, -0.33, 0.28, z);
      caixa(suporteCestas, 0.08, 0.52, 0.08, 0x545c5b, 0.33, 0.28, z);
    }
    this.cestasEntrada = Array.from({ length: CONFIG.quantidadeCestas + CONFIG.cestasPorMelhoria }, (_, i) => {
      const cesta = criarCesta(0x1d654b, 0x3d8a65, 0x254233);
      cesta.position.set(0, 0.31 + i * 0.055, (i - 2) * 0.075);
      cesta.scale.setScalar(0.78); suporteCestas.add(cesta); return cesta;
    });
    // Caixa e esteira, com produtos e recibo visíveis de perto.
    caixa(c, 1.35, 0.95, 2.7, 0x747b80, 5.5, 0.65, 4.1);
    caixa(c, 1.53, 0.17, 2.9, 0xc9cdcf, 5.5, 1.2, 4.1);
    caixa(c, 1.0, 0.025, 1.5, 0x454b4f, 5.5, 1.31, 4.5);
    // Computador do caixa: base, coluna, monitor e tela.
    caixa(c, 0.62, 0.13, 0.48, 0x4b5155, 5.12, 1.38, 4.1);
    caixa(c, 0.1, 0.18, 0.1, 0x5b6267, 5.12, 1.52, 4.1);
    const monitor = caixa(c, 0.68, 0.58, 0.12, 0x555c61, 5.12, 1.72, 4.1); monitor.rotation.x = -0.25; monitor.rotation.y = -Math.PI / 2;
    const tela = caixa(c, 0.56, 0.44, 0.02, 0x94aeb5, 5.05, 1.73, 4.1); tela.rotation.y = -Math.PI / 2;
    // Teclado compacto na frente do monitor.
    const teclado = caixa(c, 0.52, 0.035, 0.2, 0x555c61, 4.83, 1.315, 4.1); teclado.rotation.y = Math.PI / 2;
    for (let linha = 0; linha < 2; linha++) for (let tecla = 0; tecla < 6; tecla++) {
      const teclaMesh = caixa(c, 0.045, 0.012, 0.035, 0xaeb4b7, 4.78 + linha * 0.07, 1.339, 3.89 + tecla * 0.084); teclaMesh.rotation.y = Math.PI / 2;
    }
    // Leitor de código de barras com janela vermelha.
    caixa(c, 0.3, 0.065, 0.24, 0x555c61, 5.05, 1.34, 4.0);
    caixa(c, 0.2, 0.012, 0.11, 0xe86b55, 5.05, 1.379, 4.0);
    // Maquininha de cartão com tela e teclas.
    caixa(c, 0.27, 0.09, 0.3, 0x344b58, 5.96, 1.36, 3.75);
    caixa(c, 0.19, 0.018, 0.1, 0x9eacb0, 5.96, 1.414, 3.68);
    for (let linha = 0; linha < 2; linha++) for (let tecla = 0; tecla < 3; tecla++) {
      caixa(c, 0.035, 0.012, 0.03, 0xe8d9b6, 5.91 + tecla * 0.05, 1.414, 3.75 + linha * 0.045);
    }
    // Impressora de recibos e papel saindo pela abertura.
    caixa(c, 0.38, 0.19, 0.32, 0x52616b, 5.85, 1.38, 3.03);
    caixa(c, 0.24, 0.012, 0.035, 0x263b37, 5.85, 1.482, 3.03);
    caixa(c, 0.16, 0.012, 0.2, 0xffffff, 5.85, 1.49, 2.91);
    // Gaveta de dinheiro na face voltada para o caixa.
    caixa(c, 0.45, 0.16, 0.62, 0x555c61, 4.94, 1.04, 4.95);
    caixa(c, 0.025, 0.1, 0.56, 0x52616b, 4.70, 1.07, 4.95);
    caixa(c, 0.03, 0.025, 0.13, 0xaeb4b7, 4.68, 1.08, 4.95);
    // Papel extra e pequeno suporte para sacolas.
    caixa(c, 0.17, 0.018, 0.36, 0xffffff, 5.12, 1.3, 3.48);
    caixa(c, 0.09, 0.018, 0.14, 0xd9d2b9, 5.5, 1.3, 3.98);
    const cadeira = new THREE.Group();
    cadeira.position.set(CONFIG.cadeiraCaixa.x, 0.23, CONFIG.cadeiraCaixa.z);
    cadeira.rotation.y = CONFIG.anguloCaixa; this.cena.add(cadeira);
    // Base giratória de cinco raios, com rodízios e coluna central.
    for (let i = 0; i < 5; i++) {
      const raio = new THREE.Group(); raio.rotation.y = i * Math.PI * 2 / 5; cadeira.add(raio);
      caixa(raio, 0.11, 0.07, 0.47, 0x52616b, 0, 0.12, 0.2);
      const roda = cilindro(raio, 0.08, 0.08, 0.075, 0x353e45, 0, 0.08, 0.41);
      roda.rotation.z = Math.PI / 2;
      const eixo = cilindro(raio, 0.047, 0.047, 0.08, 0x74818b, 0, 0.08, 0.41);
      eixo.rotation.z = Math.PI / 2;
    }
    cilindro(cadeira, 0.09, 0.1, 0.26, 0x3c464e, 0, 0.24, 0);
    cilindro(cadeira, 0.065, 0.065, 0.18, 0x74818b, 0, 0.4, 0);
    const assento = objeto(new THREE.ExtrudeGeometry(
      contornoArredondado(new THREE.Shape(), 0.72, 0.68, 0.14),
      { depth: 0.1, bevelEnabled: false, curveSegments: 5 }
    ), 0x63717e, 0, 0.48, 0);
    assento.rotation.x = -Math.PI / 2; cadeira.add(assento);
    caixa(cadeira, 0.1, 0.36, 0.08, 0x3c464e, 0, 0.6, -0.28);
    const encosto = objeto(new THREE.ExtrudeGeometry(
      contornoArredondado(new THREE.Shape(), 0.64, 0.98, 0.28),
      { depth: 0.1, bevelEnabled: false, curveSegments: 6 }
    ), 0x3c464e, 0, 1.04, -0.36);
    cadeira.add(encosto);
    // Apoios tubulares lavanda, com curvas suaves como na referência.
    for (const x of [-0.36, 0.36]) {
      const curva = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 0.55, -0.23), new THREE.Vector3(x, 0.82, -0.23),
        new THREE.Vector3(x, 0.84, -0.15), new THREE.Vector3(x, 0.84, 0.16),
        new THREE.Vector3(x, 0.78, 0.25), new THREE.Vector3(x, 0.55, 0.25)
      ]);
      cadeira.add(objeto(new THREE.TubeGeometry(curva, 16, 0.026, 6, false), 0xb2acf0));
    }
  }
  construirEstacao(id, p) {
    if (p.origem === 'sucos') return Cena.prototype.construirSucos.call(this, id, p);
    if (['morango', 'mel', 'queijo', 'geleia'].includes(id) || ['pomar', 'importado', 'confeitaria'].includes(p.origem)) return Cena.prototype.construirArtesanal.call(this, id, p);
    const grupo = new THREE.Group(); this.cena.add(grupo);
    grupo.visible = estacaoDesbloqueada(id, this.sim.estado);
    const h = p.horta;
    const galinhas = [];
    if (id === 'ovos') {
      caixa(grupo, 2.1, 0.65, 2.2, 0xb37a4c, h.x, 0.55, h.z);
      caixa(grupo, 2.1, 0.12, 2.2, 0xe4bb75, h.x, 0.93, h.z);
      // Abrigo aberto, ninhos e galinhas na área da fazenda.
      for (const dx of [-0.95, 0.95]) {
        caixa(grupo, 0.12, 1.65, 0.12, 0x8d603e, h.x + dx, 1.05, h.z - 0.95);
      }
      caixa(grupo, 2.1, 1.3, 0.12, 0xbc8752, h.x, 1.25, h.z - 1);
      const telhado = caixa(grupo, 2.5, 0.16, 1.25, 0x286750, h.x, 1.95, h.z - 0.6);
      telhado.rotation.x = -0.15;
      galinhas.push(criarGalinha(grupo, h.x - 0.57, 2.03, h.z - 0.62, 0xfff6df, 0xe6ddbe, 0));
      galinhas.push(criarGalinha(grupo, h.x + 0.57, 2.03, h.z - 0.62, 0xf5d5aa, 0xd9ad78, 2.4));
    } else if (id === 'leite') {
      const { w, d } = p.curral;
      for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, 0, d / 2]) {
        caixa(grupo, 0.09, 0.9, 0.09, 0x9b6a43, h.x + x, 0.6, h.z + z);
      }
      for (const z of [-d / 2, d / 2]) for (const y of [0.55, 0.9]) caixa(grupo, w, 0.08, 0.07, 0xc18b54, h.x, y, h.z + z);
      for (const x of [-w / 2, w / 2]) for (const y of [0.55, 0.9]) caixa(grupo, 0.07, 0.08, d, 0xc18b54, h.x + x, y, h.z);
      this.vaca = criarVaca(grupo, h.x - 0.35, h.z - 0.45);
      this.vaca.scale.setScalar(0.9);
      const banco = { x: h.x - 0.45, z: h.z + 0.8 };
      this.posicaoCuidadorVaca = banco;
      for (const x of [-0.23, 0.23]) for (const z of [-0.23, 0.23]) caixa(grupo, 0.07, 0.48, 0.07, 0x8f6040, banco.x + x, 0.39, banco.z + z);
      caixa(grupo, 0.64, 0.09, 0.64, 0xc79765, banco.x, 0.66, banco.z);
      const cuidador = personagem(0x4c8e69, 0xb77d5d, false, [], null, 'ajudante');
      cuidador.position.set(banco.x, 0.23, banco.z); cuidador.rotation.y = Math.PI;
      cuidador.userData.cesta.visible = false; grupo.add(cuidador);
      this.cuidadorVaca = cuidador;
      cilindro(grupo, 0.17, 0.14, 0.3, 0xa1aaa7, h.x - 0.55, 0.23, h.z - 0.25);
      cilindro(grupo, 0.15, 0.15, 0.015, 0xf4f3e9, h.x - 0.55, 0.385, h.z - 0.25);
      caixa(grupo, 1.35, 0.28, 0.7, 0xb98250, h.x + 0.9, 0.27, h.z + 0.85);
    } else {
      const { w, d } = geometriaEstacao(id, 'coleta', produtosDaLoja(this.sim?.estado));
      caixa(grupo, w, 0.35, d, 0xbd7545, h.x, 0.22, h.z);
      caixa(grupo, w - 0.27, 0.05, d - 0.28, 0x70401f, h.x, 0.42, h.z);
      const alvoHorta = caixa(grupo, w, 1.5, d, 0xffffff, h.x, 0.9, h.z);
      alvoHorta.material.transparent = true; alvoHorta.material.opacity = 0; alvoHorta.material.depthWrite = false;
      alvoHorta.userData.produtoHorta = id; this.alvosHorta.push(alvoHorta);
    }
    const frutos = [];
    for (let i = 0; i < 8; i++) {
      const x = p.canteiro ? h.x - (p.canteiro.w - 1.4) / 2 + i % 4 * (p.canteiro.w - 1.4) / 3
        : id === 'ovos' ? h.x - 0.58 + i % 2 * 1.16 : id === 'leite' ? h.x + 0.5 + i % 4 * 0.3 : h.x - 0.65 + i % 2 * 1.25;
      const z = p.canteiro ? h.z - (p.canteiro.d - 1.4) / 2 + Math.floor(i / 4) * (p.canteiro.d - 1.4)
        : id === 'ovos' ? h.z - 0.72 + Math.floor(i / 2) * 0.47 : id === 'leite' ? h.z + 0.7 + Math.floor(i / 4) * 0.25 : h.z - 1.18 + Math.floor(i / 2) * 0.78;
      if (id === 'ovos') cilindro(grupo, 0.27, 0.3, 0.09, 0xc29153, x, 1.02, z);
      else if (id !== 'leite' && id !== 'trigo') {
        cilindro(grupo, 0.035, 0.035, 0.6, 0x35a84a, x, 0.72, z, 6);
        const f1 = esfera(grupo, 0.22, 0x65c158, x - 0.12, 0.67, z, 1.5, 0.35, 0.8); f1.rotation.z = -0.25;
        const f2 = esfera(grupo, 0.22, 0x3cad4b, x + 0.12, 0.83, z, 1.5, 0.35, 0.8); f2.rotation.z = 0.3;
      }
      const fruto = criarProduto(id, 1.6); fruto.position.set(x, id === 'leite' ? 0.69 : id === 'trigo' ? 0.82 : 1, z); grupo.add(fruto); frutos.push(fruto);
    }
    const s = p.prateleira;
    const refrigerador = id === 'leite' ? criarRefrigerador(grupo, s) : null;
    const estante = id === 'ovos' ? criarEstanteOvos(grupo, s) : null;
    const banca = !refrigerador && !estante ? criarBanca(grupo, s) : null;
    if (s.movel === 'hortifruti') grupo.add(criarPlacaProduto(id, s));
    const frutas = [];
    for (let i = 0; i < 12; i++) {
      const f = criarProduto(id, id === 'leite' ? 0.8 : 1.25);
      if (id === 'leite') {
        f.children[0].material = leiteVitrine;
        f.children[1].material = leiteVitrine;
        f.children[2].material = leiteVitrine;
        f.children[3].material = verdeLeiteVitrine;
        f.children[4].material = verdeLeiteVitrine;
      }
      f.position.copy(posicaoProdutoPrateleira(id, s, i)); grupo.add(f); frutas.push(f);
    }
    const irrigador = p.origem === 'horta' ? criarIrrigador(grupo, h, p.canteiro) : null;
    this.produtos[id] = { grupo, frutos, frutas, galinhas, refrigerador, estante, irrigador, banca };
    this.criarLabel(`horta-${id}`, { ...p.horta, y: 1.6 }, id === 'ovos' ? 'GALINHEIRO' : id === 'leite' ? 'CURRAL' : p.plural.toLocaleUpperCase('pt-BR'), 'Pronto para colher', id);
    this.criarLabel(`loja-${id}`, { ...p.prateleira, y: id === 'ovos' ? 3.1 : id === 'leite' ? 3.2 : 1.7 }, p.nome.toLocaleUpperCase('pt-BR'), '0 / 12', 'loja');
  }
  construirImportado(id, p) {
    const lado = CLASSES_PRODUTOS[p.classe].lado;
    const grupo = new THREE.Group(); grupo.name = `produto-importado-${id}`; this.cena.add(grupo);
    if (id === 'soda') criarGeladeiraSoda(grupo);
    if (id === 'laticinio') criarRefrigeradorParede(grupo, p.prateleira, 'laticinios', GELADEIRA_LATICINIOS.alturas);
    const frutas = [];
    // As 36 unidades ocupam quatro níveis de nove, começando pelo nível inferior.
    // Cada nível representa uma das quatro variedades da classe.
    for (let i = 0; i < p.capacidadePrateleira; i++) {
      const produto = criarImportadoNaPrateleira(id, p, i);
      grupo.add(produto); frutas.push(produto);
    }
    this.produtos[id] = { grupo, frutos: [], frutas, galinhas: [], abelhas: [], irrigador: null, refrigerador: null, banca: null };
    if (p.classe === 'laticinios') {
      if (id === 'laticinio') {
        this.criarLabel(`loja-${id}`, { ...p.prateleira, y: 3.2 }, 'LATICÍNIOS', '0 / 36 · R$ 23 cada', 'loja');
        this.criarLabel(`horta-${id}`, { ...p.horta, y: 2.4 }, 'LATICÍNIOS IMPORTADOS', '0 / 4 caixas', id);
      }
      return;
    }
    this.criarLabel(`loja-${id}`, { ...p.prateleira, x: p.prateleira.x + lado * 0.7, y: 2.8 }, p.plural.toLocaleUpperCase('pt-BR'), `0 / ${p.capacidadePrateleira}`, 'loja');
    this.criarLabel(`horta-${id}`, { ...p.horta, y: 2.9 }, CLASSES_PRODUTOS[p.classe].nome.toLocaleUpperCase('pt-BR'), `0 / ${PACOTES_POR_CLASSE} pacotes`, id);
  }
  construirSucos(id, p) {
    const grupo = new THREE.Group(); grupo.name = `estacao-${id}`; this.cena.add(grupo);
    grupo.visible = !!this.sim.estado.melhorias.sucos;
    if (id === 'sucoLaranja') {
      const b = SUCOS.bancada;
      const bancada = new THREE.Group(); bancada.name = 'balcao-sucos'; grupo.add(bancada);
      caixa(bancada, 2.5, 0.8, 1.6, 0x73a9a5, b.x, 0.64, b.z);
      caixa(bancada, b.w, 0.12, b.d, 0xe5e4d8, b.x, 1.09, b.z);
      const bandeja = new THREE.Group(); bandeja.name = 'bandeja-garrafas-sucos'; grupo.add(bandeja);
      caixa(bandeja, 0.8, 0.08, 1.1, 0xc29463, b.x + 0.75, 1.18, b.z);
      criarGeladeiraSucos(grupo);
      grupo.userData.maquinaSucos = criarMaquinaSucos(grupo);
      this.criarLabel(`horta-${id}`, { ...b, y: 3.3 }, 'MÁQUINA DE SUCOS', 'Entregue frutas e recolha garrafas', id);
    }
    const sabor = Object.keys(SUCOS.sabores).indexOf(id), frutas = [], frutos = [];
    for (let i = 0; i < p.capacidadeHorta; i++) {
      const garrafa = criarProduto(id, 0.55);
      garrafa.position.set(SUCOS.bancada.x + 0.75 + (sabor - 1.5) * 0.18, 1.29, SUCOS.bancada.z + (i - 2.5) * 0.17);
      garrafa.userData.baseY = garrafa.position.y;
      grupo.add(garrafa); frutos.push(garrafa);
    }
    for (let i = 0; i < p.capacidadePrateleira; i++) {
      const garrafa = criarProduto(id, GELADEIRA_SUCOS.escalaGarrafa);
      garrafa.position.copy(posicaoProdutoPrateleira(id, p.prateleira, i));
      grupo.add(garrafa); frutas.push(garrafa);
    }
    this.produtos[id] = { grupo, frutos, frutas, galinhas: [], abelhas: [] };
    if (id === 'sucoLaranja') this.criarLabel(`loja-${id}`, { ...p.prateleira, y: 3.35 }, 'SUCOS NATURAIS', '0 / 24', 'loja');
  }
  construirArtesanal(id, p) {
    const grupo = new THREE.Group(); grupo.name = `estacao-${id}`; this.cena.add(grupo);
    grupo.visible = estacaoDesbloqueada(id, this.sim.estado);
    const h = p.horta, s = p.prateleira;
    const frutos = [], frutas = [], abelhas = [];
    if (id === 'morango') {
      caixa(grupo, p.canteiro.w, 0.35, p.canteiro.d, 0x936238, h.x, 0.25, h.z);
      caixa(grupo, p.canteiro.w - 0.2, 0.08, p.canteiro.d - 0.2, 0x5c4230, h.x, 0.46, h.z);
      for (const z of [-p.canteiro.d / 2 + 0.05, 0, p.canteiro.d / 2 - 0.05]) {
        for (const x of [-p.canteiro.w / 2 + 0.05, p.canteiro.w / 2 - 0.05]) caixa(grupo, 0.06, 2.2, 0.06, 0xb6d2c5, h.x + x, 1.35, h.z + z);
        caixa(grupo, p.canteiro.w, 0.07, 0.07, 0xb6d2c5, h.x, 2.46, h.z + z);
      }
      const teto = caixa(grupo, p.canteiro.w, 0.07, p.canteiro.d, 0xd7f4e9, h.x, 2.5, h.z);
      teto.material = new THREE.MeshStandardMaterial({ color: 0xd7f4e9, transparent: true, opacity: 0.18, depthWrite: false });
      // O vidro deixa a luz passar; apenas a estrutura e as plantas projetam sombra.
      teto.castShadow = false;
      teto.receiveShadow = false;
      for (let i = 0; i < 8; i++) {
        const x = h.x - 1.1 + i % 4 * 2.2 / 3, z = h.z - 0.55 + Math.floor(i / 4) * 1.1;
        esfera(grupo, 0.3, 0x429852, x, 0.67, z, 1.2, 0.6, 1);
      }
    } else if (p.origem === 'pomar') {
      criarArvore(grupo, { x: h.x, z: h.z, nome: id === 'maca' ? 'macieira' : 'laranjeira' }, { cilindro, esfera });
    } else if (id === 'mel') {
      abelhas.push(...construirColmeia(grupo, h, { caixa, esfera, cilindro }));
    } else {
      caixa(grupo, 2.5, 0.8, 1.6, id === 'queijo' ? 0x73a9a5 : 0xb56d85, h.x, 0.64, h.z);
      caixa(grupo, 2.65, 0.12, 1.75, 0xe5e4d8, h.x, 1.09, h.z);
      cilindro(grupo, 0.52, 0.43, 0.55, 0xadb7b9, h.x - 0.5, 1.43, h.z);
      cilindro(grupo, 0.46, 0.46, 0.03, id === 'queijo' ? 0xfff0c1 : 0xb94470, h.x - 0.5, 1.72, h.z);
      caixa(grupo, 0.8, 0.08, 1.1, 0xc29463, h.x + 0.75, 1.18, h.z);
      const mexedor = caixa(grupo, 0.8, 0.07, 0.08, 0x885f3b, h.x - 0.5, 1.79, h.z);
      grupo.userData.mexedor = mexedor;
    }
    for (let i = 0; i < p.capacidadeHorta; i++) {
      const fruto = criarProduto(id, id === 'morango' ? 1.5 : 0.85);
      const oficina = !!OFICINAS[id];
      if (id === 'mel') {
        fruto.position.set(h.x - 0.69 + i % 4 * 0.46, ALTURA_BANDEJA_MEL + 0.15 * 0.85, h.z + 1.02 + Math.floor(i / 4) * 0.46);
      } else if (p.origem === 'pomar') {
        const [x, y, z] = [
          [1.05, 2.55, 0.65], [0.45, 3.05, 1.02], [-0.35, 2.62, 1.08], [-0.95, 3.08, 0.55],
          [1.12, 3.18, -0.2], [0.72, 3.68, 0.18], [-0.1, 3.72, 0.72], [-0.72, 3.48, 0.92]
        ][i];
        fruto.scale.setScalar(1.9);
        fruto.position.set(h.x + x, y, h.z + z);
      } else fruto.position.set(h.x + (oficina ? 0.5 + i % 3 * 0.22 : -1.1 + i % 4 * 2.2 / 3), oficina ? 1.35 : 0.95,
        h.z + (oficina ? -0.36 + Math.floor(i / 3) * 0.3 : -0.55 + Math.floor(i / 4) * 1.1));
      fruto.userData.baseY = fruto.position.y;
      grupo.add(fruto); frutos.push(fruto);
    }
    const refrigerador = id === 'queijo' ? criarRefrigerador(grupo, s, id) : null;
    const banca = !refrigerador ? criarBanca(grupo, s, 0x936238) : null;
    if (s.movel === 'hortifruti') grupo.add(criarPlacaProduto(id, s));
    for (let i = 0; i < p.capacidadePrateleira; i++) {
      const fruto = criarProduto(id, 1.1); fruto.position.copy(posicaoProdutoPrateleira(id, s, i)); grupo.add(fruto); frutas.push(fruto);
    }
    const irrigador = p.origem === 'horta' ? criarIrrigador(grupo, h, p.canteiro) : null;
    this.produtos[id] = { grupo, frutos, frutas, galinhas: [], abelhas, irrigador, refrigerador, banca };
    this.criarLabel(`horta-${id}`, { ...h, y: p.origem === 'pomar' ? 4.4 : id === 'morango' ? 2.6 : id === 'mel' ? 3 : 2 }, OFICINAS[id]?.nome.toLocaleUpperCase('pt-BR') || (id === 'maca' ? 'MACIEIRA' : id === 'laranja' ? 'LARANJEIRA' : id === 'mel' ? 'APIÁRIO' : 'ESTUFA DE MORANGOS'), 'Pronto para colher', id);
    this.criarLabel(`loja-${id}`, { ...s, y: id === 'queijo' ? 3.2 : 1.7 }, p.nome.toLocaleUpperCase('pt-BR'), '0 / 12', 'loja');
  }
  construirPadaria() {
    const PRODUTOS = produtosDaLoja(this.sim?.estado);
    const p = MODELO_PADARIA.prateleira;
    const grupo = new THREE.Group(); grupo.name = 'padaria'; this.cena.add(grupo);
    const vitrinesConfeitaria = construirBalcoesDecorados(grupo, MODELO_PADARIA.fechamento, { caixa, esfera });
    Object.assign(this.produtos, vitrinesConfeitaria.userData.produtos);
    // Pães ficam nas três prateleiras internas da vitrine curva.
    const baseMadeira = caixa(grupo, 3.3, 0.52, 0.8, 0x936238, p.x, 0.49, p.z);
    baseMadeira.name = 'base-madeira-padaria';
    caixa(grupo, 3.36, 0.07, 0.86, 0x684429, p.x, 0.25, p.z);
    for (const x of [p.x - 1.1, p.x, p.x + 1.1]) caixa(grupo, 0.035, 0.42, 0.018, 0xb07d4e, x, 0.49, p.z + 0.4);
    const vitrine = criarVitrineCurva(grupo, { w: p.w, d: p.d, base: 0.76, altura: 1.4, niveis: [0.8, 1.2, 1.6] }, { caixa });
    vitrine.name = 'vitrine-paes'; vitrine.position.set(p.x, 0, p.z);
    vitrine.getObjectByName('tampo-vitrine').name = 'tampo-paes';
    // Entrega visível de trigo, separada da compra de pães.
    const entregaTrigo = criarBandejaRecebimento(grupo, { caixa });
    entregaTrigo.name = 'entrega-trigo-padaria'; entregaTrigo.position.set(MODELO_PADARIA.entrada.x, 1.25, MODELO_PADARIA.entrada.z);
    const placaTrigo = criarProduto('trigo', 0.45);
    placaTrigo.position.set(0, 0.15, -0.62); entregaTrigo.add(placaTrigo);
    const trigosRecebidos = Array.from({ length: ALA_PADARIA.capacidadeTrigo }, (_, i) => {
      const espiga = criarProduto('trigo', 0.5);
      espiga.position.set(-0.36 + i % 4 * 0.24, 0.18, -0.22 + Math.floor(i / 4) * 0.22);
      entregaTrigo.add(espiga); return espiga;
    });
    // Processador compacto sobre a carcaça do forno industrial.
    const moinho = new THREE.Group(); moinho.name = 'triturador-padaria'; moinho.position.set(0, 1.48, -0.08);
    const corpoTriturador = caixa(moinho, 0.78, 0.66, 0.72, 0xadb7b9, 0, 0.58, 0);
    corpoTriturador.name = 'corpo-triturador';
    caixa(moinho, 0.84, 0.09, 0.78, 0x747f82, 0, 0.93, 0);
    cilindro(moinho, 0.25, 0.25, 0.23, 0xcbd2d2, 0, 1.09, 0);
    const funil = objeto(new THREE.CylinderGeometry(0.33, 0.14, 0.34, 4), 0xb9c3c4, 0, 1.36, 0); funil.rotation.y = Math.PI / 4; moinho.add(funil);
    caixa(moinho, 0.71, 0.065, 0.67, 0x79878a, 0, 1.55, 0);
    // As palhetas de aco ficam acima da tampa, onde a rotacao pode ser vista.
    const rotor = new THREE.Group(); rotor.name = 'rotor-metal-padaria'; rotor.position.y = 1.64; moinho.add(rotor);
    cilindro(rotor, 0.1, 0.1, 0.1, 0x626d70, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const palheta = caixa(rotor, 0.31, 0.055, 0.095, 0xd6dddd, 0.2, 0.015, 0);
      palheta.rotation.y = i * Math.PI * 2 / 3;
      palheta.position.set(Math.cos(palheta.rotation.y) * 0.2, 0.015, -Math.sin(palheta.rotation.y) * 0.2);
      palheta.material = palheta.material.clone(); palheta.material.metalness = 0.8; palheta.material.roughness = 0.23;
    }
    cilindro(rotor, 0.065, 0.065, 0.125, 0xf1f3ef, 0, 0.045, 0);
    const bicaFarinha = caixa(moinho, 0.28, 0.16, 0.4, 0x97a4a6, 0, 0.65, 0.35);
    bicaFarinha.name = 'bica-farinha-padaria'; bicaFarinha.rotation.x = -0.18;
    const bandejaFarinha = new THREE.Group(); bandejaFarinha.name = 'bandeja-farinha-padaria';
    bandejaFarinha.position.set(0, 0.43, 0.5); moinho.add(bandejaFarinha);
    caixa(bandejaFarinha, 0.66, 0.055, 0.52, 0xaeb8ba, 0, 0, 0);
    caixa(bandejaFarinha, 0.66, 0.14, 0.055, 0x879396, 0, 0.065, -0.235);
    for (const x of [-0.3, 0.3]) {
      const lateral = caixa(bandejaFarinha, 0.055, 0.13, 0.48, 0x98a4a6, x, 0.06, 0);
      lateral.rotation.z = -x * 0.12;
    }
    const farinha = esfera(bandejaFarinha, 0.23, 0xf7f4e9, 0, 0.075, 0.015, 1.2, 0.3, 0.88);
    farinha.name = 'farinha-na-bandeja';
    bandejaFarinha.traverse(parte => {
      if (!parte.isMesh || parte === farinha) return;
      parte.material = parte.material.clone(); parte.material.metalness = 0.68; parte.material.roughness = 0.28;
    });
    for (const parte of moinho.children) if (parte.isMesh && parte !== farinha) {
      parte.material = parte.material.clone(); parte.material.metalness = 0.58; parte.material.roughness = 0.35;
    }
    moinho.scale.set(0.85, 0.5, 0.8);
    const forno = new THREE.Group(); forno.name = 'forno-padaria'; forno.position.set(MODELO_PADARIA.forno.x, 0, MODELO_PADARIA.forno.z); grupo.add(forno);
    forno.add(moinho);
    const aco = 0xadb7b9, borda = 0xd4dbdc, escuro = 0x596568;
    for (const x of [-0.43, 0.43]) for (const z of [-0.4, 0.4]) {
      caixa(forno, 0.16, 0.19, 0.17, escuro, x, 0.3, z);
    }
    caixa(forno, 1.2, 0.16, 1.16, escuro, 0, 0.43, 0);
    caixa(forno, 1.14, 0.1, 1.12, borda, 0, 0.54, 0);
    // Casca aberta: a câmara tem profundidade, trilhos e bandeja visíveis.
    for (const x of [-0.52, 0.52]) {
      const painel = caixa(forno, 0.12, 0.85, 1.1, aco, x, 0.99, 0);
      painel.name = 'carenagem-forno';
      painel.material = painel.material.clone(); painel.material.metalness = 0.58; painel.material.roughness = 0.35;
    }
    caixa(forno, 1.04, 0.85, 0.1, aco, 0, 0.99, -0.5);
    caixa(forno, 1.24, 0.13, 1.22, borda, 0, 1.48, 0);
    caixa(forno, 1.09, 0.035, 1.08, 0xe4e9e7, 0, 1.56, 0);
    for (const x of [-0.47, 0.47]) for (const z of [-0.45, 0.45]) {
      cilindro(forno, 0.028, 0.028, 0.018, escuro, x, 1.59, z);
    }
    caixa(forno, 0.91, 0.72, 0.06, 0x333c3e, 0, 0.99, -0.4);
    const brilhoForno = caixa(forno, 0.82, 0.62, 0.025, 0xffa04a, 0, 0.99, -0.36);
    brilhoForno.material = new THREE.MeshBasicMaterial({ color: 0xffa04a });
    for (const x of [-0.42, 0.42]) {
      caixa(forno, 0.035, 0.68, 0.05, 0xe4ad69, x, 0.99, 0.54);
      for (const y of [0.73, 1.04]) caixa(forno, 0.045, 0.035, 0.83, borda, x, y, 0.04);
    }
    caixa(forno, 0.85, 0.035, 0.82, 0x6d7483, 0, 0.76, 0.04).name = 'bandeja-forno';
    const paesNoForno = new THREE.Group(); paesNoForno.name = 'paes-no-forno'; forno.add(paesNoForno);
    for (const x of [-0.23, 0, 0.23]) {
      const pao = criarProduto('pao', 0.5); pao.position.set(x, 0.8, 0.1); paesNoForno.add(pao);
    }
    paesNoForno.visible = false;
    const portaForno = new THREE.Group(); portaForno.name = 'porta-forno-industrial';
    portaForno.position.set(-0.415, 0.99, 0.56); forno.add(portaForno);
    for (const x of [0, 0.83]) caixa(portaForno, 0.075, 0.77, 0.075, aco, x, 0, 0);
    for (const y of [-0.35, 0.35]) caixa(portaForno, 0.87, 0.075, 0.075, aco, 0.415, y, 0);
    const vidroForno = caixa(portaForno, 0.7, 0.57, 0.02, 0x759492, 0.415, 0, 0);
    vidroForno.name = 'vidro-forno';
    vidroForno.material = new THREE.MeshBasicMaterial({ color: 0x759492, transparent: true, opacity: 0.18, depthWrite: false });
    caixa(portaForno, 0.58, 0.055, 0.075, escuro, 0.415, -0.24, 0.06);
    for (const x of [-0.48, 0.48]) caixa(forno, 0.045, 0.94, 0.09, borda, x, 1.06, 0.57);
    for (const y of [-0.18, 0.18]) caixa(forno, 0.065, 0.13, 0.09, borda, -0.53, 0.99 + y, 0.57);
    caixa(forno, 0.025, 0.27, 0.34, escuro, 0.59, 1.12, 0.04);
    caixa(forno, 0.03, 0.1, 0.18, 0x72a895, 0.608, 1.17, 0.04);
    for (const z of [-0.3, -0.18, -0.06, 0.06]) caixa(forno, 0.025, 0.035, 0.07, escuro, 0.591, 0.7, z);
    cilindro(forno, 0.065, 0.08, 0.3, aco, -0.5, 1.73, -0.3);
    const fumaca = Array.from({ length: 3 }, (_, i) => {
      const nuvem = esfera(forno, 0.17, 0xf2f2e9, -0.48, 1.95 + i * 0.2, -0.3, 1, 0.72, 1);
      nuvem.material = new THREE.MeshBasicMaterial({ color: 0xf2f2e9, transparent: true, opacity: 0.22, depthWrite: false });
      return nuvem;
    });
    forno.scale.set(0.8, 0.9, 0.85);
    // Frentes voltadas para o espaço entre as máquinas, antes da rotação da ala.
    forno.rotation.y = Math.PI / 2;
    const criarPadeiro = (x, z, pele, produto) => {
      const trabalhador = personagem(0x286750, pele, false, [], null, 'padaria');
      trabalhador.position.set(x, 0.23, z);
      trabalhador.rotation.y = Math.PI;
      trabalhador.userData.cesta.visible = false;
      const corpo = trabalhador.userData.corpo;
      // Cabeça, cabelo, olhos e chapéu giram juntos, sem mover o corpo em repouso.
      const cabeca = new THREE.Group(); cabeca.name = 'cabeca-padeiro'; cabeca.position.y = 1.05;
      for (const parte of [...corpo.children]) if (parte.position.y >= 1.05) {
        parte.position.y -= cabeca.position.y; cabeca.add(parte);
      }
      corpo.add(cabeca); trabalhador.userData.cabecaPadaria = cabeca;
      const avental = new THREE.Group(); avental.name = 'avental-padaria'; corpo.add(avental);
      caixa(avental, 0.37, 0.38, 0.065, 0xfaf8f1, 0, 0.89, 0.32);
      caixa(avental, 0.51, 0.38, 0.075, 0xfaf8f1, 0, 0.52, 0.32);
      caixa(avental, 0.55, 0.055, 0.065, 0xffffff, 0, 0.7, 0.32);
      for (const lado of [-1, 1]) {
        const alca = caixa(avental, 0.065, 0.35, 0.055, 0xffffff, lado * 0.15, 1.13, 0.31);
        alca.rotation.z = lado * 0.2;
        const tiraCostas = caixa(avental, 0.06, 0.58, 0.055, 0xffffff, lado * 0.12, 0.96, -0.28);
        tiraCostas.rotation.z = lado * 0.32;
        caixa(avental, 0.28, 0.055, 0.06, 0xffffff, lado * 0.19, 0.69, -0.28);
      }
      const chapeu = new THREE.Group(); chapeu.name = 'chapeu-padaria'; chapeu.position.y = -1.05; cabeca.add(chapeu);
      cilindro(chapeu, 0.22, 0.26, 0.2, 0xffffff, 0, 1.48, -0.01);
      caixa(chapeu, 0.52, 0.045, 0.34, 0xffffff, 0, 1.4, 0.08);
      chapeu.traverse(parte => {
        if (parte.isMesh) parte.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      });
      const cargaPadaria = new THREE.Group(); cargaPadaria.name = `carga-${produto}-padaria`;
      cargaPadaria.position.set(0, 0.58, 0.43); cargaPadaria.visible = false; corpo.add(cargaPadaria);
      if (produto === 'pao') {
        const cargaTrigo = new THREE.Group(); cargaTrigo.name = 'feixe-trigo-padaria'; cargaPadaria.add(cargaTrigo);
        for (const x of [-0.1, 0.1]) {
          const feixe = criarProduto('trigo', 0.72); feixe.position.x = x; cargaTrigo.add(feixe);
        }
        trabalhador.userData.cargaTrigo = cargaTrigo;
      }
      if (produto !== 'trigo') {
        const cargaFarinha = new THREE.Group(); cargaFarinha.name = 'saco-farinha-padaria'; cargaPadaria.add(cargaFarinha);
        const saco = objeto(new THREE.CylinderGeometry(0.19, 0.25, 0.46, 8), 0xc99b62, 0, 0.08, 0);
        saco.scale.z = 0.72; cargaFarinha.add(saco);
        const borda = objeto(new THREE.TorusGeometry(0.19, 0.035, 6, 12), 0xdfbd91, 0, 0.31, 0);
        borda.rotation.x = Math.PI / 2; borda.scale.z = 0.72; cargaFarinha.add(borda);
        const farinhaSaco = objeto(new THREE.SphereGeometry(0.17, 10, 6), 0xf7f4e9, 0, 0.3, 0);
        farinhaSaco.scale.set(1, 0.35, 0.72); cargaFarinha.add(farinhaSaco);
        const cargaPao = new THREE.Group(); cargaPao.name = 'bandeja-paes-padaria'; cargaPadaria.add(cargaPao);
        caixa(cargaPao, 0.54, 0.045, 0.34, 0xb88b5a, 0, -0.1, 0);
        for (const x of [-0.18, 0, 0.18]) {
          const pao = criarProduto('pao', 0.64); pao.position.x = x; cargaPao.add(pao);
        }
        trabalhador.userData.cargaFarinha = cargaFarinha;
        trabalhador.userData.cargaPao = cargaPao;
      }
      trabalhador.userData.cargaPadaria = cargaPadaria;
      const alerta = new THREE.Group(); alerta.name = 'alerta-trigo-padaria'; alerta.visible = false;
      alerta.position.set(x, 2.3, z);
      alerta.add(new THREE.Mesh(new THREE.CircleGeometry(0.23, 16), new THREE.MeshBasicMaterial({ color: 0xc34f32, side: THREE.DoubleSide })));
      const traco = caixa(alerta, 0.055, 0.19, 0.025, 0xfff9e9, 0, 0.055, 0.02);
      const ponto = esfera(alerta, 0.033, 0xfff9e9, 0, -0.11, 0.025);
      traco.material = ponto.material = new THREE.MeshBasicMaterial({ color: 0xfff9e9 });
      grupo.add(alerta); trabalhador.userData.alertaTrigo = alerta;
      grupo.add(trabalhador);
      return trabalhador;
    };
    const coletaTrigo = { x: 5.65, z: -4.4 };
    const { roteiros, roteiroForno } = criarRoteirosPadaria();
    const padeiros = [criarPadeiro(coletaTrigo.x, coletaTrigo.z, 0xe1b18b, 'pao')];
    const confeiteiro = criarPadeiro(CONFEITARIA.maquina.x - 1.05, CONFEITARIA.maquina.z, 0x9b6848, 'confeitaria');
    confeiteiro.name = 'confeiteiro'; confeiteiro.visible = false;
    confeiteiro.userData.alertaTrigo.visible = false;
    confeiteiro.userData.alertaTrigo.name = 'alerta-confeitaria';
    const batedeira = construirBatedeira();
    batedeira.grupo.position.set(CONFEITARIA.maquina.x, 0, CONFEITARIA.maquina.z);
    batedeira.grupo.rotation.y = -Math.PI / 2;
    batedeira.grupo.visible = false; grupo.add(batedeira.grupo);
    const bandejaDoces = confeiteiro.userData.cargaPadaria;
    bandejaDoces.clear();
    caixa(bandejaDoces, 0.7, 0.04, 0.4, 0x9b8c7d, 0, -0.06, 0);
    const docesNaBandeja = [];
    Object.keys(CONFEITARIA.produtos).forEach((id, i) => {
      const doce = criarProduto(id, 0.6); doce.position.set((i - 1) * 0.22, -0.035, 0); bandejaDoces.add(doce);
      docesNaBandeja.push(doce);
    });
    const entregaConfeitaria = criarBandejaRecebimento(grupo, { caixa });
    entregaConfeitaria.name = 'entrega-confeitaria'; entregaConfeitaria.position.set(4.75, 1.25, -3.375);
    entregaConfeitaria.visible = false;
    const ingredientesConfeitaria = {};
    for (const [indice, id] of ['mel', 'ovos'].entries()) {
      ingredientesConfeitaria[id] = Array.from({ length: CONFEITARIA.capacidadeIngredientes }, (_, i) => {
        const ingrediente = criarProduto(id, 0.4);
        ingrediente.position.set(-0.3 + i % 4 * 0.2, 0.18, -0.48 + Math.floor(i / 4) * 0.28 + indice * 0.56);
        entregaConfeitaria.add(ingrediente); ingrediente.visible = false; return ingrediente;
      });
    }
    const frutas = Array.from({ length: PRODUTOS.pao.capacidadePrateleira }, (_, i) => {
      const pao = criarProduto('pao', 1.15); pao.position.set(p.x - 1.15 + i % 6 * 0.46, 0.98 + Math.floor(i / 6) * 0.4, p.z - 0.07); grupo.add(pao); return pao;
    });
    const transformacao = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
    const origemPadaria = pontoPadaria({ x: 0, z: 0 });
    transformacao.setPosition(origemPadaria.x, 0, origemPadaria.z);
    for (const objeto of grupo.children) objeto.applyMatrix4(transformacao);
    grupo.visible = !!this.sim.estado.melhorias.alaPadaria;
    const postosEspera = [pontoPadaria({ x: 6.4, z: -2.95 })];
    this.produtos.pao = { grupo, frutos: [], frutas, galinhas: [], padeiros, roteiros, roteiroForno, postosEspera, moinho, forno, rotor,
      vitrinesConfeitaria, confeiteiro, entregaConfeitaria, ingredientesConfeitaria, docesNaBandeja, batedeira,
      trigosRecebidos, farinha, brilhoForno, fumaca, portaForno, paesNoForno,
    };
    this.criarLabel('loja-pao', { ...PRODUTOS.pao.prateleira, y: 1.85 }, 'PADARIA', '0 / 18', 'loja');
    for (const id of Object.keys(CONFEITARIA.produtos)) {
      this.criarLabel(`loja-${id}`, { ...PRODUTOS[id].prateleira, y: 2.2 }, PRODUTOS[id].plural.toLocaleUpperCase('pt-BR'), `0 / ${PRODUTOS[id].capacidadePrateleira}`, 'loja');
    }
  }
  animarConfeiteiro(objetos, dt) {
    const estado = this.sim.estado;
    const ativo = !!estado.melhorias.confeitaria;
    objetos.vitrinesConfeitaria.visible = ativo;
    objetos.confeiteiro.visible = ativo;
    objetos.entregaConfeitaria.visible = ativo;
    for (const [id, ingredientes] of Object.entries(objetos.ingredientesConfeitaria)) ingredientes.forEach((objeto, i) => { objeto.visible = ativo && i < estado.confeitaria[id]; });
    objetos.batedeira.grupo.visible = ativo;
    objetos.confeiteiro.userData.alertaTrigo.visible = false;
    if (!ativo) return;
    const produzindo = podeProduzirConfeitaria(estado);
    const trabalhador = objetos.confeiteiro, d = trabalhador.userData;
    const situacao = situacaoConfeiteiro(estado);
    const vazio = Object.keys(CONFEITARIA.produtos).some(id => estado.produtos[id].prateleira === 0);
    const faltaIngrediente = Object.entries(CONFEITARIA.ingredientes).some(([id, quantidade]) => estado.confeitaria[id] < quantidade);
    d.alertaTrigo.visible = vazio && faltaIngrediente && estado.confeitaria.etapaEntrega < 0;
    d.alertaTrigo.position.set(trabalhador.position.x, 2.3, trabalhador.position.z);
    if (this.camera) d.alertaTrigo.quaternion.copy(this.camera.quaternion);
    if (dt <= 0 && d.atorConfeitaria) return;
    d.tempoConfeitaria = (d.tempoConfeitaria ?? 0) + dt;
    const ator = d.atorConfeitaria = { x: situacao.x, z: situacao.z, andando: situacao.acao === 'andar', angulo: situacao.angulo };
    const descansando = situacao.acao === 'esperar';
    const alvo = descansando ? PRODUTOS.donut.prateleira : situacao.produto ? PRODUTOS[situacao.produto].prateleira : maquinaConfeitaria();
    if (!ator.andando) ator.angulo = Math.atan2(alvo.x - ator.x, alvo.z - ator.z);
    this.animarPersonagem(trabalhador, ator, dt, d.tempoConfeitaria, []);
    const trabalhando = situacao.acao === 'misturar' || situacao.acao === 'entregar';
    const movimento = trabalhando ? Math.sin(d.tempoConfeitaria * 10) * 0.13 : 0;
    for (const [lado, braco] of [[-1, d.bracoE], [1, d.bracoD]]) {
      posicionarBraco(braco, new THREE.Vector3(lado * 0.22, descansando ? 0.48 : trabalhando ? (situacao.acao === 'misturar' ? 1 : 0.82) + lado * movimento : 0.58, descansando ? 0.13 : trabalhando ? 0.5 : 0.4));
    }
    d.corpo.rotation.z = trabalhando ? movimento * 0.18 : 0;
    d.cabecaPadaria.rotation.set(descansando ? Math.sin(d.tempoConfeitaria * 0.7) * 0.035 : 0,
      descansando ? Math.sin(d.tempoConfeitaria * 0.55) * 0.22 : 0, 0);
    if (descansando) {
      d.marcha.intensidade = 0; d.marcha.velocidade = 0;
      d.corpo.position.y = 0; d.corpo.rotation.set(0, 0, 0);
      animarPernas(d, 0);
    }
    d.cargaPadaria.visible = estado.confeitaria.etapaEntrega >= 0;
    objetos.docesNaBandeja.forEach(doce => { doce.visible = situacao.carga.includes(doce.name); });
    if (produzindo) {
      objetos.batedeira.rotor.rotation.y += dt * 10;
      objetos.batedeira.massa.rotation.y += dt * 2;
    }
    objetos.batedeira.massa.visible = produzindo;
    d.alertaTrigo.position.set(ator.x, 2.3, ator.z);
  }

  animarPadeiros(objetos, producao, tempo, dt) {
    const PRODUTOS = produtosDaLoja(this.sim?.estado);
    const paes = this.sim.estado.produtos.pao.prateleira;
    const { moendo, assando } = trabalhoPadaria({ ...this.sim.estado, producao });
    objetos.padeiros.forEach((padeiro, i) => {
      const d = padeiro.userData;
      d.tempoPadaria ??= 0;
      const modoAnterior = d.modoPadaria;
      const entrega = producao.entregaPadaria;
      if (entrega) {
        d.cicloPadaria = !!entrega.modo;
        d.modoPadaria = entrega.modo || 'forno';
        d.tempoPadaria = entrega.tempo;
        d.caminhoPadaria = [];
      } else {
        if (d.cicloPadaria && !d.caminhoPadaria?.length) d.tempoPadaria += dt;
        const anterior = d.modoPadaria === 'completo' ? objetos.roteiros[0] : objetos.roteiroForno;
        if (d.cicloPadaria && d.tempoPadaria >= anterior.reduce((total, etapa) => total + etapa.duracao, 0)) d.cicloPadaria = false;
        if (!d.cicloPadaria && (moendo || assando)) {
          d.cicloPadaria = true;
          d.modoPadaria = moendo ? 'completo' : 'forno';
          d.tempoPadaria = 0;
        }
      }
      const ativo = !!d.cicloPadaria;
      const roteiro = d.modoPadaria === 'completo' ? objetos.roteiros[0] : objetos.roteiroForno;
      const espera = objetos.postosEspera[i];
      const inicio = ativo ? roteiro[0].de : espera;
      const ator = d.atorPadaria ??= { ...inicio, angulo: -Math.PI / 2, andando: false };
      const ponto = ativo ? percorrerRoteiro(roteiro, d.tempoPadaria) : { ...espera, andando: false, acao: 'esperar', fase: 0 };
      if (!entrega && d.ativoPadaria !== undefined && (d.ativoPadaria !== ativo || modoAnterior !== d.modoPadaria)) {
        const obstaculos = this.sim.obstaculos();
        // A passagem de serviço junto à parede é mais estreita que a grade dos clientes.
        const limites = { minX: PRODUTOS.pao.prateleira.x - 1.5, maxX: ALA_PADARIA.piso.x + ALA_PADARIA.piso.w / 2 - 0.28,
          minZ: ALA_PADARIA.entrada.z - ALA_PADARIA.entrada.d / 2 - 0.6, maxZ: ALA_PADARIA.piso.z + ALA_PADARIA.piso.d / 2 - 0.28 };
        const caminho = buscarCaminho(ator, ponto, (de, para) => segmentoLivre(de, para, obstaculos, 0.12), limites, 0.1);
        const caminhoDireto = [];
        let origem = ator;
        while (caminho.length) {
          let indice = caminho.length - 1;
          while (indice > 0 && !segmentoLivre(origem, caminho[indice], obstaculos, 0.12)) indice--;
          caminhoDireto.push(caminho[indice]);
          origem = caminho[indice];
          caminho.splice(0, indice + 1);
        }
        d.caminhoPadaria = caminhoDireto;
      }
      d.ativoPadaria = ativo;
      while (d.caminhoPadaria?.length && Math.hypot(d.caminhoPadaria[0].x - ator.x, d.caminhoPadaria[0].z - ator.z) <= 0.025) d.caminhoPadaria.shift();
      const destino = d.caminhoPadaria?.[0] ?? ponto;
      const dx = destino.x - ator.x, dz = destino.z - ator.z, distancia = Math.hypot(dx, dz);
      const seguindoRoteiro = ativo && !d.caminhoPadaria?.length;
      const aproximando = !seguindoRoteiro && distancia > 0.025;
      const passo = Math.min(distancia, dt * 2.2);
      const xAnterior = ator.x, zAnterior = ator.z;
      if (aproximando) { ator.x += dx / distancia * passo; ator.z += dz / distancia * passo; }
      else { ator.x = destino.x; ator.z = destino.z; }
      if (!ativo) d.tempoPadaria = 0;
      const deslocamentoX = ator.x - xAnterior, deslocamentoZ = ator.z - zAnterior;
      const deslocou = Math.hypot(deslocamentoX, deslocamentoZ) > 0.0001;
      const alvo = ponto.acao === 'buscar' ? ALA_PADARIA.entrada
        : ponto.acao === 'expor' ? PRODUTOS.pao.prateleira : ALA_PADARIA.forno;
      ator.andando = deslocou;
      ator.angulo = deslocou ? Math.atan2(deslocamentoX, deslocamentoZ)
        : !ativo && !aproximando ? -Math.PI / 2 : Math.atan2(alvo.x - ator.x, alvo.z - ator.z);
      this.animarPersonagem(padeiro, ator, dt, tempo + i, []);
      const parado = !ativo && !aproximando;
      if (parado) {
        d.marcha.intensidade = 0; d.marcha.velocidade = 0;
        d.corpo.position.y = 0; d.corpo.rotation.set(0, 0, 0);
        animarPernas(d, 0);
      }
      const trabalhando = seguindoRoteiro && ['moer', 'receber', 'colocar', 'assar', 'retirar', 'expor'].includes(ponto.acao);
      const fase = ponto.fase;
      d.acaoPadaria = seguindoRoteiro ? ponto.acao : 'andar';
      d.fasePadaria = fase;
      const cargaDisponivel = ponto.acao === 'receber' ? fase >= 0.45
        : ponto.acao === 'colocar' ? fase < 0.6
          : ponto.acao === 'retirar' ? fase >= 0.45 : ponto.acao === 'expor' ? fase < 0.7 : true;
      const carregando = seguindoRoteiro && !!ponto.carga && cargaDisponivel;
      d.cargaPadaria.visible = carregando;
      if (d.cargaTrigo) d.cargaTrigo.visible = carregando && ponto.carga === 'trigo';
      if (d.cargaFarinha) d.cargaFarinha.visible = carregando && ponto.carga === 'farinha';
      if (d.cargaPao) d.cargaPao.visible = carregando && ponto.carga === 'pao';
      if (entrega && d.cargaPao) d.cargaPao.children.slice(1).forEach((pao, indice) => { pao.visible = indice < entrega.paes; });
      objetos.farinha.visible = seguindoRoteiro && (ponto.acao === 'moer' || ponto.acao === 'receber' && fase < 0.45);
      const interagindoForno = seguindoRoteiro && ['colocar', 'retirar'].includes(ponto.acao);
      const abertura = interagindoForno ? Math.min(1, fase / 0.25, (1 - fase) / 0.2) : 0;
      objetos.portaForno.position.y = 0.99 + abertura * 0.75;
      objetos.paesNoForno.visible = seguindoRoteiro && (ponto.acao === 'colocar' && fase >= 0.6
        || ponto.acao === 'assar' || ponto.acao === 'retirar' && fase < 0.45);
      objetos.brilhoForno.visible = objetos.paesNoForno.visible;
      objetos.brilhoForno.material.color.setHex(Math.sin(tempo * 10) > 0 ? 0xffa04a : 0xffcc68);
      const alcance = trabalhando && ['receber', 'colocar', 'retirar', 'expor'].includes(ponto.acao) ? Math.sin(fase * Math.PI) : 0;
      const alturaCarga = ponto.acao === 'receber' ? 0.58 + alcance * 0.7
        : ponto.acao === 'expor' ? 0.58 + alcance * 0.35 : interagindoForno ? 0.58 - alcance * 0.1 : 0.58;
      d.cargaPadaria.position.set(0, alturaCarga + (carregando && ponto.andando ? Math.abs(Math.sin(tempo * 13)) * 0.025 : 0), 0.43 + alcance * 0.2);
      d.cargaPadaria.rotation.x = ponto.acao === 'colocar' ? -alcance * 0.7 : 0;
      const movimento = trabalhando ? Math.sin(tempo * (i ? 7 : 10)) * 0.17 : 0;
      d.corpo.rotation.z = trabalhando ? Math.sin(tempo * 4) * 0.045 : 0;
      d.cabecaPadaria.rotation.set(parado ? Math.sin(tempo * 0.7 + i) * 0.035 : 0,
        parado ? Math.sin(tempo * 0.55 + i * 2) * 0.22 : 0, 0);
      for (const [lado, braco] of [[-1, d.bracoE], [1, d.bracoD]]) {
        const altura = alcance > 0 ? alturaCarga : carregando ? 0.56 : ator.andando ? 0.54 : trabalhando ? 0.83 + lado * movimento : 0.48;
        const frente = alcance > 0 ? 0.44 + alcance * 0.2 : carregando ? 0.44 : ator.andando ? 0.17 + lado * Math.sin(tempo * 13) * 0.17 : trabalhando ? 0.5 : 0.13;
        posicionarBraco(braco, new THREE.Vector3(lado * (carregando ? 0.17 : 0.25), altura, frente));
      }
      d.alertaTrigo.visible = producao.trigoPadaria === 0 && paes === 0 && !entrega?.modo;
      d.alertaTrigo.position.set(ator.x, 2.3, ator.z);
      if (this.camera) d.alertaTrigo.quaternion.copy(this.camera.quaternion);
    });
    objetos.frutas.forEach((pao, i) => { pao.visible = i < paes; });
  }
  criarLabel(id, ponto, titulo, detalhe, classe) {
    const el = document.createElement('div'); el.className = `etiqueta etiqueta-${classe}`;
    el.hidden = true;
    el.innerHTML = `<b>${titulo}</b><span>${detalhe}</span>`;
    document.getElementById('etiquetas').append(el);
    this.labels.push({ id, el, ponto });
  }
  criarRetratoCliente(visual, aparencia) {
    if (this.retratosClientes.has(aparencia)) return;
    const miniatura = personagem(visual.corRoupa, visual.pele, false, [0x1d654b, 0x3d8a65, 0x254233], visual);
    miniatura.userData.cesta.visible = false;
    for (const braco of [miniatura.userData.bracoE, miniatura.userData.bracoD]) {
      posicionarBraco(braco, new THREE.Vector3(braco.userData.ombro.x, 0.46, 0));
    }
    const cena = new THREE.Scene();
    cena.background = new THREE.Color(0xe7ede1);
    cena.add(miniatura, new THREE.HemisphereLight(0xfff4dc, 0x70a85d, 2.55));
    const luz = new THREE.DirectionalLight(0xffebc9, 2.8);
    luz.position.set(-3, 5, 6); cena.add(luz);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 10);
    camera.position.set(0.35, 1.42, 2.5);
    camera.lookAt(0, 1.04, 0);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext('2d');
    const desenharCompativel = () => {
      const renderizador = new RenderizadorCompativel();
      renderizador.setSize(96, 96);
      renderizador.render(cena, camera);
      ctx.drawImage(renderizador.domElement, 0, 0);
    };
    try {
      if (!this.modoCompativel) {
        this.alvoRetrato ??= new THREE.WebGLRenderTarget(96, 96);
        this.alvoRetrato.texture.colorSpace = THREE.SRGBColorSpace;
        this.renderer.setRenderTarget(this.alvoRetrato);
        this.renderer.render(cena, camera);
        const pixels = new Uint8Array(96 * 96 * 4);
        this.renderer.readRenderTargetPixels(this.alvoRetrato, 0, 0, 96, 96, pixels);
        const imagem = ctx.createImageData(96, 96);
        for (let y = 0; y < 96; y++) imagem.data.set(pixels.subarray((95 - y) * 384, (96 - y) * 384), y * 384);
        ctx.putImageData(imagem, 0, 0);
      } else desenharCompativel();
      this.retratosClientes.set(aparencia, canvas.toDataURL('image/png'));
    } catch {
      try {
        desenharCompativel();
        this.retratosClientes.set(aparencia, canvas.toDataURL('image/png'));
      } catch { /* O jogo segue funcionando se um retrato não puder ser desenhado. */ }
    } finally {
      if (!this.modoCompativel) this.renderer.setRenderTarget(null);
      liberarGeometrias(miniatura);
    }
  }
  redimensionar() {
    this.w = this.container.clientWidth; this.h = this.container.clientHeight;
    const proporcao = this.w / this.h;
    this.mobile = proporcao < 0.92;
    const camera = this.sim.estado.melhorias?.expansao ? PLANTA_EXPANSAO.camera : this.sim.estado.estagioLoja >= ALA_PADARIA.indice ? ALA_PADARIA.camera : this.sim.estado.estagioLoja >= ALA_TRIGO.indice ? ALA_TRIGO.camera : this.sim.estado.estagioLoja >= ALA_LEITE.indice ? ALA_LEITE.camera : ALA_PRODUCAO.camera;
    const altura = this.mobile ? 18.8 : Math.max(camera.alturaDesktop, 37 / proporcao);
    this.camera.left = -altura * proporcao / 2; this.camera.right = altura * proporcao / 2;
    this.camera.top = altura / 2; this.camera.bottom = -altura / 2; this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.w, this.h);
  }
  ajustarZoom(fator) {
    if (!Number.isFinite(fator) || fator <= 0) return;
    const zoom = THREE.MathUtils.clamp(this.camera.zoom * fator, ZOOM_MINIMO, ZOOM_MAXIMO);
    if (zoom === this.camera.zoom) return;
    const baseAnterior = this.baseCamera();
    this.camera.zoom = zoom;
    const baseAtual = this.baseCamera();
    this.deslocamentoCamera.x += baseAnterior.x - baseAtual.x;
    this.deslocamentoCamera.z += baseAnterior.z - baseAtual.z;
    this.camera.updateProjectionMatrix();
  }
  moverCamera(dx, dy) {
    if (!dx && !dy || !this.w || !this.h) return;
    // Converte o arrasto na tela para deslocamento no plano do terreno.
    const horizontal = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const vertical = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const direcao = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const deslocamento = horizontal.multiplyScalar(dx * (this.camera.right - this.camera.left) / (this.w * this.camera.zoom))
      .add(vertical.multiplyScalar(-dy * (this.camera.top - this.camera.bottom) / (this.h * this.camera.zoom)));
    deslocamento.addScaledVector(direcao, -deslocamento.y / direcao.y);
    const base = this.baseCamera();
    const limites = this.sim.estado.melhorias?.expansao ? PLANTA_EXPANSAO.limiteCamera : CONFIG.limiteCamera;
    const x = THREE.MathUtils.clamp(base.x + this.deslocamentoCamera.x - deslocamento.x, limites.minX, limites.maxX);
    const z = THREE.MathUtils.clamp(base.z + this.deslocamentoCamera.z - deslocamento.z, limites.minZ, limites.maxZ);
    this.deslocamentoCamera.set(x - base.x, 0, z - base.z);
    this.alvoCamera.set(x, 0, z);
  }
  baseCamera() {
    const camera = this.sim.estado.melhorias?.expansao ? PLANTA_EXPANSAO.camera : this.sim.estado.estagioLoja >= ALA_PADARIA.indice ? ALA_PADARIA.camera : this.sim.estado.estagioLoja >= ALA_TRIGO.indice ? ALA_TRIGO.camera : this.sim.estado.estagioLoja >= ALA_LEITE.indice ? ALA_LEITE.camera : ALA_PRODUCAO.camera;
    const jogador = this.sim.estado.jogador;
    const acompanhamento = this.mobile ? 1 : THREE.MathUtils.clamp((this.camera.zoom - 1) / (ZOOM_MAXIMO - 1), 0, 1);
    return { x: THREE.MathUtils.lerp(camera.x, jogador.x, acompanhamento), z: THREE.MathUtils.lerp(camera.z, jogador.z, acompanhamento) };
  }
  projetar(ponto) {
    const p = new THREE.Vector3(ponto.x, ponto.y ?? 1.5, ponto.z).project(this.camera);
    return { x: (p.x + 1) * this.w / 2, y: (1 - p.y) * this.h / 2 };
  }
  selecionarHorta(clientX, clientY) {
    const retangulo = this.renderer.domElement.getBoundingClientRect();
    this.ponteiroRaycast.set(
      ((clientX - retangulo.left) / retangulo.width) * 2 - 1,
      -((clientY - retangulo.top) / retangulo.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.ponteiroRaycast, this.camera);
    const alvos = this.alvosHorta.filter(alvo => estacaoDesbloqueada(alvo.userData.produtoHorta, this.sim.estado));
    return this.raycaster.intersectObjects(alvos, false)[0]?.object.userData.produtoHorta ?? null;
  }
  animarMelhoriaHorta(id) {
    const PRODUTOS = produtosDaLoja(this.sim?.estado);
    const horta = PRODUTOS[id]?.horta;
    if (!horta) return;
    const grupo = new THREE.Group(); grupo.position.set(horta.x, 0.48, horta.z); this.cena.add(grupo);
    const material = new THREE.MeshBasicMaterial({ color: 0xf4d35e, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const anel = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.82, 32), material); anel.rotation.x = -Math.PI / 2; grupo.add(anel);
    const particulas = Array.from({ length: 14 }, (_, i) => {
      const particula = esfera(grupo, 0.07, i % 2 ? 0x7fbd55 : 0xf4d35e);
      particula.userData.angulo = i / 14 * Math.PI * 2;
      return particula;
    });
    this.efeitosCrescimento.push({ grupo, anel, particulas, inicio: this.tempoVisual, duracao: 1.8 });
  }
  animarPersonagem(modelo, ator, dt, tempo, inventario = [], origem = 'horta', duracao = 0.26) {
    const PRODUTOS = produtosDaLoja(this.sim?.estado);
    modelo.position.set(ator.x, 0.23, ator.z);
    const d = modelo.userData;
    const evento = this.sim?.reposicoes.get(ator);
    if (evento && evento !== d.ultimaReposicao) {
      d.ultimaReposicao = evento;
      const inicio = d.carga.children[evento.indice]?.position.clone() ?? new THREE.Vector3(0, 0.13, 0);
      d.reposicao = { ...evento, inicio: inicio.add(d.cesta.position), decorrido: 0, duracao: Math.min(duracao, 0.36) };
      const importado = PRODUTOS[evento.id].origem === 'importado';
      if (importado) {
        const destino = criarImportadoNaPrateleira(evento.id, PRODUTOS[evento.id], evento.lugar);
        d.reposicao.destinoImportado = destino.position.clone();
        liberarGeometrias(destino);
      }
      d.coleta = null;
      liberarGeometrias(d.produtoNaMao);
      d.produtoNaMao.add(criarProduto(evento.id, 0.75, importado ? Math.floor(evento.lugar / 9) * 3 : 0));
    }
    if (d.inventario?.join(',') !== inventario.join(',')) {
      const anteriores = [...(d.inventario ?? [])];
      const novos = [];
      inventario.forEach((id, indice) => {
        const encontrado = anteriores.indexOf(id);
        if (encontrado >= 0) anteriores.splice(encontrado, 1);
        else novos.push({ id, indice });
      });
      // Ao carregar um jogo, os produtos já estão guardados na cesta.
      if (d.inventario !== null && novos.length) {
        d.reposicao = null;
        const { id, indice } = novos[novos.length - 1];
        d.coleta = { decorrido: 0, duracao, indice, fonte: PRODUTOS[id][origem] };
        liberarGeometrias(d.produtoNaMao);
        d.produtoNaMao.add(criarProduto(id, 0.75));
      } else d.coleta = null;
      liberarGeometrias(d.carga);
      const novaCarga = new THREE.Group();
      inventario.forEach((id, i) => {
        const fruta = criarProduto(id, 0.75);
        if (d.jogador) fruta.position.set(i % 2 ? 0.14 : -0.14, 0.16 + Math.floor(i / 2) * 0.18, 0.08);
        else fruta.position.set((i % 3 - 1) * 0.25, 0.13 + Math.floor(i / 9) * 0.18, (Math.floor(i / 3) % 3 - 1) * 0.17);
        novaCarga.add(fruta);
      });
      if (d.jogador && inventario.some(id => PRODUTOS[id]?.origem === 'importado')) organizarImportadosCarregados(novaCarga);
      novaCarga.children.slice().forEach(produto => d.carga.add(produto));
      d.inventario = [...inventario];
    }
    const coleta = d.coleta;
    const reposicao = d.reposicao;
    const fonte = reposicao ? PRODUTOS[reposicao.id].prateleira : coleta?.fonte;
    const alvo = fonte && !ator.andando
      ? Math.atan2(fonte.x - ator.x, fonte.z - ator.z)
      : ator.angulo ?? Math.PI / 4;
    const delta = Math.atan2(Math.sin(alvo - modelo.rotation.y), Math.cos(alvo - modelo.rotation.y));
    modelo.rotation.y += delta * (1 - Math.exp(-12 * dt));
    const marcha = atualizarMarcha(d, ator, dt);
    const dtPose = dt;
    d.sentar = THREE.MathUtils.clamp(d.sentar + (ator.sentado ? 1 : -1) * dtPose * 3, 0, 1);
    const sentado = d.sentar * d.sentar * (3 - 2 * d.sentar);
    const intensidade = marcha.intensidade * (1 - sentado);
    const balanco = Math.sin(marcha.fase) * intensidade;
    d.corpo.position.y = Math.sin(tempo * 2) * 0.008 * (1 - marcha.intensidade) * (1 - sentado)
      + (1 - Math.cos(marcha.fase * 2)) * 0.014 * intensidade + 0.08 * sentado;
    d.corpo.rotation.set(Math.min(marcha.velocidade / 4.3, 1.3) * 0.045 * intensidade,
      balanco * 0.035, -balanco * 0.025);
    animarPernas(d, sentado);
    if (d.jogador) d.cesta.position.set(0, 0.42, 0.5);
    else {
      const posicaoCarregada = new THREE.Vector3(0, d.corpulento ? 0.2 : 0.26, d.corpulento ? 0.72 : 0.58)
        .lerp(new THREE.Vector3(-1, -d.corpo.position.y, 0), sentado);
      if (ator.acaoCesta) {
        const t = THREE.MathUtils.smoothstep(ator.progressoCesta ?? 0, 0, 1);
        const posicaoSuporte = new THREE.Vector3(0, 0.31 - d.corpo.position.y, 1.05);
        d.cesta.position.copy(posicaoSuporte).lerp(posicaoCarregada, t);
        d.cesta.position.y += Math.sin(t * Math.PI) * 0.13;
        d.cesta.rotation.z = Math.sin(t * Math.PI) * -0.12;
      } else {
        d.cesta.position.copy(posicaoCarregada);
        d.cesta.rotation.z = 0;
      }
    }
    if (ator.temCarrinho) d.cesta.position.copy(CARRINHO_CLIENTE[ator.fase === 'comprando' ? 'lateral' : 'frente'].carga);
    const escalaCaixa = d.jogador ? 0.58 : 1;
    const repouso = d.usandoCaixaMadeira
      ? new THREE.Vector3(0.43 * escalaCaixa, d.cesta.position.y + 0.32 * escalaCaixa, d.cesta.position.z)
      : new THREE.Vector3(0.4, 0.65, 0.32);
    const mao = repouso.clone();
    d.produtoNaMao.visible = false;
    d.carga.children.forEach(f => { f.visible = true; });
    if (coleta) {
      coleta.decorrido += dt;
      const t = Math.min(1, coleta.decorrido / coleta.duracao);
      const alcance = new THREE.Vector3(0.34, 1.03, 0.98);
      const fruta = d.carga.children[coleta.indice];
      const destino = fruta.position.clone().add(d.cesta.position);
      const suave = v => v * v * (3 - 2 * v);
      if (t < 0.28) mao.lerp(alcance, suave(t / 0.28));
      else if (t < 0.85) {
        const p = (t - 0.28) / 0.57;
        mao.copy(alcance).lerp(destino, suave(p));
        mao.y += Math.sin(p * Math.PI) * 0.4;
      } else mao.copy(destino).lerp(repouso, suave((t - 0.85) / 0.15));
      fruta.visible = t >= 0.85;
      d.produtoNaMao.visible = t >= 0.28 && t < 0.85;
      d.produtoNaMao.position.copy(mao);
      if (t >= 1) d.coleta = null;
    }
    if (reposicao) {
      reposicao.decorrido += dt;
      const t = Math.min(1, reposicao.decorrido / reposicao.duracao);
      const p = PRODUTOS[reposicao.id].prateleira, i = reposicao.lugar;
      // O destino usa exatamente a posição do produto desenhado na prateleira.
      d.corpo.updateWorldMatrix(true, false);
      const importado = PRODUTOS[reposicao.id].origem === 'importado';
      const destino = d.corpo.worldToLocal(reposicao.destinoImportado?.clone() ?? posicaoProdutoPrateleira(reposicao.id, p, i));
      const suave = v => v * v * (3 - 2 * v);
      if (t < 0.22) mao.lerp(reposicao.inicio, suave(t / 0.22));
      else if (t < 0.85) {
        const progresso = (t - 0.22) / 0.63;
        mao.copy(reposicao.inicio).lerp(destino, suave(progresso));
        mao.y += Math.sin(progresso * Math.PI) * 0.55;
      } else mao.copy(destino).lerp(repouso, suave((t - 0.85) / 0.15));
      d.produtoNaMao.visible = t < 0.85;
      d.produtoNaMao.position.copy(t < 0.22 ? reposicao.inicio : mao);
      d.produtoNaMao.children[0].scale.setScalar(0.75 + (importado ? 0.07 : 0.95) * suave(Math.max(0, Math.min(1, (t - 0.22) / 0.63))));
      if (t >= 1) d.reposicao = null;
    }
    const semCarga = !coleta && !reposicao && inventario.length === 0 && (
      (d.jogador && !d.usandoCaixaMadeira) || d.funcao === 'caixa' || (ator.temCesta === false && !ator.levaSacolas)
      || d.funcao === 'ajudante' || d.funcao === 'entrega'
    );
    if (semCarga) {
      const oscilacaoBraco = Math.cos(marcha.fase - 0.18) * intensidade * 0.19;
      const maoLivreE = new THREE.Vector3(d.bracoE.userData.ombro.x, 0.46 + Math.max(0, oscilacaoBraco) * 0.18, -oscilacaoBraco);
      const maoLivreD = new THREE.Vector3(d.bracoD.userData.ombro.x, 0.46 + Math.max(0, -oscilacaoBraco) * 0.18, oscilacaoBraco);
      posicionarBraco(d.bracoE, maoLivreE);
      posicionarBraco(d.bracoD, maoLivreD);
      return;
    }
    const carregandoNasMaos = d.jogador && !d.usandoCaixaMadeira && inventario.length > 0;
    const maoE = carregandoNasMaos
      ? new THREE.Vector3(-0.3, 0.62, 0.5)
      : d.usandoCaixaMadeira
        ? new THREE.Vector3(-0.43 * escalaCaixa, d.cesta.position.y + 0.32 * escalaCaixa, d.cesta.position.z)
        : d.cesta.userData.pega.clone().add(d.cesta.position);
    const soltar = THREE.MathUtils.smoothstep(sentado, 0.65, 1);
    if (!carregandoNasMaos) maoE.lerp(new THREE.Vector3(-0.3, 0.87, 0.7), soltar);
    if (carregandoNasMaos) mao.set(0.3, 0.62, 0.5);
    else if (d.usandoCaixaMadeira) mao.copy(repouso);
    else mao.lerp(new THREE.Vector3(0.3, 0.87, 0.7), sentado);
    posicionarBraco(d.bracoE, maoE);
    posicionarBraco(d.bracoD, mao);
  }
  animarSustoCaixa(modelo, tempo) {
    const tremor = Math.sin(tempo * 17) * 0.025;
    posicionarBraco(modelo.userData.bracoE, new THREE.Vector3(-0.52, 1.48 + tremor, 0.1));
    posicionarBraco(modelo.userData.bracoD, new THREE.Vector3(0.52, 1.48 - tremor, 0.1));
    modelo.userData.corpo.rotation.x = -0.08;
    modelo.userData.corpo.rotation.z = tremor;
  }
  animarEntregador(modelo, ator, caminhao, dt, tempo) {
    this.animarPersonagem(modelo, { ...ator, temCesta: false }, dt, tempo);
    const d = modelo.userData;
    if (caminhao.fase === 'embarcar' && caminhao.etapa >= 2) {
      const abertura = caminhao.aberturaCabine || 0;
      posicionarBraco(d.bracoE, new THREE.Vector3(-0.28, 0.88, 0.58));
      posicionarBraco(d.bracoD, new THREE.Vector3(0.42 + abertura * 0.12, 0.92, 0.72));
      d.corpo.rotation.x = abertura * 0.22;
      return;
    }
    if (caminhao.fase === 'abrirBau' || caminhao.fase === 'fecharBau') {
      const movimento = caminhao.fase === 'abrirBau' ? caminhao.aberturaBau : 1 - caminhao.aberturaBau;
      posicionarBraco(d.bracoE, new THREE.Vector3(-0.32, 0.82, 0.72));
      posicionarBraco(d.bracoD, new THREE.Vector3(0.28 + movimento * 0.12, 1.12, 0.93));
      return;
    }
    if (ator.carregando || caminhao.fase === 'retirar' || caminhao.fase === 'guardar') {
      const t = Math.min(1, Math.max(0, (caminhao.tempo - 0.35) / 0.35));
      const deslocamento = caminhao.fase === 'retirar' ? 0.58 * (1 - t) : 0;
      posicionarBraco(d.bracoE, new THREE.Vector3(-0.34, 0.72 - deslocamento, 0.58));
      posicionarBraco(d.bracoD, new THREE.Vector3(0.34, 0.72 - deslocamento, 0.58));
    }
  }
  animarAtendimento(modelo, tempo, ativo, progresso = 0) {
    if (!ativo) return;
    const fase = tempo * 8;
    if (progresso > 0.52) {
      const alcancando = Math.sin(fase) > 0;
      posicionarBraco(modelo.userData.bracoE, alcancando
        ? new THREE.Vector3(-0.42, 0.58, 1.02)
        : new THREE.Vector3(-0.3, 0.84, 0.72));
      posicionarBraco(modelo.userData.bracoD, !alcancando
        ? new THREE.Vector3(0.42, 0.58, 1.02)
        : new THREE.Vector3(0.3, 0.84, 0.72));
      return;
    }
    const toque = Math.max(0, Math.sin(fase)) * 0.22;
    posicionarBraco(modelo.userData.bracoD, new THREE.Vector3(0.3, 0.86 - toque, 0.82));
    posicionarBraco(modelo.userData.bracoE, new THREE.Vector3(-0.3, 0.86 - Math.max(0, Math.sin(fase + Math.PI)) * 0.16, 0.76));
  }
  atualizarEmbalagem(sim) {
    const cliente = sim.clientes.filter(c => c.fase === 'fila').sort((a, b) => (a.ordemFila ?? 0) - (b.ordemFila ?? 0))[0];
    if (!cliente || sim.progressoCaixa <= 0) {
      this.sacolaEmbalagem.visible = false; this.itensEmbalagem.visible = false;
      this.clienteEmbalandoId = null;
      return null;
    }
    if (this.clienteEmbalandoId !== cliente.id) {
      liberarGeometrias(this.itensEmbalagem);
      this.clienteEmbalandoId = cliente.id;
      const itens = cliente.itens ?? Array(cliente.quantidade).fill(cliente.produto);
      for (const id of itens) this.itensEmbalagem.add(criarProduto(id, 0.82));
    }
    const progresso = THREE.MathUtils.clamp(sim.progressoCaixa / CONFIG.tempoCaixa, 0, 1);
    this.sacolaEmbalagem.visible = true; this.itensEmbalagem.visible = true;
    let preenchimento = 0, embalados = 0;
    this.itensEmbalagem.children.forEach((item, i) => {
      const intervalo = cliente.quantidade > 1 ? 0.5 / (cliente.quantidade - 1) : 0;
      const inicio = 0.05 + i * intervalo;
      const t = THREE.MathUtils.clamp((progresso - inicio) / 0.38, 0, 1);
      const origem = pontoNoBalcao(0, 1.39, 0.4 + (i - (cliente.quantidade - 1) / 2) * 0.13);
      const destino = posicaoProdutoSacola(i, cliente.quantidade).applyQuaternion(this.sacolaEmbalagem.quaternion).add(this.sacolaEmbalagem.position);
      item.position.copy(origem).lerp(destino, t);
      if (t < 1) item.position.y += Math.sin(t * Math.PI) * 0.32;
      item.rotation.z = (1 - t) * (i % 2 ? 0.45 : -0.45);
      preenchimento += t;
      if (t > 0) embalados++;
    });
    ajustarSacola(this.sacolaEmbalagem, cliente.quantidade, preenchimento / Math.max(1, cliente.quantidade));
    return { cliente, progresso, embalados };
  }
  atualizarTrafego(dt) {
    const sim = this.sim, e = sim.estado;
    const coleta = e.banco.coleta;
    const assalto = e.banco.assalto;
    if (coleta || assalto || sim.estacionamento.reservaRua || sim.entregas.reservaRua) this.trafego.faixasReservadas.add(0);
    else this.trafego.faixasReservadas.delete(0);
    // A entrega vem pela esquerda e cruza a rua para alinhar a entrada de ré.
    if (sim.entregas.reservaRua) this.trafego.faixasReservadas.add(1);
    else this.trafego.faixasReservadas.delete(1);
    this.trafego.atualizarExpansao(!!e.melhorias.expansao);
    this.trafego.atualizar(dt);
    sim.estacionamento.transitoLivre = !this.trafego.carros.some(c => c.faixa === 0);
    sim.entregas.transitoLivre = this.trafego.carros.length === 0;
    const manobraAtiva = sim.estacionamento.carros.some(c => (c.fase === 'aguardando' && c.recebido)
      || ['chegando', 're', 'engatando', 'partindo'].includes(c.fase)) || (sim.entregas.reservaRua && sim.entregas.caminhao.fase !== 'aguardando');
    if (coleta?.tempo < 0 && dt > 0 && !manobraAtiva && !this.trafego.carros.some(c => c.faixa === 0)) coleta.tempo = 0;
    if (assalto?.tempo < 0 && dt > 0 && !manobraAtiva && !this.trafego.carros.some(c => c.faixa === 0)) assalto.tempo = 0;
  }
  atualizar(dt) {
    const PRODUTOS = produtosDaLoja(this.sim?.estado);
    const sim = this.sim, e = sim.estado;
    const coleta = e.banco.coleta;
    const assalto = e.banco.assalto;
    this.atualizarTrafego(dt);
    this.coletaBanco.atualizar(coleta);
    this.assaltoVisual.atualizar(assalto);
    this.entregasVisual.atualizar(sim.entregas, dt);
    this.bairro.atualizarPacotesDeposito(e.deposito.pacotes);
    const dtVisual = dt;
    this.tempoVisual += dtVisual;
    const tempo = this.tempoVisual;
    for (let i = this.efeitosCrescimento.length - 1; i >= 0; i--) {
      const efeito = this.efeitosCrescimento[i], progresso = (tempo - efeito.inicio) / efeito.duracao;
      if (progresso >= 1) {
        this.cena.remove(efeito.grupo); liberarGeometrias(efeito.grupo); this.efeitosCrescimento.splice(i, 1); continue;
      }
      const pulso = 1 + progresso * 2.4;
      efeito.anel.scale.setScalar(pulso); efeito.anel.material.opacity = 0.9 * (1 - progresso);
      efeito.particulas.forEach((particula, indice) => {
        const raio = 0.45 + progresso * 1.35;
        particula.position.set(Math.cos(particula.userData.angulo) * raio, progresso * 2 + Math.sin(progresso * Math.PI * 3 + indice) * 0.12, Math.sin(particula.userData.angulo) * raio);
        particula.scale.setScalar(1 - progresso * 0.65);
      });
    }
    this.bairro.atualizarExpansao(e.melhorias.expansao);
    this.bairro.atualizarProfundidade(sim.compacta);
    this.bairro.atualizarOficinas(e.produtos);
    if (this.expansaoConstruida !== !!e.melhorias.expansao || this.lojaCompactaConstruida !== sim.compacta) {
      this.expansaoConstruida = !!e.melhorias.expansao;
      this.lojaCompactaConstruida = sim.compacta;
      this.alvosHorta = [];
      this.labels = this.labels.filter(label => {
        if (['pao', ...Object.keys(CONFEITARIA.produtos)].some(id => label.id.endsWith(`-${id}`))) return true;
        label.el.remove(); return false;
      });
      for (const [id, p] of Object.entries(PRODUTOS)) {
        if (id === 'pao' || p.origem === 'confeitaria') continue;
        const anterior = this.produtos[id].grupo;
        this.cena.remove(anterior); liberarGeometrias(anterior);
        if (p.origem === 'importado') this.construirImportado(id, p);
        else this.construirEstacao(id, p);
      }
      this.redimensionar();
    }
    this.prateleirasImportados.atualizar(e.melhorias);
    this.bairro.aplicar(e.personalizacao);
    this.estacionamento.atualizar(!!e.melhorias.estacionamento, dt, sim.estacionamento.carros, sim.tempo, !!e.melhorias.expansao, sim.carrinhosNoSuporte, !!e.melhorias.carrinhos);
    this.bairro.atualizarEstacionamento(!!e.melhorias.estacionamento);
    this.bairro.animarEntrada(sim.aberturaPortaEntrada, e.lojaAberta);
    this.bairro.animarPortasProducao(sim.aberturasPortasProducao);
    this.bairro.animarDeposito(e.lojaAberta, dt);
    if (this.ultimoEstagioCamera !== e.estagioLoja) { this.ultimoEstagioCamera = e.estagioLoja; this.redimensionar(); }
    const base = this.baseCamera(), limites = e.melhorias.expansao ? PLANTA_EXPANSAO.limiteCamera : CONFIG.limiteCamera;
    const alvo = new THREE.Vector3(
      THREE.MathUtils.clamp(base.x + this.deslocamentoCamera.x, limites.minX, limites.maxX), 0,
      THREE.MathUtils.clamp(base.z + this.deslocamentoCamera.z, limites.minZ, limites.maxZ)
    );
    this.deslocamentoCamera.set(alvo.x - base.x, 0, alvo.z - base.z);
    this.alvoCamera.lerp(alvo, this.mobile ? Math.min(1, dt * 4) : 1);
    const equipamentoAla = this.bairro.atualizarEstagio(e.estagioLoja, dt);
    this.camera.position.copy(this.alvoCamera).add(new THREE.Vector3(CONFIG.cameraIsometrica.x, CONFIG.cameraIsometrica.y, CONFIG.cameraIsometrica.z)); this.camera.lookAt(this.alvoCamera);
    this.alertaCaixa.visible = sim.assaltosAtivos && e.banco.noCaixa >= BANCO.limite;
    this.alertaCaixa.position.set(CONFIG.balcao.x, 2.7 + Math.sin(sim.tempo * 5) * 0.08, CONFIG.balcao.z);
    this.alertaCaixa.lookAt(this.camera.position);
    this.alertaCaixeiro.visible = sim.assaltoNaLoja;
    this.alertaCaixeiro.position.set(CONFIG.cadeiraCaixa.x, 2.75 + Math.sin(sim.tempo * 8) * 0.06, CONFIG.cadeiraCaixa.z);
    this.alertaCaixeiro.lookAt(this.camera.position);
    this.notasCaixa.forEach((nota, i) => { nota.visible = e.banco.noCaixa > i * 250; });
    this.jogador.userData.usandoCaixaMadeira = sim.capacidade > CONFIG.capacidadeInicial && e.jogador.inventario.length > 0;
    this.jogador.userData.caixaMadeira.visible = this.jogador.userData.usandoCaixaMadeira;
    this.animarPersonagem(this.jogador, e.jogador, dt, tempo, e.jogador.inventario);
    const atendendoNoCaixa = sim.progressoCaixa > 0;
    const progressoCaixa = sim.progressoCaixa / CONFIG.tempoCaixa;
    this.animarAtendimento(this.jogador, tempo, atendendoNoCaixa && !e.melhorias.caixa && e.jogador.sentado, progressoCaixa);
    if (sim.assaltoNaLoja && !e.melhorias.caixa && e.jogador.sentadoCaixa) this.animarSustoCaixa(this.jogador, tempo);
    const unidadePorPixel = (this.camera.top - this.camera.bottom) / (this.camera.zoom * this.h);
    this.marcadorJogador.quaternion.copy(this.camera.quaternion);
    this.marcadorJogador.scale.setScalar(unidadePorPixel * 22);
    this.marcadorJogador.position.copy(this.jogador.userData.corpo.localToWorld(new THREE.Vector3(0, 1.7, 0)))
      .add(new THREE.Vector3(0, unidadePorPixel * 18, 0).applyQuaternion(this.camera.quaternion));
    const embalagem = this.atualizarEmbalagem(sim);
    const paletaAtual = PALETAS.find(p => p.id === e.personalizacao.paleta) || PALETAS[0];
    this.estacionamento.aplicarPaleta(paletaAtual);
    this.cestasEntrada.forEach((cesta, i) => {
      cesta.visible = i < sim.cestasNoSuporte;
      aplicarPaletaCesta(cesta, paletaAtual);
    });
    aplicarPaletaFuncionario(this.jogador, paletaAtual);
    aplicarPaletaFuncionario(this.caixeiro, paletaAtual);
    aplicarPaletaFuncionario(this.ajudante, paletaAtual);
    this.produtos.pao?.padeiros.forEach(padeiro => aplicarPaletaFuncionario(padeiro, paletaAtual));
    if (this.produtos.pao?.confeiteiro) aplicarPaletaFuncionario(this.produtos.pao.confeiteiro, paletaAtual);
    for (const c of sim.clientes) {
      if (!this.clientes.has(c.id)) {
        const visual = APARENCIAS_CLIENTES[c.aparencia] ?? APARENCIAS_CLIENTES[0];
        const m = personagem(visual.corRoupa, visual.pele, false, [0x1d654b, 0x3d8a65, 0x254233], visual);
        if (c.usaCarrinho) {
          const pose = CARRINHO_CLIENTE.frente;
          m.userData.carrinho = criarCarrinho();
          m.userData.carrinho.position.set(pose.x, pose.y, pose.z);
          m.userData.carrinho.rotation.y = pose.rotacao;
          m.userData.carrinho.visible = false; m.add(m.userData.carrinho);
        }
        this.criarRetratoCliente(visual, c.aparencia);
        m.userData.sacolas = new THREE.Group(); m.userData.corpo.add(m.userData.sacolas);
        const sacola = criarSacola(); sacola.position.set(0, 0.18, 0.58); sacola.visible = false; m.userData.sacolas.add(sacola);
        const balao = document.createElement('div'); balao.className = 'balao-reacao'; balao.hidden = true;
        document.getElementById('etiquetas').append(balao); m.userData.balao = balao;
        this.clientes.set(c.id, m); this.cena.add(m);
      }
      const modelo = this.clientes.get(c.id);
      modelo.visible = !c.noCarro;
      const itens = c.itens ?? Array(c.quantidade).fill(c.produto);
      if (modelo.userData.carrinho) {
        aplicarPaletaCarrinho(modelo.userData.carrinho, paletaAtual);
        const pose = CARRINHO_CLIENTE[c.fase === 'comprando' ? 'lateral' : 'frente'];
        modelo.userData.carrinho.position.set(pose.x, pose.y, pose.z);
        modelo.userData.carrinho.rotation.y = pose.rotacao;
        modelo.userData.carrinho.visible = !!c.temCarrinho;
      }
      modelo.userData.visualCestaNormal.forEach(parte => { parte.visible = !c.temCarrinho; });
      if (c.temCesta && !c.levaSacolas) aplicarPaletaCesta(modelo.userData.cesta, paletaAtual);
      if (!c.assustado || !modelo.userData.congelado) this.animarPersonagem(modelo, c, c.assustado ? 0 : dt, tempo + c.id, itens, 'prateleira', 0.55);
      modelo.userData.congelado = !!c.assustado;
      const balao = modelo.userData.balao;
      const mostrarReacao = c.satisfacao && c.fase === 'saindo' && !c.recusado;
      if (c.assustado || mostrarReacao) {
        const chave = c.assustado ? 'assustado' : c.satisfacao;
        if (balao.dataset.reacao !== chave) {
          balao.dataset.reacao = chave;
          balao.className = `balao-reacao ${chave}`;
          balao.innerHTML = c.assustado ? '<span role="img" aria-label="Cliente apavorado">😱</span>'
            : icone({ feliz: 'sorriso', neutro: 'neutro', irritado: 'irritado' }[chave]);
        }
        const pos = this.projetar({ x: c.x, y: 3.15, z: c.z });
        balao.hidden = pos.x < 20 || pos.x > this.w - 20 || pos.y < 20 || pos.y > this.h - 90;
        balao.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-100%)`;
      } else balao.hidden = true;
      modelo.userData.cesta.visible = (!!c.temCesta || !!c.temCarrinho) && !c.levaSacolas;
      modelo.userData.sacolas.children.forEach((sacola, i) => {
        sacola.visible = !!c.levaSacolas;
        if (c.assustado) return;
        const assinaturaItens = itens.join(',');
        if (c.levaSacolas && sacola.userData.assinaturaItens !== assinaturaItens) {
          liberarGeometrias(sacola.userData.conteudo);
          sacola.userData.assinaturaItens = assinaturaItens;
          sacola.userData.aparicao = 0;
          itens.forEach((id, indice) => {
            const produto = criarProduto(id, 0.72);
            produto.userData.destinoSacola = posicaoProdutoSacola(indice, itens.length);
            produto.position.copy(produto.userData.destinoSacola).add(new THREE.Vector3(0, 0.2 + indice * 0.025, 0));
            produto.rotation.z = indice % 2 ? 0.35 : -0.35;
            sacola.userData.conteudo.add(produto);
          });
        }
        if (c.levaSacolas) {
          sacola.userData.aparicao = Math.min(1, (sacola.userData.aparicao ?? 0) + dt * 4.5);
          const entrada = THREE.MathUtils.smoothstep(sacola.userData.aparicao, 0, 1);
          ajustarSacola(sacola, itens.length, entrada);
          if (c.temCarrinho) {
            const pose = CARRINHO_CLIENTE.frente.sacola;
            sacola.position.set(pose.x, pose.y - modelo.userData.corpo.position.y, pose.z);
            sacola.scale.setScalar(pose.escala);
          } else {
            sacola.position.set(0, 0.18 + Math.sin(entrada * Math.PI) * 0.07, 0.58);
            sacola.scale.setScalar(0.86 + entrada * 0.14);
          }
          sacola.userData.conteudo.children.forEach((produto, indice) => {
            const t = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(entrada * 1.35 - indice * 0.09, 0, 1), 0, 1);
            produto.position.copy(produto.userData.destinoSacola).add(new THREE.Vector3(0, (1 - t) * 0.2, 0));
            produto.rotation.z = (1 - t) * (indice % 2 ? 0.35 : -0.35);
          });
        }
        sacola.rotation.z = c.andando && !c.temCarrinho ? Math.sin(tempo * 8 + i) * 0.025 : 0;
        if (c.levaSacolas && !c.temCarrinho) {
          // As duas mãos apoiam a mesma sacola junto ao corpo.
          for (const [braco, lado] of [[modelo.userData.bracoE, -1], [modelo.userData.bracoD, 1]]) {
            const apoio = new THREE.Vector3(lado * 0.37, 0.25, 0.03).applyQuaternion(sacola.quaternion).add(sacola.position);
            posicionarBraco(braco, apoio);
          }
        }
      });
      if (c.temCarrinho) {
        const dados = modelo.userData;
        dados.corpo.updateWorldMatrix(true, false); modelo.updateWorldMatrix(true, false);
        for (const [braco, lado] of [[dados.bracoE, -1], [dados.bracoD, 1]]) {
          const apoio = dados.corpo.worldToLocal(dados.carrinho.localToWorld(new THREE.Vector3(lado * 0.26, 1.12, -0.49)));
          posicionarBraco(braco, apoio);
        }
        for (const roda of dados.carrinho.userData.rodas) if (c.andando && !sim.pausado && !c.assustado) roda.rotation.x += dt * 12;
      }
      if (c.levaSacolas) modelo.userData.carga.children.forEach(produto => { produto.visible = false; });
      if (embalagem?.cliente === c) {
        modelo.userData.carga.children.forEach((produto, i) => { if (i < embalagem.embalados) produto.visible = false; });
      }
    }
    for (const [id, m] of this.clientes) if (!sim.clientes.some(c => c.id === id)) { m.userData.balao?.remove(); this.cena.remove(m); liberarGeometrias(m); this.clientes.delete(id); }
    this.caixeiro.visible = !!e.melhorias.caixa;
    if (this.caixeiro.visible) {
      this.animarPersonagem(this.caixeiro, { x: CONFIG.cadeiraCaixa.x, z: CONFIG.cadeiraCaixa.z, angulo: CONFIG.anguloCaixa, andando: false, sentado: true }, dt, tempo);
      this.animarAtendimento(this.caixeiro, tempo, atendendoNoCaixa, progressoCaixa);
      this.caixeiro.userData.corpo.rotation.z = Math.sin(tempo * 1.8) * 0.018;
      if (sim.assaltoNaLoja) this.animarSustoCaixa(this.caixeiro, tempo);
    }
    this.ajudante.visible = !!e.melhorias.ajudante;
    if (this.ajudante.visible) {
      this.ajudante.userData.cesta.visible = sim.ajudante.inventario.length > 0;
      usarCaixaMadeira(this.ajudante, ajudanteUsaCaixaMadeira(sim.ajudante));
      this.animarPersonagem(this.ajudante, sim.ajudante, dt, tempo, sim.ajudante.inventario, 'horta', 0.44);
    }
    for (const [id, objetos] of Object.entries(this.produtos)) {
      const estado = e.produtos[id];
      if (PRODUTOS[id].origem === 'confeitaria') {
        objetos.grupo.visible = !!e.melhorias.confeitaria;
        objetos.frutas.forEach((doce, i) => { doce.visible = i < estado.prateleira; });
        continue;
      }
      if (id === 'pao') {
        this.animarConfeiteiro(objetos, dt);
        const ativa = !!e.melhorias.alaPadaria;
        const construcaoPadaria = e.estagioLoja > ALA_PADARIA.indice ? 1 : equipamentoAla;
        objetos.grupo.visible = ativa && construcaoPadaria > 0;
        objetos.grupo.scale.y = Math.max(0.001, construcaoPadaria);
        objetos.frutas.forEach((f, i) => { f.visible = ativa && i < estado.prateleira; });
        if (ativa) {
          const { moendo, assando } = trabalhoPadaria(e);
          objetos.trigosRecebidos.forEach((espiga, i) => { espiga.visible = i < e.producao.trigoPadaria; });
          if (moendo) objetos.rotor.rotation.y += dt * 9;
          objetos.farinha.visible = moendo || assando;
          objetos.farinha.scale.y = 0.35 + (moendo ? e.producao.progressoMoagem / ALA_PADARIA.tempoMoagem : 0.5);
          objetos.fumaca.forEach((nuvem, i) => {
            nuvem.visible = assando;
            nuvem.position.y = 1.95 + i * 0.2 + (tempo * 0.55 + i * 0.33) % 0.8;
            nuvem.material.opacity = assando ? 0.22 * (1 - (nuvem.position.y - 1.95 - i * 0.2) / 0.8) : 0;
          });
          this.animarPadeiros(objetos, e.producao, sim.tempo, dt);
        }
        continue;
      }
      const estagioProduto = { ovos: ALA_PRODUCAO.indice, leite: ALA_LEITE.indice, trigo: ALA_TRIGO.indice, morango: ALA_ARTESANAL.indice }[id];
      const construcao = e.estagioLoja > estagioProduto ? 1 : equipamentoAla;
      const temConstrucao = estagioProduto !== undefined || ['apiario', 'oficina'].includes(PRODUTOS[id].origem);
      objetos.grupo.visible = estacaoDesbloqueada(id, e) && (!temConstrucao || construcao > 0);
      if (objetos.grupo.userData.maquinaSucos) animarMaquinaSucos(objetos.grupo.userData.maquinaSucos, e, sim.pausado ? 0 : dt);
      if (temConstrucao) objetos.grupo.scale.y = Math.max(0.001, construcao);
      if (objetos.grupo.visible) objetos.galinhas.forEach(galinha => animarGalinha(galinha, tempo));
      if (objetos.irrigador) {
        objetos.irrigador.visible = !!e.melhorias.irrigacao;
        if (objetos.irrigador.visible) animarIrrigador(objetos.irrigador, sim.tempo);
      }
      objetos.frutos.forEach((f, i) => { f.visible = i < estado.horta; f.position.y = (f.userData.baseY ?? (id === 'leite' ? 0.69 : id === 'trigo' ? 0.82 : 1)) + (id === 'mel' ? 0 : Math.sin(tempo * 2 + i) * 0.025); });
      if (objetos.abelhas?.length && objetos.grupo.visible) animarAbelhas(objetos.abelhas, PRODUTOS[id].horta, tempo);
      if (objetos.grupo.userData.mexedor) {
        const receita = OFICINAS[id], oficina = e.oficinas[id];
        const produzindo = estado.horta + receita.rendimento <= PRODUTOS[id].capacidadeHorta && Object.entries(receita.ingredientes).every(([item, quantidade]) => oficina.ingredientes[item] >= quantidade);
        if (produzindo) objetos.grupo.userData.mexedor.rotation.y += dt * 2;
      }
      const emTransito = [this.jogador, this.ajudante].map(m => m.userData.reposicao)
        .filter(r => r?.id === id && r.decorrido / r.duracao < 0.85);
      objetos.frutas.forEach((f, i) => { f.visible = i < estado.prateleira && !emTransito.some(r => r.lugar === i); });
    }
    if (this.cuidadorVaca?.visible && this.produtos.leite.grupo.visible) {
      animarVaca(this.vaca, tempo);
      this.animarPersonagem(this.cuidadorVaca, { ...this.posicaoCuidadorVaca, angulo: Math.PI, andando: false, sentado: true }, dt, tempo);
      const { corpo, bracoE, bracoD } = this.cuidadorVaca.userData;
      const ordenhaE = Math.max(0, Math.sin(tempo * 5));
      const ordenhaD = Math.max(0, Math.sin(tempo * 5 + Math.PI));
      corpo.rotation.x = -0.1 + Math.sin(tempo * 2.5) * 0.03;
      corpo.rotation.z = Math.sin(tempo * 1.3) * 0.02;
      posicionarBraco(bracoE, new THREE.Vector3(-0.16, 0.4 - ordenhaE * 0.13, 1.02 + ordenhaE * 0.04));
      posicionarBraco(bracoD, new THREE.Vector3(0.16, 0.4 - ordenhaD * 0.13, 1.02 + ordenhaD * 0.04));
    }
    for (const { id, el, ponto } of this.labels) {
      const [tipo, produto] = id.split('-');
      const estagioProduto = { ovos: ALA_PRODUCAO.indice, leite: ALA_LEITE.indice, trigo: ALA_TRIGO.indice, morango: ALA_ARTESANAL.indice }[produto];
      const construcao = PRODUTOS[produto]?.origem === 'pomar' || e.estagioLoja > estagioProduto ? 1 : equipamentoAla;
      if (produto && (!estacaoDesbloqueada(produto, e) || ((estagioProduto !== undefined || ['apiario', 'oficina'].includes(PRODUTOS[produto]?.origem)) && construcao < 1))) { el.hidden = true; continue; }
      const estacao = PRODUTOS[produto] && geometriaEstacao(produto, tipo === 'horta' ? 'coleta' : 'reposicao', PRODUTOS);
      const perto = estacao && distanciaEstacao(e.jogador, estacao) < CONFIG.raioInteracao + 0.3;
      if (!perto) { el.hidden = true; continue; }
      const pos = this.projetar(ponto);
      if (produto === 'pao') {
        // A projeção do balcão coincide com a entrega de trigo nesta câmera.
        // Mantém o estoque legível sem cobrir o jogador, inclusive no celular.
        el.hidden = false;
        const cabeca = this.projetar({ ...e.jogador, y: 2.1 });
        const pes = this.projetar({ ...e.jogador, y: 0.23 });
        const meiaLarguraJogador = 0.7 * this.w / (this.camera.right - this.camera.left) + 6;
        const cruzaJogador = Math.abs(pos.x - cabeca.x) < el.offsetWidth / 2 + meiaLarguraJogador
          && pos.y > cabeca.y - 8 && pos.y - el.offsetHeight < pes.y + 8;
        if (cruzaJogador) pos.y = cabeca.y - 10;
      }
      el.hidden = pos.x < 25 || pos.x > this.w - 25 || pos.y < (this.mobile ? 200 : 120) || pos.y > this.h - 100;
      el.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-100%)`;
      const detalhe = el.lastElementChild;
      detalhe.hidden = tipo === 'horta' && !!OFICINAS[produto];
      if (tipo === 'horta' && OFICINAS[produto]) {
        // Os detalhes de fabricação ficam no painel fixo de produção.
        detalhe.textContent = '';
      }
      else if (tipo === 'horta' && PRODUTOS[produto]?.origem === 'importado') detalhe.textContent = `${pacotesDaClasse(e.deposito, PRODUTOS[produto].classe)} / ${PACOTES_POR_CLASSE} pacotes · ${e.produtos[produto].horta} unidades`;
      else if (tipo === 'horta' && SUCOS.sabores[produto]) detalhe.textContent = `${Object.keys(SUCOS.sabores).reduce((total, id) => total + e.produtos[id].horta, 0)} garrafas no balcão · recolha e abasteça`;
      else if (tipo === 'loja' && SUCOS.sabores[produto]) detalhe.textContent = `${Object.keys(SUCOS.sabores).reduce((total, id) => total + e.produtos[id].prateleira, 0)} / 24 garrafas · R$ 25`;
      else if (tipo === 'horta') detalhe.textContent = `${e.produtos[produto].horta} para colher`;
      else if (tipo === 'loja') detalhe.textContent = `${e.produtos[produto].prateleira} / ${PRODUTOS[produto].capacidadePrateleira}`;
    }
    this.renderer.render(this.cena, this.camera);
  }
}
